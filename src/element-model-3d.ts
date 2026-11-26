import * as THREE from "three";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";

const cache = new Map<string, Promise<THREE.Object3D>>();

/** Učitava `.dae` model iz `public/local-corpus/Modeli/<putanja>`; isti model se učitava samo jednom. */
export function loadElementModel(path: string): Promise<THREE.Object3D> {
  let promise = cache.get(path);
  if (!promise) {
    const url = `/local-corpus/Modeli/${path.split("/").map(encodeURIComponent).join("/")}`;
    promise = new Promise<THREE.Object3D>((resolve, reject) => {
      new ColladaLoader().load(url, (collada) => (collada ? resolve(collada.scene) : reject(new Error(`Model je prazan: ${path}`))), undefined, () => reject(new Error(`Model nije učitan: ${path}`)));
    });
    promise.catch(() => cache.delete(path));
    cache.set(path, promise);
  }
  return promise;
}

/**
 * Uklapa model u kvadar `box` (lokalne koordinate grupe): najduža mjera modela ide na najdužu mjeru kvadra, druga na drugu,
 * najkraća na najkraću, uz razvlačenje po osama. Model je u svojim jedinicama (Collada, metri ili milimetri), pa se mjere
 * uzimaju iz njegovog stvarnog obuhvata.
 */
export function fitModelToBox(source: THREE.Object3D, box: THREE.Box3): THREE.Group {
  const model = source.clone(true);
  const wrapper = new THREE.Group();
  wrapper.add(model);
  model.updateMatrixWorld(true);
  const modelBox = new THREE.Box3().setFromObject(model);
  const modelSize = modelBox.getSize(new THREE.Vector3()).toArray();
  const targetSize = box.getSize(new THREE.Vector3()).toArray();
  const modelCenter = modelBox.getCenter(new THREE.Vector3());
  const targetCenter = box.getCenter(new THREE.Vector3());
  const rank = (sizes: number[]) => [0, 1, 2].sort((a, b) => sizes[b]! - sizes[a]!);
  const modelAxes = rank(modelSize), targetAxes = rank(targetSize);
  // M[ciljna osa][osa modela] = razmjer
  const m = new Array<number>(9).fill(0);
  modelAxes.forEach((modelAxis, index) => {
    const targetAxis = targetAxes[index]!;
    const sourceLength = modelSize[modelAxis]!;
    m[targetAxis * 3 + modelAxis] = sourceLength > 1e-9 ? Math.max(targetSize[targetAxis]!, 1e-6) / sourceLength : 1;
  });
  const transform = new THREE.Matrix4().set(m[0]!, m[1]!, m[2]!, 0, m[3]!, m[4]!, m[5]!, 0, m[6]!, m[7]!, m[8]!, 0, 0, 0, 0, 1);
  const toOrigin = new THREE.Matrix4().makeTranslation(-modelCenter.x, -modelCenter.y, -modelCenter.z);
  const toTarget = new THREE.Matrix4().makeTranslation(targetCenter.x, targetCenter.y, targetCenter.z);
  wrapper.matrixAutoUpdate = false;
  wrapper.matrix.copy(toTarget.multiply(transform).multiply(toOrigin));
  wrapper.matrixWorldNeedsUpdate = true;
  return wrapper;
}

/**
 * Zamjenjuje privremene daske elementa modelom: kvadar `placeholder` (lokalno u `group`) određuje položaj i mjere, a nakon
 * učitavanja se skriva. Ako je grupa u međuvremenu uklonjena iz scene (prikaz je osvježen), ne radi ništa.
 */
export function attachElementModel(group: THREE.Group, placeholders: readonly THREE.Object3D[], modelPath: string, onAttached?: () => void): void {
  void loadElementModel(modelPath).then((source) => {
    if (!group.parent) return;
    group.updateWorldMatrix(true, true);
    const world = new THREE.Box3();
    for (const placeholder of placeholders) if (placeholder instanceof THREE.Mesh) world.union(new THREE.Box3().setFromObject(placeholder));
    if (world.isEmpty()) return;
    const local = world.applyMatrix4(group.matrixWorld.clone().invert());
    const fitted = fitModelToBox(source, local);
    fitted.userData.elementModel = modelPath;
    for (const placeholder of placeholders) placeholder.visible = false;
    group.add(fitted);
    onAttached?.();
  }).catch(() => undefined);
}
