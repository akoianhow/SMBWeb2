function ensureStandardMobileHeaderActions() {
  const header = document.querySelector(".header-main, .rider-profile-site-header-inner");
  const logo = header?.querySelector(".logo");
  if (!header || !logo) {
    return;
  }

  let actions = header.querySelector(".mobile-header-actions");
  if (!actions) {
    actions = document.createElement("div");
    logo.insertAdjacentElement("afterend", actions);
  }
  actions.className = "mobile-header-actions";
  actions.setAttribute("aria-label", "Mobile quick actions");
  actions.innerHTML = `
    <button class="mobile-header-search" type="button" data-product-search-open aria-label="Search products" title="Search products">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6"></circle>
        <path d="m16 16 4 4"></path>
      </svg>
    </button>
    <button class="mobile-header-account" type="button" data-mobile-header-login aria-label="Log in or create an account" title="Account">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="4"></circle>
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path>
      </svg>
    </button>
    <div class="mobile-header-session" data-mobile-header-session hidden>
      <button class="mobile-header-avatar-button" type="button" data-mobile-header-menu-toggle aria-label="Open account menu" aria-expanded="false">
        <span data-mobile-header-avatar>SMB</span>
      </button>
      <div class="mobile-header-menu" data-mobile-header-menu hidden>
        <strong data-mobile-header-name>Customer</strong>
        <span data-mobile-header-email></span>
        <a class="mobile-header-profile-link" href="profile.html">View Profile</a>
        <a class="mobile-header-badge-link" data-customer-level-badge href="badge.html" aria-label="Open My SarapMagBadge">
          <img src="assets/sarapmagbadge-noob.png" alt="Noob SarapMagBadge">
          <span class="customer-level-badge-label">Open My SarapMagBadge</span>
        </a>
        <a class="mobile-header-orders-link" href="orders.html">My Orders</a>
        <button type="button" data-mobile-header-logout>Logout</button>
      </div>
    </div>
  `;
}

function ensureStandardProductSearchActions() {
  const desktopActions = document.querySelector(".topbar-options");
  if (!desktopActions || desktopActions.querySelector(".site-search-button-desktop")) {
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "site-search-button site-search-button-desktop";
  button.dataset.productSearchOpen = "";
  button.setAttribute("aria-label", "Search products");
  button.title = "Search products";
  button.innerHTML = `
    <span aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <circle cx="11" cy="11" r="6"></circle>
        <path d="m16 16 4 4"></path>
      </svg>
    </span>
  `;

  const session = desktopActions.querySelector("[data-customer-session]");
  if (session) {
    session.insertAdjacentElement("afterend", button);
  } else {
    desktopActions.append(button);
  }
}

function ensureConsistentSiteHeader() {
  const legacyHeader = document.querySelector(".rider-profile-site-header");
  if (!legacyHeader) {
    return;
  }

  const topbar = document.createElement("header");
  topbar.className = "topbar";
  topbar.innerHTML = `
    <div class="wrap topbar-inner">
      <nav aria-label="Utility navigation">
        <a href="index.html#contact">Contact Us</a>
        <a href="services.html">Book Service</a>
      </nav>
      <div class="topbar-options">
        <span>English</span>
        <span>Prices in PHP</span>
      </div>
    </div>`;

  const headerMain = document.createElement("div");
  headerMain.className = "wrap header-main";
  headerMain.innerHTML = `
    <a class="logo" href="index.html" aria-label="SarapMagBike Shop home">
      <img src="assets/sarapmagbike-logo.png" alt="SarapMagBike Shop logo">
      <span class="logo-word">SARAPMAG<span>BIKE</span></span>
      <span class="logo-tag">QUEZON CITY</span>
    </a>`;

  const navigation = document.createElement("nav");
  navigation.className = "wrap main-nav";
  navigation.setAttribute("aria-label", "Website navigation");
  navigation.dataset.categoryNavList = "";

  legacyHeader.replaceWith(topbar, headerMain, navigation);
  updatePublicLocationUi();
}

function removeLegacyHeaderTools() {
  document.querySelectorAll(".header-main > .search-form, .header-main > .cart-box, .header-main > .lock-box").forEach((element) => element.remove());
}

function ensureStandardCustomerHeaderActions() {
  const options = document.querySelector(".topbar-options");
  if (!options) {
    return;
  }

  let guestActions = options.querySelector("[data-customer-login-form]");
  if (!guestActions) {
    guestActions = document.createElement("div");
    guestActions.className = "customer-login";
    guestActions.dataset.customerLoginForm = "";
    guestActions.setAttribute("aria-label", "Customer account");
    options.append(guestActions);
  }

  if (!guestActions.querySelector("[data-desktop-header-login]")) {
    guestActions.replaceChildren();
    const login = document.createElement("button");
    login.type = "button";
    login.dataset.desktopHeaderLogin = "";
    login.textContent = "Login";
    const register = document.createElement("button");
    register.type = "button";
    register.dataset.openRegister = "";
    register.textContent = "Register";
    guestActions.append(login, register);
  }

  if (!options.querySelector("[data-customer-session]")) {
    const session = document.createElement("div");
    session.className = "customer-session";
    session.dataset.customerSession = "";
    session.hidden = true;
    session.innerHTML = `
      <button class="account-avatar-button" type="button" data-account-menu-toggle aria-label="Open account menu" aria-expanded="false">
        <span data-account-avatar>SMB</span>
      </button>
      <div class="account-menu" data-account-menu hidden>
        <div class="account-menu-header">
          <span data-account-menu-avatar>SMB</span>
          <div>
            <strong data-customer-greeting>Account</strong>
            <p data-account-email></p>
          </div>
        </div>
        <div class="account-menu-actions">
          <button type="button" data-edit-profile>Edit Profile</button>
          <button type="button" data-logout>Logout</button>
        </div>
      </div>`;
    options.append(session);
  }
}

function isPublicProduct(item) {
  return !item.isService && item.isActive !== false && item.isPublic !== false && item.displayOnWeb !== false;
}

function getItemWebCategory(item) {
  return item.webCategory || item.webCategoryName || item.publicWebCategory || item.category;
}

function getItemCategoryGroup(item) {
  return item.categoryGroupName || item.categoryGroup || item.publicCategoryGroup || item.webCategoryGroup;
}

function isBikeProduct(item) {
  const categoryGroup = normalizeText(getItemCategoryGroup(item));
  if (!["bike and frames", "bikes and frames"].includes(categoryGroup)) {
    return false;
  }

  const category = normalizeText(getItemWebCategory(item));
  return !/\bframes?\b/.test(category);
}

function sortByName(a, b) {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

function buildCategoryGroups(items) {
  const groups = new Map();

  items.filter(isPublicProduct).forEach((item) => {
    const groupName = String(getItemCategoryGroup(item) || "").trim();
    if (!groupName) {
      return;
    }

    const key = slugify(groupName);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: groupName,
        normalizedTitle: normalizeText(groupName),
        webCategoryMap: new Map()
      });
    }

    const webCategory = String(getItemWebCategory(item) || "").trim();
    if (webCategory) {
      groups.get(key).webCategoryMap.set(normalizeText(webCategory), webCategory);
    }
  });

  return Array.from(groups.values())
    .map((group) => ({
      key: group.key,
      title: group.title,
      normalizedTitle: group.normalizedTitle,
      filters: ["All", ...Array.from(group.webCategoryMap.values()).sort(sortByName)]
    }))
    .sort((a, b) => sortByName(a.title, b.title));
}

