/* global console, process, fetch */
import fs from 'fs';
import path from 'path';

// Configuration
const THRESHOLD = 80;
const MAX_IMAGES = 10;
const SEARCH_DIRS = ['test-results', 'tests/screenshots'];
const REPORT_FILE = 'visual-ux-report.md';

/**
 * Find all PNG files recursively in the given directories
 */
function findPngFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findPngFiles(filePath, fileList);
    } else if (stat.isFile() && path.extname(file).toLowerCase() === '.png') {
      fileList.push(filePath);
    }
  }
  return fileList;
}

/**
 * Base64 encode file content
 */
function base64Encode(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString('base64');
}

/**
 * Call Gemini API to audit the image
 */
async function auditImage(imagePath, apiKey) {
  const base64Image = base64Encode(imagePath);
  const fileName = path.basename(imagePath);
  
  const prompt = `
You are a professional UX/UI Auditor. Evaluate this application screenshot based on:
1. Balanced Minimalism (Zero-UI): Is the layout clean, focusing on the main input field (e.g., Command Palette / Omnibox)? Is there unnecessary UI noise, or are extra features properly hidden (Progressive Disclosure)?
2. Theme Consistency: Are colors for text and background appropriate for the current mode (light or dark)? Check for hardcoded colors or unreadable text.
3. Layout & Alignment: Are there overlapping elements, text overflows, or broken/cluttered grids?
4. Accessibility: Is the visual hierarchy clear? Is key information easy to consume?

Provide a strict JSON response in the following schema:
{
  "score": <number from 0 to 100 representing UX quality>,
  "passed": <boolean: true if score >= 80, otherwise false>,
  "issues": [<string describing UX friction or visual bugs found>],
  "recommendations": [<string suggesting actionable visual fixes>]
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API call failed for ${fileName}: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const jsonText = result.candidates[0].content.parts[0].text.trim();
  
  try {
    return JSON.parse(jsonText);
  } catch (err) {
    console.error(`Failed to parse Gemini response as JSON for ${fileName}. Raw response:\n`, jsonText);
    throw err;
  }
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY environment variable is not set. Visual UX Audit will be skipped.");
    fs.writeFileSync(REPORT_FILE, "### Visual UX Audit Report\n\n⚠️ **GEMINI_API_KEY is not set.** The visual audit was skipped.");
    process.exit(0);
  }

  // 1. Gather images
  let allPngs = [];
  for (const dir of SEARCH_DIRS) {
    const absoluteDir = path.resolve(process.cwd(), dir);
    if (fs.existsSync(absoluteDir)) {
      allPngs = allPngs.concat(findPngFiles(absoluteDir));
    }
  }

  // Filter out failure screenshots if needed, or sort them.
  // We want to prioritize main pages and avoid evaluating just white/blank screens if possible.
  allPngs.sort();

  if (allPngs.length === 0) {
    console.log("No screenshots found in search directories. Visual UX Audit skipped.");
    fs.writeFileSync(REPORT_FILE, "### Visual UX Audit Report\n\nNo screenshots were found in `test-results` or `tests/screenshots`.");
    process.exit(0);
  }

  // Prioritize files containing interesting page keywords (workbench, dashboard, landing, settings, etc.)
  const prioritizedPngs = allPngs.filter(f => {
    const lower = f.toLowerCase();
    return lower.includes('workbench') || lower.includes('landing') || lower.includes('settings') || lower.includes('tutorial') || lower.includes('palette');
  });

  // Combine and slice to limit API usage
  const targetImages = [...new Set([...prioritizedPngs, ...allPngs])].slice(0, MAX_IMAGES);

  console.log(`Found ${allPngs.length} total PNGs. Selected ${targetImages.length} images for Visual UX Audit.`);

  const auditResults = [];
  let totalScore = 0;
  let overallPassed = true;

  for (const imagePath of targetImages) {
    const fileName = path.basename(imagePath);
    console.log(`Auditing ${fileName}...`);
    try {
      const evaluation = await auditImage(imagePath, apiKey);
      auditResults.push({
        path: imagePath,
        name: fileName,
        ...evaluation
      });
      totalScore += evaluation.score;
      if (evaluation.score < THRESHOLD) {
        overallPassed = false;
      }
      console.log(`- Score: ${evaluation.score}/100. Issues found: ${evaluation.issues.length}`);
    } catch (error) {
      console.error(`- Error auditing ${fileName}:`, error.message);
      auditResults.push({
        path: imagePath,
        name: fileName,
        score: 0,
        passed: false,
        issues: [`Audit execution failed: ${error.message}`],
        recommendations: []
      });
      overallPassed = false;
    }
  }

  const averageScore = auditResults.length > 0 ? Math.round(totalScore / auditResults.length) : 100;
  if (averageScore < THRESHOLD) {
    overallPassed = false;
  }

  // 2. Generate Markdown Report
  let markdown = `## 🎨 Visual UX/UI Auto Audit Report

### Summary
- **Overall Result**: ${overallPassed ? '🟢 **PASSED**' : '🔴 **FAILED**'}
- **Average Score**: **${averageScore} / 100** (Threshold: ${THRESHOLD})
- **Images Audited**: ${auditResults.length}

---

### Detailed Findings
`;

  for (const res of auditResults) {
    const statusEmoji = res.score >= THRESHOLD ? '🟢' : '🔴';
    markdown += `#### ${statusEmoji} ${res.name} (Score: **${res.score} / 100**)\n`;
    
    if (res.issues && res.issues.length > 0) {
      markdown += `**Issues Identified:**\n`;
      res.issues.forEach(issue => {
        markdown += `- ${issue}\n`;
      });
    } else {
      markdown += `- No critical visual issues identified.\n`;
    }

    if (res.recommendations && res.recommendations.length > 0) {
      markdown += `\n**Recommendations:**\n`;
      res.recommendations.forEach(rec => {
        markdown += `- ${rec}\n`;
      });
    }
    markdown += `\n---\n`;
  }

  fs.writeFileSync(REPORT_FILE, markdown);
  console.log(`Saved UX Audit report to ${REPORT_FILE}`);

  if (!overallPassed) {
    console.error(`❌ Visual UX/UI Audit FAILED. Average score ${averageScore} or a specific image score was below threshold (${THRESHOLD}).`);
    process.exit(1);
  } else {
    console.log(`✅ Visual UX/UI Audit PASSED with average score ${averageScore}/100.`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error("Critical error in visual UX audit script:", err);
  process.exit(1);
});
