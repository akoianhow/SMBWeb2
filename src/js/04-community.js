function openCommunityPage(updatePath = true) {
  showCommunityMode(true, updatePath);
}

function updateCommunityAuthState() {
  const isLoggedIn = Boolean(customerState.account);
  document.querySelector("[data-community-guest-card]")?.toggleAttribute("hidden", isLoggedIn);
  document.querySelector("[data-community-start]")?.classList.toggle("is-disabled", !isLoggedIn);
}

function showCommunityAuthPrompt() {
  const prompt = document.querySelector("[data-community-auth-prompt]");
  if (prompt) {
    prompt.hidden = false;
    const form = prompt.querySelector("[data-community-login-form]");
    if (form) {
      form.hidden = false;
    }
  }
}

function ensureCustomerLoginPrompt() {
  if (document.querySelector("[data-community-auth-prompt]")) {
    return;
  }

  const prompt = document.createElement("div");
  prompt.className = "community-auth-prompt";
  prompt.dataset.communityAuthPrompt = "";
  prompt.hidden = true;
  prompt.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="customer-auth-title">
      <h2 id="customer-auth-title">Log in to your SarapMagBike account</h2>
      <p>Access your customer profile and join SarapMagBike community discussions.</p>
      <form class="community-login-form" data-community-login-form>
        <div class="community-login-brand">
          <img src="assets/sarapmagbike-logo.png" alt="SarapMagBike Shop logo">
          <div>
            <strong>SarapMagBike Account</strong>
            <span>Log in to continue.</span>
          </div>
        </div>
        <label>
          Username
          <input type="text" name="username" autocomplete="username" required>
        </label>
        <label>
          Password
          <input type="password" name="password" autocomplete="current-password" required>
        </label>
        <input class="website-field" type="text" name="website" autocomplete="off" tabindex="-1" aria-hidden="true">
        <div class="community-login-actions">
          <button type="submit">Log in</button>
          <button class="community-login-register" type="button" data-open-register>Create account</button>
        </div>
        <p data-community-login-message role="status"></p>
      </form>
      <div class="community-auth-actions">
        <button type="button" data-community-prompt-close>Close</button>
      </div>
    </div>
  `;
  document.body.append(prompt);
}

function hideCommunityAuthPrompt() {
  const prompt = document.querySelector("[data-community-auth-prompt]");
  if (prompt) {
    prompt.hidden = true;
  }
}

function openCommunityLoginForm() {
  const form = document.querySelector("[data-community-login-form]");
  if (form) {
    if (form.closest("[data-community-auth-prompt]")) {
      showCommunityAuthPrompt();
    }
    form.hidden = false;
    form.querySelector("input[name='username']")?.focus();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function requireCommunityLogin() {
  if (customerState.account) {
    return true;
  }
  showCommunityAuthPrompt();
  return false;
}

function openCommunityCreateModal() {
  if (!requireCommunityLogin()) {
    return;
  }
  const modal = document.querySelector("[data-community-create-modal]");
  const textarea = document.querySelector("[data-community-composer] textarea");
  if (!modal) {
    textarea?.focus();
    return;
  }
  modal.hidden = false;
  setCommunityComposerActive(true);
  window.setTimeout(() => textarea?.focus(), 0);
}

function closeCommunityCreateModal({ resetDraft = false } = {}) {
  const modal = document.querySelector("[data-community-create-modal]");
  if (!modal) {
    return;
  }
  modal.hidden = true;
  setCommunityComposerActive(false);
  if (resetDraft) {
    document.querySelector("[data-community-composer]")?.reset();
    resetCommunityComposerState();
    setMessage(getCommunityMessage(), "");
  } else {
    updateCommunityComposerState();
  }
}

function getCommunityMessage() {
  return document.querySelector("[data-community-message]");
}

function setCommunityStateCard(title, detail) {
  const posts = document.querySelector("[data-community-posts]");
  if (!posts) {
    return;
  }
  const card = document.createElement("article");
  card.className = "community-state-card";
  card.append(createTextElement("h3", title), createTextElement("p", detail));
  posts.replaceChildren(card);
}

async function loadCommunityDiscussions(force = false) {
  if (communityState.isLoading || (communityState.isLoaded && !force)) {
    return;
  }

  communityState.isLoading = true;
  setCommunityStateCard("Loading Community", "Checking approved SarapMagBike discussions.");

  try {
    const query = new URLSearchParams();
    if (communityState.search) {
      query.set("search", communityState.search);
    }
    if (communityState.selectedCategory !== "all") {
      query.set("category", communityState.selectedCategory);
    }
    const suffix = query.toString() ? `?${query}` : "";
    const [config, categories, posts] = await Promise.all([
      apiRequest("/api/public/community/config"),
      apiRequest("/api/public/community/categories"),
      apiRequest(`/api/public/community/posts${suffix}`)
    ]);
    communityState.config = config;
    communityState.categories = categories;
    communityState.posts = sortCommunityPosts(posts);
    communityState.isLoaded = true;
    renderCommunityCategories();
    renderCommunityPosts();
    renderCommunityConfig();
  } catch (error) {
    setCommunityStateCard("Community Unavailable", "SMBSystem public community API is not reachable. Try again after the API is running.");
  } finally {
    communityState.isLoading = false;
  }
}

function renderCommunityConfig() {
  // Community rules remain enforced by SMBSystem without adding extra composer copy.
}

function isGeneralCommunityCategory(category) {
  return GENERAL_CATEGORY_SLUGS.includes(String(category?.slug || "").toLowerCase());
}

function getDefaultCommunityCategorySlug() {
  return communityState.categories.find(isGeneralCommunityCategory)?.slug || "";
}

function getCommunityCategoriesForUi() {
  const general = communityState.categories.find(isGeneralCommunityCategory);
  const normalizedGeneral = general ? { ...general, name: GENERAL_CATEGORY_LABEL } : null;
  const others = communityState.categories.filter((category) => !isGeneralCommunityCategory(category));
  return normalizedGeneral ? [normalizedGeneral, ...others] : others;
}

function ensureDefaultCommunityComposerCategory() {
  const defaultSlug = getDefaultCommunityCategorySlug();
  if (defaultSlug && communityState.selectedCategorySlugs.length === 0) {
    communityState.selectedCategorySlugs = [defaultSlug];
  }
}

function renderCommunityCategories() {
  const defaultSlug = getDefaultCommunityCategorySlug();
  communityState.selectedCategory = "all";
  communityState.selectedCategorySlugs = defaultSlug ? [defaultSlug] : [];
}

function renderCommunityComposerCategories() {
  const container = document.querySelector("[data-community-composer-categories]");
  if (!container) {
    return;
  }

  container.replaceChildren();
  getCommunityCategoriesForUi().forEach((category) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = category.name;
    chip.dataset.categorySlug = category.slug;
    chip.className = communityState.selectedCategorySlugs.includes(category.slug) ? "active" : "";
    chip.setAttribute("aria-pressed", String(communityState.selectedCategorySlugs.includes(category.slug)));
    chip.addEventListener("click", () => toggleCommunityComposerCategory(category.slug));
    container.append(chip);
  });
}

function toggleCommunityComposerCategory(slug) {
  if (!requireCommunityLogin()) {
    return;
  }

  if (communityState.selectedCategorySlugs.includes(slug)) {
    communityState.selectedCategorySlugs = communityState.selectedCategorySlugs.filter((item) => item !== slug);
  } else {
    communityState.selectedCategorySlugs = [...communityState.selectedCategorySlugs, slug];
  }
  renderCommunityComposerCategories();
  updateCommunityComposerState();
}

function renderCommunityPosts() {
  const posts = document.querySelector("[data-community-posts]");
  if (!posts) {
    return;
  }

  communityState.posts = sortCommunityPosts(communityState.posts);
  posts.replaceChildren();
  if (communityState.posts.length === 0) {
    setCommunityStateCard("No Discussions Yet", "Start with a product question, service concern, bike check, or ride invite.");
    return;
  }

  communityState.posts.forEach((post) => posts.append(renderCommunityPostCard(post)));
}

function getCommunityPostAuthorName(post) {
  return post.authorName || post.author?.displayName || "SarapMagBike rider";
}

function getCommunityPostAuthorAvatar(post) {
  return post.authorAvatarUrl || post.author?.avatarUrl || post.author?.profilePictureUrl || "";
}

function isOwnCommunityPost(post) {
  const accountId = customerState.account?.id || customerState.account?.Id;
  const authorId = post.authorCustomerAccountId || post.authorId || post.author?.id || post.author?.customerAccountId;
  return Boolean(accountId && authorId && String(accountId).toLowerCase() === String(authorId).toLowerCase());
}

function getCommunityAuthorProfileUrl(authorAccountId) {
  return authorAccountId ? `profile.html?id=${encodeURIComponent(authorAccountId)}` : "";
}

function renderCommunityPostHeader(post) {
  const header = document.createElement("div");
  header.className = "community-post-header";

  const authorName = getCommunityPostAuthorName(post);
  const avatar = renderCommunityAvatar(authorName, getCommunityPostAuthorAvatar(post));
  avatar.classList.add("community-post-avatar");
  const authorProfileUrl = getCommunityAuthorProfileUrl(post.authorCustomerAccountId);
  const avatarElement = authorProfileUrl ? document.createElement("a") : avatar;
  if (authorProfileUrl) {
    avatarElement.href = authorProfileUrl;
    avatarElement.className = "community-author-avatar-link";
    avatarElement.setAttribute("aria-label", `View ${authorName}'s profile`);
    avatarElement.append(avatar);
  }

  const identity = document.createElement("div");
  identity.className = "community-post-identity";
  if (authorProfileUrl) {
    const authorLink = document.createElement("a");
    authorLink.className = "community-author-name-link";
    authorLink.href = authorProfileUrl;
    authorLink.textContent = authorName;
    identity.append(authorLink);
  } else {
    identity.append(createTextElement("strong", authorName));
  }

  const detail = document.createElement("div");
  detail.className = "community-post-detail";
  detail.append(createTextElement("span", formatCommunityDateTime(post.createdAt)));
  const dot = document.createElement("span");
  dot.textContent = "·";
  dot.setAttribute("aria-hidden", "true");
  const globe = document.createElement("span");
  globe.className = "community-post-visibility";
  globe.title = "Public";
  globe.innerHTML = `
    <svg viewBox="0 0 16 16" focusable="false">
      <circle cx="8" cy="8" r="6.2"></circle>
      <path d="M2.4 8h11.2M8 1.8c1.7 1.7 2.5 3.8 2.5 6.2s-.8 4.5-2.5 6.2M8 1.8C6.3 3.5 5.5 5.6 5.5 8s.8 4.5 2.5 6.2"></path>
    </svg>
  `;
  detail.append(dot, globe);
  identity.append(detail);

  header.append(avatarElement, identity);

  const menu = renderCommunityPostMenu(post);
  header.append(menu);

  return header;
}