function getCategoryGroup(categoryKey) {
  return state.categoryGroups.find((group) => group.key === categoryKey);
}

function resolveCategoryKey(categoryKey) {
  if (getCategoryGroup(categoryKey)) {
    return categoryKey;
  }

  const targets = legacyCategoryTargets[categoryKey] || [categoryKey];
  const normalizedTargets = targets.map(normalizeText);
  return state.categoryGroups.find((group) => normalizedTargets.includes(group.normalizedTitle))?.key || null;
}

function itemMatchesCategory(item, categoryKey) {
  const group = getCategoryGroup(categoryKey);
  if (!group) {
    return false;
  }

  return normalizeText(getItemCategoryGroup(item)) === group.normalizedTitle;
}

function itemMatchesSubcategory(item) {
  if (state.activeSubcategory === "All") {
    return true;
  }

  return normalizeText(getItemWebCategory(item)) === normalizeText(state.activeSubcategory);
}

function compareStableCatalogOrder(a, b) {
  const orderA = Number(a.webDisplayOrder ?? a.displayOrder ?? a.webSortOrder ?? a.sortOrder);
  const orderB = Number(b.webDisplayOrder ?? b.displayOrder ?? b.webSortOrder ?? b.sortOrder);
  const normalizedOrderA = Number.isFinite(orderA) ? orderA : Number.MAX_SAFE_INTEGER;
  const normalizedOrderB = Number.isFinite(orderB) ? orderB : Number.MAX_SAFE_INTEGER;
  if (normalizedOrderA !== normalizedOrderB) {
    return normalizedOrderA - normalizedOrderB;
  }

  const nameDelta = sortByName(getItemName(a), getItemName(b));
  if (nameDelta !== 0) {
    return nameDelta;
  }
  return sortByName(String(getItemIdentifier(a)), String(getItemIdentifier(b)));
}

function getCatalogItems() {
  const listConfig = state.activeCategory === "all" && state.catalogListFilter
    ? getHomeProductListConfig(state.catalogListFilter)
    : null;
  const filtered = state.items
    .filter(isPublicProduct)
    .filter((item) => !listConfig || listConfig.filter(item))
    .filter((item) => state.activeCategory === "all" || itemMatchesCategory(item, state.activeCategory))
    .filter((item) => state.activeCategory === "all" || itemMatchesSubcategory(item));

  return filtered.sort((a, b) => {
    if (state.sort === "price-asc") {
      return getProductPrice(a) - getProductPrice(b) || compareStableCatalogOrder(a, b);
    }
    if (state.sort === "price-desc") {
      return getProductPrice(b) - getProductPrice(a) || compareStableCatalogOrder(a, b);
    }
    if (state.sort === "newest") {
      const newItemDelta = Number(Boolean(b.isNew)) - Number(Boolean(a.isNew));
      return newItemDelta || compareStableCatalogOrder(a, b);
    }
    return state.activeCategory === "all"
      ? compareStableCatalogOrder(a, b)
      : getRandomItemDisplayRank(a) - getRandomItemDisplayRank(b);
  });
}

function setMobileNavActive(key) {
  document.querySelectorAll("[data-mobile-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.mobileNav === key);
  });
}

function getDefaultMobileNavKey() {
  const path = window.location.pathname;
  if (path.endsWith("events.html")) return "events";
  if (path.endsWith("services.html") || path.endsWith("service.html") || path.endsWith("appointments.html")) return "services";
  if (path.endsWith("stories.html") || path.endsWith("story.html")) return "stories";
  if (window.location.hash === "#community") return "community";
  if (window.location.hash === "#top") return "home";
  return "catalog";
}

