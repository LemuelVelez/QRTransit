// babel.config.js
module.exports = function (api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        'expo-router/babel',
        'nativewind/babel',         // keep only if you use NativeWind
        'react-native-worklets/plugin', // MUST be last
      ],
    };
  };
  