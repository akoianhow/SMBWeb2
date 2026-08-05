const riderProfileState = {
  profile: null,
  panel: null,
  initialFormValue: "",
  levelLoadVersion: 0
};

const riderLevelBadgeAssets = {
  noob: "assets/sarapmagbadge-noob.png",
  saks: "assets/sarapmagbadge-saks.png",
  mamaw: "assets/sarapmagbadge-mamaw.png",
  master: "assets/sarapmagbadge-master.png",
  budolero: "assets/sarapmagbadge-budolero.png"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function riderProfileTargetId() {
  return new URLSearchParams(window.location.search).get("id") || customerState.account?.id || customerState.account?.Id || "";
}

function setRiderProfileState(title, detail) {
  const state = document.querySelector("[data-rider-profile-state]");
  if (!state) return;
  state.hidden = false;
  state.innerHTML = `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(detail)}</p>`;
  document.querySelector("[data-rider-profile]")?.setAttribute("hidden", "");
}

function setRiderText(selector, value, fallback = "Not set") {
  const element = document.querySelector(selector);
  if (element) element.textContent = value || fallback;
}

function formatProfileDate(value, options = { dateStyle: "medium" }) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-PH", options).format(date);
}

function renderRiderProfileImage(container, url, name, className) {
  if (!container) return;
  container.replaceChildren();
  const normalized = normalizeApiUrl(url);
  if (normalized) {
    const image = document.createElement("img");
    image.src = normalized;
    image.alt = `${name} ${className}`;
    container.append(image);
  } else if (className === "profile picture") {
    container.textContent = getCommunityInitials(name);
  }
}

function setRiderPhotoMessage(message = "", type = "") {
  const element = document.querySelector("[data-rider-photo-message]");
  if (!element) return;
  element.textContent = message;
  element.hidden = !message;
  element.dataset.type = type;
}

async function loadRiderLevelBadge(profile) {
  const link = document.querySelector("[data-rider-level-badge]");
  if (!link) return;
  const loadVersion = ++riderProfileState.levelLoadVersion;
  link.hidden = true;
  link.replaceChildren();
  if (!profile?.isOwner || !customerState.account) return;
  link.setAttribute("aria-busy", "true");
  try {
    const summary = await apiRequest("/api/public/loyalty/badge");
    if (loadVersion !== riderProfileState.levelLoadVersion || riderProfileState.profile?.id !== profile.id) return;
    const levelName = String(summary?.level?.name || "Noob").trim() || "Noob";
    const levelCode = String(summary?.level?.code || levelName).trim().toLowerCase();
    const image = document.createElement("img");
    image.src = riderLevelBadgeAssets[levelCode] || riderLevelBadgeAssets.noob;
    image.alt = `${levelName} SarapMagBadge`;
    link.replaceChildren(image);
    link.setAttribute("aria-label", `Open your ${levelName} SarapMagBadge`);
    link.title = `${levelName} SarapMagBadge`;
    link.hidden = false;
  } catch {
    link.hidden = true;
  } finally {
    link.removeAttribute("aria-busy");
  }
}

function renderRiderSocial(profile) {
  const container = document.querySelector("[data-rider-social]");
  if (!container) return;
  container.replaceChildren();
  const platforms = [
    ["strava", "Strava", profile.stravaUrl, '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8.2 14.1 3.8-7.5 3.8 7.5h-2.3L12 11l-1.5 3.1H8.2Zm5.1 2.1h2.1l1.4 2.8 1.4-2.8h2.1l-3.5 6.8-3.5-6.8Z"/></svg>'],
    ["instagram", "Instagram", profile.instagramUrl, '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle class="social-icon-fill" cx="17.5" cy="6.8" r="1.1"/></svg>'],
    ["facebook", "Facebook", profile.facebookUrl, '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.2 8.2V6.8c0-.8.5-1 1-1h2.5V2.2L14.5 2C11.4 2 9.7 3.8 9.7 6.6v1.6H7v4h2.7V22h4.5v-9.8h3.1l.5-4h-3.6Z"/></svg>'],
    ["website", "Website", profile.otherUrl, '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.6 14.4 14.4 9.6M8.1 17.8l-1.3 1.3a3.5 3.5 0 0 1-5-5l3.6-3.6a3.5 3.5 0 0 1 5 0M15.9 6.2l1.3-1.3a3.5 3.5 0 0 1 5 5l-3.6 3.6a3.5 3.5 0 0 1-5 0"/></svg>']
  ];
  platforms.forEach(([key, label, url, icon]) => {
    const item = document.createElement(url ? "a" : "span");
    item.className = `rider-social-icon${url ? "" : " is-unset"}`;
    item.dataset.platform = key;
    item.innerHTML = icon;
    item.title = url ? `Open ${label}` : `${label}: Not set by the user`;
    item.setAttribute("aria-label", item.title);
    if (url) {
      item.href = url;
      item.target = "_blank";
      item.rel = "noopener noreferrer";
    } else {
      item.setAttribute("role", "img");
    }
    container.append(item);
  });
}

