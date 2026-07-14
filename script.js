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

const state = {
  activeCategory: null,
  activeSubcategory: "All",
  categoryGroups: [],
  homeProductList: "new",
  itemDisplayOrder: new Map(),
  items: [],
  productSearchEndpointAvailable: null,
  sort: "featured"
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

const eventsState = {
  activeEvent: null,
  events: [],
  isLoading: false,
  search: "",
  searchTimer: null,
  selectedStatus: "public",
  selectedType: "all"
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

function getItemIdentifier(item) {
  return item.productId
    ?? item.id
    ?? item.itemId
    ?? item.inventoryItemId
    ?? item.catalogItemId
    ?? item.sku
    ?? item.itemCode
    ?? item.barcode
    ?? slugify(item.itemDescription || item.name || "product");
}

function getItemSku(item) {
  return item.sku || item.itemCode || item.barcode || "";
}

function getItemName(item) {
  return item.itemDescription || item.name || item.productName || "Web catalog item";
}

function getProductDetailUrl(item) {
  const params = new URLSearchParams();
  const identifier = getItemIdentifier(item);
  if (identifier) {
    params.set("id", String(identifier));
  }
  const slug = slugify(getItemName(item));
  if (slug) {
    params.set("slug", slug);
  }
  return `product.html?${params.toString()}`;
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
    let errorBody = null;
    try {
      errorBody = await response.json();
      message = errorBody.message || message;
    } catch {
      // Keep the generic status message when the API has no JSON error body.
    }
    const error = new Error(message);
    error.status = response.status;
    error.details = errorBody;
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
  photo.dataset.initial = getItemName(item).trim().slice(0, 1).toUpperCase();

  if (imageUrl) {
    photo.classList.add("has-image");
    const image = document.createElement("img");
    image.className = "product-photo-primary";
    image.alt = getItemName(item);
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
  card.className = "product-card is-clickable";
  card.tabIndex = 0;
  const imageUrls = getProductImageUrls(item);
  const productName = getItemName(item);
  const detailUrl = getProductDetailUrl(item);

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
  action.href = detailUrl;
  action.textContent = "View Details";
  action.className = availabilityLabel === "OUT OF STOCK" ? "is-out-of-stock" : "is-available";
  action.setAttribute("aria-label", `View details for ${productName}`);

  card.append(
    renderProductPhoto(item),
    createTextElement("h3", productName),
    createTextElement("p", detail),
    renderPrice(item),
    action
  );

  card.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) {
      return;
    }
    window.location.href = detailUrl;
  });

  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.target.closest("a, button")) {
      return;
    }
    window.location.href = detailUrl;
  });

  if (imageUrls.length > 1) {
    card.classList.add("has-image-gallery");
    card.setAttribute("aria-label", `${productName} image gallery preview`);
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
  assignRandomItemDisplayOrder(state.items);
  state.categoryGroups = buildCategoryGroups(state.items);
  renderCategoryNav();
  return state.items;
}

function assignRandomItemDisplayOrder(items) {
  const shuffledItems = [...(items || [])];
  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[randomIndex]] = [shuffledItems[randomIndex], shuffledItems[index]];
  }

  state.itemDisplayOrder = new Map(
    shuffledItems.map((item, index) => [String(getItemIdentifier(item)), index])
  );
}

function getRandomItemDisplayRank(item) {
  return state.itemDisplayOrder.get(String(getItemIdentifier(item))) ?? Number.MAX_SAFE_INTEGER;
}

function getArrayPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  if (Array.isArray(payload?.results)) {
    return payload.results;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
}

function getProductSearchStatus(item) {
  const rawStatus = normalizeText(item.webCatalogStatus || item.catalogStatus || item.publicStatus || item.status);
  const displayValue = item.displayOnWeb
    ?? item.displayedOnWeb
    ?? item.isDisplayedOnWeb
    ?? item.isDisplayOnWeb
    ?? item.isPublished
    ?? item.isPublic
    ?? item.isOnWebCatalog
    ?? item.isInWebCatalog
    ?? item.showOnWebsite
    ?? item.isWebCatalogVisible;
  if (
    displayValue === false
    || rawStatus.includes("stock only")
    || rawStatus.includes("not displayed")
    || rawStatus.includes("hidden")
    || rawStatus.includes("not on web")
  ) {
    return "stock-only";
  }

  return "web";
}

function getProductSearchPrice(item) {
  return getProductPrice(item)
    || Number(item.srp)
    || Number(item.retailPrice)
    || Number(item.price)
    || Number(item.unitPrice)
    || 0;
}

function getProductSearchCategoryText(item) {
  return [
    getFieldValue(item, ["brand", "brandName"]),
    getItemCategoryGroup(item),
    getItemWebCategory(item),
    getFieldValue(item, ["category", "categoryName"])
  ].filter(Boolean).join(" / ");
}

function productMatchesSearchQuery(item, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return true;
  }

  return normalizeText([
    getItemName(item),
    getItemSku(item),
    getFieldValue(item, ["brand", "brandName"]),
    getItemCategoryGroup(item),
    getItemWebCategory(item),
    getFieldValue(item, ["category", "categoryName"])
  ].filter(Boolean).join(" ")).includes(normalizedQuery);
}

