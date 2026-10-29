import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { decodeCorpusText } from '../lib/corpus-macro.ts';
import { parseCorpusVariableDefinitions } from '../lib/corpus-variable-definitions.ts';
export async function loadCorpusVariableDefinitions(config: string) {
  const files = decodeCorpusText(await readFile(path.join(config, 'vvf.dat'))).split(/\r?\n/)
    .map(line => line.trim()).filter(line => line && !/^(\/\/|;|#)/.test(line));
  return (await Promise.all(files.map(async file => {
    const resolved = path.resolve(config, file);
    if (!resolved.startsWith(path.resolve(config) + path.sep)) throw new Error('Neispravna putanja definicije: ' + file);
    return parseCorpusVariableDefinitions(decodeCorpusText(await readFile(resolved)), file);
  }))).flat();
}
