import './index.css';

import {
  normalizeHrefInRuntime,
  useHead,
  useLang,
  usePage,
  useVersion,
  withBase,
  withSiteOrigin,
} from '@rspress/core/runtime';
import {
  Banner,
  HomeLayout as BasicHomeLayout,
  Layout as BasicLayout,
  PackageManagerTabs,
} from '@rspress/core/theme-original';
import type { ComponentProps } from 'react';

import type { AlternateLink } from '../seo';

const PACKAGE_NAME = 'react-native-gesture-image-viewer';
const STABLE_RELEASE_STORAGE_KEY = `${PACKAGE_NAME}-v3-stable-release`;

const STABLE_RELEASE_CONTENT = {
  en: {
    href: '/guide/migration-from-2.x.html',
    message: 'v3 is stable. See what changed',
  },
  ko: {
    href: '/ko/guide/migration-from-2.x.html',
    message: 'v3 정식 출시. 변경 사항 보기',
  },
} as const;

function getPackageName(version: string) {
  if (version === '1.x') {
    return `${PACKAGE_NAME}@1.x`;
  }

  if (version === '2.x') {
    return `${PACKAGE_NAME}@2`;
  }

  return PACKAGE_NAME;
}

function HomeLayout() {
  const version = useVersion();
  const packageName = getPackageName(version);

  return (
    <BasicHomeLayout
      afterHeroActions={
        <div
          className="rspress-doc custom-code"
          style={{ minHeight: 'auto', width: '100%', maxWidth: 500 }}
        >
          <PackageManagerTabs command={`install ${packageName}`} />
        </div>
      }
    />
  );
}

function Layout({ beforeNav, ...props }: ComponentProps<typeof BasicLayout>) {
  const { page } = usePage();
  const lang = useLang();
  const content = lang === 'ko' ? STABLE_RELEASE_CONTENT.ko : STABLE_RELEASE_CONTENT.en;
  const alternatives = (page.seoAlternates ?? []) as AlternateLink[];

  useHead({
    link:
      page.pageType === '404'
        ? []
        : [
            {
              rel: 'canonical',
              href: withSiteOrigin(withBase(normalizeHrefInRuntime(page.routePath))),
            },
            ...alternatives,
          ],
  });

  return (
    <BasicLayout
      {...props}
      beforeNav={
        <>
          <Banner
            href={content.href}
            message={content.message}
            storageKey={STABLE_RELEASE_STORAGE_KEY}
          />
          {beforeNav}
        </>
      }
    />
  );
}

export { HomeLayout, Layout };
// oxlint-disable-next-line import/export
export * from '@rspress/core/theme-original';
