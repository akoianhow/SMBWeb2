# SarapMagBike Stories: WordPress setup

SMBWeb2 now contains the customer-facing Stories index and article reader. WordPress is the editorial source only; SMBSystem remains the source of truth for products, stock, pricing, customers, services, registrations, and other business operations.

## Hosting decision required

Provision WordPress at a dedicated origin such as `https://stories-cms.sarapmagbike.com`. Keep WordPress administration and its database separate from SMBSystem. Do not add inventory, customer, order, or service-job records to WordPress.

After the WordPress host is available, set its public origin in `wordpress-config.js`:

```js
window.SMBWEB_WORDPRESS_URL = "https://stories-cms.sarapmagbike.com";
```

The site reads only published content through `/wp-json/wp/v2` and does not require SMBWeb2 to hold WordPress credentials.

## Initial editorial structure

Create these categories:

- Bike Guides
- Maintenance & Service
- Product Reviews
- Rides & Cycling Stories
- Events & Community
- Shop News

Create author profiles for IanHow and each approved shop contributor. Every published article should have a featured image, excerpt, category, descriptive title, author, and internal next action.

## Required host checks

- HTTPS is enabled.
- Pretty permalinks are enabled.
- `GET /wp-json/wp/v2/posts?_embed=1` is publicly reachable.
- Cross-origin GET requests from `https://sarapmagbike.com` and the official staging origin are allowed.
- WordPress core and plugins receive security updates and backups.
- Public registration and comments are disabled unless intentionally moderated.

## SEO completion requirement

The current GitHub Pages deployment is static, while the WordPress content is loaded in the browser. This is a working content experience, but it is not the final SEO architecture. Before production launch, add a GitHub Actions build that fetches published WordPress posts and emits crawlable static article HTML, or move the Stories routes behind a host that supports server rendering/reverse proxying.

The final build should produce canonical article URLs, metadata, Open Graph tags, Article/Event structured data where relevant, sitemap entries, and redirects for changed slugs. A WordPress publish/update webhook should trigger the build so website content stays current.
