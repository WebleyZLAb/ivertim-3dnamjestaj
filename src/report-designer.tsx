import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { addChild, cssToDelphiColor, delphiToCssHex, getNode, newLine, newMemo, removeNode, updateAttrs, type Fr3Path } from "../lib/fastreport/fr3-edit.ts";
import { memoCss } from "../lib/fastreport/fr3-html.ts";
import { imageFromPropData, styleOf } from "../lib/fastreport/fr3-layout.ts";
import type { Fr3Node } from "../lib/fastreport/fr3-parse.ts";

const MM = 96 / 25.4;
const BAND_TAGS = new Set(["TfrxReportTitle", "TfrxPageHeader", "TfrxPageFooter", "TfrxReportSummary", "TfrxMasterData", "TfrxDetailData", "TfrxSubdetailData", "TfrxHeader", "TfrxFooter", "TfrxGroupHeader", "TfrxGroupFooter"]);
const BAND_NAMES: Record<string, string> = {
  TfrxReportTitle: "Naslov izvještaja", TfrxPageHeader: "Zaglavlje stranice", TfrxPageFooter: "Podnožje stranice", TfrxReportSummary: "Sažetak",
  TfrxMasterData: "Glavni podaci", TfrxDetailData: "Detalj", TfrxSubdetailData: "Poddetalj", TfrxHeader: "Zaglavlje", TfrxFooter: "Podnožje", TfrxGroupHeader: "Zaglavlje grupe", TfrxGroupFooter: "Podnožje grupe",
};
const FONTS = ["Arial", "Times New Roman", "Courier New", "Verdana", "Tahoma", "Calibri"];

const num = (value: string | undefined, fallback = 0) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; };
const fixed = (value: number) => String(Math.round(value * 100) / 100);

type Props = {
  report: Fr3Node;
  onChange(next: Fr3Node): void;
};

type Drag = { path: Fr3Path; mode: "move" | "resize"; startX: number; startY: number; left: number; top: number; width: number; height: number };

