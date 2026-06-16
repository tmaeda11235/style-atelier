import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: path.resolve('.env.local') });

const cachePath = process.env.LOCAL_LLM_CACHE_PATH;
if (!cachePath) {
  console.error('Error: LOCAL_LLM_CACHE_PATH environment variable is not defined in .env.local.');
  process.exit(1);
}

const resolvedPath = path.resolve(cachePath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Error: Cache path directory does not exist: ${resolvedPath}`);
  process.exit(1);
}

console.log(`Starting local LLM cache server serving: ${resolvedPath} on port 8888`);

// Resolve local http-server bin path for cross-platform robustness
const httpServerBin = path.resolve('node_modules', 'http-server', 'bin', 'http-server');

const child = spawn('node', [httpServerBin, resolvedPath, '-p', '8888', '--cors'], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (err) => {
  console.error('Failed to start cache server:', err);
});
