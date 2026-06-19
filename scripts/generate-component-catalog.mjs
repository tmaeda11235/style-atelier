import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import reactDocgenTypescript from 'react-docgen-typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const atomsDir = path.join(projectRoot, 'src', 'components', 'atoms');
const outputCatalogPath = path.join(projectRoot, 'docs', 'agent-component-catalog.md');

if (!fs.existsSync(path.join(projectRoot, 'docs'))) {
  fs.mkdirSync(path.join(projectRoot, 'docs'));
}

const files = fs.readdirSync(atomsDir)
  .filter(file => file.endsWith('.tsx') && !file.includes('.test.') && !file.includes('.spec.'));

const filePaths = files.map(file => path.join(atomsDir, file));

console.log('Generating catalog for:', files.join(', '));

const docgenParser = reactDocgenTypescript.withDefaultConfig({
  savePropValueAsString: true,
  propFilter: (prop) => {
    if (prop.parent) {
      return !prop.parent.fileName.includes('node_modules/@types/react');
    }
    return true;
  }
});

const docs = docgenParser.parse(filePaths);

let markdown = `# Agent Component Catalog

This document is a machine-readable catalog of foundational UI components (Atoms) in the Style Atelier project.
It is automatically generated and synchronized on pre-commit to ensure AI agents and developers can easily reference available options.

> [!IMPORTANT]
> **Avoid using raw HTML tags** like \`<button>\`, \`<input>\`, or \`<img>\`. Instead, you MUST use the corresponding Atom components documented below.

`;

for (const doc of docs) {
  const componentName = doc.displayName;
  const description = doc.description || 'No description provided.';
  
  markdown += `## ${componentName}\n\n`;
  markdown += `${description}\n\n`;
  
  markdown += `### Props\n\n`;
  
  const props = Object.values(doc.props);
  if (props.length === 0) {
    markdown += `No custom props.\n\n`;
  } else {
    markdown += `| Prop | Type | Required | Default | Description |\n`;
    markdown += `| --- | --- | --- | --- | --- |\n`;
    for (const prop of props) {
      const type = prop.type.name.replace(/\|/g, '\\|');
      const required = prop.required ? 'Yes' : 'No';
      const defaultValue = prop.defaultValue ? prop.defaultValue.value : '-';
      const propDesc = prop.description ? prop.description.replace(/\n/g, ' ') : '-';
      markdown += `| \`${prop.name}\` | \`${type}\` | ${required} | \`${defaultValue}\` | ${propDesc} |\n`;
    }
    markdown += `\n`;
  }
}

fs.writeFileSync(outputCatalogPath, markdown, 'utf8');
console.log(`Successfully generated catalog at ${outputCatalogPath}`);