function renderCommunityPostMenu(post) {
  const wrapper = document.createElement("div");
  wrapper.className = "community-post-menu";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "community-post-menu-button";
  button.setAttribute("aria-label", "Open post actions");
  button.setAttribute("aria-expanded", "false");
  button.textContent = "...";

  const menu = document.createElement("div");
  menu.className = "community-post-menu-list";
  menu.hidden = true;

  if (isOwnCommunityPost(post)) {
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit post";
    edit.addEventListener("click", () => {
      closeCommunityPostMenus();
      openCommunityEditModal(post.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete post";
    deleteButton.addEventListener("click", () => {
      closeCommunityPostMenus();
      deleteCommunityPost(post.id);
    });

    menu.append(edit, deleteButton);
  } else {
    const report = document.createElement("button");
    report.type = "button";
    report.textContent = "Report post";
    report.addEventListener("click", () => {
      closeCommunityPostMenus();
      reportCommunityPost(post.id);
    });
    menu.append(report);
  }
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    closeCommunityPostMenus();
    menu.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
  });
  wrapper.append(button, menu);
  return wrapper;
}

function renderCommunityMediaGrid(mediaItems = [], options = {}) {
  const photos = Array.isArray(mediaItems) ? mediaItems.slice(0, 3) : [];
  if (photos.length === 0) {
    return null;
  }

  const media = document.createElement("div");
  media.className = `community-media-grid media-count-${photos.length}`;
  photos.forEach((photo, index) => {
    const image = document.createElement("img");
    image.alt = photo.fileName || "Discussion photo";
    image.loading = "lazy";
    image.src = normalizeApiUrl(photo.url);
    if (typeof options.onPhotoClick === "function") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "community-media-button";
      button.setAttribute("aria-label", `Open ${image.alt}`);
      button.addEventListener("click", () => options.onPhotoClick(index));
      button.append(image);
      media.append(button);
    } else {
      media.append(image);
    }
  });
  return media;
}

function closeCommunityPostMenus() {
  document.querySelectorAll(".community-post-menu-list").forEach((menu) => {
    menu.hidden = true;
  });
  document.querySelectorAll(".community-post-menu-button").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function renderCommunityPostCard(post) {
  const card = document.createElement("article");
  card.className = "community-post-card";
  card.dataset.communityPostId = post.id;
  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input, textarea, select, label, .community-post-menu, .community-media-grid, .community-post-actions")) {
      return;
    }
    openCommunityThreadModal(post.id);
  });

  const meta = renderCommunityPostHeader(post);

  const body = createTextElement("p", post.body, "community-post-body");
  card.append(meta, body);

  const media = renderCommunityMediaGrid(post.media, {
    onPhotoClick: (index) => openCommunityPhotoModal(post.id, index)
  });
  if (media) {
    card.append(media);
  }

  const actions = document.createElement("div");
  actions.className = "community-post-actions";
  actions.append(
    createCommunityActionButton(getCommunityLikeLabel(post), () => toggleCommunityReaction(post.id), {
      className: "community-like-action",
      icon: "like",
      label: `Like, ${getCommunityLikeLabel(post)} likes`,
      pressed: Boolean(post.likedByMe)
    }),
    createCommunityActionButton(getCommunityReplyLabel(post), () => openCommunityThreadModal(post.id), {
      className: "community-thread-action",
      icon: "comment",
      label: `${getCommunityReplyLabel(post)} replies`
    })
  );
  card.append(actions);

  const preview = renderCommunityReplyPreview(post);
  if (preview) {
    card.append(preview);
  }

  return card;
}

function getCommunityPreviewComments(post) {
  return [...(Array.isArray(post?.comments) ? post.comments : [])]
    .sort((first, second) => (Date.parse(first?.createdAt || "") || 0) - (Date.parse(second?.createdAt || "") || 0))
    .slice(0, 3);
}

function renderCommunityReplyPreview(post) {
  const previewComments = getCommunityPreviewComments(post);
  if (previewComments.length === 0) {
    return null;
  }

  const preview = document.createElement("div");
  preview.className = "community-reply-preview";
  preview.setAttribute("aria-label", "First discussion replies");

  previewComments.forEach((comment) => {
    preview.append(renderCommunityCommentPreview(comment));
  });

  if (getCommunityReplyCount(post) > previewComments.length) {
    const moreLink = document.createElement("button");
    moreLink.type = "button";
    moreLink.className = "community-more-replies";
    moreLink.textContent = "More....";
    moreLink.setAttribute("aria-label", `Show all ${getCommunityReplyCount(post)} replies`);
    moreLink.addEventListener("click", () => openCommunityThreadModal(post.id));
    preview.append(moreLink);
  }

  return preview;
}

