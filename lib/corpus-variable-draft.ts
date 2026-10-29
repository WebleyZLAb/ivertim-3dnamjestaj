// Live value changes must never commit a pending add, rename or removal.
export function corpusVariableDraftHasSourceNames(
  variables: Readonly<Record<string, string>>,
  draft: readonly { name: string; value: string }[],
): boolean {
  const names = Object.keys(variables);
  return names.length === draft.length && names.every((name, index) => draft[index]?.name === name);
}
