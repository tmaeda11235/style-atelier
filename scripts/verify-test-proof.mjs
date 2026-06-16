/* global console, process, Buffer */
import fs from 'fs/promises';
import { execSync } from 'child_process';
import crypto from 'crypto';
import path from 'path';

async function getDependencyGraph() {
  execSync('node scripts/generate-dependency-graph.mjs', { stdio: 'inherit' });
  const graphData = await fs.readFile('artifacts/dependency-graph.json', 'utf8');
  return JSON.parse(graphData);
}

async function main() {
  console.log('Verifying Proof of Work...');
  
  try {
    const encryptedData = await fs.readFile('artifacts/test-proof.enc', 'utf8');
    const proof = JSON.parse(encryptedData);
    
    // We assume the private key is stored in environment variable PRIVATE_KEY (passed by GitHub Actions)
    const privateKeyPem = process.env.PRIVATE_KEY;
    if (!privateKeyPem) {
      console.error('PRIVATE_KEY environment variable is not set. Assuming valid for local bypass or erroring out.');
      process.exit(1);
    }

    // Decrypt AES key with RSA Private Key
    const encryptedAesKeyBuffer = Buffer.from(proof.encryptedAesKey, 'base64');
    const aesKey = crypto.privateDecrypt(privateKeyPem, encryptedAesKeyBuffer);
    
    // Decrypt Payload with AES Key
    const iv = Buffer.from(proof.iv, 'base64');
    const authTag = Buffer.from(proof.authTag, 'base64');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
    decipher.setAuthTag(authTag);
    
    let decryptedBody = decipher.update(proof.encryptedBody, 'base64', 'utf8');
    decryptedBody += decipher.final('utf8');
    
    const payload = JSON.parse(decryptedBody);
    console.log('Decrypted Payload:', JSON.stringify(payload, null, 2));

    // 1. Verify Timestamp
    const now = Date.now();
    const payloadTime = payload.timestamp;
    if (!payloadTime) {
      console.error('Verification Failed: Payload is missing timestamp.');
      process.exit(1);
    }
    const diffHours = (now - payloadTime) / (1000 * 60 * 60);
    if (diffHours > 24) {
      console.error(`Verification Failed: Proof is too old (${diffHours.toFixed(1)} hours ago).`);
      process.exit(1);
    }
    console.log('Timestamp verified.');

    // 2. Verify Commit Hash
    const recentCommits = execSync('git log -n 5 --format="%H"', { encoding: 'utf8' }).trim().split('\n');
    if (!recentCommits.includes(payload.commitHash)) {
      console.error(`Verification Failed: Payload commit hash ${payload.commitHash} not found in recent history.`);
      process.exit(1);
    }
    console.log(`Commit hash verified (${payload.commitHash}).`);

    // 3. Verify Changed Files exactly match git diff
    // Fetch origin/main so we can diff against it
    try {
      execSync('git fetch origin main:main', { stdio: 'ignore' });
    } catch {
      // Ignore if fetch fails (might already have it or we are testing locally)
    }
    const diffOutput = execSync('git diff origin/main...HEAD --name-only', { encoding: 'utf8' });
    const actualChangedFiles = diffOutput.split('\n').filter(Boolean).map(f => f.trim().replace(/\\/g, '/'));
    
    // Normalize and sort arrays to compare
    const expectedSorted = [...actualChangedFiles].sort();
    const payloadSorted = [...(payload.changedFiles || [])].map(f => f.replace(/\\/g, '/')).sort();
    
    if (JSON.stringify(expectedSorted) !== JSON.stringify(payloadSorted)) {
      console.error('Verification Failed: changedFiles in payload does not exactly match actual git diff.');
      console.error('Expected:', expectedSorted);
      console.error('Payload:', payloadSorted);
      process.exit(1);
    }
    console.log('Changed files match git diff exactly.');

    // 4. Verify Tested Journeys match dependency graph
    const reverseGraph = await getDependencyGraph();
    
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

    for (const file of actualChangedFiles) {
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
    
    const expectedJourneys = Array.from(affectedJourneys).sort();
    const payloadJourneys = [...(payload.testedJourneys || [])].sort();

    if (payloadJourneys.includes('ALL')) {
      console.log('Payload states ALL journeys were tested. This is acceptable.');
    } else {
      // Payload must contain ALL expected journeys.
      const missingJourneys = expectedJourneys.filter(j => !payloadJourneys.includes(j));
      if (missingJourneys.length > 0) {
        console.error('Verification Failed: payload is missing required testedJourneys.');
        console.error('Missing:', missingJourneys);
        console.error('Payload:', payloadJourneys);
        process.exit(1);
      }
      console.log('Tested journeys verification passed.');
    }

    console.log('Proof of Work is strictly valid! Skipping heavy CI tests.');
    process.exit(0);

  } catch (error) {
    console.error('Failed to verify Proof of Work:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
