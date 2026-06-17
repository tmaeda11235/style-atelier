import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Building mobile application with Vite...');
execSync('npx vite build --config vite.config.mobile.ts', { stdio: 'inherit', cwd: rootDir });

console.log('Generating Service Worker...');

const distDir = path.join(rootDir, 'dist-mobile');
const assetsDir = path.join(distDir, 'assets');

// Get compiled JS and CSS files
const files = fs.readdirSync(assetsDir);
const jsFile = files.find(f => f.startsWith('main-') && f.endsWith('.js'));
const cssFile = files.find(f => f.startsWith('main-') && f.endsWith('.css'));

if (!jsFile || !cssFile) {
  throw new Error('Failed to find compiled assets in dist-mobile/assets');
}

const jsPath = `/mobile/assets/${jsFile}`;
const cssPath = `/mobile/assets/${cssFile}`;

// Read sw.template.js
const templatePath = path.join(rootDir, 'src/mobile-app/sw.template.js');
let swContent = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders
swContent = swContent
  .replace('__JS_PATH__', jsPath)
  .replace('__CSS_PATH__', cssPath);

// Write to dist-mobile/sw.js
fs.writeFileSync(path.join(distDir, 'sw.js'), swContent, 'utf8');
console.log(`Service Worker generated successfully at dist-mobile/sw.js`);
console.log(`Cached assets: \n - ${jsPath}\n - ${cssPath}`);
