# SMBWeb2 development

SMBWeb2 remains a dependency-free static website. Public pages continue to load
`script.js` and `styles.css`; those files are generated deployable bundles.

## Source layout

- `src/js/` contains ordered JavaScript feature modules.
- `src/css/` contains ordered CSS layers.
- `tools/build-assets.mjs` concatenates those sources into the public bundles.
- Standalone page scripts such as `appointments.js`, `orders.js`, and
  `stories.js` remain separate because their pages already load them directly.

The numeric filename prefixes are intentional. Shared declarations come before
the feature modules that use them, and later CSS layers retain the cascade order
of the existing site.

## Commands

```sh
npm run build
npm run check
```

Run `npm run build` after editing anything under `src/js/` or `src/css/`.
`npm run check` validates every JavaScript file and fails when either generated
bundle is out of date.

Do not edit `script.js` or `styles.css` directly. Make the change in the
corresponding source module, rebuild, and test the generated public files.
