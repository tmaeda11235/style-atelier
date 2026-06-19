import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const srcDir = path.join(projectRoot, 'src');
const LIMIT = 7; // Interactive elements limit per component

const INTERACTIVE_TAGS = new Set([
  'Button',
  'Select',
  'Input',
  'Switch',
  'button',
  'select',
  'input',
  'textarea'
]);

function findViewFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findViewFiles(filePath));
    } else if (file.endsWith('View.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

function getTagName(node, sourceFile) {
  if (ts.isJsxElement(node)) {
    return node.openingElement.tagName.getText(sourceFile);
  }
  if (ts.isJsxSelfClosingElement(node)) {
    return node.tagName.getText(sourceFile);
  }
  return null;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  const violations = [];

  function countElementsInNode(rootNode) {
    let count = 0;
    const elements = [];

    function visit(node) {
      const tagName = getTagName(node, sourceFile);
      if (tagName && INTERACTIVE_TAGS.has(tagName)) {
        count++;
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        elements.push({ tag: tagName, line: line + 1, char: character + 1 });
      }
      ts.forEachChild(node, visit);
    }

    visit(rootNode);
    return { count, elements };
  }

  // Scan top-level declarations in the file
  sourceFile.forEachChild(node => {
    if (ts.isFunctionDeclaration(node)) {
      const name = node.name ? node.name.getText(sourceFile) : 'AnonymousFunction';
      const { count, elements } = countElementsInNode(node);
      if (count > LIMIT) {
        violations.push({ componentName: name, count, elements });
      }
    } else if (ts.isClassDeclaration(node)) {
      const name = node.name ? node.name.getText(sourceFile) : 'AnonymousClass';
      const { count, elements } = countElementsInNode(node);
      if (count > LIMIT) {
        violations.push({ componentName: name, count, elements });
      }
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        const name = decl.name.getText(sourceFile);
        if (decl.initializer) {
          // Only scan variables initialized to functions or JSX-like expressions
          if (
            ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer) ||
            ts.isJsxElement(decl.initializer) ||
            ts.isJsxSelfClosingElement(decl.initializer)
          ) {
            const { count, elements } = countElementsInNode(decl.initializer);
            if (count > LIMIT) {
              violations.push({ componentName: name, count, elements });
            }
          }
        }
      }
    }
  });

  return violations;
}

const viewFiles = findViewFiles(srcDir);
let hasErrors = false;

console.log(`Scanning *View.tsx files in ${srcDir} for interactive element limits (max ${LIMIT} per component)...`);

for (const file of viewFiles) {
  const relativePath = path.relative(projectRoot, file);
  const violations = checkFile(file);

  if (violations.length > 0) {
    violations.forEach(v => {
      console.error(`\x1b[31m[Violation] Component "${v.componentName}" in ${relativePath} has ${v.count} interactive elements, exceeding the limit of ${LIMIT}.\x1b[0m`);
      console.error(`Found elements:`);
      v.elements.forEach(el => {
        console.error(`  - <${el.tag}> at line ${el.line}:${el.char}`);
      });
      console.error(`\x1b[33mRecommendation: Adhere to Balanced Minimalism (Zero-UI First). Please hide elements behind drawers, modals, or accordion menus (Progressive Disclosure) to reduce cognitive load.\x1b[0m\n`);
    });
    hasErrors = true;
  } else {
    console.log(`  ✓ ${relativePath}: Passed`);
  }
}

if (hasErrors) {
  console.error('\x1b[31mUI element limits check failed. Please resolve the violations.\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32mAll View components passed the UI element limits check.\x1b[0m');
  process.exit(0);
}
