import fs from 'fs';
import path from 'path';
import os from 'os';

const defaultCachePath = path.join(os.homedir(), '.cache', 'style-atelier-llm').replace(/\\/g, '/');

// Ensure cache directory exists
if (!fs.existsSync(defaultCachePath)) {
  try {
    fs.mkdirSync(defaultCachePath, { recursive: true });
    console.log(`Created local cache directory: ${defaultCachePath}`);
  } catch (err) {
    console.error(`Failed to create local cache directory: ${err.message}`);
  }
} else {
  console.log(`Local cache directory already exists: ${defaultCachePath}`);
}

const envLocalPath = path.resolve('.env.local');
let content = '';

if (fs.existsSync(envLocalPath)) {
  content = fs.readFileSync(envLocalPath, 'utf8');
}

if (!content.includes('LOCAL_LLM_CACHE_PATH')) {
  const lineToAdd = `LOCAL_LLM_CACHE_PATH="${defaultCachePath}"\n`;
  content = content ? `${content.trim()}\n${lineToAdd}` : lineToAdd;
  try {
    fs.writeFileSync(envLocalPath, content, 'utf8');
    console.log(`Added LOCAL_LLM_CACHE_PATH to .env.local: ${defaultCachePath}`);
  } catch (err) {
    console.error(`Failed to write to .env.local: ${err.message}`);
  }
} else {
  console.log('LOCAL_LLM_CACHE_PATH is already defined in .env.local');
}
