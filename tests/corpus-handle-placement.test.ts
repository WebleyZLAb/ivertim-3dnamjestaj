import assert from "node:assert/strict";
import test from "node:test";
import { corpusHandlePlacement, handleDirectionFromVariable } from "../lib/corpus-handle-placement.ts";

const front = { width: 600, height: 716 };
const handle = { width: 190, height: 12, depth: 35 };

test("vodoravna ručkica na vratima tipa 1: uz desnu ivicu, od gornje ivice (formule RUCKICAX/RUCKICAY)", () => {
  assert.deepEqual(corpusHandlePlacement({ front, handle, frontType: 1, direction: "horizontal", offsetX: 50, offsetY: 30 }), { x: 600 - 50 - 190, y: 716 - 30 - 12, angle: 0 });
});

test("ostali tipovi fronte: ručkica uz lijevu ivicu na rxo", () => {
  assert.deepEqual(corpusHandlePlacement({ front, handle, frontType: 2, direction: "horizontal", offsetX: 50, offsetY: 30 }), { x: 50, y: 716 - 30 - 12, angle: 0 });
});

test("okomita ručkica je zakrenuta 270° i X se računa po njenoj visini (r.v), Y od gornje ivice", () => {
  assert.deepEqual(corpusHandlePlacement({ front, handle, frontType: 1, direction: "vertical", offsetX: 40, offsetY: 60 }), { x: 600 - 40 - 12, y: 716 - 60, angle: 270 });
  assert.deepEqual(corpusHandlePlacement({ front, handle, frontType: 2, direction: "vertical", offsetX: 40, offsetY: 60 }), { x: 40, y: 716 - 60, angle: 270 });
});

test("nasadna ručkica: X = 0, Y = v − r.v, bez pomaka i zakretanja; neispravne mjere se odbijaju", () => {
  assert.deepEqual(corpusHandlePlacement({ front, handle, frontType: 1, direction: "vertical", offsetX: 40, offsetY: 60, surfaceMounted: true }), { x: 0, y: 716 - 12, angle: 0 });
  assert.throws(() => corpusHandlePlacement({ front, handle, frontType: 1, direction: "horizontal", offsetX: -1, offsetY: 0 }));
  assert.throws(() => corpusHandlePlacement({ front: { width: 0, height: 10 }, handle, frontType: 1, direction: "horizontal", offsetX: 0, offsetY: 0 }));
});

test("ruc_sm: 1 horizontalna, 2 okomita", () => {
  assert.equal(handleDirectionFromVariable("1"), "horizontal");
  assert.equal(handleDirectionFromVariable("2"), "vertical");
});
