import type { CorpusS3dElement } from './corpus-s3d.ts';
import { evaluateCorpusAssignments, type CorpusExpressionValue } from './corpus-expression.ts';

/** Apply only explicit ShowD_<exact object name> controls in their owning element.
 * Unresolved/non-boolean controls retain saved visibility; no name guessing.
 * Measures, machining, contours and raw variable expressions remain untouched.
 */
export function applyCorpusVariableVisibility(element: CorpusS3dElement): CorpusS3dElement {
  const context: Record<string, CorpusExpressionValue> = {};
  for (const [names, value] of [
    [['S', 'SIRINA'], element.width], [['V', 'VISINA'], element.height], [['D', 'DUBINA'], element.depth],
    [['X'], element.position[0]], [['Y'], element.position[1]], [['Z'], element.position[2]],
  ] as const) {
    if (value !== null && Number.isFinite(value)) for (const name of names) context[name] = value;
  }
  const assignments = Object.entries(element.variables).map(([name, expression]) => ({name, expression}));
  const { values, unresolved } = evaluateCorpusAssignments(assignments, context);
  const unresolvedNames = new Set(unresolved.map(item => item.name.toUpperCase()));
  const explicitNames = new Set(assignments.map(item => item.name.toUpperCase()));
  const targets = [...element.boards.map(board => board.name.toUpperCase()), ...element.children.map(child => child.name.toUpperCase())];
  const visibility = (name: string, saved: boolean | null): boolean | null => {
    const target = name.toUpperCase(), key = `SHOWD_${target}`;
    // A duplicate object name is ambiguous; leave every matching object unchanged.
    if (targets.filter(item => item === target).length !== 1 || !explicitNames.has(key) || unresolvedNames.has(key)) return saved;
    const value = values[key];
    return typeof value === 'boolean' ? value : value === 0 ? false : value === 1 ? true : saved;
  };
  return {
    ...element,
    boards: element.boards.map(board => ({ ...board, visible: visibility(board.name, board.visible) })),
    children: element.children.map(child => ({ ...applyCorpusVariableVisibility(child), visible: visibility(child.name, child.visible) })),
  };
}