function renderCommunityCommentPreview(comment) {
  const item = document.createElement("article");
  item.className = `community-comment community-comment-preview${comment.isStaffReply ? " is-staff" : ""}`;
  const authorName = comment.authorName || comment.author?.displayName || "SarapMagBike rider";
  const avatar = renderCommunityAvatar(authorName, comment.authorAvatarUrl);
  const content = document.createElement("div");
  content.className = "community-comment-content";
  const heading = document.createElement("div");
  heading.className = "community-comment-heading";
  const authorProfileUrl = getCommunityAuthorProfileUrl(comment.authorCustomerAccountId);
  if (authorProfileUrl) {
    const link = document.createElement("a");
    link.className = "community-author-name-link";
    link.href = authorProfileUrl;
    link.textContent = authorName;
    heading.append(link);
  } else {
    heading.append(createTextElement("strong", authorName));
  }
  content.append(heading, createTextElement("p", comment.body));
  item.append(avatar, content);
  return item;
}

function renderCommunityPostThread(post) {
  const thread = document.createElement("article");
  thread.className = "community-post-card community-post-thread-card";
  thread.dataset.communityThreadPostId = post.id;

  const meta = renderCommunityPostHeader(post);

  const body = createTextElement("p", post.body, "community-post-body");
  thread.append(meta, body);

  const media = renderCommunityMediaGrid(post.media);
  if (media) {
    thread.append(media);
  }

  const actions = document.createElement("div");
  actions.className = "community-post-actions";
  actions.append(
    createCommunityActionButton(getCommunityLikeLabel(post), () => toggleCommunityReaction(post.id), {
      className: "community-like-action",
      icon: "like",
      label: `Like, ${getCommunityLikeLabel(post)} likes`,
      pressed: Boolean(post.likedByMe)
    })
  );
  thread.append(actions);

  const comments = document.createElement("div");
  comments.className = "community-comments";
  renderCommunityCommentTree(post).forEach((commentNode) => {
    comments.append(renderCommunityComment(commentNode.comment, post.id, commentNode.children));
  });
  if (comments.childElementCount === 0) {
    const empty = document.createElement("p");
    empty.className = "community-thread-empty";
    empty.textContent = "No replies yet.";
    comments.append(empty);
  }
  thread.append(comments);

  const replyForm = document.createElement("form");
  replyForm.className = "community-reply-form";
  replyForm.innerHTML = `
    <input name="body" maxlength="1000" placeholder="Reply to this discussion">
    <button type="submit">Reply</button>
  `;
  replyForm.addEventListener("submit", (event) => submitCommunityComment(event, post.id));
  thread.append(replyForm);

  return thread;
}

