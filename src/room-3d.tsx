import { corpusRoomCameraSessions, type CorpusCameraView } from "../lib/corpus-camera-session";
import { createCorpusDragMotion, resolveCorpusDragMotion, type CorpusDragMotion } from "../lib/corpus-drag-motion";
import { corpusDragBody, type DragBody, type DragContact } from "../lib/corpus-drag-snap";
import { corpusBoardRenderTransform } from "../lib/corpus-render-transform";
import { MaterialTexturesContext, type MaterialTextures } from "./material-textures";
import { useContext, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CorpusS3dBoard, CorpusS3dElement, CorpusS3dRoom } from "../lib/corpus-s3d";
import { corpusBoardDimensions, corpusHolePosition, corpusRoomTotalHeight, evaluateCorpusFormula, expandCorpusCurve } from "../lib/corpus-geometry";
import { resolveCorpusMainFaceHoles } from "../lib/corpus-hole-geometry";
import { corpusGroupBounds, corpusElementAllowsModeling } from "../lib/corpus-group";

type Room3DViewProps = {
  cameraScope: object;
  elements: readonly CorpusS3dElement[];
  room: CorpusS3dRoom;
  selected: CorpusS3dElement | null;
  selectedBoardIndex: number | null;
  boardGroupSelection: readonly number[];
  groupElements: readonly CorpusS3dElement[];
  outsideRoomElements: readonly CorpusS3dElement[];
  overlappingElements: readonly CorpusS3dElement[];
  materialTextures: ReadonlyMap<string, { file?: File; url?: string; name: string; textureSize: readonly [number | null, number | null, number | null] }>;
  onSelect(element: CorpusS3dElement): void;
  onClearSelection(): void;
  onToggleGroup(element: CorpusS3dElement): void;
  onMove(element: CorpusS3dElement, position: readonly [number, number, number]): void;
  onMoveGroup(delta: readonly [number, number, number]): boolean;
  onOpenData(): void;
};


