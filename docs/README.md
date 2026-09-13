# React Native Gesture Image Viewer website

## Setup

Install workspace dependencies from the repository root:

```bash
pnpm install
```

## Get started

Start the dev server:

```bash
pnpm -C docs dev
```

Build the website for production:

```bash
pnpm docs:build
```

Preview the production build locally:

```bash
pnpm -C docs preview
```

## Documentation versions

The default `3.x` documentation is served at `/` (English) and `/ko/` (Korean).
Older versions remain available at `/2.x/` and `/1.x/`, with `/ko/` after the
version prefix for Korean. Maintenance documentation must use versioned install
commands (`@2` or `@1.x`) and versioned absolute links to AI documentation.

`docs/public/_redirects` preserves `/3.x-beta/*` links and explicit `/3.x/*`
links on Cloudflare Pages. Rspress copies this file into `doc_build/_redirects`.
The local Rspress preview server does not apply Cloudflare redirect rules.
