import {parseCorpusE3d,type CorpusS3dElement} from "./corpus-s3d.ts";
import {writeCorpusE3dGeometryCopy} from "./corpus-s3d-writer.ts";
import {corpusBoardHasRebuildableRectangle,inspectCorpusGeometryIssues,recalculateCorpusE3dVariables,type CorpusGeometryIssue} from "./corpus-parametric.ts";
export type CorpusLibraryDimensions={width:number;height:number;depth:number};
export class CorpusLibraryResizeError extends Error {
 readonly issues:readonly CorpusGeometryIssue[];
 constructor(message:string,issues:readonly CorpusGeometryIssue[]=[]){super(message);this.name="CorpusLibraryResizeError";this.issues=issues;}
}
export function prepareCorpusLibraryDimensions(xml:string,dimensions?:CorpusLibraryDimensions):{element:CorpusS3dElement;sourceXml:string;changed:boolean} {
 const roots=parseCorpusE3d(xml).elements;
 if(roots.length!==1)throw new CorpusLibraryResizeError("E3D mora sadržati tačno jedan korijenski element.");
 const original=roots[0]!;
 if(!dimensions)return {element:original,sourceXml:xml,changed:false};
 if(Object.values(dimensions).some(value=>!Number.isFinite(value)||value<=0))throw new CorpusLibraryResizeError("Sve mjere moraju biti pozitivni brojevi.");
 if(dimensions.width===original.width&&dimensions.height===original.height&&dimensions.depth===original.depth)return {element:original,sourceXml:xml,changed:false};
 if(original.locked===true||original.editable===false)throw new CorpusLibraryResizeError("Element je zaključan za promjenu mjera. Možeš vratiti izvorne mjere i umetnuti original.");
 const requested={...original,...dimensions};
 const issues=inspectCorpusGeometryIssues(requested);
 if(issues.length)throw new CorpusLibraryResizeError(`Nove mjere nisu primijenjene. Neriješenih geometrijskih izraza: ${issues.length}. Pregled prikazuje izvorni element.`,issues);
 const staged=writeCorpusE3dGeometryCopy(xml,[original],[requested]);
 const output=recalculateCorpusE3dVariables(staged,{rejectInvalidDimensions:true});
 const next=parseCorpusE3d(output).elements[0]!;
 const checkContours=(before:CorpusS3dElement,after:CorpusS3dElement)=>{
  before.boards.forEach((board,i)=>{
   const changed=after.boards[i]!;
   if((board.height!==changed.height||board.width!==changed.width)&&!corpusBoardHasRebuildableRectangle(board))throw new CorpusLibraryResizeError(`Kontura ploče „${board.name || i+1}“ nema potvrđenu pravougaonu obnovu. Nove mjere nisu primijenjene; pregled prikazuje izvorni element.`);
  });
  before.children.forEach((child,i)=>checkContours(child,after.children[i]!));
 };
 checkContours(original,next);
 return {element:next,sourceXml:output,changed:true};
}
