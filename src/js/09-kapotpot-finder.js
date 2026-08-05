const kapotpotFinderState = {
  map: null,
  radiusCircle: null,
  nearbyRadiusCircle: null,
  selfMarker: null,
  nearbyLayer: null,
  latestPosition: null,
  isVisible: false,
  isOpen: false,
  isBusy: false,
  watchId: null,
  pollTimer: null,
  locationPermissionBlocked: false,
  chatSocket: null,
  chatMessages: [],
  chatReconnectTimer: null,
  chatReconnectAttempts: 0,
  chatShouldReconnect: false,
  chatUnreadCount: 0
};

let kapotpotMapLibraryPromise = null;

function getKapotpotInitials(value) {
  return String(value || "SMB")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "SMB";
}

function getKapotpotFinderElements() {
  const root = document.querySelector("[data-kapotpot-finder]");
  return {
    root,
    openButton: root?.querySelector("[data-kapotpot-open]"),
    count: root?.querySelector("[data-kapotpot-count]"),
    message: root?.querySelector("[data-kapotpot-message]"),
    mapShell: root?.querySelector("[data-kapotpot-map-shell]"),
    fullscreenButton: root?.querySelector("[data-kapotpot-fullscreen]"),
    chatToggle: root?.querySelector("[data-kapotpot-chat-toggle]"),
    chatUnread: root?.querySelector("[data-kapotpot-chat-unread]"),
    chatPanel: root?.querySelector("[data-kapotpot-chat-panel]"),
    chatStatus: root?.querySelector("[data-kapotpot-chat-status]"),
    chatMessages: root?.querySelector("[data-kapotpot-chat-messages]"),
    chatError: root?.querySelector("[data-kapotpot-chat-error]"),
    chatCompose: root?.querySelector("[data-kapotpot-chat-compose]"),
    chatClose: root?.querySelector("[data-kapotpot-chat-close]"),
    chatComposer: root?.querySelector("[data-kapotpot-chat-composer]"),
    chatForm: root?.querySelector("[data-kapotpot-chat-form]"),
    chatInput: root?.querySelector("[data-kapotpot-chat-input]"),
    chatCount: root?.querySelector("[data-kapotpot-chat-count]"),
    chatFeedback: root?.querySelector("[data-kapotpot-chat-feedback]"),
    chatCancel: root?.querySelector("[data-kapotpot-chat-cancel]"),
    chatSend: root?.querySelector("[data-kapotpot-chat-send]"),
    map: root?.querySelector("[data-kapotpot-map]"),
    preview: root?.querySelector("[data-kapotpot-map-preview]"),
    legend: root?.querySelector("[data-kapotpot-map-legend]")
  };
}

function getKapotpotChatSocketUrl() {
  let apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    apiBaseUrl = `http://${window.location.hostname}:5088`;
  }
  const url = new URL("/api/public/kapotpot-finder/chat/socket", apiBaseUrl || window.location.origin);
  url.searchParams.set("location", getSelectedPublicLocationSlug());
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function setKapotpotChatStatus(status) {
  const { chatStatus } = getKapotpotFinderElements();
  if (!chatStatus) return;
  chatStatus.textContent = status;
  chatStatus.classList.toggle("is-live", status === "LIVE");
}

function setKapotpotChatError(message = "") {
  const { chatError } = getKapotpotFinderElements();
  if (!chatError) return;
  chatError.textContent = message;
  chatError.hidden = !message;
}

function renderKapotpotChatControl() {
  const { chatToggle, chatUnread, chatPanel, mapShell } = getKapotpotFinderElements();
  const canChat = Boolean(customerState.account && kapotpotFinderState.isOpen);
  if (chatToggle) chatToggle.hidden = !canChat;
  if (chatUnread) {
    chatUnread.textContent = kapotpotFinderState.chatUnreadCount > 9 ? "9+" : String(kapotpotFinderState.chatUnreadCount);
    chatUnread.hidden = kapotpotFinderState.chatUnreadCount === 0;
  }
  if (!canChat && chatPanel) chatPanel.hidden = true;
  mapShell?.classList.toggle("has-chat-open", Boolean(canChat && chatPanel && !chatPanel.hidden));
}

