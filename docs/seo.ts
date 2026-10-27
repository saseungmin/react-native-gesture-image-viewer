import { writeFile } from 'node:fs/promises';
import * as path from 'node:path';

import { normalizeHref, withSiteOrigin, type RouteMeta, type RspressPlugin } from '@rspress/core';

export type AlternateLink = {
  rel: 'alternate';
  hreflang: string;
  href: string;
};

export function seoPlugin(siteOrigin: string): RspressPlugin {
  const pageUrl = (routePath: string) => withSiteOrigin(normalizeHref(routePath, true), siteOrigin);
  let urls: string[] = [];
  let routeList: RouteMeta[] = [];

  return {
    name: 'docs-seo',
    routeGenerated(routes) {
      routeList = routes;
      urls = routes.map(({ routePath }) => pageUrl(routePath));
    },
    extendPageData(page) {
      const current = routeList.find(({ routePath }) => routePath === page.routePath);
      const alternatives = current
        ? routeList.filter(
            ({ version, pureRoutePath, lang }) =>
              version === current.version && pureRoutePath === current.pureRoutePath && lang,
          )
        : [];

      // Rspress reloads frontmatter from compiled MDX, so keep runtime metadata at the top level.
      Object.assign(page, {
        seoAlternates:
          alternatives.length > 1
            ? alternatives.map(({ lang, routePath }): AlternateLink => ({
                rel: 'alternate',
                hreflang: lang.replace(/_/g, '-'),
                href: pageUrl(routePath),
              }))
            : [],
      });
    },
    async afterBuild(config, isProd) {
      if (!isProd) return;

      const entries = [...new Set(urls)]
        .sort()
        .map((url) => `  <url><loc>${url.replace(/&/g, '&amp;')}</loc></url>`);
      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...entries,
        '</urlset>',
        '',
      ].join('\n');

      await writeFile(path.join(config.outDir ?? 'doc_build', 'sitemap.xml'), sitemap);
    },
  };
}
