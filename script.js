const year = document.querySelector("#year");
const menuButton = document.querySelector(".menu-button");
const navLinks = document.querySelector(".nav-links");
const pesoFormatter = new Intl.NumberFormat("en-PH", {
  currency: "PHP",
  minimumFractionDigits: 2,
  style: "currency"
});

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
    return "http://127.0.0.1:5088";
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

function renderPrice(item) {
  const price = document.createElement("strong");
  if (item.isOnSale && item.discountedPrice != null) {
    price.append(document.createTextNode(pesoFormatter.format(item.discountedPrice)));
    const original = document.createElement("del");
    original.textContent = pesoFormatter.format(item.retailPrice);
    price.append(" ", original);
    if (item.discountPercent != null) {
      const discount = document.createElement("em");
      discount.textContent = `-${Number(item.discountPercent).toFixed(0)}%`;
      price.append(" ", discount);
    }
    return price;
  }

  price.textContent = pesoFormatter.format(item.retailPrice);
  return price;
}

function renderWebItemCard(item) {
  const card = document.createElement("article");
  card.className = "product-card";

  const newBadge = createTextElement("span", "New", "badge");
  card.append(newBadge);

  if (item.isOnSale) {
    card.append(createTextElement("span", "Sale!", "badge sale"));
  }

  const photo = document.createElement("div");
  photo.className = "product-photo product-api-photo";
  photo.dataset.initial = (item.itemDescription || "SMB").trim().slice(0, 1).toUpperCase();
  if (item.mainImageUrl) {
    photo.classList.add("has-image");
    const image = document.createElement("img");
    image.alt = item.itemDescription || "Web catalog item";
    image.loading = "lazy";
    image.src = `${getApiBaseUrl()}${item.mainImageUrl}`;
    photo.append(image);
  }

  const detail = [item.category, item.brand, item.stockStatus].filter(Boolean).join(" / ");
  const webDescription = item.webDescription && item.webDescription.trim()
    ? item.webDescription.trim()
    : detail || (item.isService ? "Service item" : "Product item");
  const action = document.createElement("a");
  action.href = "#contact";
  action.textContent = "Ask Availability";

  card.append(
    photo,
    createTextElement("h3", item.itemDescription || "Web catalog item"),
    createTextElement("p", webDescription),
    renderPrice(item),
    action
  );

  return card;
}

async function loadNewArrivalItems() {
  const webItemsGrid = getWebItemsGrid();
  if (!webItemsGrid) {
    return;
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/public/web-items?branch=Quezon%20City`);
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const items = await response.json();
    const newItems = items.filter((item) => item.isNew).slice(0, 8);
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadNewArrivalItems);
} else {
  loadNewArrivalItems();
}