function renderKapotpotChatMessages() {
  const { chatMessages } = getKapotpotFinderElements();
  if (!chatMessages) return;
  chatMessages.replaceChildren();
  if (kapotpotFinderState.chatMessages.length === 0) {
    chatMessages.append(createTextElement("p", "No messages yet. Say hello to nearby Kapotpots.", "kapotpot-chat-empty"));
    return;
  }

  kapotpotFinderState.chatMessages.forEach((message) => {
    const row = document.createElement("article");
    row.className = "kapotpot-chat-message";
    const avatar = document.createElement("span");
    avatar.className = "kapotpot-chat-message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    const avatarUrl = normalizeApiUrl(message.avatarUrl || "");
    if (avatarUrl) {
      const image = document.createElement("img");
      image.src = avatarUrl;
      image.alt = "";
      image.addEventListener("error", () => image.remove(), { once: true });
      avatar.append(image);
    }
    const content = document.createElement("div");
    content.className = "kapotpot-chat-message-content";
    content.append(
      createTextElement("strong", message.displayName || "Kapotpot"),
      createTextElement("p", message.body || "")
    );
    row.append(avatar, content);
    chatMessages.append(row);
  });
  scrollKapotpotChatToBottom();
}

function scrollKapotpotChatToBottom() {
  const { chatMessages } = getKapotpotFinderElements();
  if (!chatMessages) return;
  window.requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function addKapotpotChatMessage(message) {
  if (!message?.id || !message?.body) return;
  const existingIndex = kapotpotFinderState.chatMessages.findIndex((item) => item.id === message.id);
  if (existingIndex >= 0) kapotpotFinderState.chatMessages.splice(existingIndex, 1);
  kapotpotFinderState.chatMessages.push(message);
  kapotpotFinderState.chatMessages = kapotpotFinderState.chatMessages.slice(-50);
  const { chatPanel } = getKapotpotFinderElements();
  if (!chatPanel || chatPanel.hidden) {
    kapotpotFinderState.chatUnreadCount = Math.min(99, kapotpotFinderState.chatUnreadCount + 1);
  }
  renderKapotpotChatMessages();
  renderKapotpotChatControl();
}

function closeKapotpotChatComposer({ restoreFocus = true } = {}) {
  const { chatComposer, chatToggle } = getKapotpotFinderElements();
  if (!chatComposer || chatComposer.hidden) return;
  chatComposer.hidden = true;
  if (restoreFocus) chatToggle?.focus();
}

function renderKapotpotChatComposer() {
  const { chatInput, chatCount, chatFeedback, chatSend } = getKapotpotFinderElements();
  const message = chatInput?.value.trim() || "";
  const length = Array.from(message).length;
  const isConnected = kapotpotFinderState.chatSocket?.readyState === WebSocket.OPEN;
  if (chatCount) chatCount.textContent = `${length} / 120`;
  if (chatSend) chatSend.disabled = length === 0 || length > 120 || !isConnected;
  if (chatFeedback) chatFeedback.textContent = length > 120 ? "Message is too long." : "";
}

function openKapotpotChatComposer() {
  const { chatPanel, chatComposer, chatInput } = getKapotpotFinderElements();
  if (!chatComposer || !customerState.account || !kapotpotFinderState.isOpen) return;
  if (chatPanel) chatPanel.hidden = false;
  kapotpotFinderState.chatUnreadCount = 0;
  chatComposer.hidden = false;
  setKapotpotChatError("");
  renderKapotpotChatControl();
  renderKapotpotChatComposer();
  window.setTimeout(() => chatInput?.focus(), 0);
}

function openKapotpotChat() {
  const { chatPanel } = getKapotpotFinderElements();
  if (!chatPanel || !customerState.account || !kapotpotFinderState.isOpen) return;
  chatPanel.hidden = false;
  kapotpotFinderState.chatUnreadCount = 0;
  renderKapotpotChatControl();
  renderKapotpotChatMessages();
  scrollKapotpotChatToBottom();
  openKapotpotChatComposer();
}

function closeKapotpotChat() {
  const { chatPanel, chatToggle } = getKapotpotFinderElements();
  closeKapotpotChatComposer({ restoreFocus: false });
  if (chatPanel) chatPanel.hidden = true;
  renderKapotpotChatControl();
  chatToggle?.focus();
}

function disconnectKapotpotChat({ clearMessages = false } = {}) {
  kapotpotFinderState.chatShouldReconnect = false;
  window.clearTimeout(kapotpotFinderState.chatReconnectTimer);
  kapotpotFinderState.chatReconnectTimer = null;
  const socket = kapotpotFinderState.chatSocket;
  kapotpotFinderState.chatSocket = null;
  if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, "Finder closed");
  if (clearMessages) {
    kapotpotFinderState.chatMessages = [];
    kapotpotFinderState.chatUnreadCount = 0;
    renderKapotpotChatMessages();
  }
  setKapotpotChatStatus("OFFLINE");
  renderKapotpotChatComposer();
}

