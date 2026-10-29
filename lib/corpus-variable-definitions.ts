export type CorpusVariableDefinition = {
  name: string; source: string; caption: string; category: string;
  fields: Record<string, string>; options: Array<{ label: string; value: string }>;
};
const metadata = new Set(['CAPTION', 'CATEGORY', 'TIP', 'NOEDIT', 'COLOR']);
const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
export function parseCorpusVariableDefinitions(text: string, source: string): CorpusVariableDefinition[] {
  const result: CorpusVariableDefinition[] = [];
  let name = '', fields: Record<string, string> = {};
  const flush = () => {
    if (!name) return;
    const field = (key: string) => Object.entries(fields).find(([k]) => k.toUpperCase() === key)?.[1] ?? '';
    result.push({ name, source, fields, caption: field('CAPTION') || name, category: field('CATEGORY'),
      options: Object.entries(fields).filter(([key, value]) => !metadata.has(key.toUpperCase()) && numeric.test(value))
        .map(([label, value]) => ({ label, value })) });
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^(\/\/|;|#)/.test(line)) continue;
    const section = /^\[([^\]]+)\]$/.exec(line);
    if (section) { flush(); name = section[1]!.trim(); fields = {}; continue; }
    const separator = line.indexOf('=');
    if (name && separator > 0) fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  flush(); return result;
}
export function corpusVariableDefinitionIndex(definitions: readonly CorpusVariableDefinition[]): Map<string, CorpusVariableDefinition> {
  const result = new Map<string, CorpusVariableDefinition>();
  const conflicts = new Set<string>();
  for (const definition of definitions) {
    const key = definition.name.toUpperCase();
    const existing = result.get(key);
    if (existing && JSON.stringify(existing.fields) !== JSON.stringify(definition.fields)) conflicts.add(key);
    else result.set(key, definition);
  }
  for (const key of conflicts) result.delete(key);
  return result;
}
// Only match literal numbers. Evaluated formulas must remain editable expressions.
export function corpusVariableOptionValue(definition: CorpusVariableDefinition, expression: string): string | undefined {
  const literal = expression.trim();
  if (!numeric.test(literal)) return undefined;
  return definition.options.find(option => Number(option.value) === Number(literal))?.value;
}
