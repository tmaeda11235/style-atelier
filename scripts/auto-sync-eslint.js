// @ts-nocheck
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../eslint.config.mjs');

console.log('Running ESLint to scan actual violations...');

let eslintOutput;
try {
  eslintOutput = execSync('npx eslint src/ --format json', { maxBuffer: 20 * 1024 * 1024 }).toString();
} catch (error) {
  eslintOutput = error.stdout.toString();
}

let results;
try {
  results = JSON.parse(eslintOutput);
} catch (e) {
  console.error('Failed to parse ESLint output as JSON:', e);
  console.error(eslintOutput.substring(0, 1000));
  process.exit(1);
}

const maxLinesFiles = new Set();
const complexityFiles = new Set();
const maxLinesPerFuncFiles = new Set();

for (const result of results) {
  const relativePath = path.relative(path.join(__dirname, '..'), result.filePath).replace(/\\/g, '/');
  
  if (relativePath.includes('.test.') || relativePath.includes('.spec.')) {
    continue;
  }

  for (const message of result.messages) {
    if (message.ruleId === 'max-lines') {
      maxLinesFiles.add(relativePath);
    } else if (message.ruleId === 'sonarjs/cognitive-complexity') {
      complexityFiles.add(relativePath);
    } else if (message.ruleId === 'max-lines-per-function') {
      maxLinesPerFuncFiles.add(relativePath);
    }
  }
}

console.log('Found actual violations:');
console.log(`- max-lines: ${maxLinesFiles.size} files`);
console.log(`- sonarjs/cognitive-complexity: ${complexityFiles.size} files`);
console.log(`- max-lines-per-function: ${maxLinesPerFuncFiles.size} files`);

let configContent = fs.readFileSync(CONFIG_PATH, 'utf8');

const formatFileList = (filesSet, placeholder) => {
  const sorted = Array.from(filesSet).sort();
  const list = [placeholder, ...sorted].map(f => `      "${f}",`).join('\n');
  return `\n${list}\n    `;
};

// 1. max-lines の置換
const maxLinesRegex = /(\/\/ 1\. Files violating max-lines \(300 lines limit\)\s*\{\s*files:\s*\[)([\s\S]*?)(\],\s*rules:\s*\{\s*"max-lines":\s*"warn"\s*\}\s*\})/g;
configContent = configContent.replace(maxLinesRegex, (match, p1, p2, p3) => {
  return p1 + formatFileList(maxLinesFiles, 'src/placeholder-non-existent-max-lines.ts') + p3;
});

// 2. cognitive-complexity の置換
const complexityRegex = /(\/\/ 2\. Files violating sonarjs\/cognitive-complexity \(15 limit\)\s*\{\s*files:\s*\[)([\s\S]*?)(\],\s*rules:\s*\{\s*"sonarjs\/cognitive-complexity":\s*"warn"\s*\}\s*\})/g;
configContent = configContent.replace(complexityRegex, (match, p1, p2, p3) => {
  return p1 + formatFileList(complexityFiles, 'src/placeholder-non-existent-complexity.ts') + p3;
});

// 3. max-lines-per-function の置換
const maxFuncLinesRegex = /(\/\/ 3\. Files violating max-lines-per-function \(50 limit\)\s*\{\s*files:\s*\[)([\s\S]*?)(\],\s*rules:\s*\{\s*"max-lines-per-function":\s*"warn"\s*\}\s*\})/g;
configContent = configContent.replace(maxFuncLinesRegex, (match, p1, p2, p3) => {
  return p1 + formatFileList(maxLinesPerFuncFiles, 'src/placeholder-non-existent-func-lines.ts') + p3;
});

fs.writeFileSync(CONFIG_PATH, configContent, 'utf8');
console.log('Successfully synchronized eslint.config.mjs!');
