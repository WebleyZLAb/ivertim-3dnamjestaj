import { lazy, Suspense, useMemo, useState } from "react";
import { DesktopWindow } from "./desktop";
import { expandCorpusCurve } from "../lib/corpus-geometry";
import { parseCorpusE3d, type CorpusS3dElement } from "../lib/corpus-s3d";
import { corpusElementAtPath } from "../lib/corpus-model";
import { applyGolaCuts, removeGolaCuts, golaSideAvailable, readGolaCuts, type GolaCut } from "../lib/corpus-gola-cuts";
const Preview=lazy(()=>import("./room-3d").then(module=>({default:module.Element3DPreview})));
type Draft={kind:"L"|"C";enabled:boolean;height:string;depth:string;y:string;radius:string};
export function GolaCutsDialog({element,sourceXml,elementPath,message,onClose,onApply}:{element:CorpusS3dElement;sourceXml:string|null;elementPath:readonly number[];message:string;onClose():void;onApply(xml:string):void}) {
 const [boards,setBoards]=useState<number[]>(()=>element.boards.flatMap((b,i)=>golaSideAvailable(b)&&/bok|stran|side/i.test(b.name)?[i]:[]));
 const [rows,setRows]=useState<Draft[]>(()=>{
  const saved=sourceXml&&boards.length?readGolaCuts(sourceXml,boards[0]!,elementPath):null;
  if(saved)return saved.map(row=>({...row,height:String(row.height),depth:String(row.depth),y:String(row.y),radius:String(row.radius)}));
  return [{kind:"L",enabled:true,height:"57",depth:"26",y:"0",radius:"10"},...[0,1,2].map(i=>({kind:"C" as const,enabled:false,height:"72",depth:"26",y:String(Math.round((element.height??800)*(i+1)/4)),radius:"10"}))];
 });
 const [notice,setNotice]=useState("");
 const [showActual,setShowActual]=useState(false);
 const [previewView,setPreviewView]=useState<"side"|"3d">("side");
 const [busy,setBusy]=useState(false);
 const cuts=useMemo(()=>{const number=(value:string)=>value.trim()?Number(value.replace(",",".")):Number.NaN;return rows.map(row=>({...row,height:number(row.height),depth:number(row.depth),y:number(row.y),radius:number(row.radius)}));},[rows]);
 const prepared=useMemo(()=>{if(!sourceXml)return {xml:null,element:null,error:message};try{const xml=applyGolaCuts(sourceXml,boards,cuts,elementPath);return {xml,element:corpusElementAtPath(parseCorpusE3d(xml).elements,elementPath),error:""};}catch(e){return {xml:null,element:null,error:e instanceof Error?e.message:String(e)};}},[sourceXml,boards,cuts,elementPath,message]);
 const displayElement=showActual?element:prepared.element??element;
 const side=displayElement.boards[boards[0]??-1];
 const sidePath=side?expandCorpusCurve(side.curvePoints.length?side.curvePoints:[{x:0,z:0,style:0},{x:side.height!,z:0,style:0},{x:side.height!,z:side.width!,style:0},{x:0,z:side.width!,style:0}]).map((p,i)=>`${i?"L":"M"}${p.z},${side.height!-p.x}`).join(" ")+" Z":"";
 function update(index:number,patch:Partial<Draft>){setRows(current=>current.map((row,i)=>i===index?{...row,...patch}:row));setNotice("");setShowActual(false);}
 function commit(remove=false){try{if(!sourceXml)throw Error(message);setBusy(true);const xml=remove?removeGolaCuts(sourceXml,boards,elementPath):prepared.xml;if(!xml)throw Error(prepared.error);onApply(xml);setShowActual(remove);setNotice(remove?"Izvorne konture izabranih stranica su vraćene.":"Usjeci su napravljeni na izabranim stranicama.");}catch(e){setNotice(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 return <DesktopWindow id="gola-cuts" title="Usijecanje za Gola L i C profile" className="gola-cuts-window" onClose={onClose}><section className="gola-cuts-dialog">
  <div className="gola-cuts-heading"><strong>{element.name}</strong><span>Sve mjere su u mm</span></div>
  <div className="gola-cuts-body"><aside className="gola-cuts-side"><h3>Stranice za usijecanje</h3><div className="gola-board-list">{element.boards.map((board,i)=><label key={i}><input type="checkbox" disabled={!golaSideAvailable(board)} checked={boards.includes(i)} onChange={e=>{setBoards(current=>e.target.checked?[...current,i]:current.filter(index=>index!==i));setNotice("");setShowActual(false);}}/>{board.name||`Ploča ${i+1}`}</label>)}</div>
  <div className="gola-preview-switch"><button className={previewView==="side"?"active":""} onClick={()=>setPreviewView("side")}>Bok · presjek</button><button className={previewView==="3d"?"active":""} onClick={()=>setPreviewView("3d")}>3D element</button></div>
  {previewView==="side" ? side ? <svg className="gola-side-preview" role="img" aria-label={`Kontura stranice ${side.name}`} viewBox={`-25 -25 ${side.width!+50} ${side.height!+50}`}><path d={sidePath} fill="#d4e2ec" stroke="#2c607f" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg>:<p>Izaberi stranicu za pregled.</p> : <Suspense fallback={<p>Pripremam pregled…</p>}><Preview element={displayElement} selectedBoardIndex={boards[0]??null} onSelectBoard={()=>{}}/></Suspense>}
  <p>Pregled prikazuje usjeke prije primjene. L usjek je na vrhu; C usjeke postavi po visini.</p></aside>
  <div className="gola-cut-rows">{rows.map((row,index)=><fieldset key={index} className={row.enabled?"enabled":""}><legend><label><input type="checkbox" checked={row.enabled} onChange={e=>update(index,{enabled:e.target.checked})}/>{index===0?"Napravi L usjek":`Napravi C usjek ${index}`}</label></legend><div className="gola-row-fields">{([["height","Visina"],["depth","Dubina"],["y","Y pozicija"],["radius","Radijus"]] as const).map(([key,label])=><label key={key}>{label}<input aria-label={`${index===0?"L":`C${index}`} ${label}`} inputMode="decimal" value={key==="y"&&index===0?"Na vrhu":row[key]} disabled={!row.enabled||(key==="y"&&index===0)} onChange={e=>update(index,{[key]:e.target.value})}/></label>)}</div></fieldset>)}<p className="gola-position-help">Y pozicija je donja ivica C usjeka, mjerena od dna izabranog elementa. L se uvijek usijeca od vrha stranice. Prednja ivica stranice je Z = 0.</p></div></div>
  <div className="gola-cuts-message" role="status">{notice||prepared.error||`Spremno za usijecanje: ${boards.length} stranice.`}</div>
  <footer><button className="secondary-button" onClick={onClose}>Odustani</button><button className="secondary-button" disabled={busy||!sourceXml||!boards.length} onClick={()=>commit(true)}>Obriši usjeke</button><button className="primary-command" disabled={busy||!prepared.xml} onClick={()=>commit()}>Napravi usjeke</button></footer>
 </section></DesktopWindow>;
}
