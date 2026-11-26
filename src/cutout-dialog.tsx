import { useMemo, useState } from "react";
import { DesktopWindow } from "./desktop";
import { corpusBoardCutouts } from "../lib/corpus-cutouts";
import { addCorpusE3dBoardCutout, removeCorpusE3dBoardCutout } from "../lib/corpus-s3d-writer";
import type { CorpusS3dElement } from "../lib/corpus-s3d";

const toNumber = (value: string) => value.trim() ? Number(value.replace(",", ".")) : Number.NaN;

/** Usjecanje radne ploče (sudopera, ploča za kuhanje): pravougaonik od lijeve i zadnje ivice ploče. Mjere u mm. */
export function CutoutDialog({ element, sourceXml, elementPath, message, initialBoard, onClose, onApply }: { element: CorpusS3dElement; sourceXml: string | null; elementPath: readonly number[]; message: string; initialBoard: number | null; onClose(): void; onApply(xml: string, boardIndex: number): void }) {
  const candidates = element.boards.flatMap((board, index) => board.height && board.width ? [index] : []);
  const [boardIndex, setBoardIndex] = useState<number>(() => initialBoard !== null && candidates.includes(initialBoard) ? initialBoard : candidates.find((index) => /plo[cč]a|radn|worktop/i.test(element.boards[index]!.name)) ?? candidates[0] ?? 0);
  const [fields, setFields] = useState({ x: "", z: "", width: "560", depth: "490", radius: "0" });
  const [notice, setNotice] = useState("");
  const board = element.boards[boardIndex];
  const existing = useMemo(() => board ? corpusBoardCutouts(board) : [], [board]);
  const rect = { x: toNumber(fields.x), z: toNumber(fields.z), width: toNumber(fields.width), depth: toNumber(fields.depth), radius: toNumber(fields.radius) };
  const problem = useMemo(() => {
    if (!sourceXml) return message;
    if (!board?.height || !board.width) return "Izaberi ploču sa poznatim mjerama.";
    if (Object.values(rect).some((value) => !Number.isFinite(value))) return "Upiši sve četiri mjere.";
    if (rect.width <= 0 || rect.depth <= 0) return "Širina i dubina moraju biti veće od nule.";
    if (rect.radius < 0 || rect.radius * 2 > Math.min(rect.width, rect.depth)) return "Radijus uglova je prevelik za ovo usjecanje.";
    if (rect.x < 0 || rect.z < 0 || rect.x + rect.width > board.height || rect.z + rect.depth > board.width) return "Usjecanje izlazi iz ploče.";
    return "";
  }, [sourceXml, message, board, rect.x, rect.z, rect.width, rect.depth, rect.radius]);
  function apply() {
    try {
      if (problem || !sourceXml) throw new Error(problem);
      onApply(addCorpusE3dBoardCutout(sourceXml, boardIndex, rect, elementPath), boardIndex);
      setNotice("Usjecanje je dodano na ploču.");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : String(reason)); }
  }
  function remove(index: number) {
    try {
      if (!sourceXml) throw new Error(message);
      onApply(removeCorpusE3dBoardCutout(sourceXml, boardIndex, index, elementPath), boardIndex);
      setNotice("Usjecanje je obrisano.");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : String(reason)); }
  }
  const length = board?.height ?? 0, depth = board?.width ?? 0;
  return <DesktopWindow id="cutout" title="Usjecanje radne ploče" className="cutout-window" onClose={onClose}><section className="cutout-dialog">
    <div className="gola-cuts-heading"><strong>{element.name}</strong><span>Sve mjere su u mm</span></div>
    <label>Ploča<select value={boardIndex} onChange={(event) => { setBoardIndex(Number(event.target.value)); setNotice(""); }}>{candidates.map((index) => <option key={index} value={index}>{element.boards[index]!.name || `Ploča ${index + 1}`} ({element.boards[index]!.height} × {element.boards[index]!.width})</option>)}</select></label>
    <div className="gola-row-fields">
      {([["x", "Od lijeve ivice"], ["z", "Od zadnje ivice"], ["width", "Širina (duž ploče)"], ["depth", "Dubina"], ["radius", "Radijus uglova"]] as const).map(([key, label]) => <label key={key}>{label}<input inputMode="decimal" value={fields[key]} onChange={(event) => { setFields({ ...fields, [key]: event.target.value }); setNotice(""); }} /></label>)}
    </div>
    {length > 0 && depth > 0 && <svg role="img" aria-label="Pregled usjecanja" viewBox={`-20 -20 ${length + 40} ${depth + 40}`} style={{ width: "100%", maxHeight: 220 }}>
      <rect x="0" y="0" width={length} height={depth} fill="#d4e2ec" stroke="#2c607f" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {existing.map((cutout, index) => <rect key={index} x={cutout.x} y={cutout.z} width={cutout.width} height={cutout.depth} fill="#fff" stroke="#888" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
      {!problem && <rect x={rect.x} y={rect.z} width={rect.width} height={rect.depth} rx={rect.radius} fill="#fff" stroke="#c0392b" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
    </svg>}
    {existing.length > 0 && <ul>{existing.map((cutout, index) => <li key={index}>{cutout.width.toFixed(0)} × {cutout.depth.toFixed(0)} na ({cutout.x.toFixed(0)}, {cutout.z.toFixed(0)}){cutout.rectangular ? "" : " (oblik)"} <button className="secondary-button" disabled={!sourceXml} onClick={() => remove(index)}>Obriši</button></li>)}</ul>}
    <p>{existing.length ? `Na ploči već ima ${existing.length} glodanih kontura (siva).` : "Na ploči nema glodanih kontura."} Zapis prati Corpusov uzorak; Corpus nije pokretan da potvrdi otvaranje.</p>
    <div className="gola-cuts-message" role="status">{notice || problem}</div>
    <footer><button className="secondary-button" onClick={onClose}>Zatvori</button><button className="primary-command" disabled={Boolean(problem)} onClick={apply}>Dodaj usjecanje</button></footer>
  </section></DesktopWindow>;
}