export function Room3DView({ cameraScope, elements, room, selected, selectedBoardIndex, boardGroupSelection, groupElements, outsideRoomElements, overlappingElements, materialTextures, onSelect, onClearSelection, onToggleGroup, onMove, onMoveGroup, onOpenData }: Room3DViewProps) {
  const contactRef = useRef<{ name: string; position: number[]; contacts: DragContact[] } | null>(null);
  const contactGuideRef = useRef<THREE.LineSegments | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const appliedViewRevisionRef = useRef(-1);
  const lastElementClickRef = useRef<{ element: CorpusS3dElement; time: number } | null>(null);
  const [showEnvelopes, setShowEnvelopes] = useState(false);
  const [showHoles, setShowHoles] = useState(true);
  const [showProblems, setShowProblems] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapStep, setSnapStep] = useState<1 | 10 | 50>(10);
  const [viewRevision, setViewRevision] = useState(0);
  const [cameraView, setCameraView] = useState<CorpusCameraView>(() => corpusRoomCameraSessions.read(cameraScope)?.view ?? "home");
  const selectedRef = useRef(selected);
  const selectedBoardRef = useRef(selectedBoardIndex);
  const boardGroupSelectionRef = useRef(new Set(boardGroupSelection));
  const groupElementsRef = useRef(new Set(groupElements));
  const outsideRoomRef = useRef(new Set(outsideRoomElements));
  const overlappingRef = useRef(new Set(overlappingElements));
  const groupEnvelopeRef = useRef<THREE.LineSegments | null>(null);
  const orientationAxesRef = useRef<THREE.Group | null>(null);
  const visualRefs = useRef(new Map<CorpusS3dElement, {
    materials: Array<{ boardIndex: number; material: THREE.MeshStandardMaterial; baseColor: THREE.ColorRepresentation }>;
    envelope: THREE.LineSegments;
    group: THREE.Group;
  }>());
  selectedRef.current = selected;
  selectedBoardRef.current = selectedBoardIndex;
  boardGroupSelectionRef.current = new Set(boardGroupSelection);
  groupElementsRef.current = new Set(groupElements);
  outsideRoomRef.current = new Set(outsideRoomElements);
  overlappingRef.current = new Set(overlappingElements);

  useEffect(() => {
    for (const [element, visual] of visualRefs.current) {
      const isSelected = selected === element || (selectedBoardIndex === null && selected !== null && containsElement(selected, element));
      const isGrouped = groupElements.includes(element);
      const issueColor = showProblems ? problemColor(element, outsideRoomRef.current, overlappingRef.current) : null;
      for (const { boardIndex, material, baseColor } of visual.materials) {
        const isBoardGrouped = isSelected && boardGroupSelection.includes(boardIndex);
        material.color.set(isBoardGrouped ? 0x55bdf2 : isGrouped ? 0xffc857 : baseColor);
        material.emissive.set(isBoardGrouped ? 0x002638 : isGrouped ? 0x332100 : 0x000000);
      }
      const envelopeMaterial = visual.envelope.material as THREE.LineBasicMaterial;
      envelopeMaterial.color.set(issueColor ?? (isGrouped ? 0xa76000 : 0x667066));
      envelopeMaterial.opacity = issueColor !== null || isGrouped ? 1 : 0.18;
      visual.envelope.visible = showEnvelopes || issueColor !== null;
    }
    const savedContact = contactRef.current;
    if (savedContact && (!selected || selected.name !== savedContact.name || selected.position.some((v, i) => v === null || Math.abs(v - savedContact.position[i]!) > 0.001))) {
      contactRef.current = null;
      if (contactGuideRef.current) contactGuideRef.current.visible = false;
    }
    const axes = orientationAxesRef.current;
    if (axes) {
      const group = selected ? visualRefs.current.get(selected)?.group : null;
      axes.visible = Boolean(group);
      if (group) { group.add(axes); axes.position.set(0, 0, 0); }
    }
  }, [selected, selectedBoardIndex, boardGroupSelection, groupElements, outsideRoomElements, overlappingElements, showEnvelopes, showProblems]);

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
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = 350;
    controls.maxDistance = 22000;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x9ca597, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 1.65);
    sun.position.set(3500, 6500, 4500);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.normalBias = 0.5;
    sun.shadow.bias = -0.0001;
    scene.add(sun);

    const roomWidth = Math.max(1000, (room.width ?? 5) * 1000);
    const roomLength = Math.max(1000, (room.length ?? 5) * 1000);
    const roomHeight = Math.max(1000, (corpusRoomTotalHeight(room.height, room.lowerHeight) ?? 2.6) * 1000);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(roomLength, roomWidth),
      new THREE.MeshStandardMaterial({ color: 0xe9ece6, roughness: 1, metalness: 0 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(-roomLength / 2, -4, -roomWidth / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    const gridSize = Math.max(roomWidth, roomLength);
    const grid = new THREE.GridHelper(gridSize, Math.max(10, Math.round(gridSize / 250)), 0x858d82, 0xcbd0c8);
    grid.position.set(-roomLength / 2, 0, -roomWidth / 2);
    grid.visible = showGrid;
    scene.add(grid);

    const orientationAxes = createElementAxes(Math.max(260, Math.min(520, gridSize * 0.09)));
    orientationAxes.visible = false;
    scene.add(orientationAxes);
    orientationAxesRef.current = orientationAxes;

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf8faf6, roughness: 1, side: THREE.FrontSide });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomLength, roomHeight), wallMaterial);
    backWall.rotation.y = Math.PI;
    backWall.position.set(-roomLength / 2, roomHeight / 2, 4);
    scene.add(backWall);
    const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), wallMaterial.clone());
    sideWall.rotation.y = -Math.PI / 2;
    sideWall.position.set(-4, roomHeight / 2, -roomWidth / 2);
    scene.add(sideWall);

    const root = new THREE.Group();
    root.scale.x = -1;
    scene.add(root);
    const contactGuide = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x00c8f0, depthTest: false, depthWrite: false }));
    contactGuide.renderOrder = 35;
    root.add(contactGuide);
    contactGuideRef.current = contactGuide;
    const drawContacts = (contacts: readonly DragContact[]) => {
      const vertices: number[] = [];
      for (const c of contacts) {
        const corner = (along: number, y: number) => c.axis === "x" ? [c.coordinate, y, -along] : c.axis === "y" ? [along, c.coordinate, -y] : [along, y, -c.coordinate];
        const points = [corner(c.from,c.bottom),corner(c.to,c.bottom),corner(c.to,c.top),corner(c.from,c.top)];
        for (let i=0;i<4;i++) vertices.push(...points[i]!,...points[(i+1)%4]!);
      }
      contactGuide.geometry.dispose();
      contactGuide.geometry = new THREE.BufferGeometry();
      contactGuide.geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
      contactGuide.visible = vertices.length > 0;
    };
    drawContacts(contactRef.current?.contacts ?? []);
    const groupEnvelope = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: 0xe07a00, transparent: true, opacity: 0.9, depthTest: false }),
    );
    groupEnvelope.visible = false;
    groupEnvelope.renderOrder = 20;
    scene.add(groupEnvelope);
    groupEnvelopeRef.current = groupEnvelope;
    const pickable: THREE.Mesh[] = [];
    const rootElements = new Set(elements);
    const elementGroups = new Map<CorpusS3dElement, THREE.Group>();
    const selectionRoots = new Map<CorpusS3dElement, CorpusS3dElement>();
    visualRefs.current.clear();
    const { textureForBoard, dispose: disposeTextures } = createMaterialTextures(materialTextures, renderer.capabilities.getMaxAnisotropy());

    let elementIndex = 0;
    const addElement = (parent: THREE.Group, element: CorpusS3dElement, root: CorpusS3dElement = element) => {
      selectionRoots.set(element, root);
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
        -THREE.MathUtils.degToRad(element.xAngle ?? 0),
        -THREE.MathUtils.degToRad(element.angle ?? 0),
        THREE.MathUtils.degToRad(element.zAngle ?? 0),
      );
      parent.add(group);
      if (rootElements.has(element)) elementGroups.set(element, group);

      const isSelected = selectedRef.current === element || (selectedBoardRef.current === null && selectedRef.current !== null && containsElement(selectedRef.current, element));
      const isGrouped = groupElementsRef.current.has(element);
      const issueColor = showProblems ? problemColor(element, outsideRoomRef.current, overlappingRef.current) : null;
      const envelopeGeometry = new THREE.BoxGeometry(width, height, depth);
      const pickMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const pickMesh = new THREE.Mesh(envelopeGeometry, pickMaterial);
      pickMesh.position.set(width / 2, height / 2, depth / 2);
      pickMesh.userData.element = element;
      group.add(pickMesh);
      pickable.push(pickMesh);

      const envelopeMaterial = new THREE.LineBasicMaterial({
        color: issueColor ?? (isGrouped ? 0xa76000 : 0x667066),
        transparent: true,
        opacity: issueColor !== null || isGrouped ? 1 : 0.18,
      });
      const envelope = new THREE.LineSegments(new THREE.EdgesGeometry(envelopeGeometry), envelopeMaterial);
      envelope.position.copy(pickMesh.position);
      envelope.visible = showEnvelopes || issueColor !== null;
      group.add(envelope);

      const materials: Array<{ boardIndex: number; material: THREE.MeshStandardMaterial; baseColor: THREE.ColorRepresentation }> = [];
      for (const [boardIndex, board] of element.boards.entries()) {
        const boardSelected = isSelected && (selectedBoardRef.current === null || selectedBoardRef.current === boardIndex);
        const boardGrouped = isSelected && boardGroupSelectionRef.current.has(boardIndex);
        const boardMesh = createBoardMesh(board, element, elementIndex, boardIndex, boardSelected, boardGrouped, isGrouped, showHoles, textureForBoard(board));
        if (!boardMesh) continue;
        group.add(boardMesh.mesh, boardMesh.edges, boardMesh.pickMesh);
        pickable.push(boardMesh.pickMesh);
        materials.push({ boardIndex, material: boardMesh.material, baseColor: boardMesh.baseColor });
      }
      visualRefs.current.set(element, { materials, envelope, group });
      elementIndex += 1;

      for (const child of element.children) addElement(group, child, root);
    };
    for (const element of elements) {
      addElement(root, element);
    }

    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    root.traverse(object => {
      if (object instanceof THREE.Mesh && object.userData.board) bounds.union(new THREE.Box3().setFromObject(object));
    });
    let center: THREE.Vector3;
    let span: number;
    const focusElements = groupElementsRef.current.size >= 2 ? [...groupElementsRef.current] : selectedRef.current ? [selectedRef.current] : [];
    const focusIndexes = focusElements.map((element) => elements.indexOf(element)).filter((index) => index >= 0);
    const focusBounds = cameraView === "selection" ? corpusGroupBounds(elements, focusIndexes) : null;
    if (focusBounds) {
      center = new THREE.Vector3(
        -(focusBounds.minX + focusBounds.maxX) / 2,
        (focusBounds.minY + focusBounds.maxY) / 2,
        -(focusBounds.minZ + focusBounds.maxZ) / 2,
      );
      span = Math.max(focusBounds.width, focusBounds.height, focusBounds.depth, 450);
    } else if (!bounds.isEmpty()) {
      center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      span = Math.max(size.x, size.y, size.z, 1800);
    } else {
      center = new THREE.Vector3(-roomLength / 2, roomHeight / 3, -roomWidth / 3);
      span = Math.max(roomWidth, roomLength, roomHeight, 1800);
    }
    controls.target.copy(center);
    camera.up.set(0, 1, 0);
    if (cameraView === "front") camera.position.set(center.x, center.y, center.z - span * 1.8);
    else if (cameraView === "side") camera.position.set(center.x - span * 1.8, center.y, center.z);
    else if (cameraView === "top") {
      camera.up.set(0, 0, -1);
      camera.position.set(center.x, center.y + span * 1.8, center.z);
    } else if (cameraView === "selection") camera.position.set(center.x - span * 1.05, center.y + span * 0.72, center.z - span * 1.25);
    else camera.position.set(center.x - span * 1.05, center.y + span * 0.72, center.z - span * 1.25);
    const retainedRoomCamera = corpusRoomCameraSessions.read(cameraScope);
    if (retainedRoomCamera && (appliedViewRevisionRef.current === viewRevision || appliedViewRevisionRef.current === -1)) {
      camera.position.fromArray(retainedRoomCamera.position);
      controls.target.fromArray(retainedRoomCamera.target);
      camera.up.fromArray(retainedRoomCamera.up);
    }
    appliedViewRevisionRef.current = viewRevision;
    camera.near = Math.max(20, span / 500);
    camera.far = Math.max(40000, span * 10);
    camera.updateProjectionMatrix();
    controls.update();

    const selectedGroup = selectedRef.current ? visualRefs.current.get(selectedRef.current)?.group : null;
    if (selectedGroup) { selectedGroup.add(orientationAxes); orientationAxes.visible = true; }
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPoint: { x: number; y: number } | null = null;
    let handledPointerClick = false;
    let drag: { pointerId: number; motion: CorpusDragMotion; axis: null | { direction: [number,number,number]; screen: THREE.Vector2; pixels: number }; start: THREE.Vector2; obstacles: DragBody[]; moved: boolean; element: CorpusS3dElement; group: THREE.Group; plane: THREE.Plane; offsetX: number; offsetZ: number; originalPosition: [number, number, number]; position: [number, number, number]; grouped: Array<{ group: THREE.Group; x: number; y: number; z: number }> } | null = null;
    const hitAt = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickable, false);
      const hit = hits.find((entry) => entry.object.userData.boardIndex !== undefined) ?? hits[0];
      if (hit) hit.object.userData.element = selectionRoots.get(hit.object.userData.element) ?? hit.object.userData.element;
      return hit;
    };
    const pickAt = (clientX: number, clientY: number, toggleGroup = false) => {
      const hit = hitAt(clientX, clientY);
      const element = hit?.object.userData.element as CorpusS3dElement | undefined;
      if (element && toggleGroup && rootElements.has(element)) onToggleGroup(element);
      else if (element) onSelect(element);
      else onClearSelection();
    };
    const axisHitAt = (clientX: number, clientY: number): "X" | "Y" | "Z" | null => {
      if (!selectedRef.current || !corpusElementAllowsModeling(selectedRef.current) || !orientationAxes.visible) return null;
      const rect=renderer.domElement.getBoundingClientRect();
      pointer.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);
      raycaster.setFromCamera(pointer,camera);
      return raycaster.intersectObject(orientationAxes,true).find(hit=>hit.object.userData.axis)?.object.userData.axis ?? null;
    };
    const onPointerDown = (event: PointerEvent) => {
      downPoint = event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const axisName = axisHitAt(event.clientX,event.clientY);
      const hit = axisName ? null : hitAt(event.clientX, event.clientY);
      const element = axisName ? selectedRef.current : hit?.object.userData.element as CorpusS3dElement | undefined;
      const group = element ? elementGroups.get(element) : undefined;
      if (!element || element !== selectedRef.current || !corpusElementAllowsModeling(element) || !group || element.position[1] === null) return;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -element.position[1]);
      const worldPoint = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      const point = worldPoint ? root.worldToLocal(worldPoint) : null;
      if (!point && !axisName) return;
      let axis: null | {direction:[number,number,number];screen:THREE.Vector2;pixels:number} = null;
      if (axisName) {
        orientationAxes.updateWorldMatrix(true,true);
        const origin=orientationAxes.localToWorld(new THREE.Vector3());
        const unit=axisName === "X" ? new THREE.Vector3(1,0,0) : axisName === "Y" ? new THREE.Vector3(0,1,0) : new THREE.Vector3(0,0,-1);
        const end=orientationAxes.localToWorld(unit.clone());
        const d=end.clone().sub(origin).normalize();
        const canonical=root.worldToLocal(end.clone()).sub(root.worldToLocal(origin.clone())).normalize();
        canonical.z *= -1;
        const rect=renderer.domElement.getBoundingClientRect();
        const p0=origin.clone().project(camera),p1=origin.clone().addScaledVector(d,100).project(camera);
        const screen=new THREE.Vector2((p1.x-p0.x)*rect.width/2,-(p1.y-p0.y)*rect.height/2);
        if(screen.length()<2) screen.set(0,-100*rect.height/(2*Math.tan(camera.fov*Math.PI/360)*camera.position.distanceTo(origin)));
        axis={direction:canonical.toArray() as [number,number,number],screen:screen.clone().normalize(),pixels:screen.length()/100};
      }
      const movingElements = groupElementsRef.current.has(element) && groupElementsRef.current.size >= 2 ? [...groupElementsRef.current] : [element];
      if (!movingElements.every(corpusElementAllowsModeling)) return;
      const bodies = elements.map(corpusDragBody).filter((body): body is DragBody => body !== null);
      drag = {
        pointerId: event.pointerId,
        motion: createCorpusDragMotion(bodies.filter(body => movingElements.includes(body.element)),event.altKey),
        axis, start: new THREE.Vector2(event.clientX,event.clientY),
        obstacles: bodies.filter(body => !movingElements.includes(body.element)),
        moved: false,
        element,
        group,
        plane,
        offsetX: (point?.x ?? group.position.x) - group.position.x,
        offsetZ: (point?.z ?? group.position.z) - group.position.z,
        originalPosition: [group.position.x, element.position[1], -group.position.z],
        position: [group.position.x, element.position[1], -group.position.z],
        grouped: groupElementsRef.current.has(element) && groupElementsRef.current.size >= 2
          ? [...groupElementsRef.current].map((item) => elementGroups.get(item)).filter((item): item is THREE.Group => Boolean(item)).map((item) => ({ group: item, x: item.position.x, y: item.position.y, z: item.position.z }))
          : [],
      };
      controls.enabled = false;
      renderer.domElement.style.cursor = "default";
      renderer.domElement.setPointerCapture(event.pointerId);
      event.preventDefault();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag || !downPoint) {
        renderer.domElement.style.cursor = axisHitAt(event.clientX,event.clientY) ? "move" : "default";
        return;
      }
      if (!drag.moved && Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y) <= 5) return;
      drag.moved = true;
      lastElementClickRef.current = null;
      if (drag.axis) {
        const a=drag.axis;
        const raw=new THREE.Vector2(event.clientX,event.clientY).sub(drag.start).dot(a.screen)/a.pixels;
        const result=resolveCorpusDragMotion(drag.motion,a.direction.map(v=>v*raw) as [number,number,number],{bypass:event.altKey,origin:drag.originalPosition,obstacles:drag.obstacles,room:[roomLength,roomHeight,roomWidth],step:snapStep,axis:a.direction});
        drag.motion=result.state;
        const delta=result.delta;
        drag.position=drag.originalPosition.map((v,i)=>v+delta[i]!) as [number,number,number];
        drag.group.position.set(drag.position[0],drag.position[1],-drag.position[2]);
        for(const item of drag.grouped){item.group.position.set(item.x+delta[0]!,item.y+delta[1]!,item.z-delta[2]!);}
        drawContacts(result.contacts);
        contactRef.current={name:drag.element.name,position:[...drag.position],contacts:result.contacts};
        event.preventDefault();
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const worldPoint = raycaster.ray.intersectPlane(drag.plane, new THREE.Vector3());
      const point = worldPoint ? root.worldToLocal(worldPoint) : null;
      if (!point) return;
      const rawX=point.x-drag.offsetX,rawZ=-(point.z-drag.offsetZ);
      const result=resolveCorpusDragMotion(drag.motion,[rawX-drag.originalPosition[0],0,rawZ-drag.originalPosition[2]],{bypass:event.altKey,origin:drag.originalPosition,obstacles:drag.obstacles,room:[roomLength,roomHeight,roomWidth],step:snapStep});
      drag.motion=result.state;
      const [dx,,dz]=result.delta;
      const x=drag.originalPosition[0]+dx,z=drag.originalPosition[2]+dz;
      drag.group.position.x = x;
      drag.group.position.z = -z;
      for (const item of drag.grouped) {
        item.group.position.x = item.x + dx;
        item.group.position.z = item.z - dz;
      }
      drag.position = [x, drag.position[1], z];
      drawContacts(result.contacts);
      contactRef.current = {name:drag.element.name,position:[...drag.position],contacts:result.contacts};
      event.preventDefault();
    };
    const onPointerUp = (event: PointerEvent) => {
      if (drag) {
        const completed = drag;
        drag = null;
        controls.enabled = true;
        renderer.domElement.style.cursor = "default";
        handledPointerClick = true;
        if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
        if (completed.position.some((value, index) => value !== completed.originalPosition[index])) {
          if (completed.grouped.length) onMoveGroup([completed.position[0] - completed.originalPosition[0], completed.position[1] - completed.originalPosition[1], completed.position[2] - completed.originalPosition[2]]);
          else onMove(completed.element, completed.position);
        }
        if (completed.moved || completed.axis) {
          downPoint = null;
          event.preventDefault();
          return;
        }
        // A second stationary click is still a click (including double-click).
        handledPointerClick = false;
      }
      if (!downPoint) return;
      if (Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y) > 5) {
        downPoint = null;
        handledPointerClick = true;
        lastElementClickRef.current = null;
        return;
      }
      handledPointerClick = true;
      const hit = hitAt(event.clientX, event.clientY);
      const clickedElement = hit?.object.userData.element as CorpusS3dElement | undefined;
      pickAt(event.clientX, event.clientY, event.ctrlKey || event.metaKey || event.shiftKey);
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        lastElementClickRef.current = null;
        return;
      }
      const now = performance.now();
      const previousClick = lastElementClickRef.current;
      if (clickedElement && previousClick?.element === clickedElement && now - previousClick.time <= 450) {
        lastElementClickRef.current = null;
        onOpenData();
      } else {
        lastElementClickRef.current = clickedElement ? { element: clickedElement, time: now } : null;
      }
    };
    const onClick = (event: MouseEvent) => {
      if (handledPointerClick) {
        handledPointerClick = false;
        return;
      }
      pickAt(event.clientX, event.clientY, event.ctrlKey || event.metaKey || event.shiftKey);
    };
    const cancelDrag = () => {
      if (!drag) return;
      const cancelled=drag;
      // Clear the active gesture before releasePointerCapture triggers any lost-capture event.
      drag=null;
      cancelled.group.position.set(cancelled.originalPosition[0],cancelled.originalPosition[1],-cancelled.originalPosition[2]);
      for(const item of cancelled.grouped) item.group.position.set(item.x,item.y,item.z);
      contactRef.current=null; drawContacts([]);
      downPoint=null; handledPointerClick=true; lastElementClickRef.current=null;
      controls.enabled=true;
      renderer.domElement.style.cursor="default";
      if(renderer.domElement.hasPointerCapture(cancelled.pointerId)) renderer.domElement.releasePointerCapture(cancelled.pointerId);
    };
    const onPointerCancel = () => cancelDrag();
    const onDragKeyDown = (event: KeyboardEvent) => {
      if(event.key !== "Escape" || !drag) return;
      event.preventDefault(); event.stopImmediatePropagation(); cancelDrag();
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown, { capture: true });
    renderer.domElement.addEventListener("pointermove", onPointerMove, { capture: true });
    renderer.domElement.addEventListener("pointerup", onPointerUp, { capture: true });
    renderer.domElement.addEventListener("pointercancel", onPointerCancel, { capture: true });
    renderer.domElement.addEventListener("lostpointercapture", onPointerCancel);
    window.addEventListener("blur",cancelDrag);
    window.addEventListener("keydown",onDragKeyDown,true);
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
      corpusRoomCameraSessions.write(cameraScope, { position: camera.position.toArray(), target: controls.target.toArray(), up: camera.up.toArray(), view: cameraView });
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, { capture: true });
      renderer.domElement.removeEventListener("pointermove", onPointerMove, { capture: true });
      renderer.domElement.removeEventListener("pointerup", onPointerUp, { capture: true });
      renderer.domElement.removeEventListener("pointercancel", onPointerCancel, { capture: true });
      renderer.domElement.removeEventListener("lostpointercapture",onPointerCancel);
      window.removeEventListener("blur",cancelDrag);
      window.removeEventListener("keydown",onDragKeyDown,true);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
          if (!(object instanceof THREE.Sprite)) object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            if (material instanceof THREE.SpriteMaterial) material.map?.dispose();
            material.dispose();
          }
        }
      });
      disposeTextures();
      renderer.dispose();
      renderer.domElement.remove();
      visualRefs.current.clear();
      if (groupEnvelopeRef.current === groupEnvelope) groupEnvelopeRef.current = null;
      if (orientationAxesRef.current === orientationAxes) orientationAxesRef.current = null;
    };
  }, [cameraScope, elements, room, materialTextures, onSelect, onClearSelection, onToggleGroup, onMove, onMoveGroup, onOpenData, showEnvelopes, showHoles, showProblems, showGrid, snapStep, viewRevision, cameraView]);

  useEffect(() => {
    const envelope = groupEnvelopeRef.current;
    if (!envelope) return;
    const indexes = groupElements.map((element) => elements.indexOf(element)).filter((index) => index >= 0);
    const bounds = groupElements.length >= 2 ? corpusGroupBounds(elements, indexes) : null;
    envelope.visible = showEnvelopes && bounds !== null;
    if (!bounds) return;
    envelope.geometry.dispose();
    envelope.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(bounds.width + 8, bounds.height + 8, bounds.depth + 8));
    envelope.position.set(-(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2, -(bounds.minZ + bounds.maxZ) / 2);
  }, [elements, groupElements, showEnvelopes]);

  const chooseView = (view: "home" | "front" | "side" | "top" | "selection") => {
    setCameraView(view);
    setViewRevision((value) => value + 1);
  };

  return (
    <div className="three-view">
      <div className="drawing-toolbar three-toolbar">
        <div>
          <p className="eyebrow">3D rekonstrukcija</p>
          <h2>Prostor elemenata</h2>
          <span>Klik bira · povlačenje izabranog pomjera element · povlačenje mimo izbora okreće kameru · Alt za slobodan prolaz · dvoklik uređuje</span>
        </div>
        <div className="three-controls">
          <button aria-pressed={cameraView === "front"} onClick={() => chooseView("front")}>Prednji</button>
          <button aria-pressed={cameraView === "side"} onClick={() => chooseView("side")}>Bočni</button>
          <button aria-pressed={cameraView === "top"} onClick={() => chooseView("top")}>Gornji</button>
          <button aria-pressed={cameraView === "selection"} disabled={!selected && groupElements.length < 2} onClick={() => chooseView("selection")}>Fokus na izbor</button>
          <button onClick={() => chooseView("home")}>Početni</button>
          <label className="canvas-snap">Snap<select value={snapStep} onChange={(event) => setSnapStep(Number(event.target.value) as 1 | 10 | 50)}><option value="1">1 mm</option><option value="10">10 mm</option><option value="50">50 mm</option></select></label>
          <details className="canvas-options">
            <summary>Prikaz</summary>
            <div>
              <button aria-pressed={showEnvelopes} onClick={() => setShowEnvelopes((value) => !value)}>Omotači</button>
              <button aria-pressed={showGrid} onClick={() => setShowGrid((value) => !value)}>Mreža</button>
              <button aria-pressed={showHoles} onClick={() => setShowHoles((value) => !value)}>Bušenja</button>
              <button aria-pressed={showProblems} disabled={!outsideRoomElements.length && !overlappingElements.length} onClick={() => setShowProblems((value) => !value)}>Problemi ({new Set([...outsideRoomElements, ...overlappingElements]).size})</button>
            </div>
          </details>
          <div className="three-axis"><span className="axis-x">X</span><span className="axis-y">Y</span><span className="axis-z">Z</span></div>
        </div>
      </div>
      <div className="three-canvas" ref={containerRef} />
      {showProblems && (outsideRoomElements.length > 0 || overlappingElements.length > 0) && <div className="three-problem-legend" aria-label="Legenda problema rasporeda"><span><i className="outside" /> Izvan prostorije: {outsideRoomElements.length}</span><span><i className="overlap" /> Preklapanje: {overlappingElements.length}</span></div>}
      <div className="drawing-selection">
        {selected ? selected.visible === false
          ? <><strong>{selected.name || "Neimenovan element"}</strong><span>Element je sakriven i nije prikazan u 3D prostoru.</span><button onClick={onOpenData}>Uredi element →</button></>
          : <><strong>{selected.name || "Neimenovan element"}</strong><span>{selected.code || selected.className} · {formatDimensions(selected)} · Ose počinju u 0 elementa (X=0, Y=0, Z=0)</span><button onClick={onOpenData}>Uredi element →</button></>
          : <span>Izaberi element u 3D prikazu.</span>}
      </div>
      <p className="drawing-note"><strong>Status rekonstrukcije:</strong> Prikazane su ploče prema lokalnim koordinatama, smjeru i konturi iz S3D-a. Tekstura se koristi samo kada lokalni katalog ima jedan tačan MATUID i postojeću sliku; Corpus TEXX/TEXY/TEXZ skala i orijentacija još se ne nagađaju. RPL=0/1 bušenja na suprotnim glavnim plohama stvarne su šupljine; tamni cilindri ostaju za rijetki RPL=2 i ostale nedokazane ravni.</p>
    </div>
  );
}