/** Uređivač izgleda izvještaja: trake i objekti glavne stranice šablona (povlačenje, veličina, svojstva). */
export function ReportDesigner({ report, onChange }: Props) {
  const pageIndexes = report.children.map((child, index) => child.tag === "TfrxReportPage" ? index : -1).filter((index) => index >= 0);
  const [pageIndex, setPageIndex] = useState(pageIndexes[0] ?? 0);
  const [selected, setSelected] = useState<Fr3Path | null>(null);
  const [zoom, setZoom] = useState(0.8);
  const [drag, setDrag] = useState<{ path: string; left: number; top: number; width: number; height: number } | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const liveRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const page = report.children[pageIndex];
  if (!page || page.tag !== "TfrxReportPage") return <p className="report-note">Šablon nema stranicu za uređivanje.</p>;

  const pagePx = num(page.attrs["PaperWidth"], 210) * MM - (num(page.attrs["LeftMargin"], 10) + num(page.attrs["RightMargin"], 10)) * MM;
  const bands = page.children.map((node, index) => ({ node, index })).filter(({ node }) => BAND_TAGS.has(node.tag));
  const height = Math.max(200, ...bands.map(({ node }) => num(node.attrs["Top"]) + num(node.attrs["Height"]))) + 20;
  const key = (path: Fr3Path) => path.join(".");
  const selectedNode = selected ? getNode(report, selected) : null;
  const selectedBand: Fr3Path | null = selected && selected.length >= 2 ? selected.slice(0, 2) : null;
  const bandOfSelection = selectedNode && selected && BAND_TAGS.has(selectedNode.tag) ? selected : selectedBand;

  function startDrag(event: ReactPointerEvent, path: Fr3Path, mode: Drag["mode"]) {
    const node = getNode(report, path);
    if (!node) return;
    event.stopPropagation();
    try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* sintetički ili završeni pokazivač */ }
    setSelected(path);
    dragRef.current = { path, mode, startX: event.clientX, startY: event.clientY, left: num(node.attrs["Left"]), top: num(node.attrs["Top"]), width: num(node.attrs["Width"]), height: num(node.attrs["Height"]) };
    liveRef.current = { left: num(node.attrs["Left"]), top: num(node.attrs["Top"]), width: num(node.attrs["Width"]), height: num(node.attrs["Height"]) };
    setDrag({ path: key(path), ...liveRef.current });
  }
  function moveDrag(event: ReactPointerEvent) {
    const state = dragRef.current;
    if (!state) return;
    const dx = (event.clientX - state.startX) / zoom, dy = (event.clientY - state.startY) / zoom;
    const next = state.mode === "move"
      ? { left: Math.round(state.left + dx), top: Math.round(state.top + dy), width: state.width, height: state.height }
      : { left: state.left, top: state.top, width: Math.max(1, Math.round(state.width + dx)), height: Math.max(0, Math.round(state.height + dy)) };
    liveRef.current = next;
    setDrag({ path: key(state.path), ...next });
  }
  function endDrag() {
    const state = dragRef.current;
    const live = liveRef.current;
    dragRef.current = null; liveRef.current = null;
    setDrag(null);
    if (!state || !live) return;
    const changed = live.left !== state.left || live.top !== state.top || live.width !== state.width || live.height !== state.height;
    if (changed) onChange(updateAttrs(report, state.path, { Left: fixed(live.left), Top: fixed(live.top), Width: fixed(live.width), Height: fixed(live.height) }));
  }

  function patch(values: Record<string, string | undefined>) {
    if (selected) onChange(updateAttrs(report, selected, values));
  }
  function add(kind: "memo" | "line") {
    const parent = bandOfSelection ?? (bands[0] ? [pageIndex, bands[0].index] as Fr3Path : null);
    if (!parent) return;
    const parentFull: Fr3Path = parent.length === 2 ? parent : [pageIndex, ...parent.slice(1)];
    const made = kind === "memo" ? newMemo(report, 10, 5) : newLine(report, 10, 5);
    const result = addChild(report, parentFull, made);
    onChange(result.root);
    setSelected(result.path);
  }
  function remove() {
    if (!selected || !selectedNode || BAND_TAGS.has(selectedNode.tag)) return;
    onChange(removeNode(report, selected));
    setSelected(null);
  }

  const isObject = selectedNode && !BAND_TAGS.has(selectedNode.tag);
  const isMemo = selectedNode && (selectedNode.tag === "TfrxMemoView" || selectedNode.tag === "TfrxSysMemoView" || selectedNode.tag === "TfrxRichView");
  const fontStyle = num(selectedNode?.attrs["Font.Style"]);
  const frameType = num(selectedNode?.attrs["Frame.Typ"]);
  const setBit = (name: string, current: number, bit: number, on: boolean) => patch({ [name]: String(on ? current | bit : current & ~bit) });

  return <div className="report-designer">
    <div className="report-designer-bar">
      <button onClick={() => add("memo")}>+ Tekst</button>
      <button onClick={() => add("line")}>+ Linija</button>
      <button onClick={remove} disabled={!isObject}>Obriši</button>
      {pageIndexes.length > 1 && <label>Stranica <select value={pageIndex} onChange={(event) => { setPageIndex(Number(event.target.value)); setSelected(null); }}>{pageIndexes.map((index, order) => <option key={index} value={index}>{report.children[index]!.attrs["Name"] ?? `Page${order + 1}`}</option>)}</select></label>}
      <label>Veličina <input type="range" min="0.4" max="1.5" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
    </div>
    <div className="report-designer-body">
      <div className="report-designer-scroll" onPointerDown={() => setSelected(null)}>
        <div className="report-designer-page" style={{ width: pagePx * zoom, height: height * zoom }}>
          <div style={{ width: pagePx, height, transform: `scale(${zoom})`, transformOrigin: "0 0", position: "relative" }}>
            {bands.map(({ node: band, index }) => {
              const bandPath: Fr3Path = [pageIndex, index];
              const bandKey = key(bandPath);
              const bandStyle: CSSProperties = { left: num(band.attrs["Left"]), top: num(band.attrs["Top"]), width: num(band.attrs["Width"]) || pagePx, height: num(band.attrs["Height"]) };
              return <div key={bandKey} className={`rd-band${selected && key(selected) === bandKey ? " selected" : ""}`} style={bandStyle} onPointerDown={(event) => { event.stopPropagation(); setSelected(bandPath); }}>
                <span className="rd-band-label">{BAND_NAMES[band.tag] ?? band.tag}{band.attrs["DataSet"] ? ` · ${band.attrs["DataSet"]}` : ""}</span>
                {band.children.map((object, objectIndex) => {
                  const path: Fr3Path = [pageIndex, index, objectIndex];
                  const live = drag && drag.path === key(path) ? drag : null;
                  const box: CSSProperties = { left: live?.left ?? num(object.attrs["Left"]), top: live?.top ?? num(object.attrs["Top"]), width: live?.width ?? num(object.attrs["Width"]), height: live?.height ?? num(object.attrs["Height"]) };
                  const isSelected = selected !== null && key(selected) === key(path);
                  return <div key={objectIndex} className={`rd-object${isSelected ? " selected" : ""}`} style={box}
                    onPointerDown={(event) => startDrag(event, path, "move")} onPointerMove={moveDrag} onPointerUp={endDrag}>
                    <ObjectView node={object} />
                    {isSelected && <span className="rd-handle" onPointerDown={(event) => startDrag(event, path, "resize")} onPointerMove={moveDrag} onPointerUp={endDrag} />}
                  </div>;
                })}
              </div>;
            })}
          </div>
        </div>
      </div>
      <aside className="report-designer-props">
        {!selectedNode && <p className="report-note">Klikni traku ili objekt. Povuci objekt mišem, a donji desni ugao mijenja veličinu.</p>}
        {selectedNode && <>
          <h4>{BAND_TAGS.has(selectedNode.tag) ? BAND_NAMES[selectedNode.tag] : selectedNode.tag.replace(/^Tfrx|View$/g, "")} <small>{selectedNode.attrs["Name"]}</small></h4>
          <div className="rd-grid">
            {(BAND_TAGS.has(selectedNode.tag) ? [["Top", "Vrh"], ["Height", "Visina"]] : [["Left", "Lijevo"], ["Top", "Vrh"], ["Width", "Širina"], ["Height", "Visina"]]).map(([name, label]) =>
              <label key={name}>{label}<input inputMode="decimal" value={selectedNode.attrs[name!] ?? ""} onChange={(event) => patch({ [name!]: event.target.value })} /></label>)}
          </div>
          {BAND_TAGS.has(selectedNode.tag) && <label className="rd-wide">Filter<input value={selectedNode.attrs["Filter"] ?? ""} onChange={(event) => patch({ Filter: event.target.value || undefined })} /></label>}
          {isMemo && selectedNode.tag !== "TfrxRichView" && <>
            <label className="rd-wide">Tekst i izrazi<textarea rows={4} value={selectedNode.attrs["Text"] ?? ""} onChange={(event) => patch({ Text: event.target.value })} /></label>
            <p className="report-note">Podaci: <code>[PARTS."DNAME"]</code>, <code>[PROJECTS."NAME"]</code>, <code>[Page#]</code>, <code>[DATE]</code>.</p>
            <div className="rd-grid">
              <label>Font<select value={selectedNode.attrs["Font.Name"] ?? "Arial"} onChange={(event) => patch({ "Font.Name": event.target.value, ParentFont: "False" })}>{[...new Set([selectedNode.attrs["Font.Name"] ?? "Arial", ...FONTS])].map((font) => <option key={font}>{font}</option>)}</select></label>
              <label>Veličina<input inputMode="numeric" value={Math.abs(num(selectedNode.attrs["Font.Height"], -13))} onChange={(event) => patch({ "Font.Height": String(-Math.max(1, num(event.target.value, 13))), ParentFont: "False" })} /></label>
            </div>
            <div className="rd-checks">
              <label><input type="checkbox" checked={(fontStyle & 1) !== 0} onChange={(event) => setBit("Font.Style", fontStyle, 1, event.target.checked)} /> Podebljano</label>
              <label><input type="checkbox" checked={(fontStyle & 2) !== 0} onChange={(event) => setBit("Font.Style", fontStyle, 2, event.target.checked)} /> Kurziv</label>
              <label><input type="checkbox" checked={(fontStyle & 4) !== 0} onChange={(event) => setBit("Font.Style", fontStyle, 4, event.target.checked)} /> Podvučeno</label>
            </div>
            <div className="rd-grid">
              <label>Vodoravno<select value={selectedNode.attrs["HAlign"] ?? "haLeft"} onChange={(event) => patch({ HAlign: event.target.value })}><option value="haLeft">Lijevo</option><option value="haCenter">Sredina</option><option value="haRight">Desno</option><option value="haBlock">Obostrano</option></select></label>
              <label>Okomito<select value={selectedNode.attrs["VAlign"] ?? "vaTop"} onChange={(event) => patch({ VAlign: event.target.value })}><option value="vaTop">Gore</option><option value="vaCenter">Sredina</option><option value="vaBottom">Dolje</option></select></label>
              <label>Boja teksta<input type="color" value={delphiToCssHex(selectedNode.attrs["Font.Color"])} onChange={(event) => patch({ "Font.Color": cssToDelphiColor(event.target.value), ParentFont: "False" })} /></label>
              <label>Pozadina<input type="color" value={delphiToCssHex(selectedNode.attrs["Fill.BackColor"], "#ffffff")} onChange={(event) => patch({ "Fill.BackColor": cssToDelphiColor(event.target.value) })} /></label>
            </div>
            <button onClick={() => patch({ "Fill.BackColor": undefined })} disabled={selectedNode.attrs["Fill.BackColor"] === undefined}>Bez pozadine</button>
            <div className="rd-checks">
              {([["Okvir lijevo", 1], ["Okvir desno", 2], ["Okvir gore", 4], ["Okvir dolje", 8]] as const).map(([label, bit]) =>
                <label key={bit}><input type="checkbox" checked={(frameType & bit) !== 0} onChange={(event) => setBit("Frame.Typ", frameType, bit, event.target.checked)} /> {label}</label>)}
            </div>
          </>}
          {selectedNode.tag === "TfrxLineView" && <label>Boja linije<input type="color" value={delphiToCssHex(selectedNode.attrs["Color"])} onChange={(event) => patch({ Color: cssToDelphiColor(event.target.value) })} /></label>}
          {selectedNode.tag === "TfrxRichView" && <p className="report-note">Formatirani tekst (RTF) može se premještati i brisati, ali se ne uređuje.</p>}
        </>}
      </aside>
    </div>
  </div>;
}

