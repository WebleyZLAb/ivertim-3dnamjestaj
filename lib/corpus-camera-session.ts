export type CorpusCameraView = "home" | "front" | "side" | "top" | "selection";
export type CorpusCameraSnapshot = {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  view: CorpusCameraView;
};

function copy(state: CorpusCameraSnapshot): CorpusCameraSnapshot {
  return { position: [...state.position], target: [...state.target], up: [...state.up], view: state.view };
}

export function createCorpusCameraSessions() {
  const sessions = new WeakMap<object, { key: number; state: CorpusCameraSnapshot | null }>();
  let nextKey = 0;
  function session(scope: object) {
    let value = sessions.get(scope);
    if (!value) { value = { key: ++nextKey, state: null }; sessions.set(scope, value); }
    return value;
  }
  return {
    key: (scope: object) => session(scope).key,
    read: (scope: object) => { const state = session(scope).state; return state ? copy(state) : null; },
    write: (scope: object, state: CorpusCameraSnapshot) => { session(scope).state = copy(state); },
  };
}

export const corpusRoomCameraSessions = createCorpusCameraSessions();