export function Element3DPreview({ element, selectedBoardIndex, onSelectBoard, view = "perspective", viewRevision = 0, hiddenBoardIndexes = [], wireframe = false }: { element: CorpusS3dElement; selectedBoardIndex: number | null; onSelectBoard(boardIndex: number | null): void; view?: "perspective" | "front" | "side" | "top"; viewRevision?: number; hiddenBoardIndexes?: readonly number[]; wireframe?: boolean }) {
  const materialTextures = useContext(MaterialTexturesContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const boardMaterialsRef = useRef<Array<{ index: number; material: THREE.MeshStandardMaterial; baseColor: THREE.ColorRepresentation }>>([]);
  const axesRef = useRef<THREE.Group | null>(null);

  const selectionRef = useRef(selectedBoardIndex);
  selectionRef.current = selectedBoardIndex;
  const selectRef = useRef(onSelectBoard);
  selectRef.current = onSelectBoard;
  const cameraState = useRef<{ position: THREE.Vector3; target: THREE.Vector3; up: THREE.Vector3; revision: number; view: string } | null>(null);
  const hiddenKey = hiddenBoardIndexes.join(",");
  useEffect(() => {
    for (const entry of boardMaterialsRef.current) {
      entry.material.color.set(entry.baseColor);
      entry.material.emissive.set(0x000000);
    }
    const axes = axesRef.current;
    if (!axes) return;
    const board = selectedBoardIndex === null ? null : element.boards[selectedBoardIndex];
    const position = board?.position ?? [0, 0, 0];
    axes.position.set(position[0] ?? 0, position[1] ?? 0, -(position[2] ?? 0));
  }, [element, selectedBoardIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe7eff5);
    const camera = new THREE.PerspectiveCamera(36, 1, 2, 30000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 80;
    controls.maxDistance = 12000;
    controls.screenSpacePanning = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8d9688, 1.55));
    const light = new THREE.DirectionalLight(0xffffff, 1.7);
    light.position.set(1800, 2600, 2200);
    scene.add(light);

    const root = new THREE.Group();
    root.scale.x = -1;
    const pickable: THREE.Mesh[] = [];
    const { textureForBoard, dispose: disposeTextures } = createMaterialTextures(materialTextures, renderer.capabilities.getMaxAnisotropy());
    const materialEntries: Array<{ index: number; material: THREE.MeshStandardMaterial; baseColor: THREE.ColorRepresentation }> = [];
    element.boards.forEach((board, index) => {
      if (hiddenBoardIndexes.includes(index)) return;
      const visual = createBoardMesh(board, element, 0, index, false, false, false, true, textureForBoard(board));
      if (!visual) return;
      visual.material.wireframe = wireframe;
      visual.edges.visible = wireframe;

      root.add(visual.mesh, visual.edges, visual.pickMesh);
      pickable.push(visual.mesh);
      materialEntries.push({ index, material: visual.material, baseColor: visual.baseColor });
    });
    scene.add(root);
    boardMaterialsRef.current = materialEntries;
    const bounds = new THREE.Box3().setFromObject(root);
    const center = bounds.isEmpty() ? new THREE.Vector3() : bounds.getCenter(new THREE.Vector3());
    const size = bounds.isEmpty() ? new THREE.Vector3(600, 800, 600) : bounds.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z, 250);
    controls.target.copy(center);
    camera.position.set(center.x - span * 1.55, center.y + span * 1.05, center.z - span * 2.15);
    const retained = cameraState.current;
    if (retained && retained.revision === viewRevision && retained.view === view) {
      camera.position.copy(retained.position); camera.up.copy(retained.up); controls.target.copy(retained.target);
    } else if (view === "front") camera.position.set(center.x, center.y, center.z - span * 2.8);
    else if (view === "side") camera.position.set(center.x - span * 2.8, center.y, center.z);
    else if (view === "top") { camera.position.set(center.x, center.y + span * 2.8, center.z); camera.up.set(0, 0, 1); }
    camera.near = Math.max(5, span / 500);
    camera.far = Math.max(30000, span * 12);
    camera.updateProjectionMatrix();
    controls.update();

    const axes = createElementAxes(Math.max(80, Math.min(160, span * 0.18)));
    root.add(axes);
    axesRef.current = axes;
    const selected = selectionRef.current === null ? null : element.boards[selectionRef.current];
    const origin = selected?.position ?? [0, 0, 0];
    axes.position.set(origin[0] ?? 0, origin[1] ?? 0, -(origin[2] ?? 0));

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPoint: { x: number; y: number } | null = null;
    let pointerMoved = false;
    const onPointerDown = (event: PointerEvent) => { downPoint = { x: event.clientX, y: event.clientY }; pointerMoved = false; };
    const onPointerMove = (event: PointerEvent) => {
      if (downPoint && Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y) > 4) pointerMoved = true;
    };
    const onClick = (event: MouseEvent) => {
      downPoint = null;
      if (pointerMoved) { pointerMoved = false; return; }
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickable, false)[0];
      selectRef.current(hit ? Number(hit.object.userData.boardIndex) : null);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown, { capture: true });
    renderer.domElement.addEventListener("pointermove", onPointerMove, { capture: true });
    renderer.domElement.addEventListener("click", onClick, { capture: true });
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
    const render = () => { controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(render); };
    render();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, { capture: true });
      renderer.domElement.removeEventListener("pointermove", onPointerMove, { capture: true });
      renderer.domElement.removeEventListener("click", onClick, { capture: true });
      cameraState.current = { position: camera.position.clone(), target: controls.target.clone(), up: camera.up.clone(), revision: viewRevision, view };
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Sprite) { object.material.map?.dispose(); object.material.dispose(); }
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      disposeTextures();
      boardMaterialsRef.current = [];
      axesRef.current = null;
    };
  // The selection callback and selection itself do not rebuild the renderer.
  }, [element, view, viewRevision, hiddenKey, wireframe, materialTextures]);

  return <div className="element-preview-3d"><div ref={containerRef} /><span>Povuci za okretanje · klik bira ploču · točkić zumira</span></div>;
}