function renderCommunityCommentTree(post) {
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const nodes = new Map(comments.map((comment) => [comment.id, { comment, children: [] }]));
  const roots = [];

  comments.forEach((comment) => {
    const node = nodes.get(comment.id);
    const parentNode = comment.parentCommentId ? nodes.get(comment.parentCommentId) : null;
    if (parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (items) => {
    items.sort((first, second) => (Date.parse(second.comment?.createdAt || "") || 0) - (Date.parse(first.comment?.createdAt || "") || 0));
    items.forEach((item) => sortNodes(item.children));
    return items;
  };

  return sortNodes(roots);
}

function getCommunityActivityTime(post) {
  return Date.parse(post?.lastActivityAt || post?.createdAt || "") || 0;
}

function sortCommunityPosts(posts) {
  return [...(posts || [])].sort((first, second) => {
    const pinnedDelta = Number(Boolean(second?.isPinned)) - Number(Boolean(first?.isPinned));
    if (pinnedDelta !== 0) {
      return pinnedDelta;
    }

    const activityDelta = getCommunityActivityTime(second) - getCommunityActivityTime(first);
    if (activityDelta !== 0) {
      return activityDelta;
    }

    return (Date.parse(second?.createdAt || "") || 0) - (Date.parse(first?.createdAt || "") || 0);
  });
}

function communityPostMatchesCurrentFilter(post) {
  if (!post) {
    return false;
  }

  const selectedCategory = communityState.selectedCategory || "all";
  if (selectedCategory !== "all") {
    const categories = Array.isArray(post.categories) ? post.categories : [];
    const hasSelectedCategory = categories.some((category) => category.slug === selectedCategory) ||
      post.categorySlug === selectedCategory;
    if (!hasSelectedCategory) {
      return false;
    }
  }

  const search = (communityState.search || "").trim().toLowerCase();
  if (!search) {
    return true;
  }

  const categoryText = (Array.isArray(post.categories) ? post.categories : [])
    .map((category) => category.name)
    .join(" ");
  return `${post.body || ""} ${categoryText}`.toLowerCase().includes(search);
}

function upsertCommunityPost(updatedPost, options = {}) {
  if (!updatedPost || !communityPostMatchesCurrentFilter(updatedPost)) {
    return;
  }

  const posts = document.querySelector("[data-community-posts]");
  if (!posts) {
    return;
  }

  posts.querySelectorAll(".community-state-card").forEach((card) => card.remove());

  const placement = options.placement || "sorted";
  const existingIndex = communityState.posts.findIndex((post) => post.id === updatedPost.id);
  if (existingIndex >= 0) {
    communityState.posts[existingIndex] = updatedPost;
  } else {
    communityState.posts = placement === "top"
      ? [updatedPost, ...communityState.posts]
      : [...communityState.posts, updatedPost];
  }

  if (placement === "sorted") {
    communityState.posts = sortCommunityPosts(communityState.posts);
  }

  const nextCard = renderCommunityPostCard(updatedPost);
  const currentCard = posts.querySelector(`[data-community-post-id="${CSS.escape(updatedPost.id)}"]`);
  if (currentCard) {
    currentCard.replaceWith(nextCard);
  } else if (placement === "top") {
    posts.prepend(nextCard);
  } else {
    posts.append(nextCard);
  }

  if (placement !== "preserve") {
    communityState.posts.forEach((post) => {
      const card = posts.querySelector(`[data-community-post-id="${CSS.escape(post.id)}"]`);
      if (card) {
        posts.append(card);
      }
    });
  }

  refreshCommunityThreadModal();
  refreshCommunityPhotoModal();
}

function renderCommunityComment(comment, postId, childNodes = []) {
  const item = document.createElement("article");
  item.className = `community-comment${comment.isStaffReply ? " is-staff" : ""}`;
  item.dataset.communityCommentId = comment.id;
  const authorName = comment.authorName || comment.author?.displayName || "SarapMagBike rider";
  const avatar = renderCommunityAvatar(authorName, comment.authorAvatarUrl);
  const content = document.createElement("div");
  content.className = "community-comment-content";
  const heading = document.createElement("div");
  heading.className = "community-comment-heading";
  const authorProfileUrl = getCommunityAuthorProfileUrl(comment.authorCustomerAccountId);
  if (authorProfileUrl) {
    const link = document.createElement("a");
    link.className = "community-author-name-link";
    link.href = authorProfileUrl;
    link.textContent = authorName;
    heading.append(link);
  } else {
    heading.append(createTextElement("strong", authorName));
  }
  heading.append(createTextElement("span", comment.isStaffAnswer ? "Staff answer" : formatCommunityTime(comment.createdAt)));
  content.append(heading, createTextElement("p", comment.body));
  const actions = document.createElement("div");
  actions.className = "community-comment-actions";
  actions.append(
    createCommunityActionButton(getCommunityCommentLikeLabel(comment), () => toggleCommunityCommentReaction(comment.id), {
      className: "community-comment-like-action",
      pressed: Boolean(comment.likedByMe)
    }),
    createCommunityActionButton("Reply", () => showCommunityCommentReplyForm(item))
  );
  content.append(actions);
  if (childNodes.length > 0) {
    const children = document.createElement("div");
    children.className = "community-comment-replies";
    childNodes.forEach((childNode) => {
      children.append(renderCommunityComment(childNode.comment, postId, childNode.children));
    });
    content.append(children);
  }
  const replyForm = document.createElement("form");
  replyForm.className = "community-comment-reply-form";
  replyForm.hidden = true;
  replyForm.innerHTML = `
    <input name="body" maxlength="1000" placeholder="Reply to this comment">
    <button type="submit">Reply</button>
  `;
  replyForm.addEventListener("submit", (event) => submitCommunityComment(event, postId, comment.id));
  content.append(replyForm);
  item.append(avatar, content);
  return item;
}

function renderCommunityAvatar(name, avatarUrl) {
  const avatar = document.createElement("div");
  avatar.className = "community-comment-avatar";
  const normalizedUrl = normalizeApiUrl(avatarUrl);
  if (normalizedUrl) {
    const image = document.createElement("img");
    image.src = normalizedUrl;
    image.alt = `${name} avatar`;
    avatar.append(image);
    return avatar;
  }

  avatar.textContent = getCommunityInitials(name);
  return avatar;
}

function getCommunityInitials(name) {
  return String(name || "SMB")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("") || "SMB";
}

function getCommunityLikeLabel(post) {
  return String(post?.likeCount || post?.reactionCount || 0);
}

function getCommunityReplyCount(post) {
  return Array.isArray(post?.comments) ? post.comments.length : Number(post?.commentCount || post?.replyCount || 0);
}

function getCommunityReplyLabel(post) {
  return String(getCommunityReplyCount(post));
}

function getCommunityCommentLikeLabel(comment) {
  return `Like (${comment?.likeCount || 0})`;
}

function createCommunityActionButton(label, onClick, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  if (options.className) {
    button.className = options.className;
  }
  if (options.icon) {
    button.append(createCommunityActionIcon(options.icon));
  }
  const labelElement = document.createElement("span");
  labelElement.className = options.icon ? "community-action-count" : "community-action-label";
  labelElement.textContent = label;
  button.append(labelElement);
  if (typeof options.pressed === "boolean") {
    button.setAttribute("aria-pressed", String(options.pressed));
  }
  if (options.label) {
    button.setAttribute("aria-label", options.label);
    button.title = options.label;
  }
  button.addEventListener("click", onClick);
  return button;
}

function createCommunityActionIcon(icon) {
  const wrapper = document.createElement("span");
  wrapper.className = `community-action-icon community-action-icon-${icon}`;
  wrapper.setAttribute("aria-hidden", "true");

  if (icon === "like") {
    wrapper.innerHTML = `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M7.2 21H4.4A2.4 2.4 0 0 1 2 18.6v-6.2A2.4 2.4 0 0 1 4.4 10h2.8V21Z"></path>
        <path d="M7.2 10.2c1.6-1 2.7-2.5 3.4-4.6l.6-1.9A2.1 2.1 0 0 1 15.3 4v4.3h3.8a2.6 2.6 0 0 1 2.5 3.1l-1.2 6.5A3.8 3.8 0 0 1 16.7 21H7.2V10.2Z"></path>
      </svg>
    `;
  } else if (icon === "comment") {
    wrapper.innerHTML = `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 4C6.9 4 3 7.5 3 12c0 2.5 1.3 4.8 3.4 6.2l-.5 3 3.4-1.7c.9.3 1.8.5 2.8.5 5.1 0 9-3.5 9-8S17.1 4 12 4Z"></path>
      </svg>
    `;
  }

  return wrapper;
}

function setCommunityActionButtonLabel(button, label, ariaLabel) {
  const labelElement = button.querySelector(".community-action-count");
  if (labelElement) {
    labelElement.textContent = label;
  } else {
    button.textContent = label;
  }
  if (ariaLabel) {
    button.setAttribute("aria-label", ariaLabel);
    button.title = ariaLabel;
  }
}

function updateCommunityReactionLabel(updatedPost) {
  if (!updatedPost) {
    return;
  }

  const existingIndex = communityState.posts.findIndex((post) => post.id === updatedPost.id);
  if (existingIndex >= 0) {
    communityState.posts[existingIndex] = updatedPost;
  }

  document
    .querySelectorAll(`[data-community-post-id="${CSS.escape(updatedPost.id)}"] .community-like-action, [data-community-thread-post-id="${CSS.escape(updatedPost.id)}"] .community-like-action, [data-community-photo-post-id="${CSS.escape(updatedPost.id)}"] .community-like-action`)
    .forEach((likeButton) => {
      setCommunityActionButtonLabel(likeButton, getCommunityLikeLabel(updatedPost), `Like, ${getCommunityLikeLabel(updatedPost)} likes`);
      likeButton.setAttribute("aria-pressed", String(Boolean(updatedPost.likedByMe)));
    });
}

function updateCommunityCommentReactionLabel(updatedPost, commentId) {
  if (!updatedPost) {
    return;
  }

  const existingIndex = communityState.posts.findIndex((post) => post.id === updatedPost.id);
  if (existingIndex >= 0) {
    communityState.posts[existingIndex] = updatedPost;
  }

  const updatedComment = (updatedPost.comments || []).find((comment) => comment.id === commentId);
  const likeButton = document.querySelector(`[data-community-comment-id="${CSS.escape(commentId)}"] .community-comment-like-action`);
  if (!updatedComment || !likeButton) {
    return;
  }

  likeButton.textContent = getCommunityCommentLikeLabel(updatedComment);
  likeButton.setAttribute("aria-pressed", String(Boolean(updatedComment.likedByMe)));
}

function getCommunityPostById(postId) {
  return communityState.posts.find((post) => post.id === postId);
}

function openCommunityThreadModal(postId) {
  const post = getCommunityPostById(postId);
  const modal = document.querySelector("[data-community-thread-modal]");
  const content = document.querySelector("[data-community-thread-content]");
  if (!post || !modal || !content) {
    return;
  }

  communityState.activeThreadPostId = postId;
  content.replaceChildren(renderCommunityPostThread(post));
  modal.hidden = false;
  const url = new URL(window.location.href);
  url.searchParams.set("thread", postId);
  url.hash = "community";
  window.history.replaceState({ ...(window.history.state || {}), view: "community", thread: postId }, "", `${url.pathname}${url.search}${url.hash}`);
}

function closeCommunityThreadModal() {
  const modal = document.querySelector("[data-community-thread-modal]");
  const content = document.querySelector("[data-community-thread-content]");
  communityState.activeThreadPostId = null;
  if (content) {
    content.replaceChildren();
  }
  if (modal) {
    modal.hidden = true;
  }
  const url = new URL(window.location.href);
  if (url.searchParams.has("thread")) {
    url.searchParams.delete("thread");
    window.history.replaceState({ ...(window.history.state || {}), view: "community" }, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

function getCommunityPostPhotos(post) {
  return Array.isArray(post?.media) ? post.media.slice(0, 3) : [];
}

function openCommunityPhotoModal(postId, photoIndex = 0) {
  const post = getCommunityPostById(postId);
  const photos = getCommunityPostPhotos(post);
  const modal = document.querySelector("[data-community-photo-modal]");
  if (!post || photos.length === 0 || !modal) {
    return;
  }

  communityState.activePhotoPostId = postId;
  communityState.activePhotoIndex = Math.min(Math.max(photoIndex, 0), photos.length - 1);
  modal.hidden = false;
  renderCommunityPhotoModal();
}

function closeCommunityPhotoModal() {
  const modal = document.querySelector("[data-community-photo-modal]");
  const panel = document.querySelector("[data-community-photo-panel]");
  communityState.activePhotoPostId = null;
  communityState.activePhotoIndex = 0;
  if (panel) {
    panel.replaceChildren();
  }
  if (modal) {
    modal.hidden = true;
  }
}

function changeCommunityPhotoModal(delta) {
  const post = getCommunityPostById(communityState.activePhotoPostId);
  const photos = getCommunityPostPhotos(post);
  if (photos.length === 0) {
    return;
  }

  communityState.activePhotoIndex = (communityState.activePhotoIndex + delta + photos.length) % photos.length;
  renderCommunityPhotoModal();
}

function refreshCommunityPhotoModal() {
  if (!communityState.activePhotoPostId) {
    return;
  }

  const post = getCommunityPostById(communityState.activePhotoPostId);
  if (!post || getCommunityPostPhotos(post).length === 0) {
    closeCommunityPhotoModal();
    return;
  }

  renderCommunityPhotoModal();
}

function renderCommunityPhotoModal() {
  const post = getCommunityPostById(communityState.activePhotoPostId);
  const photos = getCommunityPostPhotos(post);
  const image = document.querySelector("[data-community-photo-viewer-image]");
  const counter = document.querySelector("[data-community-photo-counter]");
  const previous = document.querySelector("[data-community-photo-prev]");
  const next = document.querySelector("[data-community-photo-next]");
  const panel = document.querySelector("[data-community-photo-panel]");
  if (!post || photos.length === 0 || !image || !counter || !previous || !next || !panel) {
    return;
  }

  communityState.activePhotoIndex = Math.min(Math.max(communityState.activePhotoIndex, 0), photos.length - 1);
  const photo = photos[communityState.activePhotoIndex];
  image.src = normalizeApiUrl(photo.url);
  image.alt = photo.fileName || "Post photo";
  counter.textContent = photos.length > 1 ? `${communityState.activePhotoIndex + 1} / ${photos.length}` : "";
  previous.hidden = photos.length < 2;
  next.hidden = photos.length < 2;
  panel.replaceChildren(renderCommunityPhotoPanel(post));
}

function renderCommunityPhotoPanel(post) {
  const panel = document.createElement("div");
  panel.className = "community-photo-panel-inner";
  panel.dataset.communityPhotoPostId = post.id;

  panel.append(renderCommunityPostHeader(post));
  panel.append(createTextElement("p", post.body, "community-post-body"));

  const actions = document.createElement("div");
  actions.className = "community-post-actions";
  actions.append(
    createCommunityActionButton(getCommunityLikeLabel(post), () => toggleCommunityReaction(post.id), {
      className: "community-like-action",
      icon: "like",
      label: `Like, ${getCommunityLikeLabel(post)} likes`,
      pressed: Boolean(post.likedByMe)
    }),
    createCommunityActionButton(getCommunityReplyLabel(post), () => {
      if (!requireCommunityLogin()) {
        return;
      }
      panel.querySelector(".community-reply-form input")?.focus();
    }, {
      className: "community-thread-action",
      icon: "comment",
      label: `${getCommunityReplyLabel(post)} replies`
    })
  );
  panel.append(actions);

  const comments = document.createElement("div");
  comments.className = "community-comments community-photo-comments";
  renderCommunityCommentTree(post).forEach((commentNode) => {
    comments.append(renderCommunityComment(commentNode.comment, post.id, commentNode.children));
  });
  if (comments.childElementCount === 0) {
    const empty = document.createElement("p");
    empty.className = "community-thread-empty";
    empty.textContent = "No replies yet.";
    comments.append(empty);
  }
  panel.append(comments);

  const replyForm = document.createElement("form");
  replyForm.className = "community-reply-form";
  replyForm.innerHTML = `
    <input name="body" maxlength="1000" placeholder="Write a comment">
    <button type="submit">Reply</button>
  `;
  replyForm.addEventListener("submit", (event) => submitCommunityComment(event, post.id));
  panel.append(replyForm);

  return panel;
}

function openCommunityEditModal(postId) {
  const post = getCommunityPostById(postId);
  const modal = document.querySelector("[data-community-edit-modal]");
  const form = document.querySelector("[data-community-edit-form]");
  const message = document.querySelector("[data-community-edit-message]");
  const author = document.querySelector("[data-community-edit-author]");
  const mediaContainer = document.querySelector("[data-community-edit-media]");
  if (!post || !modal || !form || !author || !mediaContainer) {
    return;
  }

  communityState.editingPostId = postId;
  communityState.editingOriginalBody = post.body || "";
  communityState.editingSavedBody = post.body || "";
  communityState.isSavingEdit = false;
  author.replaceChildren(renderCommunityAvatar(getCommunityPostAuthorName(post), getCommunityPostAuthorAvatar(post)));
  const authorText = document.createElement("div");
  authorText.append(
    createTextElement("strong", getCommunityPostAuthorName(post)),
    createTextElement("span", "Editing your post")
  );
  author.append(authorText);
  mediaContainer.replaceChildren();
  const media = renderCommunityMediaGrid(post.media);
  if (media) {
    mediaContainer.append(media);
    mediaContainer.hidden = false;
  } else {
    mediaContainer.hidden = true;
  }
  form.elements.body.value = post.body || "";
  hideCommunityEditCloseConfirm();
  updateCommunityEditSaveState();
  setMessage(message, "");
  modal.hidden = false;
  form.elements.body.focus();
}

function closeCommunityEditModal() {
  const modal = document.querySelector("[data-community-edit-modal]");
  const form = document.querySelector("[data-community-edit-form]");
  const message = document.querySelector("[data-community-edit-message]");
  const author = document.querySelector("[data-community-edit-author]");
  const mediaContainer = document.querySelector("[data-community-edit-media]");
  communityState.editingPostId = null;
  communityState.editingOriginalBody = "";
  communityState.editingSavedBody = "";
  communityState.isSavingEdit = false;
  if (form) {
    form.reset();
  }
  if (author) {
    author.replaceChildren();
  }
  if (mediaContainer) {
    mediaContainer.replaceChildren();
    mediaContainer.hidden = true;
  }
  hideCommunityEditCloseConfirm();
  setMessage(message, "");
  if (modal) {
    modal.hidden = true;
  }
}

function getCommunityEditBody() {
  const form = document.querySelector("[data-community-edit-form]");
  return form?.elements.body.value.trim() || "";
}

function hasUnsavedCommunityEditChanges() {
  return Boolean(communityState.editingPostId) && getCommunityEditBody() !== communityState.editingSavedBody.trim();
}

function updateCommunityEditSaveState() {
  const saveButton = document.querySelector("[data-community-edit-save]");
  if (!saveButton) {
    return;
  }

  const body = getCommunityEditBody();
  saveButton.disabled = communityState.isSavingEdit || !body || body === communityState.editingSavedBody.trim();
}

function hideCommunityEditCloseConfirm() {
  const confirm = document.querySelector("[data-community-edit-confirm]");
  if (confirm) {
    confirm.hidden = true;
  }
}

function requestCloseCommunityEditModal() {
  if (!hasUnsavedCommunityEditChanges()) {
    closeCommunityEditModal();
    return;
  }

  const confirm = document.querySelector("[data-community-edit-confirm]");
  if (confirm) {
    confirm.hidden = false;
  }
}

async function submitCommunityPostEdit(event) {
  event.preventDefault();
  await saveCommunityPostEdit({ closeAfterSave: false });
}

async function saveCommunityPostEdit(options = {}) {
  if (!communityState.editingPostId) {
    return;
  }

  const message = document.querySelector("[data-community-edit-message]");
  const body = getCommunityEditBody();
  if (!body) {
    setMessage(message, "Post text is required.", "error");
    updateCommunityEditSaveState();
    return;
  }

  if (body === communityState.editingSavedBody.trim()) {
    updateCommunityEditSaveState();
    if (options.closeAfterSave) {
      closeCommunityEditModal();
    }
    return;
  }

  communityState.isSavingEdit = true;
  updateCommunityEditSaveState();
  setMessage(message, "Saving post...");
  try {
    const updatedPost = await apiRequest(`/api/public/community/posts/${communityState.editingPostId}`, {
      method: "PATCH",
      body: JSON.stringify({ body })
    });
    communityState.editingSavedBody = updatedPost.body || body;
    communityState.editingOriginalBody = communityState.editingSavedBody;
    const form = document.querySelector("[data-community-edit-form]");
    if (form) {
      form.elements.body.value = communityState.editingSavedBody;
    }
    upsertCommunityPost(updatedPost, { placement: "preserve" });
    hideCommunityEditCloseConfirm();
    setMessage(message, "Post updated.", "success");
    if (options.closeAfterSave) {
      closeCommunityEditModal();
    }
  } catch (error) {
    setMessage(message, error.message || "Unable to edit post. SMBSystem may need the public edit endpoint first.", "error");
  } finally {
    communityState.isSavingEdit = false;
    updateCommunityEditSaveState();
  }
}

async function deleteCommunityPost(postId) {
  if (!window.confirm("Delete this post? This cannot be undone.")) {
    return;
  }

  try {
    await apiRequest(`/api/public/community/posts/${postId}`, { method: "DELETE" });
    communityState.posts = communityState.posts.filter((post) => post.id !== postId);
    document.querySelector(`[data-community-post-id="${CSS.escape(postId)}"]`)?.remove();
    if (communityState.activeThreadPostId === postId) {
      closeCommunityThreadModal();
    }
    if (communityState.posts.length === 0) {
      setCommunityStateCard("No Discussions Yet", "Start with a product question, service concern, bike check, or ride invite.");
    }
  } catch (error) {
    alert(error.message || "Unable to delete post. SMBSystem may need the public delete endpoint first.");
  }
}

function refreshCommunityThreadModal() {
  if (!communityState.activeThreadPostId) {
    return;
  }

  const post = getCommunityPostById(communityState.activeThreadPostId);
  const modal = document.querySelector("[data-community-thread-modal]");
  const content = document.querySelector("[data-community-thread-content]");
  if (!post || !modal || !content || modal.hidden) {
    return;
  }

  content.replaceChildren(renderCommunityPostThread(post));
}

function showCommunityCommentReplyForm(commentItem) {
  if (!requireCommunityLogin()) {
    return;
  }

  const form = commentItem.querySelector(":scope > .community-comment-content > .community-comment-reply-form");
  const input = form?.querySelector("input");
  if (form && input) {
    form.hidden = false;
    input.focus();
  }
}

function focusCommunityReply(card) {
  if (!requireCommunityLogin()) {
    return;
  }
  const input = card.querySelector(".community-reply-form input");
  if (input) {
    input.focus();
  }
}

async function submitCommunityPost(event) {
  event.preventDefault();
  if (!requireCommunityLogin()) {
    return;
  }

  const form = event.currentTarget;
  const message = getCommunityMessage();
  setMessage(message, "Posting discussion...");

  try {
    const generalCategorySlug = getDefaultCommunityCategorySlug();
    if (!generalCategorySlug) {
      throw new Error("The general discussion category is unavailable.");
    }
    const payload = {
      body: form.elements.body.value.trim(),
      categorySlugs: [generalCategorySlug],
      photos: communityState.photoUploads.map(({ base64, contentType, fileName }) => ({ base64, contentType, fileName }))
    };
    const created = await apiRequest("/api/public/community/posts", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    form.reset();
    resetCommunityComposerState();
    setMessage(message, created.status === "pending_review"
      ? "Discussion sent for staff review."
      : "Discussion posted.", "success");
    if (created.status !== "pending_review" && communityPostMatchesCurrentFilter(created)) {
      upsertCommunityPost(created, { placement: "top" });
    }
    closeCommunityCreateModal();
  } catch (error) {
    setMessage(message, error.message || "Unable to post discussion.", "error");
  }
}

async function submitCommunityComment(event, postId, parentCommentId = null) {
  event.preventDefault();
  if (!requireCommunityLogin()) {
    return;
  }

  const form = event.currentTarget;
  const input = form.elements.body;
  const body = input.value.trim();
  if (!body) {
    return;
  }

  try {
    const updatedPost = await apiRequest(`/api/public/community/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, parentCommentId })
    });
    input.value = "";
    form.hidden = Boolean(parentCommentId);
    upsertCommunityPost(updatedPost, { placement: "preserve" });
  } catch (error) {
    alert(error.message || "Unable to reply.");
  }
}

async function toggleCommunityReaction(postId) {
  if (!requireCommunityLogin()) {
    return;
  }
  try {
    const updatedPost = await apiRequest(`/api/public/community/posts/${postId}/reaction`, {
      method: "POST",
      body: JSON.stringify({ reactionType: "like" })
    });
    updateCommunityReactionLabel(updatedPost);
  } catch (error) {
    alert(error.message || "Unable to update reaction.");
  }
}

async function toggleCommunityCommentReaction(commentId) {
  if (!requireCommunityLogin()) {
    return;
  }
  try {
    const updatedPost = await apiRequest(`/api/public/community/comments/${commentId}/reaction`, {
      method: "POST",
      body: JSON.stringify({ reactionType: "like" })
    });
    updateCommunityCommentReactionLabel(updatedPost, commentId);
  } catch (error) {
    alert(error.message || "Unable to update comment reaction.");
  }
}

async function reportCommunityPost(postId) {
  if (!requireCommunityLogin()) {
    return;
  }
  const reason = window.prompt("Why are you reporting this discussion?");
  if (!reason || !reason.trim()) {
    return;
  }
  try {
    await apiRequest("/api/public/community/reports", {
      method: "POST",
      body: JSON.stringify({ postId, reason: reason.trim() })
    });
    alert("Report sent to SarapMagBike staff.");
  } catch (error) {
    alert(error.message || "Unable to send report.");
  }
}

async function readCommunityPhotos(fileList, existingCount = 0) {
  const files = Array.from(fileList || []);
  const config = communityState.config || {};
  const maxFiles = config.maxPhotosPerPost || 3;
  const maxSize = config.maxPhotoBytes || config.maxPhotoSizeBytes || 2_000_000;
  const allowedTypes = config.allowedImageTypes || config.allowedImageContentTypes || ["image/jpeg", "image/png", "image/webp"];

  if (existingCount + files.length > maxFiles) {
    throw new Error(`Upload up to ${maxFiles} photos only.`);
  }

  return Promise.all(files.map(async (file) => {
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Photos must be JPG, PNG, or WebP.");
    }
    if (file.size > maxSize) {
      throw new Error("Each photo must be 2 MB or smaller.");
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Photo could not be read."));
      reader.readAsDataURL(file);
    });
    const [, base64 = ""] = dataUrl.split(",");
    return {
      base64,
      contentType: file.type,
      fileName: file.name,
      previewUrl: dataUrl
    };
  }));
}

async function addCommunityPhotos(fileList) {
  const photos = await readCommunityPhotos(fileList, communityState.photoUploads.length);
  communityState.photoUploads = [...communityState.photoUploads, ...photos];
}

async function handleCommunityPhotoChange(event) {
  const input = event.currentTarget;
  const message = getCommunityMessage();
  if (!requireCommunityLogin()) {
    input.value = "";
    return;
  }

  try {
    await addCommunityPhotos(input.files);
    input.value = "";
    renderCommunityPhotoPreviews();
    updateCommunityComposerState();
    setMessage(message, "");
  } catch (error) {
    input.value = "";
    renderCommunityPhotoPreviews();
    updateCommunityComposerState();
    setMessage(message, error.message || "Unable to read photos.", "error");
  }
}

async function handleCommunityPhotoDrop(event) {
  const message = getCommunityMessage();
  const composer = document.querySelector("[data-community-composer]");
  event.preventDefault();
  composer?.classList.remove("is-dragging");

  if (!requireCommunityLogin()) {
    return;
  }

  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) {
    return;
  }

  try {
    setCommunityComposerActive(true);
    await addCommunityPhotos(files);
    renderCommunityPhotoPreviews();
    updateCommunityComposerState();
    setMessage(message, "");
  } catch (error) {
    renderCommunityPhotoPreviews();
    updateCommunityComposerState();
    setMessage(message, error.message || "Unable to read photos.", "error");
  }
}

function renderCommunityPhotoPreviews() {
  const container = document.querySelector("[data-community-photo-previews]");
  if (!container) {
    return;
  }

  container.replaceChildren();
  communityState.photoUploads.forEach((photo, index) => {
    const item = document.createElement("div");
    item.className = "community-photo-preview";
    const image = document.createElement("img");
    image.src = photo.previewUrl;
    image.alt = photo.fileName || `Selected photo ${index + 1}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "x";
    remove.setAttribute("aria-label", `Remove ${photo.fileName || `photo ${index + 1}`}`);
    remove.addEventListener("click", () => removeCommunityPhoto(index));
    item.append(image, remove);
    container.append(item);
  });
}

function removeCommunityPhoto(index) {
  communityState.photoUploads = communityState.photoUploads.filter((_, itemIndex) => itemIndex !== index);
  const input = document.querySelector("[data-community-composer] input[type='file']");
  if (input) {
    input.value = "";
  }
  renderCommunityPhotoPreviews();
  updateCommunityComposerState();
}

function resetCommunityComposerState() {
  communityState.photoUploads = [];
  communityState.selectedCategorySlugs = [];
  ensureDefaultCommunityComposerCategory();
  renderCommunityPhotoPreviews();
  renderCommunityComposerCategories();
  const composer = document.querySelector("[data-community-composer]");
  composer?.classList.remove("is-composing", "has-draft");
}

function updateCommunityComposerState() {
  const composer = document.querySelector("[data-community-composer]");
  const textarea = composer?.querySelector("textarea");
  if (!composer || !textarea) {
    return;
  }

  const hasDraft = Boolean(textarea.value.trim()) ||
    communityState.photoUploads.length > 0 ||
    communityState.selectedCategorySlugs.length > 0;
  composer.classList.toggle("has-draft", hasDraft);
}

function setCommunityComposerActive(active) {
  const composer = document.querySelector("[data-community-composer]");
  if (!composer) {
    return;
  }
  composer.classList.toggle("is-composing", active);
}

function formatCommunityTime(value) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatCommunityDateTime(value) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en-PH", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function bindCommunityUi() {
  if (!document.querySelector("[data-community-view]")) {
    return;
  }

  document.querySelector("[data-community-composer]")?.addEventListener("submit", submitCommunityPost);
  document.querySelector("[data-community-composer-launcher]")?.addEventListener("click", openCommunityCreateModal);
  document.querySelector("[data-community-create-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeCommunityCreateModal();
    }
  });
  document.querySelector("[data-community-start]")?.addEventListener("click", () => {
    if (!requireCommunityLogin()) {
      return;
    }
    openCommunityCreateModal();
  });
  document.querySelector("[data-community-login]")?.addEventListener("click", openCommunityLoginForm);
  const communityLoginForm = document.querySelector("[data-community-login-form]");
  if (communityLoginForm && communityLoginForm.dataset.customerLoginBound !== "true") {
    communityLoginForm.dataset.customerLoginBound = "true";
    communityLoginForm.addEventListener("submit", loginCustomer);
  }
  document.querySelector("[data-community-register]")?.addEventListener("click", openRegisterForm);
  const communityPromptClose = document.querySelector("[data-community-prompt-close]");
  if (communityPromptClose && communityPromptClose.dataset.authCloseBound !== "true") {
    communityPromptClose.dataset.authCloseBound = "true";
    communityPromptClose.addEventListener("click", hideCommunityAuthPrompt);
  }
  document.querySelector("[data-community-prompt-register]")?.addEventListener("click", () => {
    hideCommunityAuthPrompt();
    openRegisterForm();
  });
  document.querySelector("[data-community-composer] textarea")?.addEventListener("focus", () => {
    requireCommunityLogin();
    setCommunityComposerActive(true);
  });
  const communityComposer = document.querySelector("[data-community-composer]");
  document.querySelector("[data-community-composer] textarea")?.addEventListener("input", updateCommunityComposerState);
  communityComposer?.addEventListener("dragover", (event) => {
    event.preventDefault();
    communityComposer.classList.add("is-dragging");
  });
  communityComposer?.addEventListener("dragleave", (event) => {
    if (!communityComposer.contains(event.relatedTarget)) {
      communityComposer.classList.remove("is-dragging");
    }
  });
  communityComposer?.addEventListener("drop", handleCommunityPhotoDrop);
  communityComposer?.addEventListener("focusout", (event) => {
    const form = event.currentTarget;
    window.setTimeout(() => {
      if (!form.contains(document.activeElement)) {
        setCommunityComposerActive(false);
        updateCommunityComposerState();
      }
    }, 0);
  });
  document.querySelector("[data-community-composer] input[type='file']")?.addEventListener("click", (event) => {
    if (!customerState.account) {
      event.preventDefault();
      showCommunityAuthPrompt();
    }
  });
  document.querySelector("[data-community-composer] input[type='file']")?.addEventListener("change", handleCommunityPhotoChange);
  document.querySelector("[data-community-search]")?.addEventListener("input", (event) => {
    communityState.search = event.target.value.trim();
    window.clearTimeout(communityState.searchTimer);
    communityState.searchTimer = window.setTimeout(() => loadCommunityDiscussions(true), 300);
  });
  document.querySelector("[data-community-thread-close]")?.addEventListener("click", closeCommunityThreadModal);
  document.querySelector("[data-community-thread-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeCommunityThreadModal();
    }
  });
  document.querySelector("[data-community-photo-close]")?.addEventListener("click", closeCommunityPhotoModal);
  document.querySelector("[data-community-photo-prev]")?.addEventListener("click", () => changeCommunityPhotoModal(-1));
  document.querySelector("[data-community-photo-next]")?.addEventListener("click", () => changeCommunityPhotoModal(1));
  document.querySelector("[data-community-photo-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeCommunityPhotoModal();
    }
  });
  document.querySelector("[data-community-edit-form]")?.addEventListener("submit", submitCommunityPostEdit);
  document.querySelector("[data-community-edit-form] textarea")?.addEventListener("input", () => {
    hideCommunityEditCloseConfirm();
    updateCommunityEditSaveState();
  });
  document.querySelector("[data-community-edit-close]")?.addEventListener("click", requestCloseCommunityEditModal);
  document.querySelector("[data-community-edit-cancel]")?.addEventListener("click", requestCloseCommunityEditModal);
  document.querySelector("[data-community-edit-confirm-save]")?.addEventListener("click", () => saveCommunityPostEdit({ closeAfterSave: true }));
  document.querySelector("[data-community-edit-confirm-discard]")?.addEventListener("click", closeCommunityEditModal);
  document.querySelector("[data-community-edit-confirm-keep]")?.addEventListener("click", hideCommunityEditCloseConfirm);
  document.querySelector("[data-community-edit-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      requestCloseCommunityEditModal();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".community-post-menu")) {
      closeCommunityPostMenus();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    closeCommunityPostMenus();
    if (!document.querySelector("[data-community-photo-modal]")?.hidden) {
      closeCommunityPhotoModal();
    } else if (!document.querySelector("[data-community-edit-modal]")?.hidden) {
      requestCloseCommunityEditModal();
    } else if (!document.querySelector("[data-community-create-modal]")?.hidden) {
      closeCommunityCreateModal();
    } else if (!document.querySelector("[data-community-thread-modal]")?.hidden) {
      closeCommunityThreadModal();
    }
  });
  document.querySelectorAll("[data-community-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openCommunityPage(true);
    });
  });
  window.addEventListener("popstate", () => {
    if (window.location.pathname === "/community") {
      openCommunityPage(false);
    } else {
      returnToHome();
    }
  });
}

