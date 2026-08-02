const customerState = {
  account: null,
  profile: null,
  mode: "register",
  profileImage: null
};
const customerLevelBadgeAssets = {
  noob: "assets/sarapmagbadge-noob.png",
  saks: "assets/sarapmagbadge-saks.png",
  mamaw: "assets/sarapmagbadge-mamaw.png",
  master: "assets/sarapmagbadge-master.png",
  budolero: "assets/sarapmagbadge-budolero.png"
};
let customerLevelBadgeLoadVersion = 0;

function ensureCustomerLevelProgressElements() {
  document.querySelectorAll("[data-customer-level-badge]").forEach((badgeLink) => {
    const existing = badgeLink.nextElementSibling;
    if (existing?.matches("[data-customer-level-progress]")) {
      return;
    }

    const progress = document.createElement("div");
    progress.className = "customer-level-progress";
    progress.dataset.customerLevelProgress = "";
    progress.hidden = true;
    progress.innerHTML = `
      <div
        class="customer-level-progress-track"
        role="progressbar"
        aria-label="Progress to next SarapMagBadge level"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow="0"
      >
        <span data-customer-level-progress-fill></span>
      </div>
      <small data-customer-level-progress-text>0%</small>
    `;
    badgeLink.insertAdjacentElement("afterend", progress);
  });
}

function getCustomerLevelProgress(summary) {
  const lifetimePoints = Math.max(0, Number(summary?.balances?.lifetimePoints) || 0);
  const levelCode = String(summary?.level?.code || "").trim().toLowerCase();
  const levels = Array.isArray(summary?.levels)
    ? summary.levels
      .map((level) => ({
        ...level,
        minimum: Math.max(0, Number(level?.minimum) || 0)
      }))
      .sort((left, right) => left.minimum - right.minimum)
    : [];
  const currentIndex = levels.findIndex((level) => String(level?.code || "").trim().toLowerCase() === levelCode);
  const currentLevel = currentIndex >= 0
    ? levels[currentIndex]
    : [...levels].reverse().find((level) => lifetimePoints >= level.minimum);
  const resolvedIndex = currentLevel ? levels.indexOf(currentLevel) : -1;
  const nextLevel = resolvedIndex >= 0 ? levels[resolvedIndex + 1] : null;
  const nextThreshold = nextLevel?.minimum
    ?? (Number.isFinite(Number(summary?.level?.nextLevelPoints)) ? Number(summary.level.nextLevelPoints) : null);

  if (!nextThreshold || nextThreshold <= lifetimePoints || !currentLevel) {
    return {
      percentage: 100,
      text: "100% · Maximum level",
      ariaLabel: "Maximum SarapMagBadge level reached"
    };
  }

  const range = Math.max(1, nextThreshold - currentLevel.minimum);
  const rawPercentage = ((lifetimePoints - currentLevel.minimum) / range) * 100;
  const percentage = Math.min(99, Math.max(0, Math.round(rawPercentage)));
  const nextName = String(nextLevel?.name || "next level").trim();
  return {
    percentage,
    text: `${percentage}% to ${nextName}`,
    ariaLabel: `${percentage}% progress to ${nextName}`
  };
}

function renderCustomerLevelProgress(summary = null) {
  ensureCustomerLevelProgressElements();
  document.querySelectorAll("[data-customer-level-progress]").forEach((progress) => {
    if (!summary?.balances || !summary?.level) {
      progress.hidden = true;
      return;
    }

    const state = getCustomerLevelProgress(summary);
    const track = progress.querySelector(".customer-level-progress-track");
    const fill = progress.querySelector("[data-customer-level-progress-fill]");
    const text = progress.querySelector("[data-customer-level-progress-text]");
    progress.hidden = false;
    if (fill) fill.style.width = `${state.percentage}%`;
    if (text) text.textContent = state.text;
    if (track) {
      track.setAttribute("aria-valuenow", String(state.percentage));
      track.setAttribute("aria-label", state.ariaLabel);
    }
  });
}

function renderCustomerLevelBadge(summary = null) {
  const levelName = String(summary?.level?.name || "Noob").trim() || "Noob";
  const levelCode = String(summary?.level?.code || levelName).trim().toLowerCase();
  const badgeAsset = customerLevelBadgeAssets[levelCode] || customerLevelBadgeAssets.noob;
  document.querySelectorAll("[data-customer-level-badge]").forEach((link) => {
    const image = document.createElement("img");
    image.src = badgeAsset;
    image.alt = `${levelName} SarapMagBadge`;
    const label = document.createElement("span");
    label.className = "customer-level-badge-label";
    label.textContent = `Open ${levelName} SarapMagBadge`;
    link.replaceChildren(image, label);
    link.setAttribute("aria-label", `Open your ${levelName} SarapMagBadge`);
    link.removeAttribute("aria-busy");
  });
  renderCustomerLevelProgress(summary);
}

async function loadCustomerLevelBadge() {
  const loadVersion = ++customerLevelBadgeLoadVersion;
  if (!customerState.account) {
    renderCustomerLevelBadge();
    return;
  }
  document.querySelectorAll("[data-customer-level-badge]").forEach((link) => link.setAttribute("aria-busy", "true"));
  try {
    const summary = await apiRequest("/api/public/loyalty/badge");
    if (loadVersion === customerLevelBadgeLoadVersion && customerState.account) {
      renderCustomerLevelBadge(summary);
    }
  } catch {
    if (loadVersion === customerLevelBadgeLoadVersion) {
      renderCustomerLevelBadge();
    }
  }
}

function updateNotificationBadges(count = 0) {
  notificationState.unreadCount = Math.max(0, Number(count) || 0);
  document.querySelectorAll("[data-notification-badge]").forEach((badge) => {
    badge.textContent = notificationState.unreadCount > 99 ? "99+" : String(notificationState.unreadCount);
    badge.hidden = notificationState.unreadCount === 0;
  });
  document.querySelectorAll("[data-notification-trigger]").forEach((trigger) => {
    trigger.setAttribute("aria-label", notificationState.unreadCount > 0
      ? `Notifications, ${notificationState.unreadCount} unread`
      : "Notifications");
  });
  document.querySelectorAll("[data-avatar-notification-trigger]").forEach((trigger) => {
    trigger.hidden = notificationState.unreadCount === 0;
  });
}

function ensureAccountNotificationTrigger() {
  document.querySelectorAll("[data-customer-session]").forEach((session) => {
    if (session.querySelector("[data-avatar-notification-trigger]")) return;
    const avatar = session.querySelector("[data-account-menu-toggle]");
    if (!avatar) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "account-notification-button";
    button.dataset.notificationTrigger = "";
    button.dataset.avatarNotificationTrigger = "";
    button.setAttribute("aria-label", "Notifications");
    button.hidden = true;
    button.innerHTML = '<b data-notification-badge hidden>0</b>';
    avatar.insertAdjacentElement("afterend", button);
  });
}