async function searchInventoryProducts(query) {
  const params = new URLSearchParams();
  params.set("branch", "Quezon City");
  params.set("search", query);

  if (state.productSearchEndpointAvailable !== false) {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/public/product-search?${params.toString()}`);
      if (response.ok) {
        state.productSearchEndpointAvailable = true;
        return {
          items: getArrayPayload(await response.json()),
          source: "inventory"
        };
      }
      if (response.status !== 404 && response.status !== 405) {
        throw new Error(`Request failed with ${response.status}`);
      }
      state.productSearchEndpointAvailable = false;
    } catch (error) {
      if (state.productSearchEndpointAvailable === true) {
        throw error;
      }
      state.productSearchEndpointAvailable = false;
    }
  }

  const items = await loadWebItems();
  return {
    items: items.filter((item) => isPublicProduct(item) && productMatchesSearchQuery(item, query)),
    source: "web"
  };
}

function ensureProductSearchModal() {
  let modal = document.querySelector("[data-product-search-modal]");
  if (modal) {
    return modal;
  }

  modal = document.createElement("div");
  modal.className = "product-search-modal";
  modal.dataset.productSearchModal = "";
  modal.hidden = true;
  modal.innerHTML = `
    <section role="dialog" aria-modal="true" aria-labelledby="product-search-title">
      <header class="product-search-head">
        <div>
          <span>Quezon City inventory</span>
          <h2 id="product-search-title">Search Products</h2>
          <p data-product-search-summary>Type a brand, model, SKU, category, or barcode.</p>
        </div>
        <button type="button" data-product-search-close aria-label="Close product search">Close</button>
      </header>
      <div class="product-search-body">
        <form class="product-search-form" data-product-search-form>
          <input type="search" data-product-search-input aria-label="Search inventory products" placeholder="Search bikes, parts, service">
          <button type="submit">Search</button>
        </form>
        <p class="product-search-note" data-product-search-note></p>
        <div class="product-search-results" data-product-search-results></div>
      </div>
    </section>
  `;
  document.body.append(modal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-product-search-close]")) {
      closeProductSearchModal();
    }
  });

  modal.querySelector("[data-product-search-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    runProductSearch(modal.querySelector("[data-product-search-input]")?.value || "");
  });

  let searchTimer = null;
  modal.querySelector("[data-product-search-input]")?.addEventListener("input", (event) => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => runProductSearch(event.target.value), 220);
  });

  return modal;
}

function getProductSearchPageUrl(query = "") {
  const params = new URLSearchParams();
  const trimmedQuery = String(query || "").trim();
  if (trimmedQuery) {
    params.set("search", trimmedQuery);
  }
  return `search.html${params.toString() ? `?${params.toString()}` : ""}`;
}

function submitProductSearch(query = "") {
  window.location.href = getProductSearchPageUrl(query);
}

function closeProductSearchModal() {
  const modal = document.querySelector("[data-product-search-modal]");
  if (!modal) {
    return;
  }
  modal.hidden = true;
  document.body.classList.remove("has-product-search-modal");
}

function setProductSearchState(title, detail) {
  const modal = ensureProductSearchModal();
  modal.querySelector("[data-product-search-summary]").textContent = title;
  const results = modal.querySelector("[data-product-search-results]");
  results.replaceChildren();
  const stateCard = document.createElement("div");
  stateCard.className = "product-search-state";
  stateCard.append(
    createTextElement("strong", title),
    createTextElement("p", detail)
  );
  results.append(stateCard);
}

function renderProductSearchThumbnail(item) {
  const thumbnail = document.createElement("span");
  thumbnail.className = "product-search-thumb";
  const imageUrl = getProductImageUrls(item)[0];
  if (imageUrl) {
    const image = document.createElement("img");
    image.alt = getItemName(item);
    image.loading = "lazy";
    image.src = imageUrl;
    thumbnail.append(image);
    return thumbnail;
  }

  thumbnail.textContent = getItemName(item).trim().slice(0, 1).toUpperCase() || "S";
  return thumbnail;
}

function renderProductSearchRow(item) {
  const status = getProductSearchStatus(item);
  const row = document.createElement("button");
  row.type = "button";
  row.className = "product-search-row";

  const detail = document.createElement("span");
  detail.className = "product-search-row-detail";
  detail.append(
    createTextElement("strong", getItemName(item)),
    createTextElement("span", getProductSearchCategoryText(item) || "SarapMagBike inventory")
  );

  const meta = document.createElement("span");
  meta.className = "product-search-row-meta";
  const price = getProductSearchPrice(item);
  meta.append(
    createTextElement("strong", price > 0 ? pesoFormatter.format(price) : "Ask for price"),
    createTextElement("span", status === "web" ? "Open details" : "Available in store")
  );
  if (status !== "web") {
    meta.classList.add("is-stock-only");
  }

  row.append(renderProductSearchThumbnail(item), detail, meta);
  row.addEventListener("click", () => handleProductSearchSelection(item));
  return row;
}

function renderProductSearchResults(items, source, query) {
  const modal = ensureProductSearchModal();
  const results = modal.querySelector("[data-product-search-results]");
  const summary = modal.querySelector("[data-product-search-summary]");
  const note = modal.querySelector("[data-product-search-note]");
  results.replaceChildren();

  summary.textContent = `${items.length} ${items.length === 1 ? "match" : "matches"} for "${query || "all products"}".`;
  note.textContent = source === "inventory"
    ? "Results come from SMBSystem public-safe inventory search. Exact stock can still change after in-store sales."
    : "Full inventory search needs SMBSystem API support. Showing published web catalog matches for now.";

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "product-search-state";
    empty.append(
      createTextElement("strong", "No matching products found"),
      createTextElement("p", "Try a brand, model, SKU, category, or message the shop for a manual stock check.")
    );
    results.append(empty);
    return;
  }

  items.slice(0, 30).forEach((item) => results.append(renderProductSearchRow(item)));
}

function getProductSearchPageRoot() {
  return document.querySelector("[data-product-search-page]");
}

function setProductSearchPageState(title, detail) {
  const root = getProductSearchPageRoot();
  if (!root) {
    return;
  }

  root.querySelector("[data-product-search-page-summary]").textContent = title;
  const results = root.querySelector("[data-product-search-page-results]");
  results.replaceChildren();
  const stateCard = document.createElement("div");
  stateCard.className = "product-search-state";
  stateCard.append(
    createTextElement("strong", title),
    createTextElement("p", detail)
  );
  results.append(stateCard);
}

function renderProductSearchPageResults(items, source, query) {
  const root = getProductSearchPageRoot();
  if (!root) {
    return;
  }

  const results = root.querySelector("[data-product-search-page-results]");
  const summary = root.querySelector("[data-product-search-page-summary]");
  const note = root.querySelector("[data-product-search-page-note]");
  results.replaceChildren();

  summary.textContent = `${items.length} ${items.length === 1 ? "match" : "matches"} for "${query}".`;
  note.textContent = source === "inventory"
    ? "Results come from SMBSystem public-safe inventory search. Exact stock can still change after in-store sales."
    : "Full inventory search needs SMBSystem API support. Showing published web catalog matches for now.";

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "product-search-state";
    empty.append(
      createTextElement("strong", "No matching products found"),
      createTextElement("p", "Try a brand, model, SKU, category, or message the shop for a manual stock check.")
    );
    results.append(empty);
    return;
  }

  items.slice(0, 30).forEach((item) => results.append(renderProductSearchRow(item)));
}

async function loadProductSearchPage() {
  const root = getProductSearchPageRoot();
  if (!root) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const query = (params.get("search") || "").trim();
  const input = root.querySelector("[data-product-search-page-input]");
  if (input) {
    input.value = query;
  }

  if (query.length < 2) {
    setProductSearchPageState("Search Products", "Type at least 2 characters to search SarapMagBike inventory and web catalog items.");
    window.setTimeout(() => input?.focus(), 0);
    return;
  }

  setProductSearchPageState("Searching Products", "Checking SarapMagBike inventory matches for Quezon City.");

  try {
    const result = await searchInventoryProducts(query);
    renderProductSearchPageResults(result.items, result.source, query);
  } catch (error) {
    setProductSearchPageState("Search Unavailable", "SMBSystem public search is not reachable. Try again after the API is running.");
  }
}

function bindProductSearchPageUi() {
  const root = getProductSearchPageRoot();
  if (!root) {
    return;
  }

  root.querySelector("[data-product-search-page-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = root.querySelector("[data-product-search-page-input]");
    submitProductSearch(input?.value || "");
  });
}

async function runProductSearch(query) {
  const trimmedQuery = String(query || "").trim();
  setProductSearchState("Searching Products", "Checking SarapMagBike inventory matches for Quezon City.");

  try {
    const result = await searchInventoryProducts(trimmedQuery);
    renderProductSearchResults(result.items, result.source, trimmedQuery);
  } catch (error) {
    setProductSearchState("Search Unavailable", "SMBSystem public search is not reachable. Try again after the API is running.");
  }
}

function openProductSearchModal(query = "") {
  const modal = ensureProductSearchModal();
  const input = modal.querySelector("[data-product-search-input]");
  input.value = String(query || "").trim();
  modal.hidden = false;
  document.body.classList.add("has-product-search-modal");
  runProductSearch(input.value);
  window.setTimeout(() => input.focus(), 0);
}

function ensureProductStockModal() {
  let modal = document.querySelector("[data-product-stock-modal]");
  if (modal) {
    return modal;
  }

  modal = document.createElement("div");
  modal.className = "product-stock-modal";
  modal.dataset.productStockModal = "";
  modal.hidden = true;
  modal.innerHTML = `
    <section role="dialog" aria-modal="true" aria-labelledby="product-stock-title">
      <button type="button" class="product-stock-close" data-product-stock-close aria-label="Close">Close</button>
      <span>Stock check</span>
      <h2 id="product-stock-title" data-product-stock-title></h2>
      <p data-product-stock-copy></p>
      <strong data-product-stock-price></strong>
      <div class="product-stock-actions">
        <a href="https://www.facebook.com/sarapmagbikeshop" target="_blank" rel="noreferrer">Message Shop</a>
        <button type="button" data-product-stock-close>Back to Search</button>
      </div>
    </section>
  `;
  document.body.append(modal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-product-stock-close]")) {
      closeProductStockModal();
    }
  });
  return modal;
}

function openProductStockModal(item) {
  const modal = ensureProductStockModal();
  const productName = getItemName(item);
  const price = getProductSearchPrice(item);
  modal.querySelector("[data-product-stock-title]").textContent = "Product is available in shop";
  modal.querySelector("[data-product-stock-copy]").textContent = `${productName} is not available on the web catalog, but we have stock. Message SarapMagBike to confirm current availability before visiting.`;
  modal.querySelector("[data-product-stock-price]").textContent = price > 0 ? `SRP ${pesoFormatter.format(price)}` : "SRP: Ask staff";
  modal.hidden = false;
  document.body.classList.add("has-product-stock-modal");
}

function closeProductStockModal() {
  const modal = document.querySelector("[data-product-stock-modal]");
  if (!modal) {
    return;
  }
  modal.hidden = true;
  document.body.classList.remove("has-product-stock-modal");
}

function handleProductSearchSelection(item) {
  if (getProductSearchStatus(item) === "web") {
    window.location.href = getProductDetailUrl(item);
    return;
  }

  openProductStockModal(item);
}

function isProductSearchForm(form) {
  const input = form.querySelector("input[type='search']");
  if (!input || input.disabled) {
    return false;
  }
  const text = `${input.placeholder || ""} ${input.getAttribute("aria-label") || ""}`.toLowerCase();
  return text.includes("bike") || text.includes("part") || text.includes("service");
}

function bindProductSearchUi() {
  document.querySelectorAll(".search-form").forEach((form) => {
    if (!isProductSearchForm(form) || form.dataset.productSearchBound) {
      return;
    }
    form.dataset.productSearchBound = "true";
    const input = form.querySelector("input[type='search']");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitProductSearch(input.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }
      event.preventDefault();
      submitProductSearch(input.value);
    });
    form.querySelector("button")?.addEventListener("click", (event) => {
      event.preventDefault();
      submitProductSearch(input.value);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (!document.querySelector("[data-product-stock-modal]")?.hidden) {
      closeProductStockModal();
      return;
    }
    if (!document.querySelector("[data-product-search-modal]")?.hidden) {
      closeProductSearchModal();
    }
  });
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
    if (state.sort === "newest") {
      const newItemDelta = Number(Boolean(b.isNew)) - Number(Boolean(a.isNew));
      return newItemDelta || getRandomItemDisplayRank(a) - getRandomItemDisplayRank(b);
    }
    return getRandomItemDisplayRank(a) - getRandomItemDisplayRank(b);
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

function returnToHome({ updatePath = false } = {}) {
  setCatalogMode(false);
  showCommunityMode(false);
  state.activeCategory = null;
  state.activeSubcategory = "All";
  updateActiveCategoryNav();
  loadHomeProductItems(state.homeProductList);
  showProfileMode(false);
  if (updatePath && window.location.pathname !== "/services.html") {
    window.history.replaceState({ view: "home" }, "", window.location.pathname || "index.html");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
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
  const isStandalonePage = isServicesPage || isAppointmentsPage || isEventsPage || isStoriesPage;
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
    { label: "Survey", href: "survey.html", action: () => window.location.href = "survey.html" },
    { label: "Contact", href: "#contact", action: () => isStandalonePage ? document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" }) : goToHomeTarget("contact") }
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
    createTextElement("p", "SarapMagBike Quezon City Workshop", "product-detail-eyebrow"),
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
  [["Category", category], ["Service code", getItemSku(item) || "Not specified"], ["Labor price", renderPrice(item).textContent], ["Branch", "Quezon City"]].forEach(([label, value]) => {
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

function getRequestedCatalogKey() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("catalog") || "").trim();
}

function updateCatalogUrl(categoryKey) {
  if (!document.querySelector("[data-web-items-grid]")) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  params.set("catalog", categoryKey);
  const query = params.toString();
  window.history.pushState({ view: "catalog", category: categoryKey }, "", `index.html${query ? `?${query}` : ""}#products`);
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

async function openCategoryCatalog(categoryKey, { updatePath = false } = {}) {
  state.activeSubcategory = "All";
  setCatalogMode(true);
  setGridState("Loading Catalog", "Checking SMBSystem catalog items for Quezon City.");
  if (updatePath) {
    updateCatalogUrl(categoryKey);
  }

  try {
    await loadWebItems();
    const resolvedCategoryKey = resolveCategoryKey(categoryKey);
    if (!resolvedCategoryKey) {
      state.activeCategory = null;
      updateActiveCategoryNav();
      document.querySelector("[data-stock-note]").textContent = "Stocks and prices may change. Message us to confirm before visiting or ordering.";
      setGridState(`No ${getCatalogShortcutTitle(categoryKey)} Found`, "No publicly available products found for this category right now. Message us to check latest stock.");
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
    if (form.closest("[data-community-auth-prompt]")) {
      showCommunityAuthPrompt();
    }
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

function openCommunityCreateModal() {
  if (!requireCommunityLogin()) {
    return;
  }
  const modal = document.querySelector("[data-community-create-modal]");
  const textarea = document.querySelector("[data-community-composer] textarea");
  if (!modal) {
    textarea?.focus();
    return;
  }
  modal.hidden = false;
  setCommunityComposerActive(true);
  window.setTimeout(() => textarea?.focus(), 0);
}

function closeCommunityCreateModal({ resetDraft = false } = {}) {
  const modal = document.querySelector("[data-community-create-modal]");
  if (!modal) {
    return;
  }
  modal.hidden = true;
  setCommunityComposerActive(false);
  if (resetDraft) {
    document.querySelector("[data-community-composer]")?.reset();
    resetCommunityComposerState();
    setMessage(getCommunityMessage(), "");
  } else {
    updateCommunityComposerState();
  }
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

function isGeneralCommunityCategory(category) {
  return GENERAL_CATEGORY_SLUGS.includes(String(category?.slug || "").toLowerCase());
}

function getDefaultCommunityCategorySlug() {
  return communityState.categories.find(isGeneralCommunityCategory)?.slug || "";
}

function getCommunityCategoriesForUi() {
  const general = communityState.categories.find(isGeneralCommunityCategory);
  const normalizedGeneral = general ? { ...general, name: GENERAL_CATEGORY_LABEL } : null;
  const others = communityState.categories.filter((category) => !isGeneralCommunityCategory(category));
  return normalizedGeneral ? [normalizedGeneral, ...others] : others;
}

function ensureDefaultCommunityComposerCategory() {
  const defaultSlug = getDefaultCommunityCategorySlug();
  if (defaultSlug && communityState.selectedCategorySlugs.length === 0) {
    communityState.selectedCategorySlugs = [defaultSlug];
  }
}

function renderCommunityCategories() {
  const select = document.querySelector("[data-community-category]");
  if (!select) {
    return;
  }

  const currentValue = select.value || "all";
  select.replaceChildren(new Option("All categories", "all"));
  getCommunityCategoriesForUi().forEach((category) => {
    select.append(new Option(category.name, category.slug));
  });
  select.value = communityState.categories.some((category) => category.slug === currentValue) ? currentValue : "all";
  communityState.selectedCategorySlugs = communityState.selectedCategorySlugs.filter((slug) =>
    communityState.categories.some((category) => category.slug === slug)
  );
  ensureDefaultCommunityComposerCategory();
  renderCommunityComposerCategories();
}

function renderCommunityComposerCategories() {
  const container = document.querySelector("[data-community-composer-categories]");
  if (!container) {
    return;
  }

  container.replaceChildren();
  getCommunityCategoriesForUi().forEach((category) => {
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
  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input, textarea, select, label, .community-post-menu, .community-media-grid, .community-post-actions")) {
      return;
    }
    openCommunityThreadModal(post.id);
  });

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

  const preview = renderCommunityReplyPreview(post);
  if (preview) {
    card.append(preview);
  }

  return card;
}

function getCommunityPreviewComments(post) {
  return [...(Array.isArray(post?.comments) ? post.comments : [])]
    .sort((first, second) => (Date.parse(first?.createdAt || "") || 0) - (Date.parse(second?.createdAt || "") || 0))
    .slice(0, 3);
}

function renderCommunityReplyPreview(post) {
  const previewComments = getCommunityPreviewComments(post);
  if (previewComments.length === 0) {
    return null;
  }

  const preview = document.createElement("div");
  preview.className = "community-reply-preview";
  preview.setAttribute("aria-label", "First discussion replies");

  previewComments.forEach((comment) => {
    preview.append(renderCommunityCommentPreview(comment));
  });

  if (getCommunityReplyCount(post) > previewComments.length) {
    const moreLink = document.createElement("button");
    moreLink.type = "button";
    moreLink.className = "community-more-replies";
    moreLink.textContent = "More....";
    moreLink.setAttribute("aria-label", `Show all ${getCommunityReplyCount(post)} replies`);
    moreLink.addEventListener("click", () => openCommunityThreadModal(post.id));
    preview.append(moreLink);
  }

  return preview;
}

function renderCommunityCommentPreview(comment) {
  const item = document.createElement("article");
  item.className = `community-comment community-comment-preview${comment.isStaffReply ? " is-staff" : ""}`;
  const authorName = comment.authorName || comment.author?.displayName || "SarapMagBike rider";
  const avatar = renderCommunityAvatar(authorName, comment.authorAvatarUrl);
  const content = document.createElement("div");
  content.className = "community-comment-content";
  const heading = document.createElement("div");
  heading.className = "community-comment-heading";
  heading.append(createTextElement("strong", authorName));
  content.append(heading, createTextElement("p", comment.body));
  item.append(avatar, content);
  return item;
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
    closeCommunityCreateModal();
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
  ensureDefaultCommunityComposerCategory();
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
  if (!document.querySelector("[data-community-view]")) {
    return;
  }

  document.querySelector("[data-community-composer]")?.addEventListener("submit", submitCommunityPost);
  document.querySelector("[data-community-composer-launcher]")?.addEventListener("click", openCommunityCreateModal);
  document.querySelector("[data-community-create-close]")?.addEventListener("click", () => closeCommunityCreateModal());
  document.querySelector("[data-community-create-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeCommunityCreateModal();
    }
  });
  document.querySelector("[data-community-start]")?.addEventListener("click", () => {
    if (!requireCommunityLogin()) {
      return;
    }
    openCommunityCreateModal();
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
    } else if (!document.querySelector("[data-community-create-modal]")?.hidden) {
      closeCommunityCreateModal();
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
    returnToHome({ updatePath: true });
  });

  document.querySelectorAll("[data-category-link], [data-category-nav]").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (element.dataset.categoryLink && element.getAttribute("href")) {
        return;
      }
      event.preventDefault();
      openCategoryCatalog(element.dataset.categoryLink || element.dataset.categoryNav, { updatePath: true });
    });
  });

  document.querySelectorAll("[data-category-card]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        return;
      }
      openCategoryTilePage(card);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCategoryTilePage(card);
      }
    });
  });

  document.querySelectorAll("[data-service-card]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        return;
      }
      openServicesPage();
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openServicesPage();
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

