import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jaPath = path.resolve(__dirname, '../src/locales/ja/translation.json');
const enPath = path.resolve(__dirname, '../src/locales/en/translation.json');

function extractKeys(val, prefix = '', keys = new Set()) {
  if (val === null || val === undefined) {
    keys.add(prefix);
    return keys;
  }
  
  if (Array.isArray(val)) {
    keys.add(`${prefix}.length`);
    val.forEach((item, index) => {
      extractKeys(item, `${prefix}.${index}`, keys);
    });
  } else if (typeof val === 'object') {
    Object.keys(val).forEach(key => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      extractKeys(val[key], nextPrefix, keys);
    });
  } else {
    keys.add(prefix);
  }
  return keys;
}

try {
  if (!fs.existsSync(jaPath)) {
    console.error(`Japanese translation file not found at: ${jaPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(enPath)) {
    console.error(`English translation file not found at: ${enPath}`);
    process.exit(1);
  }

  const jaData = JSON.parse(fs.readFileSync(jaPath, 'utf-8'));
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

  const jaKeys = extractKeys(jaData);
  const enKeys = extractKeys(enData);

  const missingInEn = [];
  const missingInJa = [];

  for (const key of jaKeys) {
    if (!enKeys.has(key)) {
      missingInEn.push(key);
    }
  }

  for (const key of enKeys) {
    if (!jaKeys.has(key)) {
      missingInJa.push(key);
    }
  }

  let hasError = false;

  if (missingInEn.length > 0) {
    console.error('❌ Keys present in Japanese (ja/translation.json) but missing in English (en/translation.json):');
    missingInEn.sort().forEach(key => console.error(`  - ${key}`));
    hasError = true;
  }

  if (missingInJa.length > 0) {
    console.error('❌ Keys present in English (en/translation.json) but missing in Japanese (ja/translation.json):');
    missingInJa.sort().forEach(key => console.error(`  - ${key}`));
    hasError = true;
  }

  if (hasError) {
    console.error('\nResult: Translation key mismatch detected! Please make sure all keys match between both translation files.');
    process.exit(1);
  }

  console.log('✅ Translation files are synchronized (Japanese and English keys match).');
  process.exit(0);
} catch (error) {
  console.error('An error occurred during translation key checking:', error);
  process.exit(1);
}
