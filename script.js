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
  items: [],
  sort: "price-asc"
};

const communityState = {
  categories: [],
  config: null,
  isLoaded: false,
  isLoading: false,
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
    if (window.location.port === "5173" || window.location.port === "5174") {
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
  const imageUrl = normalizeImageUrl(item.mainImageUrl || item.imageUrl || item.photoUrl);

  photo.className = "product-photo product-api-photo";
  photo.dataset.initial = (item.itemDescription || "SMB").trim().slice(0, 1).toUpperCase();

  if (imageUrl) {
    photo.classList.add("has-image");
    const image = document.createElement("img");
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

function setCatalogMode(isCatalogMode) {
  document.body.classList.remove("is-community-mode");
  document.body.classList.toggle("is-catalog-mode", isCatalogMode);
  document.querySelector("[data-community-view]")?.setAttribute("hidden", "");
  document.querySelector("[data-catalog-panel]").hidden = !isCatalogMode;
  document.querySelector("[data-home-products]").hidden = isCatalogMode;
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
  loadNewArrivalItems();
  showProfileMode(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCategoryNav() {
  const nav = document.querySelector("[data-category-nav-list]");
  if (!nav) {
    return;
  }

  nav.replaceChildren();
  [
    { label: "Home", href: "#top", action: returnToHome },
    { label: "Products", href: "#products", action: () => scrollHomeTarget("products") },
    { label: "Services", href: "#services", action: () => scrollHomeTarget("services") },
    { label: "Rides", href: "#online", action: () => scrollHomeTarget("online") },
    { label: "Community", href: "/community", action: () => openCommunityPage(true), community: true },
    { label: "Contact", href: "#contact", action: () => scrollHomeTarget("contact") }
  ].forEach((item) => {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;
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

async function loadNewArrivalItems() {
  const webItemsGrid = getWebItemsGrid();
  if (!webItemsGrid) {
    return;
  }

  try {
    await loadWebItems();
    const newItems = state.items.filter((item) => isPublicProduct(item) && item.isNew).slice(0, 8);
    webItemsGrid.replaceChildren();

    if (newItems.length === 0) {
      setGridState("No New Arrivals Yet", "Mark items as Display on Web and New Item in SMBSystem to show them here.");
      return;
    }

    newItems.forEach((item) => webItemsGrid.append(renderWebItemCard(item)));
  } catch (error) {
    setGridState("New Arrivals Unavailable", "SMBSystem public catalog is not reachable. Try again after the API is running.");
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
    document.body.classList.remove("is-catalog-mode", "is-profile-mode");
    document.querySelector("[data-catalog-panel]").hidden = true;
    document.querySelector("[data-home-products]").hidden = true;
    document.querySelectorAll("[data-home-section]").forEach((section) => {
      section.hidden = true;
    });
    if (updatePath && window.location.pathname !== "/community") {
      window.history.pushState({ view: "community" }, "", "/community");
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

function renderCommunityPostCard(post) {
  const card = document.createElement("article");
  card.className = "community-post-card";
  card.dataset.communityPostId = post.id;

  const meta = document.createElement("div");
  meta.className = "community-post-meta";
  const author = post.authorName || post.author?.displayName || "SarapMagBike rider";
  const categories = Array.isArray(post.categories) && post.categories.length > 0
    ? post.categories
    : [{ name: post.categoryName || post.category?.name || "Discussion", slug: post.categorySlug || "discussion" }];
  const categoryLabel = categories.map((category) => category.name).join(" / ");
  meta.append(
    createTextElement("span", categoryLabel),
    createTextElement("span", author),
    createTextElement("span", formatCommunityTime(post.createdAt))
  );
  if (post.status === "resolved") {
    meta.append(createTextElement("span", "Resolved"));
  }

  const body = createTextElement("p", post.body, "community-post-body");
  card.append(meta, body);

  if (Array.isArray(post.media) && post.media.length > 0) {
    const media = document.createElement("div");
    media.className = "community-media-grid";
    post.media.forEach((photo) => {
      const image = document.createElement("img");
      image.alt = photo.fileName || "Discussion photo";
      image.loading = "lazy";
      image.src = normalizeApiUrl(photo.url);
      media.append(image);
    });
    card.append(media);
  }

  const actions = document.createElement("div");
  actions.className = "community-post-actions";
  actions.append(
    createCommunityActionButton(`Like (${post.likeCount || post.reactionCount || 0})`, () => toggleCommunityReaction(post.id)),
    createCommunityActionButton("Reply", () => focusCommunityReply(card)),
    createCommunityActionButton("Report", () => reportCommunityPost(post.id))
  );
  card.append(actions);

  const comments = document.createElement("div");
  comments.className = "community-comments";
  (post.comments || []).forEach((comment) => comments.append(renderCommunityComment(comment)));
  card.append(comments);

  const replyForm = document.createElement("form");
  replyForm.className = "community-reply-form";
  replyForm.innerHTML = `
    <input name="body" maxlength="1000" placeholder="Reply to this discussion">
    <button type="submit">Reply</button>
  `;
  replyForm.addEventListener("submit", (event) => submitCommunityComment(event, post.id));
  card.append(replyForm);

  return card;
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

function upsertCommunityPost(updatedPost) {
  if (!updatedPost || !communityPostMatchesCurrentFilter(updatedPost)) {
    return;
  }

  const posts = document.querySelector("[data-community-posts]");
  if (!posts) {
    return;
  }

  posts.querySelectorAll(".community-state-card").forEach((card) => card.remove());

  const existingIndex = communityState.posts.findIndex((post) => post.id === updatedPost.id);
  if (existingIndex >= 0) {
    communityState.posts[existingIndex] = updatedPost;
  } else {
    communityState.posts.push(updatedPost);
  }
  communityState.posts = sortCommunityPosts(communityState.posts);

  const nextCard = renderCommunityPostCard(updatedPost);
  const currentCard = posts.querySelector(`[data-community-post-id="${CSS.escape(updatedPost.id)}"]`);
  if (currentCard) {
    currentCard.replaceWith(nextCard);
  } else {
    posts.append(nextCard);
  }

  communityState.posts.forEach((post) => {
    const card = posts.querySelector(`[data-community-post-id="${CSS.escape(post.id)}"]`);
    if (card) {
      posts.append(card);
    }
  });
}

function renderCommunityComment(comment) {
  const item = document.createElement("article");
  item.className = `community-comment${comment.isStaffReply ? " is-staff" : ""}`;
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

function createCommunityActionButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
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
      upsertCommunityPost(created);
    }
  } catch (error) {
    setMessage(message, error.message || "Unable to post discussion.", "error");
  }
}

async function submitCommunityComment(event, postId) {
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
      body: JSON.stringify({ body })
    });
    input.value = "";
    upsertCommunityPost(updatedPost);
  } catch (error) {
    alert(error.message || "Unable to reply.");
  }
}

async function toggleCommunityReaction(postId) {
  if (!requireCommunityLogin()) {
    return;
  }
  try {
    await apiRequest(`/api/public/community/posts/${postId}/reaction`, {
      method: "POST",
      body: JSON.stringify({ reactionType: "like" })
    });
    communityState.isLoaded = false;
    await loadCommunityDiscussions(true);
  } catch (error) {
    alert(error.message || "Unable to update reaction.");
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

async function readCommunityPhotos(fileList) {
  const files = Array.from(fileList || []);
  const config = communityState.config || {};
  const maxFiles = config.maxPhotosPerPost || 3;
  const maxSize = config.maxPhotoBytes || config.maxPhotoSizeBytes || 2_000_000;
  const allowedTypes = config.allowedImageTypes || config.allowedImageContentTypes || ["image/jpeg", "image/png", "image/webp"];

  if (files.length > maxFiles) {
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

async function handleCommunityPhotoChange(event) {
  const input = event.currentTarget;
  const message = getCommunityMessage();
  if (!requireCommunityLogin()) {
    input.value = "";
    return;
  }

  try {
    communityState.photoUploads = await readCommunityPhotos(input.files);
    renderCommunityPhotoPreviews();
    updateCommunityComposerState();
    setMessage(message, "");
  } catch (error) {
    communityState.photoUploads = [];
    input.value = "";
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
    remove.textContent = "Remove";
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

function bindCommunityUi() {
  document.querySelector("[data-community-composer]")?.addEventListener("submit", submitCommunityPost);
  document.querySelector("[data-community-start]")?.addEventListener("click", () => {
    if (!requireCommunityLogin()) {
      return;
    }
    document.querySelector("[data-community-composer] textarea")?.focus();
  });
  document.querySelector("[data-community-login]")?.addEventListener("click", () => {
    document.querySelector("[data-customer-login-form] input[name='username']")?.focus();
  });
  document.querySelector("[data-community-register]")?.addEventListener("click", openRegisterForm);
  document.querySelector("[data-community-prompt-close]")?.addEventListener("click", hideCommunityAuthPrompt);
  document.querySelector("[data-community-prompt-login]")?.addEventListener("click", () => {
    hideCommunityAuthPrompt();
    document.querySelector("[data-customer-login-form] input[name='username']")?.focus();
  });
  document.querySelector("[data-community-prompt-register]")?.addEventListener("click", () => {
    hideCommunityAuthPrompt();
    openRegisterForm();
  });
  document.querySelector("[data-community-composer] textarea")?.addEventListener("focus", () => {
    requireCommunityLogin();
    setCommunityComposerActive(true);
  });
  document.querySelector("[data-community-composer] textarea")?.addEventListener("input", updateCommunityComposerState);
  document.querySelector("[data-community-composer]")?.addEventListener("focusout", (event) => {
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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    if (wasInCommunity) {
      openCommunityPage(false);
    } else {
      returnToHome();
    }
  } catch (error) {
    alert("Unable to log in. Check your username and password.");
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
  document.querySelector("[data-open-register]")?.addEventListener("click", openRegisterForm);
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
}

function startCatalog() {
  bindCustomerAccountUi();
  bindCatalogUi();
  bindCommunityUi();
  loadNewArrivalItems();
  if (window.location.pathname === "/community") {
    openCommunityPage(false);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startCatalog);
} else {
  startCatalog();
}