function scheduleKapotpotChatReconnect() {
  if (!kapotpotFinderState.chatShouldReconnect || document.hidden) return;
  window.clearTimeout(kapotpotFinderState.chatReconnectTimer);
  const delay = Math.min(15000, 1000 * (2 ** Math.min(kapotpotFinderState.chatReconnectAttempts, 4)));
  kapotpotFinderState.chatReconnectAttempts += 1;
  kapotpotFinderState.chatReconnectTimer = window.setTimeout(connectKapotpotChat, delay);
}

function connectKapotpotChat() {
  if (!customerState.account || !kapotpotFinderState.isOpen || !kapotpotFinderState.isVisible) return;
  const currentSocket = kapotpotFinderState.chatSocket;
  if (currentSocket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(currentSocket.readyState)) return;
  kapotpotFinderState.chatShouldReconnect = true;
  setKapotpotChatStatus("CONNECTING");
  setKapotpotChatError("");

  let socket;
  try {
    socket = new WebSocket(getKapotpotChatSocketUrl());
  } catch {
    setKapotpotChatStatus("OFFLINE");
    setKapotpotChatError("Chat could not connect. Try opening the Finder again.");
    scheduleKapotpotChatReconnect();
    return;
  }
  kapotpotFinderState.chatSocket = socket;
  socket.addEventListener("open", () => {
    if (kapotpotFinderState.chatSocket !== socket) return;
    kapotpotFinderState.chatReconnectAttempts = 0;
    setKapotpotChatStatus("LIVE");
    setKapotpotChatError("");
    renderKapotpotChatComposer();
  });
  socket.addEventListener("message", (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    if (payload.type === "snapshot") {
      kapotpotFinderState.chatMessages = (Array.isArray(payload.messages) ? payload.messages : []).slice(-50);
      renderKapotpotChatMessages();
    } else if (payload.type === "message") {
      addKapotpotChatMessage(payload.message);
    } else if (payload.type === "error") {
      setKapotpotChatError(payload.error || "Message could not be sent.");
    }
  });
  socket.addEventListener("close", () => {
    if (kapotpotFinderState.chatSocket === socket) kapotpotFinderState.chatSocket = null;
    setKapotpotChatStatus("OFFLINE");
    renderKapotpotChatComposer();
    scheduleKapotpotChatReconnect();
  });
  socket.addEventListener("error", () => setKapotpotChatError("Chat connection was interrupted."));
}

function setKapotpotMessage(message, type = "") {
  const { message: element } = getKapotpotFinderElements();
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", type === "error");
}

function isKapotpotMapFullscreen() {
  const { mapShell } = getKapotpotFinderElements();
  const nativeFullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
  return Boolean(mapShell && (nativeFullscreenElement === mapShell || mapShell.classList.contains("is-fullscreen-fallback")));
}

function renderKapotpotFullscreenControl() {
  const { fullscreenButton } = getKapotpotFinderElements();
  if (!fullscreenButton) return;
  const isFullscreen = isKapotpotMapFullscreen();
  const label = isFullscreen ? "Exit full screen map" : "View map full screen";
  fullscreenButton.classList.toggle("is-active", isFullscreen);
  fullscreenButton.setAttribute("aria-pressed", String(isFullscreen));
  fullscreenButton.setAttribute("aria-label", label);
  fullscreenButton.title = label;
}

function resizeKapotpotMapAfterLayout() {
  window.setTimeout(() => kapotpotFinderState.map?.invalidateSize(), 0);
  window.setTimeout(() => kapotpotFinderState.map?.invalidateSize(), 180);
}

