import { writeFile } from 'node:fs/promises';
import * as path from 'node:path';

import {
  normalizeHref,
  withBase,
  withSiteOrigin,
  type RouteMeta,
  type RspressPlugin,
  type UserConfig,
} from '@rspress/core';

export type AlternateLink = {
  rel: 'alternate';
  hreflang: string;
  href: string;
};

export function seoPlugin(): RspressPlugin {
  let siteConfig: UserConfig = {};
  let routeList: RouteMeta[] = [];
  const pageUrl = (routePath: string) =>
    withSiteOrigin(
      withBase(
        normalizeHref(routePath, siteConfig.route?.cleanUrls ?? false),
        siteConfig.base ?? '/',
      ),
      siteConfig.siteOrigin,
    );

  return {
    name: 'docs-seo',
    routeGenerated(routes) {
      routeList = routes;
    },
    beforeBuild(config) {
      if (!config.siteOrigin) {
        throw new Error('A siteOrigin is required to generate SEO URLs.');
      }
      siteConfig = config;
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

      const entries = [...new Set(routeList.map(({ routePath }) => pageUrl(routePath)))]
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