function getMobileNavGroupMarkup({ clone = false } = {}) {
  const tabIndex = clone ? ' tabindex="-1"' : "";
  return `
    <a href="index.html#top" data-mobile-nav="home" aria-label="Home"${tabIndex}><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m3.5 10.5 8.5-7 8.5 7v9.5h-6v-6h-5v6h-6z"/></svg></span>Home</a>
    <button type="button" data-mobile-nav="notifications" data-notification-trigger aria-label="Notifications"${tabIndex}><span class="mobile-nav-notification-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9.5 21h5"/></svg></span><b data-notification-badge hidden>0</b>Alerts</button>
    <a href="index.html#products" data-mobile-nav="catalog" aria-label="Catalog"${tabIndex}><span aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>Catalog</a>
    <a href="services.html" data-mobile-nav="services" aria-label="Services"${tabIndex}><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-3-3z"/></svg></span>Services</a>
    <a href="events.html" data-mobile-nav="events" aria-label="Events"${tabIndex}><span aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 14h3M13 14h3M8 18h3"/></svg></span>Events</a>
    <a href="index.html#community" data-community-link data-mobile-nav="community" aria-label="Community"${tabIndex}><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H9l-5 3 1.5-4A8 8 0 1 1 21 15z"/></svg></span>Community</a>
    <a href="stories.html" data-mobile-nav="stories" aria-label="Stories"${tabIndex}><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4h14a2 2 0 0 1 2 2v14H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM7 8h10M7 12h10M7 16h6"/></svg></span>Stories</a>
  `;
}

function setupMobileNavigationBelt() {
  document.querySelectorAll(".mobile-bottom-nav").forEach((nav) => {
    if (nav.dataset.mobileBeltReady === "true") return;
    nav.dataset.mobileBeltReady = "true";
    nav.classList.add("is-continuous-belt");
    nav.replaceChildren();

    const previous = document.createElement("div");
    previous.className = "mobile-bottom-nav-track";
    previous.dataset.mobileNavClone = "";
    previous.setAttribute("aria-hidden", "true");
    previous.innerHTML = getMobileNavGroupMarkup({ clone: true });
    const current = document.createElement("div");
    current.className = "mobile-bottom-nav-track";
    current.dataset.mobileNavPrimary = "";
    current.innerHTML = getMobileNavGroupMarkup();
    const next = document.createElement("div");
    next.className = "mobile-bottom-nav-track";
    next.dataset.mobileNavClone = "";
    next.setAttribute("aria-hidden", "true");
    next.innerHTML = getMobileNavGroupMarkup({ clone: true });
    nav.append(previous, current, next);

    let normalizing = false;
    const centerBelt = () => {
      const width = current.getBoundingClientRect().width;
      if (!width) return;
      const activeItem = current.querySelector(".active");
      const activeOffset = activeItem ? activeItem.offsetLeft + (activeItem.offsetWidth / 2) - (nav.clientWidth / 2) : 0;
      nav.scrollLeft = width + Math.max(0, activeOffset);
    };
    const normalize = () => {
      if (normalizing) return;
      const width = current.getBoundingClientRect().width;
      if (!width) return;
      if (nav.scrollLeft < width * 0.3) {
        normalizing = true;
        nav.scrollLeft += width;
        normalizing = false;
      } else if (nav.scrollLeft > width * 1.7) {
        normalizing = true;
        nav.scrollLeft -= width;
        normalizing = false;
      }
    };
    nav.addEventListener("scroll", normalize, { passive: true });
    window.setTimeout(centerBelt, 0);
    window.addEventListener("resize", centerBelt);
  });
  setMobileNavActive(getDefaultMobileNavKey());
}

const STORY_UPDATE_STORAGE_KEY = "smbweb2.story-updates.v1";
const STORY_UPDATE_POLL_INTERVAL_MS = 5 * 60 * 1000;
const STORY_UPDATE_PAGE_SIZE = 100;
const STORY_UPDATE_MAX_PAGES = 10;

function getStoryUpdateLinks() {
  return Array.from(document.querySelectorAll(
    '[data-mobile-nav="stories"], [data-category-nav-list] a[href="stories.html"]'
  ));
}

function ensureStoryUpdateBadges() {
  getStoryUpdateLinks().forEach((link) => {
    link.classList.add("story-updates-link");
    if (link.querySelector("[data-story-update-badge]")) return;
    const badge = document.createElement("b");
    badge.dataset.storyUpdateBadge = "";
    badge.hidden = true;
    badge.textContent = "0";
    link.append(badge);
  });
}

function renderStoryUpdateCount(count) {
  ensureStoryUpdateBadges();
  const safeCount = Math.max(0, Number.parseInt(count, 10) || 0);
  getStoryUpdateLinks().forEach((link) => {
    const badge = link.querySelector("[data-story-update-badge]");
    if (!badge) return;
    badge.hidden = safeCount === 0;
    badge.textContent = safeCount > 99 ? "99+" : String(safeCount);
    link.setAttribute(
      "aria-label",
      safeCount
        ? `Stories, ${safeCount} new or updated ${safeCount === 1 ? "post" : "posts"}`
        : "Stories"
    );
  });
}

function readSeenStorySnapshot() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORY_UPDATE_STORAGE_KEY) || "null");
    return value && typeof value === "object" && value.posts && typeof value.posts === "object"
      ? value.posts
      : null;
  } catch {
    return null;
  }
}

function saveSeenStorySnapshot(posts) {
  try {
    window.localStorage.setItem(STORY_UPDATE_STORAGE_KEY, JSON.stringify({
      posts,
      acknowledgedAt: new Date().toISOString()
    }));
  } catch {
    // The indicator remains useful for this page even when storage is unavailable.
  }
}

function getStoryUpdateApiRoot() {
  const wordpressUrl = String(
    window.SMBWEB_WORDPRESS_URL || "https://stories-cms.sarapmagbike.com"
  ).replace(/\/$/, "");
  return wordpressUrl ? `${wordpressUrl}/wp-json/wp/v2` : "";
}

