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

## SEO

`rspress.config.ts` defines the production origin and enables clean URLs. The local
`seo.ts` plugin generates `sitemap.xml` from the documentation routes and supplies
language alternatives within each version. `theme/index.tsx` manages canonical
and hreflang links with Rspress's `useHead`, including client-side navigation.
Homepage descriptions are localized in each version's frontmatter, and
`public/robots.txt` advertises the sitemap.

This uses the [Rspress 2.0.21 plugin hooks](https://github.com/web-infra-dev/rspress/blob/7bd6c16cc019201497183617483777b5e327316c/website/docs/en/plugin/system/plugin-api.mdx)
and [useHead API](https://github.com/web-infra-dev/rspress/blob/7bd6c16cc019201497183617483777b5e327316c/website/docs/en/ui/hooks/use-head.mdx).
