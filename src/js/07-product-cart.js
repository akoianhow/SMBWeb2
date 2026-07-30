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
  const source = String(html || "");
  const template = document.createElement("template");
  if (/<\/?[a-z][\s\S]*>/i.test(source)) {
    template.innerHTML = source;
  } else {
    const plainText = document.createElement("div");
    plainText.textContent = source;
    template.innerHTML = plainText.innerHTML.replace(/\r\n?|\n/g, "<br>");
  }

  const allowedTags = new Set([
    "A", "B", "BLOCKQUOTE", "BR", "CODE", "DIV", "EM",
    "H2", "H3", "H4", "H5", "H6", "HR", "I", "LI", "OL",
    "P", "PRE", "SPAN", "STRONG", "U", "UL"
  ]);

  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || "");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node;
    const cleanedChildren = Array.from(element.childNodes)
      .map(cleanNode)
      .filter(Boolean);

    if (!allowedTags.has(element.tagName)) {
      const fragment = document.createDocumentFragment();
      cleanedChildren.forEach((child) => fragment.append(child));
      return fragment;
    }

    const cleanElement = document.createElement(element.tagName.toLowerCase());
    cleanedChildren.forEach((child) => cleanElement.append(child));
    if (element.tagName === "A" && /^(https?:|mailto:|tel:)/i.test(element.getAttribute("href") || "")) {
      cleanElement.href = element.getAttribute("href");
      cleanElement.target = "_blank";
      cleanElement.rel = "noreferrer";
    }
    return cleanElement;
  };

  const cleanFragment = document.createDocumentFragment();
  Array.from(template.content.childNodes).forEach((node) => {
    const cleaned = cleanNode(node);
    if (cleaned) {
      cleanFragment.append(cleaned);
    }
  });
  const container = document.createElement("div");
  container.append(cleanFragment);
  return container.innerHTML;
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
  const selected = getSelectedPublicLocation();
  const actualStatus = getAvailabilityLabel(item);
  const card = document.createElement("article");
  card.className = "product-branch-card";
  card.append(
    createTextElement("strong", selected.name),
    createTextElement("span", actualStatus, actualStatus === "AVAILABLE" ? "available" : "ask"),
    createTextElement("p", `${selected.address || "Address not published"} | ${selected.phone || "Contact branch"}`)
  );
  availability.append(card);

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
  const originalLabel = button.dataset.defaultTooltip || "Copy link";
  const showResult = (label) => {
    button.dataset.tooltip = label;
    button.title = label;
    button.setAttribute("aria-label", label);
    window.setTimeout(() => {
      button.dataset.tooltip = originalLabel;
      button.title = originalLabel;
      button.setAttribute("aria-label", originalLabel);
    }, 1600);
  };
  try {
    await navigator.clipboard.writeText(window.location.href);
    showResult("Link copied");
  } catch {
    showResult("Copy failed");
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

const cartState = {
  storageKey: "smb-web-cart-v1",
  items: []
};

function loadCart() {
  try {
    const value = JSON.parse(window.localStorage.getItem(cartState.storageKey) || "[]");
    cartState.items = Array.isArray(value) ? value.filter((item) => item?.productId && item.quantity > 0) : [];
  } catch {
    cartState.items = [];
  }
}

function saveCart() {
  window.localStorage.setItem(cartState.storageKey, JSON.stringify(cartState.items));
  updateCartBadge();
}

function getCartItemCount() {
  return cartState.items.reduce((total, item) => total + Number(item.quantity || 0), 0);
}

function getCartTotal() {
  return cartState.items.reduce((total, item) => total + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);
}

function updateCartBadge() {
  const count = getCartItemCount();
  document.querySelectorAll("[data-cart-count]").forEach((badge) => {
    badge.textContent = String(count);
    badge.hidden = count === 0;
  });
}

function ensureCartButton() {
  const createButton = (className) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `site-cart-button ${className}`;
    button.dataset.cartOpen = "";
    button.setAttribute("aria-label", "Open shopping cart");
    button.innerHTML = '<span aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M3 3h2l2.4 10.2a2 2 0 0 0 1.95 1.55h7.9a2 2 0 0 0 1.9-1.38L21 7H6.1M9 20a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 9 20Zm8 0a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 17 20Z"/></svg></span><strong>Cart</strong><em data-cart-count hidden>0</em>';
    return button;
  };

  const desktopActions = document.querySelector(".topbar-options");
  if (desktopActions && !desktopActions.querySelector(".site-cart-button-desktop")) {
    const button = createButton("site-cart-button-desktop");
    const guestActions = desktopActions.querySelector("[data-customer-login-form]");
    if (guestActions) {
      guestActions.insertAdjacentElement("afterend", button);
    } else {
      desktopActions.append(button);
    }
  }

  const mobileActions = document.querySelector(".mobile-header-actions");
  if (!mobileActions || mobileActions.querySelector(".site-cart-button-mobile")) return;
  const mobileCart = createButton("site-cart-button-mobile");
  const accountAction = mobileActions.querySelector("[data-mobile-header-login], [data-mobile-header-session]");
  mobileActions.insertBefore(mobileCart, accountAction || null);
}