async function toggleKapotpotMapFullscreen() {
  const { mapShell } = getKapotpotFinderElements();
  if (!mapShell) return;
  const nativeFullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;

  if (nativeFullscreenElement === mapShell) {
    const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
    if (exitFullscreen) {
      try {
        await exitFullscreen.call(document);
      } catch {}
    }
  } else if (mapShell.classList.contains("is-fullscreen-fallback")) {
    mapShell.classList.remove("is-fullscreen-fallback");
    document.body.classList.remove("has-kapotpot-map-fullscreen");
  } else {
    const requestFullscreen = mapShell.requestFullscreen || mapShell.webkitRequestFullscreen;
    if (requestFullscreen) {
      try {
        await requestFullscreen.call(mapShell);
      } catch {
        mapShell.classList.add("is-fullscreen-fallback");
        document.body.classList.add("has-kapotpot-map-fullscreen");
      }
    } else {
      mapShell.classList.add("is-fullscreen-fallback");
      document.body.classList.add("has-kapotpot-map-fullscreen");
    }
  }

  renderKapotpotFullscreenControl();
  resizeKapotpotMapAfterLayout();
}

function setKapotpotBusy(isBusy) {
  kapotpotFinderState.isBusy = isBusy;
  const { openButton } = getKapotpotFinderElements();
  if (openButton) openButton.disabled = isBusy;
}

function renderKapotpotVisibility() {
  const { root, openButton } = getKapotpotFinderElements();
  if (!root) return;
  const isLoggedIn = Boolean(customerState.account);
  root.classList.toggle("is-visible", kapotpotFinderState.isVisible);
  if (openButton) {
    openButton.textContent = !isLoggedIn
      ? "Login to Open"
      : kapotpotFinderState.isOpen
        ? "Refresh Nearby"
        : "Open Finder";
  }
}

function stopKapotpotPresenceUpdates() {
  if (kapotpotFinderState.watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(kapotpotFinderState.watchId);
  }
  kapotpotFinderState.watchId = null;
  window.clearInterval(kapotpotFinderState.pollTimer);
  kapotpotFinderState.pollTimer = null;
}

function resetKapotpotFinderForGuest() {
  stopKapotpotPresenceUpdates();
  disconnectKapotpotChat({ clearMessages: true });
  kapotpotFinderState.isVisible = false;
  kapotpotFinderState.latestPosition = null;
  kapotpotFinderState.nearbyLayer?.clearLayers();
  const { count } = getKapotpotFinderElements();
  if (count) count.textContent = "Log in to check nearby riders";
  renderKapotpotVisibility();
  renderKapotpotChatControl();
  setKapotpotMessage("Log in to use Kapotpot Finder.");
}

function loadKapotpotMapLibrary() {
  if (window.L?.map) return Promise.resolve(window.L);
  if (kapotpotMapLibraryPromise) return kapotpotMapLibraryPromise;

  kapotpotMapLibraryPromise = new Promise((resolve, reject) => {
    if (!document.querySelector("link[data-kapotpot-leaflet]")) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      stylesheet.crossOrigin = "anonymous";
      stylesheet.dataset.kapotpotLeaflet = "";
      document.head.append(stylesheet);
    }

    const existing = document.querySelector("script[data-kapotpot-leaflet]");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.L), { once: true });
      existing.addEventListener("error", () => reject(new Error("The free map library could not be loaded.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.crossOrigin = "anonymous";
    script.dataset.kapotpotLeaflet = "";
    script.addEventListener("load", () => resolve(window.L), { once: true });
    script.addEventListener("error", () => reject(new Error("The free map library could not be loaded.")), { once: true });
    document.head.append(script);
  });

  return kapotpotMapLibraryPromise;
}

function requestKapotpotPosition() {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      reject(new Error("Location requires a secure HTTPS connection."));
      return;
    }
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          kapotpotFinderState.locationPermissionBlocked = true;
          const permissionError = new Error("Location access is turned off for this site.");
          permissionError.kapotpotPermissionBlocked = true;
          reject(permissionError);
        } else if (error.code === error.TIMEOUT) {
          reject(new Error("Your location took too long to load. Move to an open area and try again."));
        } else {
          reject(new Error("Your location could not be determined. Check GPS and try again."));
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}

