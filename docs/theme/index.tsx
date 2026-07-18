import './index.css';

import { useLang, useVersion } from '@rspress/core/runtime';
import {
  Banner,
  HomeLayout as BasicHomeLayout,
  Layout as BasicLayout,
  PackageManagerTabs,
} from '@rspress/core/theme-original';

const PACKAGE_NAME = 'react-native-gesture-image-viewer';
const BETA_RELEASE_STORAGE_KEY = `${PACKAGE_NAME}-v3-beta-release`;

const BETA_RELEASE_CONTENT = {
  en: {
    href: '/3.x-beta/guide/getting-started/overview.html',
    message: 'v3 beta is live. Learn more',
  },
  ko: {
    href: '/3.x-beta/ko/guide/getting-started/overview.html',
    message: 'v3 beta 출시. 자세히 보기',
  },
} as const;

function getPackageName(version: string) {
  if (version === '1.x') {
    return `${PACKAGE_NAME}@1.x`;
  }

  if (version === '3.x-beta') {
    return `${PACKAGE_NAME}@beta`;
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

function Layout() {
  const lang = useLang();
  const content = lang === 'ko' ? BETA_RELEASE_CONTENT.ko : BETA_RELEASE_CONTENT.en;

  return (
    <BasicLayout
      beforeNav={
        <Banner
          href={content.href}
          message={content.message}
          storageKey={BETA_RELEASE_STORAGE_KEY}
        />
      }
    />
  );
}

export { HomeLayout, Layout };
// oxlint-disable-next-line import/export
export * from '@rspress/core/theme-original';