function setupFeatureTileBelt() {
  const scroller = document.querySelector(".feature-tiles");
  const track = document.querySelector("[data-feature-tile-track]");
  const group = document.querySelector("[data-feature-tile-group]");
  if (!scroller || !track || !group) {
    return;
  }

  if (!track.querySelector("[data-feature-tile-clone]")) {
    const clone = group.cloneNode(true);
    clone.removeAttribute("data-feature-tile-group");
    clone.setAttribute("data-feature-tile-clone", "");
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    clone.querySelectorAll("[tabindex]").forEach((element) => element.setAttribute("tabindex", "-1"));
    clone.querySelectorAll("a, button, input, select, textarea").forEach((element) => {
      element.setAttribute("tabindex", "-1");
    });

    clone.querySelectorAll("[data-category-link], [data-category-nav]").forEach((element) => {
      element.addEventListener("click", (event) => {
        if (element.dataset.categoryLink && element.getAttribute("href")) {
          return;
        }
        event.preventDefault();
        openCategoryCatalog(element.dataset.categoryLink || element.dataset.categoryNav, { updatePath: true });
      });
    });

    clone.querySelectorAll("[data-category-card]").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target instanceof HTMLAnchorElement) {
          return;
        }
        openCategoryTilePage(card);
      });
    });

    clone.querySelectorAll("[data-service-card]").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target instanceof HTMLAnchorElement) {
          return;
        }
        openServicesPage();
      });
    });

    track.append(clone);
  }

  setupFeatureTileScrollBelt(scroller, group);
}