function renderKapotpotLocationPromptMode(isBlocked) {
  const prompt = document.querySelector("[data-kapotpot-location-prompt]");
  if (!prompt) return;
  const heading = prompt.querySelector("h2");
  const description = prompt.querySelector("[data-kapotpot-location-description]");
  const steps = prompt.querySelector("[data-kapotpot-location-steps]");
  const allowButton = prompt.querySelector("[data-kapotpot-location-allow]");
  const note = prompt.querySelector("[data-kapotpot-location-note]");
  prompt.classList.toggle("is-permission-blocked", isBlocked);
  if (heading) heading.textContent = isBlocked
    ? "Turn on location for this site"
    : "Allow location to open the Finder";
  if (description) description.textContent = isBlocked
    ? "Your browser currently blocks location access for SarapMagBike. Change the site permission, then retry."
    : "Kapotpot Finder needs your current location to check for opted-in riders within 50 km.";
  if (steps) {
    const messages = isBlocked
      ? [
          "Open this site's controls beside the browser address bar or in the browser menu.",
          "Change Location permission to Allow.",
          "Return here and select Try location again."
        ]
      : [
          "Your exact location is never shown to other riders.",
          "Opening the Finder makes you visible to other users for up to 10 minutes.",
          "You can remove access anytime in your browser settings."
        ];
    steps.replaceChildren(...messages.map((message) => createTextElement("li", message)));
  }
  if (allowButton) allowButton.textContent = isBlocked ? "Try location again" : "Allow location access";
  if (note) note.textContent = isBlocked
    ? "Browsers do not show another permission prompt until the blocked site setting is changed."
    : "Your browser will show its own location permission prompt next.";
  setKapotpotLocationFeedback("");
}

function setKapotpotLocationFeedback(message) {
  const feedback = document.querySelector("[data-kapotpot-location-feedback]");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.hidden = !message;
}

function closeKapotpotLocationPrompt({ cancelled = false } = {}) {
  const prompt = document.querySelector("[data-kapotpot-location-prompt]");
  if (!prompt || prompt.hidden) return;
  const wasPermissionBlocked = prompt.classList.contains("is-permission-blocked");
  prompt.hidden = true;
  document.body.classList.remove("has-kapotpot-location-prompt");
  if (cancelled) {
    renderKapotpotVisibility();
    setKapotpotMessage(wasPermissionBlocked
      ? "Location remains off for this site. You remain hidden."
      : "Location access was not requested. You remain hidden.");
    getKapotpotFinderElements().openButton?.focus();
  }
}

function openKapotpotLocationPrompt({ blocked = kapotpotFinderState.locationPermissionBlocked } = {}) {
  if (!customerState.account) {
    setKapotpotMessage("Log in to use Kapotpot Finder.");
    openCommunityLoginForm();
    return;
  }
  if (kapotpotFinderState.isOpen && !blocked) {
    void openKapotpotFinder();
    return;
  }
  const prompt = document.querySelector("[data-kapotpot-location-prompt]");
  if (!prompt) {
    void openKapotpotFinder();
    return;
  }
  renderKapotpotLocationPromptMode(blocked);
  prompt.hidden = false;
  document.body.classList.add("has-kapotpot-location-prompt");
  prompt.querySelector("[data-kapotpot-location-allow]")?.focus();
}

function createKapotpotDivIcon(className, { imageUrl = "", label = "", imageAlt = "" } = {}) {
  const marker = document.createElement("span");
  marker.className = className;

  const fallback = document.createElement("span");
  fallback.className = "kapotpot-marker-fallback";
  fallback.textContent = label;
  marker.append(fallback);

  const normalizedImageUrl = normalizeApiUrl(imageUrl);
  if (normalizedImageUrl) {
    const image = document.createElement("img");
    image.className = "kapotpot-marker-avatar";
    image.src = normalizedImageUrl;
    image.alt = imageAlt;
    image.addEventListener("error", () => image.remove(), { once: true });
    marker.append(image);
  }

  const isUserMarker = className === "kapotpot-user-marker";
  return window.L.divIcon({
    className: "",
    html: marker,
    iconSize: isUserMarker ? [42, 42] : [36, 36],
    iconAnchor: isUserMarker ? [21, 21] : [18, 18],
    popupAnchor: [0, isUserMarker ? -22 : -19],
    tooltipAnchor: [0, isUserMarker ? -22 : -19]
  });
}

function getCurrentKapotpotMarkerIcon() {
  const account = customerState.account || {};
  const profile = customerState.profile || {};
  const displayName = profile.displayName || profile.username || account.username || account.email || "You";
  return createKapotpotDivIcon("kapotpot-user-marker", {
    imageUrl: account.profilePictureUrl || profile.profilePictureUrl || "",
    label: getKapotpotInitials(displayName),
    imageAlt: `${displayName} profile picture`
  });
}