async function fetchPublishedStorySnapshot() {
  const apiRoot = getStoryUpdateApiRoot();
  if (!apiRoot) throw new Error("WordPress Stories is not configured.");

  const snapshot = {};
  for (let page = 1; page <= STORY_UPDATE_MAX_PAGES; page += 1) {
    const fields = "id,modified_gmt,modified,date_gmt,date";
    const response = await fetch(
      `${apiRoot}/posts?status=publish&per_page=${STORY_UPDATE_PAGE_SIZE}&page=${page}&orderby=modified&order=desc&_fields=${fields}`,
      { credentials: "omit", cache: "no-store", headers: { Accept: "application/json" } }
    );
    if (!response.ok) {
      if (response.status === 400 && page > 1) break;
      throw new Error(`Unable to check Stories updates (${response.status}).`);
    }
    const posts = await response.json();
    if (!Array.isArray(posts)) throw new Error("Unexpected Stories response.");
    posts.forEach((post) => {
      if (!post?.id) return;
      snapshot[String(post.id)] = post.modified_gmt || post.modified || post.date_gmt || post.date || "";
    });
    if (posts.length < STORY_UPDATE_PAGE_SIZE) break;
  }
  return snapshot;
}

async function refreshStoryUpdateBadge() {
  try {
    const currentSnapshot = await fetchPublishedStorySnapshot();
    const seenSnapshot = readSeenStorySnapshot();
    const isStoriesIndex = window.location.pathname.endsWith("/stories.html");

    if (!seenSnapshot || isStoriesIndex) {
      saveSeenStorySnapshot(currentSnapshot);
      renderStoryUpdateCount(0);
      return;
    }

    const updateCount = Object.entries(currentSnapshot).reduce(
      (count, [postId, modifiedAt]) => count + (seenSnapshot[postId] !== modifiedAt ? 1 : 0),
      0
    );
    renderStoryUpdateCount(updateCount);
  } catch {
    renderStoryUpdateCount(0);
  }
}

function initializeStoryUpdateBadge() {
  ensureStoryUpdateBadges();
  refreshStoryUpdateBadge();
  window.setInterval(() => {
    if (document.visibilityState === "visible") refreshStoryUpdateBadge();
  }, STORY_UPDATE_POLL_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshStoryUpdateBadge();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === STORY_UPDATE_STORAGE_KEY) refreshStoryUpdateBadge();
  });
}

function setCatalogMode(isCatalogMode) {
  document.body.classList.remove("is-community-mode");
  document.body.classList.toggle("is-catalog-mode", isCatalogMode);
  setMobileNavActive(isCatalogMode ? "catalog" : "home");
  document.querySelector("[data-community-view]")?.setAttribute("hidden", "");
  const catalogPanel = document.querySelector("[data-catalog-panel]");
  const homeProducts = document.querySelector("[data-home-products]");
  const homeProductActions = document.querySelector("[data-home-product-actions]");
  if (catalogPanel) {
    catalogPanel.hidden = !isCatalogMode;
  }
  if (homeProducts) {
    homeProducts.hidden = isCatalogMode;
  }
  if (homeProductActions) {
    homeProductActions.hidden = isCatalogMode;
  }
  document.querySelectorAll("[data-home-section]").forEach((section) => {
    section.hidden = isCatalogMode;
  });
}

