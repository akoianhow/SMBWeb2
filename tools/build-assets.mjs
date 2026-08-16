import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const bundles = [
  {
    target: "script.js",
    sources: [
      "src/js/01-core.js",
      "src/js/02-catalog-search.js",
      "src/js/03-navigation-services.js",
      "src/js/04-community.js",
      "src/js/05-events.js",
      "src/js/06-customer-account.js",
      "src/js/07-product-cart.js",
      "src/js/09-kapotpot-finder.js",
      "src/js/10-private-group-rides.js",
      "src/js/08-bootstrap-pwa.js"
    ]
  },
  {
    target: "styles.css",
    sources: [
      "src/css/01-foundation-shell.css",
      "src/css/02-home-catalog.css",
      "src/css/03-events-products.css",
      "src/css/04-services-account.css",
      "src/css/05-community.css",
      "src/css/06-profiles-orders-location.css",
      "src/css/07-responsive.css",
      "src/css/08-stories-cart-guest.css",
      "src/css/09-notifications-polish.css",
      "src/css/10-kapotpot-finder.css",
      "src/css/11-private-group-rides.css"
    ]
  }
];

async function buildBundle(bundle) {
  const sourceParts = await Promise.all(
    bundle.sources.map((source) => readFile(path.join(projectRoot, source), "utf8"))
  );
  const generated = sourceParts.join("");
  const targetPath = path.join(projectRoot, bundle.target);

  if (checkOnly) {
    const current = await readFile(targetPath, "utf8");
    if (current !== generated) {
      throw new Error(`${bundle.target} is out of date. Run npm run build.`);
    }
    console.log(`verified ${bundle.target}`);
    return;
  }

  const temporaryPath = `${targetPath}.tmp`;
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(temporaryPath, generated);
  await rename(temporaryPath, targetPath);
  console.log(`built ${bundle.target}`);
}

try {
  for (const bundle of bundles) {
    await buildBundle(bundle);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
