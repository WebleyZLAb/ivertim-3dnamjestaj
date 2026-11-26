import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { distance, entitySegments, orthoPoint, parseCadEntities, rectanglePoints, serializeCadEntities, snapPoint, type CadEntity, type CadPoint, type WallAlign } from "../lib/plan-cad.ts";

export type PlanCadTool = "polyline" | "line" | "rect" | "circle";

export type PlanCadProps = {
  /** Naziv projekta, za zapis i provjeru pri učitavanju linija. */
  fileName: string;
  entities: readonly CadEntity[];
  onChange(entities: readonly CadEntity[]): void;
  /** Dodaje zid duž svakog segmenta entiteta; vraća poruku o rezultatu. */
  onAddWalls(entity: CadEntity, options: { thickness: number; align: WallAlign }): Promise<string>;
};

type Geometry = { svgRef: RefObject<SVGSVGElement | null>; maxV: number; padding: number; viewWidth: number; viewHeight: number; minH: number };

const TOOLS: [PlanCadTool, string][] = [["polyline", "Polilinija"], ["line", "Linija"], ["rect", "Četverokut"], ["circle", "Kružnica"]];
const fmt = (value: number) => String(Math.round(value));
let counter = 0;
const newId = () => `cad-${Date.now().toString(36)}-${counter++}`;

