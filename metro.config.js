// Lets Metro bundle the prebuilt Bible database (assets/db/bible.db) as an asset.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('db');

module.exports = config;
