const year = document.querySelector("#year");
const menuButton = document.querySelector(".menu-button");
const navLinks = document.querySelector(".nav-links");
const pesoFormatter = new Intl.NumberFormat("en-PH", {
  currency: "PHP",
  minimumFractionDigits: 2,
  style: "currency"
});

const legacyCategoryTargets = {
  "bike-frames": ["Bike & Frames", "Bikes & Frames"],
  "parts-components": ["Parts & Components"],
  "tires-tubes": ["Tires & Tubes"],
  "cycling-clothing": ["Cycling Clothing"],
  "helmets-sunglasses": ["Helmets & Sunglasses"]
};

const catalogShortcutTitles = {
  "bike-frames": "Bike & Frames",
  "parts-components": "Parts & Components",
  "cycling-clothing": "Cycling Clothing",
  "helmets-sunglasses": "Helmets & Sunglasses",
  "tires-tubes": "Tires & Tubes"
};

const initialPageParams = new URLSearchParams(window.location.search);
const requestedCatalogSort = initialPageParams.get("sort");
const validCatalogSorts = new Set(["featured", "price-asc", "price-desc", "newest"]);
const validHomeProductLists = new Set(["new", "popular", "sale"]);
const catalogPageSize = 20;

const state = {
  activeCategory: null,
  activeSubcategory: initialPageParams.get("subcategory") || "All",
  catalogListFilter: validHomeProductLists.has(initialPageParams.get("list"))
    ? initialPageParams.get("list")
    : null,
  catalogPage: Math.max(1, Number.parseInt(initialPageParams.get("page") || "1", 10) || 1),
  categoryGroups: [],
  homeProductList: "new",
  itemDisplayOrder: new Map(),
  items: [],
  productSearchEndpointAvailable: null,
  sort: validCatalogSorts.has(requestedCatalogSort) ? requestedCatalogSort : "featured"
};

const branchContacts = {
  "Quezon City": {
    shortName: "QC",
    address: "44 Mindanao Ave., Bgy. Tandang Sora, Quezon City",
    phone: "0968.356.8251",
    tel: "+639683568251"
  },
  Pampanga: {
    shortName: "Pampanga",
    address: "Emcos the Strip, McArthur Hi-way, Sto. Tomas, Pampanga",
    phone: "0939.933.3391",
    tel: "+639399333391"
  }
};

const publicLocationState = {
  locations: [],
  selected: null,
  storageKey: "smb-public-location"
};

let resolvePublicLocationReady;
window.smbPublicLocationReady = new Promise((resolve) => {
  resolvePublicLocationReady = resolve;
});

function normalizePhoneLink(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("09") && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }
  return digits ? `+${digits}` : "";
}

function getSelectedPublicLocation() {
  return publicLocationState.selected || {
    slug: "quezon-city",
    name: "Quezon City",
    address: branchContacts["Quezon City"].address,
    phone: branchContacts["Quezon City"].phone,
    websiteMode: "live",
    isComingSoon: false,
    isDefault: true
  };
}

function getSelectedPublicLocationSlug() {
  return getSelectedPublicLocation().slug;
}

function getSelectedPublicLocationName() {
  return getSelectedPublicLocation().name;
}

function withPublicLocation(path) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("location", getSelectedPublicLocationSlug());
  return `${url.pathname}${url.search}`;
}

window.getSelectedPublicLocation = getSelectedPublicLocation;
window.getSelectedPublicLocationSlug = getSelectedPublicLocationSlug;

async function initializePublicLocations() {
  const fallback = getSelectedPublicLocation();
  try {
    const rows = await apiRequest("/api/public/catalog/locations");
    publicLocationState.locations = Array.isArray(rows) ? rows : [];
  } catch {
    publicLocationState.locations = [fallback];
  }

  publicLocationState.locations.forEach((location) => {
    const fallbackContact = branchContacts[location.name];
    branchContacts[location.name] = {
      shortName: location.name,
      address: location.address || fallbackContact?.address || "Address not published",
      phone: location.phone || fallbackContact?.phone || "Contact branch",
      tel: normalizePhoneLink(location.phone || fallbackContact?.phone)
    };
    location.address = branchContacts[location.name].address;
    location.phone = branchContacts[location.name].phone;
  });

  const requestedSlug = initialPageParams.get("location");
  const storedSlug = window.localStorage.getItem(publicLocationState.storageKey);
  publicLocationState.selected = publicLocationState.locations.find((location) => location.slug === requestedSlug)
    || publicLocationState.locations.find((location) => location.slug === storedSlug)
    || publicLocationState.locations.find((location) => location.isDefault)
    || publicLocationState.locations[0]
    || null;

  if (publicLocationState.selected) {
    window.localStorage.setItem(publicLocationState.storageKey, publicLocationState.selected.slug);
  }
  updatePublicLocationUi();
  resolvePublicLocationReady?.(publicLocationState.selected);
}