/** Alati i sloj za crtanje u gornjem nacrtu. Vraća traku s alatima, SVG sloj i rukovaoce za SVG. */
export function usePlanCad(props: PlanCadProps | undefined, geometry: Geometry) {
  const [tool, setTool] = useState<PlanCadTool | null>(null);
  const [ortho, setOrtho] = useState(true);
  const [grid, setGrid] = useState(true);
  const [draft, setDraft] = useState<CadPoint[]>([]);
  const [hover, setHover] = useState<CadPoint | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thickness, setThickness] = useState(100);
  const [align, setAlign] = useState<WallAlign>("center");
  const [message, setMessage] = useState<string | null>(null);
  const entities = props?.entities ?? [];
  const selected = entities.find((entity) => entity.id === selectedId) ?? null;
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tool) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setDraft([]); setHover(null); if (draft.length === 0) setTool(null); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, draft.length]);

  const world = (event: ReactPointerEvent<SVGElement>): CadPoint | null => {
    const svg = geometry.svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    return [local.x, geometry.maxV + geometry.padding - local.y];
  };
  const resolve = (raw: CadPoint, last: CadPoint | undefined): CadPoint => {
    let point = grid ? snapPoint(raw, 50) : raw;
    if (ortho && last && (tool === "polyline" || tool === "line")) point = orthoPoint(last, point);
    return point;
  };

  function commit(entity: CadEntity) {
    props?.onChange([...entities, entity]);
    setSelectedId(entity.id);
  }
  function finishPolyline(input: CadPoint[]) {
    const points = input.filter((point, index) => index === 0 || point[0] !== input[index - 1]![0] || point[1] !== input[index - 1]![1]);
    if (points.length >= 2) commit({ id: newId(), kind: "polyline", points, closed: false });
    setDraft([]); setHover(null);
  }

  const handlers = tool ? {
    onPointerDown: (event: ReactPointerEvent<SVGElement>) => {
      if (event.button !== 0) return;
      const raw = world(event);
      if (!raw) return;
      const point = resolve(raw, draft.at(-1));
      const last = draft.at(-1);
      // Dupli klik šalje dva pritiska na istu točku; ista točka kao prethodna se ne dodaje (nema segmenta dužine 0).
      if (tool === "polyline") { if (!last || last[0] !== point[0] || last[1] !== point[1]) setDraft([...draft, point]); return; }
      if (draft.length === 0) { setDraft([point]); return; }
      const first = draft[0]!;
      if (tool === "line") commit({ id: newId(), kind: "line", points: [first, point], closed: false });
      else if (tool === "rect") commit({ id: newId(), kind: "rect", points: rectanglePoints(first, point), closed: true });
      else commit({ id: newId(), kind: "circle", points: [first], closed: true, radius: Math.round(distance(first, point)) });
      setDraft([]); setHover(null);
    },
    onPointerMove: (event: ReactPointerEvent<SVGElement>) => { const raw = world(event); if (raw) setHover(resolve(raw, draft.at(-1))); },
    onContextMenu: (event: { preventDefault(): void }) => { event.preventDefault(); if (tool === "polyline" && draft.length >= 2) finishPolyline(draft); else { setDraft([]); setHover(null); } },
    onDoubleClick: () => { if (tool === "polyline" && draft.length >= 2) finishPolyline(draft); },
  } : null;

  const toolbar: ReactNode = props ? <div className="plan-cad-bar" aria-label="CAD alati">
    <strong>CAD</strong>
    {TOOLS.map(([id, label]) => <button key={id} className={tool === id ? "active" : ""} aria-pressed={tool === id} onClick={() => { setTool(tool === id ? null : id); setDraft([]); setHover(null); setMessage(null); }}>{label}</button>)}
    <label><input type="checkbox" checked={ortho} onChange={(event) => setOrtho(event.target.checked)} /> Pravi ugao</label>
    <label><input type="checkbox" checked={grid} onChange={(event) => setGrid(event.target.checked)} /> Mreža 50 mm</label>
    <button disabled={!selected} onClick={() => { if (selected) { props.onChange(entities.filter((entity) => entity.id !== selected.id)); setSelectedId(null); } }}>Obriši liniju</button>
    <button disabled={entities.length === 0} onClick={() => { props.onChange([]); setSelectedId(null); setDraft([]); }}>Obriši sve</button>
    <button disabled={entities.length === 0} title="Sprema linije u fajl uz projekat" onClick={() => {
      const blob = new Blob([serializeCadEntities(props.fileName, entities)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${props.fileName.replace(/\.(?:s3d|e3d)$/i, "")}.ivertim-cad.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    }}>Spremi linije</button>
    <button onClick={() => fileInput.current?.click()}>Učitaj linije</button>
    <input ref={fileInput} hidden type="file" accept=".json,application/json" onChange={(event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      void file.text().then((text) => { const loaded = parseCadEntities(text, props.fileName); props.onChange([...entities, ...loaded]); setMessage(`Učitano linija: ${loaded.length}.`); }).catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : "Linije nisu učitane."));
    }} />
    <span className="plan-cad-walls">
      <label>Debljina zida <input inputMode="numeric" value={thickness} onChange={(event) => setThickness(Math.max(1, Number(event.target.value) || 1))} /></label>
      <select aria-label="Strana zida" value={align} onChange={(event) => setAlign(event.target.value as WallAlign)}><option value="center">Zid po sredini linije</option><option value="left">Zid lijevo od linije</option><option value="right">Zid desno od linije</option></select>
      <button className="primary-button" disabled={!selected || selected.kind === "circle"} onClick={() => { if (selected) void props.onAddWalls(selected, { thickness, align }).then(setMessage, (reason: unknown) => setMessage(reason instanceof Error ? reason.message : "Zid nije dodan.")); }}>Dodaj zid na liniju</button>
    </span>
    {tool && <span className="plan-cad-hint">{tool === "polyline" ? "Klik dodaje točku; desni klik ili dupli klik završava; Esc prekida." : "Klik za početak, klik za kraj; Esc prekida."}</span>}
    {message && <span className="plan-cad-hint" role="status">{message}</span>}
  </div> : null;

  const toZ = (z: number) => geometry.maxV + geometry.padding - z;
  const stroke = Math.max(6, geometry.viewWidth / 300);
  const label = (a: CadPoint, b: CadPoint, key: string) => <text key={key} className="plan-cad-label" x={(a[0] + b[0]) / 2} y={toZ((a[1] + b[1]) / 2) - stroke * 2} textAnchor="middle" style={{ fontSize: stroke * 4 }}>{fmt(distance(a, b))}</text>;
  const pts = (points: readonly CadPoint[]) => points.map(([x, z]) => `${x},${toZ(z)}`).join(" ");
  const preview = useMemo(() => {
    if (!tool || draft.length === 0 || !hover) return null;
    const first = draft[0]!;
    if (tool === "rect") return { kind: "rect" as const, points: rectanglePoints(first, hover) };
    if (tool === "circle") return { kind: "circle" as const, radius: distance(first, hover) };
    return { kind: "line" as const, points: [...draft, hover] };
  }, [tool, draft, hover]);

  const layer: ReactNode = props ? <g className="plan-cad-layer">
    {entities.map((entity) => {
      const isSelected = entity.id === selectedId;
      const common = { className: `plan-cad-entity${isSelected ? " selected" : ""}`, strokeWidth: isSelected ? stroke * 1.6 : stroke, onPointerDown: tool ? undefined : (event: ReactPointerEvent<SVGElement>) => { event.stopPropagation(); setSelectedId(entity.id); } };
      return <g key={entity.id}>
        {entity.kind === "circle"
          ? <circle {...common} cx={entity.points[0]![0]} cy={toZ(entity.points[0]![1])} r={entity.radius ?? 0} fill="none" />
          : entity.closed ? <polygon {...common} points={pts(entity.points)} fill="none" /> : <polyline {...common} points={pts(entity.points)} fill="none" />}
        {entity.kind === "circle" ? <text className="plan-cad-label" x={entity.points[0]![0]} y={toZ(entity.points[0]![1])} textAnchor="middle" style={{ fontSize: stroke * 4 }}>R {fmt(entity.radius ?? 0)}</text> : entitySegments(entity).map(([a, b], index) => label(a, b, `${entity.id}-${index}`))}
      </g>;
    })}
    {preview?.kind === "line" && <polyline className="plan-cad-preview" points={pts(preview.points)} fill="none" strokeWidth={stroke} />}
    {preview?.kind === "rect" && <polygon className="plan-cad-preview" points={pts(preview.points)} fill="none" strokeWidth={stroke} />}
    {preview?.kind === "circle" && <circle className="plan-cad-preview" cx={draft[0]![0]} cy={toZ(draft[0]![1])} r={preview.radius} fill="none" strokeWidth={stroke} />}
    {preview?.kind === "line" && preview.points.length >= 2 && label(preview.points.at(-2)!, preview.points.at(-1)!, "preview-label")}
    {tool && <rect className="plan-cad-catcher" x={geometry.minH - geometry.padding} y={0} width={geometry.viewWidth} height={geometry.viewHeight} fill="transparent" {...handlers!} />}
    {hover && tool && <circle className="plan-cad-cursor" cx={hover[0]} cy={toZ(hover[1])} r={stroke * 1.5} />}
  </g> : null;

  return { toolbar, layer, active: tool !== null };
}
