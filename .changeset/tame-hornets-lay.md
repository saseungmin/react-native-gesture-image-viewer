---
"react-native-gesture-image-viewer": major
---

feat: migrated reanimated v4
- Upgraded react-native-reanimated to version 4.x.
- Added react-native-worklets as a dependency.
- Enhanced `withSpring` animation responsiveness and behavior.
- https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x

Migration Reanimated Configure Guide:

```bash
npm install react-native-worklets
```

```diff
// babel.config.js
module.exports = (api) => {
  api.cache(true);

  return getConfig(
    {
      presets: ['babel-preset-expo'],
      plugins: [
        // for web
        '@babel/plugin-proposal-export-namespace-from',
        // react-native-worklets/plugin has to be listed last.
-       'react-native-reanimated/plugin',
+       'react-native-worklets/plugin',
      ],
    },
    { root, pkg },
  );
};
```

```diff
// metro.config.js
const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');
const { withMetroConfig } = require('react-native-monorepo-config');
- const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

const root = path.resolve(__dirname, '..');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = withMetroConfig(getDefaultConfig(__dirname), {
  root,
  dirname: __dirname,
});

config.resolver.unstable_enablePackageExports = true;

- module.exports = wrapWithReanimatedMetroConfig(config);
+ module.exports = config
```