function bindCatalogUi() {
  document.querySelector(".logo")?.addEventListener("click", (event) => {
    if (event.currentTarget.getAttribute("href") !== "#top") {
      return;
    }
    event.preventDefault();
    returnToHome({ updatePath: true });
  });

  document.querySelectorAll("[data-category-link], [data-category-nav]").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (element.dataset.categoryLink && element.getAttribute("href")) {
        return;
      }
      event.preventDefault();
      openCategoryCatalog(element.dataset.categoryLink || element.dataset.categoryNav, { updatePath: true });
    });
  });

  document.querySelectorAll("[data-category-card]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        return;
      }
      openCategoryTilePage(card);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCategoryTilePage(card);
      }
    });
  });

  document.querySelectorAll("[data-service-card]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        return;
      }
      openServicesPage();
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openServicesPage();
      }
    });
  });

  document.querySelectorAll("[data-home-product-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      setCatalogMode(false);
      showProfileMode(false);
      showCommunityMode(false);
      loadHomeProductItems(button.dataset.homeProductFilter);
    });
  });

  document.querySelector("[data-sort-select]")?.addEventListener("change", (event) => {
    state.sort = event.target.value;
    state.catalogPage = 1;
    updateCatalogUrl(state.activeCategory, { replace: true });
    renderCatalog();
  });
}