function ensureCartUi() {
  if (document.querySelector("[data-cart-modal]")) return;
  const modal = document.createElement("div");
  modal.className = "web-cart-modal";
  modal.dataset.cartModal = "";
  modal.hidden = true;
  modal.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="web-cart-title">
      <header>
        <div><p>Cash on Delivery</p><h2 id="web-cart-title">Your Cart</h2></div>
        <button type="button" data-cart-close aria-label="Close cart">Close</button>
      </header>
      <nav class="web-cart-tabs" aria-label="Cart options">
        <button type="button" data-cart-tab="cart" aria-selected="true">Your Cart</button>
        <button type="button" data-cart-tab="tracking" aria-selected="false">Track Order</button>
      </nav>
      <section data-cart-view></section>
      <section data-checkout-view hidden></section>
      <section data-order-tracking-view hidden></section>
    </div>`;
  document.body.append(modal);
  modal.querySelector("[data-cart-close]")?.addEventListener("click", closeCart);
  modal.querySelector("[data-cart-tab='cart']")?.addEventListener("click", renderCartView);
  modal.querySelector("[data-cart-tab='tracking']")?.addEventListener("click", openCartOrderTracking);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeCart();
  });
}

function openCart() {
  ensureCartUi();
  renderCartView();
  const modal = document.querySelector("[data-cart-modal]");
  modal.hidden = false;
  document.body.classList.add("has-web-cart");
}

function closeCart() {
  const modal = document.querySelector("[data-cart-modal]");
  if (modal) modal.hidden = true;
  document.body.classList.remove("has-web-cart");
}

function addProductToCart(item) {
  const selected = getSelectedProductVariant(item);
  if (selected && !selected.isAvailable) return;
  const productId = selected?.productId || item.productId;
  const existing = cartState.items.find((line) => String(line.productId) === String(productId));
  if (existing) {
    existing.quantity += 1;
  } else {
    const variantLabel = [selected?.size, selected?.color].filter(Boolean).join(" / ");
    cartState.items.push({
      productId,
      name: getItemName(item),
      sku: selected?.sku || item.sku || "",
      variantLabel,
      unitPrice: Number(item.isOnSale ? item.discountedPrice : (selected?.retailPrice ?? item.retailPrice) ?? 0),
      quantity: 1,
      imageUrl: normalizeApiUrl(getProductImageUrls(item)[0] || ""),
      location: getSelectedPublicLocationSlug()
    });
  }
  saveCart();
  openCart();
}

function createCartLine(item) {
  const row = document.createElement("article");
  row.className = "web-cart-line";
  const image = document.createElement("div");
  image.className = "web-cart-line-image";
  if (item.imageUrl) {
    const img = document.createElement("img");
    img.src = item.imageUrl;
    img.alt = item.name;
    image.append(img);
  }
  const copy = document.createElement("div");
  copy.className = "web-cart-line-copy";
  copy.append(
    createTextElement("strong", item.name),
    createTextElement("span", item.variantLabel ? `Option: ${item.variantLabel}` : `SKU: ${item.sku}`),
    createTextElement("span", item.variantLabel ? `SKU: ${item.sku}` : ""),
    createTextElement("b", pesoFormatter.format(item.unitPrice))
  );
  const controls = document.createElement("div");
  controls.className = "web-cart-line-controls";
  const minus = document.createElement("button");
  minus.type = "button"; minus.textContent = "−"; minus.setAttribute("aria-label", `Decrease ${item.name} quantity`);
  const quantity = createTextElement("span", String(item.quantity));
  const plus = document.createElement("button");
  plus.type = "button"; plus.textContent = "+"; plus.setAttribute("aria-label", `Increase ${item.name} quantity`);
  const remove = document.createElement("button");
  remove.type = "button"; remove.className = "web-cart-remove"; remove.textContent = "Remove";
  minus.addEventListener("click", () => updateCartQuantity(item.productId, item.quantity - 1));
  plus.addEventListener("click", () => updateCartQuantity(item.productId, item.quantity + 1));
  remove.addEventListener("click", () => updateCartQuantity(item.productId, 0));
  controls.append(minus, quantity, plus, remove);
  row.append(image, copy, controls);
  return row;
}

function updateCartQuantity(productId, quantity) {
  if (quantity <= 0) {
    cartState.items = cartState.items.filter((item) => String(item.productId) !== String(productId));
  } else {
    const item = cartState.items.find((line) => String(line.productId) === String(productId));
    if (item) item.quantity = Math.min(99, quantity);
  }
  saveCart();
  renderCartView();
}

function renderCartView() {
  const cartView = document.querySelector("[data-cart-view]");
  const checkoutView = document.querySelector("[data-checkout-view]");
  const trackingView = document.querySelector("[data-order-tracking-view]");
  if (!cartView || !checkoutView || !trackingView) return;
  setCartModalTab("cart");
  checkoutView.hidden = true;
  trackingView.hidden = true;
  cartView.hidden = false;
  cartView.replaceChildren();
  if (cartState.items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "web-cart-empty";
    empty.append(createTextElement("h3", "Your cart is empty"), createTextElement("p", "Choose an available product option to start an order."));
    const shop = document.createElement("button");
    shop.type = "button"; shop.textContent = "Continue Shopping"; shop.addEventListener("click", closeCart);
    empty.append(shop); cartView.append(empty); return;
  }
  const list = document.createElement("div");
  list.className = "web-cart-lines";
  cartState.items.forEach((item) => list.append(createCartLine(item)));
  const summary = document.createElement("div");
  summary.className = "web-cart-summary";
  summary.innerHTML = `<div><span>Total items</span><strong>${getCartItemCount()}</strong></div><div><span>Subtotal</span><strong>${pesoFormatter.format(getCartTotal())}</strong></div>`;
  const checkout = document.createElement("button");
  checkout.type = "button"; checkout.className = "web-cart-primary"; checkout.textContent = "Proceed to Checkout";
  checkout.addEventListener("click", renderCheckoutView);
  const continueShopping = document.createElement("button");
  continueShopping.type = "button"; continueShopping.className = "web-cart-secondary"; continueShopping.textContent = "Continue Shopping";
  continueShopping.addEventListener("click", closeCart);
  cartView.append(list, summary, checkout, continueShopping);
}

function setCartModalTab(activeTab) {
  document.querySelectorAll("[data-cart-tab]").forEach((button) => {
    const isActive = button.dataset.cartTab === activeTab;
    button.setAttribute("aria-selected", String(isActive));
  });
}

function extractGuestTrackingCode(value) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "";
  try {
    const url = new URL(cleaned, window.location.href);
    return url.searchParams.get("token") || cleaned;
  } catch {
    return cleaned;
  }
}

async function openCartOrderTracking() {
  if (!customerState.account) {
    try {
      customerState.account = await apiRequest("/api/public/customer-account/session");
      updateCustomerHeader();
    } catch {
      customerState.account = null;
    }
  }
  if (customerState.account) {
    window.location.href = "orders.html";
    return;
  }
  renderOrderTrackingView();
}

function renderOrderTrackingView() {
  if (customerState.account) {
    window.location.href = "orders.html";
    return;
  }
  const cartView = document.querySelector("[data-cart-view]");
  const checkoutView = document.querySelector("[data-checkout-view]");
  const trackingView = document.querySelector("[data-order-tracking-view]");
  if (!cartView || !checkoutView || !trackingView) return;
  setCartModalTab("tracking");
  cartView.hidden = true;
  checkoutView.hidden = true;
  trackingView.hidden = false;
  trackingView.innerHTML = `
    <div class="web-order-tracking-intro">
      <p>Order tracking</p>
      <h3>Track your order</h3>
      <span>Enter the order number and private tracking code provided after guest checkout. No OTP is required.</span>
    </div>
    <form class="web-order-tracking-form" data-order-tracking-form>
      <label>Order number
        <input name="orderNumber" maxlength="40" required autocomplete="off" placeholder="SMB-YYYYMMDD-ABC123">
      </label>
      <label>Private tracking code or link
        <input name="trackingCode" maxlength="500" required autocomplete="off" placeholder="Paste your code or complete tracking link">
      </label>
      <p>Your mobile number is never used as the tracking password.</p>
      <p data-order-tracking-message role="status"></p>
      <button class="web-cart-primary" type="submit">Track Order</button>
    </form>
    <div class="web-order-tracking-help">
      <strong>Lost your tracking details?</strong>
      <span>Contact SarapMagBike and provide your order number. Staff will verify the order before sharing an update.</span>
      <a href="index.html#contact" data-order-tracking-contact>Contact the shop</a>
    </div>`;
  trackingView.querySelector("[data-order-tracking-form]")?.addEventListener("submit", submitGuestOrderTracking);
  trackingView.querySelector("[data-order-tracking-contact]")?.addEventListener("click", closeCart);
}

async function submitGuestOrderTracking(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector("[data-order-tracking-message]");
  const submit = form.querySelector("button[type='submit']");
  const orderNumber = form.elements.orderNumber.value.trim().toUpperCase();
  const trackingCode = extractGuestTrackingCode(form.elements.trackingCode.value);
  submit.disabled = true;
  setMessage(message, "Opening your order...");
  try {
    const result = await apiRequest("/api/public/web-orders/guest/track", {
      method: "POST",
      body: JSON.stringify({ orderNumber, trackingCode })
    });
    window.location.href = `guest-order.html?id=${encodeURIComponent(result.id)}&token=${encodeURIComponent(trackingCode)}`;
  } catch {
    setMessage(message, "Order could not be opened. Check your tracking details and try again.", "error");
    submit.disabled = false;
  }
}

function renderCheckoutView() {
  const cartView = document.querySelector("[data-cart-view]");
  const checkoutView = document.querySelector("[data-checkout-view]");
  const trackingView = document.querySelector("[data-order-tracking-view]");
  if (!cartView || !checkoutView || !trackingView || cartState.items.length === 0) return;
  setCartModalTab("cart");
  const isGuest = !customerState.account;
  cartView.hidden = true;
  trackingView.hidden = true;
  checkoutView.hidden = false;
  checkoutView.innerHTML = `
    <button type="button" class="web-checkout-back" data-checkout-back>← Back to cart</button>
    <div class="web-checkout-mode">
      <strong>${isGuest ? "Guest checkout" : "Signed-in checkout"}</strong>
      <span>${isGuest ? "No account or OTP required. Your order will not earn loyalty points unless it is securely linked later." : "This order will appear in My Orders and eligible points will be awarded after completion."}</span>
    </div>
    <div class="web-checkout-summary">
      <div><span>Total items</span><strong>${getCartItemCount()}</strong></div>
      <div><span>Total amount</span><strong>${pesoFormatter.format(getCartTotal())}</strong></div>
    </div>
    <form class="web-checkout-form" data-checkout-form>
      <fieldset>
        <legend>Fulfillment</legend>
        <div class="web-fulfillment-options">
          <label>
            <input type="radio" name="fulfillmentType" value="delivery" checked>
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h11v10H3z"></path>
                <path d="M14 9h4l3 3v4h-7z"></path>
                <circle cx="7" cy="18" r="2"></circle>
                <circle cx="18" cy="18" r="2"></circle>
              </svg>
              Shipping
            </span>
          </label>
          <label>
            <input type="radio" name="fulfillmentType" value="pickup">
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 3h8l2 4-6 3-6-3z"></path>
                <path d="M12 10v5"></path>
                <path d="M3 14h5l2 2h6.5a2 2 0 0 1 0 4H9l-6-3z"></path>
              </svg>
              Pickup at Shop
            </span>
          </label>
        </div>
      </fieldset>
      <label>Full name<input name="customerName" maxlength="160" required autocomplete="name"></label>
      <div class="web-checkout-field-grid">
        <label>Mobile number<input name="mobileNumber" maxlength="20" required inputmode="tel" autocomplete="tel" placeholder="09XXXXXXXXX"></label>
        <label>Confirm mobile number<input name="mobileNumberConfirmation" maxlength="20" required inputmode="tel" autocomplete="tel" placeholder="Re-enter mobile number"></label>
      </div>
      <label>Email address <small>Optional — for receipt and updates</small><input name="email" maxlength="240" type="email" autocomplete="email"></label>
      <fieldset class="web-shipping-fields" data-shipping-address>
        <legend>Delivery address</legend>
        <label>Street, house/building and subdivision<input name="streetAddress" maxlength="220" required autocomplete="address-line1" placeholder="House no., street, subdivision"></label>
        <div class="web-checkout-field-grid">
          <label>Barangay<input name="barangay" maxlength="120" required autocomplete="address-level3"></label>
          <label>City / Municipality<input name="cityMunicipality" maxlength="120" required autocomplete="address-level2"></label>
          <label>Province<input name="province" maxlength="120" required autocomplete="address-level1"></label>
          <label>Region<input name="region" maxlength="120" required></label>
          <label>Postal code<input name="postalCode" maxlength="4" pattern="[0-9]{4}" required inputmode="numeric" autocomplete="postal-code" placeholder="4 digits"></label>
          <label>Landmark <small>Optional</small><input name="landmark" maxlength="160" autocomplete="address-line2"></label>
        </div>
      </fieldset>
      <p data-pickup-note hidden>Pickup at SarapMagBike ${getSelectedPublicLocationName()}: ${getSelectedPublicLocation().address}</p>
      <input class="website-field" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="web-checkout-note" data-checkout-note>Pay cash when your order is delivered. SarapMagBike will confirm availability and the shipping fee before dispatch.</p>
      <section class="web-checkout-review" data-checkout-review hidden>
        <div><span>Customer</span><strong data-review-customer></strong></div>
        <div><span>Contact</span><strong data-review-contact></strong></div>
        <div><span>Fulfillment</span><strong data-review-fulfillment></strong></div>
        <div><span>Items</span><strong>${getCartItemCount()} · ${pesoFormatter.format(getCartTotal())}</strong></div>
        <label><input type="checkbox" name="detailsConfirmed"> I reviewed my contact, delivery, and order information and confirm they are correct.</label>
        <p>SarapMagBike staff or the courier may call or message this number to confirm the order.</p>
      </section>
      <p data-checkout-message role="status"></p>
      <button class="web-cart-primary" type="submit" data-checkout-submit>Review Shipping Order</button>
    </form>`;
  checkoutView.querySelector("[data-checkout-back]")?.addEventListener("click", renderCartView);
  const form = checkoutView.querySelector("[data-checkout-form]");
  form.dataset.clientRequestId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-checkout`;
  form.elements.customerName.value = customerState.profile?.displayName || customerState.account?.username || "";
  form.elements.mobileNumber.value = customerState.account?.mobileNumber || "";
  form.elements.mobileNumberConfirmation.value = customerState.account?.mobileNumber || "";
  form.elements.email.value = customerState.account?.email || "";
  form.addEventListener("change", (event) => {
    if (event.target?.name === "fulfillmentType") updateFulfillmentFields(event);
  });
  form.addEventListener("input", resetCheckoutReview);
  form.addEventListener("submit", reviewOrSubmitWebOrder);
}

