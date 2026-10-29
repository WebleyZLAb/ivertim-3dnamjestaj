import assert from "node:assert/strict";
import test from "node:test";
import { createCorpusCameraSessions, type CorpusCameraSnapshot } from "../lib/corpus-camera-session.ts";

test("camera belongs to project identity, including late cleanup of the previous project", () => {
  const cache = createCorpusCameraSessions();
  const first = { fileName: "same.S3D" }, second = { fileName: "same.S3D" };
  const key = cache.key(first);
  const state: CorpusCameraSnapshot = { position: [9000, 20, 30], target: [8000, 0, 0], up: [0, 0, 1], view: "top" };
  cache.write(first, state);
  assert.equal(cache.key(first), key);
  assert.notEqual(cache.key(second), key);
  assert.equal(cache.read(second), null);
  cache.write(first, state);
  assert.equal(cache.read(second), null);
  assert.deepEqual(cache.read(first), state);
});

test("camera survives remount without sharing mutable vectors", () => {
  const cache = createCorpusCameraSessions(), scope = {};
  const state: CorpusCameraSnapshot = { position: [1, 2, 3], target: [4, 5, 6], up: [0, 1, 0], view: "side" };
  cache.write(scope, state);
  state.position[0] = 99;
  const restored = cache.read(scope)!;
  assert.equal(restored.position[0], 1);
  restored.target[0] = 99;
  assert.equal(cache.read(scope)!.target[0], 4);
  assert.equal(cache.read(scope)!.view, "side");
});