function updatePublicLocationUi() {
  const selected = getSelectedPublicLocation();
  document.body.dataset.publicLocation = selected.slug;
  document.querySelectorAll(".logo-tag").forEach((pill) => {
    pill.textContent = `${selected.name} ▾`;
    pill.classList.add("public-location-trigger");
    pill.setAttribute("role", "button");
    pill.setAttribute("tabindex", "0");
    pill.setAttribute("aria-haspopup", "dialog");
    pill.setAttribute("aria-label", `Current branch: ${selected.name}. Choose a branch.`);
    if (pill.dataset.locationBound === "true") {
      return;
    }
    pill.dataset.locationBound = "true";
    pill.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPublicLocationPicker();
    });
    pill.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPublicLocationPicker();
      }
    });
  });
  document.querySelectorAll("[data-public-location-name]").forEach((element) => {
    element.textContent = selected.name;
  });
  const appointmentEyebrow = document.querySelector(".appointment-intro .section-eyebrow");
  if (appointmentEyebrow) {
    appointmentEyebrow.textContent = `${selected.name} workshop`;
  }
  const comingSoonMessage = document.querySelector(".is-coming-soon-page .hero-message strong");
  if (comingSoonMessage) {
    comingSoonMessage.textContent = `${selected.name} is getting ready for the public website. Contact this branch for bikes, parts, accessories, services, and order concerns.`;
  }
}

function ensurePublicLocationPicker() {
  let modal = document.querySelector("[data-public-location-picker]");
  if (modal) {
    return modal;
  }

  modal = document.createElement("div");
  modal.className = "public-location-picker";
  modal.dataset.publicLocationPicker = "";
  modal.hidden = true;
  modal.innerHTML = `
    <section role="dialog" aria-modal="true" aria-labelledby="public-location-title">
      <header>
        <div>
          <span>SarapMagBike Shop</span>
          <h2 id="public-location-title">Choose a branch</h2>
          <p>Products, prices, stock, services, and events will update for your selected branch.</p>
        </div>
        <button type="button" data-public-location-close aria-label="Close branch selector">Close</button>
      </header>
      <div class="public-location-options" data-public-location-options></div>
    </section>
  `;
  document.body.append(modal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-public-location-close]")) {
      closePublicLocationPicker();
    }
  });
  return modal;
}

function openPublicLocationPicker() {
  const modal = ensurePublicLocationPicker();
  const options = modal.querySelector("[data-public-location-options]");
  options.replaceChildren();
  if (publicLocationState.locations.length === 0) {
    options.append(createTextElement("p", "No public branches are available yet.", "public-location-empty"));
  } else {
    publicLocationState.locations.forEach((location) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = location.slug === getSelectedPublicLocationSlug() ? "active" : "";
      button.innerHTML = `
        <span><strong></strong><small></small></span>
        <span class="public-location-option-status"></span>
      `;
      button.querySelector("strong").textContent = location.name;
      button.querySelector("small").textContent = location.address || location.tenantName || "SarapMagBike branch";
      const status = button.querySelector(".public-location-option-status");
      status.textContent = location.isComingSoon ? "Coming Soon" : location.slug === getSelectedPublicLocationSlug() ? "Selected" : "View Branch";
      status.classList.toggle("coming-soon", Boolean(location.isComingSoon));
      button.addEventListener("click", () => selectPublicLocation(location));
      options.append(button);
    });
  }
  modal.hidden = false;
  document.body.classList.add("has-public-location-picker");
  modal.querySelector(".public-location-options button")?.focus();
}

function closePublicLocationPicker() {
  const modal = document.querySelector("[data-public-location-picker]");
  if (!modal) {
    return;
  }
  modal.hidden = true;
  document.body.classList.remove("has-public-location-picker");
}