function updateFulfillmentFields(event) {
  const form = event.currentTarget.closest?.("[data-checkout-form]") || event.currentTarget;
  if (!form?.elements?.fulfillmentType) return;
  const delivery = form.elements.fulfillmentType.value === "delivery";
  const address = form.querySelector("[data-shipping-address]");
  const pickup = form.querySelector("[data-pickup-note]");
  const note = form.querySelector("[data-checkout-note]");
  const submit = form.querySelector("[data-checkout-submit]");
  address.hidden = !delivery;
  address.querySelectorAll("input").forEach((input) => {
    if (!["landmark"].includes(input.name)) input.required = delivery;
  });
  pickup.hidden = delivery;
  if (note) {
    note.textContent = delivery
      ? "Pay cash when your order is delivered. SarapMagBike will confirm availability and the shipping fee before dispatch."
      : "Pay at the shop when your order is ready for pickup. SarapMagBike will confirm availability before preparing it.";
  }
  if (submit) submit.textContent = delivery ? "Review Shipping Order" : "Review Pickup Order";
  resetCheckoutReview({ currentTarget: form });
}

function normalizeCheckoutMobile(value) {
  const compact = String(value || "").replace(/[\s\-().]/g, "");
  if (/^09\d{9}$/.test(compact)) return `+63${compact.slice(1)}`;
  if (/^639\d{9}$/.test(compact)) return `+${compact}`;
  return compact;
}