function setupFeatureTileScrollBelt(scroller, group) {
  if (scroller.dataset.featureScrollBeltReady === "true") {
    return;
  }

  scroller.dataset.featureScrollBeltReady = "true";
  scroller.classList.add("is-scroll-belt");

  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let lastFrameTime = 0;
  let pauseUntil = 0;
  let isPointerDown = false;
  let isMouseDragging = false;
  let isAutoScrolling = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;
  let dragStartId = null;

  const getLoopWidth = () => group.getBoundingClientRect().width;

  const normalizeScrollPosition = () => {
    const loopWidth = getLoopWidth();
    if (!loopWidth) {
      return;
    }

    if (scroller.scrollLeft >= loopWidth) {
      scroller.scrollLeft -= loopWidth;
    } else if (scroller.scrollLeft < 0) {
      scroller.scrollLeft += loopWidth;
    }
  };

  const pauseAutoScroll = (duration = 1800) => {
    pauseUntil = performance.now() + duration;
  };

  scroller.addEventListener("pointerdown", (event) => {
    pauseAutoScroll(2600);
    if (event.pointerType !== "mouse") {
      return;
    }

    isPointerDown = true;
    dragStartX = event.clientX;
    dragStartScrollLeft = scroller.scrollLeft;
    dragStartId = event.pointerId;
  });

  scroller.addEventListener("pointermove", (event) => {
    if (!isPointerDown) {
      return;
    }

    if (!isMouseDragging) {
      if (Math.abs(event.clientX - dragStartX) > 6) {
        isMouseDragging = true;
        scroller.classList.add("is-dragging");
        if (dragStartId !== null) {
          scroller.setPointerCapture?.(dragStartId);
        }
      } else {
        return;
      }
    }

    event.preventDefault();
    scroller.scrollLeft = dragStartScrollLeft - (event.clientX - dragStartX);
    normalizeScrollPosition();
  });

  const stopMouseDrag = (event) => {
    if (!isPointerDown) {
      return;
    }

    const wasDragging = isMouseDragging;
    isPointerDown = false;
    isMouseDragging = false;
    scroller.classList.remove("is-dragging");
    if (wasDragging && dragStartId !== null) {
      try {
        scroller.releasePointerCapture?.(dragStartId);
      } catch (err) {
        // Ignore if pointer capture release fails
      }
    }
    dragStartId = null;
    pauseAutoScroll(1800);
  };

  scroller.addEventListener("pointerup", stopMouseDrag);
  scroller.addEventListener("pointercancel", stopMouseDrag);
  scroller.addEventListener("scroll", () => {
    if (isAutoScrolling) {
      return;
    }
    pauseAutoScroll(1200);
    window.requestAnimationFrame(normalizeScrollPosition);
  }, { passive: true });

  const moveBelt = (frameTime) => {
    const elapsed = lastFrameTime ? frameTime - lastFrameTime : 0;
    lastFrameTime = frameTime;

    if (
      mobileQuery.matches
      && !reducedMotionQuery.matches
      && !isMouseDragging
      && frameTime > pauseUntil
      && scroller.scrollWidth > scroller.clientWidth
    ) {
      isAutoScrolling = true;
      scroller.scrollLeft += elapsed * 0.018;
      normalizeScrollPosition();
      window.requestAnimationFrame(() => {
        isAutoScrolling = false;
      });
    }

    window.requestAnimationFrame(moveBelt);
  };

  window.requestAnimationFrame(moveBelt);
}

function isEventsPage() {
  return Boolean(document.querySelector("[data-events-view]"));
}

function getEventTypeLabel(value) {
  const labels = {
    ride: "Ride",
    workshop: "Workshop",
    get_together: "Get-together"
  };
  return labels[value] || "Event";
}

function getEventStatusLabel(value) {
  const labels = {
    published: "Published",
    open: "Open",
    full: "Full",
    closed: "Closed",
    completed: "Completed",
    cancelled: "Cancelled"
  };
  return labels[value] || "Event";
}

function getEventStatusClass(value) {
  if (value === "open" || value === "published") {
    return "open";
  }
  if (value === "full") {
    return "full";
  }
  if (value === "cancelled") {
    return "cancelled";
  }
  return "closed";
}

function formatEventDate(value) {
  if (!value) {
    return "Date TBA";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date TBA";
  }

  return date.toLocaleDateString("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatEventTime(value) {
  if (!value) {
    return "Time TBA";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Time TBA";
  }

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatEventDateTime(value) {
  if (!value) {
    return "TBA";
  }

  return `${formatEventDate(value)} | ${formatEventTime(value)}`;
}

function getEventPosterUrl(eventItem) {
  return normalizeApiUrl(eventItem?.posterImageUrl || eventItem?.posterUrl || eventItem?.imageUrl || "");
}

function getEventRegisteredCount(eventItem) {
  return Number(eventItem?.registeredCount ?? eventItem?.participantCount ?? eventItem?.participants?.filter((participant) => participant.status !== "cancelled").length ?? 0);
}

function getEventCapacityLabel(eventItem) {
  const registeredCount = getEventRegisteredCount(eventItem);
  const capacity = eventItem?.capacity;
  if (capacity === null || capacity === undefined || capacity === "") {
    return `${registeredCount} registered`;
  }
  return `${registeredCount} / ${capacity} slots`;
}

function getEventSlotsProgress(eventItem) {
  const registeredCount = Math.max(0, getEventRegisteredCount(eventItem));
  const capacity = Number(eventItem?.capacity);

  if (!Number.isFinite(capacity) || capacity <= 0) {
    return {
      label: `${registeredCount} slots taken`,
      percent: 0
    };
  }

  const displayCount = Math.min(registeredCount, capacity);
  return {
    label: `${displayCount} / ${capacity} slots taken`,
    percent: Math.min(100, Math.round((registeredCount / capacity) * 100))
  };
}

function createEventMetaItem(label, value, className = "") {
  const item = document.createElement("div");
  if (className) {
    item.className = className;
  }
  item.append(createTextElement("span", label), createTextElement("strong", value));
  return item;
}

function createEventSlotsProgress(eventItem) {
  const progress = getEventSlotsProgress(eventItem);
  const item = document.createElement("div");
  item.className = "event-meta-full event-slots-progress";
  item.append(createTextElement("span", "Slots"));

  const bar = document.createElement("div");
  bar.className = "event-slots-bar";
  bar.style.setProperty("--event-slots-percent", `${progress.percent}%`);
  const fill = document.createElement("span");
  fill.setAttribute("aria-hidden", "true");
  bar.append(fill, createTextElement("strong", progress.label));

  item.append(bar);
  return item;
}

function isEventRegistrationOpen(eventItem) {
  if (!eventItem) {
    return false;
  }

  if (eventItem.status !== "open" && eventItem.status !== "published") {
    return false;
  }

  const now = Date.now();
  if (eventItem.registrationOpensAt && new Date(eventItem.registrationOpensAt).getTime() > now) {
    return false;
  }
  if (eventItem.registrationClosesAt && new Date(eventItem.registrationClosesAt).getTime() < now) {
    return false;
  }

  const capacity = Number(eventItem.capacity);
  return !Number.isFinite(capacity) || capacity <= 0 || getEventRegisteredCount(eventItem) < capacity;
}

function getEventCurrentRegistration(eventItem) {
  if (eventItem?.currentRegistration) {
    return eventItem.currentRegistration;
  }

  const accountId = customerState.account?.id || customerState.profile?.id;
  if (!accountId || !Array.isArray(eventItem?.participants)) {
    return null;
  }

  return eventItem.participants.find((participant) =>
    (participant.publicCustomerAccountId || participant.customerAccountId || participant.accountId) === accountId &&
    participant.status !== "cancelled"
  ) || null;
}

function getEventParticipantAvatar(participant) {
  return normalizeApiUrl(participant.profilePictureUrl || participant.avatarUrl || participant.participantAvatarUrl || "");
}

function getEventParticipantName(participant) {
  return participant.displayName || participant.username || participant.participantName || "SMB Rider";
}

function getEventInitials(name) {
  return String(name || "SMB")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SMB";
}

function createEventAvatar(participant) {
  const name = getEventParticipantName(participant);
  const avatar = document.createElement("span");
  avatar.className = "event-avatar";
  const imageUrl = getEventParticipantAvatar(participant);
  if (imageUrl) {
    const image = document.createElement("img");
    image.alt = `${name} profile picture`;
    image.loading = "lazy";
    image.src = imageUrl;
    avatar.append(image);
  } else {
    avatar.textContent = getEventInitials(name);
  }
  return avatar;
}

function setEventsState(title, detail, actionLabel) {
  const list = document.querySelector("[data-events-list]");
  if (!list) {
    return;
  }

  const card = document.createElement("article");
  card.className = "events-state-card";
  card.append(
    createTextElement("h2", title),
    createTextElement("p", detail)
  );
  if (actionLabel) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = actionLabel;
    button.addEventListener("click", () => loadEventsPageEvents());
    card.append(button);
  }
  list.replaceChildren(card);
}

function buildEventsQuery() {
  const params = new URLSearchParams();
  params.set("branch", "Quezon City");
  if (eventsState.search) {
    params.set("search", eventsState.search);
  }
  if (eventsState.selectedType !== "all") {
    params.set("eventType", eventsState.selectedType);
  }
  if (eventsState.selectedStatus && eventsState.selectedStatus !== "public") {
    params.set("status", eventsState.selectedStatus);
  }
  return params.toString();
}

async function loadEventsPageEvents() {
  if (!isEventsPage() || eventsState.isLoading) {
    return;
  }

  eventsState.isLoading = true;
  setEventsState("Loading events", "Checking SMBSystem for public rides, workshops, and get-togethers.");

  try {
    const query = buildEventsQuery();
    const rows = await apiRequest(`/api/public/events${query ? `?${query}` : ""}`);
    eventsState.events = Array.isArray(rows) ? rows : [];
    renderEventsList();
    const selectedId = new URLSearchParams(window.location.search).get("event");
    if (selectedId) {
      await openEventDetail(selectedId, { updateUrl: false });
    }
  } catch (error) {
    const missingEndpoint = error.status === 404 || error.status === 405;
    setEventsState(
      missingEndpoint ? "Events API not ready" : "Events unavailable",
      missingEndpoint
        ? "SMBWeb2 is ready for /api/public/events, but SMBSystem still needs the public events API slice."
        : (error.message || "SMBSystem public events could not be loaded."),
      "Try Again"
    );
  } finally {
    eventsState.isLoading = false;
  }
}

function renderEventsList() {
  const list = document.querySelector("[data-events-list]");
  if (!list) {
    return;
  }

  if (eventsState.events.length === 0) {
    setEventsState("No events found", "There are no public SarapMagBike events matching the current filters.");
    return;
  }

  list.replaceChildren(...eventsState.events.map(renderEventCard));
}

function getEventCardSummary(eventItem) {
  const text = String(eventItem.summary || "Tap to view event details, participants, and registration status.").replace(/\s+/g, " ").trim();
  return text.length > 110 ? `${text.slice(0, 107).trim()}...` : text;
}

function renderEventCard(eventItem) {
  const card = document.createElement("article");
  card.className = "event-public-card";

  const poster = document.createElement("div");
  poster.className = "event-public-poster";
  poster.tabIndex = 0;
  poster.setAttribute("role", "button");
  poster.setAttribute("aria-label", `View details for ${eventItem.title || "this event"}`);
  poster.addEventListener("click", () => openEventDetail(eventItem.id));
  poster.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEventDetail(eventItem.id);
    }
  });
  const posterUrl = getEventPosterUrl(eventItem);
  if (posterUrl) {
    const image = document.createElement("img");
    image.alt = eventItem.title || "SarapMagBike event poster";
    image.loading = "lazy";
    image.src = posterUrl;
    poster.append(image);
  } else {
    poster.append(createTextElement("span", getEventTypeLabel(eventItem.eventType)));
  }
  poster.append(createTextElement("strong", getEventTypeLabel(eventItem.eventType), "event-type-badge"));

  const body = document.createElement("div");
  body.className = "event-public-card-body";
  const statusRow = document.createElement("div");
  statusRow.className = "event-status-row";
  statusRow.append(
    createTextElement("span", getEventStatusLabel(eventItem.status), `event-status ${getEventStatusClass(eventItem.status)}`),
    createTextElement("strong", eventItem.isPaid ? pesoFormatter.format(Number(eventItem.feeAmount || 0)) : "Free")
  );

  const title = createTextElement("h2", eventItem.title || "SarapMagBike Event");
  const summary = createTextElement("p", getEventCardSummary(eventItem), "event-card-summary");
  const meta = document.createElement("div");
  meta.className = "event-meta-grid";
  meta.append(
    createEventMetaItem("Date", formatEventDate(eventItem.assemblyAt)),
    createEventMetaItem("Assembly", formatEventTime(eventItem.assemblyAt)),
    createEventMetaItem("Meetup", eventItem.meetupPlace || "SarapMagBike Quezon City", "event-meta-full"),
    createEventSlotsProgress(eventItem)
  );

  const action = document.createElement("button");
  action.type = "button";
  action.textContent = isEventRegistrationOpen(eventItem) ? "View / Join Event" : "View Details";
  action.addEventListener("click", () => openEventDetail(eventItem.id));

  body.append(statusRow, title, summary, meta, action);
  card.append(poster, body);
  return card;
}

