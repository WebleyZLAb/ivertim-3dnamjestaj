import test from "node:test";
import assert from "node:assert/strict";
import {libraryChildren,libraryFolders,libraryMatches,libraryItemKind,libraryPicture,libraryDisplayPath,isGolaLibraryPath} from "../lib/corpus-library-browser.ts";

test("biblioteka prikazuje direktne podfoldere bez miješanja sadržaja",()=>{
 const folders=libraryFolders(["Elmsav/Kuhinje/Donji/A.E3D","Elmsav/Kuhinje/Gornji/B.E3D","Elmsav/Ormari/C.E3D"]);
 assert.deepEqual(libraryChildren(folders,""),["Kuhinje","Ormari"]);
 assert.deepEqual(libraryChildren(folders,"Kuhinje"),["Kuhinje/Donji","Kuhinje/Gornji"]);
 assert.equal(libraryMatches("Elmsav/Kuhinje/Donji/A.E3D","Kuhinje",""),false);
 assert.equal(libraryMatches("Elmsav/Kuhinje/Donji/A.E3D","Kuhinje/Donji",""),true);
 assert.equal(libraryMatches("Elmsav/Kuhinje2/A.E3D","Kuhinje","A"),false);
 assert.equal(libraryMatches("Elmsav/Kuhinje/Donji/Čelo.E3D","Kuhinje","čelo"),true);
});
test("okovi su zasebni, a ladice i ručkice ostaju u svojoj grupi",()=>{
 for(const folder of ["_OKOV","_RUCKICE","_LADICE","Blum_Drawers","Hettich_Drawers","Handles","GRASS"]) assert.equal(libraryItemKind(`Elmsav/${folder}/A.E3D`),"hardware");
 assert.equal(libraryItemKind("Elmsav/_DONJI KUHINJSKI ELEMENTI/A.E3D"),"elements");
 assert.equal(libraryDisplayPath("Elmsav\\_OKOV\\A.E3D"),"_OKOV/A.E3D");
});
test("slika pripada tačnoj putanji elementa, uz razliku u velikim slovima",()=>{
 const files=new Map([["elmsav/donji/a.jpg","Elmsav/Donji/A.JPG"],["elmsav/gornji/a.png","Elmsav/Gornji/A.png"]]);
 assert.equal(libraryPicture("Elmsav/Donji/A.E3D",files),"Elmsav/Donji/A.JPG");
 assert.equal(libraryPicture("Elmsav/Gornji/A.e3d",files),"Elmsav/Gornji/A.png");
 assert.equal(libraryPicture("Elmsav/Drugi/A.e3d",files),undefined);
});
test("Corpus sličice sa sufiksom 64 imaju prednost nad punom slikom",()=>{
 const files=new Map([["elmsav/donji/a64.jpg","Elmsav/Donji/A64.jpg"],["elmsav/donji/a.jpg","Elmsav/Donji/A.jpg"]]);
 assert.equal(libraryPicture("Elmsav/Donji/A.E3D",files),"Elmsav/Donji/A64.jpg");
});

test("Gola izbor koristi stvarni naziv fajla, a ne sve stavke foldera okova",()=>{
 assert.equal(isGolaLibraryPath("Elmsav/_OKOV/Gola_sistem/Gola_L_profil.e3d"),true);
 assert.equal(isGolaLibraryPath("Elmsav/HRANIPEX_HANDLES/PROFILES/RiexTouch XG20 Gola C profile.e3d"),true);
 assert.equal(isGolaLibraryPath("Elmsav/_OKOV/Gola_sistem/UGAONIK_GOLA.e3d"),true);
 assert.equal(isGolaLibraryPath("Elmsav/_RUCKICE/R1.E3D"),false);
});

test("Gola izbor uključuje gotove donje kuhinjske elemente iz GOLA podfoldera",()=>{
 assert.equal(isGolaLibraryPath("Elmsav/_DONJI KUHINJSKI ELEMENTI/GOLA/D1V.E3D"),true);
 assert.equal(isGolaLibraryPath("Elmsav/_DONJI KUHINJSKI ELEMENTI/OBICNI/D1V.E3D"),false);
});