function returnToHome({ updatePath = false, preserveScroll = false } = {}) {
  const previousScrollTop = window.scrollY;
  setCatalogMode(false);
  showCommunityMode(false);
  state.activeCategory = null;
  state.activeSubcategory = "All";
  state.catalogPage = 1;
  updateActiveCategoryNav();
  loadHomeProductItems(state.homeProductList);
  showProfileMode(false);
  if (updatePath && window.location.pathname !== "/services.html") {
    window.history.replaceState({ view: "home" }, "", window.location.pathname || "index.html");
  }
  if (preserveScroll) {
    window.requestAnimationFrame(() => window.scrollTo({ top: previousScrollTop, behavior: "instant" }));
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function renderCategoryNav() {
  const nav = document.querySelector("[data-category-nav-list]");
  if (!nav) {
    return;
  }

  const isServicesPage = window.location.pathname.endsWith("/services.html");
  const isAppointmentsPage = window.location.pathname.endsWith("/appointments.html");
  const isEventsPage = window.location.pathname.endsWith("/events.html");
  const isStoriesPage = window.location.pathname.endsWith("/stories.html") || window.location.pathname.endsWith("/story.html");
  const isLeaderboardPage = window.location.pathname.endsWith("/leaderboard.html");
  const isAccountPage = ["/orders.html", "/profile.html", "/badge.html"].some((path) => window.location.pathname.endsWith(path));
  const isStandalonePage = isServicesPage || isAppointmentsPage || isEventsPage || isStoriesPage || isLeaderboardPage || isAccountPage;
  const goToHomeTarget = (targetId) => {
    if (isStandalonePage) {
      window.location.href = targetId === "top" ? "index.html" : `index.html#${targetId}`;
      return;
    }
    if (targetId === "top") {
      returnToHome();
      return;
    }
    scrollHomeTarget(targetId);
  };
  const goToServices = () => {
    if (isServicesPage) {
      document.getElementById("service-menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.location.href = "services.html";
  };

  nav.replaceChildren();
  [
    { label: "Home", href: isStandalonePage ? "index.html" : "#top", action: () => goToHomeTarget("top") },
    { label: "Products", href: isStandalonePage ? "index.html#products" : "#products", action: () => goToHomeTarget("products") },
    { label: "Services", href: "services.html", action: goToServices, active: isServicesPage },
    { label: "Events", href: "events.html", action: () => window.location.href = "events.html", active: isEventsPage },
    { label: "Stories", href: "stories.html", action: () => window.location.href = "stories.html", active: isStoriesPage },
    { label: "Community", href: isStandalonePage ? "index.html#community" : "#community", action: () => isStandalonePage ? window.location.href = "index.html#community" : openCommunityPage(true), community: !isStandalonePage },
    { label: "Contact", href: isStandalonePage ? "index.html#contact" : "#contact", action: () => isStandalonePage ? window.location.href = "index.html#contact" : goToHomeTarget("contact") }
  ].forEach((item) => {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;
    link.classList.toggle("active", Boolean(item.active));
    link.setAttribute("aria-current", item.active ? "page" : "false");
    if (item.community) {
      link.dataset.communityLink = "";
    }
    link.addEventListener("click", (event) => {
      event.preventDefault();
      item.action();
    });
    nav.append(link);
  });

  updateActiveCategoryNav();
}

function getServiceCardCategory(card) {
  return card.querySelector("span")?.textContent.trim() || "";
}

function serviceCardMatchesFilter(card, filter) {
  return filter === "all" || card.dataset.serviceCategory === filter;
}

function applyServiceFilter(filter) {
  const chips = document.querySelectorAll("[data-service-filter]");
  const cards = document.querySelectorAll(".service-card");
  chips.forEach((chip) => {
    const active = chip.dataset.serviceFilter === filter;
    chip.classList.toggle("active", active);
    chip.setAttribute("aria-pressed", active ? "true" : "false");
  });
  cards.forEach((card) => {
    card.hidden = !serviceCardMatchesFilter(card, filter);
  });
}

function bindServiceFilters() {
  const chips = document.querySelectorAll("[data-service-filter]");
  if (chips.length === 0) {
    return;
  }

  chips.forEach((chip) => {
    chip.setAttribute("aria-pressed", chip.classList.contains("active") ? "true" : "false");
    chip.addEventListener("click", () => {
      applyServiceFilter(chip.dataset.serviceFilter || "all");
    });
  });
}

function getServiceCategory(item) {
  return item.category || item.categoryGroupName || "Bike Service";
}

function getServiceDescription(item) {
  const container = document.createElement("div");
  container.innerHTML = String(item.webDescription || "");
  container.querySelectorAll("script, style").forEach((node) => node.remove());
  container.querySelectorAll("br, p, div, li, h1, h2, h3, h4, h5, h6, strong").forEach((node) => node.append(" "));
  return (container.textContent || "").replace(/\*+/g, "").replace(/\s+/g, " ").trim()
    || "Message SarapMagBike for service details, availability, and current workshop queue.";
}

function getServiceExcerpt(item) {
  const description = getServiceDescription(item);
  return description.length > 200 ? `${description.slice(0, 200).trimEnd()}...` : description;
}

function getServiceDetailUrl(item) {
  const params = new URLSearchParams();
  params.set("id", String(getItemIdentifier(item)));
  params.set("slug", slugify(getItemName(item)));
  return `service.html?${params.toString()}`;
}

function getServiceBookingUrl(item) {
  const params = new URLSearchParams();
  params.set("service", String(getItemIdentifier(item)));
  return `appointments.html?${params.toString()}`;
}

function renderServiceCardImage(item) {
  const frame = document.createElement("div");
  const managedImage = getProductImageUrls(item)[0];
  frame.className = `service-card-image${managedImage ? " has-managed-image" : " is-fallback"}`;
  const image = document.createElement("img");
  image.alt = managedImage ? getItemName(item) : "SarapMagBike bike mechanic at work";
  image.loading = "lazy";
  image.src = managedImage || "assets/workshop-service.png";
  frame.append(image);
  return frame;
}

function renderServiceFullDescription(item) {
  const detail = document.createElement("div");
  detail.className = "product-detail-description service-detail-description";
  const source = document.createElement("div");
  source.innerHTML = String(item.webDescription || "");
  source.querySelectorAll("script, style").forEach((node) => node.remove());
  source.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  source.querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6").forEach((node) => node.append("\n"));
  const paragraphs = (source.textContent || "")
    .replace(/\*+/g, "")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  (paragraphs.length > 0 ? paragraphs : ["Message SarapMagBike for the complete service scope and current workshop availability."])
    .forEach((paragraph) => detail.append(createTextElement("p", paragraph)));
  return detail;
}

function renderManagedServiceCard(item) {
  const card = document.createElement("article");
  const category = getServiceCategory(item);
  card.className = "service-card";
  card.dataset.serviceCategory = slugify(category);

  const actions = document.createElement("div");
  actions.className = "service-card-actions";
  const book = document.createElement("a");
  book.href = getServiceBookingUrl(item);
  book.textContent = "Book this service";
  const more = document.createElement("a");
  more.href = getServiceDetailUrl(item);
  more.textContent = "More...";
  actions.append(book, more);

  card.append(
    renderServiceCardImage(item),
    createTextElement("span", category),
    createTextElement("h2", getItemName(item)),
    renderPrice(item),
    createTextElement("p", getServiceExcerpt(item)),
    actions
  );
  return card;
}

function getServiceDetailRoot() {
  return document.querySelector("[data-service-detail]");
}

function renderServiceDetail(item) {
  const root = getServiceDetailRoot();
  if (!root) {
    return;
  }

  const serviceName = getItemName(item);
  const category = getServiceCategory(item);
  document.title = `${serviceName} | SarapMagBike Services`;
  document.querySelector("meta[name='description']")?.setAttribute("content", getServiceExcerpt(item));
  root.replaceChildren();

  const shell = document.createElement("section");
  shell.className = "product-detail-shell service-detail-shell";
  const imageItem = getProductImageUrls(item).length > 0
    ? item
    : { ...item, mainImageUrl: "assets/workshop-service.png" };

  const summary = document.createElement("section");
  summary.className = "product-detail-summary";
  summary.setAttribute("aria-label", "Service summary");
  const badges = document.createElement("div");
  badges.className = "product-detail-badges";
  badges.append(createTextElement("span", "Service"), createTextElement("span", category));
  const price = renderPrice(item);
  price.classList.add("product-detail-price");
  const description = renderServiceFullDescription(item);
  const actions = document.createElement("div");
  actions.className = "product-detail-actions";
  const book = document.createElement("a");
  book.href = getServiceBookingUrl(item);
  book.textContent = "Book this Service";
  const message = document.createElement("a");
  message.href = "https://www.facebook.com/sarapmagbikeshop";
  message.target = "_blank";
  message.rel = "noreferrer";
  message.textContent = "Message Us";
  actions.append(book, message);
  summary.append(
    badges,
    createTextElement("p", `SarapMagBike ${getSelectedPublicLocationName()} Workshop`, "product-detail-eyebrow"),
    createTextElement("h1", serviceName),
    price,
    description,
    actions,
    createTextElement("p", "Message us before visiting so the team can confirm the service scope, workshop queue, required parts, and final quotation.", "product-detail-note")
  );
  const gallery = renderProductDetailGallery(imageItem);
  gallery.setAttribute("aria-label", "Service photos");
  shell.append(gallery, summary);
  root.append(shell);

  const infoGrid = document.createElement("section");
  infoGrid.className = "product-detail-info-grid service-detail-info";
  const details = document.createElement("article");
  const detailList = document.createElement("dl");
  detailList.className = "product-spec-table";
  [["Category", category], ["Service code", getItemSku(item) || "Not specified"], ["Labor price", renderPrice(item).textContent], ["Branch", getSelectedPublicLocationName()]].forEach(([label, value]) => {
    const row = document.createElement("div");
    row.append(createTextElement("dt", label), createTextElement("dd", value));
    detailList.append(row);
  });
  details.append(createTextElement("h2", "Service Information"), detailList);
  const booking = document.createElement("article");
  booking.append(
    createTextElement("h2", "Before You Visit"),
    createTextElement("p", "Send photos and a short description of the bike concern through Facebook. Parts, special tools, and additional work may be quoted separately after inspection.")
  );
  infoGrid.append(details, booking);
  root.append(infoGrid);
}

function setServiceDetailState(title, detail) {
  const root = getServiceDetailRoot();
  if (!root) {
    return;
  }
  root.replaceChildren();
  const card = document.createElement("article");
  card.className = "product-detail-state";
  card.append(createTextElement("h1", title), createTextElement("p", detail));
  root.append(card);
}

async function loadServiceDetailPage() {
  if (!getServiceDetailRoot()) {
    return;
  }
  const id = new URLSearchParams(window.location.search).get("id")?.trim();
  if (!id) {
    setServiceDetailState("Service Not Found", "Return to the service menu and choose a published service.");
    return;
  }
  try {
    const item = (await loadWebItems()).find((candidate) => candidate.isService === true && String(getItemIdentifier(candidate)) === id);
    if (!item) {
      setServiceDetailState("Service Unavailable", "This service is not currently published in SMBSystem Manage Web Items.");
      return;
    }
    renderServiceDetail(item);
  } catch {
    setServiceDetailState("Service Unavailable", "SMBSystem Manage Web Items could not be reached. Please try again shortly.");
  }
}

function renderManagedServiceFilters(items) {
  const filters = document.querySelector("[data-service-filters]");
  if (!filters) {
    return;
  }

  const categories = [...new Map(items.map((item) => {
    const label = getServiceCategory(item);
    return [slugify(label), label];
  })).entries()];
  filters.replaceChildren();
  [["all", "All Services"], ...categories].forEach(([value, label], index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.serviceFilter = value;
    button.classList.toggle("active", index === 0);
    button.textContent = label;
    filters.append(button);
  });
  filters.hidden = categories.length === 0;
  bindServiceFilters();
}

async function loadManagedServices() {
  const grid = document.querySelector("[data-services-grid]");
  if (!grid) {
    return;
  }

  grid.hidden = false;
  grid.setAttribute("aria-busy", "true");
  grid.replaceChildren();
  const loading = document.createElement("article");
  loading.className = "service-card service-card-state";
  loading.append(createTextElement("h2", "Loading Services"), createTextElement("p", "Loading services configured in SMBSystem Manage Web Items."));
  grid.append(loading);

  try {
    const items = (await loadWebItems()).filter((item) => item.isService === true);
    grid.replaceChildren();
    renderManagedServiceFilters(items);
    if (items.length === 0) {
      const empty = document.createElement("article");
      empty.className = "service-card service-card-state";
      empty.append(createTextElement("h2", "No Services Published"), createTextElement("p", "Enable Display on Web for services in SMBSystem Manage Web Items to show them here."));
      grid.append(empty);
    } else {
      items.forEach((item) => grid.append(renderManagedServiceCard(item)));
    }
  } catch {
    grid.replaceChildren();
    const unavailable = document.createElement("article");
    unavailable.className = "service-card service-card-state";
    unavailable.append(createTextElement("h2", "Services Unavailable"), createTextElement("p", "SMBSystem Manage Web Items could not be reached. Please try again shortly."));
    grid.append(unavailable);
  } finally {
    grid.setAttribute("aria-busy", "false");
  }
}

function updateActiveCategoryNav() {
  document.querySelectorAll("[data-category-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.categoryNav === state.activeCategory);
    link.setAttribute("aria-current", link.dataset.categoryNav === state.activeCategory ? "true" : "false");
  });
  document.querySelectorAll("[data-community-link]").forEach((link) => {
    const active = document.body.classList.contains("is-community-mode");
    link.classList.toggle("active", active);
    link.setAttribute("aria-current", active ? "page" : "false");
  });
}

function renderSubcategoryFilters() {
  const filters = document.querySelector("[data-subcategory-filters]");
  const group = getCategoryGroup(state.activeCategory);
  if (!filters) {
    return;
  }
  if (state.activeCategory === "all") {
    filters.replaceChildren();
    filters.hidden = true;
    return;
  }
  if (!group) {
    return;
  }

  filters.hidden = false;
  filters.replaceChildren();
  group.filters.forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = filter;
    button.className = filter === state.activeSubcategory ? "active" : "";
    button.addEventListener("click", () => {
      state.activeSubcategory = filter;
      state.catalogPage = 1;
      updateCatalogUrl(state.activeCategory, { replace: true });
      renderCatalog();
    });
    filters.append(button);
  });
}

function updateCatalogControls() {
  const sortSelect = document.querySelector("[data-sort-select]");
  if (sortSelect) {
    sortSelect.value = state.sort;
  }
}

function getRequestedCatalogKey() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("catalog") || "").trim();
}

