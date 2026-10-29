import type { CorpusMaterialIndex } from "./corpus-material-library.ts";
import type { CorpusS3dBoard, CorpusS3dElement } from "./corpus-s3d.ts";

export type CorpusMaterialReference = { elementPath: number[]; boardIndex: number; label: string; board: CorpusS3dBoard; editable: boolean };
const normalized = (value: string) => value.trim().toUpperCase();
export function sameCorpusMaterial(a: CorpusS3dBoard, b: CorpusS3dBoard): boolean {
  const uid = normalized(a.materialUid);
  return uid ? uid === normalized(b.materialUid) : !normalized(b.materialUid) && normalized(a.materialName) === normalized(b.materialName);
}
export function corpusMaterialReferences(elements: readonly CorpusS3dElement[]): CorpusMaterialReference[] {
  const result: CorpusMaterialReference[] = [];
  function visit(items: readonly CorpusS3dElement[], path: number[], parentEditable: boolean, names: string[]) {
    items.forEach((element, index) => {
      const elementPath = [...path, index], labels = [...names, element.name || `Element ${index + 1}`];
      const editable = parentEditable && element.locked !== true && element.editable !== false;
      element.boards.forEach((board, boardIndex) => result.push({ elementPath, boardIndex, label: [...labels, board.name || `Ploča ${boardIndex + 1}`].join(" / "), board, editable }));
      visit(element.children, elementPath, editable, labels);
    });
  }
  visit(elements, [], true, []);
  return result;
}
/** Mijenja samo naziv i UID; geometrija, boja, vidljivost, kantovi i obrade ostaju. */
export function replaceCorpusMaterial(elements: readonly CorpusS3dElement[], source: Pick<CorpusMaterialReference, "elementPath" | "boardIndex">, destination: { uid: string; name: string }, scope: "one" | "same") {
  const refs = corpusMaterialReferences(elements);
  const selected = refs.find((ref) => ref.boardIndex === source.boardIndex && ref.elementPath.join(".") === source.elementPath.join("."));
  if (!selected || !destination.uid.trim() || !destination.name.trim()) return { elements: [...elements], changed: 0, skipped: 0 };
  const matches = refs.filter((ref) => scope === "one" ? ref === selected : sameCorpusMaterial(ref.board, selected.board));
  const keys = new Set(matches.filter((ref) => ref.editable).map((ref) => `${ref.elementPath.join(".")}:${ref.boardIndex}`));
  let changed = 0;
  function visit(items: readonly CorpusS3dElement[], parent: number[]): CorpusS3dElement[] {
    return items.map((element, index) => {
      const path = [...parent, index];
      const boards = element.boards.map((board, boardIndex) => {
        if (!keys.has(`${path.join(".")}:${boardIndex}`) || (board.materialUid === destination.uid && board.materialName === destination.name)) return board;
        changed++;
        return { ...board, materialUid: destination.uid, materialName: destination.name };
      });
      const children = visit(element.children, path);
      return boards.some((board, i) => board !== element.boards[i]) || children.some((child, i) => child !== element.children[i]) ? { ...element, boards, children } : element;
    });
  }
  return { elements: visit(elements, []), changed, skipped: matches.filter((ref) => !ref.editable).length };
}

/** Provjera identiteta kataloga nezavisna je od dostupnosti slike teksture. */
export function inspectCorpusMaterialReferences(elements: readonly CorpusS3dElement[], index: CorpusMaterialIndex) {
  const references = corpusMaterialReferences(elements);
  const missing = references.filter((ref) => !normalized(ref.board.materialUid) || !index.byUid.has(normalized(ref.board.materialUid)));
  const ambiguous = references.filter((ref) => (index.byUid.get(normalized(ref.board.materialUid))?.length ?? 0) > 1);
  return { references, missing, ambiguous };
}
