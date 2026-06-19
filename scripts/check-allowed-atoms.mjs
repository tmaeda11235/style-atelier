import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const atomsDir = path.join(projectRoot, 'src', 'components', 'atoms');
const whitelistPath = path.join(projectRoot, 'allowed-atoms.json');

if (!fs.existsSync(whitelistPath)) {
  console.error('allowed-atoms.json not found');
  process.exit(1);
}

if (!fs.existsSync(atomsDir)) {
  console.log('src/components/atoms directory does not exist, skipping check.');
  process.exit(0);
}

const whitelist = JSON.parse(fs.readFileSync(whitelistPath, 'utf-8'));
const allowedSet = new Set(whitelist);

const files = fs.readdirSync(atomsDir);
let hasViolations = false;

for (const file of files) {
  const fullPath = path.join(atomsDir, file);
  if (!fs.statSync(fullPath).isFile()) {
    continue;
  }

  if (!allowedSet.has(file)) {
    console.error(`[Violation] Unallowed atom file found: src/components/atoms/${file}`);
    console.error(`Please register it in allowed-atoms.json if it is an approved foundational UI component.`);
    hasViolations = true;
  }
}

if (hasViolations) {
  process.exit(1);
}

console.log('Atoms whitelist check passed.');
process.exit(0);