function updateCatalogUrl(categoryKey, { replace = false } = {}) {
  if (!document.querySelector("[data-web-items-grid]")) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  params.set("catalog", categoryKey);
  if (categoryKey === "all" && state.catalogListFilter) {
    params.set("list", state.catalogListFilter);
  } else {
    params.delete("list");
  }
  if (state.activeSubcategory === "All") {
    params.delete("subcategory");
  } else {
    params.set("subcategory", state.activeSubcategory);
  }
  if (state.sort === "featured") {
    params.delete("sort");
  } else {
    params.set("sort", state.sort);
  }
  if (categoryKey === "all" && state.catalogPage > 1) {
    params.set("page", String(state.catalogPage));
  } else {
    params.delete("page");
  }
  const query = params.toString();
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({ view: "catalog", category: categoryKey }, "", `index.html${query ? `?${query}` : ""}#products`);
}

function getCatalogShortcutTitle(categoryKey) {
  return catalogShortcutTitles[categoryKey] || String(categoryKey || "Catalog").replaceAll("-", " ");
}

function getCategoryTileHref(card) {
  return card?.querySelector("[data-category-link]")?.getAttribute("href") || "";
}

function openCategoryTilePage(card) {
  const href = getCategoryTileHref(card);
  if (href) {
    window.location.href = href;
    return;
  }

  openCategoryCatalog(card?.dataset.categoryCard, { updatePath: true });
}

