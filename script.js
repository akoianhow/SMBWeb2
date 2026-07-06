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

const state = {
  activeCategory: null,
  activeSubcategory: "All",
  categoryGroups: [],
  homeProductList: "new",
  items: [],
  sort: "price-asc"
};

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
  ".feature-card h2",
  ".feature-card a",
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
    emptyDetail: "Mark items as Display on Web and New Item in SMBSystem to show them here.",
    emptyTitle: "No New Arrivals Yet",
    loadingTitle: "Loading New Arrivals",
    note: "New arrivals are loaded from SMBSystem items marked Display on Web and New Item. Stocks and prices may change. Message us to confirm before visiting or ordering.",
    unavailableTitle: "New Arrivals Unavailable",
    filter: (item) => Boolean(item.isNew)
  },
  popular: {
    emptyDetail: "Mark items as Display on Web and Popular in SMBSystem to show them here.",
    emptyTitle: "No Popular Items Yet",
    loadingTitle: "Loading Popular Items",
    note: "Popular items are loaded from SMBSystem items marked Display on Web and Popular. Stocks and prices may change. Message us to confirm before visiting or ordering.",
    unavailableTitle: "Popular Items Unavailable",
    filter: (item) => Boolean(item.isPopular)
  },
  sale: {
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

function getApiBaseUrl() {
  if (window.SMBWEB_API_BASE_URL) {
    return String(window.SMBWEB_API_BASE_URL).replace(/\/$/, "");
  }

  if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
    if (window.location.port === "5173" || window.location.port === "5174" || window.location.port === "8001") {
      return "";
    }

    return `http://${window.location.hostname}:5088`;
  }

  return "https://api.sarapmagbike.com";
}

function createTextElement(tagName, text, className) {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) {
    element.className = className;
  }
  return element;
}

function isScrambleCharacter(character) {
  return /[A-Za-z0-9]/.test(character);
}

function getRandomScrambleCharacter(original) {
  const randomCharacter = scrambleCharacters[Math.floor(Math.random() * scrambleCharacters.length)];
  return original === original.toLowerCase() ? randomCharacter.toLowerCase() : randomCharacter;
}

function findScrambleLabel(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  const label = target.closest(scrambleLabelSelector);
  if (!label || label.closest("[data-profile-view], [data-community-view], [data-community-auth-prompt], [data-community-thread-modal], [data-community-photo-modal], [data-community-edit-modal]")) {
    return null;
  }

  return label;
}

function runScrambleLabel(label) {
  if (!label || prefersReducedMotion?.matches || scrambleLabelState.has(label) || activeScrambleHoverLabels.has(label)) {
    return;
  }

  const originalHtml = label.innerHTML;
  const originalText = label.textContent || "";
  if (!originalText.trim()) {
    return;
  }

  let frame = 0;
  const state = {
    animationId: null,
    originalHtml,
    originalText
  };
  scrambleLabelState.set(label, state);
  activeScrambleHoverLabels.add(label);
  label.classList.add("is-letter-scrambling");

  const tick = () => {
    const revealCount = Math.floor(frame / 2);
    label.textContent = Array.from(originalText, (character, index) => {
      if (!isScrambleCharacter(character) || index < revealCount) {
        return character;
      }

      return getRandomScrambleCharacter(character);
    }).join("");

    frame += 1;
    if (revealCount >= originalText.length) {
      label.innerHTML = originalHtml;
      label.classList.remove("is-letter-scrambling");
      scrambleLabelState.delete(label);
      return;
    }

    state.animationId = window.requestAnimationFrame(tick);
  };

  tick();
}

function bindScrambleLabels() {
  const startScramble = (event) => {
    const label = findScrambleLabel(event.target);
    if (!label || label.contains(event.relatedTarget)) {
      return;
    }

    runScrambleLabel(label);
  };

  const clearScrambleHover = (event) => {
    const label = findScrambleLabel(event.target);
    if (!label || label.contains(event.relatedTarget)) {
      return;
    }

    activeScrambleHoverLabels.delete(label);
  };

  document.addEventListener("pointerover", startScramble);
  document.addEventListener("mouseover", startScramble);
  document.addEventListener("pointerout", clearScrambleHover);
  document.addEventListener("mouseout", clearScrambleHover);

  document.addEventListener("focusin", (event) => {
    runScrambleLabel(findScrambleLabel(event.target));
  });

  document.addEventListener("focusout", (event) => {
    const label = findScrambleLabel(event.target);
    if (label) {
      activeScrambleHoverLabels.delete(label);
    }
  });
}

function getWebItemsGrid() {
  return document.querySelector("[data-web-items-grid]");
}

function setGridState(title, detail) {
  const webItemsGrid = getWebItemsGrid();
  if (!webItemsGrid) {
    return;
  }

  webItemsGrid.replaceChildren();
  const card = document.createElement("article");
  card.className = "product-card product-card-state";
  card.append(
    createTextElement("h3", title),
    createTextElement("p", detail)
  );
  webItemsGrid.append(card);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}

function normalizeImageUrl(mainImageUrl) {
  if (!mainImageUrl) {
    return "";
  }

  if (/^(https?:)?\/\//.test(mainImageUrl) || mainImageUrl.startsWith("assets/")) {
    return mainImageUrl;
  }

  if (mainImageUrl.startsWith("/")) {
    return `${getApiBaseUrl()}${mainImageUrl}`;
  }

  return `${getApiBaseUrl()}/${mainImageUrl}`;
}

function getProductImageCandidateUrl(image) {
  if (!image) {
    return "";
  }

  if (typeof image === "string") {
    return image;
  }

  return image.url
    || image.imageUrl
    || image.photoUrl
    || image.thumbnailUrl
    || image.fileUrl
    || image.path
    || "";
}

function appendProductImageCandidate(urls, seen, image) {
  const imageUrl = normalizeImageUrl(getProductImageCandidateUrl(image));
  if (!imageUrl || seen.has(imageUrl)) {
    return;
  }

  seen.add(imageUrl);
  urls.push(imageUrl);
}

function getProductImageUrls(item) {
  const urls = [];
  const seen = new Set();

  [
    item.mainImageUrl,
    item.imageUrl,
    item.photoUrl,
    item.thumbnailUrl
  ].forEach((image) => appendProductImageCandidate(urls, seen, image));

  [
    item.imageUrls,
    item.images,
    item.photos,
    item.photoUrls,
    item.additionalImageUrls,
    item.additionalImages,
    item.galleryImages,
    item.webImages,
    item.productImages,
    item.media
  ].forEach((collection) => {
    if (!Array.isArray(collection)) {
      return;
    }

    collection.forEach((image) => appendProductImageCandidate(urls, seen, image));
  });

  return urls;
}

function getProductGalleryCardLayout(distance, isFront) {
  if (isFront) {
    return { x: 38, y: 10, rotation: 10 };
  }

  const layouts = [
    { x: 0, y: 0, rotation: -4 },
    { x: -44, y: 18, rotation: -16 },
    { x: 18, y: 14, rotation: 4 },
    { x: -20, y: 24, rotation: -9 }
  ];

  return layouts[(distance - 1) % layouts.length];
}

function showProductGalleryCard(card, frontIndex) {
  const frames = card.querySelectorAll("[data-product-gallery-frame]");
  frames.forEach((frame, index) => {
    const distance = (index - frontIndex + frames.length) % frames.length;
    const isFront = index === frontIndex;
    const layout = getProductGalleryCardLayout(distance, isFront);
    frame.classList.toggle("is-front", isFront);
    frame.style.setProperty("--gallery-z", String(frames.length - distance + (isFront ? frames.length : 0)));
    frame.style.setProperty("--gallery-x", `${layout.x}px`);
    frame.style.setProperty("--gallery-y", `${layout.y}px`);
    frame.style.setProperty("--gallery-rotate", `${layout.rotation}deg`);
  });
}

function stopProductImageGallery(card) {
  const gallery = productImageGalleryState.get(card);
  if (gallery?.timerId) {
    window.clearInterval(gallery.timerId);
  }

  productImageGalleryState.delete(card);
  card.classList.remove("is-gallery-active");
  showProductGalleryCard(card, 0);
}

function startProductImageGallery(card) {
  if (productImageGalleryState.has(card)) {
    return;
  }

  const frames = card.querySelectorAll("[data-product-gallery-frame]");
  if (frames.length === 0) {
    return;
  }

  let frontIndex = 0;
  const gallery = {
    timerId: null
  };

  productImageGalleryState.set(card, gallery);
  card.classList.add("is-gallery-active");
  showProductGalleryCard(card, frontIndex);

  if (prefersReducedMotion?.matches || frames.length === 1) {
    return;
  }

  gallery.timerId = window.setInterval(() => {
    frontIndex = (frontIndex + 1) % frames.length;
    showProductGalleryCard(card, frontIndex);
  }, 900);
}

function bindProductImageGallery(card) {
  card.addEventListener("pointerenter", () => startProductImageGallery(card));
  card.addEventListener("pointerleave", () => stopProductImageGallery(card));
  card.addEventListener("focusin", () => startProductImageGallery(card));
  card.addEventListener("focusout", () => stopProductImageGallery(card));
}