function showEventListView() {
  document.querySelector("[data-events-list-layout]")?.removeAttribute("hidden");
  document.querySelector("[data-events-toolbar]")?.removeAttribute("hidden");
  document.querySelector("[data-event-detail]")?.setAttribute("hidden", "");
  eventsState.activeEvent = null;
  window.history.pushState({ view: "events" }, "", "events.html");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function openEventDetail(eventId, { updateUrl = true } = {}) {
  const detail = document.querySelector("[data-event-detail]");
  const content = document.querySelector("[data-event-detail-content]");
  if (!detail || !content || !eventId) {
    return;
  }

  document.querySelector("[data-events-list-layout]")?.setAttribute("hidden", "");
  document.querySelector("[data-events-toolbar]")?.setAttribute("hidden", "");
  detail.hidden = false;
  content.replaceChildren(createEventDetailState("Loading event details", "Checking SMBSystem for the latest event information."));

  try {
    const eventItem = await apiRequest(`/api/public/events/${eventId}?branch=Quezon%20City`);
    eventsState.activeEvent = eventItem;
    renderEventDetail(eventItem);
    if (updateUrl) {
      window.history.pushState({ view: "event-detail", eventId }, "", `events.html?event=${encodeURIComponent(eventId)}`);
    }
  } catch (error) {
    content.replaceChildren(createEventDetailState("Event unavailable", error.message || "This event could not be loaded from SMBSystem."));
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function createEventDetailState(title, detail) {
  const card = document.createElement("article");
  card.className = "events-state-card";
  card.append(createTextElement("h2", title), createTextElement("p", detail));
  return card;
}

function sanitizeEventHtml(value) {
  const container = document.createElement("div");
  container.innerHTML = String(value || "");
  container.querySelectorAll("script").forEach((node) => node.remove());
  container.querySelectorAll("[href], [src]").forEach((node) => {
    ["href", "src"].forEach((attribute) => {
      if (/^\s*javascript:/i.test(node.getAttribute(attribute) || "")) {
        node.removeAttribute(attribute);
      }
    });
  });
  container.querySelectorAll("p, div").forEach((node) => {
    const content = (node.textContent || "").replace(/\u00a0/g, " ").trim();
    if (!content && !node.querySelector("img, video, iframe")) {
      node.remove();
    }
  });
  container.querySelectorAll("br + br").forEach((node) => node.remove());
  while (container.firstChild?.nodeName === "BR") {
    container.firstChild.remove();
  }
  return container.innerHTML;
}

function renderEventDetail(eventItem) {
  const content = document.querySelector("[data-event-detail-content]");
  if (!content) {
    return;
  }

  const shell = document.createElement("div");
  shell.className = "event-detail-shell";

  const main = document.createElement("article");
  main.className = "event-detail-main";
  const posterUrl = getEventPosterUrl(eventItem);
  const poster = document.createElement("div");
  poster.className = "event-detail-poster";
  if (posterUrl) {
    const image = document.createElement("img");
    image.alt = eventItem.title || "SarapMagBike event poster";
    image.src = posterUrl;
    poster.append(image);
  } else {
    poster.append(createTextElement("span", getEventTypeLabel(eventItem.eventType)));
  }

  const copy = document.createElement("div");
  copy.className = "event-detail-copy";
  const statusRow = document.createElement("div");
  statusRow.className = "event-status-row";
  statusRow.append(
    createTextElement("span", getEventStatusLabel(eventItem.status), `event-status ${getEventStatusClass(eventItem.status)}`),
    createTextElement("strong", eventItem.isPaid ? pesoFormatter.format(Number(eventItem.feeAmount || 0)) : "Free event")
  );
  const title = createTextElement("h1", eventItem.title || "SarapMagBike Event");
  const summary = createTextElement("p", eventItem.summary || "Full event details and registration are managed through SMBSystem.");
  const description = document.createElement("div");
  description.className = "event-description";
  description.innerHTML = sanitizeEventHtml(eventItem.descriptionHtml || eventItem.description || "");
  copy.append(statusRow, title, summary, description);
  main.append(poster, copy);

  const aside = document.createElement("aside");
  aside.className = "event-detail-side";
  aside.append(renderEventFacts(eventItem), renderEventParticipants(eventItem), renderEventActionPanel(eventItem));
  shell.append(main, aside);
  content.replaceChildren(shell);
}

function renderEventFacts(eventItem) {
  const panel = document.createElement("section");
  panel.className = "event-info-panel";
  panel.append(createTextElement("h2", "Event information"));
  const facts = document.createElement("div");
  facts.className = "event-facts";
  [
    ["Assembly", formatEventDateTime(eventItem.assemblyAt)],
    ["Starts", eventItem.startsAt ? formatEventDateTime(eventItem.startsAt) : "TBA"],
    ["Ends", eventItem.endsAt ? formatEventDateTime(eventItem.endsAt) : "TBA"],
    ["Meetup", eventItem.meetupPlace || "SarapMagBike Quezon City"],
    ["Slots", getEventCapacityLabel(eventItem)],
    ["Registration closes", eventItem.registrationClosesAt ? formatEventDateTime(eventItem.registrationClosesAt) : "Not set"]
  ].forEach(([label, value]) => {
    const fact = document.createElement("div");
    fact.append(createTextElement("span", label), createTextElement("strong", value));
    facts.append(fact);
  });
  panel.append(facts);
  if (eventItem.mapUrl) {
    const map = document.createElement("a");
    map.href = eventItem.mapUrl;
    map.target = "_blank";
    map.rel = "noreferrer";
    map.textContent = "Open Map";
    map.className = "event-panel-link";
    panel.append(map);
  }
  return panel;
}

function renderEventParticipants(eventItem) {
  const panel = document.createElement("section");
  panel.className = "event-info-panel";
  panel.append(createTextElement("h2", "Participants"));
  const participants = Array.isArray(eventItem.participants)
    ? eventItem.participants.filter((participant) => participant.status !== "cancelled")
    : [];
  const participantCount = eventItem.isPaid ? participants.length : (participants.length || getEventRegisteredCount(eventItem));
  panel.append(createTextElement("p", `${participantCount} ${eventItem.isPaid ? "confirmed" : "registered"} participant${participantCount === 1 ? "" : "s"}.`));

  if (eventItem.isPaid) {
    panel.append(createTextElement("p", "Only participants with confirmed proof of payment appear on this list. Check the status of your registration below.", "event-muted"));
  }

  if (participants.length === 0) {
    panel.append(createTextElement("p", eventItem.isPaid ? "Confirmed participants will appear here after staff reviews payment." : "Participant names will appear here after riders register.", "event-muted"));
    return panel;
  }

  const stack = document.createElement("div");
  stack.className = "event-avatar-stack";
  participants.slice(0, 5).forEach((participant) => stack.append(createEventAvatar(participant)));
  if (participants.length > 5) {
    const more = document.createElement("span");
    more.className = "event-avatar";
    more.textContent = `+${participants.length - 5}`;
    stack.append(more);
  }

  const list = document.createElement("ul");
  list.className = "event-participant-list";
  participants.slice(0, 8).forEach((participant) => {
    const item = document.createElement("li");
    const text = document.createElement("div");
    text.append(
      createTextElement("strong", getEventParticipantName(participant)),
      createTextElement("span", participant.status === "waitlisted" ? "Waitlisted" : "Registered")
    );
    item.append(createEventAvatar(participant), text);
    list.append(item);
  });

  panel.append(stack, list);
  return panel;
}

function renderEventActionPanel(eventItem) {
  const panel = document.createElement("section");
  panel.className = "event-info-panel event-action-panel";
  panel.append(createTextElement("h2", "Your registration"));

  const currentRegistration = getEventCurrentRegistration(eventItem);
  if (!customerState.account) {
    panel.append(createTextElement("p", "Log in or create a public customer profile to register for this event."));
    const actions = document.createElement("div");
    actions.className = "event-action-row";
    const login = document.createElement("button");
    login.type = "button";
    login.textContent = "Log in to Register";
    login.addEventListener("click", () => document.querySelector("[data-customer-login-form] input[name='username']")?.focus());
    const register = document.createElement("button");
    register.type = "button";
    register.textContent = "Create Account";
    register.addEventListener("click", openRegisterForm);
    actions.append(login, register);
    panel.append(actions);
    return panel;
  }

  if (currentRegistration) {
    panel.append(createTextElement("p", `You are ${currentRegistration.status === "waitlisted" ? "waitlisted" : "registered"} for this event.`));
    panel.append(renderEventRegistrationRecord(currentRegistration));
    const withdraw = document.createElement("button");
    withdraw.type = "button";
    withdraw.className = "event-danger-action";
    withdraw.textContent = "Withdraw Registration";
    withdraw.addEventListener("click", () => withdrawEventRegistration(eventItem.id));
    panel.append(withdraw);
    return panel;
  }

  if (!isEventRegistrationOpen(eventItem)) {
    panel.append(createTextElement("p", eventItem.status === "full" ? "This event is full." : "Registration is not open for this event."));
    return panel;
  }

  panel.append(createTextElement("p", "Register using your public customer profile. Staff can review registrations in SMBSystem."));
  const register = document.createElement("button");
  register.type = "button";
  register.textContent = "Register for Event";
  register.addEventListener("click", openEventRegistrationModal);
  panel.append(register);
  return panel;
}

function getEventRegistrationStatusLabel(registration, eventItem) {
  const paymentStatus = String(registration?.paymentStatus || "").toLowerCase();
  if (eventItem?.isPaid) {
    if (paymentStatus === "paid" || paymentStatus === "waived") {
      return "CONFIRMED";
    }
    if (paymentStatus === "rejected") {
      return "REJECTED";
    }
    return "AWAITING CONFIRMATION";
  }

  return registration?.status === "waitlisted" ? "Waitlisted" : "Registered";
}

function renderEventRegistrationRecord(registration) {
  const record = document.createElement("dl");
  record.className = "event-registration-record";
  const accountName = customerState.profile?.username || customerState.account?.username || "Customer";
  const accountEmail = customerState.profile?.email || customerState.account?.email || "Not set";
  const eventItem = eventsState.activeEvent;
  const rows = [
    ["Registrant", accountName],
    ["Email", accountEmail],
    ["Status", getEventRegistrationStatusLabel(registration, eventItem)],
    ["Registered", registration.registeredAt ? formatEventDateTime(registration.registeredAt) : "Just now"]
  ];

  if (eventItem?.isPaid) {
    rows.push(["Fee", pesoFormatter.format(Number(eventItem.feeAmount || 0))]);
    rows.push(["Payment", String(registration.paymentStatus || "unpaid").replace(/_/g, " ")]);
  }

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.append(createTextElement("dt", label), createTextElement("dd", value));
    record.append(row);
  });
  return record;
}

function openEventRegistrationModal() {
  const eventItem = eventsState.activeEvent;
  const modal = document.querySelector("[data-event-registration-modal]");
  const form = document.querySelector("[data-event-registration-form]");
  const title = document.querySelector("#event-registration-title");
  const message = document.querySelector("[data-event-registration-message]");
  const paymentFields = document.querySelector("[data-event-payment-fields]");
  const feeLabel = document.querySelector("[data-event-registration-fee]");
  if (!eventItem || !modal || !form) {
    return;
  }

  if (title) {
    title.textContent = `Register for ${eventItem.title || "event"}`;
  }
  setMessage(message, "");
  form.elements.participantName.value = customerState.profile?.username || customerState.account?.username || "";
  form.elements.participantEmail.value = customerState.profile?.email || customerState.account?.email || "";
  form.elements.bikeType.value = customerState.profile?.riderTypes?.[0] || "";
  form.elements.emergencyContactName.value = "";
  form.elements.emergencyContactPhone.value = "";
  if (form.elements.paymentProof) {
    form.elements.paymentProof.value = "";
  }
  form.elements.notes.value = "";
  if (paymentFields) {
    paymentFields.hidden = !eventItem.isPaid;
  }
  if (feeLabel) {
    feeLabel.textContent = pesoFormatter.format(Number(eventItem.feeAmount || 0));
  }
  modal.hidden = false;
  form.elements.bikeType.focus();
}

function closeEventRegistrationModal() {
  document.querySelector("[data-event-registration-modal]")?.setAttribute("hidden", "");
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",").pop() : result);
    });
    reader.addEventListener("error", () => reject(reader.error || new Error("Unable to read file.")));
    reader.readAsDataURL(file);
  });
}