function problemColor(element: CorpusS3dElement, outsideRoom: ReadonlySet<CorpusS3dElement>, overlapping: ReadonlySet<CorpusS3dElement>): number | null {
  if (outsideRoom.has(element)) return 0xd43d32;
  if (overlapping.has(element)) return 0xb00060;
  return null;
}

function createBoardMesh(
  board: CorpusS3dBoard,
  element: CorpusS3dElement,
  elementIndex: number,
  boardIndex: number,
  selected: boolean,
  boardGrouped: boolean,
  grouped: boolean,
  showHoles: boolean,
  texture: THREE.Texture | null,
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
  if (board.direction === 1) geometry.scale(1, 1, -1);
  const baseColor = texture ? 0xffffff : colorForBoard(board, element, elementIndex, boardIndex);
  const material = new THREE.MeshStandardMaterial({
    color: boardGrouped ? 0x55bdf2 : grouped ? 0xffc857 : baseColor,
    emissive: boardGrouped ? 0x002638 : grouped ? 0x332100 : 0x000000,
    roughness: 0.72,
    metalness: 0.015,
    side: THREE.DoubleSide,
    transparent: board.transparent === true,
    opacity: board.transparent === true ? 0.42 : 1,
    depthWrite: board.transparent !== true,
    map: texture,
    // Keep the enclosing front/back skin ahead of exactly touching shelf edges.
    polygonOffset: board.direction === 1,
    polygonOffsetFactor: board.direction === 1 ? -1 : 0,
    polygonOffsetUnits: board.direction === 1 ? -1 : 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  const transform = corpusBoardRenderTransform([x!, y!, z!], [sizeX, sizeY, board.direction === 1 ? -sizeZ : sizeZ], [board.xAngle ?? 0, board.angle ?? 0, board.zAngle ?? 0]);
  mesh.position.fromArray(transform.position);
  mesh.rotation.set(...transform.rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.element = element;
  mesh.userData.board = board;
  mesh.userData.boardIndex = boardIndex;
  if (showHoles) addHoleMarkers(mesh, board, sizeX, sizeY, sizeZ, height!, width!, thickness!);

  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x4d554d, transparent: true, opacity: 0.52 });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 22), edgeMaterial);
  edges.visible = false;
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
  const uv: number[] = [];
  for (let i = 0; i < vertices.length; i += 3) {
    const x=vertices[i]!, y=vertices[i+1]!, z=vertices[i+2]!;
    if (board.direction === 0) uv.push(z / sizeZ, y / sizeY);
    else if (board.direction === 1) uv.push(x / sizeX, y / sizeY);
    else uv.push(x / sizeX, z / sizeZ);
  }
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
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
    // An unresolved plane has no proven drilling axis. A neutral symbol must
    // not look like a normal cylindrical cut on the board's main face.
    const geometry = new THREE.OctahedronGeometry(radius, 0);
    const material = new THREE.MeshBasicMaterial({ color: 0xd58b22, wireframe: true });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(position[0] - sizeX / 2, position[1] - sizeY / 2, position[2] - sizeZ / 2);
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

