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
  pendingEnableVisibility: false,
  locationPermissionBlocked: false
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
    visibility: root?.querySelector("[data-kapotpot-visibility]"),
    visibilityLabel: root?.querySelector("[data-kapotpot-visibility-label]"),
    openButton: root?.querySelector("[data-kapotpot-open]"),
    count: root?.querySelector("[data-kapotpot-count]"),
    message: root?.querySelector("[data-kapotpot-message]"),
    map: root?.querySelector("[data-kapotpot-map]"),
    preview: root?.querySelector("[data-kapotpot-map-preview]"),
    legend: root?.querySelector("[data-kapotpot-map-legend]")
  };
}

function setKapotpotMessage(message, type = "") {
  const { message: element } = getKapotpotFinderElements();
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", type === "error");
}

function setKapotpotBusy(isBusy) {
  kapotpotFinderState.isBusy = isBusy;
  const { openButton, visibility } = getKapotpotFinderElements();
  if (openButton) openButton.disabled = isBusy;
  if (visibility) visibility.disabled = isBusy || !customerState.account;
}

function renderKapotpotVisibility() {
  const { root, visibility, visibilityLabel, openButton } = getKapotpotFinderElements();
  if (!root) return;
  const isLoggedIn = Boolean(customerState.account);
  root.classList.toggle("is-visible", kapotpotFinderState.isVisible);
  if (visibility) {
    visibility.checked = kapotpotFinderState.isVisible;
    visibility.disabled = kapotpotFinderState.isBusy || !isLoggedIn;
  }
  if (visibilityLabel) {
    visibilityLabel.textContent = kapotpotFinderState.isVisible ? "Visible Nearby" : "Go Visible";
  }
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
  kapotpotFinderState.isVisible = false;
  kapotpotFinderState.latestPosition = null;
  kapotpotFinderState.nearbyLayer?.clearLayers();
  const { count } = getKapotpotFinderElements();
  if (count) count.textContent = "Log in to check nearby riders";
  renderKapotpotVisibility();
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
          "You remain hidden unless you turn on Go Visible.",
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
    kapotpotFinderState.pendingEnableVisibility = false;
    renderKapotpotVisibility();
    setKapotpotMessage(wasPermissionBlocked
      ? "Location remains off for this site. You remain hidden."
      : "Location access was not requested. You remain hidden.");
    getKapotpotFinderElements().openButton?.focus();
  }
}

function openKapotpotLocationPrompt(enableVisibility = false, { blocked = kapotpotFinderState.locationPermissionBlocked } = {}) {
  if (!customerState.account) {
    setKapotpotMessage("Log in to use Kapotpot Finder.");
    openCommunityLoginForm();
    return;
  }
  if (kapotpotFinderState.isOpen && !blocked) {
    void openKapotpotFinder(enableVisibility);
    return;
  }
  const prompt = document.querySelector("[data-kapotpot-location-prompt]");
  if (!prompt) {
    void openKapotpotFinder(enableVisibility);
    return;
  }
  kapotpotFinderState.pendingEnableVisibility = enableVisibility;
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
        label: getKapotpotInitials(rider.displayName || "SMB"),
        imageAlt: `${rider.displayName || "SarapMagBike rider"} profile picture`
      }),
      title: "Approximate Kapotpot location"
    });
    const popup = document.createElement("div");
    popup.className = "kapotpot-popup";
    const avatar = document.createElement("span");
    avatar.className = "kapotpot-popup-avatar";
    if (rider.avatarUrl) {
      const image = document.createElement("img");
      image.src = normalizeApiUrl(rider.avatarUrl);
      image.alt = "";
      image.addEventListener("error", () => {
        avatar.textContent = getKapotpotInitials(rider.displayName || "SMB");
        image.remove();
      }, { once: true });
      avatar.append(image);
    } else {
      avatar.textContent = getKapotpotInitials(rider.displayName || "SMB");
    }
    const details = document.createElement("div");
    details.append(
      createTextElement("strong", rider.displayName || "SarapMagBike rider"),
      createTextElement("span", rider.distanceLabel || "Active nearby")
    );
    popup.append(avatar, details);
    marker.bindPopup(popup);
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

async function openKapotpotFinder(enableVisibility = false) {
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
    setKapotpotMessage(kapotpotFinderState.isVisible || enableVisibility
      ? "Checking for nearby Kapotpots…"
      : "Your location is shown only to you. Turn on Go Visible to see opted-in riders nearby.");
  } catch (error) {
    if (error.kapotpotPermissionBlocked) {
      setKapotpotMessage("Location is off for this site. Follow the browser steps shown, then retry.", "error");
      openKapotpotLocationPrompt(enableVisibility, { blocked: true });
    } else {
      setKapotpotMessage(error.message || "Kapotpot Finder could not be opened.", "error");
    }
    renderKapotpotVisibility();
    return;
  } finally {
    setKapotpotBusy(false);
  }

  if (kapotpotFinderState.isVisible || enableVisibility) {
    try {
      await syncKapotpotPresence();
      startKapotpotPresenceUpdates();
    } catch {
      kapotpotFinderState.isVisible = false;
      renderKapotpotVisibility();
    }
  }
}

async function hideKapotpotPresence() {
  if (!customerState.account || kapotpotFinderState.isBusy) return;
  setKapotpotBusy(true);
  try {
    await apiRequest("/api/public/kapotpot-finder/presence", { method: "DELETE" });
    kapotpotFinderState.isVisible = false;
    stopKapotpotPresenceUpdates();
    kapotpotFinderState.nearbyLayer?.clearLayers();
    const { count } = getKapotpotFinderElements();
    if (count) count.textContent = "Visibility is off";
    setKapotpotMessage("You are hidden. Your stored presence has been removed.");
  } catch (error) {
    setKapotpotMessage(error.message || "Visibility could not be turned off.", "error");
  } finally {
    setKapotpotBusy(false);
    renderKapotpotVisibility();
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
      : "Hidden by default. Open the Finder when you are ready.");
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
  const { root, visibility, openButton } = getKapotpotFinderElements();
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

  openButton?.addEventListener("click", () => openKapotpotLocationPrompt(false));
  visibility?.addEventListener("change", () => {
    if (visibility.checked) {
      openKapotpotLocationPrompt(true);
    } else {
      void hideKapotpotPresence();
    }
  });
  document.querySelector("[data-kapotpot-location-allow]")?.addEventListener("click", async (event) => {
    const enableVisibility = kapotpotFinderState.pendingEnableVisibility;
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
    kapotpotFinderState.pendingEnableVisibility = false;
    closeKapotpotLocationPrompt();
    void openKapotpotFinder(enableVisibility);
  });
  document.querySelector("[data-kapotpot-location-cancel]")?.addEventListener("click", () => closeKapotpotLocationPrompt({ cancelled: true }));
  document.querySelector("[data-kapotpot-location-prompt]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeKapotpotLocationPrompt({ cancelled: true });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !document.querySelector("[data-kapotpot-location-prompt]")?.hidden) {
      closeKapotpotLocationPrompt({ cancelled: true });
    }
  });
  window.addEventListener("customer-session-changed", () => {
    if (!customerState.account) closeKapotpotLocationPrompt();
    void loadKapotpotPresenceStatus();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && kapotpotFinderState.isVisible && kapotpotFinderState.isOpen) {
      void syncKapotpotPresence({ quiet: true }).catch(() => {});
    }
  });
  window.addEventListener("pagehide", stopKapotpotPresenceUpdates);
  renderKapotpotVisibility();
}