function selectPublicLocation(location) {
  closePublicLocationPicker();
  window.localStorage.setItem(publicLocationState.storageKey, location.slug);
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set("location", location.slug);

  if (location.isComingSoon && !window.location.pathname.endsWith("/coming-soon.html")) {
    const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.href = `coming-soon.html?location=${encodeURIComponent(location.slug)}&return=${encodeURIComponent(returnPath)}`;
    return;
  }

  if (!location.isComingSoon && window.location.pathname.endsWith("/coming-soon.html")) {
    const returnPath = initialPageParams.get("return");
    const safeReturn = returnPath?.startsWith("/") && !returnPath.startsWith("//") ? returnPath : "index.html";
    const target = new URL(safeReturn, window.location.origin);
    target.searchParams.set("location", location.slug);
    window.location.href = `${target.pathname}${target.search}${target.hash}`;
    return;
  }

  window.location.href = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
}

const productImageGalleryState = new WeakMap();
const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
const scrambleLabelState = new WeakMap();
const activeScrambleHoverLabels = new WeakSet();
const scrambleCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const scrambleLabelSelector = [
  ".topbar a",
  ".cart-box strong",
  ".cart-box span",
  ".hero-message h1",
  ".hero-message p",
  ".hero-message a",
  ".main-nav a",
  ".product-tabs button",
  ".product-card h3",
  ".sale-banner h2",
  ".sale-banner a",
  ".info-panels h2",
  ".service-list h3",
  ".section-eyebrow",
  ".service-menu-hero h1",
  ".service-actions a",
  ".service-category-chips button",
  ".service-card span",
  ".service-card h2",
  ".service-card a",
  ".service-help-row h2",
  ".footer-grid h2",
  ".footer-grid a"
].join(", ");
const homeProductLists = {
  new: {
    catalogTitle: "New Arrivals",
    emptyDetail: "Mark items as Display on Web and New Item in SMBSystem to show them here.",
    emptyTitle: "No New Arrivals Yet",
    loadingTitle: "Loading New Arrivals",
    note: "New arrivals are loaded from SMBSystem items marked Display on Web and New Item. Stocks and prices may change. Message us to confirm before visiting or ordering.",
    unavailableTitle: "New Arrivals Unavailable",
    filter: (item) => Boolean(item.isNew)
  },
  popular: {
    catalogTitle: "Popular Items",
    emptyDetail: "Mark items as Display on Web and Popular in SMBSystem to show them here.",
    emptyTitle: "No Popular Items Yet",
    loadingTitle: "Loading Popular Items",
    note: "Popular items are loaded from SMBSystem items marked Display on Web and Popular. Stocks and prices may change. Message us to confirm before visiting or ordering.",
    unavailableTitle: "Popular Items Unavailable",
    filter: (item) => Boolean(item.isPopular)
  },
  sale: {
    catalogTitle: "Promos",
    emptyDetail: "Mark items as Display on Web and Sale in SMBSystem to show promos here.",
    emptyTitle: "No Promos Yet",
    loadingTitle: "Loading Promos",
    note: "Promos are loaded from SMBSystem items marked Display on Web and Sale. Stocks and prices may change. Message us to confirm before visiting or ordering.",
    unavailableTitle: "Promos Unavailable",
    filter: (item) => Boolean(item.isOnSale)
  }
};

const communityState = {
  categories: [],
  config: null,
  isLoaded: false,
  isLoading: false,
  activeThreadPostId: null,
  activePhotoPostId: null,
  activePhotoIndex: 0,
  editingPostId: null,
  editingOriginalBody: "",
  editingSavedBody: "",
  isSavingEdit: false,
  photoUploads: [],
  posts: [],
  search: "",
  selectedCategory: "all",
  selectedCategorySlugs: []
};

const eventsState = {
  activeEvent: null,
  events: [],
  isLoading: false
};

const notificationState = {
  items: [],
  unreadCount: 0,
  skip: 0,
  take: 20,
  hasMore: false,
  isLoading: false,
  pollTimer: null
};

const GENERAL_CATEGORY_SLUGS = ["general", "community-tips"];
const GENERAL_CATEGORY_LABEL = "GENERAL";

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menuButton && navLinks) {
  menuButton.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navLinks.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
}