/** Positive Corpus Z is negative Three.js Z, matching element placement. */
function createElementAxes(length: number): THREE.Group {
  const group = new THREE.Group();
  const label = (text: string, color: string, position: THREE.Vector3) => {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 96;
    const context = canvas.getContext("2d")!;
    context.fillStyle = color; context.font = "bold 54px Arial";
    context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(text, 128, 48);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false }));
    sprite.position.copy(position); sprite.scale.set(length * 0.58, length * 0.22, 1); sprite.renderOrder = 32;
    group.add(sprite);
  };
  for (const [name, direction, color, css] of [
    ["X", new THREE.Vector3(1, 0, 0), 0xd52b32, "#b91c24"],
    ["Y", new THREE.Vector3(0, 1, 0), 0x238136, "#17632a"],
    ["Z", new THREE.Vector3(0, 0, -1), 0x2366d5, "#1d4ca3"],
  ] as const) {
    const arrow = new THREE.ArrowHelper(direction, new THREE.Vector3(), length, color, length * 0.15, length * 0.07);
    arrow.traverse(object => {
      object.renderOrder = 31;
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          material.depthTest = false; material.depthWrite = false;
        }
      }
    });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(length*0.055,length*0.055,length*0.88,8), new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
    handle.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
    handle.position.copy(direction.clone().multiplyScalar(length*0.6));
    handle.userData.axis=name;
    arrow.traverse(object=>{object.userData.axis=name;});
    group.add(arrow,handle); label(name, css, direction.clone().multiplyScalar(length * 1.16));
  }
  return group;
}

function containsElement(parent: CorpusS3dElement, target: CorpusS3dElement): boolean {
  return parent.children.some(child => child === target || containsElement(child, target));
}

function createMaterialTextures(sources: MaterialTextures, maxAnisotropy: number) {
  const loader = new THREE.TextureLoader();
  const loaded = new Map<File | string, { texture: THREE.Texture; url: string; owned: boolean }>();
  return {
    textureForBoard(board: CorpusS3dBoard): THREE.Texture | null {
      const source = sources.get(board.materialUid.trim().toUpperCase());
      const key = source?.url ?? source?.file;
      if (!source || !key) return null;
      const previous = loaded.get(key);
      if (previous) return previous.texture;
      const url = source.url ?? URL.createObjectURL(source.file!);
      const texture = loader.load(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, maxAnisotropy);
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      loaded.set(key, { texture, url, owned: !source.url });
      return texture;
    },
    dispose() {
      for (const {texture,url,owned} of loaded.values()) {
        texture.dispose(); if (owned) URL.revokeObjectURL(url);
      }
    },
  };
}
