const year = document.querySelector("#year");
const menuButton = document.querySelector(".menu-button");
const navLinks = document.querySelector(".nav-links");
const pesoFormatter = new Intl.NumberFormat("en-PH", {
  currency: "PHP",
  minimumFractionDigits: 2,
  style: "currency"
});

const categoryGroups = {
  "bike-frames": {
    title: "Bike & Frames",
    groupName: "BIKE & FRAMES",
    groupNames: ["Bike & Frames", "Bikes & Frames"],
    webCategories: ["MTB", "Road", "Gravel", "Folding", "Starter Builds", "Shop Assembled Option"],
    filters: ["All", "MTB", "Road", "Gravel", "Folding", "Starter Builds", "Shop Assembled Option"]
  },
  "parts-components": {
    title: "Parts & Components",
    groupName: "PARTS & COMPONENTS",
    groupNames: ["Parts & Components"],
    webCategories: ["Drivetrain", "Brakes", "Cockpit", "Forks", "Wheelsets", "Upgrade Parts"],
    filters: ["All", "Drivetrain", "Brakes", "Cockpit", "Forks", "Wheelsets", "Upgrade Parts"]
  },
  "tires-tubes": {
    title: "Tires & Tubes",
    groupName: "TIRES & TUBES",
    groupNames: ["Tires & Tubes"],
    webCategories: ["MTB", "Road", "Gravel", "Folding Bike Tires", "Inner Tubes", "Repair Essentials"],
    filters: ["All", "MTB", "Road", "Gravel", "Folding Bike Tires", "Inner Tubes", "Repair Essentials"]
  },
  "cycling-clothing": {
    title: "Cycling Clothing",
    groupName: "CYCLING CLOTHING",
    groupNames: ["Cycling Clothing"],
    webCategories: ["Jerseys", "Shorts", "Gloves", "Ride Apparel", "Everyday Shop Gear"],
    filters: ["All", "Jerseys", "Shorts", "Gloves", "Ride Apparel", "Everyday Shop Gear"]
  },
  "helmets-sunglasses": {
    title: "Helmets & Sunglasses",
    groupName: "HELMETS & SUNGLASSES",
    groupNames: ["Helmets & Sunglasses"],
    webCategories: ["Safety Gear", "Helmets", "Eyewear", "Lights", "Bags", "Daily Ride Essentials"],
    filters: ["All", "Safety Gear", "Helmets", "Eyewear", "Lights", "Bags", "Daily Ride Essentials"]
  }
};

const state = {
  activeCategory: null,
  activeSubcategory: "All",
  items: [],
  page: 1,
  pageSize: 5,
  sort: "price-asc"
};

const bikeTypes = ["MTB", "Road", "Gravel", "Folding", "Hybrid", "Others"];

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

    return "http://localhost:5088";
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

function getReturnUrl() {
  const url = new URL(window.location.href);
  url.hash = "customer-profile";
  return url.toString();
}

function getAuthStartUrl(provider) {
  const providerPath = provider === "facebook" ? "facebook" : "google";
  return `${getApiBaseUrl()}/api/public/auth/${providerPath}/start?returnUrl=${encodeURIComponent(getReturnUrl())}`;
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
    const error = new Error(`Request failed with ${response.status}`);
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
  action.href = "#contact";
  action.textContent = "Ask Availability";
  action.setAttribute("aria-label", `Ask availability for ${item.itemDescription || "this item"}`);

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

function itemMatchesCategory(item, categoryKey) {
  const group = categoryGroups[categoryKey];
  if (!group) {
    return false;
  }

  const categoryGroup = normalizeText(getItemCategoryGroup(item));
  const validCategoryGroups = [...group.groupNames, group.groupName, group.title].map(normalizeText);
  if (!validCategoryGroups.includes(categoryGroup)) {
    return false;
  }

  const webCategory = normalizeText(getItemWebCategory(item));
  return group.webCategories.some((category) => normalizeText(category) === webCategory);
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
  document.body.classList.toggle("is-catalog-mode", isCatalogMode);
  document.querySelector("[data-catalog-panel]").hidden = !isCatalogMode;
  document.querySelector("[data-catalog-pagination]").hidden = !isCatalogMode;
  document.querySelector("[data-home-products]").hidden = isCatalogMode;
  document.querySelectorAll("[data-home-section]").forEach((section) => {
    section.hidden = isCatalogMode;
  });
}

function updateActiveCategoryNav() {
  document.querySelectorAll("[data-category-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.categoryNav === state.activeCategory);
  });
}

