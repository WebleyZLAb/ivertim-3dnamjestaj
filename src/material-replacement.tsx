import { useMemo, useState } from "react";
import type { CorpusMaterialCatalog, CorpusMaterialRecord } from "../lib/corpus-material-library";
import { createCorpusMaterialIndex, selectableCorpusMaterials } from "../lib/corpus-material-library";
import { inspectCorpusMaterialReferences, sameCorpusMaterial, type CorpusMaterialReference } from "../lib/corpus-material-replacement";
import type { CorpusS3dElement } from "../lib/corpus-s3d";

const searchKey = (value: string) => value.normalize("NFD").toUpperCase().replace(/[^A-Z0-9]/g, "");

export function MaterialReplacement({ elements, catalogs, onReplace }: { elements: readonly CorpusS3dElement[]; catalogs: readonly CorpusMaterialCatalog[]; onReplace(source: CorpusMaterialReference, destination: CorpusMaterialRecord, scope: "one" | "same"): number }) {
  const index = useMemo(() => createCorpusMaterialIndex(catalogs), [catalogs]);
  const audit = useMemo(() => inspectCorpusMaterialReferences(elements, index), [elements, index]);
  const refs = audit.references;
  const issues = [...audit.missing, ...audit.ambiguous];
  const [message, setMessage] = useState("");
  const [sourceKey, setSourceKey] = useState("");
  const [destinationUid, setDestinationUid] = useState("");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"one" | "same">("one");
  const key = (ref: CorpusMaterialReference) => `${ref.elementPath.join(".")}:${ref.boardIndex}`;
  const source = issues.find((ref) => key(ref) === sourceKey) ?? issues[0];
  const candidates = useMemo(() => selectableCorpusMaterials(index).filter((record) => record.name.trim()), [index]);
  const destination = candidates.find((record) => record.uid === destinationUid);
  const term = searchKey(query);
  const shown = candidates.filter((record) => !term || [record.name, record.uid, ...(record.fields.SIFRA ?? [])].some((value) => searchKey(value).includes(term)));
  const originalNames = source ? [source.board.materialName, source.board.materialUid].map(searchKey).filter(Boolean) : [];
  const suggestions = shown.filter((record) => {
    const name = searchKey(record.name);
    return name.length >= 4 && originalNames.some((original) => original.endsWith(name) || original === searchKey(record.uid));
  });
  const otherChoices = shown.filter((record) => !suggestions.includes(record));
  const affected = source ? refs.filter((ref) => scope === "one" ? ref === source : sameCorpusMaterial(ref.board, source.board)) : [];
  const missing = audit.missing.length, ambiguous = audit.ambiguous.length;
  const sourceStatus = source && audit.missing.includes(source) ? "UID materijala nije pronađen u učitanim katalozima." : "UID ima više kataloških zapisa; potreban je jednoznačan izbor.";
  const editableCount = affected.filter((ref) => ref.editable).length;
  const changeCount = destination ? affected.filter((ref) => ref.editable && (ref.board.materialUid !== destination.uid || ref.board.materialName !== destination.name)).length : 0;
  return <section className="material-replacement" aria-label="Provjera i zamjena materijala">
    <p className="material-audit-summary">{refs.length} ploča · {missing} bez pronađenog UID-a · {ambiguous} sa dvosmislenim UID-om</p>
    {source ? <>
    <div className="material-replacement-grid">
      <div className="material-replacement-fields">
        <label>Izvorna ploča
          <select value={source ? key(source) : ""} onChange={(event) => { setSourceKey(event.target.value); setDestinationUid(""); setQuery(""); setMessage(""); }}>
            {issues.map((ref) => <option key={key(ref)} value={key(ref)}>{ref.label} — {ref.board.materialName || "Bez naziva"} [{ref.board.materialUid || "bez UID-a"}]</option>)}
          </select>
        </label>
        <p>{sourceStatus}</p>
      </div>
      <div className="material-replacement-fields">
        <label>Pretraga zamjene
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Naziv ili UID" />
        </label>
        <label>Zamjenski materijal
          <select value={destinationUid} onChange={(event) => setDestinationUid(event.target.value)}>
            <option value="">Izaberi materijal…</option>
            {destination && !shown.includes(destination) && <option value={destination.uid}>{destination.name} [{destination.uid}]</option>}
            {suggestions.length > 0 && <optgroup label="Predložena podudaranja">{suggestions.map((record) => <option key={record.uid} value={record.uid}>{record.name} [{record.uid}]</option>)}</optgroup>}
            {otherChoices.map((record) => <option key={record.uid} value={record.uid}>{record.name} [{record.uid}]</option>)}
          </select>
        </label>
      </div>
    </div>
    <div className="material-replacement-scope">
      <label className="check-field">
        <input type="checkbox" checked={scope === "same"} onChange={(event) => setScope(event.target.checked ? "same" : "one")} />
        Primijeni na sve ploče istog materijala
      </label>
      <p>{editableCount} za zamjenu · {affected.length - editableCount} nedostupnih{scope === "same" && " · uključuje skrivene ploče"}</p>
    </div>
    <details>
      <summary>Obuhvaćene ploče ({affected.length})</summary>
      <ul>{affected.map((ref) => <li key={key(ref)}>{ref.label}{!ref.editable ? " — preskočena" : ""}</li>)}</ul>
    </details>
    <div className="material-replacement-actions">
      <p role="status">{message ? message : "Zamjena mijenja naziv i UID. Undo vraća cijelu zamjenu."}</p>
      <button className="primary-button" disabled={!source || !destination || !changeCount} onClick={() => { if (!destination) return; setMessage(`Zamijenjen materijal na ${onReplace(source, destination, scope)} ploča. Undo vraća zamjenu.`); setDestinationUid(""); setQuery(""); }}>Primijeni zamjenu</button>
    </div>
    </> : <p role="status">{message || "Nema neriješenih materijala."}</p>}
  </section>;
}