function openServicesPage() {
  window.location.href = "services.html";
}

function getCatalogPageHref(page) {
  const params = new URLSearchParams(window.location.search);
  params.set("catalog", "all");
  params.delete("subcategory");
  if (page > 1) {
    params.set("page", String(page));
  } else {
    params.delete("page");
  }
  return `index.html?${params.toString()}#products`;
}

function renderCatalogPagination(totalItems) {
  const pagination = document.querySelector("[data-catalog-pagination]");
  if (!pagination) {
    return;
  }

  pagination.replaceChildren();
  const totalPages = Math.max(1, Math.ceil(totalItems / catalogPageSize));
  state.catalogPage = Math.min(Math.max(1, state.catalogPage), totalPages);
  if (state.activeCategory !== "all" || totalPages <= 1) {
    pagination.hidden = true;
    return;
  }

  const previous = state.catalogPage === 1
    ? createTextElement("span", "‹", "is-disabled catalog-pagination-icon")
    : document.createElement("a");
  if (previous instanceof HTMLAnchorElement) {
    previous.href = getCatalogPageHref(state.catalogPage - 1);
    previous.textContent = "‹";
    previous.className = "catalog-pagination-icon";
    previous.setAttribute("aria-label", "Previous page");
    previous.title = "Previous page";
  } else {
    previous.setAttribute("aria-disabled", "true");
    previous.setAttribute("aria-label", "Previous page");
  }
  const summary = createTextElement(
    "span",
    `${state.catalogPage} / ${totalPages} · ${totalItems}`,
    "catalog-pagination-summary"
  );
  summary.setAttribute("aria-label", `Page ${state.catalogPage} of ${totalPages}, ${totalItems} items`);
  summary.setAttribute("aria-live", "polite");
  const next = state.catalogPage === totalPages
    ? createTextElement("span", "›", "is-disabled catalog-pagination-icon")
    : document.createElement("a");
  if (next instanceof HTMLAnchorElement) {
    next.href = getCatalogPageHref(state.catalogPage + 1);
    next.textContent = "›";
    next.className = "catalog-pagination-icon";
    next.setAttribute("aria-label", "Next page");
    next.title = "Next page";
  } else {
    next.setAttribute("aria-disabled", "true");
    next.setAttribute("aria-label", "Next page");
  }
  pagination.append(previous, summary, next);
  pagination.hidden = false;
}

function renderCatalog() {
  const grid = getWebItemsGrid();
  const group = getCategoryGroup(state.activeCategory);
  const isAllProducts = state.activeCategory === "all";
  if (!grid || (!isAllProducts && !group)) {
    return;
  }

  renderSubcategoryFilters();
  updateActiveCategoryNav();

  const items = getCatalogItems();
  const totalPages = Math.max(1, Math.ceil(items.length / catalogPageSize));
  state.catalogPage = isAllProducts
    ? Math.min(Math.max(1, state.catalogPage), totalPages)
    : 1;
  const visibleItems = isAllProducts
    ? items.slice((state.catalogPage - 1) * catalogPageSize, state.catalogPage * catalogPageSize)
    : items;
  if (isAllProducts) {
    const firstItem = items.length === 0 ? 0 : ((state.catalogPage - 1) * catalogPageSize) + 1;
    const lastItem = Math.min(state.catalogPage * catalogPageSize, items.length);
    const listTitle = state.catalogListFilter
      ? getHomeProductListConfig(state.catalogListFilter).catalogTitle.toLowerCase()
      : "published products";
    document.querySelector("[data-stock-note]").textContent =
      `Showing ${firstItem}-${lastItem} of ${items.length} ${listTitle}. Stocks and prices may change. Message us to confirm before visiting or ordering.`;
  } else {
    document.querySelector("[data-stock-note]").textContent =
      "Stocks and prices may change. Message us to confirm before visiting or ordering.";
  }

  grid.replaceChildren();
  if (items.length === 0) {
    setGridState(
      isAllProducts ? "No Products Found" : `No ${group.title} Found`,
      "No publicly available products were found right now. Message us to check the latest stock."
    );
  } else {
    visibleItems.forEach((item) => grid.append(renderWebItemCard(item)));
  }

  renderCatalogPagination(items.length);
  updateCatalogControls();
}

