import { lazy, Suspense, useRef, useState, type ReactNode, type CSSProperties } from "react";
import type { CorpusS3dElement } from "../lib/corpus-s3d";
import { Icon } from "./iconsax";

const Preview = lazy(() => import("./room-3d").then(module => ({ default: module.Element3DPreview })));
export type ElementPreviewView = "perspective" | "front" | "side" | "top";

export function ElementEditorWorkspace({ element, selectedBoardIndex, onSelectBoard, canEdit, canChangeStructure, canUndo, onUndo, onAdd, onMove, onRemove, variables, identity, children, onAccept, onCancel, canRedo, onRedo, properties, toolsOpen, toolTitle, onCloseTools }: {
  properties: ReactNode; toolsOpen: boolean; toolTitle: string; onCloseTools(): void;
  canRedo: boolean; onRedo(): void;
  onAccept(): void; onCancel(): void;
  element: CorpusS3dElement; selectedBoardIndex: number | null; onSelectBoard(index: number | null): void;
  canEdit: boolean; canChangeStructure: boolean; canUndo: boolean; onUndo(): void; onAdd(): void;
  onMove(index: number, direction: -1 | 1): void; onRemove(index: number): void;
  variables: ReactNode; identity: ReactNode; children: ReactNode;
}) {
  const [view, setView] = useState<ElementPreviewView>("perspective");
  const [viewRevision, setViewRevision] = useState(0);
  const [hideFronts, setHideFronts] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [sideWidth, setSideWidth] = useState(310);
  const [bottomHeight, setBottomHeight] = useState(215);
  const rootRef = useRef<HTMLDivElement>(null);
  const hiddenBoardIndexes = element.boards.flatMap((board, index) => hideFronts && board.frontType !== null ? [index] : []);
  const active = selectedBoardIndex === null ? null : element.boards[selectedBoardIndex];
  const changeView = (next: ElementPreviewView) => { setView(next); setViewRevision(value => value + 1); };
  const move = (offset: -1 | 1) => { if (selectedBoardIndex === null) return; const target = selectedBoardIndex + offset; if (target < 0 || target >= element.boards.length) return; onMove(selectedBoardIndex, offset); };
  return <div onKeyDown={event => {
    if (event.target instanceof HTMLElement && (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))) return;
    if ((!event.ctrlKey && !event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'z' || key === 'y') { event.preventDefault(); event.stopPropagation(); if (key === 'y' || event.shiftKey) { if (canRedo) onRedo(); } else if (canUndo) onUndo(); }
  }} ref={rootRef} className="corpus-editor-workspace" style={{ "--editor-side-width": `${sideWidth}px`, "--editor-bottom-height": `${bottomHeight}px` } as CSSProperties}>
    <div className="corpus-editor-tools" aria-label="Alati editora">
      <button disabled={!canUndo} onClick={onUndo} title="Poništi posljednju primijenjenu izmjenu"><Icon name="undo" />Poništi</button>
      <button disabled={!canRedo} onClick={onRedo} title="Ponovi poništenu izmjenu"><Icon name="redo" />Ponovi</button>
      <span className="editor-tool-divider" />
      {([['perspective', '3D'], ['front', 'Sprijeda'], ['side', 'Bočno'], ['top', 'Odozgo']] as const).map(([key, label]) => <button key={key} aria-pressed={view === key} onClick={() => changeView(key)}><Icon name={key === 'perspective' ? 'room' : 'drawing'} variant="twotone" />{label}</button>)}
      <button onClick={() => setViewRevision(value => value + 1)} title="Uklopi cijeli element u prikaz">Uklopi</button>
      <span className="editor-tool-divider" />
      <button aria-pressed={hideFronts} onClick={() => setHideFronts(value => !value)}>Sakrij fronte</button>
      <button aria-pressed={wireframe} onClick={() => setWireframe(value => !value)}>Žičani prikaz</button>
    </div>
    <main className="corpus-editor-canvas" aria-label="3D radna površina elementa">
      <div className="corpus-editor-canvas-caption"><strong>{element.name || "Element"}</strong><span>{active?.name || "Izaberi ploču"} · mm</span></div>
      <Suspense fallback={<div className="element-preview-loading">Pripremam 3D element…</div>}><Preview element={element} selectedBoardIndex={selectedBoardIndex} onSelectBoard={onSelectBoard} view={view} viewRevision={viewRevision} hiddenBoardIndexes={hiddenBoardIndexes} wireframe={wireframe} /></Suspense>
    </main>
    <div role="separator" aria-label="Širina stabla i varijabli" aria-orientation="vertical" tabIndex={0} aria-valuemin={230} aria-valuemax={520} aria-valuenow={sideWidth} className="editor-side-split" onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setSideWidth(value => Math.max(230, Math.min(520, value + (event.key === 'ArrowLeft' ? 20 : -20)))); } }} onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)} onPointerMove={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const rect = rootRef.current?.getBoundingClientRect(); if (rect) setSideWidth(Math.max(230, Math.min(520, rect.right - event.clientX))); }} onPointerUp={event => event.currentTarget.releasePointerCapture(event.pointerId)} />
    <aside className="corpus-editor-inspector" aria-label="Stablo ploča i varijable">
      <div className="editor-accept-actions"><button className="primary-button" onClick={onAccept}><Icon name="save" variant="bulk" size={18} />Prihvati izmjene</button><button onClick={onCancel}>Odustani</button></div><h3>Element i ploče</h3>
      <div className="editor-tree-tools"><button disabled={!canChangeStructure || !canEdit} onClick={onAdd} title="Dodaj ploču"><Icon name="new" variant="twotone" />Dodaj</button><button disabled={!canChangeStructure || selectedBoardIndex === null || selectedBoardIndex === 0} onClick={() => move(-1)} aria-label="Pomjeri ploču gore">↑</button><button disabled={!canChangeStructure || selectedBoardIndex === null || selectedBoardIndex === element.boards.length - 1} onClick={() => move(1)} aria-label="Pomjeri ploču dolje">↓</button><button disabled={!canChangeStructure || selectedBoardIndex === null || element.boards.length < 2} onClick={() => { if (selectedBoardIndex !== null) onRemove(selectedBoardIndex); }} aria-label="Ukloni izabranu ploču"><Icon name="cancel" /></button></div>
      <div className="editor-board-tree" role="tree" aria-label="Ploče elementa" onKeyDown={event => {
        const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']; if (!keys.includes(event.key)) return;
        event.preventDefault(); const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="treeitem"]'));
        const current = items.indexOf(event.target as HTMLButtonElement); const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : Math.max(0, Math.min(items.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
        items[next]?.focus(); onSelectBoard(next === 0 ? null : next - 1);
      }}><button role="treeitem" aria-selected={selectedBoardIndex === null} onClick={() => onSelectBoard(null)} className={selectedBoardIndex === null ? 'active' : ''}><Icon name="room" variant="bulk" size={16} /><strong>{element.name || "Element"}</strong></button>{element.boards.map((board, index) => <button key={index} role="treeitem" aria-level={2} aria-selected={selectedBoardIndex === index} className={selectedBoardIndex === index ? 'active' : ''} onClick={() => onSelectBoard(index)}><Icon name="drawing" variant={selectedBoardIndex === index ? 'bulk' : 'twotone'} size={16} /><span>{board.name || `Ploča ${index + 1}`}</span><small>{board.visible === false ? 'skrivena' : ''}</small></button>)}</div>
      {toolsOpen && <section className="corpus-editor-tool-panel" aria-label={`Alati: ${toolTitle}`}>
        <header><strong>{toolTitle}</strong><button aria-label="Zatvori alate i vrati Osnovni tab" onClick={onCloseTools}><Icon name="cancel" size={16} /></button></header>
        <div className="corpus-editor-tool-content">{children}</div>
      </section>}
      <details className="editor-element-properties"><summary>Svojstva elementa</summary>{identity}</details>
      <section className="editor-variables-panel">{variables}</section>
    </aside>
    <div role="separator" aria-label="Visina svojstava ploče" aria-orientation="horizontal" tabIndex={0} aria-valuemin={150} aria-valuemax={480} aria-valuenow={bottomHeight} className="editor-bottom-split" onKeyDown={event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); setBottomHeight(value => Math.max(150, Math.min(480, value + (event.key === 'ArrowUp' ? 20 : -20)))); } }} onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)} onPointerMove={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const rect = rootRef.current?.getBoundingClientRect(); if (rect) setBottomHeight(Math.max(150, Math.min(rect.height - 180, rect.bottom - event.clientY))); }} onPointerUp={event => event.currentTarget.releasePointerCapture(event.pointerId)} />
    <section className="corpus-editor-properties" aria-label="Svojstva izabrane ploče">{properties}</section>
  </div>;
}
