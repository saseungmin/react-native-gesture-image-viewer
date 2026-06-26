const testPlugins = process.env.NODE_ENV === 'test' ? ['react-native-worklets/plugin'] : [];

module.exports = {
  overrides: [
    {
      exclude: /\/node_modules\//,
      plugins: testPlugins,
      presets: ['module:react-native-builder-bob/babel-preset'],
    },
    {
      include: /\/node_modules\//,
      presets: ['module:@react-native/babel-preset'],
    },
  ],
};