function formatCheckoutAddress(form) {
  return [
    form.elements.streetAddress.value.trim(),
    `Brgy. ${form.elements.barangay.value.trim()}`,
    form.elements.cityMunicipality.value.trim(),
    form.elements.province.value.trim(),
    form.elements.region.value.trim(),
    form.elements.postalCode.value.trim(),
    form.elements.landmark.value.trim() ? `Landmark: ${form.elements.landmark.value.trim()}` : ""
  ].filter(Boolean).join(", ");
}

function resetCheckoutReview(event) {
  const form = event.currentTarget;
  if (!form || event.target?.name === "detailsConfirmed") return;
  form.dataset.reviewReady = "";
  const review = form.querySelector("[data-checkout-review]");
  if (review) review.hidden = true;
  if (form.elements.detailsConfirmed) form.elements.detailsConfirmed.checked = false;
  const delivery = form.elements.fulfillmentType.value === "delivery";
  const submit = form.querySelector("[data-checkout-submit]");
  if (submit) submit.textContent = delivery ? "Review Shipping Order" : "Review Pickup Order";
}

async function reviewOrSubmitWebOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector("[data-checkout-message]");
  const submit = form.querySelector("button[type='submit']");
  const mobile = normalizeCheckoutMobile(form.elements.mobileNumber.value);
  const mobileConfirmation = normalizeCheckoutMobile(form.elements.mobileNumberConfirmation.value);
  if (!/^\+639\d{9}$/.test(mobile)) {
    setMessage(message, "Enter a valid Philippine mobile number, such as 09XXXXXXXXX.", "error");
    form.elements.mobileNumber.focus();
    return;
  }
  if (mobile !== mobileConfirmation) {
    setMessage(message, "The mobile numbers do not match.", "error");
    form.elements.mobileNumberConfirmation.focus();
    return;
  }
  if (form.dataset.reviewReady !== "true") {
    const delivery = form.elements.fulfillmentType.value === "delivery";
    form.querySelector("[data-review-customer]").textContent = form.elements.customerName.value.trim();
    form.querySelector("[data-review-contact]").textContent = `${mobile}${form.elements.email.value.trim() ? ` · ${form.elements.email.value.trim()}` : ""}`;
    form.querySelector("[data-review-fulfillment]").textContent = delivery
      ? `Shipping · Cash on Delivery · ${formatCheckoutAddress(form)}`
      : `Pickup · SarapMagBike ${getSelectedPublicLocationName()}`;
    form.querySelector("[data-checkout-review]").hidden = false;
    form.dataset.reviewReady = "true";
    submit.textContent = delivery ? "Place Shipping Order" : "Place Pickup Order";
    setMessage(message, "Review the summary and confirm your details before placing the order.");
    form.querySelector("[data-checkout-review]").scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }
  if (!form.elements.detailsConfirmed.checked) {
    setMessage(message, "Confirm that you reviewed your order and contact details.", "error");
    form.elements.detailsConfirmed.focus();
    return;
  }
  submit.disabled = true;
  setMessage(message, "Submitting your order...");
  try {
    const result = await apiRequest(withPublicLocation("/api/public/web-orders"), {
      method: "POST",
      body: JSON.stringify({
        customerName: form.elements.customerName.value.trim(),
        mobileNumber: mobile,
        mobileNumberConfirmation: mobileConfirmation,
        email: form.elements.email.value.trim(),
        fulfillmentType: form.elements.fulfillmentType.value,
        streetAddress: form.elements.streetAddress.value.trim(),
        barangay: form.elements.barangay.value.trim(),
        cityMunicipality: form.elements.cityMunicipality.value.trim(),
        province: form.elements.province.value.trim(),
        region: form.elements.region.value.trim(),
        postalCode: form.elements.postalCode.value.trim(),
        landmark: form.elements.landmark.value.trim(),
        clientRequestId: form.dataset.clientRequestId,
        detailsConfirmed: true,
        website: form.elements.website.value,
        items: cartState.items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      })
    });
    cartState.items = [];
    saveCart();
    showOrderConfirmation(result);
  } catch (error) {
    setMessage(message, error.message || "Order could not be submitted. Please review your details and try again.", "error");
  } finally {
    submit.disabled = false;
  }
}

