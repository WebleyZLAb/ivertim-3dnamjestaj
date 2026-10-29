import { useState } from "react";
import type { CorpusS3dElement } from "../lib/corpus-s3d";
import type { CorpusE3dImportSource } from "../lib/corpus-s3d-writer";
import type { CorpusGroupVariableTarget } from "../lib/corpus-group-variables";

export type GroupVariablePreview = {
  beforeElements: readonly CorpusS3dElement[];
  beforeSources: readonly CorpusE3dImportSource[];
  indexes: readonly number[];
  targets: readonly CorpusGroupVariableTarget[];
  name: string;
  value: string;
};

function geometryChanges(before: CorpusS3dElement, after: CorpusS3dElement, path = before.name): string[] {
  const changes: string[] = [];
  const describe = (label: string, a: readonly unknown[], b: readonly unknown[]) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) changes.push(`${label}: ${a.map(x => x ?? "?").join(" / ")} → ${b.map(x => x ?? "?").join(" / ")}`);
  };
  describe(`${path} · omotač Š/V/D`, [before.width,before.height,before.depth], [after.width,after.height,after.depth]);
  describe(`${path} · položaj X/Y/Z`, before.position, after.position);
  describe(`${path} · uglovi X/Y/Z`, [before.xAngle,before.angle,before.zAngle], [after.xAngle,after.angle,after.zAngle]);
  before.boards.forEach((board,index) => {
    const next = after.boards[index]; if (!next) return;
    const label = `${path} / ${board.name || index+1}`;
    describe(`${label} · položaj X/Y/Z`,board.position,next.position);
    describe(`${label} · VISINA/DUBINA/debljina`,[board.height,board.width,board.thickness],[next.height,next.width,next.thickness]);
    describe(`${label} · uglovi X/Y/Z`,[board.xAngle,board.angle,board.zAngle],[next.xAngle,next.angle,next.zAngle]);
    if (board.visible !== next.visible) changes.push(`${label} · vidljivost: ${board.visible !== false} → ${next.visible !== false}`);
  });
  if (before.visible !== after.visible) changes.push(`${path} · vidljivost: ${before.visible !== false} → ${after.visible !== false}`);
  before.children.forEach((child,index) => { if(after.children[index]) changes.push(...geometryChanges(child,after.children[index]!,`${path} / ${child.name}`)); });
  return changes;
}

export function GroupVariableEditor({elements, blockedReason, onPrepare, onApply}: {
  elements: readonly CorpusS3dElement[];
  blockedReason?: string;
  onPrepare(name:string,value:string): GroupVariablePreview;
  onApply(preview:GroupVariablePreview): string | undefined;
}) {
  const shared = Object.keys(elements[0]?.variables ?? {}).filter(name => elements.every(element => Object.keys(element.variables).filter(key => key.toUpperCase() === name.toUpperCase()).length === 1));
  const [name,setName] = useState("");
  const [value,setValue] = useState("");
  const [preview,setPreview] = useState<GroupVariablePreview | null>(null);
  const [message,setMessage] = useState("");
  const activeName = shared.includes(name) ? name : shared[0] ?? "";
  function prepare() {
    setPreview(null); setMessage("");
    try { setPreview(onPrepare(activeName,value)); }
    catch(reason) { setMessage(reason instanceof Error ? reason.message : "Grupu nije moguće pripremiti."); }
  }
  return <section className="group-variable-editor" aria-label="Grupna izmjena varijable">
    <h3>Varijabla za označenu grupu ({elements.length})</h3>
    <p>Primjenjuje jednu postojeću varijablu na sve označene korijenske E3D elemente. Svaki se preračunava zasebno; jedan Undo vraća cijelu grupu.</p>
    {blockedReason ? <p role="status">{blockedReason}</p> : !shared.length ? <p role="status">Označeni elementi nemaju zajedničku jednoznačnu varijablu.</p> : <>
      <label><span>Zajednička varijabla</span><select value={activeName} onChange={event=>{setName(event.target.value);setPreview(null);setMessage("");}}>{shared.map(key=><option key={key} value={key}>{key}</option>)}</select></label>
      <label><span>Nova vrijednost ili izraz za grupu</span><input value={value} onChange={event=>{setValue(event.target.value);setPreview(null);setMessage("");}} /></label>
      <button className="secondary-button" disabled={!value.trim()} onClick={prepare}>Pregledaj grupnu izmjenu</button>
    </>}
    {preview && <div className="group-variable-preview" aria-label="Pregled ciljeva grupne varijable">
      <strong>{preview.name} = {preview.value} · {preview.targets.length} cilja</strong>
      <ul>{preview.targets.map(target=>{
        const before=preview.beforeElements[target.rootIndex]!;
        const key=Object.keys(before.variables).find(key=>key.toUpperCase()===preview.name.toUpperCase())!;
        const changes=geometryChanges(before,target.element);
        return <li key={target.rootIndex}><strong>#{target.rootIndex+1} {before.name} {before.code}</strong><span>{key}: {before.variables[key]} → {preview.value}</span><details><summary>Promjene geometrije i vidljivosti ({changes.length})</summary>{changes.length ? <ul>{changes.map((change,index)=><li key={index}>{change}</li>)}</ul> : <p>Geometrija i vidljivost ostaju iste.</p>}</details></li>;
      })}</ul>
      <p>Vrijednosti se računaju u kontekstu svakog cilja. Proizvodni makroi i fizičko mapiranje obrada nisu ovim potvrđeni.</p>
      <button className="primary-button" onClick={()=>{const error=onApply(preview);setPreview(null);setMessage(error || "Varijabla je primijenjena na označenu grupu. Poništi vraća cijelu promjenu.");}}>Primijeni na {preview.targets.length} elementa</button>
    </div>}
    {message && <p role="status">{message}</p>}
  </section>;
}