function getMyRiderTestimonial(profile = riderProfileState.profile) {
  return (profile?.testimonials || []).find((testimonial) => testimonial.isMine) || null;
}

function renderRiderTestimonials(profile) {
  const container = document.querySelector("[data-testimonial-list]");
  if (!container) return;
  container.replaceChildren();
  const testimonials = Array.isArray(profile.testimonials) ? profile.testimonials : [];
  if (testimonials.length === 0) {
    container.append(createTextElement("p", "No testimonials yet."));
  } else {
    testimonials.forEach((testimonial) => {
      const item = document.createElement("article");
      item.className = "rider-testimonial";
      const avatarLink = document.createElement("a");
      avatarLink.className = "rider-testimonial-avatar";
      avatarLink.href = `profile.html?id=${encodeURIComponent(testimonial.authorAccountId)}`;
      renderRiderProfileImage(avatarLink, testimonial.authorAvatarUrl, testimonial.authorName, "profile picture");
      const content = document.createElement("div");
      const author = document.createElement("a");
      author.href = avatarLink.href;
      author.textContent = testimonial.authorName || testimonial.authorUsername;
      const body = createTextElement("p", testimonial.body);
      content.append(author, body);
      item.append(avatarLink, content);
      container.append(item);
    });
  }

  const action = document.querySelector("[data-testimonial-open]");
  if (action) {
    action.hidden = profile.isOwner;
    action.textContent = getMyRiderTestimonial(profile) ? "Edit" : "Add";
  }
}

function renderRiderProfile(profile) {
  riderProfileState.profile = profile;
  document.title = `${profile.displayName || profile.username} | SarapMagBike Community`;
  document.querySelector("[data-rider-profile-state]")?.setAttribute("hidden", "");
  document.querySelector("[data-rider-profile]")?.removeAttribute("hidden");

  setRiderText("[data-rider-name]", profile.displayName || profile.username, "Rider");
  setRiderText("[data-rider-username]", `@${profile.username}`, "");
  setRiderText("[data-rider-bio]", profile.bio, "No bio added yet.");
  setRiderText("[data-rider-post-count]", String(profile.postCount || 0), "0");
  setRiderText("[data-rider-member-since]", formatProfileDate(profile.memberSince, { month: "long", year: "numeric" }), "—");
  setRiderText("[data-rider-occupation]", profile.occupation);
  setRiderText("[data-rider-birthday]", profile.birthday ? formatProfileDate(`${profile.birthday}T00:00:00`, { month: "long", day: "numeric" }) : "Private", "Private");
  setRiderText("[data-rider-hometown]", profile.hometown, "Not shared");
  setRiderText("[data-rider-types]", profile.riderTypes?.join(", "));
  setRiderText("[data-rider-discipline]", profile.discipline);
  setRiderText("[data-rider-pace]", profile.pace);
  setRiderText("[data-rider-distance]", profile.preferredDistance);
  setRiderText("[data-rider-style]", profile.rideStyle);
  setRiderText("[data-rider-schedule]", profile.preferredSchedule);

  const location = document.querySelector("[data-rider-location]");
  if (location) {
    location.hidden = !profile.hometown;
    location.textContent = profile.hometown ? `● ${profile.hometown}` : "";
  }
  renderRiderProfileImage(document.querySelector("[data-rider-avatar-media]"), profile.profilePictureUrl, profile.displayName || profile.username, "profile picture");
  renderRiderProfileImage(document.querySelector("[data-rider-cover-media]"), profile.coverPictureUrl, profile.displayName || profile.username, "cover picture");
  renderRiderSocial(profile);
  renderRiderTestimonials(profile);

  document.querySelectorAll("[data-rider-edit]").forEach((button) => { button.hidden = !profile.isOwner; });
  document.querySelectorAll("[data-rider-photo-edit]").forEach((button) => { button.hidden = !profile.isOwner; });
  void loadRiderLevelBadge(profile);
  const createPost = document.querySelector("[data-community-composer-launcher]");
  if (createPost) createPost.hidden = !profile.isOwner;
  if (window.location.hash === "#testimonials") {
    window.requestAnimationFrame(() => document.querySelector("#testimonials")?.scrollIntoView({ block: "center" }));
  }
}

