const customerOrdersState = { loading: false };

const customerOrderStatusLabels = {
  pending_confirmation: "Waiting for confirmation",
  confirmed: "Confirmed",
  preparing: "Preparing your order",
  ready_for_pickup: "Ready for pickup",
  out_for_shipping: "Out for shipping",
  delivered: "Delivered",
  issue_reported: "Issue reported",
  failed_delivery: "Delivery attempt failed",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Not confirmed"
};

function escapeOrderHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function customerOrderStatusLabel(status) {
  return customerOrderStatusLabels[status] || String(status || "").replace(/_/g, " ");
}

function customerOrderMoney(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

function customerOrderDate(value, options = { dateStyle: "medium" }) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-PH", options).format(date);
}

function customerOrderStage(status, fulfillmentType) {
  const steps = fulfillmentType === "pickup"
    ? ["pending_confirmation", "confirmed", "preparing", "ready_for_pickup", "completed"]
    : ["pending_confirmation", "confirmed", "preparing", "out_for_shipping", "delivered", "completed"];
  return { steps, current: steps.indexOf(status) };
}

function renderCustomerOrders(orders) {
  const list = document.querySelector("[data-my-orders-list]");
  if (!list) return;
  list.replaceChildren();
  if (!Array.isArray(orders) || orders.length === 0) {
    list.innerHTML = `<article class="customer-order-empty"><h3>No orders yet</h3><p>Orders placed while logged in will appear here.</p><a href="index.html#products">Browse products</a></article>`;
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement("article");
    card.className = `customer-order-card status-${order.status}`;
    const stage = customerOrderStage(order.status, order.fulfillmentType);
    const terminal = ["cancelled", "rejected", "failed_delivery", "issue_reported"].includes(order.status);
    const steps = stage.steps.map((status, index) => `
      <li class="${!terminal && index <= stage.current ? "done" : ""}${status === order.status ? " current" : ""}">
        <span></span><small>${escapeOrderHtml(customerOrderStatusLabel(status))}</small>
      </li>`).join("");
    const due = order.status === "delivered" && order.autoCompleteDueAt
      ? `<p class="customer-order-auto">This order will complete automatically on ${escapeOrderHtml(customerOrderDate(order.autoCompleteDueAt, { dateStyle: "medium", timeStyle: "short" }))} unless you report an issue.</p>`
      : "";
    const tracking = order.trackingNumber
      ? `<p class="customer-order-tracking">${escapeOrderHtml(order.courierName || "Courier")} · Tracking ${escapeOrderHtml(order.trackingNumber)}</p>`
      : "";
    card.innerHTML = `
      <header>
        <div><small>${escapeOrderHtml(customerOrderDate(order.submittedAt))}</small><h3>${escapeOrderHtml(order.orderNumber)}</h3></div>
        <span class="customer-order-status">${escapeOrderHtml(customerOrderStatusLabel(order.status))}</span>
      </header>
      <div class="customer-order-summary">
        <span>${Number(order.totalItems || 0)} item${Number(order.totalItems || 0) === 1 ? "" : "s"} · ${order.fulfillmentType === "delivery" ? "Delivery" : "Shop pickup"}</span>
        <strong>${escapeOrderHtml(customerOrderMoney(order.totalAmount))}</strong>
      </div>
      ${tracking}
      ${terminal ? `<p class="customer-order-terminal">${escapeOrderHtml(customerOrderStatusLabel(order.status))}${order.issueReason ? `: ${escapeOrderHtml(order.issueReason)}` : ""}</p>` : `<ol class="customer-order-progress">${steps}</ol>`}
      ${due}
      <div class="customer-order-actions"></div>`;
    const actions = card.querySelector(".customer-order-actions");
    if (order.canCancel) {
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "customer-order-secondary";
      cancel.textContent = "Cancel Order";
      cancel.addEventListener("click", () => cancelCustomerOrder(order));
      actions.append(cancel);
    }
    if (order.canComplete) {
      const complete = document.createElement("button");
      complete.type = "button";
      complete.className = "customer-order-primary";
      complete.textContent = "Complete Order";
      complete.addEventListener("click", () => completeCustomerOrder(order));
      const issue = document.createElement("button");
      issue.type = "button";
      issue.className = "customer-order-secondary";
      issue.textContent = "Report an Issue";
      issue.addEventListener("click", () => reportCustomerOrderIssue(order));
      actions.append(complete, issue);
    }
    if (!actions.children.length) actions.remove();
    list.append(card);
  });
}

function renderOrdersLoginRequired() {
  const list = document.querySelector("[data-my-orders-list]");
  if (!list) return;
  list.innerHTML = `<article class="customer-order-empty"><h3>Log in to view your orders</h3><p>Use the account you used during checkout.</p><button type="button" data-orders-login>Log in</button></article>`;
  list.querySelector("[data-orders-login]")?.addEventListener("click", openCommunityLoginForm);
}

async function loadCustomerOrders() {
  if (!customerState.account) {
    renderOrdersLoginRequired();
    return;
  }
  if (customerOrdersState.loading) return;
  customerOrdersState.loading = true;
  const list = document.querySelector("[data-my-orders-list]");
  if (list) list.innerHTML = `<article class="customer-order-empty"><h3>Loading orders</h3><p>Checking the latest fulfillment status.</p></article>`;
  try {
    renderCustomerOrders(await apiRequest("/api/public/web-orders/mine"));
  } catch (error) {
    if (list) list.innerHTML = `<article class="customer-order-empty is-error"><h3>Orders unavailable</h3><p>${escapeOrderHtml(error.message || "Please try again.")}</p></article>`;
  } finally {
    customerOrdersState.loading = false;
  }
}

async function cancelCustomerOrder(order) {
  const reason = window.prompt(`Why are you cancelling ${order.orderNumber}?`)?.trim();
  if (!reason || !window.confirm("Cancel this order? This cannot be undone.")) return;
  try {
    await apiRequest(`/api/public/web-orders/${encodeURIComponent(order.id)}/cancel`, { method: "POST", body: JSON.stringify({ reason }) });
  } catch (error) {
    window.alert(error.message || "This order can no longer be cancelled.");
  }
  await loadCustomerOrders();
}

async function completeCustomerOrder(order) {
  if (!window.confirm(`Confirm that ${order.orderNumber} was received in good condition?`)) return;
  try {
    await apiRequest(`/api/public/web-orders/${encodeURIComponent(order.id)}/complete`, { method: "POST", body: "{}" });
  } catch (error) {
    window.alert(error.message || "The order could not be completed.");
  }
  await loadCustomerOrders();
}

async function reportCustomerOrderIssue(order) {
  const reason = window.prompt("Briefly describe the delivery or item issue:")?.trim();
  if (!reason) return;
  try {
    await apiRequest(`/api/public/web-orders/${encodeURIComponent(order.id)}/issue`, { method: "POST", body: JSON.stringify({ reason }) });
  } catch (error) {
    window.alert(error.message || "The issue could not be reported.");
  }
  await loadCustomerOrders();
}

function bindCustomerOrdersPage() {
  document.querySelector("[data-my-orders-refresh]")?.addEventListener("click", loadCustomerOrders);
  document.querySelector("[data-profile-header-login]")?.addEventListener("click", openCommunityLoginForm);
  document.querySelector("[data-profile-header-logout]")?.addEventListener("click", async () => {
    await logoutCustomer();
    renderOrdersLoginRequired();
  });
  window.addEventListener("customer-session-changed", loadCustomerOrders);
  window.setTimeout(loadCustomerOrders, 0);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindCustomerOrdersPage);
else bindCustomerOrdersPage();