async function buildEventRegistrationPayload(form) {
  const paymentProof = form.elements.paymentProof?.files?.[0] || null;
  const payload = {
    participantName: form.elements.participantName.value.trim(),
    participantEmail: form.elements.participantEmail.value.trim() || null,
    emergencyContactName: form.elements.emergencyContactName.value.trim() || null,
    emergencyContactPhone: form.elements.emergencyContactPhone.value.trim() || null,
    bikeType: form.elements.bikeType.value.trim() || null,
    notes: form.elements.notes.value.trim() || null
  };

  if (paymentProof) {
    payload.paymentProofBase64 = await readFileAsBase64(paymentProof);
    payload.paymentProofFileName = paymentProof.name;
    payload.paymentProofContentType = paymentProof.type;
  }

  return payload;
}

async function submitEventRegistration(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("[data-event-registration-message]");
  if (!eventsState.activeEvent) {
    return;
  }

  setMessage(message, "Saving registration...");
  try {
    const payload = await buildEventRegistrationPayload(form);
    const updated = await apiRequest(`/api/public/events/${eventsState.activeEvent.id}/registration`, {
      body: JSON.stringify(payload),
      method: "POST"
    });
    eventsState.activeEvent = updated;
    closeEventRegistrationModal();
    renderEventDetail(updated);
  } catch (error) {
    setMessage(message, error.message || "Unable to register for this event.", "error");
  }
}

async function withdrawEventRegistration(eventId) {
  if (!eventId || !window.confirm("Withdraw your registration for this event?")) {
    return;
  }

  try {
    const updated = await apiRequest(`/api/public/events/${eventId}/registration`, { method: "DELETE" });
    eventsState.activeEvent = updated;
    renderEventDetail(updated);
  } catch (error) {
    window.alert(error.message || "Unable to withdraw registration.");
  }
}

function bindEventsUi() {
  if (!isEventsPage()) {
    return;
  }

  document.querySelector("[data-events-type]")?.addEventListener("change", (event) => {
    eventsState.selectedType = event.target.value;
    document.querySelectorAll("[data-events-chip]").forEach((chip) => chip.classList.toggle("active", chip.dataset.eventsChip === eventsState.selectedType || (eventsState.selectedType === "all" && chip.dataset.eventsChip === "all")));
    loadEventsPageEvents();
  });
  document.querySelector("[data-events-status]")?.addEventListener("change", (event) => {
    eventsState.selectedStatus = event.target.value;
    loadEventsPageEvents();
  });
  document.querySelector("[data-events-refresh]")?.addEventListener("click", loadEventsPageEvents);
  document.querySelectorAll("[data-events-chip]").forEach((chip) => {
    chip.addEventListener("click", () => {
      eventsState.selectedType = chip.dataset.eventsChip || "all";
      const select = document.querySelector("[data-events-type]");
      if (select) {
        select.value = eventsState.selectedType;
      }
      document.querySelectorAll("[data-events-chip]").forEach((item) => item.classList.toggle("active", item === chip));
      loadEventsPageEvents();
    });
  });
  document.querySelector("[data-events-back]")?.addEventListener("click", showEventListView);
  document.querySelector("[data-event-registration-form]")?.addEventListener("submit", submitEventRegistration);
  document.querySelector("[data-event-registration-close]")?.addEventListener("click", closeEventRegistrationModal);
  document.querySelector("[data-event-registration-cancel]")?.addEventListener("click", closeEventRegistrationModal);
  document.querySelector("[data-event-registration-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeEventRegistrationModal();
    }
  });
  window.addEventListener("popstate", () => {
    const eventId = new URLSearchParams(window.location.search).get("event");
    if (eventId) {
      openEventDetail(eventId, { updateUrl: false });
    } else {
      document.querySelector("[data-event-detail]")?.setAttribute("hidden", "");
      document.querySelector("[data-events-list-layout]")?.removeAttribute("hidden");
      document.querySelector("[data-events-toolbar]")?.removeAttribute("hidden");
    }
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
  form.elements.mobileNumber.value = profile?.mobileNumber || "";
  form.elements.facebookAccount.value = profile?.facebookAccount || "";
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
      mobileNumber: form.elements.mobileNumber.value.trim(),
      facebookAccount: form.elements.facebookAccount.value.trim(),
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
      updateCustomerHeader();
      window.dispatchEvent(new CustomEvent("customer-session-changed"));
      setMessage(message, "Profile created. You are now logged in.", "success");
      await openEditProfileForm();
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
    window.dispatchEvent(new CustomEvent("customer-session-changed"));
    setMessage(message, "Logged in.", "success");
    hideCommunityAuthPrompt();
    document.querySelector("[data-community-login-form]")?.setAttribute("hidden", "");
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
  } catch (error) {
    customerState.account = null;
  }
  updateCustomerHeader();
  window.dispatchEvent(new CustomEvent("customer-session-changed"));
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
  document.querySelector("[data-coming-soon-header-login]")?.addEventListener("click", openCommunityLoginForm);
  document.querySelector("[data-mobile-header-login]")?.addEventListener("click", openCommunityLoginForm);
  document.querySelector("[data-coming-soon-header-menu-toggle]")?.addEventListener("click", toggleComingSoonHeaderMenu);
  document.querySelector("[data-mobile-header-menu-toggle]")?.addEventListener("click", toggleMobileHeaderMenu);
  document.querySelector("[data-edit-profile]")?.addEventListener("click", openEditProfileForm);
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
}