async function loadRiderPosts(accountId) {
  try {
    const [config, categories, posts] = await Promise.all([
      apiRequest("/api/public/community/config"),
      apiRequest("/api/public/community/categories"),
      apiRequest(`/api/public/community/posts?authorAccountId=${encodeURIComponent(accountId)}`)
    ]);
    communityState.config = config;
    communityState.categories = categories;
    communityState.posts = sortCommunityPosts(posts);
    communityState.isLoaded = true;
    renderCommunityConfig();
    ensureDefaultCommunityComposerCategory();
    renderCommunityComposerCategories();
    renderCommunityPosts();
  } catch {
    setCommunityStateCard("Posts unavailable", "SarapMagBike community posts could not be loaded right now.");
  }
}

async function loadRiderProfile() {
  const accountId = riderProfileTargetId();
  if (!accountId) {
    setRiderProfileState("Log in to view your profile", "Open a community member's profile from a post, or log in to view your own.");
    return;
  }
  setRiderProfileState("Loading profile", "Checking this SarapMagBike community rider.");
  try {
    const profile = await apiRequest(`/api/public/customer-account/profiles/${encodeURIComponent(accountId)}`);
    renderRiderProfile(profile);
    await loadRiderPosts(profile.id);
  } catch (error) {
    setRiderProfileState("Profile unavailable", error.message || "This rider profile could not be found.");
  }
}

function getProfileEditFields(panel, profile) {
  if (panel === "identity") {
    return `
      <label>Display name<input name="displayName" maxlength="120" value="${escapeHtml(profile.displayName || "")}"></label>
      <label>Short bio<textarea name="bio" maxlength="300" rows="4">${escapeHtml(profile.bio || "")}</textarea></label>
      <label>Mobile number<input type="tel" name="mobileNumber" maxlength="20" inputmode="tel" autocomplete="tel" value="${escapeHtml(profile.mobileNumber || "")}" placeholder="0917 123 4567"><small>Optional. Used only for order, appointment, and account contact.</small></label>
      <label>Hometown<input name="hometown" maxlength="120" value="${escapeHtml(profile.hometown || "")}"></label>
      <label>Birthday<input type="date" name="birthday" value="${escapeHtml(profile.birthday || "")}"></label>`;
  }
  if (panel === "about") {
    return `
      <label>Occupation<input name="occupation" maxlength="120" value="${escapeHtml(profile.occupation || "")}"></label>
      <label>Hometown<input name="hometown" maxlength="120" value="${escapeHtml(profile.hometown || "")}"></label>
      <label>Birthday<input type="date" name="birthday" value="${escapeHtml(profile.birthday || "")}"></label>
      <label class="rider-profile-check"><input type="checkbox" name="showHometown" ${profile.showHometown ? "checked" : ""}> Show hometown publicly</label>
      <label class="rider-profile-check"><input type="checkbox" name="showBirthday" ${profile.showBirthday ? "checked" : ""}> Show birthday month and day publicly</label>
      <label class="rider-profile-check"><input type="checkbox" name="showRecentPurchaseActivity" ${profile.showRecentPurchaseActivity ? "checked" : ""}> Show my username and profile picture in Recent Shop Purchases. Totals and private details stay hidden.</label>`;
  }
  return `
    <label>Strava URL<input type="url" name="stravaUrl" value="${escapeHtml(profile.stravaUrl || "")}" placeholder="https://www.strava.com/athletes/..."></label>
    <label>Instagram URL<input type="url" name="instagramUrl" value="${escapeHtml(profile.instagramUrl || "")}" placeholder="https://www.instagram.com/..."></label>
    <label>Facebook URL<input type="url" name="facebookUrl" value="${escapeHtml(profile.facebookUrl || "")}" placeholder="https://www.facebook.com/..."></label>
    <label>Other website<input type="url" name="otherUrl" value="${escapeHtml(profile.otherUrl || "")}" placeholder="https://..."></label>`;
}

function serializeRiderEditForm(form) {
  return Array.from(new FormData(form).entries()).map(([key, value]) => {
    if (value instanceof File) return `${key}:file:${value.name}:${value.size}:${value.lastModified}`;
    return `${key}:${value}`;
  }).join("|");
}

