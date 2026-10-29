// Geometry names documented in Corpus system/LNG/English/FormulaHelp.txt and SysVar.ini.
// Existing Croatian names remain supported; undocumented legacy names (e.g. DE) are not inferred.
export const corpusElementGeometryAliases=[
 ["V","VISINA"],["S","SIRINA"],["ŠIRINA","SIRINA"],["D","DUBINA"],
 ["HEIGHT","VISINA"],["H","VISINA"],["WIDTH","SIRINA"],["W","SIRINA"],["DEPTH","DUBINA"],
 ["ANGX","XKUT"],["ANGY","DKUT"],["ANGZ","ZKUT"],
] as const;
export const corpusBoardGeometryAliases=[
 ["ŠIRINA","SIRINA"],["DUBINA","SIRINA"],
 ["HEIGHT","VISINA"],["H","VISINA"],["WIDTH","SIRINA"],["W","SIRINA"],["DEPTH","SIRINA"],["D","SIRINA"],
 ["THICKNESS","DEBLJINA"],["TH","DEBLJINA"],
 ["ANGX","XKUT"],["ANGY","DKUT"],["ANGZ","ZKUT"],
] as const;

export function corpusObjectReferenceNameIsSupported(name:string):boolean {
 return /^[A-Za-zČĆŽŠĐčćžšđ_][A-Za-zČĆŽŠĐčćžšđ0-9_ ]*$/.test(name);
}