function renderSubcategoryFilters() {
  const filters = document.querySelector("[data-subcategory-filters]");
  const group = categoryGroups[state.activeCategory];
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
      state.page = 1;
      renderCatalog();
    });
    filters.append(button);
  });
}

function updateCatalogControls(totalItems, totalPages, visibleCount) {
  document.querySelectorAll("[data-page-size]").forEach((button) => {
    const value = button.dataset.pageSize === "all" ? "all" : Number(button.dataset.pageSize);
    button.classList.toggle("active", value === state.pageSize);
  });

  const sortSelect = document.querySelector("[data-sort-select]");
  if (sortSelect) {
    sortSelect.value = state.sort;
  }

  const numbers = document.querySelector("[data-page-numbers]");
  if (numbers) {
    numbers.replaceChildren();
    for (let index = 1; index <= totalPages; index += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(index);
      button.className = index === state.page ? "active" : "";
      button.addEventListener("click", () => {
        state.page = index;
        renderCatalog();
      });
      numbers.append(button);
    }
  }

  document.querySelectorAll("[data-page-action]").forEach((button) => {
    const isPrev = button.dataset.pageAction === "prev";
    button.disabled = isPrev ? state.page <= 1 : state.page >= totalPages;
  });

  const resultCount = document.querySelector("[data-result-count]");
  const group = categoryGroups[state.activeCategory];
  if (resultCount && group) {
    const pageStart = totalItems === 0 ? 0 : (state.page - 1) * visibleCount + 1;
    const pageEnd = state.pageSize === "all" ? totalItems : Math.min(state.page * visibleCount, totalItems);
    resultCount.textContent = `Showing ${pageStart}-${pageEnd} of ${totalItems} ${group.title} products`;
  }
}

function renderCatalog() {
  const grid = getWebItemsGrid();
  const group = categoryGroups[state.activeCategory];
  if (!grid || !group) {
    return;
  }

  document.querySelector("[data-catalog-title]").textContent = group.title;
  document.querySelector("[data-stock-note]").textContent = "Stocks and prices may change. Message us to confirm before visiting or ordering.";
  renderSubcategoryFilters();
  updateActiveCategoryNav();

  const items = getCatalogItems();
  const visibleCount = state.pageSize === "all" ? Math.max(items.length, 1) : state.pageSize;
  const totalPages = Math.max(1, Math.ceil(items.length / visibleCount));
  state.page = Math.min(state.page, totalPages);

  const pageItems = state.pageSize === "all"
    ? items
    : items.slice((state.page - 1) * visibleCount, state.page * visibleCount);

  grid.replaceChildren();
  if (pageItems.length === 0) {
    setGridState(`No ${group.title} Found`, "No publicly available products found for this category right now. Message us to check latest stock.");
  } else {
    pageItems.forEach((item) => grid.append(renderWebItemCard(item)));
  }

  updateCatalogControls(items.length, totalPages, visibleCount);
}

