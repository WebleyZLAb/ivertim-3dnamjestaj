import { useMemo, useState } from "react";
import { corpusBoardCutouts } from "../lib/corpus-cutouts";
import { addCorpusE3dBoardCutout, removeCorpusE3dBoardCutout } from "../lib/corpus-s3d-writer";
import type { CorpusS3dBoard } from "../lib/corpus-s3d";

const toNumber = (value: string) => value.trim() ? Number(value.replace(",", ".")) : Number.NaN;

/**
 * Usjecanje (glodanje) aktivne ploče u kartici Bušenje editora elemenata: pravougaonik od lijeve i zadnje ivice ploče, uz
 * radijus uglova. Mjere u mm. `onEdit` mijenja E3D izvor elementa i vraća poruku greške ili ništa.
 */
export function CutoutPanel({ board, boardIndex, canEdit, onEdit }: { board: CorpusS3dBoard; boardIndex: number; canEdit: boolean; onEdit(edit: (xml: string, elementPath: readonly number[]) => string): string | void }) {
  const [fields, setFields] = useState({ x: "", z: "", width: "560", depth: "490", radius: "0" });
  const [notice, setNotice] = useState("");
  const existing = useMemo(() => corpusBoardCutouts(board), [board]);
  const length = board.height ?? 0, depth = board.width ?? 0;
  const rect = { x: toNumber(fields.x), z: toNumber(fields.z), width: toNumber(fields.width), depth: toNumber(fields.depth), radius: toNumber(fields.radius) };
  const problem = useMemo(() => {
    if (!length || !depth) return "Ploča nema poznate mjere.";
    if (Object.values(rect).some((value) => !Number.isFinite(value))) return "Upiši sve mjere.";
    if (rect.width <= 0 || rect.depth <= 0) return "Širina i dubina moraju biti veće od nule.";
    if (rect.radius < 0 || rect.radius * 2 > Math.min(rect.width, rect.depth)) return "Radijus uglova je prevelik za ovo usjecanje.";
    if (rect.x < 0 || rect.z < 0 || rect.x + rect.width > length || rect.z + rect.depth > depth) return "Usjecanje izlazi iz ploče.";
    return "";
  }, [length, depth, rect.x, rect.z, rect.width, rect.depth, rect.radius]);
  function run(edit: (xml: string, path: readonly number[]) => string, done: string) {
    const error = onEdit(edit);
    setNotice(error ?? done);
  }
  return <section className="cutout-panel" aria-label="Usjecanje ploče">
    <div className="section-title"><h3>Usjecanje (glodanje)</h3></div>
    <p className="empty-copy">Sudopera, ploča za kuhanje i slična usjecanja radne ploče. Mjere u mm, od lijeve i zadnje ivice ploče.</p>
    {existing.length > 0 && <ul>{existing.map((cutout, index) => <li key={index}>{cutout.width.toFixed(0)} × {cutout.depth.toFixed(0)} na ({cutout.x.toFixed(0)}, {cutout.z.toFixed(0)}){cutout.rectangular ? "" : " (oblik)"} {canEdit && <button className="secondary-button" onClick={() => run((xml, path) => removeCorpusE3dBoardCutout(xml, boardIndex, index, path), "Usjecanje je obrisano.")}>Obriši</button>}</li>)}</ul>}
    {canEdit && <>
      <div className="gola-row-fields">
        {([["x", "Od lijeve ivice"], ["z", "Od zadnje ivice"], ["width", "Širina (duž ploče)"], ["depth", "Dubina"], ["radius", "Radijus uglova"]] as const).map(([key, label]) => <label key={key}>{label}<input inputMode="decimal" value={fields[key]} onChange={(event) => { setFields({ ...fields, [key]: event.target.value }); setNotice(""); }} /></label>)}
      </div>
      {length > 0 && depth > 0 && <svg role="img" aria-label="Pregled usjecanja" viewBox={`-20 -20 ${length + 40} ${depth + 40}`} style={{ width: "100%", maxHeight: 200 }}>
        <rect x="0" y="0" width={length} height={depth} fill="#d4e2ec" stroke="#2c607f" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {existing.map((cutout, index) => <rect key={index} x={cutout.x} y={cutout.z} width={cutout.width} height={cutout.depth} fill="#fff" stroke="#888" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
        {!problem && <rect x={rect.x} y={rect.z} width={rect.width} height={rect.depth} rx={rect.radius} fill="#fff" stroke="#c0392b" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
      </svg>}
      <div className="gola-cuts-message" role="status">{notice || problem}</div>
      <button className="primary-command" disabled={Boolean(problem)} onClick={() => run((xml, path) => addCorpusE3dBoardCutout(xml, boardIndex, rect, path), "Usjecanje je dodano na ploču.")}>Dodaj usjecanje</button>
    </>}
    {!canEdit && <p className="empty-copy">Usjecanje je dostupno za element dodat iz biblioteke ili umetnut (npr. Radna ploha).</p>}
  </section>;
}
