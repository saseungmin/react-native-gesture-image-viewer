const path = require('path');
const { getConfig } = require('react-native-builder-bob/babel-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

module.exports = (api) => {
  api.cache(true);

  return getConfig(
    {
      presets: ['babel-preset-expo'],
      plugins: [
        // for web
        '@babel/plugin-proposal-export-namespace-from',
        // react-native-reanimated/plugin has to be listed last.
        ['react-native-reanimated/plugin'],
      ],
    },
    { root, pkg },
  );
};