function showOrderConfirmation(order) {
  closeCart();
  const modal = document.createElement("div");
  modal.className = "web-order-confirmation";
  const isGuestOrder = Boolean(order.isGuestOrder && order.guestAccessToken);
  const trackingPath = isGuestOrder
    ? `guest-order.html?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.guestAccessToken)}`
    : "orders.html";
  const trackingUrl = new URL(trackingPath, window.location.href).href;
  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "order-confirmation-title");

  const checkmark = createTextElement("span", "✓");
  checkmark.setAttribute("aria-hidden", "true");
  const title = createTextElement("h2", "Order Received");
  title.id = "order-confirmation-title";
  dialog.append(
    checkmark,
    title,
    createTextElement("p", order.message || "Thank you! We received your order. We’ll confirm availability and delivery details before dispatch."),
    createTextElement("strong", `Order No. ${order.orderNumber || ""}`)
  );

  let copyMessage = null;
  if (isGuestOrder) {
    const tracking = document.createElement("div");
    tracking.className = "web-order-tracking-save";
    const trackingButtons = document.createElement("div");
    const copyCode = createTextElement("button", "Copy Tracking Code");
    const copyLink = createTextElement("button", "Copy Tracking Link");
    copyCode.type = "button";
    copyLink.type = "button";
    copyMessage = document.createElement("small");
    copyMessage.setAttribute("role", "status");
    copyCode.addEventListener("click", () => copyGuestTrackingValue(order.guestAccessToken, "Tracking code copied.", copyMessage));
    copyLink.addEventListener("click", () => copyGuestTrackingValue(trackingUrl, "Private tracking link copied.", copyMessage));
    trackingButtons.append(copyCode, copyLink);
    tracking.append(
      createTextElement("span", "Private tracking code"),
      createTextElement("code", order.guestAccessToken),
      createTextElement("p", "Save this code or private link. It replaces OTP for guest order tracking."),
      trackingButtons,
      copyMessage
    );
    dialog.append(tracking);
  }

  const actions = document.createElement("div");
  actions.className = "web-order-confirmation-actions";
  const trackingLink = createTextElement("a", "Track My Order");
  trackingLink.href = trackingPath;
  const close = createTextElement("button", "Continue Shopping");
  close.type = "button";
  close.addEventListener("click", () => modal.remove());
  actions.append(trackingLink, close);
  dialog.append(actions);
  modal.append(dialog);
  document.body.append(modal);
}

