import { useMemo, useState } from "react";
import type { CorpusMaterialCatalog, CorpusMaterialRecord } from "../lib/corpus-material-library";
import { createCorpusMaterialIndex } from "../lib/corpus-material-library";
import { inspectCorpusMaterialReferences, sameCorpusMaterial, type CorpusMaterialReference } from "../lib/corpus-material-replacement";
import type { CorpusS3dElement } from "../lib/corpus-s3d";

export function MaterialReplacement({ elements, catalogs, onReplace }: { elements: readonly CorpusS3dElement[]; catalogs: readonly CorpusMaterialCatalog[]; onReplace(source: CorpusMaterialReference, destination: CorpusMaterialRecord, scope: "one" | "same"): number }) {
  const index = useMemo(() => createCorpusMaterialIndex(catalogs), [catalogs]);
  const audit = useMemo(() => inspectCorpusMaterialReferences(elements, index), [elements, index]);
  const refs = audit.references;
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [message, setMessage] = useState("");
  const [sourceKey, setSourceKey] = useState(() => {
    const first = audit.missing[0] ?? audit.ambiguous[0] ?? refs[0];
    return first ? `${first.elementPath.join(".")}:${first.boardIndex}` : "";
  });
  const [destinationUid, setDestinationUid] = useState("");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"one" | "same">("one");
  const key = (ref: CorpusMaterialReference) => `${ref.elementPath.join(".")}:${ref.boardIndex}`;
  const source = refs.find((ref) => key(ref) === sourceKey) ?? refs[0];
  const candidates = useMemo(() => [...index.byUid.values()].filter((records) => records.length === 1 && records[0]!.name.trim()).map((records) => records[0]!).sort((a,b) => a.name.localeCompare(b.name)), [index]);
  const destination = candidates.find((record) => record.uid === destinationUid);
  const shown = candidates.filter((record) => `${record.name} ${record.uid}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const affected = source ? refs.filter((ref) => scope === "one" ? key(ref) === key(source) : sameCorpusMaterial(ref.board, source.board)) : [];
  const missing = audit.missing.length, ambiguous = audit.ambiguous.length;
  const issues = new Set([...audit.missing, ...audit.ambiguous]);
  const visibleRefs = onlyIssues ? refs.filter((ref) => issues.has(ref) || key(ref) === (source ? key(source) : "")) : refs;
  const sourceStatus = source && audit.missing.includes(source) ? "UID materijala nije pronađen u učitanim katalozima." : source && audit.ambiguous.includes(source) ? "UID ima više kataloških zapisa; potreban je jednoznačan izbor." : "UID izvorne ploče je jednoznačno pronađen.";
  const editableCount = affected.filter((ref) => ref.editable).length;
  const changeCount = destination ? affected.filter((ref) => ref.editable && (ref.board.materialUid !== destination.uid || ref.board.materialName !== destination.name)).length : 0;
  return <section className="material-replacement" aria-label="Provjera i zamjena materijala">
    <h2>Provjera i zamjena materijala</h2>
    <p>{refs.length} ploča · {missing} bez pronađenog UID-a · {ambiguous} sa dvosmislenim UID-om</p>
    <p>Provjera koristi učitane kataloge. Nedostatak slike ne znači da materijal nedostaje. Ploče bez UID-a povezuju se samo po istom nazivu.</p>
    <label className="check-field"><input type="checkbox" checked={onlyIssues} onChange={(event) => setOnlyIssues(event.target.checked)} />Prikaži samo neriješene reference i aktivnu ploču</label>
    <label>Izvorna ploča<select value={source ? key(source) : ""} onChange={(event) => setSourceKey(event.target.value)}>{visibleRefs.map((ref) => <option key={key(ref)} value={key(ref)}>{ref.label} — {ref.board.materialName || "Bez naziva"} [{ref.board.materialUid || "bez UID-a"}]</option>)}</select></label>
    <p>{sourceStatus}</p>
    <label>Obuhvat zamjene<select value={scope} onChange={(event) => setScope(event.target.value as "one" | "same")}><option value="one">Samo izvorna ploča</option><option value="same">Sve ploče istog materijala u projektu</option></select></label>
    <label>Traži zamjenski materijal<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <label>Zamjenski materijal<select value={destinationUid} onChange={(event) => setDestinationUid(event.target.value)}><option value="">Izaberi materijal…</option>{destination && !shown.includes(destination) && <option value={destination.uid}>{destination.name} [{destination.uid}]</option>}{shown.map((record) => <option key={record.uid} value={record.uid}>{record.name} [{record.uid}]</option>)}</select></label>
    <p>{editableCount} ploča za zamjenu · {affected.length - editableCount} zaključanih ili nedostupnih za izmjenu. Obuhvat uključuje sakrivene ploče.</p>
    <details><summary>Pregled obuhvaćenih ploča ({affected.length})</summary><ul>{affected.map((ref) => <li key={key(ref)}>{ref.label}{!ref.editable ? " — preskočena" : ""}</li>)}</ul></details>
    <p>Mijenjaju se naziv i UID materijala. Mjere, boja ploče, kantovi, obrade i vidljivost ostaju sačuvani. Jedan Undo vraća cijelu zamjenu.</p>
    <button className="primary-button" disabled={!source || !destination || !changeCount} onClick={() => { if (source && destination) setMessage(`Zamijenjen materijal na ${onReplace(source, destination, scope)} ploča. Undo vraća zamjenu.`); }}>Primijeni zamjenu materijala</button>
    {message && source?.board.materialUid === destinationUid && <p role="status">{message}</p>}
  </section>;
}