function openRiderEditModal(panel) {
  const profile = riderProfileState.profile;
  if (!profile?.isOwner) return;
  const titles = { identity: "Profile header", about: "About me", social: "Social links" };
  riderProfileState.panel = panel;
  setRiderText("[data-rider-edit-title]", titles[panel] || "Profile");
  const fields = document.querySelector("[data-rider-edit-fields]");
  fields.innerHTML = getProfileEditFields(panel, profile);
  const form = document.querySelector("[data-rider-edit-form]");
  riderProfileState.initialFormValue = serializeRiderEditForm(form);
  document.querySelector("[data-rider-edit-save]").disabled = true;
  setMessage(document.querySelector("[data-rider-edit-message]"), "");
  document.querySelector("[data-rider-edit-modal]").hidden = false;
  form.querySelector("input, textarea")?.focus();
}

function riderEditIsDirty() {
  const form = document.querySelector("[data-rider-edit-form]");
  return Boolean(form && serializeRiderEditForm(form) !== riderProfileState.initialFormValue);
}

function closeRiderEditModal(force = false) {
  if (!force && riderEditIsDirty() && !window.confirm("Discard your unsaved profile changes?")) return;
  document.querySelector("[data-rider-edit-modal]").hidden = true;
  riderProfileState.panel = null;
}

function updateTestimonialCounter() {
  const textarea = document.querySelector("[data-testimonial-form] textarea");
  const counter = document.querySelector("[data-testimonial-counter]");
  const save = document.querySelector("[data-testimonial-save]");
  const length = textarea?.value.length || 0;
  if (counter) counter.textContent = `${length} / 300`;
  if (save) save.disabled = length === 0 || length > 300;
}

function openTestimonialModal() {
  const profile = riderProfileState.profile;
  if (!profile || profile.isOwner) return;
  if (!customerState.account) {
    showCommunityAuthPrompt();
    return;
  }
  const existing = getMyRiderTestimonial(profile);
  const modal = document.querySelector("[data-testimonial-modal]");
  const form = document.querySelector("[data-testimonial-form]");
  form.elements.body.value = existing?.body || "";
  document.querySelector("#testimonial-title").textContent = existing ? "Edit testimonial" : "Add testimonial";
  document.querySelector("[data-testimonial-remove]").hidden = !existing;
  setMessage(document.querySelector("[data-testimonial-message]"), "");
  updateTestimonialCounter();
  modal.hidden = false;
  form.elements.body.focus();
}

function closeTestimonialModal() {
  const modal = document.querySelector("[data-testimonial-modal]");
  if (modal) modal.hidden = true;
}

async function submitTestimonial(event) {
  event.preventDefault();
  const profile = riderProfileState.profile;
  const form = event.currentTarget;
  const body = form.elements.body.value.trim();
  const message = document.querySelector("[data-testimonial-message]");
  const save = document.querySelector("[data-testimonial-save]");
  if (!body || body.length > 300) {
    setMessage(message, "Enter a testimonial of 300 characters or fewer.", "error");
    return;
  }
  save.disabled = true;
  setMessage(message, "Saving testimonial...");
  try {
    const updated = await apiRequest(`/api/public/customer-account/profiles/${encodeURIComponent(profile.id)}/testimonials`, {
      method: "POST",
      body: JSON.stringify({ body })
    });
    renderRiderProfile(updated);
    closeTestimonialModal();
  } catch (error) {
    setMessage(message, error.message || "Unable to save testimonial.", "error");
    updateTestimonialCounter();
  }
}

async function removeTestimonial() {
  const profile = riderProfileState.profile;
  if (!getMyRiderTestimonial(profile) || !window.confirm("Remove your testimonial from this profile?")) return;
  const message = document.querySelector("[data-testimonial-message]");
  setMessage(message, "Removing testimonial...");
  try {
    const updated = await apiRequest(`/api/public/customer-account/profiles/${encodeURIComponent(profile.id)}/testimonials`, { method: "DELETE" });
    renderRiderProfile(updated);
    closeTestimonialModal();
  } catch (error) {
    setMessage(message, error.message || "Unable to remove testimonial.", "error");
  }
}

