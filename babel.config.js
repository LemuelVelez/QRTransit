// babel.config.js
module.exports = function (api) {
    api.cache(true);
    return {
      presets: [
        ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
        'nativewind/babel', // NativeWind v4 is a *preset*
      ],
      plugins: [
        'expo-router/babel',
        'react-native-reanimated/plugin', // <-- LAST for Reanimated v3
      ],
    };
  };
  