function ensureNotificationDrawer() {
  let drawer = document.querySelector("[data-notification-drawer]");
  if (drawer) return drawer;

  drawer = document.createElement("div");
  drawer.className = "notification-drawer";
  drawer.dataset.notificationDrawer = "";
  drawer.hidden = true;
  drawer.innerHTML = `
    <section role="dialog" aria-modal="true" aria-labelledby="notification-drawer-title">
      <header>
        <div>
          <span>Customer updates</span>
          <h2 id="notification-drawer-title">Notifications</h2>
        </div>
        <button type="button" data-notification-close aria-label="Close notifications">Close</button>
      </header>
      <div class="notification-drawer-tools">
        <p data-notification-summary>Loading notifications...</p>
        <button type="button" data-notification-read-all>Mark all as read</button>
      </div>
      <div class="notification-list" data-notification-list aria-live="polite"></div>
      <button class="notification-load-more" type="button" data-notification-load-more hidden>Load more</button>
    </section>
  `;
  document.body.append(drawer);
  drawer.addEventListener("click", (event) => {
    if (event.target === drawer || event.target.closest("[data-notification-close]")) {
      closeNotificationDrawer();
    }
  });
  drawer.querySelector("[data-notification-read-all]")?.addEventListener("click", markAllNotificationsRead);
  drawer.querySelector("[data-notification-load-more]")?.addEventListener("click", () => loadNotifications(false));
  return drawer;
}

function getNotificationIcon(type) {
  if (type === "post_like" || type === "comment_like") return "♥";
  if (type === "testimonial_received") return "★";
  if (type === "new_event") return "◴";
  if (type === "event_registration_updated") return "✓";
  return "↩";
}

function formatNotificationTime(value) {
  const date = new Date(value);
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

function renderNotificationItem(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `notification-item${item.isUnread ? " is-unread" : ""}`;
  const avatar = document.createElement("span");
  avatar.className = "notification-item-avatar";
  if (item.actorAvatarUrl) {
    const image = document.createElement("img");
    image.src = normalizeApiUrl(item.actorAvatarUrl);
    image.alt = item.actorName ? `${item.actorName} profile picture` : "Customer profile picture";
    image.loading = "lazy";
    avatar.append(image);
  } else {
    avatar.textContent = getNotificationIcon(item.type);
  }
  const content = document.createElement("span");
  content.className = "notification-item-content";
  content.append(
    createTextElement("strong", item.title || "Notification"),
    createTextElement("span", item.message || "You have a new update."),
    createTextElement("small", formatNotificationTime(item.createdAt))
  );
  const unread = document.createElement("i");
  unread.setAttribute("aria-label", item.isUnread ? "Unread" : "Read");
  button.append(avatar, content, unread);
  button.addEventListener("click", () => openNotification(item));
  return button;
}

function renderNotifications() {
  const drawer = ensureNotificationDrawer();
  const list = drawer.querySelector("[data-notification-list]");
  const summary = drawer.querySelector("[data-notification-summary]");
  const readAll = drawer.querySelector("[data-notification-read-all]");
  const loadMore = drawer.querySelector("[data-notification-load-more]");
  summary.textContent = notificationState.unreadCount > 0
    ? `${notificationState.unreadCount} unread ${notificationState.unreadCount === 1 ? "update" : "updates"}`
    : "You're all caught up.";
  readAll.hidden = notificationState.unreadCount === 0;
  loadMore.hidden = !notificationState.hasMore;
  list.replaceChildren();
  if (notificationState.items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "notification-empty";
    empty.append(createTextElement("strong", "No notifications yet"), createTextElement("p", "Replies, likes, testimonials, events, and registration updates will appear here."));
    list.append(empty);
    return;
  }
  notificationState.items.forEach((item) => list.append(renderNotificationItem(item)));
}

async function loadNotificationUnreadCount() {
  if (!customerState.account) {
    updateNotificationBadges(0);
    return;
  }
  try {
    const result = await apiRequest("/api/public/customer-account/notifications/unread-count");
    updateNotificationBadges(result?.unreadCount || 0);
  } catch {
    updateNotificationBadges(0);
  }
}

async function loadNotifications(reset = true) {
  if (!customerState.account || notificationState.isLoading) return;
  notificationState.isLoading = true;
  if (reset) {
    notificationState.skip = 0;
    notificationState.items = [];
  }
  const drawer = ensureNotificationDrawer();
  if (reset) {
    drawer.querySelector("[data-notification-list]").innerHTML = '<div class="notification-empty"><strong>Loading notifications</strong><p>Checking your latest customer updates.</p></div>';
  }
  try {
    const result = await apiRequest(`/api/public/customer-account/notifications?skip=${notificationState.skip}&take=${notificationState.take}`);
    const rows = Array.isArray(result?.items) ? result.items : [];
    notificationState.items = reset ? rows : [...notificationState.items, ...rows];
    notificationState.skip = notificationState.items.length;
    notificationState.hasMore = Boolean(result?.hasMore);
    updateNotificationBadges(result?.unreadCount || 0);
    renderNotifications();
  } catch (error) {
    const list = drawer.querySelector("[data-notification-list]");
    list.innerHTML = '<div class="notification-empty"><strong>Notifications unavailable</strong><p>Please close this panel and try again.</p></div>';
  } finally {
    notificationState.isLoading = false;
  }
}

function openNotificationDrawer() {
  if (!customerState.account) {
    if (getCustomerLoginForm()) {
      openCommunityLoginForm();
    } else {
      window.location.href = "index.html?login=1#community";
    }
    return;
  }
  const drawer = ensureNotificationDrawer();
  drawer.hidden = false;
  document.body.classList.add("has-notification-drawer");
  setMobileNavActive("notifications");
  loadNotifications(true);
  drawer.querySelector("[data-notification-close]")?.focus();
}

function closeNotificationDrawer() {
  const drawer = document.querySelector("[data-notification-drawer]");
  if (!drawer) return;
  drawer.hidden = true;
  document.body.classList.remove("has-notification-drawer");
  setMobileNavActive(getDefaultMobileNavKey());
}

async function markAllNotificationsRead() {
  try {
    await apiRequest("/api/public/customer-account/notifications/read-all", { method: "POST" });
    notificationState.items = notificationState.items.map((item) => ({ ...item, isUnread: false, readAt: item.readAt || new Date().toISOString() }));
    updateNotificationBadges(0);
    renderNotifications();
  } catch {
    // Keep the current unread state when the request cannot be completed.
  }
}

async function openNotification(item) {
  try {
    if (item.isUnread) {
      await apiRequest(`/api/public/customer-account/notifications/${encodeURIComponent(item.id)}/read`, { method: "PATCH" });
      updateNotificationBadges(Math.max(0, notificationState.unreadCount - 1));
    }
  } catch {
    // Navigation remains available even if marking the notification read fails.
  }
  const target = new URL(String(item.link || "index.html"), window.location.origin);
  if (target.origin === window.location.origin) {
    window.location.href = `${target.pathname}${target.search}${target.hash}`;
  }
}

function initializeNotifications() {
  ensureAccountNotificationTrigger();
  ensureNotificationDrawer();
  document.querySelectorAll("[data-notification-trigger]").forEach((button) => {
    if (button.dataset.notificationBound === "true") return;
    button.dataset.notificationBound = "true";
    button.addEventListener("click", openNotificationDrawer);
  });
  window.addEventListener("customer-session-changed", () => {
    loadNotificationUnreadCount();
    if (!customerState.account) closeNotificationDrawer();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) loadNotificationUnreadCount();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !document.querySelector("[data-notification-drawer]")?.hidden) closeNotificationDrawer();
  });
  window.clearInterval(notificationState.pollTimer);
  notificationState.pollTimer = window.setInterval(loadNotificationUnreadCount, 60000);
}