async function readRiderImage(file, maxBytes, label) {
  if (!file || file.size === 0) return { base64: null, contentType: null };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error(`${label} must be JPG, PNG, or WebP.`);
  if (file.size > maxBytes) throw new Error(`${label} is too large.`);
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`${label} could not be read.`));
    reader.readAsDataURL(file);
  });
  return { base64: dataUrl.split(",")[1] || null, contentType: file.type };
}

function createRiderProfilePayload(profile, overrides = {}) {
  return {
    displayName: profile.displayName || "",
    bio: profile.bio || "",
    occupation: profile.occupation || "",
    mobileNumber: profile.mobileNumber || "",
    hometown: profile.hometown || "",
    birthday: profile.birthday || null,
    riderTypes: profile.riderTypes || [],
    discipline: profile.discipline || "",
    pace: profile.pace || "",
    preferredDistance: profile.preferredDistance || "",
    rideStyle: profile.rideStyle || "",
    preferredSchedule: profile.preferredSchedule || "",
    stravaUrl: profile.stravaUrl || "",
    instagramUrl: profile.instagramUrl || "",
    facebookUrl: profile.facebookUrl || "",
    otherUrl: profile.otherUrl || "",
    showHometown: Boolean(profile.showHometown),
    showBirthday: Boolean(profile.showBirthday),
    showRecentPurchaseActivity: Boolean(profile.showRecentPurchaseActivity),
    profileImageBase64: null,
    profileImageContentType: null,
    coverImageBase64: null,
    coverImageContentType: null,
    ...overrides
  };
}

async function updateRiderPhoto(kind, file) {
  const profile = riderProfileState.profile;
  if (!profile?.isOwner || !file) return;
  const isProfile = kind === "profile";
  const button = document.querySelector(`[data-rider-photo-edit="${kind}"]`);
  if (button) button.disabled = true;
  setRiderPhotoMessage(isProfile ? "Updating display picture..." : "Updating banner picture...");
  try {
    const image = await readRiderImage(file, isProfile ? 1_000_000 : 1_500_000, isProfile ? "Display picture" : "Banner picture");
    const overrides = isProfile
      ? { profileImageBase64: image.base64, profileImageContentType: image.contentType }
      : { coverImageBase64: image.base64, coverImageContentType: image.contentType };
    const updated = await apiRequest("/api/public/customer-account/profile-details", {
      method: "PATCH",
      body: JSON.stringify(createRiderProfilePayload(profile, overrides))
    });
    renderRiderProfile(updated);
    setRiderPhotoMessage(isProfile ? "Display picture updated." : "Banner picture updated.", "success");
    window.setTimeout(() => setRiderPhotoMessage(), 2400);
  } catch (error) {
    setRiderPhotoMessage(error.message || "Unable to update this picture.", "error");
  } finally {
    if (button) button.disabled = false;
  }
}

async function submitRiderEdit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const profile = riderProfileState.profile;
  const message = document.querySelector("[data-rider-edit-message]");
  const save = document.querySelector("[data-rider-edit-save]");
  save.disabled = true;
  setMessage(message, "Saving profile...");
  try {
    const profileImage = await readRiderImage(form.elements.profilePicture?.files?.[0], 1_000_000, "Profile picture");
    const coverImage = await readRiderImage(form.elements.coverPicture?.files?.[0], 1_500_000, "Cover picture");
    const value = (name, fallback) => form.elements[name] ? form.elements[name].value.trim() : (fallback || "");
    const mobileNumber = value("mobileNumber", profile.mobileNumber);
    if (mobileNumber && !/^(?:\+639|09)\d{9}$/.test(mobileNumber.replace(/[\s()-]/g, ""))) {
      throw new Error("Enter a valid Philippine mobile number, such as 09171234567 or +639171234567.");
    }
    const payload = {
      displayName: value("displayName", profile.displayName), bio: value("bio", profile.bio), occupation: value("occupation", profile.occupation),
      mobileNumber,
      hometown: value("hometown", profile.hometown), birthday: form.elements.birthday ? form.elements.birthday.value || null : profile.birthday,
      riderTypes: form.elements.riderTypes ? Array.from(form.querySelectorAll("[name='riderTypes']:checked")).map((input) => input.value) : profile.riderTypes || [],
      discipline: value("discipline", profile.discipline), pace: value("pace", profile.pace), preferredDistance: value("preferredDistance", profile.preferredDistance),
      rideStyle: value("rideStyle", profile.rideStyle), preferredSchedule: value("preferredSchedule", profile.preferredSchedule),
      stravaUrl: value("stravaUrl", profile.stravaUrl), instagramUrl: value("instagramUrl", profile.instagramUrl), facebookUrl: value("facebookUrl", profile.facebookUrl), otherUrl: value("otherUrl", profile.otherUrl),
      showHometown: form.elements.showHometown ? form.elements.showHometown.checked : profile.showHometown,
      showBirthday: form.elements.showBirthday ? form.elements.showBirthday.checked : profile.showBirthday,
      showRecentPurchaseActivity: form.elements.showRecentPurchaseActivity ? form.elements.showRecentPurchaseActivity.checked : profile.showRecentPurchaseActivity,
      profileImageBase64: profileImage.base64, profileImageContentType: profileImage.contentType,
      coverImageBase64: coverImage.base64, coverImageContentType: coverImage.contentType
    };
    const updated = await apiRequest("/api/public/customer-account/profile-details", { method: "PATCH", body: JSON.stringify(payload) });
    renderRiderProfile(updated);
    closeRiderEditModal(true);
  } catch (error) {
    setMessage(message, error.message || "Unable to save profile.", "error");
    save.disabled = false;
  }
}