function setupFeatureTileBelt() {
  const scroller = document.querySelector(".feature-tiles");
  const track = document.querySelector("[data-feature-tile-track]");
  const group = document.querySelector("[data-feature-tile-group]");
  if (!scroller || !track || !group) {
    return;
  }

  if (!track.querySelector("[data-feature-tile-clone]")) {
    const clone = group.cloneNode(true);
    clone.removeAttribute("data-feature-tile-group");
    clone.setAttribute("data-feature-tile-clone", "");
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    clone.querySelectorAll("[tabindex]").forEach((element) => element.setAttribute("tabindex", "-1"));
    clone.querySelectorAll("a, button, input, select, textarea").forEach((element) => {
      element.setAttribute("tabindex", "-1");
    });

    clone.querySelectorAll("[data-category-link], [data-category-nav]").forEach((element) => {
      element.addEventListener("click", (event) => {
        if (element.dataset.categoryLink && element.getAttribute("href")) {
          return;
        }
        event.preventDefault();
        openCategoryCatalog(element.dataset.categoryLink || element.dataset.categoryNav, { updatePath: true });
      });
    });

    clone.querySelectorAll("[data-category-card]").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target instanceof HTMLAnchorElement) {
          return;
        }
        openCategoryTilePage(card);
      });
    });

    clone.querySelectorAll("[data-service-card]").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target instanceof HTMLAnchorElement) {
          return;
        }
        openServicesPage();
      });
    });

    track.append(clone);
  }

  setupFeatureTileScrollBelt(scroller, group);
}

