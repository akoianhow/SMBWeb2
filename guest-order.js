const guestOrderStatusLabels = {
  pending_confirmation: "Pending confirmation",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_shipping: "Out for shipping",
  delivered: "Delivered",
  issue_reported: "Issue reported",
  failed_delivery: "Delivery needs attention",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected"
};

const guestOrderMoney = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const guestOrderDate = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" });

function guestOrderLabel(status) {
  return guestOrderStatusLabels[status] || String(status || "").replace(/_/g, " ");
}

function guestOrderStatusClass(status) {
  return String(status || "unknown").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

function guestOrderFormatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : guestOrderDate.format(date);
}

function guestOrderFormatMoney(value) {
  const amount = Number(value);
  return guestOrderMoney.format(Number.isFinite(amount) ? amount : 0);
}

function guestOrderEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadGuestOrder() {
  const panel = document.querySelector("[data-guest-order]");
  const parameters = new URLSearchParams(window.location.search);
  const id = parameters.get("id");
  const token = parameters.get("token");
  if (!panel || !id || !token) {
    if (panel) panel.innerHTML = '<div class="guest-order-error"><h2>Tracking link is incomplete</h2><p>Open the complete private link shown after checkout.</p><a href="index.html">Return to shop</a></div>';
    return;
  }
  panel.innerHTML = '<div class="guest-order-loading"><h2>Refreshing your order</h2><p>Checking the latest fulfillment status.</p></div>';
  try {
    const order = await apiRequest(`/api/public/web-orders/${encodeURIComponent(id)}/guest?token=${encodeURIComponent(token)}`);
    const timeline = Array.isArray(order.timeline) ? order.timeline : [];
    const lines = Array.isArray(order.lines) ? order.lines : [];
    panel.innerHTML = `
      <div class="guest-order-summary">
        <div><span>Order number</span><strong>${guestOrderEscape(order.orderNumber)}</strong></div>
        <div><span>Status</span><strong class="guest-order-status status-${guestOrderStatusClass(order.status)}">${guestOrderEscape(guestOrderLabel(order.status))}</strong></div>
        <div><span>Total</span><strong>${guestOrderFormatMoney(order.totalAmount)}</strong></div>
        <div><span>Submitted</span><strong>${guestOrderEscape(guestOrderFormatDate(order.submittedAt))}</strong></div>
      </div>
      <div class="guest-order-contact">
        <h2>${guestOrderEscape(order.customerName)}</h2>
        <p>${guestOrderEscape(order.mobileNumber)}${order.email ? ` · ${guestOrderEscape(order.email)}` : ""}</p>
        <p>${order.fulfillmentType === "delivery" ? guestOrderEscape(order.shippingAddress) : `Pickup at ${guestOrderEscape(order.pickupBranchName)}`}</p>
        ${order.trackingNumber ? `<p><strong>Courier tracking:</strong> ${guestOrderEscape(order.trackingNumber)}</p>` : ""}
      </div>
      <div class="guest-order-lines">
        <h2>Order items</h2>
        ${lines.map((line) => `
          <article>
            <div><strong>${guestOrderEscape(line.productName)}</strong><span>${guestOrderEscape(line.variantLabel || "Standard")}</span></div>
            <div><span>${Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : 0} × ${guestOrderFormatMoney(line.unitPrice)}</span><strong>${guestOrderFormatMoney(line.lineTotal)}</strong></div>
          </article>`).join("")}
      </div>
      <div class="guest-order-timeline">
        <h2>Progress</h2>
        ${timeline.map((entry) => `
          <div><i aria-hidden="true"></i><span><strong>${guestOrderEscape(guestOrderLabel(entry.toStatus))}</strong><small>${guestOrderEscape(guestOrderFormatDate(entry.changedAt))}</small></span></div>`).join("")}
      </div>
      <p class="guest-order-help">Need to correct an address or contact detail? Contact SarapMagBike and provide your order number. Staff changes are recorded in the order audit trail.</p>`;
  } catch {
    panel.innerHTML = '<div class="guest-order-error"><h2>Order could not be opened</h2><p>The private link may be incomplete or no longer valid. Contact SarapMagBike with your order number for assistance.</p><a href="index.html">Return to shop</a></div>';
  }
}

document.querySelector("[data-guest-order-refresh]")?.addEventListener("click", loadGuestOrder);
loadGuestOrder();
