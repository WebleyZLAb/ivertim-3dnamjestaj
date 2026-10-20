import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CorpusS3dBoard, CorpusS3dElement, CorpusS3dRoom } from "../lib/corpus-s3d";
import { corpusBoardDimensions, corpusHolePosition, corpusRoomTotalHeight, evaluateCorpusFormula, expandCorpusCurve } from "../lib/corpus-geometry";
import { resolveCorpusMainFaceHoles } from "../lib/corpus-hole-geometry";

type Room3DViewProps = {
  elements: readonly CorpusS3dElement[];
  room: CorpusS3dRoom;
  selected: CorpusS3dElement | null;
  selectedBoardIndex: number | null;
  onSelect(element: CorpusS3dElement): void;
  onSelectBoard(element: CorpusS3dElement, boardIndex: number): void;
  onMove(element: CorpusS3dElement, position: readonly [number, number, number]): void;
  onOpenData(): void;
};

export function Room3DView({ elements, room, selected, selectedBoardIndex, onSelect, onSelectBoard, onMove, onOpenData }: Room3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showEnvelopes, setShowEnvelopes] = useState(true);
  const [showHoles, setShowHoles] = useState(true);
  const [viewRevision, setViewRevision] = useState(0);
  const [cameraView, setCameraView] = useState<"home" | "front" | "side" | "top">("home");
  const [moveMode, setMoveMode] = useState(false);
  const selectedRef = useRef(selected);
  const selectedBoardRef = useRef(selectedBoardIndex);
  const visualRefs = useRef(new Map<CorpusS3dElement, {
    materials: Array<{ boardIndex: number; material: THREE.MeshStandardMaterial; baseColor: THREE.ColorRepresentation }>;
    envelope: THREE.LineBasicMaterial;
  }>());
  selectedRef.current = selected;
  selectedBoardRef.current = selectedBoardIndex;

  useEffect(() => {
    for (const [element, visual] of visualRefs.current) {
      const isSelected = selected === element;
      for (const { boardIndex, material, baseColor } of visual.materials) {
        const isBoardSelected = isSelected && (selectedBoardIndex === null || selectedBoardIndex === boardIndex);
        material.color.set(isBoardSelected ? 0xd8ff42 : baseColor);
        material.emissive.set(isBoardSelected ? 0x293300 : 0x000000);
      }
      visual.envelope.color.set(isSelected ? 0x465400 : 0x667066);
      visual.envelope.opacity = isSelected ? 1 : 0.18;
    }
  }, [selected, selectedBoardIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f6f1);
    scene.fog = new THREE.Fog(0xf4f6f1, 9000, 18000);

    const camera = new THREE.PerspectiveCamera(38, 1, 5, 40000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = 350;
    controls.maxDistance = 22000;
    controls.maxPolarAngle = Math.PI * 0.49;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x9ca597, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 1.65);
    sun.position.set(3500, 6500, 4500);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);

    const roomWidth = Math.max(1000, (room.width ?? 5) * 1000);
    const roomLength = Math.max(1000, (room.length ?? 5) * 1000);
    const roomHeight = Math.max(1000, (corpusRoomTotalHeight(room.height, room.lowerHeight) ?? 2.6) * 1000);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(roomLength, roomWidth),
      new THREE.MeshStandardMaterial({ color: 0xe9ece6, roughness: 1, metalness: 0 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(roomLength / 2, -4, -roomWidth / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    const gridSize = Math.max(roomWidth, roomLength);
    const grid = new THREE.GridHelper(gridSize, Math.max(10, Math.round(gridSize / 250)), 0x858d82, 0xcbd0c8);
    grid.position.set(roomLength / 2, 0, -roomWidth / 2);
    scene.add(grid);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf8faf6, roughness: 1, side: THREE.DoubleSide });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomLength, roomHeight), wallMaterial);
    backWall.position.set(roomLength / 2, roomHeight / 2, 4);
    scene.add(backWall);
    const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), wallMaterial.clone());
    sideWall.rotation.y = Math.PI / 2;
    sideWall.position.set(4, roomHeight / 2, -roomWidth / 2);
    scene.add(sideWall);

    const root = new THREE.Group();
    scene.add(root);
    const pickable: THREE.Mesh[] = [];
    const rootElements = new Set(elements);
    const elementGroups = new Map<CorpusS3dElement, THREE.Group>();
    visualRefs.current.clear();

    let elementIndex = 0;
    const addElement = (parent: THREE.Group, element: CorpusS3dElement) => {
      if (element.visible === false) return;
      const [x, y, z] = element.position;
      const width = element.width;
      const height = element.height;
      const depth = element.depth;
      if (x === null || y === null || z === null || width === null || height === null || depth === null) return;
      if (width <= 0 || height <= 0 || depth <= 0) return;

      const group = new THREE.Group();
      group.position.set(x, y, -z);
      group.rotation.set(
        THREE.MathUtils.degToRad(element.xAngle ?? 0),
        -THREE.MathUtils.degToRad(element.angle ?? 0),
        THREE.MathUtils.degToRad(element.zAngle ?? 0),
      );
      parent.add(group);
      if (rootElements.has(element)) elementGroups.set(element, group);

      const isSelected = selectedRef.current === element;
      const envelopeGeometry = new THREE.BoxGeometry(width, height, depth);
      const pickMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const pickMesh = new THREE.Mesh(envelopeGeometry, pickMaterial);
      pickMesh.position.set(width / 2, height / 2, depth / 2);
      pickMesh.userData.element = element;
      group.add(pickMesh);
      pickable.push(pickMesh);

      const envelopeMaterial = new THREE.LineBasicMaterial({
        color: isSelected ? 0x465400 : 0x667066,
        transparent: true,
        opacity: isSelected ? 1 : 0.18,
      });
      const envelope = new THREE.LineSegments(new THREE.EdgesGeometry(envelopeGeometry), envelopeMaterial);
      envelope.position.copy(pickMesh.position);
      envelope.visible = showEnvelopes;
      group.add(envelope);

      const materials: Array<{ boardIndex: number; material: THREE.MeshStandardMaterial; baseColor: THREE.ColorRepresentation }> = [];
      for (const [boardIndex, board] of element.boards.entries()) {
        const boardSelected = isSelected && (selectedBoardRef.current === null || selectedBoardRef.current === boardIndex);
        const boardMesh = createBoardMesh(board, element, elementIndex, boardIndex, boardSelected, showHoles);
        if (!boardMesh) continue;
        group.add(boardMesh.mesh, boardMesh.edges, boardMesh.pickMesh);
        pickable.push(boardMesh.pickMesh);
        materials.push({ boardIndex, material: boardMesh.material, baseColor: boardMesh.baseColor });
      }
      visualRefs.current.set(element, { materials, envelope: envelopeMaterial });
      elementIndex += 1;

      for (const child of element.children) addElement(group, child);
    };
    for (const element of elements) {
      addElement(root, element);
    }

    const bounds = new THREE.Box3().setFromObject(root);
    let center: THREE.Vector3;
    let span: number;
    if (!bounds.isEmpty()) {
      center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      span = Math.max(size.x, size.y, size.z, 1800);
    } else {
      center = new THREE.Vector3(roomLength / 2, roomHeight / 3, -roomWidth / 3);
      span = Math.max(roomWidth, roomLength, roomHeight, 1800);
    }
    controls.target.copy(center);
    camera.up.set(0, 1, 0);
    if (cameraView === "front") camera.position.set(center.x, center.y, center.z - span * 1.8);
    else if (cameraView === "side") camera.position.set(center.x + span * 1.8, center.y, center.z);
    else if (cameraView === "top") {
      camera.up.set(0, 0, -1);
      camera.position.set(center.x, center.y + span * 1.8, center.z);
    } else camera.position.set(center.x + span * 1.05, center.y + span * 0.72, center.z - span * 1.25);
    camera.near = Math.max(5, span / 1000);
    camera.far = Math.max(40000, span * 10);
    camera.updateProjectionMatrix();
    controls.update();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPoint: { x: number; y: number } | null = null;
    let handledPointerClick = false;
    let drag: { element: CorpusS3dElement; group: THREE.Group; plane: THREE.Plane; offsetX: number; offsetZ: number; originalPosition: [number, number, number]; position: [number, number, number] } | null = null;
    const hitAt = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickable, false);
      return hits.find((entry) => entry.object.userData.boardIndex !== undefined) ?? hits[0];
    };
    const pickAt = (clientX: number, clientY: number) => {
      const hit = hitAt(clientX, clientY);
      const element = hit?.object.userData.element as CorpusS3dElement | undefined;
      const boardIndex = hit?.object.userData.boardIndex as number | undefined;
      if (element && boardIndex !== undefined) onSelectBoard(element, boardIndex);
      else if (element) onSelect(element);
    };
    const onPointerDown = (event: PointerEvent) => {
      downPoint = { x: event.clientX, y: event.clientY };
      if (!moveMode) return;
      const hit = hitAt(event.clientX, event.clientY);
      const element = hit?.object.userData.element as CorpusS3dElement | undefined;
      const group = element ? elementGroups.get(element) : undefined;
      if (!element || !group || element.position[1] === null) return;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -element.position[1]);
      const point = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (!point) return;
      drag = {
        element,
        group,
        plane,
        offsetX: point.x - group.position.x,
        offsetZ: point.z - group.position.z,
        originalPosition: [group.position.x, element.position[1], -group.position.z],
        position: [group.position.x, element.position[1], -group.position.z],
      };
      controls.enabled = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      onSelect(element);
      event.preventDefault();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const point = raycaster.ray.intersectPlane(drag.plane, new THREE.Vector3());
      if (!point) return;
      const x = Math.round((point.x - drag.offsetX) / 10) * 10;
      const worldZ = Math.round((point.z - drag.offsetZ) / 10) * 10;
      drag.group.position.x = x;
      drag.group.position.z = worldZ;
      drag.position = [x, drag.position[1], -worldZ];
      event.preventDefault();
    };
    const onPointerUp = (event: PointerEvent) => {
      if (drag) {
        const completed = drag;
        drag = null;
        controls.enabled = true;
        handledPointerClick = true;
        if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
        if (completed.position.some((value, index) => value !== completed.originalPosition[index])) onMove(completed.element, completed.position);
        downPoint = null;
        event.preventDefault();
        return;
      }
      if (!downPoint || Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y) > 5) return;
      handledPointerClick = true;
      pickAt(event.clientX, event.clientY);
    };
    const onClick = (event: MouseEvent) => {
      if (handledPointerClick) {
        handledPointerClick = false;
        return;
      }
      pickAt(event.clientX, event.clientY);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown, { capture: true });
    renderer.domElement.addEventListener("pointermove", onPointerMove, { capture: true });
    renderer.domElement.addEventListener("pointerup", onPointerUp, { capture: true });
    renderer.domElement.addEventListener("click", onClick);

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    let frame = 0;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, { capture: true });
      renderer.domElement.removeEventListener("pointermove", onPointerMove, { capture: true });
      renderer.domElement.removeEventListener("pointerup", onPointerUp, { capture: true });
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      visualRefs.current.clear();
    };
  }, [elements, room, onSelect, onSelectBoard, onMove, showEnvelopes, showHoles, moveMode, viewRevision, cameraView]);

  const chooseView = (view: "home" | "front" | "side" | "top") => {
    setCameraView(view);
    setViewRevision((value) => value + 1);
  };

  return (
    <div className="three-view">
      <div className="drawing-toolbar three-toolbar">
        <div>
          <p className="eyebrow">3D rekonstrukcija</p>
          <h2>Prostor elemenata</h2>
          <span>{moveMode ? "Režim pomjeranja: povuci korijenski element · mreža 10 mm" : "Lijevi klik: izbor · povlačenje: rotacija · točkić: zum"}</span>
        </div>
        <div className="three-controls">
          <button aria-pressed={moveMode} onClick={() => setMoveMode((value) => !value)}>Premjesti</button>
          <button aria-pressed={showEnvelopes} onClick={() => setShowEnvelopes((value) => !value)}>Omotači</button>
          <button aria-pressed={showHoles} onClick={() => setShowHoles((value) => !value)}>Bušenja</button>
          <button aria-pressed={cameraView === "front"} onClick={() => chooseView("front")}>Prednji</button>
          <button aria-pressed={cameraView === "side"} onClick={() => chooseView("side")}>Bočni</button>
          <button aria-pressed={cameraView === "top"} onClick={() => chooseView("top")}>Gornji</button>
          <button onClick={() => chooseView("home")}>Početni</button>
          <div className="three-axis"><span className="axis-x">X</span><span className="axis-y">Y</span><span className="axis-z">Z</span></div>
        </div>
      </div>
      <div className="three-canvas" ref={containerRef} />
      <div className="drawing-selection">
        {selected ? selected.visible === false
          ? <><strong>{selected.name || "Neimenovan element"}</strong><span>Element je sakriven i nije prikazan u 3D prostoru.</span><button onClick={onOpenData}>Uredi element →</button></>
          : <><strong>{selectedBoardIndex !== null ? selected.boards[selectedBoardIndex]?.name || `Ploča ${selectedBoardIndex + 1}` : selected.name || "Neimenovan element"}</strong><span>{selectedBoardIndex !== null ? `${selected.name} · ${formatBoardDimensions(selected.boards[selectedBoardIndex])}` : `${selected.code || selected.className} · ${formatDimensions(selected)}`}</span><button onClick={onOpenData}>{selectedBoardIndex !== null ? "Uredi ploču →" : "Otvori podatke →"}</button></>
          : <span>Izaberi element u 3D prikazu.</span>}
      </div>
      <p className="drawing-note"><strong>Status rekonstrukcije:</strong> Prikazane su ploče prema lokalnim koordinatama, smjeru i konturi iz S3D-a. RPL=0/1 bušenja na suprotnim glavnim plohama stvarne su šupljine; tamni cilindri ostaju za rijetki RPL=2 i ostale nedokazane ravni. Stil 2 koristi radijus luka, a stil 1 glatku interpolaciju.</p>
    </div>
  );
}

