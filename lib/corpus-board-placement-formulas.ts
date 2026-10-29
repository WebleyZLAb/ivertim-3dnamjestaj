import { parseCorpusE3d, type CorpusS3dElement } from "./corpus-s3d.ts";
import { corpusElementAtPath, replaceCorpusElement } from "./corpus-model.ts";
import { inspectCorpusGeometryIssues, recalculateCorpusBoards, recalculateCorpusE3dVariables } from "./corpus-parametric.ts";
import { writeCorpusE3dGeometryCopy } from "./corpus-s3d-writer.ts";
import { applyCorpusVariableVisibility } from "./corpus-variable-visibility.ts";

const positionKeys = ["XF", "YF", "ZF"] as const;
const positionFields = ["X", "Y", "Z"] as const;
const near = (a: number | null, b: number | null) => a === b || (a !== null && b !== null && Math.abs(a - b) < 0.00001);

/** Solve position offsets within the full root, including inherited variables and sibling references. */
export function prepareCorpusBoardPlacement(root: CorpusS3dElement, requested: CorpusS3dElement, elementPath: readonly number[] = [0]): { staged: CorpusS3dElement; resolved: CorpusS3dElement } {
  const before = corpusElementAtPath([root],elementPath);
  if (!before || before.boards.length !== requested.boards.length || before.boards.some((board,index) => board.name !== requested.boards[index]!.name)) throw new Error("Spisak ploča za postavljanje više nije važeći.");
  const moved = before.boards.flatMap((board,index) => board.position.some((value,axis) => !near(value,requested.boards[index]!.position[axis]!)) ? [index] : []);
  if (!moved.length) return { staged: root, resolved: root };
  for (const index of moved) if ([...before.boards[index]!.position,...requested.boards[index]!.position].some(value => value === null || !Number.isFinite(value))) throw new Error("Postavljanje traži potpune početne i ciljne koordinate.");
  const movedSet = new Set(moved);
  const target: CorpusS3dElement = { ...before, boards: before.boards.map((board,index) => movedSet.has(index) ? { ...board, position: requested.boards[index]!.position } : board) };
  const replaceTarget = (next: CorpusS3dElement) => replaceCorpusElement([root],before,next).elements[0]!;
  const literal: CorpusS3dElement = { ...target, boards: target.boards.map((board,index) => {
    if (!movedSet.has(index)) return board;
    const formulas = { ...board.formulas };
    for (const key of positionKeys) delete formulas[key];
    return { ...board, formulas };
  }) };
  const boards = [...target.boards];
  for (const index of moved) {
    const board = before.boards[index]!;
    const formulas = { ...board.formulas };
    positionKeys.forEach((key,axis) => {
      const expression = board.formulas?.[key];
      if (!expression) return;
      const probe = replaceTarget({ ...literal, boards: literal.boards.map((entry,i) => i === index ? { ...entry, formulas: { ...entry.formulas, [key]: expression } } : entry) });
      const unresolved = inspectCorpusGeometryIssues(probe).some(issue => issue.elementPath.join(".") === elementPath.join(".") && issue.boardIndex === index && issue.field === positionFields[axis]);
      const evaluated = unresolved ? board.position[axis]! : corpusElementAtPath([recalculateCorpusBoards(probe)],elementPath)!.boards[index]!.position[axis]!;
      if (evaluated === null || !Number.isFinite(evaluated)) throw new Error("Izraz položaja nije moguće pomjeriti.");
      const delta = Number((target.boards[index]!.position[axis]! - evaluated).toFixed(6));
      if (delta !== 0) formulas[key] = `(${expression})+(${delta})`;
    });
    boards[index] = { ...target.boards[index]!, formulas };
  }
  const staged = replaceTarget({ ...target, boards });
  if (inspectCorpusGeometryIssues(staged).some(issue => issue.reason === "value")) throw new Error("Postavljanje nije primijenjeno: zavisni izraz daje nedozvoljenu mjeru. Prethodno stanje je sačuvano.");
  const resolved = applyCorpusVariableVisibility(recalculateCorpusBoards(staged));
  const resolvedTarget = corpusElementAtPath([resolved],elementPath)!;
  if (moved.some(index => target.boards[index]!.position.some((value,axis) => !near(value,resolvedTarget.boards[index]!.position[axis]!)))) throw new Error("Postavljanje nije primijenjeno: zavisni izrazi ne daju traženi položaj. Prethodno stanje je sačuvano.");
  return { staged, resolved };
}

export function applyCorpusE3dBoardPlacement(xml: string, requested: CorpusS3dElement): string {
  const before = parseCorpusE3d(xml).elements[0];
  if (!before) throw new Error("E3D nema korijenski element.");
  const { staged } = prepareCorpusBoardPlacement(before,requested);
  return recalculateCorpusE3dVariables(writeCorpusE3dGeometryCopy(xml,[before],[staged]),{rejectInvalidDimensions:true});
}
