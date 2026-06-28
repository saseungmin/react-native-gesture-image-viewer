import './index.css';

import { useVersion } from '@rspress/core/runtime';
import { HomeLayout as BasicHomeLayout, PackageManagerTabs } from '@rspress/core/theme-original';

function HomeLayout() {
  const version = useVersion();
  const packageName =
    version === '1.x'
      ? 'react-native-gesture-image-viewer@1.x'
      : 'react-native-gesture-image-viewer';

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
