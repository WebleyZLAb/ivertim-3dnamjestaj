import { readFile, writeFile } from 'node:fs/promises';
import { loadCorpusVariableDefinitions } from './corpus-variable-config.ts';
const file = 'public/local-corpus/manifest.json';
const manifest = JSON.parse(await readFile(file, 'utf8'));
manifest.variableDefinitions = await loadCorpusVariableDefinitions('.local-corpus-archive/config');
await writeFile(file, JSON.stringify(manifest));
console.log('Uvezeno definicija: ' + manifest.variableDefinitions.length);