function renderProductImageGallery(imageUrls) {
  const gallery = document.createElement("div");
  gallery.className = "product-image-gallery-stack";
  gallery.setAttribute("aria-hidden", "true");

  imageUrls.forEach((imageUrl, index) => {
    const layout = getProductGalleryCardLayout(index, index === 0);
    const image = document.createElement("img");
    image.alt = "";
    image.className = "product-image-gallery-frame";
    image.dataset.productGalleryFrame = "";
    image.decoding = "async";
    image.loading = "lazy";
    image.src = imageUrl;
    image.style.setProperty("--gallery-z", String(imageUrls.length - index));
    image.style.setProperty("--gallery-x", `${layout.x}px`);
    image.style.setProperty("--gallery-y", `${layout.y}px`);
    image.style.setProperty("--gallery-rotate", `${layout.rotation}deg`);
    gallery.append(image);
  });

  return gallery;
}

function normalizeApiUrl(url) {
  if (!url) {
    return "";
  }

  if (/^(https?:)?\/\//.test(url) || url.startsWith("assets/")) {
    return url;
  }

  return url.startsWith("/") ? `${getApiBaseUrl()}${url}` : `${getApiBaseUrl()}/${url}`;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const errorBody = await response.json();
      message = errorBody.message || message;
    } catch {
      // Keep the generic status message when the API has no JSON error body.
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

async function enforcePublicWebsiteMode() {
  if (window.location.pathname.endsWith("/coming-soon.html") || window.location.pathname.endsWith("/survey.html")) {
    return false;
  }

  try {
    const status = await apiRequest("/api/public/site-status?branch=Quezon%20City");
    if (status?.isComingSoon) {
      window.location.replace("coming-soon.html");
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function getProductPrice(item) {
  const salePrice = Number(item.discountedPrice ?? item.salePrice);
  const retailPrice = Number(item.retailPrice ?? item.srp ?? item.price);
  if (item.isOnSale && Number.isFinite(salePrice) && salePrice > 0) {
    return salePrice;
  }
  return Number.isFinite(retailPrice) ? retailPrice : 0;
}

function renderPrice(item) {
  const price = document.createElement("strong");
  const retailPrice = Number(item.retailPrice ?? item.srp ?? item.price);
  const salePrice = Number(item.discountedPrice ?? item.salePrice);

  if (item.isOnSale && Number.isFinite(salePrice) && salePrice > 0) {
    price.append(document.createTextNode(pesoFormatter.format(salePrice)));
    if (Number.isFinite(retailPrice) && retailPrice > salePrice) {
      const original = document.createElement("del");
      original.textContent = pesoFormatter.format(retailPrice);
      price.append(" ", original);

      const discount = document.createElement("em");
      const discountPercent = item.discountPercent ?? ((retailPrice - salePrice) / retailPrice) * 100;
      discount.textContent = `-${Number(discountPercent).toFixed(0)}%`;
      price.append(" ", discount);
    }
    return price;
  }

  price.textContent = Number.isFinite(retailPrice) && retailPrice > 0
    ? pesoFormatter.format(retailPrice)
    : "Ask for price";
  return price;
}

function renderProductPhoto(item) {
  const photo = document.createElement("div");
  const imageUrl = getProductImageUrls(item)[0];

  photo.className = "product-photo product-api-photo";
  photo.dataset.initial = (item.itemDescription || "SMB").trim().slice(0, 1).toUpperCase();

  if (imageUrl) {
    photo.classList.add("has-image");
    const image = document.createElement("img");
    image.className = "product-photo-primary";
    image.alt = item.itemDescription || "Web catalog item";
    image.loading = "lazy";
    image.src = imageUrl;
    photo.append(image);
  }

  return photo;
}

function getAvailabilityLabel(item) {
  const stockStatus = normalizeText(item.stockStatus || item.availabilityLabel);
  if (stockStatus.includes("out of stock") || stockStatus.includes("sold out") || stockStatus.includes("unavailable")) {
    return "OUT OF STOCK";
  }

  return "AVAILABLE";
}

function renderWebItemCard(item) {
  const card = document.createElement("article");
  card.className = "product-card";
  const imageUrls = getProductImageUrls(item);

  if (item.isNew) {
    card.append(createTextElement("span", "New", "badge"));
  }

  if (item.isOnSale) {
    card.append(createTextElement("span", "Sale!", "badge sale"));
  }

  const detail = [
    item.brand,
    item.category,
    item.stockStatus || item.availabilityLabel || "Ask availability"
  ].filter(Boolean).join(" / ");

  const action = document.createElement("a");
  const availabilityLabel = getAvailabilityLabel(item);
  action.href = "#contact";
  action.textContent = availabilityLabel;
  action.className = availabilityLabel === "OUT OF STOCK" ? "is-out-of-stock" : "is-available";
  action.setAttribute("aria-label", `${availabilityLabel} status for ${item.itemDescription || "this item"}`);

  card.append(
    renderProductPhoto(item),
    createTextElement("h3", item.itemDescription || "Web catalog item"),
    createTextElement("p", detail),
    renderPrice(item),
    action
  );

  if (imageUrls.length > 1) {
    card.classList.add("has-image-gallery");
    card.tabIndex = 0;
    card.setAttribute("aria-label", `${item.itemDescription || "Product"} image gallery preview`);
    card.append(renderProductImageGallery(imageUrls));
    showProductGalleryCard(card, 0);
    bindProductImageGallery(card);
  }

  return card;
}

async function loadWebItems() {
  if (state.items.length > 0) {
    return state.items;
  }

  const response = await fetch(`${getApiBaseUrl()}/api/public/web-items?branch=Quezon%20City`);
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  state.items = await response.json();
  state.categoryGroups = buildCategoryGroups(state.items);
  renderCategoryNav();
  return state.items;
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

function getCatalogItems() {
  const filtered = state.items
    .filter(isPublicProduct)
    .filter((item) => itemMatchesCategory(item, state.activeCategory))
    .filter(itemMatchesSubcategory);

  return filtered.sort((a, b) => {
    if (state.sort === "price-asc") {
      return getProductPrice(a) - getProductPrice(b);
    }
    if (state.sort === "price-desc") {
      return getProductPrice(b) - getProductPrice(a);
    }
    return Number(Boolean(b.isNew)) - Number(Boolean(a.isNew));
  });
}

function setMobileNavActive(key) {
  document.querySelectorAll("[data-mobile-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.mobileNav === key);
  });
}

function setCatalogMode(isCatalogMode) {
  document.body.classList.remove("is-community-mode");
  document.body.classList.toggle("is-catalog-mode", isCatalogMode);
  setMobileNavActive(isCatalogMode ? "catalog" : "home");
  document.querySelector("[data-community-view]")?.setAttribute("hidden", "");
  const catalogPanel = document.querySelector("[data-catalog-panel]");
  const homeProducts = document.querySelector("[data-home-products]");
  if (catalogPanel) {
    catalogPanel.hidden = !isCatalogMode;
  }
  if (homeProducts) {
    homeProducts.hidden = isCatalogMode;
  }
  document.querySelectorAll("[data-home-section]").forEach((section) => {
    section.hidden = isCatalogMode;
  });
}

function returnToHome() {
  setCatalogMode(false);
  showCommunityMode(false);
  state.activeCategory = null;
  state.activeSubcategory = "All";
  updateActiveCategoryNav();
  loadHomeProductItems(state.homeProductList);
  showProfileMode(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCategoryNav() {
  const nav = document.querySelector("[data-category-nav-list]");
  if (!nav) {
    return;
  }

  const isServicesPage = window.location.pathname.endsWith("/services.html");
  const goToHomeTarget = (targetId) => {
    if (isServicesPage) {
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
    { label: "Home", href: isServicesPage ? "index.html" : "#top", action: () => goToHomeTarget("top") },
    { label: "Products", href: isServicesPage ? "index.html#products" : "#products", action: () => goToHomeTarget("products") },
    { label: "Services", href: "services.html", action: goToServices, active: isServicesPage },
    { label: "Rides", href: isServicesPage ? "index.html#online" : "#online", action: () => goToHomeTarget("online") },
    { label: "Community", href: isServicesPage ? "index.html#community" : "#community", action: () => isServicesPage ? window.location.href = "index.html#community" : openCommunityPage(true), community: !isServicesPage },
    { label: "Survey", href: "survey.html", action: () => window.location.href = "survey.html" },
    { label: "Contact", href: isServicesPage ? "#contact" : "#contact", action: () => isServicesPage ? document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" }) : goToHomeTarget("contact") }
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
  if (filter === "all") {
    return true;
  }

  const category = getServiceCardCategory(card);
  const serviceFilterCategories = {
    basic: ["Basic Bike Service"],
    overhaul: ["Full Bike Service"],
    assembly: ["Bike Assembly"],
    drivetrain: ["Drivetrain Service", "Shifter Service"],
    brakes: ["Brake Service"],
    cables: ["Cable Service"],
    wheels: ["Wheel & Tire Service", "Hub Service"],
    fork: ["Fork Service"],
    cockpit: ["Cockpit Service", "Headset Service", "Fit / Adjustment Service"],
    accessories: ["Accessory Installation"]
  };

  return (serviceFilterCategories[filter] || []).includes(category);
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
  if (!filters || !group) {
    return;
  }

  filters.replaceChildren();
  group.filters.forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = filter;
    button.className = filter === state.activeSubcategory ? "active" : "";
    button.addEventListener("click", () => {
      state.activeSubcategory = filter;
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

function renderCatalog() {
  const grid = getWebItemsGrid();
  const group = getCategoryGroup(state.activeCategory);
  if (!grid || !group) {
    return;
  }

  document.querySelector("[data-stock-note]").textContent = "Stocks and prices may change. Message us to confirm before visiting or ordering.";
  renderSubcategoryFilters();
  updateActiveCategoryNav();

  const items = getCatalogItems();

  grid.replaceChildren();
  if (items.length === 0) {
    setGridState(`No ${group.title} Found`, "No publicly available products found for this category right now. Message us to check latest stock.");
  } else {
    items.forEach((item) => grid.append(renderWebItemCard(item)));
  }

  updateCatalogControls();
}

async function openCategoryCatalog(categoryKey) {
  state.activeSubcategory = "All";
  setCatalogMode(true);
  setGridState("Loading Catalog", "Checking SMBSystem catalog items for Quezon City.");

  try {
    await loadWebItems();
    const resolvedCategoryKey = resolveCategoryKey(categoryKey);
    if (!resolvedCategoryKey) {
      setGridState("Category Unavailable", "No public SMBSystem catalog items are available for this category right now.");
      return;
    }
    state.activeCategory = resolvedCategoryKey;
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

async function loadHomeProductItems(filterKey = state.homeProductList) {
  const webItemsGrid = getWebItemsGrid();
  if (!webItemsGrid) {
    return;
  }

  state.homeProductList = homeProductLists[filterKey] ? filterKey : "new";
  const config = getHomeProductListConfig(state.homeProductList);
  updateHomeProductTabs(state.homeProductList);
  document.querySelector("[data-stock-note]").textContent = config.note;
  setGridState(config.loadingTitle, "Checking SMBSystem web catalog items for Quezon City.");

  try {
    await loadWebItems();
    const filteredItems = state.items.filter((item) => isPublicProduct(item) && config.filter(item)).slice(0, 8);
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

function openCommunityPage(updatePath = true) {
  showCommunityMode(true, updatePath);
}

function updateCommunityAuthState() {
  const isLoggedIn = Boolean(customerState.account);
  document.querySelector("[data-community-guest-card]")?.toggleAttribute("hidden", isLoggedIn);
  document.querySelector("[data-community-start]")?.classList.toggle("is-disabled", !isLoggedIn);
}

function showCommunityAuthPrompt() {
  const prompt = document.querySelector("[data-community-auth-prompt]");
  if (prompt) {
    prompt.hidden = false;
  }
}

function hideCommunityAuthPrompt() {
  const prompt = document.querySelector("[data-community-auth-prompt]");
  if (prompt) {
    prompt.hidden = true;
  }
}

function openCommunityLoginForm() {
  openCommunityPage(false);
  const form = document.querySelector("[data-community-login-form]");
  if (form) {
    form.hidden = false;
    form.querySelector("input[name='username']")?.focus();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function requireCommunityLogin() {
  if (customerState.account) {
    return true;
  }
  showCommunityAuthPrompt();
  return false;
}

function getCommunityMessage() {
  return document.querySelector("[data-community-message]");
}

function setCommunityStateCard(title, detail) {
  const posts = document.querySelector("[data-community-posts]");
  if (!posts) {
    return;
  }
  const card = document.createElement("article");
  card.className = "community-state-card";
  card.append(createTextElement("h3", title), createTextElement("p", detail));
  posts.replaceChildren(card);
}

async function loadCommunityDiscussions(force = false) {
  if (communityState.isLoading || (communityState.isLoaded && !force)) {
    return;
  }

  communityState.isLoading = true;
  setCommunityStateCard("Loading Community", "Checking approved SarapMagBike discussions.");

  try {
    const query = new URLSearchParams();
    if (communityState.search) {
      query.set("search", communityState.search);
    }
    if (communityState.selectedCategory !== "all") {
      query.set("category", communityState.selectedCategory);
    }
    const suffix = query.toString() ? `?${query}` : "";
    const [config, categories, posts] = await Promise.all([
      apiRequest("/api/public/community/config"),
      apiRequest("/api/public/community/categories"),
      apiRequest(`/api/public/community/posts${suffix}`)
    ]);
    communityState.config = config;
    communityState.categories = categories;
    communityState.posts = sortCommunityPosts(posts);
    communityState.isLoaded = true;
    renderCommunityCategories();
    renderCommunityPosts();
    renderCommunityConfig();
  } catch (error) {
    setCommunityStateCard("Community Unavailable", "SMBSystem public community API is not reachable. Try again after the API is running.");
  } finally {
    communityState.isLoading = false;
  }
}

function renderCommunityConfig() {
  const warning = document.querySelector("[data-community-warning]");
  if (warning && communityState.config?.privacyWarning) {
    warning.textContent = communityState.config.privacyWarning;
  }
}

function renderCommunityCategories() {
  const select = document.querySelector("[data-community-category]");
  if (!select) {
    return;
  }

  const currentValue = select.value || "all";
  select.replaceChildren(new Option("All categories", "all"));
  communityState.categories.forEach((category) => {
    select.append(new Option(category.name, category.slug));
  });
  select.value = communityState.categories.some((category) => category.slug === currentValue) ? currentValue : "all";
  communityState.selectedCategorySlugs = communityState.selectedCategorySlugs.filter((slug) =>
    communityState.categories.some((category) => category.slug === slug)
  );
  renderCommunityComposerCategories();
}

function renderCommunityComposerCategories() {
  const container = document.querySelector("[data-community-composer-categories]");
  if (!container) {
    return;
  }

  container.replaceChildren();
  communityState.categories.forEach((category) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = category.name;
    chip.dataset.categorySlug = category.slug;
    chip.className = communityState.selectedCategorySlugs.includes(category.slug) ? "active" : "";
    chip.setAttribute("aria-pressed", String(communityState.selectedCategorySlugs.includes(category.slug)));
    chip.addEventListener("click", () => toggleCommunityComposerCategory(category.slug));
    container.append(chip);
  });
}

function toggleCommunityComposerCategory(slug) {
  if (!requireCommunityLogin()) {
    return;
  }

  if (communityState.selectedCategorySlugs.includes(slug)) {
    communityState.selectedCategorySlugs = communityState.selectedCategorySlugs.filter((item) => item !== slug);
  } else {
    communityState.selectedCategorySlugs = [...communityState.selectedCategorySlugs, slug];
  }
  renderCommunityComposerCategories();
  updateCommunityComposerState();
}

function renderCommunityPosts() {
  const posts = document.querySelector("[data-community-posts]");
  if (!posts) {
    return;
  }

  communityState.posts = sortCommunityPosts(communityState.posts);
  posts.replaceChildren();
  if (communityState.posts.length === 0) {
    setCommunityStateCard("No Discussions Yet", "Start with a product question, service concern, bike check, or ride invite.");
    return;
  }

  communityState.posts.forEach((post) => posts.append(renderCommunityPostCard(post)));
}

function getCommunityPostAuthorName(post) {
  return post.authorName || post.author?.displayName || "SarapMagBike rider";
}

function getCommunityPostAuthorAvatar(post) {
  return post.authorAvatarUrl || post.author?.avatarUrl || post.author?.profilePictureUrl || "";
}

function isOwnCommunityPost(post) {
  const accountId = customerState.account?.id || customerState.account?.Id;
  const authorId = post.authorCustomerAccountId || post.authorId || post.author?.id || post.author?.customerAccountId;
  return Boolean(accountId && authorId && String(accountId).toLowerCase() === String(authorId).toLowerCase());
}

function renderCommunityPostHeader(post) {
  const header = document.createElement("div");
  header.className = "community-post-header";

  const authorName = getCommunityPostAuthorName(post);
  const avatar = renderCommunityAvatar(authorName, getCommunityPostAuthorAvatar(post));
  avatar.classList.add("community-post-avatar");

  const identity = document.createElement("div");
  identity.className = "community-post-identity";
  identity.append(createTextElement("strong", authorName));

  const detail = document.createElement("div");
  detail.className = "community-post-detail";
  detail.append(createTextElement("span", formatCommunityDateTime(post.createdAt)));
  const dot = document.createElement("span");
  dot.textContent = "·";
  dot.setAttribute("aria-hidden", "true");
  const globe = document.createElement("span");
  globe.className = "community-post-visibility";
  globe.title = "Public";
  globe.innerHTML = `
    <svg viewBox="0 0 16 16" focusable="false">
      <circle cx="8" cy="8" r="6.2"></circle>
      <path d="M2.4 8h11.2M8 1.8c1.7 1.7 2.5 3.8 2.5 6.2s-.8 4.5-2.5 6.2M8 1.8C6.3 3.5 5.5 5.6 5.5 8s.8 4.5 2.5 6.2"></path>
    </svg>
  `;
  detail.append(dot, globe);
  identity.append(detail);

  header.append(avatar, identity);

  const menu = renderCommunityPostMenu(post);
  header.append(menu);

  return header;
}

function renderCommunityPostMenu(post) {
  const wrapper = document.createElement("div");
  wrapper.className = "community-post-menu";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "community-post-menu-button";
  button.setAttribute("aria-label", "Open post actions");
  button.setAttribute("aria-expanded", "false");
  button.textContent = "...";

  const menu = document.createElement("div");
  menu.className = "community-post-menu-list";
  menu.hidden = true;

  if (isOwnCommunityPost(post)) {
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit post";
    edit.addEventListener("click", () => {
      closeCommunityPostMenus();
      openCommunityEditModal(post.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete post";
    deleteButton.addEventListener("click", () => {
      closeCommunityPostMenus();
      deleteCommunityPost(post.id);
    });

    menu.append(edit, deleteButton);
  } else {
    const report = document.createElement("button");
    report.type = "button";
    report.textContent = "Report post";
    report.addEventListener("click", () => {
      closeCommunityPostMenus();
      reportCommunityPost(post.id);
    });
    menu.append(report);
  }
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    closeCommunityPostMenus();
    menu.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
  });
  wrapper.append(button, menu);
  return wrapper;
}

function renderCommunityMediaGrid(mediaItems = [], options = {}) {
  const photos = Array.isArray(mediaItems) ? mediaItems.slice(0, 3) : [];
  if (photos.length === 0) {
    return null;
  }

  const media = document.createElement("div");
  media.className = `community-media-grid media-count-${photos.length}`;
  photos.forEach((photo, index) => {
    const image = document.createElement("img");
    image.alt = photo.fileName || "Discussion photo";
    image.loading = "lazy";
    image.src = normalizeApiUrl(photo.url);
    if (typeof options.onPhotoClick === "function") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "community-media-button";
      button.setAttribute("aria-label", `Open ${image.alt}`);
      button.addEventListener("click", () => options.onPhotoClick(index));
      button.append(image);
      media.append(button);
    } else {
      media.append(image);
    }
  });
  return media;
}

function closeCommunityPostMenus() {
  document.querySelectorAll(".community-post-menu-list").forEach((menu) => {
    menu.hidden = true;
  });
  document.querySelectorAll(".community-post-menu-button").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function renderCommunityPostCard(post) {
  const card = document.createElement("article");
  card.className = "community-post-card";
  card.dataset.communityPostId = post.id;

  const meta = renderCommunityPostHeader(post);

  const body = createTextElement("p", post.body, "community-post-body");
  card.append(meta, body);

  const media = renderCommunityMediaGrid(post.media, {
    onPhotoClick: (index) => openCommunityPhotoModal(post.id, index)
  });
  if (media) {
    card.append(media);
  }

  const actions = document.createElement("div");
  actions.className = "community-post-actions";
  actions.append(
    createCommunityActionButton(getCommunityLikeLabel(post), () => toggleCommunityReaction(post.id), {
      className: "community-like-action",
      icon: "like",
      label: `Like, ${getCommunityLikeLabel(post)} likes`,
      pressed: Boolean(post.likedByMe)
    }),
    createCommunityActionButton(getCommunityReplyLabel(post), () => openCommunityThreadModal(post.id), {
      className: "community-thread-action",
      icon: "comment",
      label: `${getCommunityReplyLabel(post)} replies`
    })
  );
  card.append(actions);

  return card;
}

function renderCommunityPostThread(post) {
  const thread = document.createElement("article");
  thread.className = "community-post-card community-post-thread-card";
  thread.dataset.communityThreadPostId = post.id;

  const meta = renderCommunityPostHeader(post);

  const body = createTextElement("p", post.body, "community-post-body");
  thread.append(meta, body);

  const media = renderCommunityMediaGrid(post.media);
  if (media) {
    thread.append(media);
  }

  const actions = document.createElement("div");
  actions.className = "community-post-actions";
  actions.append(
    createCommunityActionButton(getCommunityLikeLabel(post), () => toggleCommunityReaction(post.id), {
      className: "community-like-action",
      icon: "like",
      label: `Like, ${getCommunityLikeLabel(post)} likes`,
      pressed: Boolean(post.likedByMe)
    })
  );
  thread.append(actions);

  const comments = document.createElement("div");
  comments.className = "community-comments";
  renderCommunityCommentTree(post).forEach((commentNode) => {
    comments.append(renderCommunityComment(commentNode.comment, post.id, commentNode.children));
  });
  if (comments.childElementCount === 0) {
    const empty = document.createElement("p");
    empty.className = "community-thread-empty";
    empty.textContent = "No replies yet.";
    comments.append(empty);
  }
  thread.append(comments);

  const replyForm = document.createElement("form");
  replyForm.className = "community-reply-form";
  replyForm.innerHTML = `
    <input name="body" maxlength="1000" placeholder="Reply to this discussion">
    <button type="submit">Reply</button>
  `;
  replyForm.addEventListener("submit", (event) => submitCommunityComment(event, post.id));
  thread.append(replyForm);

  return thread;
}

function renderCommunityCommentTree(post) {
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const nodes = new Map(comments.map((comment) => [comment.id, { comment, children: [] }]));
  const roots = [];

  comments.forEach((comment) => {
    const node = nodes.get(comment.id);
    const parentNode = comment.parentCommentId ? nodes.get(comment.parentCommentId) : null;
    if (parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (items) => {
    items.sort((first, second) => (Date.parse(second.comment?.createdAt || "") || 0) - (Date.parse(first.comment?.createdAt || "") || 0));
    items.forEach((item) => sortNodes(item.children));
    return items;
  };

  return sortNodes(roots);
}

function getCommunityActivityTime(post) {
  return Date.parse(post?.lastActivityAt || post?.createdAt || "") || 0;
}

function sortCommunityPosts(posts) {
  return [...(posts || [])].sort((first, second) => {
    const pinnedDelta = Number(Boolean(second?.isPinned)) - Number(Boolean(first?.isPinned));
    if (pinnedDelta !== 0) {
      return pinnedDelta;
    }

    const activityDelta = getCommunityActivityTime(second) - getCommunityActivityTime(first);
    if (activityDelta !== 0) {
      return activityDelta;
    }

    return (Date.parse(second?.createdAt || "") || 0) - (Date.parse(first?.createdAt || "") || 0);
  });
}

function communityPostMatchesCurrentFilter(post) {
  if (!post) {
    return false;
  }

  const selectedCategory = communityState.selectedCategory || "all";
  if (selectedCategory !== "all") {
    const categories = Array.isArray(post.categories) ? post.categories : [];
    const hasSelectedCategory = categories.some((category) => category.slug === selectedCategory) ||
      post.categorySlug === selectedCategory;
    if (!hasSelectedCategory) {
      return false;
    }
  }

  const search = (communityState.search || "").trim().toLowerCase();
  if (!search) {
    return true;
  }

  const categoryText = (Array.isArray(post.categories) ? post.categories : [])
    .map((category) => category.name)
    .join(" ");
  return `${post.body || ""} ${categoryText}`.toLowerCase().includes(search);
}

function upsertCommunityPost(updatedPost, options = {}) {
  if (!updatedPost || !communityPostMatchesCurrentFilter(updatedPost)) {
    return;
  }

  const posts = document.querySelector("[data-community-posts]");
  if (!posts) {
    return;
  }

  posts.querySelectorAll(".community-state-card").forEach((card) => card.remove());

  const placement = options.placement || "sorted";
  const existingIndex = communityState.posts.findIndex((post) => post.id === updatedPost.id);
  if (existingIndex >= 0) {
    communityState.posts[existingIndex] = updatedPost;
  } else {
    communityState.posts = placement === "top"
      ? [updatedPost, ...communityState.posts]
      : [...communityState.posts, updatedPost];
  }

  if (placement === "sorted") {
    communityState.posts = sortCommunityPosts(communityState.posts);
  }

  const nextCard = renderCommunityPostCard(updatedPost);
  const currentCard = posts.querySelector(`[data-community-post-id="${CSS.escape(updatedPost.id)}"]`);
  if (currentCard) {
    currentCard.replaceWith(nextCard);
  } else if (placement === "top") {
    posts.prepend(nextCard);
  } else {
    posts.append(nextCard);
  }

  if (placement !== "preserve") {
    communityState.posts.forEach((post) => {
      const card = posts.querySelector(`[data-community-post-id="${CSS.escape(post.id)}"]`);
      if (card) {
        posts.append(card);
      }
    });
  }

  refreshCommunityThreadModal();
  refreshCommunityPhotoModal();
}

function renderCommunityComment(comment, postId, childNodes = []) {
  const item = document.createElement("article");
  item.className = `community-comment${comment.isStaffReply ? " is-staff" : ""}`;
  item.dataset.communityCommentId = comment.id;
  const authorName = comment.authorName || comment.author?.displayName || "SarapMagBike rider";
  const avatar = renderCommunityAvatar(authorName, comment.authorAvatarUrl);
  const content = document.createElement("div");
  content.className = "community-comment-content";
  const heading = document.createElement("div");
  heading.className = "community-comment-heading";
  heading.append(
    createTextElement("strong", authorName),
    createTextElement("span", comment.isStaffAnswer ? "Staff answer" : formatCommunityTime(comment.createdAt))
  );
  content.append(heading, createTextElement("p", comment.body));
  const actions = document.createElement("div");
  actions.className = "community-comment-actions";
  actions.append(
    createCommunityActionButton(getCommunityCommentLikeLabel(comment), () => toggleCommunityCommentReaction(comment.id), {
      className: "community-comment-like-action",
      pressed: Boolean(comment.likedByMe)
    }),
    createCommunityActionButton("Reply", () => showCommunityCommentReplyForm(item))
  );
  content.append(actions);
  if (childNodes.length > 0) {
    const children = document.createElement("div");
    children.className = "community-comment-replies";
    childNodes.forEach((childNode) => {
      children.append(renderCommunityComment(childNode.comment, postId, childNode.children));
    });
    content.append(children);
  }
  const replyForm = document.createElement("form");
  replyForm.className = "community-comment-reply-form";
  replyForm.hidden = true;
  replyForm.innerHTML = `
    <input name="body" maxlength="1000" placeholder="Reply to this comment">
    <button type="submit">Reply</button>
  `;
  replyForm.addEventListener("submit", (event) => submitCommunityComment(event, postId, comment.id));
  content.append(replyForm);
  item.append(avatar, content);
  return item;
}

function renderCommunityAvatar(name, avatarUrl) {
  const avatar = document.createElement("div");
  avatar.className = "community-comment-avatar";
  const normalizedUrl = normalizeApiUrl(avatarUrl);
  if (normalizedUrl) {
    const image = document.createElement("img");
    image.src = normalizedUrl;
    image.alt = `${name} avatar`;
    avatar.append(image);
    return avatar;
  }

  avatar.textContent = getCommunityInitials(name);
  return avatar;
}

function getCommunityInitials(name) {
  return String(name || "SMB")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("") || "SMB";
}

function getCommunityLikeLabel(post) {
  return String(post?.likeCount || post?.reactionCount || 0);
}

function getCommunityReplyCount(post) {
  return Array.isArray(post?.comments) ? post.comments.length : Number(post?.commentCount || post?.replyCount || 0);
}

function getCommunityReplyLabel(post) {
  return String(getCommunityReplyCount(post));
}

function getCommunityCommentLikeLabel(comment) {
  return `Like (${comment?.likeCount || 0})`;
}

function createCommunityActionButton(label, onClick, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  if (options.className) {
    button.className = options.className;
  }
  if (options.icon) {
    button.append(createCommunityActionIcon(options.icon));
  }
  const labelElement = document.createElement("span");
  labelElement.className = options.icon ? "community-action-count" : "community-action-label";
  labelElement.textContent = label;
  button.append(labelElement);
  if (typeof options.pressed === "boolean") {
    button.setAttribute("aria-pressed", String(options.pressed));
  }
  if (options.label) {
    button.setAttribute("aria-label", options.label);
    button.title = options.label;
  }
  button.addEventListener("click", onClick);
  return button;
}

function createCommunityActionIcon(icon) {
  const wrapper = document.createElement("span");
  wrapper.className = `community-action-icon community-action-icon-${icon}`;
  wrapper.setAttribute("aria-hidden", "true");

  if (icon === "like") {
    wrapper.innerHTML = `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M7.2 21H4.4A2.4 2.4 0 0 1 2 18.6v-6.2A2.4 2.4 0 0 1 4.4 10h2.8V21Z"></path>
        <path d="M7.2 10.2c1.6-1 2.7-2.5 3.4-4.6l.6-1.9A2.1 2.1 0 0 1 15.3 4v4.3h3.8a2.6 2.6 0 0 1 2.5 3.1l-1.2 6.5A3.8 3.8 0 0 1 16.7 21H7.2V10.2Z"></path>
      </svg>
    `;
  } else if (icon === "comment") {
    wrapper.innerHTML = `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 4C6.9 4 3 7.5 3 12c0 2.5 1.3 4.8 3.4 6.2l-.5 3 3.4-1.7c.9.3 1.8.5 2.8.5 5.1 0 9-3.5 9-8S17.1 4 12 4Z"></path>
      </svg>
    `;
  }

  return wrapper;
}

function setCommunityActionButtonLabel(button, label, ariaLabel) {
  const labelElement = button.querySelector(".community-action-count");
  if (labelElement) {
    labelElement.textContent = label;
  } else {
    button.textContent = label;
  }
  if (ariaLabel) {
    button.setAttribute("aria-label", ariaLabel);
    button.title = ariaLabel;
  }
}

function updateCommunityReactionLabel(updatedPost) {
  if (!updatedPost) {
    return;
  }

  const existingIndex = communityState.posts.findIndex((post) => post.id === updatedPost.id);
  if (existingIndex >= 0) {
    communityState.posts[existingIndex] = updatedPost;
  }

  document
    .querySelectorAll(`[data-community-post-id="${CSS.escape(updatedPost.id)}"] .community-like-action, [data-community-thread-post-id="${CSS.escape(updatedPost.id)}"] .community-like-action, [data-community-photo-post-id="${CSS.escape(updatedPost.id)}"] .community-like-action`)
    .forEach((likeButton) => {
      setCommunityActionButtonLabel(likeButton, getCommunityLikeLabel(updatedPost), `Like, ${getCommunityLikeLabel(updatedPost)} likes`);
      likeButton.setAttribute("aria-pressed", String(Boolean(updatedPost.likedByMe)));
    });
}

function updateCommunityCommentReactionLabel(updatedPost, commentId) {
  if (!updatedPost) {
    return;
  }

  const existingIndex = communityState.posts.findIndex((post) => post.id === updatedPost.id);
  if (existingIndex >= 0) {
    communityState.posts[existingIndex] = updatedPost;
  }

  const updatedComment = (updatedPost.comments || []).find((comment) => comment.id === commentId);
  const likeButton = document.querySelector(`[data-community-comment-id="${CSS.escape(commentId)}"] .community-comment-like-action`);
  if (!updatedComment || !likeButton) {
    return;
  }

  likeButton.textContent = getCommunityCommentLikeLabel(updatedComment);
  likeButton.setAttribute("aria-pressed", String(Boolean(updatedComment.likedByMe)));
}

function getCommunityPostById(postId) {
  return communityState.posts.find((post) => post.id === postId);
}

function openCommunityThreadModal(postId) {
  const post = getCommunityPostById(postId);
  const modal = document.querySelector("[data-community-thread-modal]");
  const content = document.querySelector("[data-community-thread-content]");
  if (!post || !modal || !content) {
    return;
  }

  communityState.activeThreadPostId = postId;
  content.replaceChildren(renderCommunityPostThread(post));
  modal.hidden = false;
}

function closeCommunityThreadModal() {
  const modal = document.querySelector("[data-community-thread-modal]");
  const content = document.querySelector("[data-community-thread-content]");
  communityState.activeThreadPostId = null;
  if (content) {
    content.replaceChildren();
  }
  if (modal) {
    modal.hidden = true;
  }
}

function getCommunityPostPhotos(post) {
  return Array.isArray(post?.media) ? post.media.slice(0, 3) : [];
}

function openCommunityPhotoModal(postId, photoIndex = 0) {
  const post = getCommunityPostById(postId);
  const photos = getCommunityPostPhotos(post);
  const modal = document.querySelector("[data-community-photo-modal]");
  if (!post || photos.length === 0 || !modal) {
    return;
  }

  communityState.activePhotoPostId = postId;
  communityState.activePhotoIndex = Math.min(Math.max(photoIndex, 0), photos.length - 1);
  modal.hidden = false;
  renderCommunityPhotoModal();
}

function closeCommunityPhotoModal() {
  const modal = document.querySelector("[data-community-photo-modal]");
  const panel = document.querySelector("[data-community-photo-panel]");
  communityState.activePhotoPostId = null;
  communityState.activePhotoIndex = 0;
  if (panel) {
    panel.replaceChildren();
  }
  if (modal) {
    modal.hidden = true;
  }
}

function changeCommunityPhotoModal(delta) {
  const post = getCommunityPostById(communityState.activePhotoPostId);
  const photos = getCommunityPostPhotos(post);
  if (photos.length === 0) {
    return;
  }

  communityState.activePhotoIndex = (communityState.activePhotoIndex + delta + photos.length) % photos.length;
  renderCommunityPhotoModal();
}

function refreshCommunityPhotoModal() {
  if (!communityState.activePhotoPostId) {
    return;
  }

  const post = getCommunityPostById(communityState.activePhotoPostId);
  if (!post || getCommunityPostPhotos(post).length === 0) {
    closeCommunityPhotoModal();
    return;
  }

  renderCommunityPhotoModal();
}

function renderCommunityPhotoModal() {
  const post = getCommunityPostById(communityState.activePhotoPostId);
  const photos = getCommunityPostPhotos(post);
  const image = document.querySelector("[data-community-photo-viewer-image]");
  const counter = document.querySelector("[data-community-photo-counter]");
  const previous = document.querySelector("[data-community-photo-prev]");
  const next = document.querySelector("[data-community-photo-next]");
  const panel = document.querySelector("[data-community-photo-panel]");
  if (!post || photos.length === 0 || !image || !counter || !previous || !next || !panel) {
    return;
  }

  communityState.activePhotoIndex = Math.min(Math.max(communityState.activePhotoIndex, 0), photos.length - 1);
  const photo = photos[communityState.activePhotoIndex];
  image.src = normalizeApiUrl(photo.url);
  image.alt = photo.fileName || "Post photo";
  counter.textContent = photos.length > 1 ? `${communityState.activePhotoIndex + 1} / ${photos.length}` : "";
  previous.hidden = photos.length < 2;
  next.hidden = photos.length < 2;
  panel.replaceChildren(renderCommunityPhotoPanel(post));
}

function renderCommunityPhotoPanel(post) {
  const panel = document.createElement("div");
  panel.className = "community-photo-panel-inner";
  panel.dataset.communityPhotoPostId = post.id;

  panel.append(renderCommunityPostHeader(post));
  panel.append(createTextElement("p", post.body, "community-post-body"));

  const actions = document.createElement("div");
  actions.className = "community-post-actions";
  actions.append(
    createCommunityActionButton(getCommunityLikeLabel(post), () => toggleCommunityReaction(post.id), {
      className: "community-like-action",
      icon: "like",
      label: `Like, ${getCommunityLikeLabel(post)} likes`,
      pressed: Boolean(post.likedByMe)
    }),
    createCommunityActionButton(getCommunityReplyLabel(post), () => {
      if (!requireCommunityLogin()) {
        return;
      }
      panel.querySelector(".community-reply-form input")?.focus();
    }, {
      className: "community-thread-action",
      icon: "comment",
      label: `${getCommunityReplyLabel(post)} replies`
    })
  );
  panel.append(actions);

  const comments = document.createElement("div");
  comments.className = "community-comments community-photo-comments";
  renderCommunityCommentTree(post).forEach((commentNode) => {
    comments.append(renderCommunityComment(commentNode.comment, post.id, commentNode.children));
  });
  if (comments.childElementCount === 0) {
    const empty = document.createElement("p");
    empty.className = "community-thread-empty";
    empty.textContent = "No replies yet.";
    comments.append(empty);
  }
  panel.append(comments);

  const replyForm = document.createElement("form");
  replyForm.className = "community-reply-form";
  replyForm.innerHTML = `
    <input name="body" maxlength="1000" placeholder="Write a comment">
    <button type="submit">Reply</button>
  `;
  replyForm.addEventListener("submit", (event) => submitCommunityComment(event, post.id));
  panel.append(replyForm);

  return panel;
}

function openCommunityEditModal(postId) {
  const post = getCommunityPostById(postId);
  const modal = document.querySelector("[data-community-edit-modal]");
  const form = document.querySelector("[data-community-edit-form]");
  const message = document.querySelector("[data-community-edit-message]");
  const author = document.querySelector("[data-community-edit-author]");
  const mediaContainer = document.querySelector("[data-community-edit-media]");
  if (!post || !modal || !form || !author || !mediaContainer) {
    return;
  }

  communityState.editingPostId = postId;
  communityState.editingOriginalBody = post.body || "";
  communityState.editingSavedBody = post.body || "";
  communityState.isSavingEdit = false;
  author.replaceChildren(renderCommunityAvatar(getCommunityPostAuthorName(post), getCommunityPostAuthorAvatar(post)));
  const authorText = document.createElement("div");
  authorText.append(
    createTextElement("strong", getCommunityPostAuthorName(post)),
    createTextElement("span", "Editing your post")
  );
  author.append(authorText);
  mediaContainer.replaceChildren();
  const media = renderCommunityMediaGrid(post.media);
  if (media) {
    mediaContainer.append(media);
    mediaContainer.hidden = false;
  } else {
    mediaContainer.hidden = true;
  }
  form.elements.body.value = post.body || "";
  hideCommunityEditCloseConfirm();
  updateCommunityEditSaveState();
  setMessage(message, "");
  modal.hidden = false;
  form.elements.body.focus();
}

function closeCommunityEditModal() {
  const modal = document.querySelector("[data-community-edit-modal]");
  const form = document.querySelector("[data-community-edit-form]");
  const message = document.querySelector("[data-community-edit-message]");
  const author = document.querySelector("[data-community-edit-author]");
  const mediaContainer = document.querySelector("[data-community-edit-media]");
  communityState.editingPostId = null;
  communityState.editingOriginalBody = "";
  communityState.editingSavedBody = "";
  communityState.isSavingEdit = false;
  if (form) {
    form.reset();
  }
  if (author) {
    author.replaceChildren();
  }
  if (mediaContainer) {
    mediaContainer.replaceChildren();
    mediaContainer.hidden = true;
  }
  hideCommunityEditCloseConfirm();
  setMessage(message, "");
  if (modal) {
    modal.hidden = true;
  }
}

function getCommunityEditBody() {
  const form = document.querySelector("[data-community-edit-form]");
  return form?.elements.body.value.trim() || "";
}

function hasUnsavedCommunityEditChanges() {
  return Boolean(communityState.editingPostId) && getCommunityEditBody() !== communityState.editingSavedBody.trim();
}

function updateCommunityEditSaveState() {
  const saveButton = document.querySelector("[data-community-edit-save]");
  if (!saveButton) {
    return;
  }

  const body = getCommunityEditBody();
  saveButton.disabled = communityState.isSavingEdit || !body || body === communityState.editingSavedBody.trim();
}

function hideCommunityEditCloseConfirm() {
  const confirm = document.querySelector("[data-community-edit-confirm]");
  if (confirm) {
    confirm.hidden = true;
  }
}

function requestCloseCommunityEditModal() {
  if (!hasUnsavedCommunityEditChanges()) {
    closeCommunityEditModal();
    return;
  }

  const confirm = document.querySelector("[data-community-edit-confirm]");
  if (confirm) {
    confirm.hidden = false;
  }
}

async function submitCommunityPostEdit(event) {
  event.preventDefault();
  await saveCommunityPostEdit({ closeAfterSave: false });
}

async function saveCommunityPostEdit(options = {}) {
  if (!communityState.editingPostId) {
    return;
  }

  const message = document.querySelector("[data-community-edit-message]");
  const body = getCommunityEditBody();
  if (!body) {
    setMessage(message, "Post text is required.", "error");
    updateCommunityEditSaveState();
    return;
  }

  if (body === communityState.editingSavedBody.trim()) {
    updateCommunityEditSaveState();
    if (options.closeAfterSave) {
      closeCommunityEditModal();
    }
    return;
  }

  communityState.isSavingEdit = true;
  updateCommunityEditSaveState();
  setMessage(message, "Saving post...");
  try {
    const updatedPost = await apiRequest(`/api/public/community/posts/${communityState.editingPostId}`, {
      method: "PATCH",
      body: JSON.stringify({ body })
    });
    communityState.editingSavedBody = updatedPost.body || body;
    communityState.editingOriginalBody = communityState.editingSavedBody;
    const form = document.querySelector("[data-community-edit-form]");
    if (form) {
      form.elements.body.value = communityState.editingSavedBody;
    }
    upsertCommunityPost(updatedPost, { placement: "preserve" });
    hideCommunityEditCloseConfirm();
    setMessage(message, "Post updated.", "success");
    if (options.closeAfterSave) {
      closeCommunityEditModal();
    }
  } catch (error) {
    setMessage(message, error.message || "Unable to edit post. SMBSystem may need the public edit endpoint first.", "error");
  } finally {
    communityState.isSavingEdit = false;
    updateCommunityEditSaveState();
  }
}

async function deleteCommunityPost(postId) {
  if (!window.confirm("Delete this post? This cannot be undone.")) {
    return;
  }

  try {
    await apiRequest(`/api/public/community/posts/${postId}`, { method: "DELETE" });
    communityState.posts = communityState.posts.filter((post) => post.id !== postId);
    document.querySelector(`[data-community-post-id="${CSS.escape(postId)}"]`)?.remove();
    if (communityState.activeThreadPostId === postId) {
      closeCommunityThreadModal();
    }
    if (communityState.posts.length === 0) {
      setCommunityStateCard("No Discussions Yet", "Start with a product question, service concern, bike check, or ride invite.");
    }
  } catch (error) {
    alert(error.message || "Unable to delete post. SMBSystem may need the public delete endpoint first.");
  }
}

function refreshCommunityThreadModal() {
  if (!communityState.activeThreadPostId) {
    return;
  }

  const post = getCommunityPostById(communityState.activeThreadPostId);
  const modal = document.querySelector("[data-community-thread-modal]");
  const content = document.querySelector("[data-community-thread-content]");
  if (!post || !modal || !content || modal.hidden) {
    return;
  }

  content.replaceChildren(renderCommunityPostThread(post));
}

function showCommunityCommentReplyForm(commentItem) {
  if (!requireCommunityLogin()) {
    return;
  }

  const form = commentItem.querySelector(":scope > .community-comment-content > .community-comment-reply-form");
  const input = form?.querySelector("input");
  if (form && input) {
    form.hidden = false;
    input.focus();
  }
}

function focusCommunityReply(card) {
  if (!requireCommunityLogin()) {
    return;
  }
  const input = card.querySelector(".community-reply-form input");
  if (input) {
    input.focus();
  }
}

async function submitCommunityPost(event) {
  event.preventDefault();
  if (!requireCommunityLogin()) {
    return;
  }

  const form = event.currentTarget;
  const message = getCommunityMessage();
  setMessage(message, "Posting discussion...");

  try {
    if (communityState.selectedCategorySlugs.length === 0) {
      throw new Error("Select at least one discussion category.");
    }
    const payload = {
      body: form.elements.body.value.trim(),
      categorySlugs: communityState.selectedCategorySlugs,
      photos: communityState.photoUploads.map(({ base64, contentType, fileName }) => ({ base64, contentType, fileName }))
    };
    const created = await apiRequest("/api/public/community/posts", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    form.reset();
    resetCommunityComposerState();
    setMessage(message, created.status === "pending_review"
      ? "Discussion sent for staff review."
      : "Discussion posted.", "success");
    if (created.status !== "pending_review" && communityPostMatchesCurrentFilter(created)) {
      upsertCommunityPost(created, { placement: "top" });
    }
  } catch (error) {
    setMessage(message, error.message || "Unable to post discussion.", "error");
  }
}

async function submitCommunityComment(event, postId, parentCommentId = null) {
  event.preventDefault();
  if (!requireCommunityLogin()) {
    return;
  }

  const form = event.currentTarget;
  const input = form.elements.body;
  const body = input.value.trim();
  if (!body) {
    return;
  }

  try {
    const updatedPost = await apiRequest(`/api/public/community/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, parentCommentId })
    });
    input.value = "";
    form.hidden = Boolean(parentCommentId);
    upsertCommunityPost(updatedPost, { placement: "preserve" });
  } catch (error) {
    alert(error.message || "Unable to reply.");
  }
}

async function toggleCommunityReaction(postId) {
  if (!requireCommunityLogin()) {
    return;
  }
  try {
    const updatedPost = await apiRequest(`/api/public/community/posts/${postId}/reaction`, {
      method: "POST",
      body: JSON.stringify({ reactionType: "like" })
    });
    updateCommunityReactionLabel(updatedPost);
  } catch (error) {
    alert(error.message || "Unable to update reaction.");
  }
}

async function toggleCommunityCommentReaction(commentId) {
  if (!requireCommunityLogin()) {
    return;
  }
  try {
    const updatedPost = await apiRequest(`/api/public/community/comments/${commentId}/reaction`, {
      method: "POST",
      body: JSON.stringify({ reactionType: "like" })
    });
    updateCommunityCommentReactionLabel(updatedPost, commentId);
  } catch (error) {
    alert(error.message || "Unable to update comment reaction.");
  }
}

async function reportCommunityPost(postId) {
  if (!requireCommunityLogin()) {
    return;
  }
  const reason = window.prompt("Why are you reporting this discussion?");
  if (!reason || !reason.trim()) {
    return;
  }
  try {
    await apiRequest("/api/public/community/reports", {
      method: "POST",
      body: JSON.stringify({ postId, reason: reason.trim() })
    });
    alert("Report sent to SarapMagBike staff.");
  } catch (error) {
    alert(error.message || "Unable to send report.");
  }
}

async function readCommunityPhotos(fileList, existingCount = 0) {
  const files = Array.from(fileList || []);
  const config = communityState.config || {};
  const maxFiles = config.maxPhotosPerPost || 3;
  const maxSize = config.maxPhotoBytes || config.maxPhotoSizeBytes || 2_000_000;
  const allowedTypes = config.allowedImageTypes || config.allowedImageContentTypes || ["image/jpeg", "image/png", "image/webp"];

  if (existingCount + files.length > maxFiles) {
    throw new Error(`Upload up to ${maxFiles} photos only.`);
  }

  return Promise.all(files.map(async (file) => {
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Photos must be JPG, PNG, or WebP.");
    }
    if (file.size > maxSize) {
      throw new Error("Each photo must be 2 MB or smaller.");
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Photo could not be read."));
      reader.readAsDataURL(file);
    });
    const [, base64 = ""] = dataUrl.split(",");
    return {
      base64,
      contentType: file.type,
      fileName: file.name,
      previewUrl: dataUrl
    };
  }));
}

async function addCommunityPhotos(fileList) {
  const photos = await readCommunityPhotos(fileList, communityState.photoUploads.length);
  communityState.photoUploads = [...communityState.photoUploads, ...photos];
}

async function handleCommunityPhotoChange(event) {
  const input = event.currentTarget;
  const message = getCommunityMessage();
  if (!requireCommunityLogin()) {
    input.value = "";
    return;
  }

  try {
    await addCommunityPhotos(input.files);
    input.value = "";
    renderCommunityPhotoPreviews();
    updateCommunityComposerState();
    setMessage(message, "");
  } catch (error) {
    input.value = "";
    renderCommunityPhotoPreviews();
    updateCommunityComposerState();
    setMessage(message, error.message || "Unable to read photos.", "error");
  }
}

async function handleCommunityPhotoDrop(event) {
  const message = getCommunityMessage();
  const composer = document.querySelector("[data-community-composer]");
  event.preventDefault();
  composer?.classList.remove("is-dragging");

  if (!requireCommunityLogin()) {
    return;
  }

  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) {
    return;
  }

  try {
    setCommunityComposerActive(true);
    await addCommunityPhotos(files);
    renderCommunityPhotoPreviews();
    updateCommunityComposerState();
    setMessage(message, "");
  } catch (error) {
    renderCommunityPhotoPreviews();
    updateCommunityComposerState();
    setMessage(message, error.message || "Unable to read photos.", "error");
  }
}

function renderCommunityPhotoPreviews() {
  const container = document.querySelector("[data-community-photo-previews]");
  if (!container) {
    return;
  }

  container.replaceChildren();
  communityState.photoUploads.forEach((photo, index) => {
    const item = document.createElement("div");
    item.className = "community-photo-preview";
    const image = document.createElement("img");
    image.src = photo.previewUrl;
    image.alt = photo.fileName || `Selected photo ${index + 1}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "x";
    remove.setAttribute("aria-label", `Remove ${photo.fileName || `photo ${index + 1}`}`);
    remove.addEventListener("click", () => removeCommunityPhoto(index));
    item.append(image, remove);
    container.append(item);
  });
}

function removeCommunityPhoto(index) {
  communityState.photoUploads = communityState.photoUploads.filter((_, itemIndex) => itemIndex !== index);
  const input = document.querySelector("[data-community-composer] input[type='file']");
  if (input) {
    input.value = "";
  }
  renderCommunityPhotoPreviews();
  updateCommunityComposerState();
}

function resetCommunityComposerState() {
  communityState.photoUploads = [];
  communityState.selectedCategorySlugs = [];
  renderCommunityPhotoPreviews();
  renderCommunityComposerCategories();
  const composer = document.querySelector("[data-community-composer]");
  composer?.classList.remove("is-composing", "has-draft");
}

function updateCommunityComposerState() {
  const composer = document.querySelector("[data-community-composer]");
  const textarea = composer?.querySelector("textarea");
  if (!composer || !textarea) {
    return;
  }

  const hasDraft = Boolean(textarea.value.trim()) ||
    communityState.photoUploads.length > 0 ||
    communityState.selectedCategorySlugs.length > 0;
  composer.classList.toggle("has-draft", hasDraft);
}

function setCommunityComposerActive(active) {
  const composer = document.querySelector("[data-community-composer]");
  if (!composer) {
    return;
  }
  composer.classList.toggle("is-composing", active);
}

function formatCommunityTime(value) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatCommunityDateTime(value) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en-PH", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function bindCommunityUi() {
  document.querySelector("[data-community-composer]")?.addEventListener("submit", submitCommunityPost);
  document.querySelector("[data-community-start]")?.addEventListener("click", () => {
    if (!requireCommunityLogin()) {
      return;
    }
    document.querySelector("[data-community-composer] textarea")?.focus();
  });
  document.querySelector("[data-community-login]")?.addEventListener("click", openCommunityLoginForm);
  document.querySelector("[data-community-login-form]")?.addEventListener("submit", loginCustomer);
  document.querySelector("[data-community-register]")?.addEventListener("click", openRegisterForm);
  document.querySelector("[data-community-prompt-close]")?.addEventListener("click", hideCommunityAuthPrompt);
  document.querySelector("[data-community-prompt-login]")?.addEventListener("click", () => {
    hideCommunityAuthPrompt();
    openCommunityLoginForm();
  });
  document.querySelector("[data-community-prompt-register]")?.addEventListener("click", () => {
    hideCommunityAuthPrompt();
    openRegisterForm();
  });
  document.querySelector("[data-community-composer] textarea")?.addEventListener("focus", () => {
    requireCommunityLogin();
    setCommunityComposerActive(true);
  });
  const communityComposer = document.querySelector("[data-community-composer]");
  document.querySelector("[data-community-composer] textarea")?.addEventListener("input", updateCommunityComposerState);
  communityComposer?.addEventListener("dragover", (event) => {
    event.preventDefault();
    communityComposer.classList.add("is-dragging");
  });
  communityComposer?.addEventListener("dragleave", (event) => {
    if (!communityComposer.contains(event.relatedTarget)) {
      communityComposer.classList.remove("is-dragging");
    }
  });
  communityComposer?.addEventListener("drop", handleCommunityPhotoDrop);
  communityComposer?.addEventListener("focusout", (event) => {
    const form = event.currentTarget;
    window.setTimeout(() => {
      if (!form.contains(document.activeElement)) {
        setCommunityComposerActive(false);
        updateCommunityComposerState();
      }
    }, 0);
  });
  document.querySelector("[data-community-composer] input[type='file']")?.addEventListener("click", (event) => {
    if (!customerState.account) {
      event.preventDefault();
      showCommunityAuthPrompt();
    }
  });
  document.querySelector("[data-community-composer] input[type='file']")?.addEventListener("change", handleCommunityPhotoChange);
  document.querySelector("[data-community-search]")?.addEventListener("input", (event) => {
    communityState.search = event.target.value.trim();
    window.clearTimeout(communityState.searchTimer);
    communityState.searchTimer = window.setTimeout(() => loadCommunityDiscussions(true), 300);
  });
  document.querySelector("[data-community-category]")?.addEventListener("change", (event) => {
    communityState.selectedCategory = event.target.value;
    loadCommunityDiscussions(true);
  });
  document.querySelector("[data-community-thread-close]")?.addEventListener("click", closeCommunityThreadModal);
  document.querySelector("[data-community-thread-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeCommunityThreadModal();
    }
  });
  document.querySelector("[data-community-photo-close]")?.addEventListener("click", closeCommunityPhotoModal);
  document.querySelector("[data-community-photo-prev]")?.addEventListener("click", () => changeCommunityPhotoModal(-1));
  document.querySelector("[data-community-photo-next]")?.addEventListener("click", () => changeCommunityPhotoModal(1));
  document.querySelector("[data-community-photo-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeCommunityPhotoModal();
    }
  });
  document.querySelector("[data-community-edit-form]")?.addEventListener("submit", submitCommunityPostEdit);
  document.querySelector("[data-community-edit-form] textarea")?.addEventListener("input", () => {
    hideCommunityEditCloseConfirm();
    updateCommunityEditSaveState();
  });
  document.querySelector("[data-community-edit-close]")?.addEventListener("click", requestCloseCommunityEditModal);
  document.querySelector("[data-community-edit-cancel]")?.addEventListener("click", requestCloseCommunityEditModal);
  document.querySelector("[data-community-edit-confirm-save]")?.addEventListener("click", () => saveCommunityPostEdit({ closeAfterSave: true }));
  document.querySelector("[data-community-edit-confirm-discard]")?.addEventListener("click", closeCommunityEditModal);
  document.querySelector("[data-community-edit-confirm-keep]")?.addEventListener("click", hideCommunityEditCloseConfirm);
  document.querySelector("[data-community-edit-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      requestCloseCommunityEditModal();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".community-post-menu")) {
      closeCommunityPostMenus();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    closeCommunityPostMenus();
    if (!document.querySelector("[data-community-photo-modal]")?.hidden) {
      closeCommunityPhotoModal();
    } else if (!document.querySelector("[data-community-edit-modal]")?.hidden) {
      requestCloseCommunityEditModal();
    } else if (!document.querySelector("[data-community-thread-modal]")?.hidden) {
      closeCommunityThreadModal();
    }
  });
  document.querySelectorAll("[data-community-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openCommunityPage(true);
    });
  });
  window.addEventListener("popstate", () => {
    if (window.location.pathname === "/community") {
      openCommunityPage(false);
    } else {
      returnToHome();
    }
  });
}

function bindCatalogUi() {
  document.querySelector(".logo")?.addEventListener("click", (event) => {
    if (event.currentTarget.getAttribute("href") !== "#top") {
      return;
    }
    event.preventDefault();
    returnToHome();
  });

  document.querySelectorAll("[data-category-link], [data-category-nav]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      openCategoryCatalog(element.dataset.categoryLink || element.dataset.categoryNav);
    });
  });

  document.querySelectorAll("[data-category-card]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        return;
      }
      openCategoryCatalog(card.dataset.categoryCard);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCategoryCatalog(card.dataset.categoryCard);
      }
    });
  });

  document.querySelectorAll("[data-home-product-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      setCatalogMode(false);
      showProfileMode(false);
      showCommunityMode(false);
      loadHomeProductItems(button.dataset.homeProductFilter);
    });
  });

  document.querySelector("[data-sort-select]")?.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderCatalog();
  });
}