async function ensureKapotpotMap(position) {
  const { map: container, preview, legend } = getKapotpotFinderElements();
  if (!container) return;
  await loadKapotpotMapLibrary();

  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  if (!kapotpotFinderState.map) {
    kapotpotFinderState.map = window.L.map(container, {
      zoomControl: true,
      attributionControl: true
    });
    // Circle#getBounds needs the layer to be attached to a map with an
    // established center and zoom. Initialize the view before adding it.
    kapotpotFinderState.map.setView([latitude, longitude], 12);
    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(kapotpotFinderState.map);
    kapotpotFinderState.nearbyLayer = window.L.layerGroup().addTo(kapotpotFinderState.map);
    kapotpotFinderState.radiusCircle = window.L.circle([latitude, longitude], {
      radius: 50000,
      color: "#df2027",
      weight: 2,
      dashArray: "10 8",
      fillColor: "#df2027",
      fillOpacity: 0.05,
      interactive: false
    }).addTo(kapotpotFinderState.map);
    kapotpotFinderState.nearbyRadiusCircle = window.L.circle([latitude, longitude], {
      radius: 5000,
      color: "#257ae7",
      weight: 2,
      dashArray: "8 7",
      fillColor: "#257ae7",
      fillOpacity: 0.1,
      interactive: false
    }).addTo(kapotpotFinderState.map);
    kapotpotFinderState.selfMarker = window.L.marker([latitude, longitude], {
      icon: getCurrentKapotpotMarkerIcon(),
      title: "Your current location",
      zIndexOffset: 1000
    }).addTo(kapotpotFinderState.map).bindTooltip("You", { permanent: false, direction: "top" });
  } else {
    kapotpotFinderState.radiusCircle.setLatLng([latitude, longitude]);
    kapotpotFinderState.nearbyRadiusCircle?.setLatLng([latitude, longitude]);
    kapotpotFinderState.selfMarker
      .setLatLng([latitude, longitude])
      .setIcon(getCurrentKapotpotMarkerIcon());
  }

  kapotpotFinderState.map.fitBounds(kapotpotFinderState.radiusCircle.getBounds(), { padding: [18, 18] });
  window.setTimeout(() => kapotpotFinderState.map?.invalidateSize(), 0);
  if (preview) preview.hidden = true;
  if (legend) legend.hidden = false;
  kapotpotFinderState.isOpen = true;
  renderKapotpotVisibility();
  renderKapotpotChatControl();
}

function renderKapotpotNearby(response) {
  const nearby = Array.isArray(response?.nearby) ? response.nearby : [];
  const { count } = getKapotpotFinderElements();
  if (count) {
    count.textContent = nearby.length === 0
      ? "No visible Kapotpots nearby right now"
      : `${nearby.length.toLocaleString("en-PH")} Kapotpot${nearby.length === 1 ? "" : "s"} nearby`;
  }

  if (!kapotpotFinderState.nearbyLayer || !window.L) return;
  kapotpotFinderState.nearbyLayer.clearLayers();
  nearby.forEach((rider) => {
    const latitude = Number(rider.latitude);
    const longitude = Number(rider.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const marker = window.L.marker([latitude, longitude], {
      icon: createKapotpotDivIcon("kapotpot-rider-marker", {
        imageUrl: rider.avatarUrl || rider.profilePictureUrl || "",
        label: "",
        imageAlt: ""
      }),
      interactive: false
    });
    marker.addTo(kapotpotFinderState.nearbyLayer);
  });
}

function updateKapotpotSelfPosition(position) {
  kapotpotFinderState.latestPosition = position;
  if (!kapotpotFinderState.map) return;
  const point = [position.coords.latitude, position.coords.longitude];
  kapotpotFinderState.selfMarker?.setLatLng(point);
  kapotpotFinderState.radiusCircle?.setLatLng(point);
  kapotpotFinderState.nearbyRadiusCircle?.setLatLng(point);
}

async function syncKapotpotPresence({ quiet = false } = {}) {
  if (!customerState.account || kapotpotFinderState.isBusy) return;
  setKapotpotBusy(true);
  try {
    const position = kapotpotFinderState.latestPosition || await requestKapotpotPosition();
    updateKapotpotSelfPosition(position);
    const response = await apiRequest(withPublicLocation("/api/public/kapotpot-finder/presence"), {
      method: "POST",
      body: JSON.stringify({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null
      })
    });
    kapotpotFinderState.isVisible = true;
    renderKapotpotNearby(response);
    renderKapotpotVisibility();
    if (!quiet) setKapotpotMessage("You are visible using an approximate marker. Presence refreshes while this page is open.");
  } catch (error) {
    if (!quiet) setKapotpotMessage(error.message || "Nearby riders could not be refreshed.", "error");
    throw error;
  } finally {
    setKapotpotBusy(false);
    renderKapotpotVisibility();
  }
}

function startKapotpotPresenceUpdates() {
  stopKapotpotPresenceUpdates();
  if (!navigator.geolocation || !kapotpotFinderState.isVisible) return;
  kapotpotFinderState.watchId = navigator.geolocation.watchPosition(
    updateKapotpotSelfPosition,
    () => {},
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 45000 }
  );
  kapotpotFinderState.pollTimer = window.setInterval(() => {
    if (!document.hidden && kapotpotFinderState.isVisible) {
      void syncKapotpotPresence({ quiet: true }).catch(() => {});
    }
  }, 60000);
}

