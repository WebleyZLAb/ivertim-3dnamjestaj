import {corpusElementAtPath,replaceCorpusElement} from "./corpus-model.ts";
import {parseCorpusE3d, type CorpusS3dElement} from "./corpus-s3d.ts";
import {inspectCorpusGeometryIssues,recalculateCorpusBoards,recalculateCorpusE3dVariables} from "./corpus-parametric.ts";
import {replaceCorpusE3dBoardFormulas} from "./corpus-s3d-writer.ts";
export const corpusBoardFormulaFields = [
 {key:"XF",field:"X",label:"Pozicija X"},{key:"YF",field:"Y",label:"Pozicija Y"},{key:"ZF",field:"Z",label:"Pozicija Z"},
 {key:"HF",field:"VISINA",label:"Dužina konture"},{key:"SF",field:"SIRINA",label:"Širina konture"},{key:"DF",field:"DEBLJINA",label:"Debljina"},
 {key:"KXF",field:"XKUT",label:"X ugao"},{key:"KYF",field:"DKUT",label:"Ugao"},{key:"KZF",field:"ZKUT",label:"Z ugao"},
] as const;
export function previewCorpusBoardFormulas(element: CorpusS3dElement, boardIndex: number, patch: Readonly<Record<string,string>>, elementPath: readonly number[] = [0]) {
 const target=corpusElementAtPath([element],elementPath);
 const board=target?.boards[boardIndex];
 if(!board || Object.entries(patch).some(([key,value])=>!corpusBoardFormulaFields.some(f=>f.key===key)||typeof value!=="string")) throw new Error("Ploča ili polje izraza nije ispravno.");
 const formulas={...board.formulas};
 for(const [key,value] of Object.entries(patch)) { if(value.trim())formulas[key]=value.trim();else delete formulas[key]; }
 const changed=corpusBoardFormulaFields.filter(f=>(formulas[f.key]??"")!==(board.formulas?.[f.key]??""));
 const replacement={...target!,boards:target!.boards.map((b,i)=>i===boardIndex?{...b,formulas}:b)};
 const draft=replaceCorpusElement([element],target!,replacement).elements[0]!;
 const issues=inspectCorpusGeometryIssues(draft).filter(issue=>issue.elementPath.join(".")===elementPath.join(".") && issue.boardIndex===boardIndex);
 const errors=issues.filter(issue=>changed.some(f=>f.field===issue.field));
 const result=corpusElementAtPath([recalculateCorpusBoards(draft)],elementPath)!.boards[boardIndex]!;
 const values=[...result.position,result.height,result.width,result.thickness,result.xAngle,result.angle,result.zAngle];
 return {board:result,values,issues,errors,changed:changed.length>0};
}
export function applyCorpusE3dBoardFormulas(xml: string, boardIndex: number, patch: Readonly<Record<string,string>>, elementPath: readonly number[] = [0]): string {
 const element=parseCorpusE3d(xml).elements[0];
 if(!element)throw new Error("E3D nema korijenski element.");
 const preview=previewCorpusBoardFormulas(element,boardIndex,patch,elementPath);
 if(preview.errors.length)throw new Error(`Izraz nije primijenjen: ${preview.errors[0]!.field} — ${preview.errors[0]!.reason}. Provjeri reference i kružne zavisnosti.`);
 return recalculateCorpusE3dVariables(replaceCorpusE3dBoardFormulas(xml,boardIndex,patch,elementPath),{rejectInvalidDimensions:true});
}
