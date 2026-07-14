const riderProfileState = {
  profile: null,
  panel: null,
  initialFormValue: ""
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

function renderRiderSocial(profile) {
  const container = document.querySelector("[data-rider-social]");
  if (!container) return;
  container.replaceChildren();
  const links = [
    ["Strava", profile.stravaUrl],
    ["Instagram", profile.instagramUrl],
    ["Facebook", profile.facebookUrl],
    ["Website", profile.otherUrl]
  ].filter(([, url]) => url);
  if (links.length === 0) {
    container.append(createTextElement("p", "No public links yet."));
    return;
  }
  links.forEach(([label, url]) => {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = label;
    container.append(link);
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
  setRiderText("[data-rider-followers]", String(profile.followerCount || 0), "0");
  setRiderText("[data-rider-following]", String(profile.followingCount || 0), "0");
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
  renderRiderProfileImage(document.querySelector("[data-rider-avatar]"), profile.profilePictureUrl, profile.displayName || profile.username, "profile picture");
  renderRiderProfileImage(document.querySelector("[data-rider-cover]"), profile.coverPictureUrl, profile.displayName || profile.username, "cover picture");
  renderRiderSocial(profile);
  renderRiderTestimonials(profile);

  document.querySelectorAll("[data-rider-edit]").forEach((button) => { button.hidden = !profile.isOwner; });
  const follow = document.querySelector("[data-rider-follow]");
  if (follow) {
    follow.hidden = profile.isOwner;
    follow.classList.toggle("is-following", Boolean(profile.isFollowing));
    follow.textContent = profile.isFollowing ? "Following" : "Follow";
    follow.setAttribute("aria-pressed", String(Boolean(profile.isFollowing)));
  }
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
      <label>Profile picture<input type="file" name="profilePicture" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG, or WebP. Maximum 1 MB.</small></label>
      <label>Cover picture<input type="file" name="coverPicture" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG, or WebP. Maximum 1.5 MB.</small></label>`;
  }
  if (panel === "about") {
    return `
      <label>Occupation<input name="occupation" maxlength="120" value="${escapeHtml(profile.occupation || "")}"></label>
      <label>Hometown<input name="hometown" maxlength="120" value="${escapeHtml(profile.hometown || "")}"></label>
      <label>Birthday<input type="date" name="birthday" value="${escapeHtml(profile.birthday || "")}"></label>
      <label class="rider-profile-check"><input type="checkbox" name="showHometown" ${profile.showHometown ? "checked" : ""}> Show hometown publicly</label>
      <label class="rider-profile-check"><input type="checkbox" name="showBirthday" ${profile.showBirthday ? "checked" : ""}> Show birthday month and day publicly</label>`;
  }
  if (panel === "cycling") {
    const choices = ["MTB", "Road bike", "Gravel Bike", "Folding", "Hybrid", "Others"];
    return `
      <fieldset><legend>Types of bike you ride</legend><div class="rider-profile-bike-types">${choices.map((choice) => `<label><input type="checkbox" name="riderTypes" value="${choice}" ${profile.riderTypes?.includes(choice) ? "checked" : ""}> ${choice}</label>`).join("")}</div></fieldset>
      <label>Discipline<input name="discipline" maxlength="80" value="${escapeHtml(profile.discipline || "")}" placeholder="Road cycling, MTB, gravel"></label>
      <label>Usual pace<input name="pace" maxlength="80" value="${escapeHtml(profile.pace || "")}" placeholder="Chill, moderate, fast"></label>
      <label>Preferred distance<input name="preferredDistance" maxlength="80" value="${escapeHtml(profile.preferredDistance || "")}" placeholder="50–100 km"></label>
      <label>Ride style<input name="rideStyle" maxlength="160" value="${escapeHtml(profile.rideStyle || "")}" placeholder="Group rides, endurance"></label>
      <label>Preferred schedule<input name="preferredSchedule" maxlength="120" value="${escapeHtml(profile.preferredSchedule || "")}" placeholder="Saturday mornings"></label>`;
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
  const titles = { identity: "Profile header", about: "About me", cycling: "Cycling preferences", social: "Social links" };
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
    const payload = {
      displayName: value("displayName", profile.displayName), bio: value("bio", profile.bio), occupation: value("occupation", profile.occupation),
      hometown: value("hometown", profile.hometown), birthday: form.elements.birthday ? form.elements.birthday.value || null : profile.birthday,
      riderTypes: form.elements.riderTypes ? Array.from(form.querySelectorAll("[name='riderTypes']:checked")).map((input) => input.value) : profile.riderTypes || [],
      discipline: value("discipline", profile.discipline), pace: value("pace", profile.pace), preferredDistance: value("preferredDistance", profile.preferredDistance),
      rideStyle: value("rideStyle", profile.rideStyle), preferredSchedule: value("preferredSchedule", profile.preferredSchedule),
      stravaUrl: value("stravaUrl", profile.stravaUrl), instagramUrl: value("instagramUrl", profile.instagramUrl), facebookUrl: value("facebookUrl", profile.facebookUrl), otherUrl: value("otherUrl", profile.otherUrl),
      showHometown: form.elements.showHometown ? form.elements.showHometown.checked : profile.showHometown,
      showBirthday: form.elements.showBirthday ? form.elements.showBirthday.checked : profile.showBirthday,
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

async function toggleRiderFollow() {
  const profile = riderProfileState.profile;
  if (!profile || profile.isOwner) return;
  if (!customerState.account) {
    showCommunityAuthPrompt();
    return;
  }
  const button = document.querySelector("[data-rider-follow]");
  button.disabled = true;
  try {
    const result = await apiRequest(`/api/public/customer-account/profiles/${encodeURIComponent(profile.id)}/follow`, { method: "POST" });
    profile.isFollowing = result.isFollowing;
    profile.followerCount = result.followerCount;
    renderRiderProfile(profile);
  } catch (error) {
    window.alert(error.message || "Unable to update follow status.");
  } finally {
    button.disabled = false;
  }
}

function updateProfileHeaderAuth() {
  const loggedIn = Boolean(customerState.account);
  document.querySelector("[data-profile-header-login]").hidden = loggedIn;
  document.querySelector("[data-profile-header-register]").hidden = loggedIn;
  document.querySelector("[data-profile-header-account]").hidden = !loggedIn;
  document.querySelector("[data-profile-header-logout]").hidden = !loggedIn;
}

function bindRiderProfilePage() {
  document.querySelectorAll("[data-rider-edit]").forEach((button) => button.addEventListener("click", () => openRiderEditModal(button.dataset.riderEdit)));
  document.querySelector("[data-rider-follow]")?.addEventListener("click", toggleRiderFollow);
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
