import type { CorpusPosition } from "./corpus-placement.ts";

/** Pretvara CAD navigacijsku tipku u precizan Corpus X/Y/Z pomak. */
export function corpusNudgeDelta(key: string, fine = false): CorpusPosition | null {
  const step = fine ? 1 : 10;
  if (key === "ArrowLeft") return [-step, 0, 0];
  if (key === "ArrowRight") return [step, 0, 0];
  if (key === "ArrowUp") return [0, 0, -step];
  if (key === "ArrowDown") return [0, 0, step];
  if (key === "PageUp") return [0, step, 0];
  if (key === "PageDown") return [0, -step, 0];
  return null;
}

/** Q/E rotacija: standardno 90°, uz Shift fino 1°. */
export function corpusKeyboardRotation(key: string, fine = false): number | null {
  const step = fine ? 1 : 90;
  if (key.toLowerCase() === "q") return -step;
  if (key.toLowerCase() === "e") return step;
  return null;
}

export function corpusNormalizedAngle(angle: number): number {
  const normalized = angle % 360;
  return Object.is(normalized, -0) ? 0 : normalized;
}

/** Vraća samo eksplicitne modelerske prečice; ponavljanje i modifikovane varijante su blokirane. */
export function corpusModelingShortcut(event: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean; repeat: boolean }): "duplicate" | "remove" | null {
  if (event.repeat || event.altKey || event.shiftKey) return null;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") return "duplicate";
  if (!event.ctrlKey && !event.metaKey && (event.key === "Delete" || event.key === "Backspace")) return "remove";
  return null;
}

/** Razrješava jednu namjeru modelera bez pada sa ploča na cijele elemente. */
export function corpusModelingSelectionScope(boardCount: number, hasActiveBoard: boolean, elementCount: number, hasSelectedElement: boolean): "board-group" | "board" | "element-group" | "element" | null {
  if (boardCount >= 2) return "board-group";
  if (boardCount === 1 || hasActiveBoard) return "board";
  if (elementCount >= 2) return "element-group";
  return hasSelectedElement ? "element" : null;
}
