// babel.config.js
module.exports = function (api) {
    api.cache(true);
    return {
      presets: [
        ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
        'nativewind/babel', // NativeWind v4 is a *preset*
      ],
      // No plugins needed on SDK 52 (expo-router & reanimated are included by the preset)
    };
  };
  