import assert from "node:assert/strict";
import test from "node:test";
import { parseCorpusCmk } from "../lib/corpus-cmk.ts";
import { simulateCorpusCmk } from "../lib/corpus-cmk-simulation.ts";
import { resolveCorpusSawPaths } from "../lib/corpus-saw.ts";

test("normalizuje potpuno razriješenu PILA liniju bez tumačenja režimskih polja", () => {
  const simulation = simulateCorpusCmk(parseCorpusCmk(`[PILA1]\nJ=1\nGB=1\nGN=FALC_NUT\nGD=7\nGX=-1.2\nGY=10\nPX=-1.2\nPY=700\nGS=4\nPSP=4.2\nPO=1\nPS=2\nPP=1\nPA=0`));
  assert.deepEqual(resolveCorpusSawPaths(simulation.operations), {
    paths: [{ section: "PILA1", name: "FALC_NUT", count: 1, start: [-1.2, 10], end: [-1.2, 700], depth: 7, toolWidth: 4.2, surface: 4, modes: { PO: 1, PS: 2, PP: 1, PA: 0 }, routerConversion: null }],
    inactive: [], rejected: [],
  });
});

test("razdvaja neaktivne i nedovoljno dokazane PILA operacije", () => {
  const simulation = simulateCorpusCmk(parseCorpusCmk(`[PILA1]\nJ=1\nGB=0\nGN=NEAKTIVNA\n[PILA2]\nJ=1\nGB=1\nGN=NEDOVRSENA\nGD=7\nGX=0\nGY=0\nPX=0\nPY=500\nGS=OBJ2.AUTOST\nPSP=4`));
  const result = resolveCorpusSawPaths(simulation.operations);
  assert.deepEqual(result.inactive, ["PILA1"]);
  assert.deepEqual(result.rejected, [{ section: "PILA2", reason: "Nisu razriješeni GX/GY, PX/PY, GD, PSP i GS" }]);
});

test("čuva dokazanu konverziju pile u glodalo kao metapodatak", () => {
  const simulation = simulateCorpusCmk(parseCorpusCmk(`[PILA1]\nJ=1\nGB=1\nGN=pila1\nGD=7\nGX=0\nGY=0\nPX=0\nPY=500\nGS=2\nPSP=18\nPO=2\nPS=1\nPP=0\nPA=1\nPMU=Konvert_pila_u_glodalo\nPMT=110`));
  assert.deepEqual(resolveCorpusSawPaths(simulation.operations).paths[0]?.routerConversion, { name: "Konvert_pila_u_glodalo", tool: 110 });
});