function getCustomerLoginForm() {
  return document.querySelector("[data-customer-login-form]");
}

function addStaySignedInControls() {
  document.querySelectorAll("[data-customer-login-form], [data-community-login-form]").forEach((form) => {
    if (!form.elements?.username || form.elements.staySignedIn) {
      return;
    }

    const control = document.createElement("label");
    control.className = "stay-signed-in-control";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "staySignedIn";
    checkbox.value = "true";

    const text = document.createElement("span");
    text.textContent = "Stay signed in on this device";

    const note = document.createElement("small");
    note.textContent = "Use only on a personal device.";

    control.append(checkbox, text, note);
    const submitButton = form.querySelector("button[type='submit']");
    const submitRow = submitButton?.parentElement === form ? submitButton : submitButton?.parentElement;
    form.insertBefore(control, submitRow || null);
  });
}

function getCustomerSessionPanel() {
  return document.querySelector("[data-customer-session]");
}

function getProfileForm() {
  return document.querySelector("[data-profile-form]");
}

function getChangePasswordForm() {
  return document.querySelector("[data-change-password-form]");
}

function normalizeProfileImageUrl(url) {
  if (!url) {
    return "";
  }
  return url.startsWith("/") ? `${getApiBaseUrl()}${url}` : url;
}

function getAccountInitials(account = customerState.account) {
  const source = account?.username || account?.email || "SMB";
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("") || "SMB";
}

function renderAvatar(container, account = customerState.account) {
  if (!container) {
    return;
  }

  container.replaceChildren();
  const imageUrl = normalizeProfileImageUrl(account?.profilePictureUrl || customerState.profile?.profilePictureUrl);
  if (imageUrl) {
    const image = document.createElement("img");
    image.alt = `${account?.username || "Customer"} profile picture`;
    image.src = imageUrl;
    container.append(image);
    return;
  }

  container.textContent = getAccountInitials(account);
}

function setAccountMenuOpen(open) {
  const menu = document.querySelector("[data-account-menu]");
  const toggle = document.querySelector("[data-account-menu-toggle]");
  if (menu) {
    menu.hidden = !open;
  }
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(open));
  }
}

function setComingSoonHeaderMenuOpen(open) {
  const menu = document.querySelector("[data-coming-soon-header-menu]");
  const toggle = document.querySelector("[data-coming-soon-header-menu-toggle]");
  if (menu) {
    menu.hidden = !open;
  }
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(open));
  }
}

function setMobileHeaderMenuOpen(open) {
  const menu = document.querySelector("[data-mobile-header-menu]");
  const toggle = document.querySelector("[data-mobile-header-menu-toggle]");
  if (menu) {
    menu.hidden = !open;
  }
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(open));
  }
}

function setMessage(element, message, type = "") {
  if (!element) {
    return;
  }
  element.textContent = message || "";
  element.classList.toggle("is-error", type === "error");
  element.classList.toggle("is-success", type === "success");
}

function closeCustomerWelcomeModal() {
  const modal = document.querySelector("[data-customer-welcome-modal]");
  if (!modal) {
    return;
  }
  modal.hidden = true;
  document.body.classList.remove("has-customer-welcome");
}

function ensureCustomerWelcomeModal() {
  let modal = document.querySelector("[data-customer-welcome-modal]");
  if (modal) {
    return modal;
  }

  modal = document.createElement("div");
  modal.className = "customer-welcome-modal";
  modal.dataset.customerWelcomeModal = "";
  modal.hidden = true;
  modal.innerHTML = `
    <section role="dialog" aria-modal="true" aria-labelledby="customer-welcome-title">
      <span class="customer-welcome-icon" aria-hidden="true">✓</span>
      <p>Account created</p>
      <h2 id="customer-welcome-title" data-customer-welcome-title>Welcome!</h2>
      <p>Your SarapMagBike account is ready. You are now logged in and can explore the shop.</p>
      <button type="button" data-customer-welcome-close>Continue to Home</button>
    </section>
  `;
  modal.querySelector("[data-customer-welcome-close]")?.addEventListener("click", closeCustomerWelcomeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeCustomerWelcomeModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeCustomerWelcomeModal();
    }
  });
  document.body.append(modal);
  return modal;
}

function showCustomerWelcomeModal(username) {
  const modal = ensureCustomerWelcomeModal();
  const displayName = String(username || "Rider").trim() || "Rider";
  const title = modal.querySelector("[data-customer-welcome-title]");
  if (title) {
    title.textContent = `Welcome, ${displayName}!`;
  }
  modal.hidden = false;
  document.body.classList.add("has-customer-welcome");
  window.setTimeout(() => modal.querySelector("[data-customer-welcome-close]")?.focus(), 0);
}

