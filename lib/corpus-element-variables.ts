import type { CorpusS3dElement } from "./corpus-s3d.ts";
import { assertCorpusWorkingCopyChanges, corpusElementAtPath, replaceCorpusElement, type ElementVariablesPatch } from "./corpus-model.ts";
import { inspectCorpusGeometryIssues, recalculateCorpusBoards, rebuildCorpusRectangleContours } from "./corpus-parametric.ts";
import { applyCorpusVariableVisibility } from "./corpus-variable-visibility.ts";
import { corpusElementAllowsModeling } from "./corpus-group.ts";

/** Prepare one atomic change in the full root; persistence is the caller's responsibility. */
export function prepareCorpusElementVariableChange(root: CorpusS3dElement, path: readonly number[], variables: ElementVariablesPatch): CorpusS3dElement {
  const target = corpusElementAtPath([root], path);
  if (!target) throw new Error("Element za promjenu varijabli nije pronađen.");
  for (let depth = 1; depth <= path.length; depth++) {
    const ancestor = corpusElementAtPath([root], path.slice(0, depth));
    if (!ancestor || !corpusElementAllowsModeling(ancestor)) throw new Error("Element ili nadređeni element je zaključan ili neurediv.");
  }
  const names = (value: ElementVariablesPatch) => Object.keys(value).sort();
  if (JSON.stringify(names(target.variables)) !== JSON.stringify(names(variables))) throw new Error("Izvorni S3D podržava promjenu postojećih varijabli.");
  const staged = replaceCorpusElement([root], target, { ...target, variables: { ...variables } }).elements[0]!;
  const invalid = inspectCorpusGeometryIssues(staged).find(issue => issue.reason === "value");
  if (invalid) throw new Error(`Promjena nije primijenjena: ${invalid.boardName || invalid.elementName} ima nedozvoljenu dimenziju (${invalid.field}). Prethodno stanje je sačuvano.`);
  const resolved = applyCorpusVariableVisibility(recalculateCorpusBoards(staged));
  const rebuilt = rebuildCorpusRectangleContours(root,resolved);
  assertCorpusWorkingCopyChanges([root],[rebuilt]);
  return rebuilt;
}
