import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const wasmSrcDir = path.join(rootDir, 'node_modules', '@litert-lm', 'core', 'wasm');
const wasmDestDir = path.join(rootDir, 'assets', 'wasm');

// Ensure destination directory exists
if (!fs.existsSync(wasmDestDir)) {
  fs.mkdirSync(wasmDestDir, { recursive: true });
}

console.log('Copying WASM assets from node_modules...');
const filesToCopy = [
  'litertlm_wasm_compat_internal.js',
  'litertlm_wasm_compat_internal.wasm',
  'litertlm_wasm_internal.js',
  'litertlm_wasm_internal.wasm'
];

for (const file of filesToCopy) {
  const srcPath = path.join(wasmSrcDir, file);
  const destPath = path.join(wasmDestDir, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} to assets/wasm/`);
  } else {
    console.error(`Source file not found: ${srcPath}`);
  }
}

console.log('WASM assets setup completed successfully.');