async function openCategoryCatalog(categoryKey, { updatePath = false } = {}) {
  if (updatePath) {
    state.activeSubcategory = "All";
    state.catalogListFilter = null;
    state.sort = "featured";
    state.catalogPage = 1;
  } else {
    const params = new URLSearchParams(window.location.search);
    state.activeSubcategory = params.get("subcategory") || "All";
    state.catalogListFilter = categoryKey === "all" && validHomeProductLists.has(params.get("list"))
      ? params.get("list")
      : null;
    state.sort = validCatalogSorts.has(params.get("sort")) ? params.get("sort") : "featured";
    state.catalogPage = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  }
  setCatalogMode(true);
  setGridState("Loading Catalog", `Checking SMBSystem catalog items for ${getSelectedPublicLocationName()}.`);
  if (updatePath) {
    updateCatalogUrl(categoryKey);
  }

  try {
    await loadWebItems();
    const resolvedCategoryKey = categoryKey === "all" ? "all" : resolveCategoryKey(categoryKey);
    if (!resolvedCategoryKey) {
      state.activeCategory = null;
      updateActiveCategoryNav();
      document.querySelector("[data-stock-note]").textContent = "Stocks and prices may change. Message us to confirm before visiting or ordering.";
      setGridState(`No ${getCatalogShortcutTitle(categoryKey)} Found`, "No publicly available products found for this category right now. Message us to check latest stock.");
      return;
    }
    state.activeCategory = resolvedCategoryKey;
    const categoryGroup = getCategoryGroup(resolvedCategoryKey);
    if (resolvedCategoryKey === "all") {
      state.activeSubcategory = "All";
    } else if (!categoryGroup?.filters.includes(state.activeSubcategory)) {
      state.activeSubcategory = "All";
      updateCatalogUrl(resolvedCategoryKey, { replace: true });
    }
    renderCatalog();
  } catch (error) {
    setGridState("Catalog Unavailable", "SMBSystem public catalog is not reachable. Try again after the API is running.");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getHomeProductListConfig(filterKey) {
  return homeProductLists[filterKey] || homeProductLists.new;
}

function updateHomeProductTabs(filterKey) {
  document.querySelectorAll("[data-home-product-filter]").forEach((button) => {
    const isActive = button.dataset.homeProductFilter === filterKey;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function updateHomeViewAllLink(filterKey) {
  const link = document.querySelector("[data-view-all-products]");
  if (!link) {
    return;
  }

  const selectedFilter = validHomeProductLists.has(filterKey) ? filterKey : "new";
  link.href = `index.html?catalog=all&list=${encodeURIComponent(selectedFilter)}#products`;
  link.setAttribute("aria-label", `View all ${getHomeProductListConfig(selectedFilter).catalogTitle}`);
}

async function loadHomeProductItems(filterKey = state.homeProductList) {
  const webItemsGrid = getWebItemsGrid();
  if (!webItemsGrid) {
    return;
  }

  state.homeProductList = homeProductLists[filterKey] ? filterKey : "new";
  state.catalogPage = 1;
  document.querySelector("[data-catalog-pagination]")?.setAttribute("hidden", "");
  const config = getHomeProductListConfig(state.homeProductList);
  updateHomeProductTabs(state.homeProductList);
  updateHomeViewAllLink(state.homeProductList);
  document.querySelector("[data-stock-note]").textContent = config.note;
  setGridState(config.loadingTitle, `Checking SMBSystem web catalog items for ${getSelectedPublicLocationName()}.`);

  try {
    await loadWebItems();
    const filteredItems = state.items
      .filter((item) => isPublicProduct(item) && config.filter(item))
      .sort((a, b) => getRandomItemDisplayRank(a) - getRandomItemDisplayRank(b))
      .slice(0, 8);
    webItemsGrid.replaceChildren();

    if (filteredItems.length === 0) {
      setGridState(config.emptyTitle, config.emptyDetail);
      return;
    }

    filteredItems.forEach((item) => webItemsGrid.append(renderWebItemCard(item)));
  } catch (error) {
    setGridState(config.unavailableTitle, "SMBSystem public catalog is not reachable. Try again after the API is running.");
  }
}

function scrollHomeTarget(targetId) {
  showCommunityMode(false);
  showProfileMode(false);
  setCatalogMode(false);
  requestAnimationFrame(() => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function showCommunityMode(show, updatePath = false) {
  const view = document.querySelector("[data-community-view]");
  if (view) {
    view.hidden = !show;
  }
  document.body.classList.toggle("is-community-mode", show);
  if (show) {
    setMobileNavActive("community");
    document.body.classList.remove("is-catalog-mode", "is-profile-mode");
    const catalogPanel = document.querySelector("[data-catalog-panel]");
    const homeProducts = document.querySelector("[data-home-products]");
    if (catalogPanel) {
      catalogPanel.hidden = true;
    }
    if (homeProducts) {
      homeProducts.hidden = true;
    }
    document.querySelectorAll("[data-home-section]").forEach((section) => {
      section.hidden = true;
    });
    if (updatePath && window.location.hash !== "#community") {
      window.history.pushState({ view: "community" }, "", "#community");
    }
    updateActiveCategoryNav();
    updateCommunityAuthState();
    loadCommunityDiscussions();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  document.querySelectorAll("[data-home-section]").forEach((section) => {
    section.hidden = false;
  });
  const homeProducts = document.querySelector("[data-home-products]");
  if (homeProducts) {
    homeProducts.hidden = false;
  }
  updateActiveCategoryNav();
}
