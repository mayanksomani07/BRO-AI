/**
 * patch-expo-sqlite.js
 * Runs automatically after "npm install" via the "postinstall" script.
 *
 * WHY: expo-sqlite ships a "exports" field in its package.json.
 * Node 20 resolves this field differently (strict ESM mode), which causes:
 *   Error: Cannot find module 'expo-sqlite/build/SQLite'
 * Removing the "exports" field forces Node to use the classic CJS resolution,
 * which finds the files correctly.
 */

const fs = require('fs');
const path = require('path');

const sqlitePkgPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-sqlite',
  'package.json'
);

if (!fs.existsSync(sqlitePkgPath)) {
  console.log('⚠️  expo-sqlite not found in node_modules — skipping patch');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(sqlitePkgPath, 'utf8'));

if (!pkg.exports) {
  console.log('✅ expo-sqlite already patched (no exports field)');
  process.exit(0);
}

delete pkg.exports;
fs.writeFileSync(sqlitePkgPath, JSON.stringify(pkg, null, 2));
console.log('✅ Patched expo-sqlite: removed "exports" field (Node 20 fix)');