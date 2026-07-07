import './index.css';

import { useVersion } from '@rspress/core/runtime';
import { HomeLayout as BasicHomeLayout, PackageManagerTabs } from '@rspress/core/theme-original';

const PACKAGE_NAME = 'react-native-gesture-image-viewer';

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

export { HomeLayout };
// oxlint-disable-next-line import/export
export * from '@rspress/core/theme-original';