async function openKapotpotFinder() {
  if (!customerState.account) {
    setKapotpotMessage("Log in to use Kapotpot Finder.");
    openCommunityLoginForm();
    return;
  }
  if (kapotpotFinderState.isBusy) return;

  setKapotpotBusy(true);
  setKapotpotMessage("Requesting your location…");
  try {
    const position = await requestKapotpotPosition();
    kapotpotFinderState.locationPermissionBlocked = false;
    kapotpotFinderState.latestPosition = position;
    await ensureKapotpotMap(position);
    setKapotpotMessage("Checking for nearby Kapotpots…");
  } catch (error) {
    if (error.kapotpotPermissionBlocked) {
      setKapotpotMessage("Location is off for this site. Follow the browser steps shown, then retry.", "error");
      openKapotpotLocationPrompt({ blocked: true });
    } else {
      setKapotpotMessage(error.message || "Kapotpot Finder could not be opened.", "error");
    }
    renderKapotpotVisibility();
    return;
  } finally {
    setKapotpotBusy(false);
  }

  try {
    await syncKapotpotPresence();
    startKapotpotPresenceUpdates();
    connectKapotpotChat();
  } catch {
    kapotpotFinderState.isVisible = false;
    disconnectKapotpotChat();
    renderKapotpotVisibility();
    renderKapotpotChatControl();
  }
}

async function loadKapotpotPresenceStatus() {
  if (!customerState.account) {
    resetKapotpotFinderForGuest();
    return;
  }
  try {
    const response = await apiRequest("/api/public/kapotpot-finder/status");
    kapotpotFinderState.isVisible = Boolean(response?.isVisible);
    const { count } = getKapotpotFinderElements();
    if (count) {
      count.textContent = kapotpotFinderState.isVisible
        ? "You are visible—open to refresh nearby riders"
        : "Open the Finder to check nearby riders";
    }
    setKapotpotMessage(kapotpotFinderState.isVisible
      ? "Your previous presence is still active and will expire automatically."
      : "Opening the Finder makes you visible to other users for up to 10 minutes.");
  } catch (error) {
    kapotpotFinderState.isVisible = false;
    setKapotpotMessage(error.status === 404
      ? "Kapotpot Finder is currently unavailable."
      : "Finder status could not be loaded. You remain hidden.",
      error.status === 404 ? "" : "error");
  }
  renderKapotpotVisibility();
}

