// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Make sure the CSS file below exists.
module.exports = withNativeWind(config, { input: './app/globals.css' });