async function openCategoryCatalog(categoryKey) {
  if (!categoryGroups[categoryKey]) {
    return;
  }

  state.activeCategory = categoryKey;
  state.activeSubcategory = "All";
  state.page = 1;
  setCatalogMode(true);
  setGridState("Loading Catalog", `Checking SMBSystem ${categoryGroups[categoryKey].title} items for Quezon City.`);

  try {
    await loadWebItems();
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

function bindCatalogUi() {
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

  document.querySelector("[data-back-to-categories]")?.addEventListener("click", () => {
    setCatalogMode(false);
    state.activeCategory = null;
    updateActiveCategoryNav();
    loadNewArrivalItems();
    document.querySelector("#bikes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelectorAll("[data-page-size]").forEach((button) => {
    button.addEventListener("click", () => {
      state.pageSize = button.dataset.pageSize === "all" ? "all" : Number(button.dataset.pageSize);
      state.page = 1;
      renderCatalog();
    });
  });

  document.querySelector("[data-sort-select]")?.addEventListener("change", (event) => {
    state.sort = event.target.value;
    state.page = 1;
    renderCatalog();
  });

  document.querySelectorAll("[data-page-action]").forEach((button) => {
    button.addEventListener("click", () => {
      state.page += button.dataset.pageAction === "prev" ? -1 : 1;
      renderCatalog();
    });
  });
}

function getProfileElements() {
  return {
    authActions: document.querySelector("[data-auth-actions]"),
    avatar: document.querySelector("[data-profile-avatar]"),
    emptyState: document.querySelector("[data-profile-empty]"),
    form: document.querySelector("[data-profile-form]"),
    name: document.querySelector("[data-profile-name]"),
    email: document.querySelector("[data-profile-email]"),
    logout: document.querySelector("[data-profile-logout]"),
    otherBikeField: document.querySelector("[data-other-bike-field]"),
    status: document.querySelector("[data-profile-status]")
  };
}

function setProfileStatus(message, type = "info") {
  const { status } = getProfileElements();
  if (!status) {
    return;
  }

  status.textContent = message;
  status.dataset.statusType = type;
  status.hidden = !message;
}

function getDisplayName(profile) {
  const firstName = profile?.firstName || "";
  const lastName = profile?.lastName || "";
  return [firstName, lastName].filter(Boolean).join(" ").trim() || profile?.displayName || "SarapMagBike Customer";
}

function setAvatar(profile) {
  const { avatar } = getProfileElements();
  if (!avatar) {
    return;
  }

  const photoUrl = normalizeImageUrl(profile?.profilePhotoUrl || profile?.photoUrl || "");
  avatar.replaceChildren();
  avatar.style.backgroundImage = "";
  avatar.textContent = "";

  if (photoUrl) {
    const image = document.createElement("img");
    image.alt = `${getDisplayName(profile)} profile picture`;
    image.src = photoUrl;
    avatar.append(image);
    return;
  }

  const initials = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .map((part) => part.trim().slice(0, 1).toUpperCase())
    .join("");
  avatar.textContent = initials || "SMB";
}

function setProfileMode(mode) {
  const { authActions, emptyState, form, logout } = getProfileElements();
  const isSignedIn = mode === "signed-in";
  const isUnavailable = mode === "unavailable";

  if (authActions) {
    authActions.hidden = isSignedIn;
  }
  if (form) {
    form.hidden = !isSignedIn;
  }
  if (logout) {
    logout.hidden = !isSignedIn;
  }
  if (emptyState) {
    emptyState.hidden = !isUnavailable;
  }
}

function setBikeTypeValues(form, values = []) {
  const selectedTypes = new Set(Array.isArray(values) ? values : []);
  form.querySelectorAll('input[name="bikeTypes"]').forEach((input) => {
    input.checked = selectedTypes.has(input.value);
  });
  toggleOtherBikeField();
}

function getBikeTypeValues(form) {
  return Array.from(form.querySelectorAll('input[name="bikeTypes"]:checked'))
    .map((input) => input.value)
    .filter((value) => bikeTypes.includes(value));
}

function toggleOtherBikeField() {
  const { form, otherBikeField } = getProfileElements();
  if (!form || !otherBikeField) {
    return;
  }

  const hasOthers = form.querySelector('input[name="bikeTypes"][value="Others"]')?.checked || false;
  otherBikeField.hidden = !hasOthers;
  const input = otherBikeField.querySelector("input");
  if (input && !hasOthers) {
    input.value = "";
  }
}

function fillProfileForm(profile) {
  const { form, name, email } = getProfileElements();
  if (!form) {
    return;
  }

  form.elements.firstName.value = profile.firstName || "";
  form.elements.lastName.value = profile.lastName || "";
  form.elements.mobileNumber.value = profile.mobileNumber || "";
  form.elements.birthdate.value = profile.birthdate || "";
  form.elements.hometown.value = profile.hometown || "";
  form.elements.otherBikeType.value = profile.otherBikeType || "";
  setBikeTypeValues(form, profile.bikeTypes || []);

  if (name) {
    name.textContent = getDisplayName(profile);
  }
  if (email) {
    email.textContent = profile.email || "Customer account";
  }

  setAvatar(profile);
}

function validateProfilePayload(payload) {
  const mobileNumber = payload.mobileNumber.trim();
  if (mobileNumber && !/^(\+639|09)\d{9}$/.test(mobileNumber)) {
    return "Use a Philippine mobile number like 09xxxxxxxxx or +639xxxxxxxxx.";
  }

  if (payload.bikeTypes.includes("Others") && !payload.otherBikeType.trim()) {
    return "Please specify the other bike type.";
  }

  return "";
}

async function loadCustomerProfile() {
  const { name, email } = getProfileElements();
  setProfileStatus("Checking your customer session...");

  try {
    await apiRequest("/api/public/auth/session");
    const profile = await apiRequest("/api/public/customer/profile");
    fillProfileForm(profile || {});
    setProfileMode("signed-in");
    setProfileStatus("Profile loaded.", "success");
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      setProfileMode("signed-out");
      if (name) {
        name.textContent = "Sign in to update your profile";
      }
      if (email) {
        email.textContent = "Use Google or Facebook to continue.";
      }
      setAvatar(null);
      setProfileStatus("");
      return;
    }

    setProfileMode("unavailable");
    if (name) {
      name.textContent = "Customer login pending";
    }
    if (email) {
      email.textContent = "Gmail and Facebook login will connect through SMBSystem.";
    }
    setAvatar(null);
    setProfileStatus("Customer login and profile endpoints are not reachable yet.", "error");
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const { form } = getProfileElements();
  if (!form) {
    return;
  }

  const payload = {
    firstName: form.elements.firstName.value.trim(),
    lastName: form.elements.lastName.value.trim(),
    mobileNumber: form.elements.mobileNumber.value.trim(),
    birthdate: form.elements.birthdate.value,
    hometown: form.elements.hometown.value.trim(),
    bikeTypes: getBikeTypeValues(form),
    otherBikeType: form.elements.otherBikeType.value.trim()
  };

  const validationMessage = validateProfilePayload(payload);
  if (validationMessage) {
    setProfileStatus(validationMessage, "error");
    return;
  }

  setProfileStatus("Saving profile...");
  try {
    await apiRequest("/api/public/customer/profile", {
      body: JSON.stringify(payload),
      method: "PUT"
    });

    const photo = form.elements.profilePhoto.files[0];
    if (photo) {
      const upload = new FormData();
      upload.append("profilePhoto", photo);
      await apiRequest("/api/public/customer/profile/photo", {
        body: upload,
        method: "POST"
      });
      form.elements.profilePhoto.value = "";
    }

    await loadCustomerProfile();
    setProfileStatus("Profile saved.", "success");
  } catch (error) {
    setProfileStatus("SMBSystem customer profile API is not reachable yet.", "error");
  }
}

function bindProfileUi() {
  const { form, logout } = getProfileElements();
  if (!form) {
    return;
  }

  document.querySelectorAll("[data-auth-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const provider = button.dataset.authProvider;
      if (!provider) {
        return;
      }
      setProfileStatus(`Opening ${provider === "facebook" ? "Facebook" : "Gmail"} login...`);
      window.location.href = getAuthStartUrl(provider);
    });
  });

  form.addEventListener("submit", saveProfile);
  form.querySelectorAll('input[name="bikeTypes"]').forEach((input) => {
    input.addEventListener("change", toggleOtherBikeField);
  });
  form.elements.profilePhoto.addEventListener("change", () => {
    const file = form.elements.profilePhoto.files[0];
    if (file && !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      form.elements.profilePhoto.value = "";
      setProfileStatus("Upload PNG, JPG, or WEBP profile pictures only.", "error");
    }
  });
  document.querySelector("[data-profile-refresh]")?.addEventListener("click", loadCustomerProfile);
  logout?.addEventListener("click", async () => {
    try {
      await apiRequest("/api/public/auth/logout", { method: "POST" });
    } catch (error) {
      setProfileStatus("Sign out endpoint is not reachable yet.", "error");
      return;
    }
    await loadCustomerProfile();
  });

  setProfileMode("signed-out");
  loadCustomerProfile();
}

function startCatalog() {
  bindCatalogUi();
  bindProfileUi();
  loadNewArrivalItems();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startCatalog);
} else {
  startCatalog();
}
