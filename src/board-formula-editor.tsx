import {corpusExpressionFunctions,corpusExpressionReferences} from "../lib/corpus-expression-catalog";
import {useEffect,useMemo,useRef,useState} from "react";
import type {CorpusS3dElement} from "../lib/corpus-s3d";
import {corpusBoardFormulaFields,previewCorpusBoardFormulas} from "../lib/corpus-board-formulas";
const reasons={missing:"Nedostaje referenca",cycle:"Kružna zavisnost",invalid:"Neispravan ili nepodržan izraz",unresolved:"Zavisnost nije razriješena",value:"Nedozvoljena vrijednost"};
export function BoardFormulaEditor({element,rootElement=element,elementPath=[0],boardIndex,canEdit,onApply}:{element:CorpusS3dElement;rootElement?:CorpusS3dElement;elementPath?:readonly number[];boardIndex:number;canEdit:boolean;onApply(boardIndex:number,patch:Readonly<Record<string,string>>):string|void}) {
 const board=element.boards[boardIndex]!;
 const initial=()=>Object.fromEntries(corpusBoardFormulaFields.map(f=>[f.key,board.formulas?.[f.key]??""]));
 const [draft,setDraft]=useState(initial),[message,setMessage]=useState("");
 useEffect(()=>{setDraft(initial());setMessage("");},[board]);
 const preview=useMemo(()=>previewCorpusBoardFormulas(rootElement,boardIndex,draft,elementPath),[rootElement,elementPath,boardIndex,draft]);
 const references=useMemo(()=>{
  const ancestors:CorpusS3dElement[]=[];let current=rootElement;
  for(const index of elementPath.slice(1)){ancestors.push(current);current=current.children[index]!;}
  return corpusExpressionReferences(element,ancestors);
 },[element,rootElement,elementPath]);
 const [activeField,setActiveField]=useState<string>("XF"),[catalogQuery,setCatalogQuery]=useState(""),[category,setCategory]=useState("Sve");
 const inputs=useRef<Record<string,HTMLInputElement|null>>({});
 const target=corpusBoardFormulaFields.find(f=>f.key===activeField)!;
 const needle=catalogQuery.trim().toLocaleLowerCase();
 const shownReferences=references.filter(ref=>(category==="Sve"||category===ref.category)&&`${ref.expression} ${ref.description}`.toLocaleLowerCase().includes(needle));
 const shownFunctions=corpusExpressionFunctions.filter(fn=>(category==="Sve"||category==="Funkcije")&&`${fn.name} ${fn.signature} ${fn.description}`.toLocaleLowerCase().includes(needle));
 function insert(text:string) {
  const input=inputs.current[activeField];
  const value=draft[activeField]??"",start=input?.selectionStart??value.length,end=input?.selectionEnd??start;
  setDraft(current=>({...current,[activeField]:value.slice(0,start)+text+value.slice(end)}));setMessage("");
  requestAnimationFrame(()=>{const field=inputs.current[activeField];field?.focus();field?.setSelectionRange(start+text.length,start+text.length);});
 }
 const listId=`board-formula-reference-${boardIndex}`;
 return <section className="data-section board-formula-editor" aria-label="Izrazi geometrije ploče"><div className="section-title"><h3>Izrazi i rezultati ploče</h3></div>
 {elementPath.length>1 && <p>Podelement {element.name}: obračun uključuje roditeljski kontekst. Strukturne radnje i zaseban E3D izvoz još nisu dostupni.</p>}
 <p>Izraz ostaje sačuvan uz izračunatu mjeru. Prazan izraz uklanja vezu i zadržava trenutni broj. Broj u geometriji sam ne uklanja postojeći izraz.</p>
 <datalist id={listId}>{references.map(ref=><option key={ref.expression} value={ref.expression}/>)}</datalist>
 <div className="board-formula-rows">{corpusBoardFormulaFields.map((f,i)=>{const issue=preview.issues.find(issue=>issue.field===f.field);return <label key={f.key}><span>{f.label}</span><input ref={node=>{inputs.current[f.key]=node;}} onFocus={()=>setActiveField(f.key)} aria-label={`Izraz ${f.label}`} list={listId} disabled={!canEdit} value={draft[f.key]} onChange={event=>{setDraft(current=>({...current,[f.key]:event.target.value}));setMessage("");}} placeholder="Bez izraza"/><output aria-label={`Rezultat ${f.label}`}>{issue?`${reasons[issue.reason]}${issue.missingReferences?.length ? ` · Nedostaje: ${issue.missingReferences.join(", ")}` : ""}`:preview.values[i]===null?"—":`${Number(preview.values[i]!.toFixed(3))} ${i<6?"mm":"°"}`}</output></label>})}</div>
 <details className="expression-catalog"><summary>Reference i opis funkcija</summary><p>Umetanje u polje: <strong>{target.label}</strong>. Zamjenjuje označeni tekst ili umeće na mjesto kursora. Umetanje priprema izraz; model mijenjaš dugmetom „Primijeni izraze ploče“.</p>
 <div className="expression-catalog-filter"><input aria-label="Pretraži reference i funkcije" value={catalogQuery} onChange={event=>setCatalogQuery(event.target.value)} placeholder="Naziv, ploča ili funkcija…"/><select aria-label="Kategorija referenci" value={category} onChange={event=>setCategory(event.target.value)}>{["Sve","Element","Ploče","Podelementi","Varijable","Naslijeđeno","Funkcije"].map(name=><option key={name}>{name}</option>)}</select></div>
 <p>Računski znakovi: + − * /; poređenja: = != &lt; &lt;= &gt; &gt;=; logički: AND OR NOT. Decimale piši tačkom, argumente razdvoji znakom ;.</p>
 <ul>{shownFunctions.map(fn=><li key={fn.name}><code>{fn.signature}</code><span>{fn.description}</span><button disabled={!canEdit} onMouseDown={event=>event.preventDefault()} onClick={()=>insert(fn.example)}>Umetni primjer {fn.name}</button><small>{fn.example}</small></li>)}{shownReferences.map(ref=><li key={ref.expression}><code>{ref.expression}</code><span>{ref.category} · {ref.description}</span><button disabled={!canEdit} onMouseDown={event=>event.preventDefault()} onClick={()=>insert(ref.expression)}>Umetni {ref.expression}</button></li>)}</ul>
 {!shownReferences.length&&!shownFunctions.length&&<p>Nema podudaranja za ovu pretragu.</p>}
 <small>Prikazane funkcije podržava trenutni obračun. Reference sa nepoznatom vrijednošću prikazaće grešku u rezultatu; nema automatskog izbora među istoimenim pločama.</small>
 </details>
 <button className="primary-button" disabled={!canEdit || !preview.changed || preview.errors.length>0} onClick={()=>{const error=onApply(boardIndex,draft);setMessage(error||"Izrazi i povezana geometrija su primijenjeni. Jedan Undo vraća izmjenu.");}}>Primijeni izraze ploče</button>
 {!canEdit && <p>Upis izraza je dostupan za samostalni ili uvezeni E3D element i njegove podelemente.</p>}
 {message && <p role="status">{message}</p>}</section>;
}