function initializeKapotpotFinder() {
  const {
    root,
    openButton,
    fullscreenButton,
    chatToggle,
    chatCompose,
    chatClose,
    chatForm,
    chatInput,
    chatCancel
  } = getKapotpotFinderElements();
  if (!root || root.dataset.kapotpotBound === "true") return;
  root.dataset.kapotpotBound = "true";

  if (navigator.permissions?.query) {
    navigator.permissions.query({ name: "geolocation" }).then((permission) => {
      const syncPermission = () => {
        kapotpotFinderState.locationPermissionBlocked = permission.state === "denied";
        const prompt = document.querySelector("[data-kapotpot-location-prompt]");
        if (prompt && !prompt.hidden) renderKapotpotLocationPromptMode(kapotpotFinderState.locationPermissionBlocked);
      };
      syncPermission();
      permission.addEventListener?.("change", syncPermission);
    }).catch(() => {});
  }

  openButton?.addEventListener("click", () => openKapotpotLocationPrompt());
  fullscreenButton?.addEventListener("click", () => void toggleKapotpotMapFullscreen());
  chatToggle?.addEventListener("click", openKapotpotChat);
  chatCompose?.addEventListener("click", openKapotpotChatComposer);
  chatClose?.addEventListener("click", closeKapotpotChat);
  chatCancel?.addEventListener("click", () => closeKapotpotChatComposer());
  chatInput?.addEventListener("input", renderKapotpotChatComposer);
  chatForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = chatInput?.value.trim() || "";
    const length = Array.from(message).length;
    const socket = kapotpotFinderState.chatSocket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setKapotpotChatError("Chat is reconnecting. Try again in a moment.");
      renderKapotpotChatComposer();
      return;
    }
    if (length === 0 || length > 120) {
      renderKapotpotChatComposer();
      return;
    }
    socket.send(JSON.stringify({ type: "send", message }));
    chatInput.value = "";
    setKapotpotChatError("");
    renderKapotpotChatComposer();
    closeKapotpotChatComposer({ restoreFocus: false });
  });
  document.addEventListener("fullscreenchange", () => {
    renderKapotpotFullscreenControl();
    resizeKapotpotMapAfterLayout();
  });
  document.addEventListener("webkitfullscreenchange", () => {
    renderKapotpotFullscreenControl();
    resizeKapotpotMapAfterLayout();
  });
  document.querySelector("[data-kapotpot-location-allow]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (kapotpotFinderState.locationPermissionBlocked) {
      button.disabled = true;
      button.textContent = "Checking…";
      setKapotpotLocationFeedback("Checking this site's Location permission…");
      let permissionState = "unknown";
      if (navigator.permissions?.query) {
        permissionState = await navigator.permissions.query({ name: "geolocation" })
          .then((permission) => permission.state)
          .catch(() => "unknown");
      }
      if (permissionState === "denied") {
        renderKapotpotLocationPromptMode(true);
        setKapotpotLocationFeedback("Location is still blocked. Change this site's Location setting to Allow, then select Check again.");
        button.disabled = false;
        button.textContent = "Check again";
        return;
      }
      kapotpotFinderState.locationPermissionBlocked = false;
      button.disabled = false;
    }
    closeKapotpotLocationPrompt();
    void openKapotpotFinder();
  });
  document.querySelector("[data-kapotpot-location-cancel]")?.addEventListener("click", () => closeKapotpotLocationPrompt({ cancelled: true }));
  document.querySelector("[data-kapotpot-location-prompt]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeKapotpotLocationPrompt({ cancelled: true });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !getKapotpotFinderElements().chatComposer?.hidden) {
      closeKapotpotChatComposer();
      return;
    }
    if (event.key === "Escape" && !document.querySelector("[data-kapotpot-location-prompt]")?.hidden) {
      closeKapotpotLocationPrompt({ cancelled: true });
    }
    if (event.key === "Escape") {
      const { mapShell } = getKapotpotFinderElements();
      if (mapShell?.classList.contains("is-fullscreen-fallback")) {
        mapShell.classList.remove("is-fullscreen-fallback");
        document.body.classList.remove("has-kapotpot-map-fullscreen");
        renderKapotpotFullscreenControl();
        resizeKapotpotMapAfterLayout();
      }
    }
  });
  window.addEventListener("customer-session-changed", () => {
    if (!customerState.account) {
      closeKapotpotLocationPrompt();
      closeKapotpotChat();
      disconnectKapotpotChat({ clearMessages: true });
    }
    void loadKapotpotPresenceStatus();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      disconnectKapotpotChat();
      return;
    }
    if (kapotpotFinderState.isVisible && kapotpotFinderState.isOpen) {
      void syncKapotpotPresence({ quiet: true })
        .then(connectKapotpotChat)
        .catch(() => {});
    }
  });
  window.addEventListener("pagehide", () => {
    stopKapotpotPresenceUpdates();
    disconnectKapotpotChat();
  });
  renderKapotpotVisibility();
  renderKapotpotFullscreenControl();
  renderKapotpotChatControl();
  renderKapotpotChatMessages();
}
