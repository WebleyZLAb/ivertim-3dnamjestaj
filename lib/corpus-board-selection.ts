export type CorpusBoardStructureChange =
  | { kind: "copy"; copies: readonly { boardIndex: number; count: number }[] }
  | { kind: "remove"; indexes: readonly number[] }
  | { kind: "move"; from: number; to: number };

/** Track original boards, never newly inserted copies, by their structural order. */
export function corpusBoardSelectionAfterStructure(selection: readonly number[], boardCount: number, change: CorpusBoardStructureChange): number[] {
  if (!Number.isInteger(boardCount) || boardCount < 0) throw new Error("Neispravan broj ploča.");
  const validIndex = (index: number) => Number.isInteger(index) && index >= 0 && index < boardCount;
  let order: (number | null)[] = Array.from({ length: boardCount }, (_, index) => index);
  if (change.kind === "move") {
    if (!validIndex(change.from) || !validIndex(change.to)) throw new Error("Neispravan indeks pomjeranja.");
    const [moved] = order.splice(change.from, 1);
    order.splice(change.to, 0, moved!);
  } else if (change.kind === "remove") {
    if (change.indexes.some(index => !validIndex(index))) throw new Error("Neispravan indeks uklanjanja.");
    const removed = new Set(change.indexes);
    order = order.filter(index => !removed.has(index!));
  } else {
    const counts = new Map<number, number>();
    for (const copy of change.copies) {
      if (!validIndex(copy.boardIndex) || !Number.isInteger(copy.count) || copy.count < 1 || copy.count > 50 || counts.has(copy.boardIndex)) throw new Error("Neispravan raspored kopija.");
      counts.set(copy.boardIndex, copy.count);
    }
    order = order.flatMap(index => [index, ...Array<null>(counts.get(index!) ?? 0).fill(null)]);
  }
  const selected = new Set(selection.filter(validIndex));
  return order.flatMap((original, index) => original !== null && selected.has(original) ? [index] : []);
}
