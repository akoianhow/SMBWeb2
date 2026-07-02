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

const accountState = {
  mode: "register",
  profile: null
};

const riderTypes = ["MTB", "Road bike", "Gravel Bike", "Folding", "Hybrid", "Others"];

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
      const body = await response.clone().json();
      if (body?.message) {
        message = body.message;
      }
    } catch (parseError) {
      // Keep the HTTP status message when the API returns an empty body.
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

function getAccountElements() {
  return {
    panel: document.querySelector("[data-account-panel]"),
    form: document.querySelector("[data-account-form]"),
    loginForm: document.querySelector("[data-login-form]"),
    logout: document.querySelector("[data-account-logout]"),
    reset: document.querySelector("[data-account-reset]"),
    registerJump: document.querySelector("[data-register-jump]"),
    submit: document.querySelector("[data-account-submit]"),
    title: document.querySelector("[data-account-title]"),
    kicker: document.querySelector("[data-account-kicker]"),
    avatar: document.querySelector("[data-account-avatar]"),
    name: document.querySelector("[data-account-name]"),
    username: document.querySelector("[data-account-username]"),
    status: document.querySelector("[data-account-status]"),
    passwordRow: document.querySelector("[data-password-row]")
  };
}

function setAccountStatus(message, type = "info") {
  const { status } = getAccountElements();
  if (!status) {
    return;
  }

  status.textContent = message;
  status.dataset.statusType = type;
}

function setAccountAvatar(profile) {
  const { avatar } = getAccountElements();
  if (!avatar) {
    return;
  }

  avatar.replaceChildren();
  if (profile?.profilePhotoUrl) {
    const image = document.createElement("img");
    image.alt = `${profile.displayName || "Customer"} profile picture`;
    image.src = normalizeImageUrl(profile.profilePhotoUrl);
    avatar.append(image);
    return;
  }

  const initials = String(profile?.displayName || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");
  avatar.textContent = initials || "SMB";
}

function getSelectedRiderTypes(form) {
  return Array.from(form.querySelectorAll('input[name="riderTypes"]:checked'))
    .map((input) => input.value)
    .filter((value) => riderTypes.includes(value));
}

function setSelectedRiderTypes(form, values = []) {
  const selected = new Set(Array.isArray(values) ? values : []);
  form.querySelectorAll('input[name="riderTypes"]').forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function showAccountPanel() {
  const { panel } = getAccountElements();
  if (panel) {
    panel.hidden = false;
  }
  setCatalogMode(false);
  document.body.classList.add("is-account-mode");
}

function hideAccountPanel() {
  const { panel } = getAccountElements();
  if (panel) {
    panel.hidden = true;
  }
  document.body.classList.remove("is-account-mode");
}

function setAccountMode(mode, profile = null) {
  const { form, logout, submit, title, kicker, name, username, passwordRow } = getAccountElements();
  accountState.mode = mode;
  accountState.profile = profile;
  const isProfile = mode === "profile";

  if (logout) {
    logout.hidden = !isProfile;
  }
  if (submit) {
    submit.textContent = isProfile ? "Save Profile" : "Register";
  }
  if (title) {
    title.textContent = isProfile ? "Edit your SarapMagBike profile" : "Create your SarapMagBike profile";
  }
  if (kicker) {
    kicker.textContent = isProfile ? "Customer Profile" : "Customer Registration";
  }
  if (name) {
    name.textContent = profile?.displayName || "Register or login";
  }
  if (username) {
    username.textContent = profile?.username ? `@${profile.username}` : "Use your SMBWeb2 username and password.";
  }
  if (passwordRow) {
    passwordRow.hidden = isProfile;
  }
  if (form) {
    form.elements.username.readOnly = isProfile;
    form.elements.username.required = !isProfile;
    form.elements.password.required = !isProfile;
    form.elements.confirmPassword.required = !isProfile;
  }

  setAccountAvatar(profile);
}

function fillAccountForm(profile) {
  const { form } = getAccountElements();
  if (!form) {
    return;
  }

  form.elements.username.value = profile?.username || "";
  form.elements.password.value = "";
  form.elements.confirmPassword.value = "";
  form.elements.displayName.value = profile?.displayName || "";
  form.elements.hometown.value = profile?.hometown || "";
  form.elements.birthday.value = profile?.birthday || "";
  setSelectedRiderTypes(form, profile?.riderTypes || []);
}

function resetRegistrationForm({ show = true } = {}) {
  const { form } = getAccountElements();
  if (!form) {
    return;
  }

  form.reset();
  setAccountMode("register");
  setAccountStatus("");
  if (show) {
    showAccountPanel();
    form.elements.username.focus();
  } else {
    hideAccountPanel();
  }
}

async function loadCustomerAccount() {
  try {
    const session = await apiRequest("/api/public/customer-account/session");
    const profile = session?.customer;
    setAccountMode("profile", profile);
    fillAccountForm(profile);
    showAccountPanel();
    setAccountStatus("You are logged in. You can edit your profile.", "success");
  } catch (error) {
    setAccountMode("register");
    fillAccountForm(null);
    hideAccountPanel();
    setAccountStatus("");
  }
}

function validateAccountForm(form) {
  const displayName = form.elements.displayName.value.trim();
  if (!displayName) {
    return "Display name is required.";
  }

  if (accountState.mode === "register") {
    const username = form.elements.username.value.trim();
    const password = form.elements.password.value;
    const confirmPassword = form.elements.confirmPassword.value;
    if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) {
      return "Username must be 3-40 characters using letters, numbers, dot, dash, or underscore.";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (password !== confirmPassword) {
      return "Password confirmation does not match.";
    }
  }

  return "";
}

async function uploadProfilePhotoIfNeeded(form) {
  const file = form.elements.profilePhoto.files[0];
  if (!file) {
    return;
  }

  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
    throw new Error("Upload a PNG, JPG, or WEBP profile picture up to 2 MB.");
  }

  const data = new FormData();
  data.append("profilePhoto", file);
  await apiRequest("/api/public/customer-account/profile/photo", {
    body: data,
    method: "POST"
  });
  form.elements.profilePhoto.value = "";
}

async function submitAccountForm(event) {
  event.preventDefault();
  const { form } = getAccountElements();
  if (!form) {
    return;
  }

  const validation = validateAccountForm(form);
  if (validation) {
    setAccountStatus(validation, "error");
    return;
  }

  const payload = {
    displayName: form.elements.displayName.value.trim(),
    hometown: form.elements.hometown.value.trim(),
    birthday: form.elements.birthday.value || null,
    riderTypes: getSelectedRiderTypes(form)
  };

  try {
    setAccountStatus(accountState.mode === "profile" ? "Saving profile..." : "Creating account...");
    if (accountState.mode === "profile") {
      await apiRequest("/api/public/customer-account/profile", {
        body: JSON.stringify(payload),
        method: "PUT"
      });
    } else {
      await apiRequest("/api/public/customer-account/register", {
        body: JSON.stringify({
          ...payload,
          username: form.elements.username.value.trim(),
          password: form.elements.password.value,
          confirmPassword: form.elements.confirmPassword.value
        }),
        method: "POST"
      });
    }

    await uploadProfilePhotoIfNeeded(form);
    await loadCustomerAccount();
    setAccountStatus(accountState.mode === "profile" ? "Profile saved." : "Account created.", "success");
  } catch (error) {
    setAccountStatus(error.message || "Customer account service is not reachable yet.", "error");
  }
}

async function submitTopbarLogin(event) {
  event.preventDefault();
  const { loginForm } = getAccountElements();
  if (!loginForm) {
    return;
  }

  try {
    setAccountStatus("Logging in...");
    await apiRequest("/api/public/customer-account/login", {
      body: JSON.stringify({
        username: loginForm.elements.username.value.trim(),
        password: loginForm.elements.password.value
      }),
      method: "POST"
    });
    loginForm.reset();
    await loadCustomerAccount();
    showAccountPanel();
    setAccountStatus("Logged in. You can edit your profile.", "success");
  } catch (error) {
    setAccountMode("register");
    showAccountPanel();
    setAccountStatus("Username or password is incorrect.", "error");
  }
}

function bindCustomerAccountUi() {
  const { form, loginForm, logout, reset, registerJump } = getAccountElements();
  if (!form) {
    return;
  }

  form.addEventListener("submit", submitAccountForm);
  loginForm?.addEventListener("submit", submitTopbarLogin);
  reset?.addEventListener("click", resetRegistrationForm);
  registerJump?.addEventListener("click", () => {
    resetRegistrationForm();
    document.querySelector("[data-account-panel]")?.scrollIntoView({ block: "start", behavior: "smooth" });
  });
  logout?.addEventListener("click", async () => {
    await apiRequest("/api/public/customer-account/logout", { method: "POST" });
    resetRegistrationForm({ show: false });
  });

  loadCustomerAccount();
}

function startCatalog() {
  bindCustomerAccountUi();
  bindCatalogUi();
  loadNewArrivalItems();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startCatalog);
} else {
  startCatalog();
}
