import { useEffect, useMemo, useState } from "react";
import { DesktopWindow } from "./desktop";
import { parseCorpusE3d, type CorpusS3dElement } from "../lib/corpus-s3d";
import { findHandleFronts, handleInsert, type HandleModel } from "../lib/handle-insert";
import { handleDirectionFromVariable } from "../lib/corpus-handle-placement";
import type { KitchenInsert } from "../lib/kitchen-inserts";

export type HandleFile = { path: string; text(): Promise<string> };

const isHandlePath = (path: string) => /\.e3d$/i.test(path) && !/(^|\/)rubbish\//i.test(path) && /(^|\/)(handles|_ruckice|hranipex_handles)\//i.test(path);
const toNumber = (value: string) => (value.trim() ? Number(value.replace(",", ".")) : Number.NaN);
const variable = (element: CorpusS3dElement, name: string, fallback: string) => element.variables[name] ?? element.variables[name.toUpperCase()] ?? fallback;

/** Ručkica na frontu: izbor ručke iz biblioteke, smjer i pomaci kao Corpusove varijable ruc_sm, ruc_xo i ruc_yo. */
export function HandleDialog({ element, files, onClose, onAdd }: { element: CorpusS3dElement; files: readonly HandleFile[]; onClose(): void; onAdd(insert: KitchenInsert): void }) {
  const fronts = useMemo(() => findHandleFronts(element), [element]);
  const handles = useMemo(() => files.filter((file) => isHandlePath(file.path)).sort((a, b) => a.path.localeCompare(b.path, "hr")), [files]);
  const [frontIndex, setFrontIndex] = useState(0);
  const [handlePath, setHandlePath] = useState("");
  const [query, setQuery] = useState("");
  const [model, setModel] = useState<HandleModel | null>(null);
  const [direction, setDirection] = useState(handleDirectionFromVariable(variable(element, "ruc_sm", "1")));
  const [offsetX, setOffsetX] = useState(variable(element, "ruc_xo", "40"));
  const [offsetY, setOffsetY] = useState(variable(element, "ruc_yo", "40"));
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    setModel(null);
    const file = handles.find((item) => item.path === handlePath);
    if (!file) return;
    void file.text().then((text) => {
      if (!active) return;
      const root = parseCorpusE3d(text).elements[0];
      const [width, height, depth] = [root?.width, root?.height, root?.depth];
      if (!root || !width || !height || !depth) { setNotice("Ručka nema mjere u E3D fajlu."); return; }
      setModel({ name: file.path.split("/").at(-1)!.replace(/\.e3d$/i, ""), width, height, depth });
      setNotice("");
    }).catch((reason) => { if (active) setNotice(reason instanceof Error ? reason.message : "Ručka nije učitana."); });
    return () => { active = false; };
  }, [handlePath, handles]);
  const shownHandles = useMemo(() => { const needle = query.trim().toLocaleLowerCase(); return handles.filter((file) => !needle || file.path.toLocaleLowerCase().includes(needle) || file.path === handlePath); }, [handles, query, handlePath]);
  const front = fronts[frontIndex];
  const result = useMemo(() => {
    if (!model || !front) return { insert: null as KitchenInsert | null, error: "" };
    try { return { insert: handleInsert({ element, front, handle: model, direction, offsetX: toNumber(offsetX), offsetY: toNumber(offsetY) }), error: "" }; }
    catch (reason) { return { insert: null, error: reason instanceof Error ? reason.message : String(reason) }; }
  }, [model, front, element, frontIndex, direction, offsetX, offsetY]);
  return <DesktopWindow id="handle" title="Ručkica na frontu" className="handle-window" onClose={onClose}><section className="handle-dialog">
    <div className="gola-cuts-heading"><strong>{element.name}</strong><span>Sve mjere su u mm</span></div>
    {fronts.length === 0 ? <p className="empty-copy">Izabrani element nema uspravnu frontu (vrata ili ladicu). Izaberi element s frontom.</p> : <>
      <label>Fronta<select value={frontIndex} onChange={(event) => setFrontIndex(Number(event.target.value))}>{fronts.map((item, index) => <option key={index} value={index}>{item.label} ({item.board.width} × {item.board.height})</option>)}</select></label>
      <label>Traži ručku<input type="search" placeholder="Naziv ili folder…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label>Ručka ({shownHandles.length})<select value={handlePath} onChange={(event) => setHandlePath(event.target.value)}><option value="">Izaberi ručku…</option>{shownHandles.map((file) => <option key={file.path} value={file.path}>{file.path.replace(/^.*?(handles|_ruckice|hranipex_handles)\//i, "")}</option>)}</select></label>
      {model && <p className="empty-copy">Mjere ručke: {model.width} × {model.height} mm, izbočenje {model.depth} mm.</p>}
      <div className="gola-row-fields">
        <label>Smjer<select value={direction} onChange={(event) => setDirection(event.target.value as "horizontal" | "vertical")}><option value="horizontal">Horizontalna</option><option value="vertical">Okomita</option></select></label>
        <label>Pomak od ivice (X)<input inputMode="decimal" value={offsetX} onChange={(event) => setOffsetX(event.target.value)} /></label>
        <label>Pomak od vrha (Y)<input inputMode="decimal" value={offsetY} onChange={(event) => setOffsetY(event.target.value)} /></label>
      </div>
      <p className="empty-copy">Ručka je uz desnu ivicu vrata tipa 1 (šarke lijevo), inače uz lijevu; pomak Y je od gornje ivice. Pravila su iz Corpusovih formula (ruc_sm, ruc_xo, ruc_yo). Ručka se umeće kao kvadar tih mjera.</p>
      <div className="gola-cuts-message" role="status">{notice || result.error || (result.insert ? `Položaj u prostoriji: X ${result.insert.position[0]}, Y ${result.insert.position[1]}, Z ${result.insert.position[2]}` : "Izaberi ručku.")}</div>
    </>}
    <footer><button className="secondary-button" onClick={onClose}>Zatvori</button><button className="primary-command" disabled={!result.insert} onClick={() => { if (result.insert) { onAdd(result.insert); onClose(); } }}>Dodaj ručkicu</button></footer>
  </section></DesktopWindow>;
}
