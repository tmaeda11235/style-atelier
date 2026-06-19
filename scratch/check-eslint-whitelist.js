const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const currentPath = process.argv[2];
let targetContent;

if (!currentPath) {
  console.error('Usage: node check-eslint-whitelist.js <current_config> [target_config_or_git_ref]');
  process.exit(1);
}

const targetArg = process.argv[3];

if (targetArg && fs.existsSync(targetArg)) {
  targetContent = fs.readFileSync(targetArg, 'utf8');
} else {
  const gitRef = targetArg || 'origin/main';
  console.log(`Fetching target config from git ref: ${gitRef}...`);
  try {
    targetContent = execSync(`git show ${gitRef}:eslint.config.mjs`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString('utf8');
  } catch (e) {
    if (!targetArg) {
      console.log('origin/main not found, trying main branch...');
      try {
        targetContent = execSync('git show main:eslint.config.mjs', { stdio: ['pipe', 'pipe', 'ignore'] }).toString('utf8');
      } catch (e2) {
        console.error('Failed to retrieve target eslint.config.mjs from git.');
        process.exit(1);
      }
    } else {
      console.error(`Failed to retrieve target eslint.config.mjs from git ref: ${gitRef}`);
      process.exit(1);
    }
  }
}

const parseArray = (matchStr) => {
  if (!matchStr) return [];
  const files = [];
  const fileRegex = /['"]([^'"]+)['"]/g;
  let match;
  while ((match = fileRegex.exec(matchStr)) !== null) {
    files.push(match[1]);
  }
  return files;
};

const extractListsFromContent = (content) => {
  const maxLinesRegex = /\/\/ 1\. Files violating max-lines \(300 lines limit\)\s*\{\s*files:\s*\[([\s\S]*?)\]/;
  const complexityRegex = /\/\/ 2\. Files violating sonarjs\/cognitive-complexity \(15 limit\)\s*\{\s*files:\s*\[([\s\S]*?)\]/;
  const maxFuncLinesRegex = /\/\/ 3\. Files violating max-lines-per-function \(50 limit\)\s*\{\s*files:\s*\[([\s\S]*?)\]/;
  const forbidElementsRegex = /\/\/ 5\. Files violating react\/forbid-elements \(button, input, img etc\)\s*\{\s*files:\s*\[([\s\S]*?)\]/;

  const maxLinesMatch = content.match(maxLinesRegex);
  const complexityMatch = content.match(complexityRegex);
  const maxFuncLinesMatch = content.match(maxFuncLinesRegex);
  const forbidElementsMatch = content.match(forbidElementsRegex);

  return {
    maxLines: parseArray(maxLinesMatch ? maxLinesMatch[1] : ''),
    complexity: parseArray(complexityMatch ? complexityMatch[1] : ''),
    maxFuncLines: parseArray(maxFuncLinesMatch ? maxFuncLinesMatch[1] : ''),
    forbidElements: parseArray(forbidElementsMatch ? forbidElementsMatch[1] : ''),
  };
};

if (!fs.existsSync(currentPath)) {
  console.error(`Current config file not found: ${currentPath}`);
  process.exit(1);
}
const currentContent = fs.readFileSync(currentPath, 'utf8');

const currentLists = extractListsFromContent(currentContent);
const targetLists = extractListsFromContent(targetContent);

let hasError = false;

const checkAddedFiles = (ruleName, currentList, targetList) => {
  const targetSet = new Set(targetList);
  const addedFiles = [];

  for (const file of currentList) {
    if (file.includes('placeholder')) {
      continue;
    }
    if (!targetSet.has(file)) {
      addedFiles.push(file);
    }
  }

  if (addedFiles.length > 0) {
    console.error(`\x1b[31mError: Newly added exception files found for rule "${ruleName}":\x1b[0m`);
    addedFiles.forEach(file => {
      console.error(`  - ${file}`);
    });
    hasError = true;
  }
};

checkAddedFiles('max-lines', currentLists.maxLines, targetLists.maxLines);
checkAddedFiles('sonarjs/cognitive-complexity', currentLists.complexity, targetLists.complexity);
checkAddedFiles('max-lines-per-function', currentLists.maxFuncLines, targetLists.maxFuncLines);
checkAddedFiles('react/forbid-elements', currentLists.forbidElements, targetLists.forbidElements);

if (hasError) {
  console.error('\n\x1b[31mVerification failed! You are not allowed to add new files to the ESLint whitelist.\x1b[0m');
  console.error('\x1b[31mPlease refactor your code to satisfy the quality boundaries instead of adding it to the overrides.\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32mVerification passed! No new files added to the ESLint whitelist.\x1b[0m');
  process.exit(0);
}
