import type { CorpusS3dInspection } from "./corpus-s3d.ts";
import type { CorpusE3dImportSource } from "./corpus-s3d-writer.ts";

export type CorpusEditorSnapshot = {
  inspection: CorpusS3dInspection;
  importedE3dSources: readonly CorpusE3dImportSource[];
  standaloneE3dSource: CorpusE3dImportSource | null;
};
type CorpusEditorState = CorpusEditorSnapshot & {
  history: readonly CorpusEditorSnapshot[];
  future: readonly CorpusEditorSnapshot[];
  dirty: boolean;
};

/** Local Undo starts at the editor boundary, even when room history is already full. */
export function beginCorpusEditorSession<T extends CorpusEditorState>(project: T): T {
  return { ...project, history: [], future: [] };
}

/** All accepted geometry, machining and source edits become one room-level history entry. */
export function acceptCorpusEditorSession<T extends CorpusEditorState>(before: T, current: T): T {
  const changed = before.inspection !== current.inspection || before.importedE3dSources !== current.importedE3dSources || before.standaloneE3dSource !== current.standaloneE3dSource;
  if (!changed) return { ...current, history: before.history, future: before.future, dirty: before.dirty };
  const snapshot: CorpusEditorSnapshot = { inspection: before.inspection, importedE3dSources: before.importedE3dSources, standaloneE3dSource: before.standaloneE3dSource };
  return { ...current, history: [...before.history, snapshot].slice(-100), future: [], dirty: true };
}
