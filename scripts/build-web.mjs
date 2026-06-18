import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Building web application with Vite...');
execSync('npx vite build --config vite.config.web.ts', { stdio: 'inherit', cwd: rootDir });

console.log('Generating Service Worker...');

const distDir = path.join(rootDir, 'dist-web');
const assetsDir = path.join(distDir, 'assets');

// Get compiled JS and CSS files
const files = fs.readdirSync(assetsDir);
const jsFile = files.find(f => f.startsWith('main-') && f.endsWith('.js'));
const cssFile = files.find(f => f.startsWith('main-') && f.endsWith('.css'));

if (!jsFile || !cssFile) {
  throw new Error('Failed to find compiled assets in dist-web/assets');
}

const jsPath = `/assets/${jsFile}`;
const cssPath = `/assets/${cssFile}`;

// Read sw.template.js
const templatePath = path.join(rootDir, 'src/web-app/sw.template.js');
let swContent = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders
swContent = swContent
  .replace('__JS_PATH__', jsPath)
  .replace('__CSS_PATH__', cssPath);

// Write to dist-web/sw.js
fs.writeFileSync(path.join(distDir, 'sw.js'), swContent, 'utf8');
console.log(`Service Worker generated successfully at dist-web/sw.js`);
console.log(`Cached assets: \n - ${jsPath}\n - ${cssPath}`);

// Copy WASM assets to dist-web/assets/wasm
const wasmSrcDir = path.join(rootDir, 'assets', 'wasm');
const wasmDestDir = path.join(distDir, 'assets', 'wasm');
if (!fs.existsSync(wasmDestDir)) {
  fs.mkdirSync(wasmDestDir, { recursive: true });
}
const wasmFiles = [
  'litertlm_wasm_compat_internal.js',
  'litertlm_wasm_compat_internal.wasm',
  'litertlm_wasm_internal.js',
  'litertlm_wasm_internal.wasm'
];
for (const file of wasmFiles) {
  const src = path.join(wasmSrcDir, file);
  const dest = path.join(wasmDestDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied WASM asset: ${file} to dist-web/assets/wasm/`);
  }
}

