/* global console */
import madge from 'madge';
import fs from 'fs/promises';
import path from 'path';

async function generate() {
  console.log('Generating dependency graph for src/ ...');
  const res = await madge('src', {
    fileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    tsConfig: 'tsconfig.json'
  });
  const graph = res.obj();
  
  const reverseGraph = {};
  for (const [file, deps] of Object.entries(graph)) {
    const fullFile = path.posix.join('src', file.replace(/\\/g, '/'));
    if (!reverseGraph[fullFile]) reverseGraph[fullFile] = [];
    
    for (const dep of deps) {
      const fullDep = path.posix.join('src', dep.replace(/\\/g, '/'));
      if (!reverseGraph[fullDep]) {
        reverseGraph[fullDep] = [];
      }
      if (!reverseGraph[fullDep].includes(fullFile)) {
        reverseGraph[fullDep].push(fullFile);
      }
    }
  }

  await fs.mkdir('artifacts', { recursive: true });
  await fs.writeFile('artifacts/dependency-graph.json', JSON.stringify(reverseGraph, null, 2));
  console.log('Dependency graph written to artifacts/dependency-graph.json');
}

generate().catch(console.error);
