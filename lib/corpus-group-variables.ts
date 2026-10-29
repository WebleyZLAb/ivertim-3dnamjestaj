import { corpusElementAllowsModeling } from "./corpus-group.ts";
import { inspectCorpusVariableAssignments, recalculateCorpusE3dVariables } from "./corpus-parametric.ts";
import { parseCorpusE3d, type CorpusS3dElement } from "./corpus-s3d.ts";
import { replaceCorpusE3dElementVariables, writeCorpusE3dGeometryCopy, type CorpusE3dImportSource } from "./corpus-s3d-writer.ts";

export type CorpusGroupVariableTarget = {
  rootIndex: number;
  element: CorpusS3dElement;
  source: CorpusE3dImportSource;
};

/** Prepare every E3D before the caller commits one project history entry. Inputs are immutable. */
export function prepareCorpusGroupVariableChange(
  targets: readonly CorpusGroupVariableTarget[], name: string, value: string,
): CorpusGroupVariableTarget[] {
  if (targets.length < 2) throw new Error("Označi najmanje dva E3D elementa.");
  if (!name.trim() || !value.trim()) throw new Error("Izaberi varijablu i unesi vrijednost ili izraz.");
  const indexes = targets.map(target => target.rootIndex);
  if (indexes.some(index => !Number.isInteger(index) || index < 0) || new Set(indexes).size !== indexes.length)
    throw new Error("Grupa mora sadržati različite korijenske elemente.");
  const prepared = targets.map(target => {
    const label = target.element.name || `Element ${target.rootIndex + 1}`;
    if (!corpusElementAllowsModeling(target.element)) throw new Error(`${label}: element je zaključan ili nema potpunu geometriju.`);
    const names = Object.keys(target.element.variables).filter(key => key.toUpperCase() === name.toUpperCase());
    if (names.length !== 1) throw new Error(`${label}: varijabla ${name} nije jednoznačno prisutna.`);
    const key = names[0]!;
    const variables = { ...target.element.variables, [key]: value };
    const analysis = inspectCorpusVariableAssignments(target.element, [0], variables).find(entry => entry.name === key);
    if (analysis?.status !== "resolved") throw new Error(`${label}: izraz za ${key} nije razriješen; grupa nije promijenjena.`);
    return { target, variables, label };
  });
  return prepared.map(({target, variables, label}) => {
    try {
      const currentXml = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [target.element]);
      const variableXml = replaceCorpusE3dElementVariables(currentXml, [0], variables);
      const sourceXml = recalculateCorpusE3dVariables(variableXml, { rejectInvalidDimensions: true });
      const element = parseCorpusE3d(sourceXml).elements[0];
      if (!element) throw new Error("E3D nema korijenski element.");
      return { rootIndex: target.rootIndex, element, source: { ...target.source, sourceXml, originalElement: element } };
    } catch (reason) {
      throw new Error(`${label}: ${reason instanceof Error ? reason.message : "Preračunavanje nije uspjelo."}`);
    }
  });
}
