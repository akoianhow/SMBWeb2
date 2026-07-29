(() => {
  const root = document.querySelector("[data-badge-root]");
  if (!root) return;
  const apiBase = typeof getApiBaseUrl === "function" ? getApiBaseUrl() : "";
  const request = async (path, options = {}) => {
    const response = await fetch(`${apiBase}${path}`, { credentials: "include", headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
    if (!response.ok) {
      let message = "Request failed.";
      try { const payload = await response.json(); message = payload.message || payload.detail || message; } catch {}
      const error = new Error(message); error.status = response.status; throw error;
    }
    return response.status === 204 ? null : response.json();
  };
  const one = (selector) => root.querySelector(selector);
  const fmt = (value) => Number(value || 0).toLocaleString("en-PH");
  const date = (value) => value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(value)) : "—";
  let badge = null;
  let timer = null;
  let loadVersion = 0;

  function render(data) {
    badge = data;
    const initials = (data.member.displayName || data.member.username).split(/\s+/).map((item) => item[0]).join("").slice(0, 2).toUpperCase();
    one("[data-badge-avatar]").innerHTML = data.member.profilePictureUrl ? `<img alt="" src="${data.member.profilePictureUrl}">` : initials;
    one("[data-badge-level]").textContent = data.level.name.toUpperCase();
    one("[data-badge-name]").textContent = data.member.displayName;
    one("[data-badge-member-level]").textContent = `${data.level.name.toUpperCase()} MEMBER`;
    one("[data-badge-lifetime]").textContent = fmt(data.balances.lifetimePoints);
    one("[data-badge-redeemable]").textContent = fmt(data.balances.redeemablePoints);
    one("[data-badge-number]").textContent = data.member.badgeNumber;
    one("[data-badge-member-since]").textContent = `Member since ${date(data.member.memberSince)}`;
    const expiration = data.balances.cycleExpiresAt;
    one("[data-badge-cycle-day]").textContent = expiration ? new Date(expiration).getDate() : "—";
    one("[data-badge-cycle-title]").textContent = expiration ? `Annual points cycle · ${new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(new Date(expiration))}` : "Annual points cycle starts after your first earning";
    const daysUntilExpiration = expiration ? Math.max(0, Math.ceil((new Date(expiration).getTime() - Date.now()) / 86400000)) : null;
    const warning = daysUntilExpiration !== null && daysUntilExpiration <= 30
      ? `${daysUntilExpiration <= 7 ? "Final reminder" : daysUntilExpiration <= 14 ? "Reminder" : "Advance reminder"}: ${fmt(daysUntilExpiration)} day${daysUntilExpiration === 1 ? "" : "s"} left. `
      : "";
    one("[data-badge-cycle-copy]").textContent = expiration ? `${warning}Unused Redeemable Points expire ${date(expiration)}. Level Points never expire.` : "Your rolling 12-month redemption cycle starts when you first earn points.";
    one("[data-badge-level-progress]").textContent = data.level.nextLevelPoints ? `${fmt(data.balances.lifetimePoints)} / ${fmt(data.level.nextLevelPoints)} LEVEL PTS` : `${fmt(data.balances.lifetimePoints)} LEVEL PTS`;
    one("[data-badge-levels]").innerHTML = data.levels.map((level) => {
      const reached = data.balances.lifetimePoints >= level.minimum;
      const current = level.code === data.level.code;
      return `<div class="badge-level-node ${reached ? "reached" : ""} ${current ? "current" : ""}"><div class="badge-level-dot"></div><strong>${level.name}</strong><small>${level.maximum ? `${fmt(level.minimum)}–${fmt(level.maximum)}` : `${fmt(level.minimum)}+`}</small></div>`;
    }).join("");
    one("[data-badge-rewards]").innerHTML = data.rewards.length ? data.rewards.map((reward) => `
      <article class="badge-reward ${reward.eligible ? "" : "locked"}">
        <small>${reward.isAllBranches ? "Both branches" : reward.branches.map((branch) => branch.branchName).join(", ")}</small>
        <h3>${reward.name}</h3><p>${reward.description}</p><strong>${fmt(reward.pointsCost)} points</strong>
        <button type="button" data-redeem-reward="${reward.id}" ${reward.eligible ? "" : "disabled"}>${reward.eligible ? "Redeem" : `${fmt(reward.pointsNeeded)} more points needed`}</button>
      </article>`).join("") : "<p>No active rewards are configured yet.</p>";
    one("[data-badge-rewards]").querySelectorAll("[data-redeem-reward]").forEach((button) => button.addEventListener("click", () => generateCode("redemption", button.dataset.redeemReward)));
    const vouchersSection = one("[data-badge-vouchers-section]");
    vouchersSection.hidden = data.redemptions.length === 0;
    one("[data-badge-vouchers]").innerHTML = data.redemptions.map((item) => `<div class="badge-voucher"><div><strong>${item.rewardNameSnapshot}</strong><span>Issued ${date(item.issuedAt)} · expires ${date(item.expiresAt)}</span></div><code>${item.voucherCode}</code></div>`).join("");
    one("[data-badge-history]").innerHTML = data.transactions.length ? data.transactions.map((item) => {
      const delta = item.redeemableDelta || item.lifetimeDelta;
      return `<div class="badge-history-row"><div><span>${item.description}</span><small>${date(item.occurredAt)} · ${item.sourceType.replaceAll("_", " ")}</small></div><strong class="${delta >= 0 ? "positive" : "negative"}">${delta > 0 ? "+" : ""}${fmt(delta)}</strong></div>`;
    }).join("") : "<p>No point activity yet. Your first eligible action will appear here.</p>";
    one("[data-badge-state]").hidden = true;
    one("[data-badge-content]").hidden = false;
  }

  async function generateCode(purpose, rewardId = null) {
    try {
      const result = await request("/api/public/loyalty/manual-code", { method: "POST", body: JSON.stringify({ purpose, rewardId }) });
      const modal = document.querySelector("[data-badge-code-modal]");
      document.querySelector("[data-badge-manual-code]").textContent = `${result.code.slice(0, 3)} ${result.code.slice(3)}`;
      document.querySelector("[data-badge-code-title]").textContent = purpose === "redemption" ? `Redeem ${result.reward.name}` : purpose === "visit" ? "Verify your shop visit" : "Show this code to staff";
      modal.hidden = false;
      clearInterval(timer);
      const tick = () => {
        const seconds = Math.max(0, Math.ceil((new Date(result.expiresAt).getTime() - Date.now()) / 1000));
        document.querySelector("[data-badge-code-countdown]").textContent = seconds ? `Valid for ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "Code expired";
        if (!seconds) clearInterval(timer);
      };
      tick(); timer = setInterval(tick, 1000);
    } catch (error) { window.alert(error.message); }
  }

  async function load() {
    const version = ++loadVersion;
    try {
      const data = await request("/api/public/loyalty/badge");
      if (version === loadVersion) render(data);
    }
    catch (error) {
      if (error.status === 401 && typeof window.openCommunityLoginForm === "function") window.openCommunityLoginForm();
      one("[data-badge-state]").innerHTML = `<h1>${error.status === 401 ? "Log in to view your badge" : "Badge unavailable"}</h1><p>${error.message}</p>`;
    }
  }
  root.querySelectorAll("[data-badge-code]").forEach((button) => button.addEventListener("click", () => generateCode(button.dataset.badgeCode)));
  document.querySelector("[data-badge-code-close]")?.addEventListener("click", () => { document.querySelector("[data-badge-code-modal]").hidden = true; clearInterval(timer); });
  window.addEventListener("customer-session-changed", () => void load());
  void load();
})();
