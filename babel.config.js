// babel.config.js
module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            'expo-router/babel',
            'react-native-css-interop/babel', // NativeWind v4 uses css-interop under the hood
            'react-native-reanimated/plugin', // LAST for Reanimated v3
        ],
    };
};