async function copyGuestTrackingValue(value, successMessage, messageElement) {
  try {
    await navigator.clipboard.writeText(value);
    setMessage(messageElement, successMessage);
  } catch {
    setMessage(messageElement, "Copy was blocked. Select and copy the tracking code manually.", "error");
  }
}

function initializeCartUi() {
  loadCart();
  ensureCartButton();
  ensureCartUi();
  document.querySelectorAll("[data-cart-open]").forEach((button) => button.addEventListener("click", openCart));
  updateCartBadge();
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCart();
  });
}

function getSelectedProductVariant(item) {
  if (!item.hasVariants || !Array.isArray(item.variants) || item.variants.length === 0) {
    return null;
  }

  return item.variants.find((variant) => String(variant.productId) === String(item._selectedVariantId))
    || item.variants.find((variant) => variant.isDefault && variant.isAvailable)
    || item.variants.find((variant) => variant.isAvailable)
    || item.variants.find((variant) => variant.isDefault)
    || item.variants[0];
}

function renderProductVariantPicker(item, selectedVariant) {
  const picker = document.createElement("section");
  picker.className = "product-variant-picker";

  const controls = document.createElement("div");
  controls.className = "product-variant-controls";
  const mode = item.variantMode || "size";
  const optionLabel = mode === "color" ? "Color" : mode === "size" ? "Size" : "Size / Color";
  const field = document.createElement("div");
  field.className = "product-variant-field";
  field.append(createTextElement("span", optionLabel, "product-variant-label"));

  const swatches = document.createElement("div");
  swatches.className = "product-variant-swatches";
  swatches.setAttribute("role", "group");
  swatches.setAttribute("aria-label", `Choose ${optionLabel.toLowerCase()}`);

  item.variants.forEach((variant) => {
    const values = [
      ...(mode !== "color" && variant.size ? [variant.size] : []),
      ...(mode !== "size" && variant.color ? [variant.color] : [])
    ];
    const valueLabel = values.join(" / ") || variant.sku || "Option";
    const isSelected = String(variant.productId) === String(selectedVariant?.productId);
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "product-variant-swatch";
    swatch.textContent = valueLabel;
    swatch.disabled = !variant.isAvailable;
    swatch.classList.toggle("is-selected", isSelected);
    swatch.classList.toggle("is-unavailable", !variant.isAvailable);
    swatch.setAttribute("aria-pressed", String(isSelected));
    swatch.setAttribute("aria-label", `${valueLabel}: ${variant.stockStatus || (variant.isAvailable ? "Available" : "Out of stock")}`);
    swatch.title = variant.stockStatus || (variant.isAvailable ? "Available" : "Out of stock");
    swatch.addEventListener("click", () => {
      renderProductDetail({ ...item, _selectedVariantId: variant.productId });
    });
    swatches.append(swatch);
  });

  field.append(swatches);
  controls.append(field);

  picker.append(controls);
  if (selectedVariant) {
    const status = document.createElement("p");
    status.className = selectedVariant.isAvailable ? "available" : "unavailable";
    status.textContent = `${selectedVariant.sku} · ${selectedVariant.stockStatus}`;
    picker.append(status);
  }
  return picker;
}

