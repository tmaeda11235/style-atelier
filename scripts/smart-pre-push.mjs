/* global console, process */
import fs from 'fs/promises';
import { execSync } from 'child_process';
import crypto from 'crypto';

async function main() {
  console.log('Running Smart Pre-Push...');
  
  // 0. Ensure working directory is clean
  const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (status) {
    const uncommittedFiles = status.split('\n').map(line => line.trim().split(' ').pop());
    const nonProofFiles = uncommittedFiles.filter(f => !f.endsWith('artifacts/test-proof.enc'));
    if (nonProofFiles.length > 0) {
      console.error("❌ ERROR: Your working directory is not clean. Please commit your changes before running 'npm run push'.");
      process.exit(1);
    }
  }

  // 0.5 Migration: Remove test-proof.enc from git tracking if it exists
  try {
    execSync('git ls-files --error-unmatch artifacts/test-proof.enc', { stdio: 'ignore' });
    console.log('\n⚠️ [Migration Notice] artifacts/test-proof.enc is tracked in your git branch.');
    console.log('Removing it from the git tree to prevent future merge conflicts...');
    execSync('git rm --cached artifacts/test-proof.enc');
    execSync('git commit -m "chore: remove test-proof.enc from git tree in favor of git notes"');
    console.log('✅ Successfully removed and committed. Proceeding with push...\n');
  } catch (e) {
    // If it throws, the file is not tracked, which is exactly what we want.
  }

  // 1. Get changed files
  let diffOutput;
  try {
    diffOutput = execSync('git diff origin/main...HEAD --name-only', { encoding: 'utf8' });
  } catch {
    // If origin/main doesn't exist or is not fetched, fallback to git diff main
    console.log('Failed to diff against origin/main. Trying main...');
    diffOutput = execSync('git diff main...HEAD --name-only', { encoding: 'utf8' });
  }

  const changedFiles = diffOutput.trim().split('\n').filter(Boolean).map(f => f.trim().replace(/\\/g, '/'));
  
  if (changedFiles.length === 0) {
    console.log('No files changed compared to main.');
    process.exit(0);
  }

  console.log(`Changed files:\n  ${changedFiles.join('\n  ')}`);

  // 2. Generate and load dependency graph
  execSync('node scripts/generate-dependency-graph.mjs', { stdio: 'inherit' });
  const reverseGraph = JSON.parse(await fs.readFile('artifacts/dependency-graph.json', 'utf8'));
  
  // 3. Load User Journeys to get viewComponents
  const userJourneysData = JSON.parse(await fs.readFile('memory-bank/userJourneys.json', 'utf8'));
  const userJourneys = userJourneysData.journeys || [];
  
  const viewComponentToJourney = {};
  for (const journey of userJourneys) {
    if (journey.viewComponents) {
      for (const vc of journey.viewComponents) {
        if (!viewComponentToJourney[vc]) viewComponentToJourney[vc] = new Set();
        viewComponentToJourney[vc].add(journey.id);
      }
    }
  }

  // 4. Traverse dependency graph to find affected View Components
  const affectedViewComponents = new Set();
  const visited = new Set();
  
  function traverse(file) {
    if (visited.has(file)) return;
    visited.add(file);
    
    if (viewComponentToJourney[file]) {
      affectedViewComponents.add(file);
    }
    
    const dependents = reverseGraph[file] || [];
    for (const dep of dependents) {
      traverse(dep);
    }
  }

  const srcFiles = changedFiles.filter(f => f.startsWith('src/') || f.startsWith('tests/unit/'));

  for (const file of changedFiles) {
    if (file.startsWith('src/')) {
      traverse(file);
    }
  }

  const affectedJourneys = new Set();
  for (const vc of affectedViewComponents) {
    const journeys = viewComponentToJourney[vc] || new Set();
    for (const j of journeys) {
      affectedJourneys.add(j);
    }
  }

  // 5. Run static analysis (Lint & ESLint Whitelist)
  console.log('\n--- Running Static Analysis ---');
  try {
    execSync('npm run lint', { stdio: 'inherit' });
      
    console.log('Fetching target config from git ref: main...');
    execSync('node scratch/check-eslint-whitelist.js eslint.config.mjs main', { stdio: 'inherit' });
    execSync('node scratch/check-vitest-coverage-exceptions.js vitest.config.ts main', { stdio: 'inherit' });
  } catch {
    console.error('Static analysis failed. Please fix the errors before pushing.');
    process.exit(1);
  }

  // 6. Run UTs with coverage
  console.log('\n--- Running Unit Tests with Coverage ---');
  if (srcFiles.length > 0) {
    try {
      execSync('npm test -- --coverage', { stdio: 'inherit' });
    } catch {
      console.error('Unit tests or coverage threshold checks failed.');
      process.exit(1);
    }
  } else {
    console.log('No src/ or unit test files changed. Skipping Vitest.');
  }

  const testedJourneys = Array.from(affectedJourneys);

  // 7. Build extension before E2E tests if we are running any E2E tests
  if (testedJourneys.length > 0 || srcFiles.length > 0) {
    console.log('\n--- Building Extension for E2E ---');
    try {
      execSync('npm run build', { stdio: 'inherit' });
    } catch {
      console.error('Failed to build extension.');
      process.exit(1);
    }
  }

  // 8. Run E2E
  console.log('\n--- Running E2E Tests ---');
  if (testedJourneys.length > 0) {
    try {
      // Create grep pattern: e.g. "(@J-01|@J-02)"
      const grepPattern = `(${testedJourneys.join('|')})`;
      console.log(`Affected Journeys: ${testedJourneys.join(', ')}`);
      console.log(`Running E2E tests for pattern: ${grepPattern}`);
      execSync(`npx playwright test -g "${grepPattern}" --retries=2`, { stdio: 'inherit' });
    } catch {
      console.error('E2E tests failed.');
      process.exit(1);
    }
  } else if (srcFiles.length > 0) {
    // If src files changed but NO journey was matched, it means we don't have coverage defined, OR it's an orphan file.
    // We should probably run ALL E2E just to be safe, or fail.
    console.log('WARNING: Changed files did not map to any View Components defined in userJourneys.json.');
    console.log('Running ALL E2E tests to be safe.');
    try {
      execSync(`npx playwright test --retries=2`, { stdio: 'inherit' });
      testedJourneys.push('ALL'); // Indicate all were run
    } catch {
      console.error('E2E tests failed.');
      process.exit(1);
    }
  } else {
    console.log('No source code changes requiring E2E tests.');
  }

  // 9. Generate Proof of Work
  console.log('\n--- Generating Proof of Work ---');
  const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const payload = {
    commitHash,
    changedFiles,
    testedJourneys,
    timestamp: new Date().toISOString()
  };

  const publicKey = await fs.readFile('.github/keys/public.pem', 'utf8');
  
  // Hybrid Encryption
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  
  let encryptedBody = cipher.update(JSON.stringify(payload), 'utf8', 'base64');
  encryptedBody += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  
  const encryptedAesKey = crypto.publicEncrypt(publicKey, aesKey).toString('base64');
  
  const proof = {
    encryptedAesKey,
    iv: iv.toString('base64'),
    authTag,
    encryptedBody
  };

  await fs.mkdir('artifacts', { recursive: true });
  await fs.writeFile('artifacts/test-proof.enc', JSON.stringify(proof, null, 2));
  
  console.log('Proof of Work generated at artifacts/test-proof.enc');
  console.log('NOTE: This proof will be attached to the current commit as a git note by the push script.');
}

main().catch(console.error);