function getProductDetailRoot() {
  return document.querySelector("[data-product-detail]");
}

function getFieldValue(item, fieldNames) {
  for (const fieldName of fieldNames) {
    const value = item[fieldName];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function sanitizeRichText(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  const allowedTags = new Set(["A", "B", "BR", "EM", "I", "LI", "OL", "P", "STRONG", "U", "UL"]);

  const cleanNode = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        return;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        return;
      }

      const element = child;
      if (!allowedTags.has(element.tagName)) {
        element.replaceWith(document.createTextNode(element.textContent || ""));
        return;
      }

      Array.from(element.attributes).forEach((attribute) => {
        const isSafeLink = element.tagName === "A"
          && attribute.name === "href"
          && /^(https?:|mailto:|tel:)/i.test(attribute.value);
        if (!isSafeLink) {
          element.removeAttribute(attribute.name);
        }
      });

      if (element.tagName === "A") {
        element.target = "_blank";
        element.rel = "noreferrer";
      }

      cleanNode(element);
    });
  };

  cleanNode(template.content);
  return template.innerHTML;
}

function renderProductDescription(description) {
  const detail = document.createElement("div");
  detail.className = "product-detail-description";

  if (!description) {
    detail.textContent = "Public catalog item from SMBSystem. Stocks and prices may change due to in-store sales.";
    return detail;
  }

  detail.innerHTML = sanitizeRichText(description);
  return detail;
}

function getProductDetailQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    id: params.get("id") || "",
    slug: params.get("slug") || ""
  };
}

function itemMatchesProductQuery(item, query) {
  const targetId = normalizeText(query.id);
  const targetSlug = normalizeText(query.slug);
  const identifiers = [
    getItemIdentifier(item),
    item.productId,
    item.id,
    item.itemId,
    item.inventoryItemId,
    item.catalogItemId,
    item.sku,
    item.itemCode,
    item.barcode
  ].filter(Boolean).map(normalizeText);

  if (targetId && identifiers.includes(targetId)) {
    return true;
  }

  return Boolean(targetSlug && slugify(getItemName(item)) === slugify(targetSlug));
}

function setProductDetailState(title, detail) {
  const root = getProductDetailRoot();
  if (!root) {
    return;
  }
  root.replaceChildren();
  const stateCard = document.createElement("article");
  stateCard.className = "product-detail-state";
  stateCard.append(createTextElement("h1", title), createTextElement("p", detail));
  root.append(stateCard);
}

function buildSpecRows(item) {
  const rows = [
    ["Brand", getFieldValue(item, ["brand", "brandName"])],
    ["Model", getFieldValue(item, ["model", "modelName", "variant"])],
    ["Category", getFieldValue(item, ["webCategory", "webCategoryName", "category"])],
    ["Type", getFieldValue(item, ["categoryGroupName", "categoryGroup", "itemType"])],
    ["Size", getFieldValue(item, ["size", "frameSize", "wheelSize"])],
    ["Color", getFieldValue(item, ["color", "colour"])],
    ["Material", getFieldValue(item, ["material"])],
    ["Compatibility", getFieldValue(item, ["compatibility", "compatibleWith"])],
    ["Included", getFieldValue(item, ["included", "inclusions", "packageIncludes"])]
  ];

  const specs = item.specs || item.specifications || item.webSpecs;
  if (Array.isArray(specs)) {
    specs.forEach((spec) => {
      if (typeof spec === "string") {
        rows.push(["Spec", spec]);
        return;
      }
      rows.push([spec.label || spec.name || "Spec", spec.value || spec.description || ""]);
    });
  } else if (specs && typeof specs === "object") {
    Object.entries(specs).forEach(([key, value]) => rows.push([key, value]));
  }

  return rows
    .map(([label, value]) => [label, String(value || "").trim()])
    .filter(([, value]) => value);
}

function renderProductDetailGallery(item) {
  const imageUrls = getProductImageUrls(item);
  const gallery = document.createElement("section");
  gallery.className = "product-detail-gallery";
  gallery.setAttribute("aria-label", "Product photos");

  const stage = document.createElement("div");
  stage.className = "product-detail-photo-stage product-api-photo";
  stage.dataset.initial = getItemName(item).trim().slice(0, 1).toUpperCase();

  if (imageUrls[0]) {
    stage.classList.add("has-image");
    const image = document.createElement("img");
    image.alt = getItemName(item);
    image.decoding = "async";
    image.src = imageUrls[0];
    stage.append(image);
  }

  gallery.append(stage);

  if (imageUrls.length > 1) {
    const thumbnails = document.createElement("div");
    thumbnails.className = "product-detail-thumbnails";
    imageUrls.forEach((imageUrl, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = index === 0 ? "active" : "";
      button.setAttribute("aria-label", `Show product photo ${index + 1}`);
      const image = document.createElement("img");
      image.alt = "";
      image.loading = "lazy";
      image.src = imageUrl;
      button.append(image);
      button.addEventListener("click", () => {
        const stageImage = stage.querySelector("img") || document.createElement("img");
        stageImage.alt = getItemName(item);
        stageImage.src = imageUrl;
        if (!stageImage.parentElement) {
          stage.classList.add("has-image");
          stage.append(stageImage);
        }
        thumbnails.querySelectorAll("button").forEach((thumbnail) => thumbnail.classList.remove("active"));
        button.classList.add("active");
      });
      thumbnails.append(button);
    });
    gallery.append(thumbnails);
  }

  return gallery;
}

function renderBranchAvailability(item) {
  const availability = document.createElement("div");
  availability.className = "product-branch-list";

  Object.entries(branchContacts).forEach(([branchName, branch]) => {
    const card = document.createElement("article");
    card.className = "product-branch-card";
    const actualStatus = branchName === "Quezon City"
      ? getAvailabilityLabel(item)
      : getFieldValue(item, [`${branchName.toLowerCase()}Availability`, "otherBranchAvailability"]) || "ASK BRANCH";
    card.append(
      createTextElement("strong", branchName),
      createTextElement("span", actualStatus, actualStatus === "AVAILABLE" ? "available" : "ask"),
      createTextElement("p", `${branch.address} | ${branch.phone}`)
    );
    availability.append(card);
  });

  return availability;
}

function renderSpecTable(item) {
  const rows = buildSpecRows(item);
  const table = document.createElement("dl");
  table.className = "product-spec-table";

  if (rows.length === 0) {
    const note = document.createElement("p");
    note.className = "product-detail-note";
    note.textContent = "Specs are not yet published for this item. Message us to confirm compatibility.";
    return note;
  }

  rows.forEach(([label, value]) => {
    const group = document.createElement("div");
    group.append(createTextElement("dt", label), createTextElement("dd", value));
    table.append(group);
  });

  return table;
}

function getRelatedProducts(item) {
  const currentIdentifier = normalizeText(getItemIdentifier(item));
  const currentGroup = normalizeText(getItemCategoryGroup(item));
  const currentCategory = normalizeText(getItemWebCategory(item));
  return state.items
    .filter(isPublicProduct)
    .filter((candidate) => normalizeText(getItemIdentifier(candidate)) !== currentIdentifier)
    .filter((candidate) => {
      return normalizeText(getItemWebCategory(candidate)) === currentCategory
        || normalizeText(getItemCategoryGroup(candidate)) === currentGroup;
    })
    .slice(0, 4);
}

function renderProductMiniCard(item) {
  const link = document.createElement("a");
  link.className = "product-mini-card";
  link.href = getProductDetailUrl(item);
  link.append(
    renderProductPhoto(item),
    createTextElement("strong", getItemName(item)),
    renderPrice(item)
  );
  return link;
}

async function copyCurrentProductLink(button) {
  try {
    await navigator.clipboard.writeText(window.location.href);
    button.textContent = "Link copied";
    window.setTimeout(() => {
      button.textContent = "Copy link";
    }, 1600);
  } catch {
    button.textContent = "Copy failed";
    window.setTimeout(() => {
      button.textContent = "Copy link";
    }, 1600);
  }
}

const socialPreviewDetails = {
  facebook: {
    title: "Message SarapMagBike on Facebook",
    label: "Facebook",
    url: "https://www.facebook.com/sarapmagbikeshop",
    action: "Open Facebook"
  },
  instagram: {
    title: "Follow SarapMagBike on Instagram",
    label: "Instagram",
    url: "https://www.instagram.com/sarapmagbike.shop",
    action: "Open Instagram"
  },
  youtube: {
    title: "Follow IanHow on YouTube",
    label: "YouTube",
    url: "https://www.youtube.com/ianhow",
    action: "Open YouTube"
  }
};

function getSocialPreviewDetail(platform = "facebook") {
  return socialPreviewDetails[platform] || socialPreviewDetails.facebook;
}

