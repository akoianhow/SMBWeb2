const storiesRoot = document.querySelector("[data-stories-root]");
const storyRoot = document.querySelector("[data-story-root]");
const wordpressUrl = String(window.SMBWEB_WORDPRESS_URL || "").replace(/\/$/, "");
const apiRoot = wordpressUrl ? `${wordpressUrl}/wp-json/wp/v2` : "";
const dateFormatter = new Intl.DateTimeFormat("en-PH", { dateStyle: "long" });

function decodeHtml(value = "") {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function textFromHtml(value = "") {
  const container = document.createElement("div");
  container.innerHTML = value;
  return (container.textContent || "").trim();
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function getEmbedded(item, type) {
  return item?._embedded?.[type]?.[0] || null;
}

function getImage(post, size = "large") {
  const media = getEmbedded(post, "wp:featuredmedia");
  return media?.media_details?.sizes?.[size]?.source_url || media?.source_url || "";
}

function postUrl(post) {
  return `story.html?slug=${encodeURIComponent(post.slug)}`;
}

async function wpFetch(path, options = {}) {
  if (!apiRoot) {
    throw new Error("not-configured");
  }
  const response = await fetch(`${apiRoot}${path}`, { headers: { Accept: "application/json" }, ...options });
  if (!response.ok) {
    throw new Error(`WordPress returned ${response.status}`);
  }
  return response;
}

function showStoriesMessage(title, detail) {
  storiesRoot.innerHTML = `<section class="stories-status"><p class="section-eyebrow">SarapMagBike Stories</p><h1>${title}</h1><p>${detail}</p></section>`;
}

function createCard(post, featured = false) {
  const article = document.createElement("article");
  article.className = featured ? "story-card story-card-featured" : "story-card";
  const image = getImage(post, featured ? "large" : "medium_large");
  const author = escapeHtml(getEmbedded(post, "author")?.name || "SarapMagBike Team");
  const categories = (post._embedded?.["wp:term"]?.[0] || []).map((term) => term.name).slice(0, 2);
  article.innerHTML = `
    <a class="story-card-image${image ? "" : " no-image"}" href="${postUrl(post)}">${image ? `<img src="${image}" alt="" loading="lazy">` : "<span>SarapMagBike Stories</span>"}</a>
    <div class="story-card-body">
      <p class="story-card-category">${categories.map((item) => escapeHtml(decodeHtml(item))).join(" · ") || "Cycling Stories"}</p>
      <h2><a href="${postUrl(post)}">${escapeHtml(decodeHtml(post.title.rendered))}</a></h2>
      <p>${escapeHtml(textFromHtml(post.excerpt.rendered))}</p>
      <div class="story-card-meta"><span>${author}</span><time datetime="${post.date}">${dateFormatter.format(new Date(post.date))}</time></div>
    </div>`;
  return article;
}

async function loadStories() {
  if (!storiesRoot) return;
  if (!apiRoot) {
    showStoriesMessage("Stories are being prepared", "The content hub is ready. Connect the WordPress address in wordpress-config.js to publish guides, reviews, shop news, and ride stories here.");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("search")?.trim() || "";
  const category = params.get("category") || "";
  const query = new URLSearchParams({ _embed: "1", per_page: "10", page: String(page) });
  if (search) query.set("search", search);
  if (category) query.set("categories", category);

  try {
    const [postsResponse, categoriesResponse] = await Promise.all([
      wpFetch(`/posts?${query}`),
      wpFetch("/categories?per_page=50&hide_empty=true")
    ]);
    const posts = await postsResponse.json();
    const categories = await categoriesResponse.json();
    const totalPages = Number(postsResponse.headers.get("X-WP-TotalPages")) || 1;
    storiesRoot.innerHTML = `
      <section class="stories-hero">
        <p class="section-eyebrow">Guides · Reviews · Rides · Shop News</p>
        <h1>Stories for Filipino Cyclists</h1>
        <p>Practical advice, honest product experience, local ride stories, and updates from SarapMagBike and IanHow.</p>
        <form class="stories-search" role="search"><input name="search" type="search" value="${search.replace(/"/g, "&quot;")}" placeholder="Search cycling stories" aria-label="Search cycling stories"><button>Search</button></form>
      </section>
      <nav class="story-categories" aria-label="Story categories"></nav>
      <section class="story-grid" aria-live="polite"></section>
      <nav class="story-pagination" aria-label="Stories pages"></nav>`;

    const categoryNav = storiesRoot.querySelector(".story-categories");
    [{ id: "", name: "All Stories" }, ...categories].forEach((item) => {
      const link = document.createElement("a");
      const next = new URLSearchParams();
      if (item.id) next.set("category", item.id);
      link.href = `stories.html${next.size ? `?${next}` : ""}`;
      link.textContent = decodeHtml(item.name);
      link.classList.toggle("active", String(item.id) === category);
      categoryNav.append(link);
    });

    const grid = storiesRoot.querySelector(".story-grid");
    if (!posts.length) {
      grid.innerHTML = "<div class=\"stories-empty\"><h2>No stories found</h2><p>Try another search or category.</p></div>";
    } else {
      posts.forEach((post, index) => grid.append(createCard(post, index === 0 && page === 1 && !search && !category)));
    }

    const pagination = storiesRoot.querySelector(".story-pagination");
    const pageLink = (label, target, disabled = false) => {
      const link = document.createElement(disabled ? "span" : "a");
      const next = new URLSearchParams(params);
      next.set("page", target);
      if (!disabled) link.href = `stories.html?${next}`;
      link.textContent = label;
      pagination.append(link);
    };
    pageLink("Previous", page - 1, page <= 1);
    const marker = document.createElement("span");
    marker.textContent = `Page ${page} of ${totalPages}`;
    pagination.append(marker);
    pageLink("Next", page + 1, page >= totalPages);
  } catch (error) {
    showStoriesMessage("Stories are temporarily unavailable", "Please try again shortly. You can still browse products, services, events, and the community.");
  }
}

function setMeta(name, content, property = false) {
  if (!content) return;
  let meta = document.head.querySelector(`meta[${property ? "property" : "name"}="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(property ? "property" : "name", name);
    document.head.append(meta);
  }
  meta.content = content;
}

async function loadStory() {
  if (!storyRoot) return;
  const slug = new URLSearchParams(window.location.search).get("slug")?.trim();
  if (!apiRoot || !slug) {
    storyRoot.innerHTML = "<section class=\"stories-status\"><h1>Story not available</h1><p>Return to <a href=\"stories.html\">SarapMagBike Stories</a>.</p></section>";
    return;
  }
  try {
    const response = await wpFetch(`/posts?slug=${encodeURIComponent(slug)}&_embed=1`);
    const [post] = await response.json();
    if (!post) throw new Error("not-found");
    const title = decodeHtml(post.title.rendered);
    const excerpt = textFromHtml(post.excerpt.rendered);
    const image = getImage(post, "full");
    const author = getEmbedded(post, "author")?.name || "SarapMagBike Team";
    const categories = (post._embedded?.["wp:term"]?.[0] || []).map((term) => decodeHtml(term.name));
    document.title = `${title} | SarapMagBike Stories`;
    setMeta("description", excerpt);
    setMeta("og:title", title, true);
    setMeta("og:description", excerpt, true);
    setMeta("og:type", "article", true);
    setMeta("og:image", image, true);
    storyRoot.innerHTML = `
      <article class="story-article">
        <a class="story-back" href="stories.html">← All Stories</a>
        <header><p class="section-eyebrow">${categories.map(escapeHtml).join(" · ") || "SarapMagBike Stories"}</p><h1>${escapeHtml(title)}</h1><p class="story-deck">${escapeHtml(excerpt)}</p><div class="story-byline"><span>By ${escapeHtml(author)}</span><time datetime="${post.date}">${dateFormatter.format(new Date(post.date))}</time></div></header>
        ${image ? `<figure class="story-hero-image"><img src="${image}" alt=""></figure>` : ""}
        <div class="story-content">${post.content.rendered}</div>
        <footer class="story-cta"><h2>Need help with your bike?</h2><p>Browse our catalog, check our services, or message SarapMagBike before visiting.</p><div><a href="index.html#products">Browse Products</a><a href="services.html">Bike Services</a></div></footer>
      </article>`;
  } catch (error) {
    storyRoot.innerHTML = "<section class=\"stories-status\"><h1>Story not found</h1><p>The article may have moved or is no longer published. <a href=\"stories.html\">Browse all stories</a>.</p></section>";
  }
}

loadStories();
loadStory();