function showProfileMode(show) {
  document.body.classList.toggle("is-profile-mode", show);
  if (show) {
    document.body.classList.remove("is-community-mode", "is-catalog-mode");
    const communityView = document.querySelector("[data-community-view]");
    if (communityView) {
      communityView.hidden = true;
    }
  }
  const profileView = document.querySelector("[data-profile-view]");
  if (profileView) {
    profileView.hidden = !show;
  }
  if (show) {
    setMobileNavActive("account");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function hasProfileSurface() {
  return Boolean(document.querySelector("[data-profile-view]") && getProfileForm());
}

function routeToProfileSurface(mode = "register") {
  const target = mode === "edit" ? "profile-edit" : "profile-register";
  window.location.href = `index.html#${target}`;
}

function handleProfileDeepLink() {
  if (!hasProfileSurface()) {
    return;
  }

  if (window.location.hash === "#profile-edit") {
    openEditProfileForm();
    return;
  }

  if (window.location.hash === "#profile-register") {
    openRegisterForm();
  }
}

function updateCustomerHeader() {
  const loginForm = getCustomerLoginForm();
  const sessionPanel = getCustomerSessionPanel();
  const greeting = document.querySelector("[data-customer-greeting]");
  const email = document.querySelector("[data-account-email]");
  const comingSoonGuest = document.querySelector("[data-coming-soon-account-guest]");
  const comingSoonMember = document.querySelector("[data-coming-soon-account-member]");
  const comingSoonName = document.querySelector("[data-coming-soon-account-name]");
  const comingSoonRegisterAction = document.querySelector("[data-coming-soon-register-action]");
  const comingSoonHeaderLogin = document.querySelector("[data-coming-soon-header-login]");
  const comingSoonHeaderRegister = document.querySelector("[data-coming-soon-header-register]");
  const comingSoonHeaderSession = document.querySelector("[data-coming-soon-header-session]");
  const comingSoonHeaderName = document.querySelector("[data-coming-soon-header-name]");
  const comingSoonHeaderEmail = document.querySelector("[data-coming-soon-header-email]");
  const communityComposerAvatar = document.querySelector("[data-community-composer-avatar]");
  const communityComposer = document.querySelector("[data-community-composer]");
  const communityComposerPrompt = document.querySelector("[data-community-composer-prompt]");
  const isLoggedIn = Boolean(customerState.account);
  const customerName = customerState.account?.username || customerState.account?.email || "Customer";
  const customerEmail = customerState.profile?.email || customerState.account?.email || "";

  if (loginForm) {
    loginForm.hidden = isLoggedIn;
  }
  if (sessionPanel) {
    sessionPanel.hidden = !isLoggedIn;
  }
  if (comingSoonHeaderRegister) {
    comingSoonHeaderRegister.hidden = isLoggedIn;
  }
  if (comingSoonHeaderLogin) {
    comingSoonHeaderLogin.hidden = isLoggedIn;
  }
  if (comingSoonHeaderSession) {
    comingSoonHeaderSession.hidden = !isLoggedIn;
  }
  document.querySelectorAll("[data-mobile-header-login], [data-mobile-header-register]").forEach((element) => {
    element.hidden = isLoggedIn;
  });
  document.querySelectorAll("[data-mobile-header-session]").forEach((element) => {
    element.hidden = !isLoggedIn;
  });
  if (comingSoonGuest) {
    comingSoonGuest.hidden = isLoggedIn;
  }
  if (comingSoonMember) {
    comingSoonMember.hidden = !isLoggedIn;
  }
  if (comingSoonName) {
    comingSoonName.textContent = customerName;
  }
  if (comingSoonHeaderName) {
    comingSoonHeaderName.textContent = customerName;
  }
  if (comingSoonHeaderEmail) {
    comingSoonHeaderEmail.textContent = customerEmail;
  }
  document.querySelectorAll("[data-mobile-header-name]").forEach((element) => {
    element.textContent = customerName;
  });
  document.querySelectorAll("[data-mobile-header-email]").forEach((element) => {
    element.textContent = customerEmail;
  });
  if (comingSoonRegisterAction) {
    comingSoonRegisterAction.hidden = isLoggedIn;
  }
  if (communityComposerAvatar) {
    communityComposerAvatar.hidden = !isLoggedIn;
  }
  if (communityComposer) {
    communityComposer.classList.toggle("has-customer-avatar", isLoggedIn);
  }
  document.querySelector("[data-community-composer-launcher]")?.classList.toggle("has-customer-avatar", isLoggedIn);
  document.querySelector("[data-community-composer-launcher-row]")?.classList.toggle("has-customer-avatar", isLoggedIn);
  if (communityComposerPrompt) {
    communityComposerPrompt.textContent = isLoggedIn
      ? "What's on your mind?"
      : "Register or Login to join the discussion.";
  }
  setAccountMenuOpen(false);
  setComingSoonHeaderMenuOpen(false);
  setMobileHeaderMenuOpen(false);
  renderAvatar(document.querySelector("[data-account-avatar]"));
  renderAvatar(document.querySelector("[data-account-menu-avatar]"));
  renderAvatar(document.querySelector("[data-coming-soon-account-avatar]"));
  renderAvatar(document.querySelector("[data-coming-soon-header-avatar]"));
  document.querySelectorAll("[data-mobile-header-avatar]").forEach((element) => renderAvatar(element));
  renderAvatar(communityComposerAvatar);
  if (greeting && customerState.account) {
    greeting.textContent = customerState.account.username;
  }
  if (email) {
    email.textContent = customerState.profile?.email || customerState.account?.email || "Email not set";
  }
  updateCommunityAuthState();
  if (communityState.posts.length > 0) {
    renderCommunityPosts();
    refreshCommunityThreadModal();
  }
  if (isEventsPage() && eventsState.activeEvent) {
    renderEventDetail(eventsState.activeEvent);
  }
}

function setPasswordFieldsVisible(visible) {
  const passwordFields = document.querySelector("[data-password-fields]");
  const profileForm = getProfileForm();
  if (passwordFields) {
    passwordFields.hidden = !visible;
  }
  if (profileForm) {
    if (profileForm.elements.password) {
      profileForm.elements.password.required = visible;
    }
    if (profileForm.elements.confirmPassword) {
      profileForm.elements.confirmPassword.required = visible;
    }
  }
}

function setRegistrationFieldsVisible(isRegistration) {
  const form = getProfileForm();
  document.querySelectorAll("[data-registration-optional]").forEach((element) => {
    element.hidden = isRegistration;
  });
  const note = document.querySelector("[data-registration-note]");
  if (note) {
    note.hidden = !isRegistration;
  }
  form?.classList.toggle("is-registration-form", isRegistration);
}

function renderProfilePhoto(url) {
  const preview = document.querySelector("[data-profile-photo-preview]");
  if (!preview) {
    return;
  }

  preview.replaceChildren();
  if (url) {
    const image = document.createElement("img");
    image.alt = "Profile picture preview";
    image.src = url.startsWith("/") ? `${getApiBaseUrl()}${url}` : url;
    preview.append(image);
    return;
  }

  preview.textContent = "SMB";
}

function fillProfileForm(profile) {
  const form = getProfileForm();
  if (!form) {
    return;
  }

  if (form.elements.username) form.elements.username.value = profile?.username || "";
  if (form.elements.email) form.elements.email.value = profile?.email || "";
  if (form.elements.hometown) form.elements.hometown.value = profile?.hometown || "";
  if (form.elements.mobileNumber) form.elements.mobileNumber.value = profile?.mobileNumber || "";
  if (form.elements.facebookAccount) form.elements.facebookAccount.value = profile?.facebookAccount || "";
  if (form.elements.birthday) form.elements.birthday.value = profile?.birthday || "";
  if (form.elements.password) form.elements.password.value = "";
  if (form.elements.confirmPassword) form.elements.confirmPassword.value = "";
  if (form.elements.marketingConsent) form.elements.marketingConsent.checked = false;
  form.querySelectorAll("input[name='riderTypes']").forEach((input) => {
    input.checked = (profile?.riderTypes || []).includes(input.value);
  });
  customerState.profileImage = null;
  renderProfilePhoto(profile?.profilePictureUrl || profile?.profilePictureUrl === null ? profile.profilePictureUrl : profile?.profilePictureUrl);
  if (profile?.profilePictureUrl) {
    renderProfilePhoto(profile.profilePictureUrl);
  }
}

function openRegisterForm() {
  if (!hasProfileSurface()) {
    routeToProfileSurface("register");
    return;
  }

  customerState.mode = "register";
  const form = getProfileForm();
  const title = document.querySelector("[data-profile-title]");
  const eyebrow = document.querySelector("[data-profile-eyebrow]");
  const submit = document.querySelector("[data-profile-submit]");
  const changeButton = document.querySelector("[data-open-change-password]");

  if (title) {
    title.textContent = "Create your SarapMagBike account";
  }
  if (eyebrow) {
    eyebrow.textContent = "Customer registration";
  }
  if (submit) {
    submit.textContent = "Create Account";
  }
  if (changeButton) {
    changeButton.hidden = true;
  }
  if (form) {
    form.reset();
    if (form.elements.username) {
      form.elements.username.disabled = false;
    }
  }
  setRegistrationFieldsVisible(true);
  setPasswordFieldsVisible(true);
  renderProfilePhoto(null);
  setMessage(document.querySelector("[data-profile-message]"), "");
  getChangePasswordForm()?.setAttribute("hidden", "");
  showProfileMode(true);
}

async function openEditProfileForm() {
  if (!hasProfileSurface()) {
    routeToProfileSurface("edit");
    return;
  }

  setAccountMenuOpen(false);
  customerState.mode = "edit";
  const form = getProfileForm();
  const title = document.querySelector("[data-profile-title]");
  const eyebrow = document.querySelector("[data-profile-eyebrow]");
  const submit = document.querySelector("[data-profile-submit]");
  const changeButton = document.querySelector("[data-open-change-password]");

  if (title) {
    title.textContent = "Edit your SarapMagBike profile";
  }
  if (eyebrow) {
    eyebrow.textContent = "Customer profile";
  }
  if (submit) {
    submit.textContent = "Save Profile";
  }
  if (changeButton) {
    changeButton.hidden = false;
  }
  if (form) {
    if (form.elements.username) {
      form.elements.username.disabled = true;
    }
  }
  setRegistrationFieldsVisible(false);
  setPasswordFieldsVisible(false);
  setMessage(document.querySelector("[data-profile-message]"), "Loading profile...");

  try {
    const profile = await apiRequest("/api/public/customer-account/profile");
    customerState.profile = profile;
    fillProfileForm(profile);
    setMessage(document.querySelector("[data-profile-message]"), "");
    showProfileMode(true);
  } catch (error) {
    setMessage(document.querySelector("[data-profile-message]"), "Please log in before editing your profile.", "error");
    customerState.account = null;
    updateCustomerHeader();
  }
}

function getSelectedRiderTypes(form) {
  return Array.from(form.querySelectorAll("input[name='riderTypes']:checked")).map((input) => input.value);
}

async function readProfileImage(file) {
  if (!file) {
    return null;
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Profile picture must be JPG, PNG, or WebP.");
  }
  if (file.size > 1_000_000) {
    throw new Error("Profile picture must be 1 MB or smaller.");
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Profile picture could not be read."));
    reader.readAsDataURL(file);
  });
  const [, base64 = ""] = dataUrl.split(",");
  return {
    base64,
    contentType: file.type,
    dataUrl
  };
}

async function submitProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("[data-profile-message]");
  setMessage(message, "Saving profile...");

  try {
    const image = customerState.profileImage;
    const payload = {
      username: form.elements.username ? form.elements.username.value.trim() : "",
      password: form.elements.password ? form.elements.password.value : "",
      confirmPassword: form.elements.confirmPassword ? form.elements.confirmPassword.value : "",
      email: form.elements.email ? form.elements.email.value.trim() : "",
      hometown: form.elements.hometown ? form.elements.hometown.value.trim() : "",
      mobileNumber: form.elements.mobileNumber ? form.elements.mobileNumber.value.trim() : "",
      facebookAccount: form.elements.facebookAccount ? form.elements.facebookAccount.value.trim() : "",
      birthday: (form.elements.birthday && form.elements.birthday.value) || null,
      riderTypes: getSelectedRiderTypes(form),
      profileImageBase64: image?.base64 || null,
      profileImageContentType: image?.contentType || null,
      marketingConsent: form.elements.marketingConsent ? form.elements.marketingConsent.checked : false,
      website: form.elements.website ? form.elements.website.value : ""
    };

    if (!payload.email || !form.elements.email.checkValidity()) {
      throw new Error("Enter a valid email address.");
    }
    if (payload.mobileNumber && !/^(?:\+639|09)\d{9}$/.test(payload.mobileNumber.replace(/[\s()-]/g, ""))) {
      throw new Error("Enter a valid Philippine mobile number, such as 09171234567 or +639171234567.");
    }
    if (customerState.mode === "register" && payload.password !== payload.confirmPassword) {
      throw new Error("Password and confirm password must match.");
    }

    if (customerState.mode === "register") {
      customerState.account = await apiRequest("/api/public/customer-account/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const createdUsername = customerState.account?.username || payload.username;
      updateCustomerHeader();
      window.dispatchEvent(new CustomEvent("customer-session-changed"));
      form.reset();
      hideCommunityAuthPrompt();
      returnToHome({ updatePath: true });
      showCustomerWelcomeModal(createdUsername);
      return;
    }

    const profile = await apiRequest("/api/public/customer-account/profile", {
      method: "PUT",
      body: JSON.stringify({
        email: payload.email,
        hometown: payload.hometown,
        mobileNumber: payload.mobileNumber,
        facebookAccount: payload.facebookAccount,
        birthday: payload.birthday,
        riderTypes: payload.riderTypes,
        profileImageBase64: payload.profileImageBase64,
        profileImageContentType: payload.profileImageContentType,
        marketingConsent: payload.marketingConsent
      })
    });
    customerState.profile = profile;
    customerState.account = {
      ...customerState.account,
      email: profile.email,
      profilePictureUrl: profile.profilePictureUrl
    };
    customerState.profileImage = null;
    updateCustomerHeader();
    setMessage(message, "Profile saved.", "success");
  } catch (error) {
    setMessage(message, error.message || "Unable to save profile.", "error");
  }
}

async function loginCustomer(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const wasInCommunity = document.body.classList.contains("is-community-mode");
  const isComingSoonPage = document.body.classList.contains("is-coming-soon-page");
  const isRiderProfilePage = document.body.classList.contains("is-rider-profile-page");
  const message = form.querySelector("[data-community-login-message]");
  const submitButton = form.querySelector("button[type='submit']");
  setMessage(message, "", "");
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Logging in...";
  }
  try {
    customerState.account = await apiRequest("/api/public/customer-account/login", {
      method: "POST",
      body: JSON.stringify({
        username: form.elements.username.value.trim(),
        password: form.elements.password.value,
        website: form.elements.website.value,
        staySignedIn: Boolean(form.elements.staySignedIn?.checked)
      })
    });
    form.reset();
    updateCustomerHeader();
    await recordDailyLoyaltyVisit();
    window.dispatchEvent(new CustomEvent("customer-session-changed"));
    setMessage(message, "Logged in.", "success");
    hideCommunityAuthPrompt();
    document.querySelector("[data-community-login-form]")?.setAttribute("hidden", "");
    if (isRiderProfilePage) {
      return;
    } else if (wasInCommunity) {
      openCommunityPage(false);
    } else if (isComingSoonPage) {
      showProfileMode(false);
      loadCommunityDiscussions(true);
    } else {
      returnToHome();
    }
  } catch (error) {
    if (message) {
      setMessage(message, "Unable to log in. Check your username and password.", "error");
    } else {
      alert("Unable to log in. Check your username and password.");
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Log in";
    }
  }
}

