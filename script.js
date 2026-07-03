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
  document.body.classList.toggle("is-catalog-mode", isCatalogMode);
  document.querySelector("[data-catalog-panel]").hidden = !isCatalogMode;
  document.querySelector("[data-home-products]").hidden = isCatalogMode;
  document.querySelectorAll("[data-home-section]").forEach((section) => {
    section.hidden = isCatalogMode;
  });
}

function returnToHome() {
  setCatalogMode(false);
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
  state.categoryGroups.forEach((group) => {
    const link = document.createElement("a");
    link.href = "#products";
    link.dataset.categoryNav = group.key;
    link.textContent = group.title;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openCategoryCatalog(group.key);
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
    returnToHome();
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
  loadNewArrivalItems();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startCatalog);
} else {
  startCatalog();
}