function updateProfileHeaderAuth() {
  const loggedIn = Boolean(customerState.account);
  const headerLogin = document.querySelector("[data-profile-header-login]");
  const headerRegister = document.querySelector("[data-profile-header-register]");
  const headerAccount = document.querySelector("[data-profile-header-account]");
  const headerLogout = document.querySelector("[data-profile-header-logout]");
  if (headerLogin) headerLogin.hidden = loggedIn;
  if (headerRegister) headerRegister.hidden = loggedIn;
  if (headerAccount) headerAccount.hidden = !loggedIn;
  if (headerLogout) headerLogout.hidden = !loggedIn;
}

function bindRiderProfilePage() {
  document.querySelectorAll("[data-rider-edit]").forEach((button) => button.addEventListener("click", () => openRiderEditModal(button.dataset.riderEdit)));
  document.querySelectorAll("[data-rider-photo-edit]").forEach((button) => button.addEventListener("click", () => {
    document.querySelector(`[data-rider-photo-input="${button.dataset.riderPhotoEdit}"]`)?.click();
  }));
  document.querySelectorAll("[data-rider-photo-input]").forEach((input) => input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    if (file) await updateRiderPhoto(input.dataset.riderPhotoInput, file);
  }));
  document.querySelector("[data-rider-edit-form]")?.addEventListener("submit", submitRiderEdit);
  document.querySelector("[data-rider-edit-form]")?.addEventListener("input", () => { document.querySelector("[data-rider-edit-save]").disabled = !riderEditIsDirty(); });
  document.querySelector("[data-rider-edit-form]")?.addEventListener("change", () => { document.querySelector("[data-rider-edit-save]").disabled = !riderEditIsDirty(); });
  document.querySelector("[data-rider-edit-close]")?.addEventListener("click", () => closeRiderEditModal());
  document.querySelector("[data-rider-edit-cancel]")?.addEventListener("click", () => closeRiderEditModal());
  document.querySelector("[data-rider-edit-modal]")?.addEventListener("click", (event) => { if (event.target === event.currentTarget) closeRiderEditModal(); });
  document.querySelector("[data-testimonial-open]")?.addEventListener("click", openTestimonialModal);
  document.querySelector("[data-testimonial-form]")?.addEventListener("submit", submitTestimonial);
  document.querySelector("[data-testimonial-form] textarea")?.addEventListener("input", updateTestimonialCounter);
  document.querySelector("[data-testimonial-close]")?.addEventListener("click", closeTestimonialModal);
  document.querySelector("[data-testimonial-cancel]")?.addEventListener("click", closeTestimonialModal);
  document.querySelector("[data-testimonial-remove]")?.addEventListener("click", removeTestimonial);
  document.querySelector("[data-testimonial-modal]")?.addEventListener("click", (event) => { if (event.target === event.currentTarget) closeTestimonialModal(); });
  document.querySelector("[data-profile-header-login]")?.addEventListener("click", showCommunityAuthPrompt);
  document.querySelector("[data-profile-header-logout]")?.addEventListener("click", async () => { await logoutCustomer(); window.location.href = "index.html#community"; });
  window.addEventListener("customer-session-changed", () => {
    updateProfileHeaderAuth();
    loadRiderProfile();
  });
  updateProfileHeaderAuth();
  window.setTimeout(loadRiderProfile, 0);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindRiderProfilePage);
else bindRiderProfilePage();