async function logoutCustomer() {
  await apiRequest("/api/public/customer-account/logout", { method: "POST" }).catch(() => null);
  customerState.account = null;
  customerState.profile = null;
  setAccountMenuOpen(false);
  updateCustomerHeader();
  window.dispatchEvent(new CustomEvent("customer-session-changed"));
  showProfileMode(false);
}

async function toggleAccountMenu() {
  const menu = document.querySelector("[data-account-menu]");
  if (!menu || !customerState.account) {
    return;
  }

  const shouldOpen = menu.hidden;
  setAccountMenuOpen(shouldOpen);
  if (!shouldOpen || customerState.profile) {
    updateCustomerHeader();
    setAccountMenuOpen(shouldOpen);
    return;
  }

  try {
    customerState.profile = await apiRequest("/api/public/customer-account/profile");
    customerState.account = {
      ...customerState.account,
      email: customerState.profile.email,
      profilePictureUrl: customerState.profile.profilePictureUrl
    };
  } catch {
    // Keep the compact account menu usable even when profile details cannot be loaded.
  }
  updateCustomerHeader();
  setAccountMenuOpen(true);
}

async function toggleComingSoonHeaderMenu(event) {
  event?.stopPropagation();
  const menu = document.querySelector("[data-coming-soon-header-menu]");
  if (!menu || !customerState.account) {
    return;
  }

  const shouldOpen = menu.hidden;
  setComingSoonHeaderMenuOpen(shouldOpen);
  if (!shouldOpen || customerState.profile) {
    return;
  }

  try {
    customerState.profile = await apiRequest("/api/public/customer-account/profile");
    customerState.account = {
      ...customerState.account,
      email: customerState.profile.email,
      profilePictureUrl: customerState.profile.profilePictureUrl
    };
    updateCustomerHeader();
    setComingSoonHeaderMenuOpen(true);
  } catch {
    setComingSoonHeaderMenuOpen(true);
  }
}

