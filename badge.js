(() => {
  const root = document.querySelector("[data-badge-root]");
  if (!root) return;
  const apiBase = typeof getApiBaseUrl === "function" ? getApiBaseUrl() : "";
  const request = async (path, options = {}) => {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      let message = "Request failed.";
      try { const payload = await response.json(); message = payload.message || payload.detail || message; } catch {}
      const error = new Error(message); error.status = response.status; throw error;
    }
    return response.status === 204 ? null : response.json();
  };
  const one = (selector) => root.querySelector(selector);
  const numberFormatter = new Intl.NumberFormat("en-PH");
  const dateFormatter = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });
  const shortDateFormatter = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });
  const fmt = (value) => {
    const number = Number(value);
    return numberFormatter.format(Number.isFinite(number) ? number : 0);
  };
  const date = (value, formatter = dateFormatter) => {
    const parsed = new Date(value);
    return value && !Number.isNaN(parsed.getTime()) ? formatter.format(parsed) : "—";
  };
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const safeImageUrl = (value) => {
    if (!value) return "";
    try {
      const normalized = typeof normalizeApiUrl === "function" ? normalizeApiUrl(value) : value;
      const url = new URL(normalized, window.location.origin);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };
  const levelBadgeAssets = [
    "assets/sarapmagbadge-noob.png",
    "assets/sarapmagbadge-saks.png",
    "assets/sarapmagbadge-mamaw.png",
    "assets/sarapmagbadge-master.png",
    "assets/sarapmagbadge-budolero.png"
  ];
  let badge = null;
  let timer = null;
  let loadVersion = 0;

  function render(data) {
    badge = data;
    const initials = (data.member.displayName || data.member.username).split(/\s+/).map((item) => item[0]).join("").slice(0, 2).toUpperCase();
    const avatar = one("[data-badge-avatar]");
    const profilePictureUrl = safeImageUrl(data.member.profilePictureUrl);
    avatar.replaceChildren();
    if (profilePictureUrl) {
      const image = document.createElement("img");
      image.alt = "";
      image.src = profilePictureUrl;
      avatar.append(image);
    } else {
      avatar.textContent = initials;
    }
    const currentLevelIndex = Math.max(0, data.levels.findIndex((level) => level.code === data.level.code));
    const levelSeal = one("[data-badge-level]");
    const levelImage = document.createElement("img");
    levelImage.src = levelBadgeAssets[currentLevelIndex] || levelBadgeAssets[0];
    levelImage.alt = `${data.level.name} level badge`;
    levelSeal.replaceChildren(levelImage);
    one("[data-badge-name]").textContent = data.member.displayName;
    one("[data-badge-member-level]").textContent = `${data.level.name.toUpperCase()} MEMBER`;
    one("[data-badge-lifetime]").textContent = fmt(data.balances.lifetimePoints);
    one("[data-badge-redeemable]").textContent = fmt(data.balances.redeemablePoints);
    one("[data-badge-number]").textContent = data.member.badgeNumber;
    one("[data-badge-member-since]").textContent = `Member since ${date(data.member.memberSince)}`;
    const expiration = data.balances.cycleExpiresAt;
    const expirationDate = new Date(expiration);
    const hasExpiration = Boolean(expiration) && !Number.isNaN(expirationDate.getTime());
    one("[data-badge-cycle-day]").textContent = hasExpiration ? expirationDate.getDate() : "—";
    one("[data-badge-cycle-title]").textContent = hasExpiration ? `Annual points cycle · ${date(expiration, shortDateFormatter)}` : "Annual points cycle starts after your first earning";
    const daysUntilExpiration = hasExpiration ? Math.max(0, Math.ceil((expirationDate.getTime() - Date.now()) / 86400000)) : null;
    const warning = daysUntilExpiration !== null && daysUntilExpiration <= 30
      ? `${daysUntilExpiration <= 7 ? "Final reminder" : daysUntilExpiration <= 14 ? "Reminder" : "Advance reminder"}: ${fmt(daysUntilExpiration)} day${daysUntilExpiration === 1 ? "" : "s"} left. `
      : "";
    one("[data-badge-cycle-copy]").textContent = hasExpiration ? `${warning}Unused Redeemable Points expire ${date(expiration)}. Level Points never expire.` : "Your rolling 12-month redemption cycle starts when you first earn points.";
    one("[data-badge-level-progress]").textContent = data.level.nextLevelPoints ? `${fmt(data.balances.lifetimePoints)} / ${fmt(data.level.nextLevelPoints)} LEVEL PTS` : `${fmt(data.balances.lifetimePoints)} LEVEL PTS`;
    one("[data-badge-levels]").innerHTML = data.levels.map((level, index) => {
      const reached = data.balances.lifetimePoints >= level.minimum;
      const current = level.code === data.level.code;
      const range = level.maximum ? `${fmt(level.minimum)}–${fmt(level.maximum)}` : `${fmt(level.minimum)}+`;
      const label = `${level.name}, ${range} points${reached ? ", achieved" : ", not yet achieved"}`;
      return `<div class="badge-level-node ${reached ? "reached" : ""} ${current ? "current" : ""}" aria-label="${escapeHtml(label)}"><img class="badge-level-emblem" src="${levelBadgeAssets[index] || levelBadgeAssets[0]}" alt="" aria-hidden="true"></div>`;
    }).join("");
    const earningConfiguration = data.earningRules || { onlineActivityDailyCap: 10, rules: [] };
    const earningRules = Array.isArray(earningConfiguration.rules) ? earningConfiguration.rules : [];
    one("[data-badge-earning-note]").textContent = `Online activity earns up to ${fmt(earningConfiguration.onlineActivityDailyCap)} points per day. Purchase points use the net amount after discounts; delivery and miscellaneous fees are excluded.`;
    one("[data-badge-earning-rules]").innerHTML = earningRules.length ? earningRules.map((rule) => {
      const purchaseLabel = rule.purchaseBlockPesos
        ? `${escapeHtml(rule.name.replace("Completed web purchase", `Every full ₱${fmt(rule.purchaseBlockPesos)} web purchase`).replace("Completed onsite purchase", `Every full ₱${fmt(rule.purchaseBlockPesos)} onsite purchase`))}`
        : escapeHtml(rule.name);
      const cap = rule.dailyPointsCap == null ? "" : ` · max ${fmt(rule.dailyPointsCap)} points/day`;
      return `<div><strong>+${fmt(rule.pointsAwarded)}</strong><span>${purchaseLabel}</span><small>${escapeHtml(rule.description)}${escapeHtml(cap)}</small></div>`;
    }).join("") : "<p>Earning rules are temporarily unavailable.</p>";
    one("[data-badge-rewards]").innerHTML = data.rewards.length ? data.rewards.map((reward) => `
      <article class="badge-reward ${reward.eligible ? "" : "locked"}">
        <small>${escapeHtml(reward.isAllBranches ? "Both branches" : (Array.isArray(reward.branches) ? reward.branches : []).map((branch) => branch.branchName).join(", "))}</small>
        <h3>${escapeHtml(reward.name)}</h3><p>${escapeHtml(reward.description)}</p><strong>${fmt(reward.pointsCost)} points</strong>
        <button type="button" data-redeem-reward="${escapeHtml(reward.id)}" ${reward.eligible ? "" : "disabled"}>${reward.eligible ? "Redeem" : `${fmt(reward.pointsNeeded)} more points needed`}</button>
      </article>`).join("") : "<p>No active rewards are configured yet.</p>";
    one("[data-badge-rewards]").querySelectorAll("[data-redeem-reward]").forEach((button) => button.addEventListener("click", () => generateCode("redemption", button.dataset.redeemReward)));
    const vouchersSection = one("[data-badge-vouchers-section]");
    vouchersSection.hidden = data.redemptions.length === 0;
    one("[data-badge-vouchers]").innerHTML = data.redemptions.map((item) => `<div class="badge-voucher"><div><strong>${escapeHtml(item.rewardNameSnapshot)}</strong><span>Issued ${escapeHtml(date(item.issuedAt))} · expires ${escapeHtml(date(item.expiresAt))}</span></div><code>${escapeHtml(item.voucherCode)}</code></div>`).join("");
    one("[data-badge-history]").innerHTML = data.transactions.length ? data.transactions.map((item) => {
      const delta = item.redeemableDelta || item.lifetimeDelta;
      return `<div class="badge-history-row"><div><span>${escapeHtml(item.description)}</span><small>${escapeHtml(date(item.occurredAt))} · ${escapeHtml(String(item.sourceType || "").replaceAll("_", " "))}</small></div><strong class="${delta >= 0 ? "positive" : "negative"}">${delta > 0 ? "+" : ""}${fmt(delta)}</strong></div>`;
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
      const state = one("[data-badge-state]");
      const heading = document.createElement("h1");
      const message = document.createElement("p");
      heading.textContent = error.status === 401 ? "Log in to view your badge" : "Badge unavailable";
      message.textContent = error.message;
      state.replaceChildren(heading, message);
    }
  }
  root.querySelectorAll("[data-badge-code]").forEach((button) => button.addEventListener("click", () => generateCode(button.dataset.badgeCode)));
  document.querySelector("[data-badge-code-close]")?.addEventListener("click", () => { document.querySelector("[data-badge-code-modal]").hidden = true; clearInterval(timer); });
  window.addEventListener("customer-session-changed", () => void load());
  void load();
})();