function renderProductDetail(item) {
  const root = getProductDetailRoot();
  if (!root) {
    return;
  }

  const selectedVariant = getSelectedProductVariant(item);
  if (selectedVariant) {
    item = {
      ...item,
      _selectedVariantId: selectedVariant.productId,
      productId: selectedVariant.productId,
      sku: selectedVariant.sku,
      retailPrice: selectedVariant.retailPrice,
      onHand: selectedVariant.onHand,
      stockStatus: selectedVariant.stockStatus,
      size: selectedVariant.size,
      color: selectedVariant.color
    };
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
  const setIconAction = (control, label, icon, visibleLabel = "") => {
    control.setAttribute("aria-label", label);
    control.title = label;
    control.dataset.tooltip = label;
    control.dataset.defaultTooltip = label;
    control.innerHTML = `<span class="product-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${icon}</svg></span>`;
    if (visibleLabel) {
      control.classList.add("product-action-labeled");
      control.append(createTextElement("small", visibleLabel, "product-action-label"));
    }
  };
  const messenger = document.createElement("a");
  messenger.href = "https://www.facebook.com/sarapmagbikeshop";
  messenger.target = "_blank";
  messenger.rel = "noreferrer";
  messenger.className = "product-messenger";
  setIconAction(messenger, "Message on Messenger", '<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v7a3.5 3.5 0 0 1-3.5 3.5H10l-4.5 4v-4.7A3.5 3.5 0 0 1 4 12.5Z"/><path d="m8 11 3-3 2.4 2 2.6-2.5"/>', "Message Us");
  const callBranch = document.createElement("a");
  callBranch.href = `tel:${normalizePhoneLink(getSelectedPublicLocation().phone)}`;
  setIconAction(callBranch, `Call ${getSelectedPublicLocationName()}`, '<path d="M8.2 3H5.4A2.4 2.4 0 0 0 3 5.4C3 14 10 21 18.6 21a2.4 2.4 0 0 0 2.4-2.4v-2.8l-4.2-1-1.4 2.3a13.2 13.2 0 0 1-8.5-8.5l2.3-1.4Z"/>', "Call Us");
  const copyLink = document.createElement("button");
  copyLink.type = "button";
  setIconAction(copyLink, "Copy product link", '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>');
  copyLink.addEventListener("click", () => copyCurrentProductLink(copyLink));
  const addToCart = document.createElement("button");
  addToCart.type = "button";
  addToCart.className = "product-add-to-cart";
  setIconAction(
    addToCart,
    "Add to cart",
    '<path d="M3 3h2l2.4 10.2a2 2 0 0 0 1.95 1.55h7.9a2 2 0 0 0 1.9-1.38L21 7H6.1"/><path d="M14 10h4M16 8v4"/><circle cx="9" cy="19" r="1.2"/><circle cx="17" cy="19" r="1.2"/>',
    "Add to Cart"
  );
  addToCart.disabled = Boolean(selectedVariant) && !selectedVariant.isAvailable;
  addToCart.addEventListener("click", () => addProductToCart(item));
  actions.append(messenger, addToCart, callBranch, copyLink);

  summary.append(
    badges,
    createTextElement("p", getFieldValue(item, ["brand", "brandName"]) || "SarapMagBike Catalog", "product-detail-eyebrow"),
    createTextElement("h1", productName),
    price,
    ...(description ? [detail] : []),
    ...(selectedVariant ? [renderProductVariantPicker(item, selectedVariant)] : []),
    actions
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
