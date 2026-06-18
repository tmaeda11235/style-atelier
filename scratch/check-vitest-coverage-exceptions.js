const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const currentPath = process.argv[2];
let targetContent;

if (!currentPath) {
  console.error('Usage: node check-vitest-coverage-exceptions.js <current_config> [target_config_or_git_ref]');
  process.exit(1);
}

const targetArg = process.argv[3];

if (targetArg && fs.existsSync(targetArg)) {
  targetContent = fs.readFileSync(targetArg, 'utf8');
} else {
  const gitRef = targetArg || 'origin/main';
  console.log(`Fetching target config from git ref: ${gitRef}...`);
  try {
    targetContent = execSync(`git show ${gitRef}:vitest.config.ts`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString('utf8');
  } catch (e) {
    if (!targetArg) {
      console.log('origin/main not found, trying main branch...');
      try {
        targetContent = execSync('git show main:vitest.config.ts', { stdio: ['pipe', 'pipe', 'ignore'] }).toString('utf8');
      } catch (e2) {
        console.error('Failed to retrieve target vitest.config.ts from git.');
        process.exit(1);
      }
    } else {
      console.error(`Failed to retrieve target vitest.config.ts from git ref: ${gitRef}`);
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

const extractCoverageExclude = (content) => {
  const coverageIdx = content.indexOf('coverage:');
  if (coverageIdx === -1) return [];
  const afterCoverage = content.slice(coverageIdx);
  
  const excludeIdx = afterCoverage.indexOf('exclude:');
  if (excludeIdx === -1) return [];
  const startBracket = afterCoverage.indexOf('[', excludeIdx);
  if (startBracket === -1) return [];
  const endBracket = afterCoverage.indexOf(']', startBracket);
  if (endBracket === -1) return [];
  
  const excludeContent = afterCoverage.slice(startBracket + 1, endBracket);
  return parseArray(excludeContent);
};

const extractThresholds = (content) => {
  const thresholds = {};
  const coverageIdx = content.indexOf('coverage:');
  if (coverageIdx === -1) return thresholds;
  const afterCoverage = content.slice(coverageIdx);
  
  const thresholdsIdx = afterCoverage.indexOf('thresholds:');
  if (thresholdsIdx === -1) return thresholds;
  const startBrace = afterCoverage.indexOf('{', thresholdsIdx);
  if (startBrace === -1) return thresholds;
  const endBrace = afterCoverage.indexOf('}', startBrace);
  if (endBrace === -1) return thresholds;
  
  const thresholdsContent = afterCoverage.slice(startBrace + 1, endBrace);
  
  const keys = ['statements', 'branches', 'functions', 'lines'];
  for (const key of keys) {
    const regex = new RegExp(`${key}:\\s*(\\d+)`);
    const match = thresholdsContent.match(regex);
    if (match) {
      thresholds[key] = parseInt(match[1], 10);
    }
  }
  return thresholds;
};

const extractReportsDirectory = (content) => {
  const coverageIdx = content.indexOf('coverage:');
  if (coverageIdx === -1) return null;
  const afterCoverage = content.slice(coverageIdx);
  
  const regex = /reportsDirectory:\s*([^\n,]+)/;
  const match = afterCoverage.match(regex);
  if (match) {
    return match[1].trim();
  }
  return null;
};

const isValidReportsDirectory = (value) => {
  if (!value) return true; // Undefined defaults to ./coverage in vitest
  
  const normalized = value.replace(/'/g, '"');
  
  // Case 1: Hardcoded to "./coverage" or "coverage"
  if (normalized === '"./coverage"' || normalized === '"coverage"') {
    return true;
  }
  
  // Case 2: Conditional expression that resolves to "./coverage" or "coverage" when process.env.CI is true
  const ciCondRegex = /process\.env\.CI\s*\?\s*"(\.?\/coverage)"\s*:\s*.+/;
  if (ciCondRegex.test(normalized)) {
    return true;
  }
  
  return false;
};

if (!fs.existsSync(currentPath)) {
  console.error(`Current config file not found: ${currentPath}`);
  process.exit(1);
}
const currentContent = fs.readFileSync(currentPath, 'utf8');

const currentExcludes = extractCoverageExclude(currentContent);
const targetExcludes = extractCoverageExclude(targetContent);

const currentThresholds = extractThresholds(currentContent);
const targetThresholds = extractThresholds(targetContent);

let hasError = false;

// 0. Check reportsDirectory mismatch
const currentReportsDir = extractReportsDirectory(currentContent);
if (!isValidReportsDirectory(currentReportsDir)) {
  console.error(`\x1b[31mError: reportsDirectory is set to an invalid path: "${currentReportsDir}"\x1b[0m`);
  console.error(`  reportsDirectory must either be undefined (defaulting to ./coverage), hardcoded to "./coverage",`);
  console.error(`  or use a condition that falls back to "./coverage" when process.env.CI is true`);
  console.error(`  (e.g., process.env.CI ? "./coverage" : "./coverage-qa").`);
  hasError = true;
}

// 1. Check newly added excludes
const targetSet = new Set(targetExcludes);
const addedExcludes = [];
for (const file of currentExcludes) {
  if (file.includes('placeholder')) continue;
  if (!targetSet.has(file)) {
    addedExcludes.push(file);
  }
}

if (addedExcludes.length > 0) {
  console.error(`\x1b[31mError: Newly added coverage exclude files found:\x1b[0m`);
  addedExcludes.forEach(file => {
    console.error(`  - ${file}`);
  });
  hasError = true;
}

// 2. Check lowered thresholds
const keys = ['statements', 'branches', 'functions', 'lines'];
for (const key of keys) {
  const curVal = currentThresholds[key];
  const tarVal = targetThresholds[key];
  if (curVal !== undefined && tarVal !== undefined) {
    if (curVal < tarVal) {
      console.error(`\x1b[31mError: Coverage threshold for "${key}" has been lowered from ${tarVal} to ${curVal}\x1b[0m`);
      hasError = true;
    }
  }
}

if (hasError) {
  console.error('\n\x1b[31mVerification failed! You are not allowed to add new coverage exceptions, lower thresholds, or break reportsDirectory consistency.\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32mVerification passed! Coverage exclusions, thresholds, and reportsDirectory are all valid.\x1b[0m');
  process.exit(0);
}

