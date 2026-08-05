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
  return item.publicId
    ?? item.productGroupId
    ?? item.productId
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
    const status = await apiRequest(withPublicLocation("/api/public/site-status"));
    if (status?.isComingSoon) {
      const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(`coming-soon.html?location=${encodeURIComponent(getSelectedPublicLocationSlug())}&return=${encodeURIComponent(returnPath)}`);
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
  if (stockStatus.includes("made to order")) {
    return "MADE TO ORDER";
  }
  if (stockStatus.includes("out of stock") || stockStatus.includes("sold out") || stockStatus.includes("unavailable")) {
    return "OUT OF STOCK";
  }

  return "AVAILABLE";
}

function renderWebItemCard(item) {
  const imageUrls = getProductImageUrls(item);
  const productName = getItemName(item);
  const detailUrl = getProductDetailUrl(item);
  const card = document.createElement("a");
  card.className = "product-card is-clickable";
  card.href = detailUrl;
  card.setAttribute("aria-label", `View details for ${productName}`);

  if (item.isNew) {
    card.append(createTextElement("span", "New", "badge"));
  }

  if (item.isOnSale) {
    card.append(createTextElement("span", "Sale!", "badge sale"));
  }

  const detail = [
    item.brand,
    item.category,
    item.hasVariants && Array.isArray(item.variants) ? `${item.variants.length} options` : "",
    item.stockStatus || item.availabilityLabel || "Ask availability"
  ].filter(Boolean).join(" / ");

  card.append(
    renderProductPhoto(item),
    createTextElement("h3", productName),
    createTextElement("p", detail),
    renderPrice(item)
  );

  if (imageUrls.length > 1) {
    card.classList.add("has-image-gallery");
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

  const response = await fetch(`${getApiBaseUrl()}${withPublicLocation("/api/public/web-items")}`);
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
  params.set("location", getSelectedPublicLocationSlug());
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
        <h2 id="product-search-title">Search Products</h2>
        <button type="button" data-product-search-close aria-label="Close product search">Close</button>
      </header>
      <div class="product-search-body">
        <form class="product-search-form" data-product-search-form>
          <input type="search" data-product-search-input aria-label="Search inventory products" placeholder="Search bikes, parts, brands, or SKU">
          <button type="submit">Search</button>
        </form>
        <p class="product-search-validation" data-product-search-validation aria-live="polite"></p>
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
    const input = modal.querySelector("[data-product-search-input]");
    const query = String(input?.value || "").trim();
    const validation = modal.querySelector("[data-product-search-validation]");
    if (query.length < 2) {
      validation.textContent = "Enter at least 2 characters.";
      input?.setAttribute("aria-invalid", "true");
      input?.focus();
      return;
    }
    submitProductSearch(query);
  });

  modal.querySelector("[data-product-search-input]")?.addEventListener("input", (event) => {
    if (String(event.target.value || "").trim().length >= 2) {
      event.target.removeAttribute("aria-invalid");
      modal.querySelector("[data-product-search-validation]").textContent = "";
    }
  });

  modal.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(modal.querySelectorAll("button, input")).filter((element) => !element.disabled);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  return modal;
}

function getProductSearchPageUrl(query = "") {
  const trimmedQuery = String(query || "").trim();
  return trimmedQuery
    ? `search.html?search=${encodeURIComponent(trimmedQuery)}`
    : "search.html";
}

function submitProductSearch(query = "") {
  window.location.href = getProductSearchPageUrl(query);
}

let lastProductSearchTrigger = null;