function ensureSocialPreviewModal() {
  let modal = document.querySelector("[data-social-preview-modal]");
  if (modal) {
    return modal;
  }

  modal = document.createElement("div");
  modal.className = "social-preview-modal";
  modal.dataset.socialPreviewModal = "";
  modal.hidden = true;
  modal.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="social-preview-title">
      <button type="button" class="social-preview-close" data-social-preview-close aria-label="Close">Close</button>
      <span data-social-preview-label></span>
      <h2 id="social-preview-title" data-social-preview-title></h2>
      <p data-social-preview-copy></p>
      <div class="social-preview-actions">
        <a href="#" target="_blank" rel="noreferrer" data-social-preview-action></a>
        <button type="button" data-social-preview-close>Cancel</button>
      </div>
    </div>
  `;
  document.body.append(modal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-social-preview-close]")) {
      closeSocialPreviewModal();
    }
  });
  return modal;
}

function openSocialPreviewModal(platform = "facebook", context = "general") {
  const detail = getSocialPreviewDetail(platform);
  const modal = ensureSocialPreviewModal();
  const copy = context === "product"
    ? "Preview this contact option before leaving the product page. Use the button below when you are ready to message the shop."
    : "Preview this platform before leaving the website. Use the button below when you are ready to continue.";
  modal.querySelector("[data-social-preview-label]").textContent = detail.label;
  modal.querySelector("[data-social-preview-title]").textContent = detail.title;
  modal.querySelector("[data-social-preview-copy]").textContent = copy;
  const action = modal.querySelector("[data-social-preview-action]");
  action.href = detail.url;
  action.textContent = context === "product" && platform === "facebook" ? "Send on Facebook" : detail.action;
  modal.hidden = false;
  document.body.classList.add("has-social-preview-modal");
  window.setTimeout(() => action.focus(), 0);
}

function closeSocialPreviewModal() {
  const modal = document.querySelector("[data-social-preview-modal]");
  if (!modal) {
    return;
  }
  modal.hidden = true;
  document.body.classList.remove("has-social-preview-modal");
}

function getSocialPlatformFromUrl(url) {
  const normalized = String(url || "").toLowerCase();
  if (normalized.includes("instagram.com")) {
    return "instagram";
  }
  if (normalized.includes("youtube.com")) {
    return "youtube";
  }
  if (normalized.includes("facebook.com")) {
    return "facebook";
  }
  return "";
}

function shouldOpenSocialLinkDirectly(link) {
  const label = normalizeText(link?.textContent || "");
  return label === "book service" || label === "book a service" || label === "message us" || label === "ask about this service";
}

function openSarapMagBikeFacebook() {
  const facebookUrl = socialPreviewDetails.facebook.url;
  const opened = window.open(facebookUrl, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.href = facebookUrl;
  }
}

function bindSocialPreviewLinks() {
  document.querySelectorAll(".footer strong").forEach((element) => {
    if (normalizeText(element.textContent).includes("message us on facebook")) {
      element.tabIndex = 0;
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", "Open SarapMagBike Facebook page");
    }
  });

  document.addEventListener("click", (event) => {
    const socialLink = event.target.closest("a[href*='facebook.com'], a[href*='instagram.com'], a[href*='youtube.com']");
    if (socialLink) {
      socialLink.target = "_blank";
      socialLink.rel = "noreferrer";
      return;
    }

    const footerStrong = event.target.closest(".footer strong");
    if (footerStrong && normalizeText(footerStrong.textContent).includes("message us on facebook")) {
      event.preventDefault();
      openSarapMagBikeFacebook();
    }
  });

  document.addEventListener("keydown", (event) => {
    const footerStrong = event.target.closest?.(".footer strong");
    if ((event.key === "Enter" || event.key === " ") && footerStrong && normalizeText(footerStrong.textContent).includes("message us on facebook")) {
      event.preventDefault();
      openSarapMagBikeFacebook();
      return;
    }

    if (event.key === "Escape" && !document.querySelector("[data-social-preview-modal]")?.hidden) {
      closeSocialPreviewModal();
    }
  });
}

function bindProductStickyInquiry(sticky, actions) {
  if (!sticky || !actions) {
    return;
  }

  const updateSticky = () => {
    const isMobile = window.matchMedia("(max-width: 760px)").matches;
    const actionsRect = actions.getBoundingClientRect();
    const actionsVisible = actionsRect.bottom > 86 && actionsRect.top < window.innerHeight - 86;
    sticky.hidden = !isMobile || actionsVisible;
  };

  updateSticky();
  window.addEventListener("scroll", updateSticky, { passive: true });
  window.addEventListener("resize", updateSticky);
}

function renderProductDetail(item) {
  const root = getProductDetailRoot();
  if (!root) {
    return;
  }

  const productName = getItemName(item);
  document.title = `${productName} | SarapMagBike Shop`;
  document.querySelector("meta[name='description']")?.setAttribute("content", `${productName} details, photos, specs, price, and branch availability from SarapMagBike Shop.`);

  root.replaceChildren();

  const detailShell = document.createElement("section");
  detailShell.className = "product-detail-shell";

  const summary = document.createElement("section");
  summary.className = "product-detail-summary";
  summary.setAttribute("aria-label", "Product summary");

  const badges = document.createElement("div");
  badges.className = "product-detail-badges";
  if (item.isNew) {
    badges.append(createTextElement("span", "New arrival"));
  }
  if (item.isOnSale) {
    badges.append(createTextElement("span", "Promo"));
  }
  badges.append(createTextElement("span", getAvailabilityLabel(item)));

  const description = getFieldValue(item, ["webDescription", "description", "notes", "itemNotes"]);
  const detail = renderProductDescription(description);
  const price = renderPrice(item);
  price.classList.add("product-detail-price");

  const actions = document.createElement("div");
  actions.className = "product-detail-actions";
  const messenger = document.createElement("a");
  messenger.href = "https://www.facebook.com/sarapmagbikeshop";
  messenger.target = "_blank";
  messenger.rel = "noreferrer";
  messenger.textContent = "Messenger";
  const callQc = document.createElement("a");
  callQc.href = `tel:${branchContacts["Quezon City"].tel}`;
  callQc.textContent = "Call QC";
  const copyLink = document.createElement("button");
  copyLink.type = "button";
  copyLink.textContent = "Copy link";
  copyLink.addEventListener("click", () => copyCurrentProductLink(copyLink));
  actions.append(messenger, callQc, copyLink);

  summary.append(
    badges,
    createTextElement("p", getFieldValue(item, ["brand", "brandName"]) || "SarapMagBike Catalog", "product-detail-eyebrow"),
    createTextElement("h1", productName),
    price,
    detail,
    actions,
    createTextElement("p", "Default branch context: Quezon City. Message us before visiting so staff can confirm current availability.", "product-detail-note")
  );

  detailShell.append(renderProductDetailGallery(item), summary);
  root.append(detailShell);

  const infoGrid = document.createElement("section");
  infoGrid.className = "product-detail-info-grid";
  const specsCard = document.createElement("article");
  specsCard.append(createTextElement("h2", "Specs"), renderSpecTable(item));
  const availabilityCard = document.createElement("article");
  availabilityCard.append(createTextElement("h2", "Branch Availability"), renderBranchAvailability(item));
  const serviceCard = document.createElement("article");
  serviceCard.append(
    createTextElement("h2", "Install Service"),
    createTextElement("p", "Ask staff if this item needs installation, tuning, brake bleed, drivetrain setup, or compatibility checking before purchase.")
  );
  infoGrid.append(specsCard, availabilityCard, serviceCard);
  root.append(infoGrid);

  const related = getRelatedProducts(item);
  if (related.length > 0) {
    const relatedSection = document.createElement("section");
    relatedSection.className = "product-related-section";
    relatedSection.append(createTextElement("h2", "Related Items"));
    const relatedGrid = document.createElement("div");
    relatedGrid.className = "product-related-grid";
    related.forEach((relatedItem) => relatedGrid.append(renderProductMiniCard(relatedItem)));
    relatedSection.append(relatedGrid);
    root.append(relatedSection);
  }

  const sticky = document.querySelector("[data-product-sticky]");
  if (sticky) {
    sticky.querySelector("[data-product-sticky-price]").textContent = price.textContent;
    sticky.querySelector("[data-product-sticky-title]").textContent = productName;
    bindProductStickyInquiry(sticky, actions);
  }
}

async function loadProductDetailPage() {
  const root = getProductDetailRoot();
  if (!root) {
    return;
  }

  setProductDetailState("Loading Product", "Checking SMBSystem public catalog for this item.");

  try {
    await loadWebItems();
    const query = getProductDetailQuery();
    const item = state.items.find((candidate) => isPublicProduct(candidate) && itemMatchesProductQuery(candidate, query));
    if (!item) {
      setProductDetailState("Product Not Found", "This item is not currently published in the public catalog. It may be unavailable or hidden from the website.");
      return;
    }
    renderProductDetail(item);
  } catch (error) {
    setProductDetailState("Product Unavailable", "SMBSystem public catalog is not reachable. Try again after the API is running.");
  }
}

async function startCatalog() {
  if (await enforcePublicWebsiteMode()) {
    return;
  }

  bindScrambleLabels();
  renderCategoryNav();
  bindCustomerAccountUi();
  bindCatalogUi();
  bindProductSearchUi();
  bindProductSearchPageUi();
  setupFeatureTileBelt();
  bindServiceFilters();
  bindCommunityUi();
  bindEventsUi();
  bindSocialPreviewLinks();
  loadProductDetailPage();
  loadServiceDetailPage();
  loadProductSearchPage();
  const requestedCatalogKey = getRequestedCatalogKey();
  if (requestedCatalogKey && document.querySelector("[data-web-items-grid]")) {
    await openCategoryCatalog(requestedCatalogKey);
  } else if (isEventsPage()) {
    await loadEventsPageEvents();
  } else if (document.querySelector("[data-services-grid]")) {
    await loadManagedServices();
  } else {
    loadHomeProductItems();
  }
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