const customerState = {
  account: null,
  profile: null,
  mode: "register",
  profileImage: null
};

function getCustomerLoginForm() {
  return document.querySelector("[data-customer-login-form]");
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

function setMessage(element, message, type = "") {
  if (!element) {
    return;
  }
  element.textContent = message || "";
  element.classList.toggle("is-error", type === "error");
  element.classList.toggle("is-success", type === "success");
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
  const hometown = document.querySelector("[data-account-hometown]");
  const riderTypes = document.querySelector("[data-account-rider-types]");
  const isLoggedIn = Boolean(customerState.account);

  if (loginForm) {
    loginForm.hidden = isLoggedIn;
  }
  if (sessionPanel) {
    sessionPanel.hidden = !isLoggedIn;
  }
  setAccountMenuOpen(false);
  renderAvatar(document.querySelector("[data-account-avatar]"));
  renderAvatar(document.querySelector("[data-account-menu-avatar]"));
  if (greeting && customerState.account) {
    greeting.textContent = customerState.account.username;
  }
  if (email) {
    email.textContent = customerState.profile?.email || customerState.account?.email || "Email not set";
  }
  if (hometown) {
    hometown.textContent = customerState.profile?.hometown || "Not set";
  }
  if (riderTypes) {
    riderTypes.textContent = customerState.profile?.riderTypes?.length
      ? customerState.profile.riderTypes.join(", ")
      : "Not set";
  }
  updateCommunityAuthState();
  if (communityState.posts.length > 0) {
    renderCommunityPosts();
    refreshCommunityThreadModal();
  }
}

function setPasswordFieldsVisible(visible) {
  const passwordFields = document.querySelector("[data-password-fields]");
  const profileForm = getProfileForm();
  if (passwordFields) {
    passwordFields.hidden = !visible;
  }
  if (profileForm) {
    profileForm.elements.password.required = visible;
    profileForm.elements.confirmPassword.required = visible;
  }
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

  form.elements.username.value = profile?.username || "";
  form.elements.email.value = profile?.email || "";
  form.elements.hometown.value = profile?.hometown || "";
  form.elements.birthday.value = profile?.birthday || "";
  form.elements.password.value = "";
  form.elements.confirmPassword.value = "";
  form.elements.marketingConsent.checked = false;
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
    title.textContent = "Create your SarapMagBike profile";
  }
  if (eyebrow) {
    eyebrow.textContent = "Customer registration";
  }
  if (submit) {
    submit.textContent = "Create Profile";
  }
  if (changeButton) {
    changeButton.hidden = true;
  }
  if (form) {
    form.reset();
    form.elements.username.disabled = false;
  }
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
    form.elements.username.disabled = true;
  }
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
      username: form.elements.username.value.trim(),
      password: form.elements.password.value,
      confirmPassword: form.elements.confirmPassword.value,
      email: form.elements.email.value.trim(),
      hometown: form.elements.hometown.value.trim(),
      birthday: form.elements.birthday.value || null,
      riderTypes: getSelectedRiderTypes(form),
      profileImageBase64: image?.base64 || null,
      profileImageContentType: image?.contentType || null,
      marketingConsent: form.elements.marketingConsent.checked,
      website: form.elements.website.value
    };

    if (!payload.email || !form.elements.email.checkValidity()) {
      throw new Error("Enter a valid email address.");
    }
    if (customerState.mode === "register" && payload.password !== payload.confirmPassword) {
      throw new Error("Password and confirm password must match.");
    }

    if (customerState.mode === "register") {
      customerState.account = await apiRequest("/api/public/customer-account/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      updateCustomerHeader();
      setMessage(message, "Profile created. You are now logged in.", "success");
      await openEditProfileForm();
      return;
    }

    const profile = await apiRequest("/api/public/customer-account/profile", {
      method: "PUT",
      body: JSON.stringify({
        email: payload.email,
        hometown: payload.hometown,
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
        website: form.elements.website.value
      })
    });
    form.reset();
    updateCustomerHeader();
    setMessage(message, "Logged in.", "success");
    if (wasInCommunity) {
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

async function restoreCustomerSession() {
  try {
    customerState.account = await apiRequest("/api/public/customer-account/session");
  } catch (error) {
    customerState.account = null;
  }
  updateCustomerHeader();
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

function bindCustomerAccountUi() {
  getCustomerLoginForm()?.addEventListener("submit", loginCustomer);
  document.querySelectorAll("[data-open-register]").forEach((button) => {
    button.addEventListener("click", openRegisterForm);
  });
  document.querySelectorAll("[data-open-profile]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      if (customerState.account) {
        openEditProfileForm();
        return;
      }
      openRegisterForm();
    });
  });
  document.querySelector("[data-account-menu-toggle]")?.addEventListener("click", toggleAccountMenu);
  document.querySelector("[data-edit-profile]")?.addEventListener("click", openEditProfileForm);
  document.querySelector("[data-logout]")?.addEventListener("click", logoutCustomer);
  document.querySelector("[data-close-profile]")?.addEventListener("click", () => showProfileMode(false));
  document.addEventListener("click", (event) => {
    const sessionPanel = getCustomerSessionPanel();
    if (sessionPanel && !sessionPanel.contains(event.target)) {
      setAccountMenuOpen(false);
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
}

async function startCatalog() {
  if (await enforcePublicWebsiteMode()) {
    return;
  }

  bindScrambleLabels();
  renderCategoryNav();
  bindCustomerAccountUi();
  bindCatalogUi();
  bindServiceFilters();
  bindCommunityUi();
  loadHomeProductItems();
  if (document.body.classList.contains("is-coming-soon-page") && document.querySelector("[data-community-view]")) {
    updateCommunityAuthState();
    loadCommunityDiscussions();
  }
  if (window.location.pathname === "/community" || window.location.hash === "#community") {
    openCommunityPage(false);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startCatalog);
} else {
  startCatalog();
}