async function toggleMobileHeaderMenu(event) {
  event?.stopPropagation();
  const menu = document.querySelector("[data-mobile-header-menu]");
  if (!menu || !customerState.account) {
    return;
  }

  const shouldOpen = menu.hidden;
  setMobileHeaderMenuOpen(shouldOpen);
  if (!shouldOpen || customerState.profile) {
    return;
  }

  try {
    customerState.profile = await apiRequest("/api/public/customer-account/profile");
    customerState.account = {
      ...customerState.account,
      email: customerState.profile.email,
      profilePictureUrl: customerState.profile.profilePictureUrl
    };
    updateCustomerHeader();
    setMobileHeaderMenuOpen(true);
  } catch {
    setMobileHeaderMenuOpen(true);
  }
}

async function restoreCustomerSession() {
  try {
    customerState.account = await apiRequest("/api/public/customer-account/session");
    await recordDailyLoyaltyVisit();
  } catch (error) {
    customerState.account = null;
  }
  updateCustomerHeader();
  window.dispatchEvent(new CustomEvent("customer-session-changed"));
}

async function recordDailyLoyaltyVisit() {
  if (!customerState.account) return;
  try {
    await apiRequest("/api/public/loyalty/daily-visit", { method: "POST", body: "{}" });
  } catch {
    // Authentication remains usable if loyalty is temporarily unavailable or not enabled.
  }
}

async function submitChangePassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("[data-password-message]");
  setMessage(message, "Saving password...");

  try {
    await apiRequest("/api/public/customer-account/change-password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: form.elements.currentPassword.value,
        newPassword: form.elements.newPassword.value,
        confirmPassword: form.elements.confirmNewPassword.value
      })
    });
    form.reset();
    form.hidden = true;
    setMessage(message, "Password changed.", "success");
  } catch (error) {
    setMessage(message, error.message || "Unable to change password.", "error");
  }
}

