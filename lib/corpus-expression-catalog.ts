import {corpusObjectReferenceNameIsSupported} from "./corpus-geometry-aliases.ts";
import type {CorpusS3dElement} from "./corpus-s3d.ts";
export const corpusExpressionFunctions = [
 {name:"IF",signature:"IF(uslov;da;ne)",description:"Računa samo izabranu granu prema logičkom uslovu.",example:"IF(S>600;18;16)"},
 {name:"MIN",signature:"MIN(a;b;…)",description:"Najmanja od jedne ili više brojčanih vrijednosti.",example:"MIN(S;600)"},
 {name:"MAX",signature:"MAX(a;b;…)",description:"Najveća od jedne ili više brojčanih vrijednosti.",example:"MAX(D;300)"},
 {name:"ABS",signature:"ABS(broj)",description:"Apsolutna vrijednost broja.",example:"ABS(-18)"},
 {name:"ROUND",signature:"ROUND(broj)",description:"Zaokružuje broj na cijeli broj.",example:"ROUND(18.6)"},
 {name:"SIN",signature:"SIN(stepeni)",description:"Sinus ugla izraženog u stepenima.",example:"SIN(30)*100"},
 {name:"COS",signature:"COS(stepeni)",description:"Kosinus ugla izraženog u stepenima.",example:"COS(60)*100"},
 {name:"DEGTORAD",signature:"DEGTORAD(stepeni)",description:"Pretvara stepene u radijane.",example:"DEGTORAD(180)"},
 {name:"RADTODEG",signature:"RADTODEG(radijani)",description:"Pretvara radijane u stepene.",example:"RADTODEG(DEGTORAD(90))"},
 {name:"SQR",signature:"SQR(broj)",description:"Kvadrat broja.",example:"SQR(12)"},
 {name:"SQRT",signature:"SQRT(broj)",description:"Kvadratni korijen nenegativnog broja.",example:"SQRT(144)"},
 {name:"TRUNC",signature:"TRUNC(broj)",description:"Cijeli dio broja, prema nuli.",example:"TRUNC(-18.6)"},
 {name:"ARCCOS",signature:"ARCCOS(broj)",description:"Inverzni kosinus, rezultat u stepenima; broj od −1 do 1.",example:"ARCCOS(0.5)"},
 {name:"ARCSIN",signature:"ARCSIN(broj)",description:"Inverzni sinus, rezultat u stepenima; broj od −1 do 1.",example:"ARCSIN(0.5)"},
 {name:"ARCTAN",signature:"ARCTAN(broj)",description:"Inverzni tangens sa rezultatom u stepenima.",example:"ARCTAN(1)"},
 {name:"ATAN",signature:"ATAN(broj)",description:"Drugi dokumentovani naziv za ARCTAN, rezultat u stepenima.",example:"ATAN(1)"},
 {name:"LN",signature:"LN(broj)",description:"Prirodni logaritam pozitivnog broja.",example:"LN(EXP(2))"},
 {name:"LOG10",signature:"LOG10(broj)",description:"Logaritam pozitivnog broja po bazi 10.",example:"LOG10(1000)"},
 {name:"LOGN",signature:"LOGN(baza;broj)",description:"Logaritam pozitivnog broja po pozitivnoj bazi različitoj od 1.",example:"LOGN(2;8)"},
 {name:"EXP",signature:"EXP(broj)",description:"Eulerov broj e na zadani stepen.",example:"EXP(0)"},
] as const;
export type CorpusExpressionReference = {expression:string;category:"Element"|"Ploče"|"Podelementi"|"Varijable"|"Naslijeđeno";description:string};
export function corpusExpressionReferences(element: CorpusS3dElement, ancestors: readonly CorpusS3dElement[] = []): CorpusExpressionReference[] {
 const result:CorpusExpressionReference[]=ancestors.flatMap(parent=>corpusExpressionReferences(parent).map(ref=>({...ref,category:"Naslijeđeno" as const,description:`${parent.name || "Roditelj"} · ${ref.description}`})));
 const add=(expression:string,category:CorpusExpressionReference["category"],description:string)=>result.push({expression,category,description});
 for(const [key,label] of [["S","Širina elementa"],["V","Visina elementa"],["D","Dubina elementa"],["X","Položaj elementa X"],["Y","Položaj elementa Y"],["Z","Položaj elementa Z"]])add(key!,"Element",label!);
 const names=[...element.boards.map(b=>b.name.toUpperCase()),...element.children.map(e=>e.name.toUpperCase())];
 const unique=(name:string)=>corpusObjectReferenceNameIsSupported(name)&&names.filter(n=>n===name.toUpperCase()).length===1;
 const fields=[["X","Lokalni položaj X"],["Y","Lokalni položaj Y"],["Z","Lokalni položaj Z"],["VISINA","Dužina konture"],["SIRINA","Širina konture"],["DEBLJINA","Debljina ploče"],["XKUT","X ugao"],["DKUT","Ugao"],["ZKUT","Z ugao"]];
 for(const board of element.boards)if(unique(board.name)) {
  for(const [key,label] of fields)add(`${board.name}.${key}`,"Ploče",label!);
  if(!board.xAngle&&!board.angle&&!board.zAngle)for(const axis of ["X","Y","Z"])for(const end of ["MIN","MAX"])add(`${board.name}.AABB.${axis}${end}`,"Ploče",`Granica nerotirane ploče ${axis}${end}`);
 }
 for(const child of element.children)if(unique(child.name))for(const key of ["X","Y","Z","SIRINA","VISINA","DUBINA","XKUT","DKUT","ZKUT"])add(`${child.name}.${key}`,"Podelementi",`Geometrija podelementa ${child.name}`);
 for(const name of Object.keys(element.variables))if(/^[A-Za-zČĆŽŠĐčćžšđ_][A-Za-zČĆŽŠĐčćžšđ0-9_.]*$/.test(name))add(name,"Varijable","Konstrukcijska varijabla elementa");
 // The evaluator gives explicitly named local variables precedence over geometry aliases.
 const uniqueReferences=new Map<string,CorpusExpressionReference>();
 for(const reference of result)uniqueReferences.set(reference.expression.toUpperCase(),reference);
 return [...uniqueReferences.values()];
}
