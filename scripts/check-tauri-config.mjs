import { existsSync, readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const schema = JSON.parse(readFileSync('node_modules/@tauri-apps/cli/config.schema.json', 'utf8'));
const viteConfig = readFileSync('vite.config.ts', 'utf8');
const cargoToml = readFileSync('src-tauri/Cargo.toml', 'utf8');
const nativeLib = readFileSync('src-tauri/src/lib.rs', 'utf8');
const nativeMain = readFileSync('src-tauri/src/main.rs', 'utf8');
const nativeBuild = readFileSync('src-tauri/build.rs', 'utf8');
const defaultCapability = JSON.parse(readFileSync('src-tauri/capabilities/default.json', 'utf8'));
const windowProperties = schema.definitions?.WindowConfig?.properties ?? {};
const requiredWindowKeys = ['label', 'title', 'width', 'height', 'resizable', 'decorations'];
const requiredPetKeys = ['url', 'transparent', 'alwaysOnTop'];

const fail = (message) => {
  console.error(`tauri config check failed: ${message}`);
  process.exit(1);
};

if (config.productName !== 'Hermes Guild') {
  fail('productName must be "Hermes Guild"');
}

if (!config.build?.devUrl || !config.build?.frontendDist) {
  fail('build.devUrl and build.frontendDist are required');
}

if (!existsSync('src-tauri/icons/icon.png')) {
  fail('src-tauri/icons/icon.png is required by Tauri generated context');
}

if (config.build.devUrl !== 'http://127.0.0.1:1420') {
  fail('build.devUrl must match the Vite dev server URL');
}

if (!viteConfig.includes('port: 1420') || !viteConfig.includes('strictPort: true')) {
  fail('Vite dev server must use port 1420 with strictPort enabled for Tauri');
}

const windows = config.app?.windows;
if (!Array.isArray(windows)) {
  fail('app.windows must be an array');
}

const mainWindow = windows.find((window) => window.label === 'main');
const petWindow = windows.find((window) => window.label === 'pet');

if (!mainWindow) fail('main window is missing');
if (!petWindow) fail('pet window is missing');

for (const key of [...requiredWindowKeys, ...requiredPetKeys]) {
  if (!(key in windowProperties)) {
    fail(`installed Tauri schema does not define WindowConfig.${key}`);
  }
}

for (const key of requiredWindowKeys) {
  if (!(key in mainWindow)) fail(`main window missing ${key}`);
  if (!(key in petWindow)) fail(`pet window missing ${key}`);
}

for (const key of requiredPetKeys) {
  if (!(key in petWindow)) fail(`pet window missing ${key}`);
}

if (petWindow.url !== '/?mode=pet') {
  fail('pet window must load /?mode=pet');
}

if (petWindow.decorations !== false || petWindow.transparent !== true || petWindow.alwaysOnTop !== false) {
  fail('pet window must be undecorated, transparent, and not pinned always on top');
}

if (petWindow.transparent === true && config.app.macOSPrivateApi !== true) {
  fail('transparent pet window requires app.macOSPrivateApi on macOS');
}

if (!defaultCapability.permissions?.includes('core:window:allow-start-dragging')) {
  fail('default capability must allow start-dragging for the undecorated pet window');
}

const requiredCargoFragments = [
  'name = "hermes-guild"',
  'edition = "2021"',
  'name = "hermes_guild_lib"',
  'tauri-build = { version = "2"',
  'tauri = { version = "2"',
  'tauri-plugin-opener = "2"',
];

for (const fragment of requiredCargoFragments) {
  if (!cargoToml.includes(fragment)) fail(`src-tauri/Cargo.toml missing ${fragment}`);
}

if (!nativeLib.includes('tauri::Builder::default()')) {
  fail('src-tauri/src/lib.rs must create a Tauri builder');
}

if (!nativeLib.includes('tauri_plugin_opener::init()')) {
  fail('src-tauri/src/lib.rs must install the opener plugin used by the scaffold');
}

if (!nativeLib.includes('tauri::generate_context!()')) {
  fail('src-tauri/src/lib.rs must run with generated Tauri context');
}

if (!nativeMain.includes('hermes_guild_lib::run()')) {
  fail('src-tauri/src/main.rs must call hermes_guild_lib::run()');
}

if (!nativeBuild.includes('tauri_build::build()')) {
  fail('src-tauri/build.rs must call tauri_build::build()');
}

console.log('ok: tauri config and native scaffold match Hermes Guild v0 expectations');
