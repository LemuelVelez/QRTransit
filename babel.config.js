// babel.config.js
module.exports = function (api) {
    api.cache(true);
    return {
      presets: [
        // Expo preset, plus JSX import for NativeWind
        ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
        // NativeWind v4 as a PRESET
        'nativewind/babel',
      ],
      plugins: [
        // Expo Router transforms
        'expo-router/babel',
        // Reanimated MUST be last
        'react-native-reanimated/plugin',
      ],
    };
  };
  