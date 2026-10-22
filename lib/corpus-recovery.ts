import type { CorpusWorkingCopyFile } from "./corpus-model.ts";

export type CorpusRecoverySnapshot = {
  format: "ivertim-corpus-recovery";
  version: 1;
  savedAt: string;
  fileName: string;
  fileSize: number;
  sourceXml: string;
  workingCopy: CorpusWorkingCopyFile;
};

/**
 * Paket za lokalni oporavak sadrži izvorne bajtove kao tekst i postojeću
 * provjerljivu radnu kopiju. Ne zamjenjuje S3D/E3D fajl na disku.
 */
export function createCorpusRecoverySnapshot(
  fileName: string,
  fileSize: number,
  sourceXml: string,
  workingCopy: CorpusWorkingCopyFile,
  savedAt = new Date().toISOString(),
): CorpusRecoverySnapshot {
  if (!fileName.trim() || !sourceXml.trim()) throw new Error("Lokalni oporavak nema izvorni Corpus projekat.");
  if (!Number.isFinite(fileSize) || fileSize < 0) throw new Error("Veličina izvornog projekta nije ispravna.");
  return { format: "ivertim-corpus-recovery", version: 1, savedAt, fileName, fileSize, sourceXml, workingCopy };
}

export function parseCorpusRecoverySnapshot(value: unknown): CorpusRecoverySnapshot {
  if (!value || typeof value !== "object") throw new Error("Lokalni oporavak nije ispravan.");
  const snapshot = value as Partial<CorpusRecoverySnapshot>;
  if (snapshot.format !== "ivertim-corpus-recovery" || snapshot.version !== 1) {
    throw new Error("Lokalni oporavak nije podržane verzije.");
  }
  if (typeof snapshot.savedAt !== "string" || !Number.isFinite(Date.parse(snapshot.savedAt))) {
    throw new Error("Vrijeme lokalnog oporavka nije ispravno.");
  }
  if (typeof snapshot.fileName !== "string" || !snapshot.fileName.trim()) throw new Error("Lokalni oporavak nema naziv projekta.");
  if (typeof snapshot.fileSize !== "number" || !Number.isFinite(snapshot.fileSize) || snapshot.fileSize < 0) {
    throw new Error("Lokalni oporavak nema ispravnu veličinu projekta.");
  }
  if (typeof snapshot.sourceXml !== "string" || !snapshot.sourceXml.trim()) throw new Error("Lokalni oporavak nema izvorni XML.");
  if (!snapshot.workingCopy || typeof snapshot.workingCopy !== "object") throw new Error("Lokalni oporavak nema radnu kopiju.");
  return snapshot as CorpusRecoverySnapshot;
}