function ObjectView({ node }: { node: Fr3Node }) {
  switch (node.tag) {
    case "TfrxMemoView": case "TfrxSysMemoView": {
      const text = node.attrs["Text"] ?? "";
      return <div className="rd-memo" style={memoStyle(node)}><span>{text}</span></div>;
    }
    case "TfrxRichView": return <div className="rd-memo rd-muted"><span>(formatirani tekst)</span></div>;
    case "TfrxLineView": return <div className="rd-line" style={{ borderTopColor: delphiToCssHex(node.attrs["Color"]) }} />;
    case "TfrxPictureView": {
      const image = imageFromPropData(node.attrs["Picture.PropData"] ?? node.attrs["PropData"] ?? "");
      return image ? <img className="rd-picture" alt="" src={`data:${image.mime};base64,${image.base64}`} /> : <div className="rd-memo rd-muted"><span>(slika)</span></div>;
    }
    case "TfrxShapeView": case "TfrxGradientView": return <div className="rd-shape" />;
    case "TfrxSubreport": return <div className="rd-memo rd-muted"><span>(podizvještaj {node.attrs["Page"]})</span></div>;
    default: return <div className="rd-memo rd-muted"><span>{node.tag.replace(/^Tfrx/, "")}</span></div>;
  }
}

function memoStyle(node: Fr3Node): CSSProperties {
  const css: CSSProperties = {};
  for (const declaration of memoCss(styleOf(node.attrs)).split(";")) {
    const at = declaration.indexOf(":");
    if (at < 0) continue;
    const property = declaration.slice(0, at).trim().replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    (css as Record<string, string>)[property] = declaration.slice(at + 1).trim();
  }
  return css;
}
