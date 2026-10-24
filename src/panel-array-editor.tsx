import { useMemo, useState } from "react";
import type { CorpusS3dElement } from "../lib/corpus-s3d";
import type { CorpusNewBoardSpec } from "../lib/corpus-s3d-writer";
import { corpusPanelArray, type CorpusPanelArraySpec } from "../lib/corpus-panel-array";
import { Icon } from "./iconsax";

export function PanelArrayEditor({ element, canEdit, onCreate }: { element: CorpusS3dElement; canEdit: boolean; onCreate(boards: readonly CorpusNewBoardSpec[]): boolean }) {
  const template = element.boards.find(board => board.direction === 2) ?? element.boards[0];
  const initialThickness = template?.thickness ?? 18;
  const sides = element.boards.filter(board => board.direction === 0 && !board.angle && board.position[0] !== null && board.thickness !== null).sort((a, b) => a.position[0]! - b.position[0]!);
  const horizontals = element.boards.filter(board => board.direction === 2 && !board.angle && board.position[1] !== null && board.thickness !== null).sort((a, b) => a.position[1]! - b.position[1]!);
  const initialX = sides.length >= 2 ? sides[0]!.position[0]! + sides[0]!.thickness! : initialThickness;
  const initialRight = sides.length >= 2 ? sides.at(-1)!.position[0]! : (element.width ?? 600) - initialThickness;
  const initialY = horizontals.length >= 2 ? horizontals[0]!.position[1]! + horizontals[0]!.thickness! : initialThickness;
  const initialTop = horizontals.length >= 2 ? horizontals.at(-1)!.position[1]! : (element.height ?? 720) - initialThickness;
  const rearPlanes = element.boards.filter(board => board.direction === 1 && !board.angle && !board.xAngle && !board.zAngle && board.position[2] !== null && -board.position[2] > (element.depth ?? 320) / 2).map(board => -board.position[2]!);
  const initialDepth = Math.min(element.depth ?? 320, ...rearPlanes);
  const [kind, setKind] = useState<CorpusPanelArraySpec['kind']>('shelves');
  const [count, setCount] = useState('4');
  const [thickness, setThickness] = useState(String(initialThickness));
  const [frontInset, setFrontInset] = useState('20');
  const [opening, setOpening] = useState({ x: String(initialX), y: String(initialY), z: '0', width: String(Math.max(1, initialRight - initialX)), height: String(Math.max(1, initialTop - initialY)), depth: String(initialDepth) });
  const [custom, setCustom] = useState(false);
  const [offsets, setOffsets] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const number = (value: string) => value.trim() ? Number(value.replace(',', '.')) : Number.NaN;
  const preview = useMemo(() => {
    try {
      const boards = corpusPanelArray({ kind, count: number(count), thickness: number(thickness), frontInset: number(frontInset), opening: Object.fromEntries(Object.entries(opening).map(([key, value]) => [key, number(value)])) as CorpusPanelArraySpec['opening'], offsets: custom ? offsets.map(number) : undefined }, template);
      return { boards, error: '' };
    } catch (error) { return { boards: [], error: error instanceof Error ? error.message : 'Provjeri raspored.' }; }
  }, [kind, count, thickness, frontInset, opening, custom, offsets, template]);
  function enableCustom() {
    if (!custom) setOffsets(preview.boards.map(board => String(Number(((kind === 'shelves' ? board.position[1] : board.position[0]) - number(kind === 'shelves' ? opening.y : opening.x)).toFixed(3)))));
    setCustom(value => !value); setMessage('');
  }
  return <section className="panel-array-editor data-section">
    <div className="section-title"><h3>Police i pregrade</h3><span>jedna radnja</span></div>
    <div className="panel-array-main-fields"><label>Vrsta<select aria-label="Vrsta novih ploča" value={kind} onChange={event => { setKind(event.target.value as CorpusPanelArraySpec['kind']); setCustom(false); }}><option value="shelves">Police</option><option value="dividers">Pregrade</option></select></label><label>Broj<input aria-label="Broj novih ploča" type="number" min="1" max="50" value={count} onChange={event => { setCount(event.target.value); setCustom(false); }} /></label><label>Debljina (mm)<input aria-label="Debljina novih ploča" inputMode="decimal" value={thickness} onChange={event => setThickness(event.target.value)} /></label><label>Uvlačenje (mm)<input aria-label="Uvlačenje novih ploča" inputMode="decimal" value={frontInset} onChange={event => setFrontInset(event.target.value)} /></label></div>
    <details><summary>Otvor za raspored — provjeri početne mjere</summary><p>Koordinate su lokalne u elementu. Početne mjere su procjena prema krajnjim bokovima, horizontalnim pločama i unutrašnjoj ravni leđa.</p><div className="panel-array-opening">{([['x', 'Početak X'], ['y', 'Početak Y'], ['z', 'Početak Z'], ['width', 'Širina otvora'], ['height', 'Visina otvora'], ['depth', 'Dubina otvora']] as const).map(([key, label]) => <label key={key}>{label}<input aria-label={label} inputMode="decimal" value={opening[key]} onChange={event => setOpening(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div></details>
    <label className="panel-array-custom"><input type="checkbox" checked={custom} disabled={!custom && !preview.boards.length} onChange={enableCustom} />Pojedinačne pozicije od početka otvora</label>
    <div className="panel-array-positions">{(custom ? offsets : preview.boards.map(board => String(Number(((kind === 'shelves' ? board.position[1] : board.position[0]) - number(kind === 'shelves' ? opening.y : opening.x)).toFixed(3))))).map((offset, index) => <label key={index}>{kind === 'shelves' ? 'Polica' : 'Pregrada'} {index + 1}<input aria-label={`Pozicija nove ploče ${index + 1}`} value={offset} readOnly={!custom} onChange={event => setOffsets(current => current.map((value, row) => row === index ? event.target.value : value))} /><small>mm</small></label>)}</div>
    {preview.error && <p className="error-message" role="alert">{preview.error}</p>}
    <button className="primary-button" disabled={!canEdit || !preview.boards.length} onClick={() => { if (onCreate(preview.boards)) setMessage(`${preview.boards.length} ploča je dodano. Poništi vraća cijeli raspored.`); }}><Icon name="new" variant="twotone" size={17} />Dodaj {kind === 'shelves' ? 'police' : 'pregrade'}</button>
    {message && <p role="status">{message}</p>}
  </section>;
}
