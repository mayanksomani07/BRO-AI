/**
 * metro.config.js
 * Fixes expo-sqlite "Cannot find module SQLiteDatabase" on Node 20+
 * Key fix: unstable_enablePackageExports = false
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix 1: Disable package exports resolution — this prevents the ESM/CJS
// conflict that causes "Cannot find module expo-sqlite/build/SQLiteDatabase"
// on Node 20+ with expo-sqlite 14.x
config.resolver.unstable_enablePackageExports = false;

// Fix 2: Allow .cjs files to be resolved
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

module.exports = config;