function closeProductSearchModal() {
  const modal = document.querySelector("[data-product-search-modal]");
  if (!modal) {
    return;
  }
  modal.hidden = true;
  document.body.classList.remove("has-product-search-modal");
  if (lastProductSearchTrigger?.isConnected) {
    lastProductSearchTrigger.focus();
  }
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

  setProductSearchPageState("Searching Products", `Checking SarapMagBike inventory matches for ${getSelectedPublicLocationName()}.`);

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

function openProductSearchModal(query = "", trigger = null) {
  const modal = ensureProductSearchModal();
  const input = modal.querySelector("[data-product-search-input]");
  const validation = modal.querySelector("[data-product-search-validation]");
  lastProductSearchTrigger = trigger || document.activeElement;
  input.value = String(query || "").trim();
  input.removeAttribute("aria-invalid");
  validation.textContent = "";
  modal.hidden = false;
  document.body.classList.add("has-product-search-modal");
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
  document.querySelectorAll("[data-product-search-open]").forEach((button) => {
    button.addEventListener("click", () => openProductSearchModal("", button));
  });

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

const heroLeaderboardState = {
  activeIndex: 0,
  autoTimer: null,
  enabled: false,
  paused: false,
  refreshTimer: null,
  touchStartX: null
};

function getLeaderboardInitials(username) {
  const words = String(username || "Rider").trim().split(/[\s._-]+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "R";
}

function renderHeroLeaderboard(rows) {
  const list = document.querySelector("[data-loyalty-leaderboard-list]");
  if (!list) return;
  list.replaceChildren();

  rows.slice(0, 10).forEach((row, index) => {
    const item = document.createElement("li");
    item.className = "hero-leaderboard-row";

    const rank = createTextElement("span", String(row.rank || index + 1), "hero-leaderboard-rank");
    rank.setAttribute("aria-label", `Rank ${row.rank || index + 1}`);

    const avatar = document.createElement("span");
    avatar.className = "hero-leaderboard-avatar";
    if (row.profilePictureUrl) {
      const image = document.createElement("img");
      image.alt = "";
      image.loading = "lazy";
      image.src = normalizeApiUrl(row.profilePictureUrl);
      image.addEventListener("error", () => {
        image.remove();
        avatar.textContent = getLeaderboardInitials(row.username);
      }, { once: true });
      avatar.append(image);
    } else {
      avatar.textContent = getLeaderboardInitials(row.username);
    }

    const identity = document.createElement("span");
    identity.className = "hero-leaderboard-identity";
    identity.append(createTextElement("strong", row.username || "SarapMagBike rider"));
    const level = document.createElement("span");
    level.className = "hero-leaderboard-level";
    const levelCode = ["noob", "saks", "mamaw", "master", "budolero"].includes(row.level?.code)
      ? row.level.code
      : "noob";
    const levelIcon = document.createElement("img");
    levelIcon.src = `assets/sarapmagbadge-${levelCode}.png`;
    levelIcon.alt = "";
    levelIcon.loading = "lazy";
    level.append(levelIcon, createTextElement("small", row.level?.name || "Noob"));
    const activityDescription = String(row.lastActivity?.description || "Not available").trim();
    const activityPoints = Number(row.lastActivity?.pointsEarned || 0);
    const activityPointLabel = activityPoints === 1 ? "point" : "points";
    const activity = createTextElement(
      "small",
      activityPoints > 0
        ? `Last Activity: ${activityDescription} : +${activityPoints.toLocaleString("en-PH")} ${activityPointLabel}.`
        : `Last Activity: ${activityDescription}`,
      "hero-leaderboard-activity"
    );
    identity.append(level, activity);

    const points = document.createElement("span");
    points.className = "hero-leaderboard-points";
    points.append(
      createTextElement("strong", Number(row.lifetimePoints || 0).toLocaleString("en-PH")),
      createTextElement("small", "points")
    );

    item.append(rank, avatar, identity, points);
    list.append(item);
  });
}

function showHeroCarouselSlide(index, manual = false) {
  const carousel = document.querySelector("[data-hero-carousel]");
  if (!carousel) return;
  const slides = Array.from(carousel.querySelectorAll("[data-hero-carousel-slide]"));
  const dots = Array.from(carousel.querySelectorAll("[data-hero-carousel-dot]"));
  const availableSlides = heroLeaderboardState.enabled ? slides.length : 1;
  heroLeaderboardState.activeIndex = (index + availableSlides) % availableSlides;

  slides.forEach((slide, slideIndex) => {
    const isActive = slideIndex === heroLeaderboardState.activeIndex;
    slide.classList.toggle("is-active", isActive);
    slide.setAttribute("aria-hidden", String(!isActive));
  });
  dots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === heroLeaderboardState.activeIndex;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-pressed", String(isActive));
  });

  const video = carousel.querySelector(".hero-video");
  if (video) {
    if (heroLeaderboardState.activeIndex === 0) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  if (manual) startHeroCarouselAutoRotation();
}

function startHeroCarouselAutoRotation() {
  window.clearInterval(heroLeaderboardState.autoTimer);
  if (!heroLeaderboardState.enabled || prefersReducedMotion?.matches) return;
  heroLeaderboardState.autoTimer = window.setInterval(() => {
    if (!heroLeaderboardState.paused && !document.hidden) {
      showHeroCarouselSlide(heroLeaderboardState.activeIndex + 1);
    }
  }, 7000);
}

function setHeroLeaderboardEnabled(enabled) {
  const controls = document.querySelector("[data-hero-carousel-controls]");
  heroLeaderboardState.enabled = Boolean(enabled);
  if (controls) controls.hidden = !heroLeaderboardState.enabled;
  if (!heroLeaderboardState.enabled) showHeroCarouselSlide(0);
  startHeroCarouselAutoRotation();
}

async function loadHeroLeaderboard({ forceRefresh = false } = {}) {
  const list = document.querySelector("[data-loyalty-leaderboard-list]");
  if (!list) return;
  const refreshButton = document.querySelector("[data-leaderboard-refresh]");
  if (forceRefresh && refreshButton?.disabled) return;
  if (forceRefresh && refreshButton) {
    refreshButton.disabled = true;
    refreshButton.classList.add("is-refreshing");
    refreshButton.setAttribute("aria-label", "Refreshing leaderboard");
  }
  try {
    const location = encodeURIComponent(getSelectedPublicLocationSlug());
    const cacheBuster = forceRefresh ? `&_=${Date.now()}` : "";
    const result = await apiRequest(`/api/public/loyalty/leaderboard?location=${location}&take=10${cacheBuster}`);
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    if (rows.length === 0) {
      setHeroLeaderboardEnabled(false);
      return;
    }
    renderHeroLeaderboard(rows);
    const scope = document.querySelector("[data-leaderboard-scope]");
    if (scope) scope.textContent = result?.label || "All branches";
    setHeroLeaderboardEnabled(true);
  } catch {
    if (!heroLeaderboardState.enabled) setHeroLeaderboardEnabled(false);
  } finally {
    if (forceRefresh && refreshButton) {
      refreshButton.disabled = false;
      refreshButton.classList.remove("is-refreshing");
      refreshButton.setAttribute("aria-label", "Refresh leaderboard");
    }
  }
}

function initializeHeroLeaderboardCarousel() {
  const carousel = document.querySelector("[data-hero-carousel]");
  if (!carousel || carousel.dataset.carouselBound === "true") return;
  carousel.dataset.carouselBound = "true";

  carousel.querySelector("[data-hero-carousel-previous]")?.addEventListener("click", () => {
    showHeroCarouselSlide(heroLeaderboardState.activeIndex - 1, true);
  });
  carousel.querySelector("[data-hero-carousel-next]")?.addEventListener("click", () => {
    showHeroCarouselSlide(heroLeaderboardState.activeIndex + 1, true);
  });
  carousel.querySelectorAll("[data-hero-carousel-dot]").forEach((dot) => {
    dot.addEventListener("click", () => showHeroCarouselSlide(Number(dot.dataset.heroCarouselDot), true));
  });
  carousel.querySelector("[data-leaderboard-refresh]")?.addEventListener("click", () => {
    loadHeroLeaderboard({ forceRefresh: true });
  });

  carousel.addEventListener("mouseenter", () => { heroLeaderboardState.paused = true; });
  carousel.addEventListener("mouseleave", () => { heroLeaderboardState.paused = false; });
  carousel.addEventListener("focusin", () => { heroLeaderboardState.paused = true; });
  carousel.addEventListener("focusout", (event) => {
    if (!carousel.contains(event.relatedTarget)) heroLeaderboardState.paused = false;
  });
  carousel.addEventListener("touchstart", (event) => {
    heroLeaderboardState.touchStartX = event.changedTouches[0]?.clientX ?? null;
    heroLeaderboardState.paused = true;
  }, { passive: true });
  carousel.addEventListener("touchend", (event) => {
    const endX = event.changedTouches[0]?.clientX;
    if (heroLeaderboardState.enabled && heroLeaderboardState.touchStartX !== null && Number.isFinite(endX)) {
      const distance = endX - heroLeaderboardState.touchStartX;
      if (Math.abs(distance) >= 45) showHeroCarouselSlide(heroLeaderboardState.activeIndex + (distance < 0 ? 1 : -1), true);
    }
    heroLeaderboardState.touchStartX = null;
    heroLeaderboardState.paused = false;
  }, { passive: true });

  loadHeroLeaderboard();
  window.clearInterval(heroLeaderboardState.refreshTimer);
  heroLeaderboardState.refreshTimer = window.setInterval(loadHeroLeaderboard, 60000);
}