function createBoardMesh(
  board: CorpusS3dBoard,
  element: CorpusS3dElement,
  elementIndex: number,
  boardIndex: number,
  selected: boolean,
  showHoles: boolean,
): { mesh: THREE.Mesh; edges: THREE.LineSegments; pickMesh: THREE.Mesh; material: THREE.MeshStandardMaterial; baseColor: THREE.ColorRepresentation } | null {
  if (board.visible === false) return null;
  const [x, y, z] = board.position;
  const height = board.height;
  const width = board.width;
  const thickness = board.thickness;
  if ([x, y, z, height, width, thickness].some((value) => value === null)) return null;
  if (height! <= 0 || width! <= 0 || thickness! <= 0) return null;

  const [sizeX, sizeY, sizeZ] = corpusBoardDimensions(board.direction, height!, width!, thickness!);
  const geometry = createBoardGeometry(board, sizeX, sizeY, sizeZ, thickness!, showHoles);
  const baseColor = colorForBoard(board, element, elementIndex, boardIndex);
  const material = new THREE.MeshStandardMaterial({
    color: selected ? 0xd8ff42 : baseColor,
    emissive: selected ? 0x293300 : 0x000000,
    roughness: 0.72,
    metalness: 0.015,
    side: THREE.DoubleSide,
    transparent: board.transparent === true,
    opacity: board.transparent === true ? 0.42 : 1,
    depthWrite: board.transparent !== true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x! + sizeX / 2, y! + sizeY / 2, -z! + sizeZ / 2);
  mesh.rotation.set(
    THREE.MathUtils.degToRad(board.xAngle ?? 0),
    -THREE.MathUtils.degToRad(board.angle ?? 0),
    THREE.MathUtils.degToRad(board.zAngle ?? 0),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.element = element;
  mesh.userData.board = board;
  mesh.userData.boardIndex = boardIndex;
  if (showHoles) addHoleMarkers(mesh, board, sizeX, sizeY, sizeZ, height!, width!, thickness!);

  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x4d554d, transparent: true, opacity: 0.52 });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 22), edgeMaterial);
  edges.position.copy(mesh.position);
  edges.rotation.copy(mesh.rotation);
  const pickMesh = new THREE.Mesh(
    new THREE.BoxGeometry(sizeX, sizeY, sizeZ),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
  );
  pickMesh.position.copy(mesh.position);
  pickMesh.rotation.copy(mesh.rotation);
  pickMesh.userData.element = element;
  pickMesh.userData.boardIndex = boardIndex;
  return { mesh, edges, pickMesh, material, baseColor };
}

