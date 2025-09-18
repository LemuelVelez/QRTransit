// babel.config.js
module.exports = function (api) {
    api.cache(true);
    return {
      presets: [
        'babel-preset-expo',
        // If you're using NativeWind v4, use it as a PRESET (not a plugin):
        'nativewind/babel',
      ],
      plugins: [
        // Expo Router belongs in plugins
        'expo-router/babel',
  
        // Reanimated v3 uses the Worklets plugin – keep it LAST
        'react-native-worklets/plugin',
      ],
    };
  };
  