function setupFeatureTileScrollBelt(scroller, group) {
  if (scroller.dataset.featureScrollBeltReady === "true") {
    return;
  }

  scroller.dataset.featureScrollBeltReady = "true";
  scroller.classList.add("is-scroll-belt");

  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let lastFrameTime = 0;
  let pauseUntil = 0;
  let isPointerDown = false;
  let isMouseDragging = false;
  let isAutoScrolling = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;
  let dragStartId = null;

  const getLoopWidth = () => group.getBoundingClientRect().width;

  const normalizeScrollPosition = () => {
    const loopWidth = getLoopWidth();
    if (!loopWidth) {
      return;
    }

    if (scroller.scrollLeft >= loopWidth) {
      scroller.scrollLeft -= loopWidth;
    } else if (scroller.scrollLeft < 0) {
      scroller.scrollLeft += loopWidth;
    }
  };

  const pauseAutoScroll = (duration = 1800) => {
    pauseUntil = performance.now() + duration;
  };

  scroller.addEventListener("pointerdown", (event) => {
    pauseAutoScroll(2600);
    if (event.pointerType !== "mouse") {
      return;
    }

    isPointerDown = true;
    dragStartX = event.clientX;
    dragStartScrollLeft = scroller.scrollLeft;
    dragStartId = event.pointerId;
  });

  scroller.addEventListener("pointermove", (event) => {
    if (!isPointerDown) {
      return;
    }

    if (!isMouseDragging) {
      if (Math.abs(event.clientX - dragStartX) > 6) {
        isMouseDragging = true;
        scroller.classList.add("is-dragging");
        if (dragStartId !== null) {
          scroller.setPointerCapture?.(dragStartId);
        }
      } else {
        return;
      }
    }

    event.preventDefault();
    scroller.scrollLeft = dragStartScrollLeft - (event.clientX - dragStartX);
    normalizeScrollPosition();
  });

  const stopMouseDrag = (event) => {
    if (!isPointerDown) {
      return;
    }

    const wasDragging = isMouseDragging;
    isPointerDown = false;
    isMouseDragging = false;
    scroller.classList.remove("is-dragging");
    if (wasDragging && dragStartId !== null) {
      try {
        scroller.releasePointerCapture?.(dragStartId);
      } catch (err) {
        // Ignore if pointer capture release fails
      }
    }
    dragStartId = null;
    pauseAutoScroll(1800);
  };

  scroller.addEventListener("pointerup", stopMouseDrag);
  scroller.addEventListener("pointercancel", stopMouseDrag);
  scroller.addEventListener("scroll", () => {
    if (isAutoScrolling) {
      return;
    }
    pauseAutoScroll(1200);
    window.requestAnimationFrame(normalizeScrollPosition);
  }, { passive: true });

  const moveBelt = (frameTime) => {
    const elapsed = lastFrameTime ? frameTime - lastFrameTime : 0;
    lastFrameTime = frameTime;

    if (
      mobileQuery.matches
      && !reducedMotionQuery.matches
      && !isMouseDragging
      && frameTime > pauseUntil
      && scroller.scrollWidth > scroller.clientWidth
    ) {
      isAutoScrolling = true;
      scroller.scrollLeft += elapsed * 0.018;
      normalizeScrollPosition();
      window.requestAnimationFrame(() => {
        isAutoScrolling = false;
      });
    }

    window.requestAnimationFrame(moveBelt);
  };

  window.requestAnimationFrame(moveBelt);
}