function createBoardGeometry(
  board: CorpusS3dBoard,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  thickness: number,
  showHoles: boolean,
): THREE.BufferGeometry {
  const sourcePoints = board.curvePoints.filter((point, index, all) =>
    index === 0 || point.x !== all[index - 1]?.x || point.z !== all[index - 1]?.z,
  );
  const points = expandCorpusCurve(sourcePoints);
  if (points.length < 3) return new THREE.BoxGeometry(sizeX, sizeY, sizeZ);

  const contour = points.map((point) => new THREE.Vector2(point.x, point.z));
  const physicalHoles = showHoles ? resolveCorpusMainFaceHoles(board) : [];
  const holeContours = physicalHoles.map(({ u, v, radius }) => {
    const circle = Array.from({ length: 20 }, (_, index) => {
      const angle = -index / 20 * Math.PI * 2;
      return new THREE.Vector2(u + Math.cos(angle) * radius, v + Math.sin(angle) * radius);
    });
    return circle;
  });
  const bottomHoleContours = physicalHoles.filter(({ kind, side }) => kind === "through" || side === "min").map((hole) => holeContours[physicalHoles.indexOf(hole)]!);
  const topHoleContours = physicalHoles.filter(({ kind, side }) => kind === "through" || side === "max").map((hole) => holeContours[physicalHoles.indexOf(hole)]!);
  const bottomTriangles = THREE.ShapeUtils.triangulateShape(contour, bottomHoleContours);
  const topTriangles = THREE.ShapeUtils.triangulateShape(contour, topHoleContours);
  if (!bottomTriangles.length || !topTriangles.length) return new THREE.BoxGeometry(sizeX, sizeY, sizeZ);

  const vertices: number[] = [];
  const mapPoint = (u: number, v: number, layer: number): [number, number, number] => {
    if (board.direction === 0) return [layer, u, v];
    if (board.direction === 1) return [v, u, layer];
    return [u, layer, v];
  };
  const pushTriangle = (a: readonly number[], b: readonly number[], c: readonly number[]) => {
    vertices.push(a[0]!, a[1]!, a[2]!, b[0]!, b[1]!, b[2]!, c[0]!, c[1]!, c[2]!);
  };

  const addSurface = (triangles: number[][], holes: THREE.Vector2[][], layer: number, reverse: boolean) => {
    const facePoints = [...contour, ...holes.flat()].map((point) => ({ x: point.x, z: point.y }));
    for (const triangle of triangles) {
      const [a, b, c] = triangle.map((index) => facePoints[index]!) as [typeof facePoints[number], typeof facePoints[number], typeof facePoints[number]];
      if (reverse) pushTriangle(mapPoint(a.x, a.z, layer), mapPoint(c.x, c.z, layer), mapPoint(b.x, b.z, layer));
      else pushTriangle(mapPoint(a.x, a.z, layer), mapPoint(b.x, b.z, layer), mapPoint(c.x, c.z, layer));
    }
  };
  addSurface(bottomTriangles, bottomHoleContours, 0, true);
  addSurface(topTriangles, topHoleContours, thickness, false);
  for (let holeIndex = 0; holeIndex < physicalHoles.length; holeIndex += 1) {
    const hole = physicalHoles[holeIndex]!;
    if (hole.kind !== "blind") continue;
    const loop = holeContours[holeIndex]!;
    const center = { x: hole.u, z: hole.v };
    const bottomLayer = hole.side === "max" ? thickness - hole.depth : hole.depth;
    for (let index = 0; index < loop.length; index += 1) {
      const current = loop[index]!;
      const next = loop[(index + 1) % loop.length]!;
      if (hole.side === "max") pushTriangle(mapPoint(center.x, center.z, bottomLayer), mapPoint(next.x, next.y, bottomLayer), mapPoint(current.x, current.y, bottomLayer));
      else pushTriangle(mapPoint(center.x, center.z, bottomLayer), mapPoint(current.x, current.y, bottomLayer), mapPoint(next.x, next.y, bottomLayer));
    }
  }
  for (const loop of [contour]) {
    for (let index = 0; index < loop.length; index += 1) {
      const current = loop[index]!;
      const next = loop[(index + 1) % loop.length]!;
      const a = mapPoint(current.x, current.y, 0);
      const b = mapPoint(next.x, next.y, 0);
      const c = mapPoint(next.x, next.y, thickness);
      const d = mapPoint(current.x, current.y, thickness);
      pushTriangle(a, b, c);
      pushTriangle(a, c, d);
    }
  }
  for (let holeIndex = 0; holeIndex < physicalHoles.length; holeIndex += 1) {
    const hole = physicalHoles[holeIndex]!;
    const loop = holeContours[holeIndex]!;
    const startLayer = hole.kind === "through" || hole.side === "max" ? (hole.kind === "through" ? 0 : thickness - hole.depth) : 0;
    const endLayer = hole.kind === "through" || hole.side === "max" ? thickness : hole.depth;
    for (let index = 0; index < loop.length; index += 1) {
      const current = loop[index]!;
      const next = loop[(index + 1) % loop.length]!;
      const a = mapPoint(current.x, current.y, startLayer);
      const b = mapPoint(next.x, next.y, startLayer);
      const c = mapPoint(next.x, next.y, endLayer);
      const d = mapPoint(current.x, current.y, endLayer);
      pushTriangle(a, c, b);
      pushTriangle(a, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  geometry.translate(-sizeX / 2, -sizeY / 2, -sizeZ / 2);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function addHoleMarkers(
  mesh: THREE.Mesh,
  board: CorpusS3dBoard,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  height: number,
  width: number,
  thickness: number,
): void {
  const variables = { B: height, L: width, D: thickness };
  const physicalHoles = new Set(resolveCorpusMainFaceHoles(board).map(({ hole }) => hole));
  for (const hole of board.holes) {
    if (physicalHoles.has(hole)) continue;
    const u = evaluateCorpusFormula(hole.xExpression, variables);
    const v = evaluateCorpusFormula(hole.yExpression, variables);
    if (u === null || v === null) continue;
    const position = corpusHolePosition(board.direction, u, v, height, width, thickness);
    if (!position) continue;

    const radius = Math.max(1.5, (hole.diameter ?? 5) / 2);
    const pocketDepth = Math.max(0.8, Math.min(thickness, hole.depth ?? 1));
    const geometry = new THREE.CylinderGeometry(radius, radius, pocketDepth, 20);
    const material = new THREE.MeshStandardMaterial({ color: 0x252a27, roughness: 0.94, side: THREE.DoubleSide });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(position[0] - sizeX / 2, position[1] - sizeY / 2, position[2] - sizeZ / 2);
    if (board.direction === 0) {
      marker.position.x -= pocketDepth / 2;
      marker.rotation.z = Math.PI / 2;
    } else if (board.direction === 1) {
      marker.position.z -= pocketDepth / 2;
      marker.rotation.x = Math.PI / 2;
    } else {
      marker.position.y -= pocketDepth / 2;
    }
    marker.userData.hole = hole;
    mesh.add(marker);
  }
}

function colorForBoard(board: CorpusS3dBoard, element: CorpusS3dElement, elementIndex: number, boardIndex: number): THREE.ColorRepresentation {
  if (board.color !== null && board.color >= 0 && board.color <= 0xffffff) return board.color;
  const key = `${board.materialUid}:${board.materialName}:${board.name}:${element.name}:${elementIndex}:${boardIndex}`;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = ((hash << 5) - hash + key.charCodeAt(index)) | 0;
  const palette = [0xd8d1c1, 0xc3b9a7, 0xe0ddd3, 0xb8c2bb, 0xd2c4ad, 0xb8aca0, 0xc7c9bd];
  return palette[Math.abs(hash) % palette.length];
}

function formatDimensions(element: CorpusS3dElement): string {
  const value = (number: number | null) => number === null ? "—" : new Intl.NumberFormat("bs-BA", { maximumFractionDigits: 1 }).format(number);
  return `${value(element.width)} × ${value(element.height)} × ${value(element.depth)} mm`;
}

function formatBoardDimensions(board: CorpusS3dBoard | undefined): string {
  if (!board) return "—";
  const value = (number: number | null) => number === null ? "—" : new Intl.NumberFormat("bs-BA", { maximumFractionDigits: 1 }).format(number);
  return `${value(board.width)} × ${value(board.height)} × ${value(board.thickness)} mm`;
}