function ensureAccountRecoveryUi() {
  document.querySelectorAll("[data-community-login-form]").forEach((form) => {
    if (form.querySelector("[data-account-recovery-links]")) {
      return;
    }
    const links = document.createElement("div");
    links.className = "account-recovery-links";
    links.dataset.accountRecoveryLinks = "";
    links.innerHTML = `
      <button type="button" data-open-account-recovery="username">Forgot username?</button>
      <button type="button" data-open-account-recovery="password">Forgot password?</button>
    `;
    const actions = form.querySelector(".community-login-actions");
    if (actions) {
      actions.insertAdjacentElement("afterend", links);
    } else {
      form.append(links);
    }
  });

  if (document.querySelector("[data-account-recovery-modal]")) {
    return;
  }

  const modal = document.createElement("div");
  modal.className = "account-recovery-modal";
  modal.dataset.accountRecoveryModal = "";
  modal.hidden = true;
  modal.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="account-recovery-title">
      <header>
        <div>
          <p class="section-eyebrow">Account recovery</p>
          <h2 id="account-recovery-title" data-account-recovery-title>Recover your account</h2>
        </div>
        <button type="button" class="account-recovery-close" data-close-account-recovery aria-label="Close account recovery">×</button>
      </header>
      <form data-account-recovery-request-form>
        <p data-account-recovery-description>Enter the email address used during registration.</p>
        <label>
          Registered email
          <input type="email" name="email" autocomplete="email" maxlength="240" required>
        </label>
        <input class="website-field" type="text" name="website" autocomplete="off" tabindex="-1" aria-hidden="true">
        <button type="submit" data-account-recovery-submit>Send recovery email</button>
        <p class="account-recovery-message" data-account-recovery-message role="status"></p>
      </form>
      <form data-password-reset-form hidden>
        <p>Create a new password for your SarapMagBike account.</p>
        <label>
          New password
          <div class="password-control">
            <input type="password" name="newPassword" autocomplete="new-password" minlength="8" required>
            <button type="button" data-recovery-toggle-password>Show</button>
          </div>
        </label>
        <label>
          Confirm new password
          <div class="password-control">
            <input type="password" name="confirmPassword" autocomplete="new-password" minlength="8" required>
            <button type="button" data-recovery-toggle-password>Show</button>
          </div>
        </label>
        <button type="submit">Reset password</button>
        <p class="account-recovery-message" data-password-reset-message role="status"></p>
      </form>
    </div>
  `;
  document.body.append(modal);
}

function closeAccountRecovery() {
  const modal = document.querySelector("[data-account-recovery-modal]");
  if (modal) {
    modal.hidden = true;
  }
}

function openAccountRecovery(mode) {
  ensureAccountRecoveryUi();
  const modal = document.querySelector("[data-account-recovery-modal]");
  const requestForm = modal?.querySelector("[data-account-recovery-request-form]");
  const resetForm = modal?.querySelector("[data-password-reset-form]");
  const title = modal?.querySelector("[data-account-recovery-title]");
  const description = modal?.querySelector("[data-account-recovery-description]");
  const submit = modal?.querySelector("[data-account-recovery-submit]");
  const message = modal?.querySelector("[data-account-recovery-message]");
  if (!modal || !requestForm || !resetForm) {
    return;
  }

  modal.dataset.recoveryMode = mode;
  modal.hidden = false;
  requestForm.hidden = mode === "reset";
  resetForm.hidden = mode !== "reset";
  setMessage(message, "");
  setMessage(modal.querySelector("[data-password-reset-message]"), "");

  if (mode === "username") {
    title.textContent = "Forgot username";
    description.textContent = "Enter the email address used during registration. We will email your username.";
    submit.textContent = "Email my username";
    requestForm.elements.email.focus();
    return;
  }
  if (mode === "password") {
    title.textContent = "Forgot password";
    description.textContent = "Enter the email address used during registration. We will send a secure password-reset link.";
    submit.textContent = "Send reset link";
    requestForm.elements.email.focus();
    return;
  }

  title.textContent = "Reset password";
  resetForm.elements.newPassword.focus();
}

async function submitAccountRecoveryRequest(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const modal = form.closest("[data-account-recovery-modal]");
  const mode = modal?.dataset.recoveryMode === "username" ? "username" : "password";
  const message = form.querySelector("[data-account-recovery-message]");
  const submit = form.querySelector("button[type='submit']");
  setMessage(message, "Sending...");
  submit.disabled = true;

  try {
    const result = await apiRequest(`/api/public/customer-account/forgot-${mode}`, {
      method: "POST",
      body: JSON.stringify({
        email: form.elements.email.value.trim(),
        website: form.elements.website.value
      })
    });
    form.reset();
    setMessage(message, result.message || "If that email is registered, recovery instructions have been sent.", "success");
  } catch (error) {
    setMessage(message, error.message || "Unable to send the recovery email. Please try again.", "error");
  } finally {
    submit.disabled = false;
  }
}

async function submitPasswordReset(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector("[data-password-reset-message]");
  const submit = form.querySelector("button[type='submit']");
  const token = new URLSearchParams(window.location.search).get("passwordResetToken") || "";
  const newPassword = form.elements.newPassword.value;
  const confirmPassword = form.elements.confirmPassword.value;
  if (newPassword !== confirmPassword) {
    setMessage(message, "Password and confirm password must match.", "error");
    return;
  }

  setMessage(message, "Resetting password...");
  submit.disabled = true;
  try {
    const result = await apiRequest("/api/public/customer-account/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword, confirmPassword })
    });
    form.reset();
    const url = new URL(window.location.href);
    url.searchParams.delete("passwordResetToken");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setMessage(message, result.message || "Password reset successfully. You can now log in.", "success");
    window.setTimeout(() => {
      closeAccountRecovery();
      openCommunityLoginForm();
    }, 1200);
  } catch (error) {
    setMessage(message, error.message || "This reset link is invalid or expired.", "error");
  } finally {
    submit.disabled = false;
  }
}

function setLoginPasswordToggleState(button, passwordVisible) {
  button.setAttribute("aria-pressed", String(passwordVisible));
  button.setAttribute("aria-label", passwordVisible ? "Hide password" : "Show password");
  button.title = passwordVisible ? "Hide password" : "Show password";
  button.innerHTML = passwordVisible
    ? `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 3l18 18"></path>
        <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7"></path>
        <path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c5.2 0 9 4.6 9 8a8.8 8.8 0 0 1-1.8 3.8"></path>
        <path d="M6.6 6.6C4.3 8 3 10.2 3 12c0 3.4 3.8 8 9 8 1.6 0 3-.4 4.3-1.1"></path>
      </svg>
    `
    : `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 12s3.8-8 9-8 9 8 9 8-3.8 8-9 8-9-8-9-8z"></path>
        <circle cx="12" cy="12" r="2.6"></circle>
      </svg>
    `;
}

function ensureLoginPasswordToggles() {
  document.querySelectorAll("[data-community-login-form], [data-customer-login-form]").forEach((form) => {
    const input = form.querySelector('input[type="password"][name="password"]');
    if (!(input instanceof HTMLInputElement) || input.closest(".login-password-control")) {
      return;
    }

    const control = document.createElement("span");
    control.className = "login-password-control";
    input.insertAdjacentElement("beforebegin", control);
    control.append(input);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "login-password-toggle";
    toggle.dataset.loginPasswordToggle = "";
    setLoginPasswordToggleState(toggle, false);
    toggle.addEventListener("click", () => {
      const passwordVisible = input.type === "password";
      input.type = passwordVisible ? "text" : "password";
      setLoginPasswordToggleState(toggle, passwordVisible);
      input.focus({ preventScroll: true });
    });
    control.append(toggle);
  });
}

function bindCustomerAccountUi() {
  addStaySignedInControls();
  ensureAccountRecoveryUi();
  ensureCustomerWelcomeModal();
  ensureLoginPasswordToggles();
  document.querySelectorAll("[data-customer-login-form], [data-community-login-form]").forEach((form) => {
    if (!form.elements?.username || form.dataset.customerLoginBound === "true") {
      return;
    }
    form.dataset.customerLoginBound = "true";
    form.addEventListener("submit", loginCustomer);
  });
  document.querySelectorAll("[data-open-account-recovery]").forEach((button) => {
    button.addEventListener("click", () => openAccountRecovery(button.dataset.openAccountRecovery));
  });
  document.querySelector("[data-close-account-recovery]")?.addEventListener("click", closeAccountRecovery);
  document.querySelector("[data-account-recovery-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeAccountRecovery();
    }
  });
  document.querySelector("[data-account-recovery-request-form]")?.addEventListener("submit", submitAccountRecoveryRequest);
  document.querySelector("[data-password-reset-form]")?.addEventListener("submit", submitPasswordReset);
  document.querySelectorAll("[data-recovery-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.closest(".password-control")?.querySelector("input");
      if (!(input instanceof HTMLInputElement)) {
        return;
      }
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
    });
  });
  document.querySelectorAll("[data-open-register]").forEach((button) => {
    button.addEventListener("click", openRegisterForm);
  });
  document.querySelectorAll("[data-open-profile]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      if (customerState.account) {
        window.location.href = "profile.html";
        return;
      }
      openRegisterForm();
    });
  });
  document.querySelector("[data-account-menu-toggle]")?.addEventListener("click", toggleAccountMenu);
  const accountMenuHeader = document.querySelector(".account-menu-header");
  if (accountMenuHeader) {
    const identity = accountMenuHeader.querySelector("div");
    if (identity && !identity.querySelector(".account-menu-profile-link")) {
      const profileLink = document.createElement("a");
      profileLink.className = "account-menu-profile-link";
      profileLink.href = "profile.html";
      profileLink.setAttribute("aria-label", "View your profile");
      while (identity.firstChild) {
        profileLink.appendChild(identity.firstChild);
      }
      identity.appendChild(profileLink);
      profileLink.addEventListener("click", () => setAccountMenuOpen(false));
    }
    if (identity && !identity.querySelector(".account-menu-orders-link")) {
      const badgeLink = document.createElement("a");
      badgeLink.className = "account-menu-badge-link";
      badgeLink.dataset.customerLevelBadge = "";
      badgeLink.href = "badge.html";
      badgeLink.setAttribute("aria-label", "Open My SarapMagBadge");
      badgeLink.innerHTML = '<img src="assets/sarapmagbadge-noob.png" alt="Noob SarapMagBadge"><span class="customer-level-badge-label">Open My SarapMagBadge</span>';
      identity.appendChild(badgeLink);
      badgeLink.addEventListener("click", () => setAccountMenuOpen(false));
      const ordersLink = document.createElement("a");
      ordersLink.className = "account-menu-orders-link";
      ordersLink.href = "orders.html";
      ordersLink.textContent = "My Orders";
      identity.appendChild(ordersLink);
      ordersLink.addEventListener("click", () => setAccountMenuOpen(false));
    }
    if (identity && !identity.querySelector(".account-menu-text-badge-link")) {
      const badgeTextLink = document.createElement("a");
      badgeTextLink.className = "account-menu-text-badge-link";
      badgeTextLink.href = "badge.html";
      badgeTextLink.textContent = "My Badge";
      const ordersLink = identity.querySelector(".account-menu-orders-link");
      if (ordersLink) ordersLink.insertAdjacentElement("afterend", badgeTextLink);
      else identity.appendChild(badgeTextLink);
      badgeTextLink.addEventListener("click", () => setAccountMenuOpen(false));
    }
  }
  document.querySelectorAll(".mobile-header-menu").forEach((menu) => {
    if (!menu.querySelector(".mobile-header-badge-link")) {
      const badgeLink = document.createElement("a");
      badgeLink.className = "mobile-header-badge-link";
      badgeLink.dataset.customerLevelBadge = "";
      badgeLink.href = "badge.html";
      badgeLink.setAttribute("aria-label", "Open My SarapMagBadge");
      badgeLink.innerHTML = '<img src="assets/sarapmagbadge-noob.png" alt="Noob SarapMagBadge"><span class="customer-level-badge-label">Open My SarapMagBadge</span>';
      const profileLink = menu.querySelector(".mobile-header-profile-link");
      profileLink?.insertAdjacentElement("afterend", badgeLink);
    }
    const profileLink = menu.querySelector(".mobile-header-profile-link");
    if (!profileLink) return;
    let ordersLink = menu.querySelector(".mobile-header-orders-link");
    if (!ordersLink) {
      ordersLink = document.createElement("a");
      ordersLink.className = "mobile-header-orders-link";
      ordersLink.href = "orders.html";
      ordersLink.textContent = "My Orders";
      profileLink.insertAdjacentElement("afterend", ordersLink);
    }
    if (!menu.querySelector(".mobile-header-text-badge-link")) {
      const badgeTextLink = document.createElement("a");
      badgeTextLink.className = "mobile-header-text-badge-link";
      badgeTextLink.href = "badge.html";
      badgeTextLink.textContent = "My Badge";
      ordersLink.insertAdjacentElement("afterend", badgeTextLink);
    }
  });
  window.addEventListener("customer-session-changed", () => void loadCustomerLevelBadge());
  document.querySelector("[data-coming-soon-header-login]")?.addEventListener("click", openCommunityLoginForm);
  document.querySelectorAll("[data-desktop-header-login], [data-mobile-header-login]").forEach((button) => {
    button.addEventListener("click", openCommunityLoginForm);
  });
  document.querySelectorAll("[data-community-prompt-close]").forEach((button) => {
    if (button.dataset.authCloseBound === "true") {
      return;
    }
    button.dataset.authCloseBound = "true";
    button.addEventListener("click", hideCommunityAuthPrompt);
  });
  document.querySelector("[data-coming-soon-header-menu-toggle]")?.addEventListener("click", toggleComingSoonHeaderMenu);
  document.querySelector("[data-mobile-header-menu-toggle]")?.addEventListener("click", toggleMobileHeaderMenu);
  document.querySelector("[data-edit-profile]")?.addEventListener("click", () => { window.location.href = "profile.html"; });
  document.querySelector("[data-logout]")?.addEventListener("click", logoutCustomer);
  document.querySelector("[data-coming-soon-header-logout]")?.addEventListener("click", logoutCustomer);
  document.querySelector("[data-mobile-header-logout]")?.addEventListener("click", logoutCustomer);
  document.querySelector("[data-close-profile]")?.addEventListener("click", () => showProfileMode(false));
  document.addEventListener("click", (event) => {
    const sessionPanel = getCustomerSessionPanel();
    if (sessionPanel && !sessionPanel.contains(event.target)) {
      setAccountMenuOpen(false);
    }
    const comingSoonHeaderSession = document.querySelector("[data-coming-soon-header-session]");
    if (comingSoonHeaderSession && !comingSoonHeaderSession.contains(event.target)) {
      setComingSoonHeaderMenuOpen(false);
    }
    const mobileHeaderSession = document.querySelector("[data-mobile-header-session]");
    if (mobileHeaderSession && !mobileHeaderSession.contains(event.target)) {
      setMobileHeaderMenuOpen(false);
    }
  });
  getProfileForm()?.addEventListener("submit", submitProfile);
  getChangePasswordForm()?.addEventListener("submit", submitChangePassword);
  document.querySelector("[data-open-change-password]")?.addEventListener("click", () => {
    const form = getChangePasswordForm();
    if (form) {
      form.hidden = !form.hidden;
      setMessage(document.querySelector("[data-password-message]"), "");
    }
  });
  document.querySelector("[data-cancel-change-password]")?.addEventListener("click", () => {
    const form = getChangePasswordForm();
    if (form) {
      form.reset();
      form.hidden = true;
    }
  });

  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.closest(".password-control")?.querySelector("input");
      if (!(input instanceof HTMLInputElement)) {
        return;
      }
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
    });
  });

  getProfileForm()?.elements.profilePicture.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    const message = document.querySelector("[data-profile-message]");
    try {
      customerState.profileImage = await readProfileImage(file);
      renderProfilePhoto(customerState.profileImage?.dataUrl || customerState.profile?.profilePictureUrl || null);
      setMessage(message, "");
    } catch (error) {
      customerState.profileImage = null;
      event.target.value = "";
      setMessage(message, error.message || "Profile picture could not be read.", "error");
    }
  });

  restoreCustomerSession();
  window.setTimeout(handleProfileDeepLink, 0);
  if (initialPageParams.get("passwordResetToken")) {
    window.setTimeout(() => openAccountRecovery("reset"), 0);
  }
}
