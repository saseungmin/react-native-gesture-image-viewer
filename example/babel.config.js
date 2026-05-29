const path = require('path');
const { getConfig } = require('react-native-builder-bob/babel-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

module.exports = (api) => {
  api.cache(true);

  const config = getConfig(
    {
      presets: ['babel-preset-expo'],
      plugins: [
        // for web
        '@babel/plugin-transform-export-namespace-from',
        // react-native-worklets/plugin has to be listed last.
        'react-native-worklets/plugin',
      ],
    },
    { root, pkg },
  );

  // Expo SDK 56 asks Babel for a Metro cache key without a filename.
  // Babel rejects string/RegExp override patterns in that path, so keep Bob's
  // source override but express it as a filename-safe predicate.
  config.overrides = config.overrides?.map((override) => {
    if (typeof override.include !== 'string') {
      return override;
    }

    const includePath = override.include;

    return {
      ...override,
      include: (filename) => typeof filename === 'string' && filename.startsWith(includePath),
    };
  });

  return config;
};
