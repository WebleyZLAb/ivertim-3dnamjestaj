import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  flattenCorpusS3dElements,
  parseCorpusE3d,
  parseCorpusS3d,
  type CorpusS3dBoard,
  type CorpusS3dElement,
  type CorpusS3dHole,
  type CorpusS3dInspection,
  type CorpusS3dMacroLink,
  type CorpusS3dRoom,
} from "../lib/corpus-s3d";
import { corpusRoomTotalHeight } from "../lib/corpus-geometry";
import { corpusAlignedBoardPosition, corpusEvenBoardPositions, type CorpusBoardPlacementAlignment, type CorpusBoardPlacementAxis } from "../lib/corpus-board-placement";
import { corpusAlignedBoardsToAnchor, corpusAppliedBoardAppearance, corpusBoardBounds, corpusBoardGroupBounds, corpusEvenlyDistributedBoards, corpusPlacedBoardsInElement, corpusSetBoardsVisibility, corpusTranslatedBoard, corpusTranslatedBoards, type CorpusBoardGroupAlignment, type CorpusBoardGroupAxis } from "../lib/corpus-board-group";
import { analyzeCorpusAssignments, type CorpusExpressionValue } from "../lib/corpus-expression";
import { corpusDrawingGroupBounds, corpusDrawingShape, corpusDrawingSpans, corpusDrawingSvg, type CorpusDrawingProjection } from "../lib/corpus-drawing";
import { corpusGridCopyOffsets, corpusLinearCopies, type CorpusCopyOffset } from "../lib/corpus-array";
import { corpusElementClearances, corpusRoomClearances } from "../lib/corpus-clearance";
import { corpusDistributedElements, type CorpusDistributionAxis } from "../lib/corpus-distribution";
import { corpusAlignedGroupElements, corpusCenteredGroupElements, corpusContainedGroupElements, corpusElementAllowsModeling, corpusElementsWithoutGroup, corpusEvenlyDistributedGroupElements, corpusGroupArrayCopies, corpusGroupAtRoomSideElements, corpusGroupBounds, corpusGroupGridCopies, corpusGroupRoomClearances, corpusGroupVisibilityElements, corpusIsolatedGroupElements, corpusPositionedGroupElements, corpusRotatedGroupAroundCenterElements, corpusRotatedGroupElements, corpusSnappedGroupElements, corpusSpacedGroupElements, corpusTranslatedElements, corpusVisibleRootElements, type CorpusGroupBounds, type CorpusGroupDistributionAxis, type CorpusGroupRoomClearance, type CorpusGroupRoomSide } from "../lib/corpus-group";
import { corpusKeyboardRotation, corpusModelingSelectionScope, corpusModelingShortcut, corpusNormalizedAngle, corpusNudgeDelta } from "../lib/corpus-nudge";
import { corpusAdjacentPlacementPosition, corpusAlignedPlacementPosition, corpusContainedRoomPosition, corpusRoomPlacementPosition, corpusSnappedPosition, type CorpusAdjacentSide, type CorpusAlignment, type CorpusPosition, type CorpusRoomEdge } from "../lib/corpus-placement";
import { analyzeCorpusLayout, corpusContainedLayoutElements, corpusLayoutIssueElements, corpusLayoutProblemElements, corpusSeparatedLayoutElements, type CorpusLayoutIssue, type CorpusLayoutSeparationAxis } from "../lib/corpus-layout";
import { generateCorpusCabinetE3d, type CorpusCabinetSpec } from "../lib/corpus-generator";
import { generateCorpusElementE3d, type CorpusElementSpec } from "../lib/corpus-element-generator";
import { fitCorpusElementToBoards } from "../lib/corpus-element-fit";
import { buildCorpusCutList, corpusCutListCsv, type CorpusCutListResult } from "../lib/corpus-cutlist";
import { buildCorpusConsumablesList, corpusConsumablesCsv, type CorpusConsumableItem } from "../lib/corpus-consumables";
import { analyzeCorpusMacroPayload, decodeCorpusText, type CorpusMacroAnalysis } from "../lib/corpus-macro";
import { corpusCmkDocumentFromDecodedPayloads, parseCorpusCmk, type CorpusCmkDocument } from "../lib/corpus-cmk";
import { corpusMacroBoardContext, simulateCorpusCmk, type CorpusCmkOperationKind } from "../lib/corpus-cmk-simulation";
import { resolveCorpusSawPaths, type CorpusSawResolution } from "../lib/corpus-saw";
import { createCorpusMaterialIndex, parseCorpusMaterialCatalog, resolveCorpusMaterialPicturePath } from "../lib/corpus-material-library";
import { analyzeCorpusBoardContact, type CorpusBoardContactFace, type CorpusBoardLocalContactRectangle } from "../lib/corpus-board-contact";
import { corpusRasterOperationsToHoles, createCorpusLinearHolePattern, createCorpusRectangularHolePattern, mirrorCorpusHole, oppositeCorpusHoleFace, type CorpusHoleMirrorAxis, type CorpusHolePatternAxis } from "../lib/corpus-machining";
import { applyCorpusWorkingCopyProject, corpusElementAtPath, createCorpusWorkingCopyFile, findCorpusElementPath, replaceCorpusElement, updateCorpusBoard, updateCorpusBoardAppearance, updateCorpusBoardHoles, updateCorpusElement, updateCorpusElementIdentity, updateCorpusElementVariables, updateCorpusRoom, type BoardAppearancePatch, type BoardGeometryPatch, type ElementGeometryPatch, type ElementIdentityPatch, type ElementVariablesPatch, type RoomGeometryPatch } from "../lib/corpus-model";
import { createCorpusRecoverySnapshot, type CorpusRecoverySnapshot } from "../lib/corpus-recovery";
import { appendCorpusE3dBoard, createCorpusE3dSourceFromS3d, duplicateCorpusE3dBoard, duplicateCorpusE3dBoardCopies, duplicateCorpusE3dBoards, moveCorpusE3dBoard, removeCorpusE3dBoard, removeCorpusE3dBoards, renameCorpusE3dBoard, replaceCorpusE3dBoardContour, replaceCorpusE3dBoardEdgeBanding, replaceCorpusE3dElementVariables, writeCorpusE3dGeometryCopy, writeCorpusS3dWithImportedElements, type CorpusE3dImportSource, type CorpusEdgeBandingSpec, type CorpusNewBoardSpec, type CorpusStraightContourPoint } from "../lib/corpus-s3d-writer";
import { DEMO_S3D, EMPTY_S3D } from "./demo-project";
import { clearCorpusRecovery, loadCorpusRecovery, saveCorpusRecovery } from "./recovery-store";

const Room3DView = lazy(() => import("./room-3d").then((module) => ({ default: module.Room3DView })));
const Element3DPreview = lazy(() => import("./room-3d").then((module) => ({ default: module.Element3DPreview })));

type LoadedProject = {
  fileName: string;
  fileSize: number;
  sourceXml: string;
  inspection: CorpusS3dInspection;
  originalInspection: CorpusS3dInspection;
  dirty: boolean;
  history: readonly ProjectHistoryEntry[];
  future: readonly ProjectHistoryEntry[];
  importedE3dSources: readonly CorpusE3dImportSource[];
  standaloneE3dSource: CorpusE3dImportSource | null;
};

type ProjectHistoryEntry = {
  inspection: CorpusS3dInspection;
  importedE3dSources: readonly CorpusE3dImportSource[];
  standaloneE3dSource: CorpusE3dImportSource | null;
};

function createProjectWorkingCopy(project: LoadedProject) {
  const originalCount = project.originalInspection.elements.length;
  const imports = project.importedE3dSources
    .slice(0, project.inspection.elements.length - originalCount)
    .map((source, index) => ({
      sourceFile: source.sourceFile,
      sourceXml: writeCorpusE3dGeometryCopy(source.sourceXml, [source.originalElement], [project.inspection.elements[originalCount + index]!]),
    }));
  const standaloneE3d = project.inspection.format === "corpus-e3d" && project.standaloneE3dSource
    ? {
        sourceFile: project.fileName,
        sourceXml: writeCorpusE3dGeometryCopy(project.standaloneE3dSource.sourceXml, [project.standaloneE3dSource.originalElement], project.inspection.elements),
      }
    : null;
  return createCorpusWorkingCopyFile(
    project.fileName,
    project.originalInspection.elements,
    project.inspection.elements,
    undefined,
    { original: project.originalInspection.room, current: project.inspection.room },
    imports,
    standaloneE3d,
  );
}

function createProjectRecoverySnapshot(project: LoadedProject): CorpusRecoverySnapshot {
  return createCorpusRecoverySnapshot(project.fileName, project.fileSize, project.sourceXml, createProjectWorkingCopy(project));
}

type MaterialTextureSource = {
  file: File;
  name: string;
  textureSize: readonly [number | null, number | null, number | null];
};

type LoadedMaterialLibrary = {
  folderName: string;
  catalogCount: number;
  recordCount: number;
  textureByUid: ReadonlyMap<string, MaterialTextureSource>;
  resolutionByUid: ReadonlyMap<string, MaterialResolution>;
  ambiguousUids: number;
  missingPictures: number;
};

type MaterialResolution =
  | { kind: "ready"; source: MaterialTextureSource }
  | { kind: "ambiguous"; candidates: number }
  | { kind: "missing-picture"; name: string; pictureFile: string; reason: string };

const MaterialLibraryContext = createContext<LoadedMaterialLibrary | null>(null);

export function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const workingCopyInputRef = useRef<HTMLInputElement>(null);
  const e3dImportInputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDetailsElement>(null);
  const moreMenuRef = useRef<HTMLDetailsElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const macroLibraryInputRef = useRef<HTMLInputElement>(null);
  const materialLibraryInputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<LoadedProject | null>(null);
  const [selected, setSelected] = useState<CorpusS3dElement | null>(null);
  const [selectedBoardIndex, setSelectedBoardIndex] = useState<number | null>(null);
  const [boardGroupSelection, setBoardGroupSelection] = useState<readonly number[]>([]);
  const [groupSelection, setGroupSelection] = useState<readonly number[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [viewMode, setViewMode] = useState<"data" | "drawing" | "threeD" | "room" | "cutlist">("threeD");
  const [libraryFiles, setLibraryFiles] = useState<readonly File[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [elementCreatorOpen, setElementCreatorOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [macroFiles, setMacroFiles] = useState<readonly File[]>([]);
  const [macroLibraryOpen, setMacroLibraryOpen] = useState(false);
  const [macroQuery, setMacroQuery] = useState("");
  const [selectedMacro, setSelectedMacro] = useState<{ path: string; document: CorpusCmkDocument } | null>(null);
  const [materialLibrary, setMaterialLibrary] = useState<LoadedMaterialLibrary | null>(null);
  const [recovery, setRecovery] = useState<CorpusRecoverySnapshot | null>(null);
  const [recoverySaveState, setRecoverySaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  useCloseOnEscape(() => setLibraryOpen(false), libraryOpen);
  useCloseOnEscape(() => setMacroLibraryOpen(false), macroLibraryOpen);
  const visibleLibraryFiles = useMemo(() => {
    const needle = libraryQuery.trim().toLocaleLowerCase();
    return libraryFiles
      .filter((file) => !needle || libraryFilePath(file).toLocaleLowerCase().includes(needle))
      .slice(0, 100);
  }, [libraryFiles, libraryQuery]);
  const visibleMacroFiles = useMemo(() => {
    const needle = macroQuery.trim().toLocaleLowerCase();
    return macroFiles
      .filter((file) => !needle || libraryFilePath(file).toLocaleLowerCase().includes(needle))
      .slice(0, 100);
  }, [macroFiles, macroQuery]);
  const layoutIssues = useMemo(() => project ? analyzeCorpusLayout(project.inspection.elements, project.inspection.room) : [], [project]);
  const layoutProblemElements = useMemo(() => project ? corpusLayoutProblemElements(layoutIssues, project.inspection.elements) : { outsideRoom: [], overlapping: [] }, [layoutIssues, project]);
  const cutList = useMemo(() => buildCorpusCutList(project?.inspection.elements ?? []), [project]);
  const consumablesList = useMemo(() => buildCorpusConsumablesList(project?.inspection.elements ?? []), [project]);
  const selectedGroupElements = useMemo(() => project ? groupSelection.map((index) => project.inspection.elements[index]!).filter(Boolean) : [], [project, groupSelection]);
  const groupCutList = useMemo(() => buildCorpusCutList(selectedGroupElements), [selectedGroupElements]);
  const groupConsumablesList = useMemo(() => buildCorpusConsumablesList(selectedGroupElements), [selectedGroupElements]);
  const projectTextureMatches = useMemo(() => {
    if (!project || !materialLibrary) return 0;
    return flattenCorpusS3dElements(project.inspection.elements).reduce((sum, element) =>
      sum + element.boards.filter((board) => materialLibrary.textureByUid.has(normalizeMaterialUid(board.materialUid))).length, 0);
  }, [project, materialLibrary]);

  useEffect(() => {
    let active = true;
    loadCorpusRecovery()
      .then((snapshot) => { if (active) setRecovery(snapshot); })
      .catch(() => { if (active) setRecoverySaveState("error"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!project?.dirty) return;
    setRecoverySaveState("saving");
    const timer = window.setTimeout(() => {
      try {
        const snapshot = createProjectRecoverySnapshot(project);
        saveCorpusRecovery(snapshot)
          .then(() => {
            setRecovery(snapshot);
            setRecoverySaveState("saved");
          })
          .catch(() => setRecoverySaveState("error"));
      } catch {
        setRecoverySaveState("error");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [project]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!project || isEditableTarget(event.target)) return;
      if (event.key === "Escape" && boardGroupSelection.length) {
        event.preventDefault();
        setBoardGroupSelection([]);
        return;
      }
      if (event.key === "Escape" && groupSelection.length) {
        event.preventDefault();
        setGroupSelection([]);
        return;
      }
      const hasActiveBoard = selectedBoardIndex !== null && Boolean(selected?.boards[selectedBoardIndex]);
      const modelingScope = corpusModelingSelectionScope(boardGroupSelection.length, hasActiveBoard, groupSelection.length, Boolean(selected));
      const shortcutBoardIndex = boardGroupSelection.length === 1 ? boardGroupSelection[0]! : selectedBoardIndex;
      const nudge = !event.ctrlKey && !event.metaKey && !event.altKey && !event.repeat ? corpusNudgeDelta(event.key, event.shiftKey) : null;
      if (nudge) {
        event.preventDefault();
        if (modelingScope === "board-group" && selected && corpusElementAllowsModeling(selected)) translateSelectedBoards(boardGroupSelection, nudge);
        else if (modelingScope === "board" && shortcutBoardIndex !== null && selected && corpusElementAllowsModeling(selected)) translateSelectedBoard(shortcutBoardIndex, nudge);
        else if (modelingScope === "element-group") translateGroup(nudge);
        else if (selected && corpusElementAllowsModeling(selected) && selected.position.every((value) => value !== null && Number.isFinite(value))) {
          moveElementIn3D(selected, selected.position.map((value, axis) => value! + nudge[axis]!) as [number, number, number]);
        }
        return;
      }
      const rotation = !event.ctrlKey && !event.metaKey && !event.altKey && !event.repeat ? corpusKeyboardRotation(event.key, event.shiftKey) : null;
      if (rotation !== null) {
        event.preventDefault();
        if (selectedBoardIndex !== null || boardGroupSelection.length > 0) {
          setError("Rotacija ploča još nije dostupna; Q/E nije primijenjen na cijeli element.");
        } else if (groupSelection.length >= 2) rotateGroup(rotation);
        else if (selected && corpusElementAllowsModeling(selected)) {
          const patch = geometryPatchAt(selected, selected.position as CorpusPosition);
          if (patch) updateSelectedElement({ ...patch, angle: corpusNormalizedAngle((selected.angle ?? 0) + rotation) });
        }
        return;
      }
      const modelingShortcut = corpusModelingShortcut(event);
      if (modelingShortcut === "duplicate") {
        if (modelingScope === "board-group") {
          event.preventDefault();
          if (!selected || !structuredE3dTarget()) {
            setError("Grupno kopiranje ploča dostupno je samo za samostalne, nove i uvezene E3D elemente.");
            return;
          }
          try {
            const bounds = corpusBoardGroupBounds(selected, boardGroupSelection);
            duplicateSelectedBoards(boardGroupSelection, [bounds.size[0] + 100, 0, 0]);
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Označenu grupu ploča nije moguće kopirati.");
          }
        } else if (modelingScope === "board") {
          event.preventDefault();
          if (!selected || shortcutBoardIndex === null || !structuredE3dTarget(shortcutBoardIndex)) {
            setError("Kopiranje aktivne ploče dostupno je samo za samostalne, nove i uvezene E3D elemente.");
            return;
          }
          try {
            const bounds = corpusBoardBounds(selected, shortcutBoardIndex);
            duplicateSelectedBoardArray(shortcutBoardIndex, 1, [bounds.size[0] + 100, 0, 0]);
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Aktivnu ploču nije moguće kopirati.");
          }
        } else if (modelingScope === "element-group") {
          const bounds = corpusGroupBounds(project.inspection.elements, groupSelection);
          if (bounds) {
            event.preventDefault();
            duplicateGroup([bounds.width + 100, 0, 0], 1);
          }
        } else if (selected && project.inspection.format === "corpus-s3d" && findCorpusElementPath(project.inspection.elements, selected)?.length === 1) {
          event.preventDefault();
          duplicateImportedElement(1, [Math.max(selected.width ?? 0, 100) + 100, 0, 0]);
        }
        return;
      }
      if (modelingShortcut === "remove") {
        const originalCount = project.originalInspection.elements.length;
        if (modelingScope === "board-group") {
          event.preventDefault();
          if (!selected || !structuredE3dTarget()) {
            setError("Grupno uklanjanje ploča dostupno je samo za samostalne, nove i uvezene E3D elemente.");
            return;
          }
          if (boardGroupSelection.length >= selected.boards.length) {
            setError("Element mora zadržati najmanje jednu ploču.");
            return;
          }
          removeSelectedBoards(boardGroupSelection);
        } else if (modelingScope === "board") {
          event.preventDefault();
          if (!selected || shortcutBoardIndex === null || !structuredE3dTarget(shortcutBoardIndex)) {
            setError("Uklanjanje aktivne ploče dostupno je samo za samostalne, nove i uvezene E3D elemente.");
            return;
          }
          if (selected.boards.length <= 1) {
            setError("Element mora zadržati najmanje jednu ploču.");
            return;
          }
          removeSelectedBoard(shortcutBoardIndex);
        } else if (modelingScope === "element-group" && groupSelection.every((index) => index >= originalCount && corpusElementAllowsModeling(project.inspection.elements[index]!))) {
          event.preventDefault();
          removeGroup();
        } else {
          const path = selected ? findCorpusElementPath(project.inspection.elements, selected) : null;
          if (selected && corpusElementAllowsModeling(selected) && path?.length === 1 && path[0]! >= originalCount) {
            event.preventDefault();
            removeImportedElement();
          }
        }
        return;
      }
      if ((!event.ctrlKey && !event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "z" && event.shiftKey && project.future.length) {
        event.preventDefault();
        redoWorkingCopy();
      } else if (key === "y" && !event.shiftKey && project.future.length) {
        event.preventDefault();
        redoWorkingCopy();
      } else if (key === "z" && !event.shiftKey && project.history.length) {
        event.preventDefault();
        undoWorkingCopy();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [project, selected, selectedBoardIndex, boardGroupSelection, groupSelection]);

  async function openFile(file: File | undefined) {
    if (!file) return;
    if (project?.dirty && !window.confirm(`Otvoriti projekat „${file.name}“?\n\nTrenutna izmijenjena radna kopija biće zatvorena. Prije nastavka možeš je sačuvati kao JSON ili izvesti kroz meni „Više“. Izvorni fajlovi ostaju netaknuti.`)) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setError(null);
    try {
      const sourceXml = await file.text();
      const inspection = file.name.toLowerCase().endsWith(".e3d") ? parseCorpusE3d(sourceXml) : parseCorpusS3d(sourceXml);
      loadProject(file.name, file.size, sourceXml, inspection);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fajl nije moguće otvoriti.");
    }
  }

  function loadProject(fileName: string, fileSize: number, sourceXml: string, inspection: CorpusS3dInspection) {
    const standaloneE3dSource = inspection.format === "corpus-e3d" && inspection.elements[0]
      ? { sourceFile: fileName, sourceXml, originalElement: inspection.elements[0] }
      : null;
    setProject({ fileName, fileSize, sourceXml, inspection, originalInspection: inspection, dirty: false, history: [], future: [], importedE3dSources: [], standaloneE3dSource });
    setSelected(inspection.elements[0] ?? null);
    setSelectedBoardIndex(null);
    setBoardGroupSelection([]);
    setGroupSelection([]);
    setQuery("");
  }

  const selectElement = useCallback((element: CorpusS3dElement) => {
    setSelected(element);
    setSelectedBoardIndex(null);
    setBoardGroupSelection([]);
  }, []);

  const inspectLayoutIssue = useCallback((issueElements: readonly CorpusS3dElement[]) => {
    if (!project || !issueElements.length) return;
    const rootIndexes = issueElements
      .map((element) => project.inspection.elements.indexOf(element))
      .filter((index) => index >= 0);
    if (!rootIndexes.length) return;
    setSelected(project.inspection.elements[rootIndexes[0]!] ?? null);
    setSelectedBoardIndex(null);
    setGroupSelection(rootIndexes);
    setViewMode("threeD");
  }, [project]);

  const containLayoutIssue = useCallback((issueElements: readonly CorpusS3dElement[]) => {
    if (!project || !issueElements.length) return;
    const result = corpusContainedLayoutElements(project.inspection.elements, issueElements, project.inspection.room);
    if (!result || !result.movedIndexes.length) return;
    setProject((current) => current ? {
      ...current,
      history: appendProjectHistory(current),
      future: [],
      inspection: { ...current.inspection, elements: result.elements },
      dirty: true,
    } : current);
    setSelected(result.elements[result.movedIndexes[0]!] ?? null);
    setSelectedBoardIndex(null);
    setGroupSelection(result.movedIndexes);
  }, [project]);

  const separateLayoutIssue = useCallback((issueElements: readonly CorpusS3dElement[], axis: CorpusLayoutSeparationAxis) => {
    if (!project) return;
    const rootIndexes = issueElements.map((element) => project.inspection.elements.indexOf(element)).filter((index) => index >= 0);
    const result = corpusSeparatedLayoutElements(project.inspection.elements, issueElements, axis);
    if (!result) return;
    setProject((current) => current ? {
      ...current,
      history: appendProjectHistory(current),
      future: [],
      inspection: { ...current.inspection, elements: result.elements },
      dirty: true,
    } : current);
    setSelected(result.elements[result.movedIndex] ?? null);
    setSelectedBoardIndex(null);
    setGroupSelection(rootIndexes);
  }, [project]);

  function restoreLocalRecovery() {
    if (!recovery) return;
    try {
      const originalInspection = recovery.fileName.toLowerCase().endsWith(".e3d")
        ? parseCorpusE3d(recovery.sourceXml)
        : parseCorpusS3d(recovery.sourceXml);
      const restored = applyCorpusWorkingCopyProject(
        recovery.fileName,
        originalInspection.elements,
        originalInspection.room,
        recovery.workingCopy,
      );
      const inspection = { ...originalInspection, elements: restored.elements, room: restored.room };
      const baseStandalone = originalInspection.format === "corpus-e3d" && originalInspection.elements[0]
        ? { sourceFile: recovery.fileName, sourceXml: recovery.sourceXml, originalElement: originalInspection.elements[0] }
        : null;
      setProject({
        fileName: recovery.fileName,
        fileSize: recovery.fileSize,
        sourceXml: recovery.sourceXml,
        inspection,
        originalInspection,
        dirty: true,
        history: [],
        future: [],
        importedE3dSources: restored.importedE3dSources,
        standaloneE3dSource: restored.standaloneE3dSource ?? baseStandalone,
      });
      setSelected(inspection.elements[0] ?? null);
      setSelectedBoardIndex(null);
      setGroupSelection([]);
      setError(null);
      setRecoverySaveState("saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Lokalni oporavak nije moguće vratiti.");
    }
  }

  function discardLocalRecovery() {
    if (!window.confirm("Obrisati posljednju lokalnu sesiju za oporavak? Izvorni S3D/E3D fajl neće biti promijenjen.")) return;
    clearCorpusRecovery()
      .then(() => {
        setRecovery(null);
        setRecoverySaveState("idle");
      })
      .catch(() => setRecoverySaveState("error"));
  }

  if (!project) {
    return (
      <main className="welcome-shell">
        <section className="welcome-card">
          <Brand />
          <div className="welcome-copy">
            <p className="eyebrow">Lokalni S3D / E3D preglednik</p>
            <h1>Upoznaj projekat<br />prije nego ga mijenjaš.</h1>
            <p>
              Otvori Corpus projekat ili bibliotečki element i pregledaj elemente, ploče, bušenja i materijale.
              Fajl ostaje na ovom računaru i nikada se ne mijenja.
            </p>
          </div>
          <DropZone
            dragging={dragging}
            error={error}
            inputRef={inputRef}
            onDragging={setDragging}
            onFile={openFile}
          />
          <div className="welcome-actions">
            <button className="demo-button" onClick={() => loadProject("NOVI-IVERTIM-PROJEKAT.S3D", new Blob([EMPTY_S3D]).size, EMPTY_S3D, parseCorpusS3d(EMPTY_S3D))}>Napravi novi prazan projekat</button>
            <button className="demo-button" onClick={() => loadProject("IVERTIM-DEMO.S3D", new Blob([DEMO_S3D]).size, DEMO_S3D, parseCorpusS3d(DEMO_S3D))}>Otvori ugrađeni demo</button>
          </div>
          {recovery && (
            <section className="recovery-card" aria-label="Lokalni oporavak sesije">
              <div><strong>Nedovršena lokalna sesija</strong><span>{recovery.fileName} · {formatRecoveryTime(recovery.savedAt)}</span></div>
              <button className="primary-button" onClick={restoreLocalRecovery}>Vrati sesiju</button>
              <button className="secondary-button" onClick={discardLocalRecovery}>Odbaci</button>
            </section>
          )}
          {recoverySaveState === "error" && <p className="error-message" role="alert">Lokalni oporavak trenutno nije dostupan. Ručni .json izvoz i dalje radi.</p>}
          <p className="privacy-note"><span>●</span> Read-only analiza · bez slanja podataka</p>
        </section>
      </main>
    );
  }

  const allElements = flattenCorpusS3dElements(project.inspection.elements);
  const normalizedRootQuery = query.trim().toLocaleLowerCase("sr");
  const visibleRootIndexes = project.inspection.elements.map((element, index) => ({ element, index }))
    .filter(({ element }) => !normalizedRootQuery || elementMatches(element, normalizedRootQuery))
    .map(({ index }) => index);
  const selectedPath = selected ? findCorpusElementPath(project.inspection.elements, selected) : null;
  const selectedIsRoot = selectedPath?.length === 1;
  const selectedCanCopy = project.inspection.format === "corpus-s3d" && selectedIsRoot;
  const selectedCanRemove = Boolean(selected && isImportedRoot(project, selected) && corpusElementAllowsModeling(selected));
  const selectedBoardCanChange = selectedBoardIndex !== null && Boolean(structuredE3dTarget(selectedBoardIndex));
  const boards = allElements.reduce((sum, element) => sum + element.boards.length, 0);
  const consumables = allElements.reduce(
    (sum, element) => sum + element.consumables.length + element.boards.reduce((n, board) => n + board.consumables.length, 0),
    0,
  );

  function updateSelectedElement(patch: ElementGeometryPatch) {
    if (!selected || !corpusElementAllowsModeling(selected)) return;
    const { elements, updated: updatedSelection } = updateCorpusElement(project!.inspection.elements, selected, patch);
    setProject((current) => current ? { ...current, history: appendProjectHistory(current), future: [], inspection: { ...current.inspection, elements }, dirty: true } : current);
    setSelected(updatedSelection);
  }

  function rotateSelectedElement(delta: number) {
    if (!selected || selectedBoardIndex !== null || !corpusElementAllowsModeling(selected)) return;
    if (selected.position.some((value) => value === null)) return;
    const patch = geometryPatchAt(selected, selected.position as CorpusPosition);
    if (patch) updateSelectedElement({ ...patch, angle: corpusNormalizedAngle((selected.angle ?? 0) + delta) });
  }

  function fitSelectedElementToBoards(): boolean {
    if (!selected || !corpusElementAllowsModeling(selected)) return false;
    const fitted = fitCorpusElementToBoards(selected);
    if (!fitted) return false;
    const unchanged = fitted.width === selected.width && fitted.height === selected.height && fitted.depth === selected.depth
      && fitted.position.every((value, index) => value === selected.position[index])
      && fitted.boards.every((board, boardIndex) => board.position.every((value, axis) => value === selected.boards[boardIndex]?.position[axis]));
    if (unchanged) return true;
    const { elements, updated } = replaceCorpusElement(project!.inspection.elements, selected, fitted);
    if (!updated) return false;
    setProject((current) => current ? { ...current, history: appendProjectHistory(current), future: [], inspection: { ...current.inspection, elements }, dirty: true } : current);
    setSelected(updated);
    return true;
  }

  function moveElementIn3D(target: CorpusS3dElement, position: CorpusPosition) {
    if (!corpusElementAllowsModeling(target)) return;
    const patch = geometryPatchAt(target, position);
    if (!patch) return;
    const { elements, updated } = updateCorpusElement(project!.inspection.elements, target, patch);
    if (!updated) return;
    setProject((current) => current ? { ...current, history: appendProjectHistory(current), future: [], inspection: { ...current.inspection, elements }, dirty: true } : current);
    setSelected(updated);
    setSelectedBoardIndex(null);
  }

  function updateSelectedElementIdentity(patch: ElementIdentityPatch) {
    if (!selected) return;
    const { elements, updated: updatedSelection } = updateCorpusElementIdentity(project!.inspection.elements, selected, patch);
    setProject((current) => current ? { ...current, history: appendProjectHistory(current), future: [], inspection: { ...current.inspection, elements }, dirty: true } : current);
    setSelected(updatedSelection);
  }

  function updateSelectedElementVariables(variables: ElementVariablesPatch) {
    if (!selected || !corpusElementAllowsModeling(selected)) return;
    const structuredTarget = structuredE3dTarget();
    if (structuredTarget) {
      try {
        const editedSource = writeCorpusE3dGeometryCopy(structuredTarget.source.sourceXml, [structuredTarget.source.originalElement], [selected]);
        const nextSourceXml = replaceCorpusE3dElementVariables(editedSource, [0], variables);
        applyStructuredE3dSource(structuredTarget, nextSourceXml, selectedBoardIndex ?? 0);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Varijable elementa nije moguće promijeniti.");
      }
      return;
    }
    const currentNames = Object.keys(selected.variables).sort();
    const nextNames = Object.keys(variables).sort();
    if (JSON.stringify(currentNames) !== JSON.stringify(nextNames)) {
      setError("Dodavanje, preimenovanje i uklanjanje varijabli dostupno je samo za samostalne, nove ili uvezene E3D elemente.");
      return;
    }
    const { elements, updated: updatedSelection } = updateCorpusElementVariables(project!.inspection.elements, selected, variables);
    if (!updatedSelection) return;
    setProject((current) => current ? { ...current, history: appendProjectHistory(current), future: [], inspection: { ...current.inspection, elements }, dirty: true } : current);
    setSelected(updatedSelection);
  }

  function updateSelectedBoard(boardIndex: number, patch: BoardGeometryPatch) {
    if (!selected || !corpusElementAllowsModeling(selected)) return;
    const result = updateCorpusBoard(project!.inspection.elements, selected, boardIndex, patch);
    if (!result.updatedElement) return;
    setProject((current) => current ? { ...current, history: appendProjectHistory(current), future: [], inspection: { ...current.inspection, elements: result.elements }, dirty: true } : current);
    setSelected(result.updatedElement);
  }

  function updateSelectedBoardAppearance(boardIndex: number, patch: BoardAppearancePatch) {
    if (!selected || !corpusElementAllowsModeling(selected)) return;
    const result = updateCorpusBoardAppearance(project!.inspection.elements, selected, boardIndex, patch);
    if (!result.updatedElement) return;
    setProject((current) => current ? { ...current, history: appendProjectHistory(current), future: [], inspection: { ...current.inspection, elements: result.elements }, dirty: true } : current);
    setSelected(result.updatedElement);
  }

  function updateSelectedBoardHoles(boardIndex: number, holes: readonly CorpusS3dHole[]) {
    if (!selected || !corpusElementAllowsModeling(selected)) return;
    const result = updateCorpusBoardHoles(project!.inspection.elements, selected, boardIndex, holes);
    if (!result.updatedElement) return;
    setProject((current) => current ? { ...current, history: appendProjectHistory(current), future: [], inspection: { ...current.inspection, elements: result.elements }, dirty: true } : current);
    setSelected(result.updatedElement);
  }

  function updateRoom(patch: RoomGeometryPatch) {
    setProject((current) => current ? {
      ...current,
      history: appendProjectHistory(current),
      future: [],
      inspection: { ...current.inspection, room: updateCorpusRoom(current.inspection.room, patch) },
      dirty: true,
    } : current);
  }

  function distributeRootElements(axis: CorpusDistributionAxis, gap: number, margin: number): boolean {
    if (project!.inspection.elements.some((element) => !corpusElementAllowsModeling(element))) return false;
    const elements = corpusDistributedElements(project!.inspection.elements, project!.inspection.room, axis, gap, margin);
    if (!elements) return false;
    const selectedRootIndex = selected ? project!.inspection.elements.indexOf(selected) : -1;
    setProject((current) => current ? {
      ...current,
      history: appendProjectHistory(current),
      future: [],
      inspection: { ...current.inspection, elements },
      dirty: true,
    } : current);
    if (selectedRootIndex >= 0) setSelected(elements[selectedRootIndex] ?? null);
    return true;
  }

  function toggleGroupElement(index: number) {
    setGroupSelection((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  }

  function selectRootGroup(indexes: readonly number[]) {
    const selectedIndex = selected ? project!.inspection.elements.indexOf(selected) : -1;
    const unique = [...new Set(indexes)].filter((index) => index >= 0 && index < project!.inspection.elements.length);
    setGroupSelection(selectedIndex >= 0 && unique.includes(selectedIndex)
      ? [selectedIndex, ...unique.filter((index) => index !== selectedIndex)]
      : unique);
  }

  function applyGroupedElements(elements: readonly CorpusS3dElement[]): boolean {
    if (elements === project!.inspection.elements) return true;
    const selectedRootIndex = selected ? project!.inspection.elements.indexOf(selected) : -1;
    setProject((current) => current ? {
      ...current,
      history: appendProjectHistory(current),
      future: [],
      inspection: { ...current.inspection, elements },
      dirty: true,
    } : current);
    if (selectedRootIndex >= 0) setSelected(elements[selectedRootIndex] ?? null);
    setSelectedBoardIndex(null);
    return true;
  }

  function translateGroup(delta: CorpusPosition): boolean {
    const elements = corpusTranslatedElements(project!.inspection.elements, groupSelection, delta);
    return elements ? applyGroupedElements(elements) : false;
  }

  function positionGroup(targetMinimum: CorpusPosition): boolean {
    const elements = corpusPositionedGroupElements(project!.inspection.elements, groupSelection, targetMinimum);
    return elements ? applyGroupedElements(elements) : false;
  }

  function alignGroup(alignment: CorpusAlignment): boolean {
    const elements = corpusAlignedGroupElements(project!.inspection.elements, groupSelection, alignment);
    return elements ? applyGroupedElements(elements) : false;
  }

  function distributeGroup(axis: CorpusGroupDistributionAxis): boolean {
    const elements = corpusEvenlyDistributedGroupElements(project!.inspection.elements, groupSelection, axis);
    return elements ? applyGroupedElements(elements) : false;
  }

  function spaceGroup(axis: CorpusGroupDistributionAxis, gap: number): boolean {
    const elements = corpusSpacedGroupElements(project!.inspection.elements, groupSelection, axis, gap);
    return elements ? applyGroupedElements(elements) : false;
  }

  function rotateGroup(angle: number, aroundCenter = false): boolean {
    const elements = aroundCenter
      ? corpusRotatedGroupAroundCenterElements(project!.inspection.elements, groupSelection, angle)
      : corpusRotatedGroupElements(project!.inspection.elements, groupSelection, angle);
    return elements ? applyGroupedElements(elements) : false;
  }

  function containGroup(margin: number): boolean {
    const elements = corpusContainedGroupElements(project!.inspection.elements, groupSelection, project!.inspection.room, margin);
    return elements ? applyGroupedElements(elements) : false;
  }

  function centerGroup(axis: CorpusGroupDistributionAxis): boolean {
    const elements = corpusCenteredGroupElements(project!.inspection.elements, groupSelection, project!.inspection.room, axis);
    return elements ? applyGroupedElements(elements) : false;
  }

  function placeGroupAtRoomSide(side: CorpusGroupRoomSide, margin: number): boolean {
    const elements = corpusGroupAtRoomSideElements(project!.inspection.elements, groupSelection, project!.inspection.room, side, margin);
    return elements ? applyGroupedElements(elements) : false;
  }

  function snapGroup(step: number): boolean {
    const elements = corpusSnappedGroupElements(project!.inspection.elements, groupSelection, step);
    return elements ? applyGroupedElements(elements) : false;
  }

  function duplicateGroup(offset: CorpusPosition, count: number): boolean {
    if (project!.inspection.format !== "corpus-s3d") return false;
    const copies = corpusGroupArrayCopies(project!.inspection.elements, groupSelection, count, offset);
    return copies ? appendGroupCopies(copies, count) : false;
  }

  function duplicateGroupGrid(columns: number, rows: number, columnStep: CorpusPosition, rowStep: CorpusPosition): boolean {
    if (project!.inspection.format !== "corpus-s3d") return false;
    const copies = corpusGroupGridCopies(project!.inspection.elements, groupSelection, columns, rows, columnStep, rowStep);
    return copies ? appendGroupCopies(copies, columns * rows - 1) : false;
  }

  function appendGroupCopies(copies: readonly CorpusS3dElement[], copyGroups: number): boolean {
    const originalCount = project!.originalInspection.elements.length;
    try {
      const sourceGroup = groupSelection.map((rootIndex) => {
        const element = project!.inspection.elements[rootIndex]!;
        if (rootIndex < originalCount) return {
          sourceFile: `${element.name || `Element-${rootIndex + 1}`}.E3D`,
          sourceXml: createCorpusE3dSourceFromS3d(project!.sourceXml, rootIndex),
          originalElement: project!.originalInspection.elements[rootIndex]!,
        };
        const source = project!.importedE3dSources[rootIndex - originalCount];
        if (!source) throw new Error("Nedostaje E3D izvor jednog označenog elementa.");
        return { ...source };
      });
      const sources = Array.from({ length: copyGroups }, () => sourceGroup.map((source) => ({ ...source }))).flat();
      const startIndex = project!.inspection.elements.length;
      const selectedGroupIndex = selected ? groupSelection.indexOf(project!.inspection.elements.indexOf(selected)) : -1;
      setProject((current) => current ? {
        ...current,
        history: appendProjectHistory(current),
        future: [],
        inspection: { ...current.inspection, elements: [...current.inspection.elements, ...copies] },
        importedE3dSources: [...current.importedE3dSources, ...sources],
        dirty: true,
      } : current);
      setGroupSelection(copies.map((_, index) => startIndex + index));
      const selectedCopyIndex = selectedGroupIndex >= 0 ? (copyGroups - 1) * groupSelection.length + selectedGroupIndex : copies.length - 1;
      setSelected(copies[selectedCopyIndex] ?? copies.at(-1) ?? null);
      setSelectedBoardIndex(null);
      setError(null);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Grupu nije moguće kopirati.");
      return false;
    }
  }

  function removeGroup(): boolean {
    const originalCount = project!.originalInspection.elements.length;
    if (groupSelection.length < 2 || groupSelection.some((index) => index < originalCount || !corpusElementAllowsModeling(project!.inspection.elements[index]!))) return false;
    const nextElements = corpusElementsWithoutGroup(project!.inspection.elements, groupSelection);
    if (!nextElements) return false;
    if (!window.confirm(`Ukloniti ${groupSelection.length} označena dodana elementa?\n\nElementi i njihove ploče biće uklonjeni samo iz radne kopije. Izvorni S3D/E3D fajlovi ostaju netaknuti, a cijela radnja se može vratiti jednim Undo korakom.`)) return false;
    const removedImports = new Set(groupSelection.map((index) => index - originalCount));
    const fallbackIndex = Math.min(Math.min(...groupSelection), nextElements.length - 1);
    setProject((current) => current ? {
      ...current,
      history: appendProjectHistory(current),
      future: [],
      inspection: { ...current.inspection, elements: nextElements },
      importedE3dSources: current.importedE3dSources.filter((_, index) => !removedImports.has(index)),
      dirty: true,
    } : current);
    setSelected(nextElements[fallbackIndex] ?? nextElements.at(-1) ?? null);
    setSelectedBoardIndex(null);
    setGroupSelection([]);
    return true;
  }

  function setGroupVisibility(visible: boolean): boolean {
    const elements = corpusGroupVisibilityElements(project!.inspection.elements, groupSelection, visible);
    return elements ? applyGroupedElements(elements) : false;
  }

  function isolateGroup(): boolean {
    const elements = corpusIsolatedGroupElements(project!.inspection.elements, groupSelection);
    return elements ? applyGroupedElements(elements) : false;
  }

  function showAllRootElements(): boolean {
    return applyGroupedElements(corpusVisibleRootElements(project!.inspection.elements));
  }

  function resetWorkingCopy() {
    if (!window.confirm("Vratiti originalni projekat?\n\nSve izmjene u lokalnoj radnoj kopiji i sačuvani oporavak ove sesije biće uklonjeni. Izvorni S3D/E3D fajl na računaru ostaje netaknut.")) return;
    const original = project!.originalInspection;
    const standaloneE3dSource = original.format === "corpus-e3d" && original.elements[0]
      ? { sourceFile: project!.fileName, sourceXml: project!.sourceXml, originalElement: original.elements[0] }
      : null;
    setProject((current) => current ? { ...current, inspection: original, dirty: false, history: [], future: [], importedE3dSources: [], standaloneE3dSource } : current);
    setSelected(original.elements[0] ?? null);
    setSelectedBoardIndex(null);
    setGroupSelection([]);
    clearCorpusRecovery().then(() => {
      setRecovery(null);
      setRecoverySaveState("idle");
    }).catch(() => setRecoverySaveState("error"));
  }

  function undoWorkingCopy() {
    if (!project!.history.length) return;
    const selectionPath = selected ? findCorpusElementPath(project!.inspection.elements, selected) : null;
    const previous = project!.history[project!.history.length - 1]!;
    const history = project!.history.slice(0, -1);
    setProject((current) => current ? { ...current, inspection: previous.inspection, importedE3dSources: previous.importedE3dSources, standaloneE3dSource: previous.standaloneE3dSource, history, future: [...current.future, projectHistoryEntry(current)].slice(-100), dirty: previous.inspection !== current.originalInspection || previous.importedE3dSources.length > 0 } : current);
    const restoredSelection = selectionPath ? corpusElementAtPath(previous.inspection.elements, selectionPath) : null;
    const fallbackIndex = Math.min(selectionPath?.[0] ?? 0, previous.inspection.elements.length - 1);
    setSelected(restoredSelection ?? previous.inspection.elements[fallbackIndex] ?? previous.inspection.elements[0] ?? null);
    if (!restoredSelection) setSelectedBoardIndex(null);
    setGroupSelection((current) => current.filter((index) => index >= 0 && index < previous.inspection.elements.length));
  }

  function redoWorkingCopy() {
    if (!project!.future.length) return;
    const selectionPath = selected ? findCorpusElementPath(project!.inspection.elements, selected) : null;
    const next = project!.future[project!.future.length - 1]!;
    const future = project!.future.slice(0, -1);
    setProject((current) => current ? { ...current, inspection: next.inspection, importedE3dSources: next.importedE3dSources, standaloneE3dSource: next.standaloneE3dSource, history: appendProjectHistory(current), future, dirty: next.inspection !== current.originalInspection || next.importedE3dSources.length > 0 } : current);
    const restoredSelection = selectionPath ? corpusElementAtPath(next.inspection.elements, selectionPath) : null;
    const fallbackIndex = Math.min(selectionPath?.[0] ?? 0, next.inspection.elements.length - 1);
    setSelected(restoredSelection ?? next.inspection.elements[fallbackIndex] ?? next.inspection.elements[0] ?? null);
    if (!restoredSelection) setSelectedBoardIndex(null);
    setGroupSelection((current) => current.filter((index) => index >= 0 && index < next.inspection.elements.length));
  }

  function removeImportedElement() {
    const elements = project!.inspection.elements;
    const path = selected ? findCorpusElementPath(elements, selected) : null;
    const originalCount = project!.originalInspection.elements.length;
    if (!selected || !corpusElementAllowsModeling(selected) || !path || path.length !== 1 || path[0]! < originalCount) return;
    const rootIndex = path[0]!;
    if (!window.confirm(`Ukloniti dodani element „${selected.name || selected.code || `Element ${rootIndex + 1}`}“?\n\nElement i njegove ploče biće uklonjeni samo iz radne kopije. Izvorni S3D/E3D fajlovi ostaju netaknuti, a radnja se može vratiti jednim Undo korakom.`)) return;
    const importIndex = rootIndex - originalCount;
    const nextElements = elements.filter((_, index) => index !== rootIndex);
    setProject((current) => current ? {
      ...current,
      history: appendProjectHistory(current),
      future: [],
      inspection: { ...current.inspection, elements: nextElements },
      importedE3dSources: current.importedE3dSources.filter((_, index) => index !== importIndex),
      dirty: true,
    } : current);
    setSelected(nextElements[Math.min(rootIndex, nextElements.length - 1)] ?? null);
    setSelectedBoardIndex(null);
    setGroupSelection([]);
  }

  function duplicateImportedElement(count = 1, offset?: CorpusCopyOffset) {
    if (project!.inspection.format !== "corpus-s3d") return;
    const elements = project!.inspection.elements;
    const path = selected ? findCorpusElementPath(elements, selected) : null;
    const originalCount = project!.originalInspection.elements.length;
    if (!selected || !path || path.length !== 1) return;
    const rootIndex = path[0]!;
    const source = rootIndex < originalCount
      ? {
          sourceFile: `${selected.name || `Element-${rootIndex + 1}`}.E3D`,
          sourceXml: createCorpusE3dSourceFromS3d(project!.sourceXml, rootIndex),
          originalElement: project!.originalInspection.elements[rootIndex]!,
        }
      : project!.importedE3dSources[rootIndex - originalCount];
    if (!source) return;
    let copies: CorpusS3dElement[];
    try {
      copies = corpusLinearCopies(selected, count, offset ?? [Math.max(selected.width ?? 0, 100), 0, 0]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kopije elementa nije moguće napraviti.");
      return;
    }
    setProject((current) => current ? {
      ...current,
      history: appendProjectHistory(current),
      future: [],
      inspection: { ...current.inspection, elements: [...current.inspection.elements, ...copies] },
      importedE3dSources: [...current.importedE3dSources, ...copies.map(() => ({ ...source }))],
      dirty: true,
    } : current);
    setSelected(copies.at(-1) ?? selected);
    setSelectedBoardIndex(null);
    setGroupSelection([]);
  }

  function structuredE3dTarget(boardIndex?: number): { rootIndex: number; importIndex: number | null; source: CorpusE3dImportSource } | null {
    if (!project || !selected || !corpusElementAllowsModeling(selected)) return null;
    if (boardIndex !== undefined && !selected.boards[boardIndex]) return null;
    const path = findCorpusElementPath(project.inspection.elements, selected);
    if (!path || path.length !== 1) return null;
    if (project.inspection.format === "corpus-e3d") {
      return project.standaloneE3dSource ? { rootIndex: path[0]!, importIndex: null, source: project.standaloneE3dSource } : null;
    }
    const originalCount = project.originalInspection.elements.length;
    if (path[0]! < originalCount) return null;
    const importIndex = path[0]! - originalCount;
    const source = project.importedE3dSources[importIndex];
    return source ? { rootIndex: path[0]!, importIndex, source } : null;
  }

  function applyStructuredE3dSource(
    target: { rootIndex: number; importIndex: number | null; source: CorpusE3dImportSource },
    nextSourceXml: string,
    selectedBoard: number,
  ) {
    const nextElement = parseCorpusE3d(nextSourceXml).elements[0];
    if (!nextElement) throw new Error("Izmijenjeni E3D nema korijenski element.");
    const nextSource = { ...target.source, sourceXml: nextSourceXml, originalElement: nextElement };
    setProject((current) => current ? {
      ...current,
      history: appendProjectHistory(current),
      future: [],
      inspection: { ...current.inspection, elements: current.inspection.elements.map((element, index) => index === target.rootIndex ? nextElement : element) },
      importedE3dSources: target.importIndex === null
        ? current.importedE3dSources
        : current.importedE3dSources.map((entry, index) => index === target.importIndex ? nextSource : entry),
      standaloneE3dSource: target.importIndex === null ? nextSource : current.standaloneE3dSource,
      dirty: true,
    } : current);
    setSelected(nextElement);
    setSelectedBoardIndex(nextElement.boards.length ? Math.min(Math.max(0, selectedBoard), nextElement.boards.length - 1) : null);
    setError(null);
  }

  function applyBoardGroupModel(nextElement: CorpusS3dElement, nextSelectedBoard: number): boolean {
    if (!selected) return false;
    const result = replaceCorpusElement(project!.inspection.elements, selected, nextElement);
    if (!result.updated) return false;
    setProject((current) => current ? {
      ...current,
      history: appendProjectHistory(current),
      future: [],
      inspection: { ...current.inspection, elements: result.elements },
      dirty: true,
    } : current);
    setSelected(result.updated);
    setSelectedBoardIndex(result.updated.boards.length ? Math.min(Math.max(0, nextSelectedBoard), result.updated.boards.length - 1) : null);
    setError(null);
    return true;
  }

  function duplicateSelectedBoard(boardIndex: number) {
    const target = structuredE3dTarget(boardIndex);
    if (!target || !selected) return;
    try {
      const editedSource = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [selected]);
      const copyName = nextBoardCopyName(selected.boards[boardIndex]!.name, selected.boards.map((board) => board.name));
      const nextSourceXml = duplicateCorpusE3dBoard(editedSource, boardIndex, copyName);
      applyStructuredE3dSource(target, nextSourceXml, boardIndex + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ploču nije moguće udvostručiti.");
    }
  }

  function duplicateSelectedBoardArray(boardIndex: number, count: number, offset: CorpusCopyOffset) {
    const target = structuredE3dTarget(boardIndex);
    const board = selected?.boards[boardIndex];
    if (!target || !selected || !board) return;
    if (!Number.isInteger(count) || count < 1 || count > 50) return setError("Broj kopija ploče mora biti od 1 do 50.");
    if (board.position.some((value) => value === null || !Number.isFinite(value)) || offset.some((value) => !Number.isFinite(value))) {
      return setError("Ploča i korak niza moraju imati potpune koordinate.");
    }
    try {
      const editedSource = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [selected]);
      const names = selected.boards.map((entry) => entry.name);
      const copies = Array.from({ length: count }, (_, index) => {
        const name = nextBoardCopyName(board.name, names);
        names.push(name);
        return {
          name,
          position: board.position.map((value, axis) => Number((value! + offset[axis]! * (index + 1)).toFixed(3))) as [number, number, number],
        };
      });
      const nextSourceXml = duplicateCorpusE3dBoardCopies(editedSource, boardIndex, copies);
      applyStructuredE3dSource(target, nextSourceXml, boardIndex + count);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Niz ploča nije moguće napraviti.");
    }
  }

  function duplicateSelectedBoardGrid(boardIndex: number, columns: number, rows: number, columnStep: CorpusCopyOffset, rowStep: CorpusCopyOffset): boolean {
    const target = structuredE3dTarget(boardIndex);
    const board = selected?.boards[boardIndex];
    if (!target || !selected || !board) return false;
    if (board.position.some((value) => value === null || !Number.isFinite(value))) {
      setError("Ploča mora imati potpune X/Y/Z koordinate.");
      return false;
    }
    try {
      const offsets = corpusGridCopyOffsets(columns, rows, columnStep, rowStep);
      const editedSource = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [selected]);
      const names = selected.boards.map((entry) => entry.name);
      const copies = offsets.map((offset) => {
        const name = nextBoardCopyName(board.name, names);
        names.push(name);
        return {
          name,
          position: board.position.map((value, axis) => Number((value! + offset[axis]!).toFixed(3))) as [number, number, number],
        };
      });
      const nextSourceXml = duplicateCorpusE3dBoardCopies(editedSource, boardIndex, copies);
      applyStructuredE3dSource(target, nextSourceXml, boardIndex + copies.length);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Mrežu ploča nije moguće napraviti.");
      return false;
    }
  }

  function translateSelectedBoards(boardIndexes: readonly number[], delta: CorpusCopyOffset): boolean {
    const target = structuredE3dTarget();
    if (!selected) return false;
    try {
      const translated = corpusTranslatedBoards(selected, boardIndexes, delta);
      if (!target) return applyBoardGroupModel(translated, selectedBoardIndex ?? boardIndexes[0] ?? 0);
      const nextSourceXml = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [translated]);
      applyStructuredE3dSource(target, nextSourceXml, selectedBoardIndex ?? boardIndexes[0] ?? 0);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Označene ploče nije moguće pomjeriti.");
      return false;
    }
  }

  function translateSelectedBoard(boardIndex: number, delta: CorpusCopyOffset): boolean {
    const target = structuredE3dTarget(boardIndex);
    if (!selected) return false;
    try {
      const translated = corpusTranslatedBoard(selected, boardIndex, delta);
      if (!target) return applyBoardGroupModel(translated, boardIndex);
      const nextSourceXml = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [translated]);
      applyStructuredE3dSource(target, nextSourceXml, boardIndex);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Aktivnu ploču nije moguće pomjeriti.");
      return false;
    }
  }

  function distributeSelectedBoards(boardIndexes: readonly number[], axis: CorpusBoardGroupAxis): number | null {
    const target = structuredE3dTarget();
    if (!selected) return null;
    try {
      const distribution = corpusEvenlyDistributedBoards(selected, boardIndexes, axis);
      if (!target) return applyBoardGroupModel(distribution.element, selectedBoardIndex ?? boardIndexes[0] ?? 0) ? distribution.gap : null;
      const nextSourceXml = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [distribution.element]);
      applyStructuredE3dSource(target, nextSourceXml, selectedBoardIndex ?? boardIndexes[0] ?? 0);
      return distribution.gap;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Označene ploče nije moguće rasporediti.");
      return null;
    }
  }

  function alignSelectedBoards(boardIndexes: readonly number[], axis: CorpusBoardGroupAxis, alignment: CorpusBoardGroupAlignment): boolean {
    const target = structuredE3dTarget();
    if (!selected) return false;
    try {
      const aligned = corpusAlignedBoardsToAnchor(selected, boardIndexes, axis, alignment);
      if (!target) return applyBoardGroupModel(aligned, selectedBoardIndex ?? boardIndexes[0] ?? 0);
      const nextSourceXml = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [aligned]);
      applyStructuredE3dSource(target, nextSourceXml, selectedBoardIndex ?? boardIndexes[0] ?? 0);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Označene ploče nije moguće poravnati.");
      return false;
    }
  }

  function placeSelectedBoards(boardIndexes: readonly number[], axis: CorpusBoardGroupAxis, alignment: CorpusBoardGroupAlignment, inset: number): boolean {
    const target = structuredE3dTarget();
    if (!selected) return false;
    try {
      const placed = corpusPlacedBoardsInElement(selected, boardIndexes, axis, alignment, inset);
      if (!target) return applyBoardGroupModel(placed.element, selectedBoardIndex ?? boardIndexes[0] ?? 0);
      const nextSourceXml = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [placed.element]);
      applyStructuredE3dSource(target, nextSourceXml, selectedBoardIndex ?? boardIndexes[0] ?? 0);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Označene ploče nije moguće postaviti u omotač elementa.");
      return false;
    }
  }

  function duplicateSelectedBoards(boardIndexes: readonly number[], delta: CorpusCopyOffset): boolean {
    const target = structuredE3dTarget();
    if (!target || !selected) return false;
    try {
      const translated = corpusTranslatedBoards(selected, boardIndexes, delta);
      const names = selected.boards.map((board) => board.name);
      const copies = [...new Set(boardIndexes)].sort((left, right) => left - right).map((boardIndex) => {
        const board = translated.boards[boardIndex]!;
        const name = nextBoardCopyName(selected.boards[boardIndex]!.name, names);
        names.push(name);
        return { boardIndex, name, position: board.position as readonly [number, number, number] };
      });
      const editedSource = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [selected]);
      const nextSourceXml = duplicateCorpusE3dBoards(editedSource, copies);
      applyStructuredE3dSource(target, nextSourceXml, copies[0]!.boardIndex + 1);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Označene ploče nije moguće kopirati.");
      return false;
    }
  }

  function removeSelectedBoards(boardIndexes: readonly number[]): boolean {
    const target = structuredE3dTarget();
    if (!target || !selected) return false;
    const indexes = [...new Set(boardIndexes)].sort((left, right) => left - right);
    if (indexes.length < 2) {
      setError("Za grupno uklanjanje označi najmanje dvije ploče.");
      return false;
    }
    if (indexes.length >= selected.boards.length) {
      setError("Element mora zadržati najmanje jednu ploču.");
      return false;
    }
    if (!window.confirm(`Ukloniti ${indexes.length} označene ploče?\n\nNjihove konture, rupe i obrade biće uklonjene samo iz radne kopije. Izvorni fajl ostaje netaknut, a radnja se može vratiti jednim Undo korakom.`)) return false;
    try {
      const editedSource = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [selected]);
      const nextSourceXml = removeCorpusE3dBoards(editedSource, indexes);
      applyStructuredE3dSource(target, nextSourceXml, Math.max(0, indexes[0]! - 1));
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Označene ploče nije moguće ukloniti.");
      return false;
    }
  }

  function applySelectedBoardAppearance(boardIndexes: readonly number[], sourceBoardIndex: number): boolean {
    const target = structuredE3dTarget(sourceBoardIndex);
    if (!selected) return false;
    try {
      const updated = corpusAppliedBoardAppearance(selected, boardIndexes, sourceBoardIndex);
      if (!target) return applyBoardGroupModel(updated, sourceBoardIndex);
      const nextSourceXml = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [updated]);
      applyStructuredE3dSource(target, nextSourceXml, sourceBoardIndex);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Izgled aktivne ploče nije moguće primijeniti na označene ploče.");
      return false;
    }
  }

  function setSelectedBoardsVisibility(boardIndexes: readonly number[], visible: boolean): boolean {
    const target = structuredE3dTarget(selectedBoardIndex ?? boardIndexes[0] ?? 0);
    if (!selected) return false;
    try {
      const updated = corpusSetBoardsVisibility(selected, boardIndexes, visible);
      if (!target) return applyBoardGroupModel(updated, selectedBoardIndex ?? boardIndexes[0] ?? 0);
      const nextSourceXml = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [updated]);
      applyStructuredE3dSource(target, nextSourceXml, selectedBoardIndex ?? boardIndexes[0] ?? 0);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Vidljivost označenih ploča nije moguće promijeniti.");
      return false;
    }
  }

  function distributeSelectedBoardArray(boardIndex: number, copiesCount: number, axis: CorpusBoardPlacementAxis, inset: number): boolean {
    const target = structuredE3dTarget(boardIndex);
    const board = selected?.boards[boardIndex];
    if (!target || !selected || !board) return false;
    const distribution = corpusEvenBoardPositions(selected, board, copiesCount + 1, axis, inset);
    if (!distribution.ok) {
      setError(distribution.reason);
      return false;
    }
    try {
      const editedSource = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [selected]);
      const names = selected.boards.map((entry) => entry.name);
      const copies = distribution.positions.slice(1).map((position) => {
        const name = nextBoardCopyName(board.name, names);
        names.push(name);
        return { name, position };
      });
      const expandedSource = duplicateCorpusE3dBoardCopies(editedSource, boardIndex, copies);
      const expandedElement = parseCorpusE3d(expandedSource).elements[0];
      if (!expandedElement) throw new Error("Prošireni E3D nema korijenski element.");
      const positionedElement = {
        ...expandedElement,
        boards: expandedElement.boards.map((entry, index) => {
          if (index < boardIndex || index > boardIndex + copiesCount) return entry;
          return { ...entry, position: distribution.positions[index - boardIndex]! };
        }),
      };
      const nextSourceXml = writeCorpusE3dGeometryCopy(expandedSource, [expandedElement], [positionedElement]);
      applyStructuredE3dSource(target, nextSourceXml, boardIndex + copiesCount);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ploče nije moguće ravnomjerno rasporediti.");
      return false;
    }
  }

  function removeSelectedBoard(boardIndex: number) {
    const target = structuredE3dTarget(boardIndex);
    const board = selected?.boards[boardIndex];
    if (!target || !selected || !board || selected.boards.length <= 1) return;
    if (!window.confirm(`Ukloniti ploču „${board.name || `Ploča ${boardIndex + 1}`}“?\n\nPloča, njena kontura, rupe i obrade biće uklonjene iz radne kopije. Izvorni fajl ostaje netaknut.`)) return;
    try {
      const editedSource = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [selected]);
      const nextSourceXml = removeCorpusE3dBoard(editedSource, boardIndex);
      applyStructuredE3dSource(target, nextSourceXml, Math.max(0, boardIndex - 1));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ploču nije moguće ukloniti.");
    }
  }

  function addBoardToSelectedElement(spec: CorpusNewBoardSpec) {
    const target = structuredE3dTarget();
    if (!target || !selected) return;
    try {
      const editedSource = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [selected]);
      const nextSourceXml = appendCorpusE3dBoard(editedSource, {
        ...spec,
        name: nextUniqueName(spec.name.trim(), selected.boards.map((board) => board.name)),
      });
      applyStructuredE3dSource(target, nextSourceXml, Number.MAX_SAFE_INTEGER);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Novu ploču nije moguće dodati.");
    }
  }

  function renameSelectedBoard(boardIndex: number, name: string) {
    const target = structuredE3dTarget(boardIndex);
    if (!target || !selected) return;
    try {
      const editedSource = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [selected]);
      const nextSourceXml = renameCorpusE3dBoard(editedSource, boardIndex, name);
      applyStructuredE3dSource(target, nextSourceXml, boardIndex);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Naziv ploče nije moguće promijeniti.");
    }
  }

  function moveSelectedBoard(boardIndex: number, direction: -1 | 1) {
    const target = structuredE3dTarget(boardIndex);
    const toIndex = boardIndex + direction;
    if (!target || !selected || toIndex < 0 || toIndex >= selected.boards.length) return;
    const board = selected.boards[boardIndex]!;
    if (!window.confirm(`Promijeniti redoslijed ploče „${board.name || `Ploča ${boardIndex + 1}`}“?\n\nRedoslijed ploča može uticati na Corpus OBJ1/OBJ2 makro reference. Izvorni fajl ostaje netaknut, a radnja se može vratiti jednim Undo korakom.`)) return;
    try {
      const editedSource = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [selected]);
      const nextSourceXml = moveCorpusE3dBoard(editedSource, boardIndex, toIndex);
      applyStructuredE3dSource(target, nextSourceXml, toIndex);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Redoslijed ploča nije moguće promijeniti.");
    }
  }

  function updateSelectedBoardContour(boardIndex: number, points: readonly CorpusStraightContourPoint[]) {
    const target = structuredE3dTarget(boardIndex);
    if (!target || !selected) return;
    try {
      const editedSource = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [selected]);
      const nextSourceXml = replaceCorpusE3dBoardContour(editedSource, boardIndex, points);
      applyStructuredE3dSource(target, nextSourceXml, boardIndex);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Konturu ploče nije moguće promijeniti.");
    }
  }

  function updateSelectedBoardEdgeBanding(boardIndex: number, spec: CorpusEdgeBandingSpec) {
    const target = structuredE3dTarget(boardIndex);
    if (!target || !selected) return;
    try {
      const editedSource = writeCorpusE3dGeometryCopy(target.source.sourceXml, [target.source.originalElement], [selected]);
      const nextSourceXml = replaceCorpusE3dBoardEdgeBanding(editedSource, boardIndex, spec);
      applyStructuredE3dSource(target, nextSourceXml, boardIndex);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Rubnu obradu nije moguće promijeniti.");
    }
  }

  function exportWorkingCopy() {
    const sidecar = createProjectWorkingCopy(project!);
    downloadText(
      `${project!.fileName.replace(/\.(?:s3d|e3d)$/i, "")}.ivertim-corpus.json`,
      `${JSON.stringify(sidecar, null, 2)}\n`,
      "application/json",
    );
  }

  function exportS3dCopy() {
    try {
      const isE3d = project!.inspection.format === "corpus-e3d";
      const xml = isE3d
        ? (() => {
            const source = project!.standaloneE3dSource;
            if (!source) throw new Error("Samostalni E3D izvor nije dostupan.");
            return writeCorpusE3dGeometryCopy(source.sourceXml, [source.originalElement], project!.inspection.elements);
          })()
        : writeCorpusS3dWithImportedElements(
          project!.sourceXml,
          project!.originalInspection.elements,
          project!.inspection.elements,
          project!.importedE3dSources.slice(0, project!.inspection.elements.length - project!.originalInspection.elements.length),
          { original: project!.originalInspection.room, current: project!.inspection.room },
        );
      const extension = isE3d ? "E3D" : "S3D";
      downloadText(`${project!.fileName.replace(/\.(?:s3d|e3d)$/i, "")}-IVERTIM.${extension}`, xml, "application/xml");
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Novu Corpus kopiju nije moguće napraviti.");
    }
  }

  function exportSelectedE3d() {
    if (!selected) return;
    if (project!.inspection.format === "corpus-e3d") {
      exportS3dCopy();
      return;
    }
    const path = findCorpusElementPath(project!.inspection.elements, selected);
    const originalCount = project!.originalInspection.elements.length;
    if (!path || path.length !== 1 || path[0]! < originalCount) return;
    const source = project!.importedE3dSources[path[0]! - originalCount];
    if (!source) return;
    try {
      const xml = writeCorpusE3dGeometryCopy(source.sourceXml, [source.originalElement], [selected]);
      const name = source.sourceFile.replace(/\.e3d$/i, "").replace(/[\\/]/g, "-");
      downloadText(`${name}-IVERTIM.E3D`, xml, "application/xml");
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Izabrani E3D nije moguće izvesti.");
    }
  }

  function exportCutList(result = cutList, groupOnly = false) {
    const stem = project!.fileName.replace(/\.(?:s3d|e3d)$/i, "");
    downloadText(`${stem}${groupOnly ? "-OZNACENA-GRUPA" : ""}-KROJNA-LISTA.csv`, corpusCutListCsv(result), "text/csv;charset=utf-8");
  }

  function exportConsumables(items: readonly CorpusConsumableItem[] = consumablesList, groupOnly = false) {
    const stem = project!.fileName.replace(/\.(?:s3d|e3d)$/i, "");
    downloadText(`${stem}${groupOnly ? "-OZNACENA-GRUPA" : ""}-POTROSNI-MATERIJAL.csv`, corpusConsumablesCsv(items), "text/csv;charset=utf-8");
  }

  async function importE3dElement(file: File | undefined) {
    if (!file || project!.inspection.format !== "corpus-s3d") return;
    try {
      const sourceXml = await file.text();
      addE3dSource(libraryFilePath(file), sourceXml);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "E3D element nije moguće dodati projektu.");
    } finally {
      if (e3dImportInputRef.current) e3dImportInputRef.current.value = "";
    }
  }

  function addE3dSource(sourceFile: string, sourceXml: string) {
    const inspection = parseCorpusE3d(sourceXml);
    if (inspection.elements.length !== 1) throw new Error("E3D za uvoz mora sadržati tačno jedan korijenski element.");
    const imported = inspection.elements[0]!;
    setProject((current) => current ? {
      ...current,
      history: appendProjectHistory(current),
      future: [],
      inspection: { ...current.inspection, elements: [...current.inspection.elements, imported] },
      importedE3dSources: [
        ...current.importedE3dSources.slice(0, current.inspection.elements.length - current.originalInspection.elements.length),
        { sourceFile, sourceXml, originalElement: imported },
      ],
      dirty: true,
    } : current);
    setSelected(imported);
    setSelectedBoardIndex(null);
    setGroupSelection([]);
    setLibraryOpen(false);
    setError(null);
  }

  function createCabinet(spec: CorpusCabinetSpec) {
    try {
      const generated = generateCorpusCabinetE3d(spec);
      addE3dSource(generated.fileName, generated.sourceXml);
      setGeneratorOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Osnovni korpus nije moguće napraviti.");
    }
  }

  function createElement(spec: CorpusElementSpec) {
    try {
      const generated = generateCorpusElementE3d(spec);
      addE3dSource(generated.fileName, generated.sourceXml);
      setElementCreatorOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Novi element nije moguće napraviti.");
    }
  }

  function loadElementLibrary(files: FileList | null) {
    if (!files) return;
    const e3dFiles = Array.from(files)
      .filter((file) => file.name.toLocaleLowerCase().endsWith(".e3d"))
      .sort((left, right) => libraryFilePath(left).localeCompare(libraryFilePath(right), "hr"));
    setLibraryFiles(e3dFiles);
    setLibraryQuery("");
    setLibraryOpen(true);
    setError(e3dFiles.length ? null : "Izabrani folder ne sadrži E3D elemente.");
    if (libraryInputRef.current) libraryInputRef.current.value = "";
  }

  function loadMacroLibrary(files: FileList | null) {
    if (!files) return;
    const cmkFiles = Array.from(files)
      .filter((file) => file.name.toLocaleLowerCase().endsWith(".cmk"))
      .sort((left, right) => libraryFilePath(left).localeCompare(libraryFilePath(right), "hr"));
    setMacroFiles(cmkFiles);
    setMacroQuery("");
    setSelectedMacro(null);
    setMacroLibraryOpen(true);
    setError(cmkFiles.length ? null : "Izabrani folder ne sadrži CMK makroe.");
    if (macroLibraryInputRef.current) macroLibraryInputRef.current.value = "";
  }

  async function loadMaterialLibrary(files: FileList | null) {
    if (!files) return;
    try {
      const allFiles = Array.from(files);
      const catalogs = await Promise.all(allFiles
        .filter((file) => /^matdat\.(?:mxc|k3x)$/i.test(file.name))
        .map(async (file) => parseCorpusMaterialCatalog(await file.text(), libraryFilePath(file))));
      if (!catalogs.length) throw new Error("Izabrani folder ne sadrži MatDat.MXC/K3X kataloge.");
      const filesByPath = new Map(allFiles.map((file) => [normalizeLibraryPath(libraryFilePath(file)), file]));
      const index = createCorpusMaterialIndex(catalogs);
      const textureByUid = new Map<string, MaterialTextureSource>();
      const resolutionByUid = new Map<string, MaterialResolution>();
      let ambiguousUids = 0;
      let missingPictures = 0;
      for (const [uid, records] of index.byUid) {
        if (records.length !== 1) {
          ambiguousUids += 1;
          resolutionByUid.set(uid, { kind: "ambiguous", candidates: records.length });
          continue;
        }
        const record = records[0]!;
        const picture = resolveCorpusMaterialPicturePath(record.sourceCatalog, record.pictureFile);
        if (!picture.ok) {
          missingPictures += 1;
          resolutionByUid.set(uid, { kind: "missing-picture", name: record.name, pictureFile: record.pictureFile, reason: picture.reason });
          continue;
        }
        const file = filesByPath.get(normalizeLibraryPath(picture.relativePath));
        if (!file) {
          missingPictures += 1;
          resolutionByUid.set(uid, { kind: "missing-picture", name: record.name, pictureFile: record.pictureFile, reason: "Slika nije pronađena u izabranom folderu" });
          continue;
        }
        const source = { file, name: record.name, textureSize: record.textureSize };
        textureByUid.set(uid, source);
        resolutionByUid.set(uid, { kind: "ready", source });
      }
      const firstPath = allFiles[0] ? libraryFilePath(allFiles[0]) : "elmtex";
      setMaterialLibrary({
        folderName: firstPath.split("/")[0] || "elmtex", catalogCount: catalogs.length,
        recordCount: catalogs.reduce((sum, catalog) => sum + catalog.records.length, 0),
        textureByUid, resolutionByUid, ambiguousUids, missingPictures,
      });
      setError(null);
    } catch (reason) {
      setMaterialLibrary(null);
      setError(reason instanceof Error ? reason.message : "Katalog materijala nije moguće učitati.");
    } finally {
      if (materialLibraryInputRef.current) materialLibraryInputRef.current.value = "";
    }
  }

  async function inspectMacro(file: File) {
    try {
      const text = decodeCorpusText(new Uint8Array(await file.arrayBuffer()));
      setSelectedMacro({ path: libraryFilePath(file), document: parseCorpusCmk(text) });
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "CMK makro nije moguće pročitati.");
    }
  }

  async function importWorkingCopy(file: File | undefined) {
    if (!file) return;
    try {
      const selectionPath = selected ? findCorpusElementPath(project!.inspection.elements, selected) : null;
      const imported = applyCorpusWorkingCopyProject(project!.fileName, project!.originalInspection.elements, project!.originalInspection.room, JSON.parse(await file.text()));
      const elements = imported.elements;
      setProject((current) => current ? {
        ...current,
        history: [projectHistoryEntry(current)],
        future: [],
        inspection: { ...current.originalInspection, elements, room: imported.room },
        importedE3dSources: imported.importedE3dSources,
        standaloneE3dSource: imported.standaloneE3dSource ?? current.standaloneE3dSource,
        dirty: true,
      } : current);
      setSelected(selectionPath ? corpusElementAtPath(elements, selectionPath) : elements[0] ?? null);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Radnu kopiju nije moguće otvoriti.");
    } finally {
      if (workingCopyInputRef.current) workingCopyInputRef.current.value = "";
    }
  }

  return (
    <MaterialLibraryContext.Provider value={materialLibrary}>
    <div className={`app-shell ${viewMode === "data" ? "element-editor-mode" : ""}`}>
      <header className="topbar">
        <Brand compact />
        <div className="file-identity">
          <strong>{project.fileName}</strong>
          <span>{project.inspection.format === "corpus-e3d" ? "E3D" : "S3D"} v{project.inspection.version || "?"} · {formatBytes(project.fileSize)}{project.dirty ? " · radna kopija izmijenjena" : ""}</span>
          {project.dirty && <small className={`recovery-indicator ${recoverySaveState}`}>{recoverySaveState === "saving" ? "Čuvam lokalni oporavak…" : recoverySaveState === "saved" ? "Lokalni oporavak sačuvan" : recoverySaveState === "error" ? "Oporavak nije sačuvan" : "Pripremam lokalni oporavak…"}</small>}
        </div>
        <nav className="view-switch" aria-label="Prikaz projekta">
          <button aria-current={viewMode === "drawing" ? "page" : undefined} className={viewMode === "drawing" ? "active" : ""} onClick={() => setViewMode("drawing")}>Nacrt</button>
          <button aria-current={viewMode === "threeD" ? "page" : undefined} className={viewMode === "threeD" ? "active" : ""} onClick={() => { setSelectedBoardIndex(null); setBoardGroupSelection([]); setViewMode("threeD"); }}>3D</button>
          <button aria-current={viewMode === "data" ? "page" : undefined} className={viewMode === "data" ? "active" : ""} onClick={() => setViewMode("data")}>Editor</button>
          <button aria-current={viewMode === "cutlist" ? "page" : undefined} className={viewMode === "cutlist" ? "active" : ""} onClick={() => setViewMode("cutlist")}>Krojna</button>
          {project.inspection.format === "corpus-s3d" && <button aria-current={viewMode === "room" ? "page" : undefined} className={viewMode === "room" ? "active" : ""} onClick={() => setViewMode("room")}>Prostorija</button>}
        </nav>
        <div className="topbar-actions" aria-label="Glavne komande projekta">
          <button className="secondary-button" aria-keyshortcuts="Control+Z Meta+Z" disabled={!project.history.length} onClick={undoWorkingCopy} title={`Poništi zadnju izmjenu · Ctrl+Z${project.history.length ? ` · ${project.history.length} koraka dostupno` : ""}`}>↶ Undo</button>
          <button className="secondary-button" aria-keyshortcuts="Control+Y Control+Shift+Z Meta+Shift+Z" disabled={!project.future.length} onClick={redoWorkingCopy} title={`Vrati poništenu izmjenu · Ctrl+Y / Ctrl+Shift+Z${project.future.length ? ` · ${project.future.length} koraka dostupno` : ""}`}>↷ Redo</button>
          {project.inspection.format === "corpus-s3d" && (
            <details ref={addMenuRef} className="command-menu command-menu-new">
              <summary>＋ Dodaj</summary>
              <div>
                <button aria-label="Novi korpus — parametarski element namještaja" onClick={() => {
                  addMenuRef.current?.removeAttribute("open");
                  setGeneratorOpen(true);
                }}><strong>Novi korpus</strong><span>Parametarski element namještaja</span></button>
                <button aria-label="Novi element — prazan element sa početnom pločom" onClick={() => {
                  addMenuRef.current?.removeAttribute("open");
                  setElementCreatorOpen(true);
                }}><strong>Novi element</strong><span>Prazan element sa početnom pločom</span></button>
                <button aria-label="Dodaj E3D fajl — uvezi jedan postojeći element" onClick={() => {
                  addMenuRef.current?.removeAttribute("open");
                  e3dImportInputRef.current?.click();
                }}><strong>Dodaj E3D fajl</strong><span>Uvezi jedan postojeći element</span></button>
              </div>
            </details>
          )}
          <button className="primary-command" onClick={() => inputRef.current?.click()}>Otvori projekat</button>
          <details ref={moreMenuRef} className="command-menu">
            <summary>Više</summary>
            <div>
              {project.dirty && <button aria-label={`Izvezi novi ${project.inspection.format === "corpus-e3d" ? "E3D" : "S3D"} — izvorni fajl ostaje netaknut`} onClick={() => {
                moreMenuRef.current?.removeAttribute("open");
                exportS3dCopy();
              }}><strong>Izvezi novi {project.inspection.format === "corpus-e3d" ? "E3D" : "S3D"}</strong><span>Corpus radna kopija</span></button>}
              {project.dirty && <button aria-label="Sačuvaj radnu kopiju — IVERTIM Corpus JSON" onClick={() => {
                moreMenuRef.current?.removeAttribute("open");
                exportWorkingCopy();
              }}><strong>Sačuvaj radnu kopiju</strong><span>IVERTIM Corpus JSON</span></button>}
              {project.dirty && <button className="command-danger" aria-label="Vrati originalni projekat — ukloni izmjene iz radne kopije" onClick={() => {
                moreMenuRef.current?.removeAttribute("open");
                resetWorkingCopy();
              }}><strong>Vrati originalni projekat</strong><span>Ukloni izmjene iz radne kopije</span></button>}
              {project.inspection.format === "corpus-s3d" && <button aria-label={`${libraryFiles.length ? `Biblioteka (${libraryFiles.length})` : "Učitaj E3D biblioteku"} — lokalni Elmsav elementi`} onClick={() => {
                moreMenuRef.current?.removeAttribute("open");
                libraryFiles.length ? setLibraryOpen(true) : libraryInputRef.current?.click();
              }}><strong>{libraryFiles.length ? `Biblioteka (${libraryFiles.length})` : "Učitaj E3D biblioteku"}</strong><span>Lokalni Elmsav elementi</span></button>}
              <button aria-label={`${macroFiles.length ? `Makroi (${macroFiles.length})` : "Učitaj Makro folder"} — lokalni CMK sadržaj`} onClick={() => {
                moreMenuRef.current?.removeAttribute("open");
                macroFiles.length ? setMacroLibraryOpen(true) : macroLibraryInputRef.current?.click();
              }}><strong>{macroFiles.length ? `Makroi (${macroFiles.length})` : "Učitaj Makro folder"}</strong><span>Lokalni CMK sadržaj</span></button>
              <button aria-label={`${materialLibrary ? `Teksture (${projectTextureMatches})` : "Učitaj teksture"} — Corpus elmtex katalog`} onClick={() => {
                moreMenuRef.current?.removeAttribute("open");
                materialLibraryInputRef.current?.click();
              }} title={materialLibrary ? `${materialLibrary.recordCount} zapisa · ${materialLibrary.textureByUid.size} jednoznačnih slika · ${projectTextureMatches} ploča u projektu` : "Izaberi lokalni Corpus elmtex folder; ništa se ne šalje niti mijenja"}><strong>{materialLibrary ? `Teksture (${projectTextureMatches})` : "Učitaj teksture"}</strong><span>Corpus elmtex katalog</span></button>
              <button aria-label="Učitaj radnu kopiju — IVERTIM Corpus JSON" onClick={() => {
                moreMenuRef.current?.removeAttribute("open");
                workingCopyInputRef.current?.click();
              }}><strong>Učitaj radnu kopiju</strong><span>IVERTIM Corpus JSON</span></button>
            </div>
          </details>
        </div>
        <input ref={inputRef} hidden type="file" accept=".s3d,.S3D,.e3d,.E3D,application/xml,text/xml" onChange={(event) => openFile(event.target.files?.[0])} />
        <input ref={workingCopyInputRef} hidden type="file" accept=".json,application/json" onChange={(event) => importWorkingCopy(event.target.files?.[0])} />
        <input ref={e3dImportInputRef} hidden type="file" accept=".e3d,.E3D,application/xml,text/xml" onChange={(event) => importE3dElement(event.target.files?.[0])} />
        <input
          ref={(node) => {
            libraryInputRef.current = node;
            node?.setAttribute("webkitdirectory", "");
            node?.setAttribute("directory", "");
          }}
          hidden
          multiple
          type="file"
          accept=".e3d,.E3D"
          onChange={(event) => loadElementLibrary(event.target.files)}
        />
        <input
          ref={(node) => {
            macroLibraryInputRef.current = node;
            node?.setAttribute("webkitdirectory", "");
            node?.setAttribute("directory", "");
          }}
          hidden
          multiple
          type="file"
          accept=".cmk,.CMK"
          onChange={(event) => loadMacroLibrary(event.target.files)}
        />
        <input
          ref={(node) => {
            materialLibraryInputRef.current = node;
            node?.setAttribute("webkitdirectory", "");
            node?.setAttribute("directory", "");
          }}
          hidden
          multiple
          type="file"
          onChange={(event) => loadMaterialLibrary(event.target.files)}
        />
      </header>

      {libraryOpen && project.inspection.format === "corpus-s3d" && (
        <div className="library-backdrop" role="presentation" onMouseDown={() => setLibraryOpen(false)}>
          <section className="library-panel" role="dialog" aria-modal="true" aria-label="E3D biblioteka elemenata" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><p className="eyebrow">Lokalni Elmsav</p><h2>Biblioteka elemenata</h2></div>
              <button aria-label="Zatvori biblioteku" onClick={() => setLibraryOpen(false)}>×</button>
            </header>
            <div className="library-tools">
              <label className="search-box"><span>⌕</span><input autoFocus value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="Traži element ili folder…" /></label>
              <button className="secondary-button" onClick={() => libraryInputRef.current?.click()}>Promijeni folder</button>
            </div>
            <p className="library-summary">{libraryFiles.length} E3D fajlova · prikazano {visibleLibraryFiles.length}{visibleLibraryFiles.length === 100 ? " (upiši užu pretragu)" : ""}</p>
            <div className="library-list">
              {visibleLibraryFiles.map((file) => {
                const path = libraryFilePath(file);
                const parts = path.split("/");
                return <button key={path} onClick={() => importE3dElement(file)}><span><strong>{file.name.replace(/\.e3d$/i, "")}</strong><small>{parts.slice(0, -1).join(" / ") || "Korijenski folder"}</small></span><i>Dodaj</i></button>;
              })}
              {!visibleLibraryFiles.length && <p className="no-results">Nema E3D elemenata za ovu pretragu.</p>}
            </div>
          </section>
        </div>
      )}

      {macroLibraryOpen && (
        <div className="library-backdrop" role="presentation" onMouseDown={() => setMacroLibraryOpen(false)}>
          <section className="library-panel macro-library-panel" role="dialog" aria-modal="true" aria-label="Corpus biblioteka makroa" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><p className="eyebrow">Lokalni Makro folder</p><h2>CMK makroi za bušenje i veze</h2></div>
              <button aria-label="Zatvori biblioteku makroa" onClick={() => setMacroLibraryOpen(false)}>×</button>
            </header>
            <div className="library-tools">
              <label className="search-box"><span>⌕</span><input autoFocus value={macroQuery} onChange={(event) => setMacroQuery(event.target.value)} placeholder="Traži makro ili podfolder…" /></label>
              <button className="secondary-button" onClick={() => macroLibraryInputRef.current?.click()}>Promijeni folder</button>
            </div>
            <p className="library-summary">{macroFiles.length} CMK fajlova · prikazano {visibleMacroFiles.length}{visibleMacroFiles.length === 100 ? " (upiši užu pretragu)" : ""} · analiza ne izvršava formule</p>
            <div className="macro-library-body">
              <div className="library-list">
                {visibleMacroFiles.map((file) => {
                  const path = libraryFilePath(file);
                  const parts = path.split("/");
                  return <button key={path} aria-current={selectedMacro?.path === path ? "true" : undefined} className={selectedMacro?.path === path ? "active" : ""} onClick={() => inspectMacro(file)}><span><strong>{file.name.replace(/\.cmk$/i, "")}</strong><small>{parts.slice(0, -1).join(" / ") || "Korijenski folder"} · {formatBytes(file.size)}</small></span><i>Pregled</i></button>;
                })}
                {!visibleMacroFiles.length && <p className="no-results">Nema CMK makroa za ovu pretragu.</p>}
              </div>
              <div className="macro-library-detail">
                {!selectedMacro && <p className="no-results">Izaberi makro da vidiš sekcije, formule i zavisnosti.</p>}
                {selectedMacro && <MacroDocumentDetails key={selectedMacro.path} macro={selectedMacro} element={selected} onApplyHoles={updateSelectedBoardHoles} />}
              </div>
            </div>
          </section>
        </div>
      )}

      {generatorOpen && project.inspection.format === "corpus-s3d" && (
        <CabinetGeneratorDialog onCreate={createCabinet} onClose={() => setGeneratorOpen(false)} />
      )}

      {elementCreatorOpen && project.inspection.format === "corpus-s3d" && (
        <ElementCreatorDialog onCreate={createElement} onClose={() => setElementCreatorOpen(false)} />
      )}

      {viewMode !== "data" && <section className="summary-strip">
        <Metric label="Prostorija" value={`${formatNumber(project.inspection.room.width)} × ${formatNumber(project.inspection.room.length)} m`} />
        <Metric label="Visina" value={`${formatNumber(corpusRoomTotalHeight(project.inspection.room.height, project.inspection.room.lowerHeight))} m`} />
        <Metric label="Elemenata" value={String(allElements.length)} />
        <Metric label="Ploča" value={String(boards)} />
        <Metric label="Potrošnih stavki" value={String(consumables)} />
        <Metric label="Provjera rasporeda" value={layoutIssues.length ? `${layoutIssues.length} upozorenja` : "Bez preklapanja"} warning={layoutIssues.length > 0} title={layoutIssues.map(({ message }) => message).join("\n")} />
      </section>}

      <main className={`workspace ${viewMode === "drawing" || viewMode === "threeD" ? "canvas-workspace" : ""} ${viewMode === "data" ? "element-editor-workspace" : ""}`}>
        {viewMode === "data" && selected ? <ElementEditorSidebar element={selected} selectedBoardIndex={selectedBoardIndex} onSelectBoard={(boardIndex) => { setSelectedBoardIndex(boardIndex); if (boardIndex === null) setBoardGroupSelection([]); }} onBack={() => { setSelectedBoardIndex(null); setBoardGroupSelection([]); setViewMode("threeD"); }} /> : <aside className="tree-panel">
          <div className="panel-heading">
            <div><span>Struktura projekta</span><small>{allElements.length} elemenata</small></div>
            <label className="search-box">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Traži naziv ili šifru…" />
            </label>
          </div>
          <div className="tree-scroll">
            <div className="tree-group-actions">
              <span>{groupSelection.length ? `${groupSelection.length} označeno` : "Grupni izbor"}</span>
              {normalizedRootQuery && <button disabled={!visibleRootIndexes.length} title={visibleRootIndexes.length ? "Označi sve elemente koji odgovaraju pretrazi" : "Nema vidljivih elemenata koji odgovaraju pretrazi"} onClick={() => selectRootGroup(visibleRootIndexes)}>Označi vidljive</button>}
              <button disabled={!project.inspection.elements.length} title={project.inspection.elements.length ? "Označi sve elemente projekta" : "Projekat nema elemenata za grupni izbor"} onClick={() => selectRootGroup(project.inspection.elements.map((_, index) => index))}>Označi sve</button>
              <button disabled={!groupSelection.length} title={groupSelection.length ? "Očisti grupni izbor elemenata" : "Nijedan element nije označen"} onClick={() => setGroupSelection([])}>Poništi</button>
            </div>
            <ElementTree
              elements={project.inspection.elements}
              query={query}
              selected={selected}
              onSelect={selectElement}
              groupSelection={groupSelection}
              onToggleGroup={toggleGroupElement}
            />
          </div>
        </aside>}

        <section className={viewMode !== "data" && viewMode !== "room" && viewMode !== "cutlist" ? "detail-panel drawing-panel" : "detail-panel"}>
          {viewMode === "room" ? (
            <RoomEditor room={project.inspection.room} elements={project.inspection.elements} groupElements={selectedGroupElements} onInspectIssue={inspectLayoutIssue} onContainIssue={containLayoutIssue} onSeparateIssue={separateLayoutIssue} onUpdate={updateRoom} onDistribute={distributeRootElements} onUndo={undoWorkingCopy} canUndo={project.history.length > 0} />
          ) : viewMode === "cutlist" ? (
            <CutListView result={cutList} consumables={consumablesList} groupResult={groupCutList} groupConsumables={groupConsumablesList} groupCount={selectedGroupElements.length} onExport={exportCutList} onExportConsumables={exportConsumables} />
          ) : viewMode === "drawing" ? (
            <ElevationView fileName={project.fileName} elements={project.inspection.elements} selected={selected} groupElements={groupSelection.map((index) => project.inspection.elements[index]!).filter(Boolean)} onSelect={selectElement} onToggleGroup={(element) => toggleGroupElement(project.inspection.elements.indexOf(element))} onOpenData={() => setViewMode("data")} />
          ) : viewMode === "threeD" ? (
            <Suspense fallback={<div className="three-loading"><span /><strong>Pripremam 3D prikaz…</strong></div>}>
              <Room3DView
                elements={project.inspection.elements}
                room={project.inspection.room}
                selected={selected}
                selectedBoardIndex={selectedBoardIndex}
                boardGroupSelection={boardGroupSelection}
                groupElements={groupSelection.map((index) => project.inspection.elements[index]!).filter(Boolean)}
                outsideRoomElements={layoutProblemElements.outsideRoom}
                overlappingElements={layoutProblemElements.overlapping}
                materialTextures={materialLibrary?.textureByUid ?? EMPTY_MATERIAL_TEXTURES}
                onSelect={selectElement}
                onClearSelection={() => { setSelected(null); setSelectedBoardIndex(null); setBoardGroupSelection([]); setGroupSelection([]); }}
                onToggleGroup={(element) => {
                  const index = project.inspection.elements.indexOf(element);
                  if (index >= 0) toggleGroupElement(index);
                }}
                onMove={moveElementIn3D}
                onMoveGroup={translateGroup}
                onOpenData={() => setViewMode("data")}
              />
            </Suspense>
          ) : (
            selected ? <ElementDetails key={findCorpusElementPath(project.inspection.elements, selected)?.join(".") ?? selected.name} element={selected} room={project.inspection.room} placementElements={project.inspection.elements} groupSelection={groupSelection} canEdit={corpusElementAllowsModeling(selected)} canTransformGroup={groupSelection.length >= 2 && groupSelection.every((index) => corpusElementAllowsModeling(project.inspection.elements[index]!))} onTranslateGroup={translateGroup} onPositionGroup={positionGroup} onAlignGroup={alignGroup} onDistributeGroup={distributeGroup} onSpaceGroup={spaceGroup} onRotateGroup={rotateGroup} onContainGroup={containGroup} onCenterGroup={centerGroup} onPlaceGroupAtRoomSide={placeGroupAtRoomSide} onSnapGroup={snapGroup} onDuplicateGroup={duplicateGroup} onDuplicateGroupGrid={duplicateGroupGrid} onRemoveGroup={removeGroup} canRemoveGroup={groupSelection.length >= 2 && groupSelection.every((index) => index >= project.originalInspection.elements.length && corpusElementAllowsModeling(project.inspection.elements[index]!))} onSetGroupVisibility={setGroupVisibility} onIsolateGroup={isolateGroup} onShowAllRoots={showAllRootElements} onClearGroup={() => setGroupSelection([])} selectedBoardIndex={selectedBoardIndex} boardSelection={boardGroupSelection} onBoardSelectionChange={setBoardGroupSelection} onSelectBoard={setSelectedBoardIndex} onUpdate={updateSelectedElement} onFitToBoards={fitSelectedElementToBoards} onUpdateIdentity={updateSelectedElementIdentity} onUpdateVariables={updateSelectedElementVariables} onUpdateBoard={updateSelectedBoard} onUpdateBoardAppearance={updateSelectedBoardAppearance} onUpdateBoardHoles={updateSelectedBoardHoles} onUpdateBoardContour={updateSelectedBoardContour} onUpdateBoardEdgeBanding={updateSelectedBoardEdgeBanding} onAddBoard={addBoardToSelectedElement} onRenameBoard={renameSelectedBoard} onMoveBoard={moveSelectedBoard} onDuplicateBoard={duplicateSelectedBoard} onDuplicateBoardArray={duplicateSelectedBoardArray} onDuplicateBoardGrid={duplicateSelectedBoardGrid} onTranslateBoards={translateSelectedBoards} onDistributeBoards={distributeSelectedBoards} onAlignBoards={alignSelectedBoards} onPlaceBoards={placeSelectedBoards} onDuplicateBoards={duplicateSelectedBoards} onRemoveBoards={removeSelectedBoards} onApplyBoardAppearance={applySelectedBoardAppearance} onSetBoardsVisibility={setSelectedBoardsVisibility} onDistributeBoardArray={distributeSelectedBoardArray} onRemoveBoard={removeSelectedBoard} onUndo={undoWorkingCopy} onRemoveImported={removeImportedElement} onDuplicateImported={duplicateImportedElement} onExportSelectedE3d={exportSelectedE3d} canChangeStructure={(project.inspection.format === "corpus-e3d" || isImportedRoot(project, selected)) && corpusElementAllowsModeling(selected)} canRemoveImported={isImportedRoot(project, selected) && corpusElementAllowsModeling(selected)} canExportE3d={project.inspection.format === "corpus-e3d" || isImportedRoot(project, selected)} canDuplicate={project.inspection.format === "corpus-s3d" && Boolean(findCorpusElementPath(project.inspection.elements, selected)?.length === 1)} canUndo={project.history.length > 0} onOpenProduction={() => setViewMode("cutlist")} /> : <EmptyDetails />
          )}
        </section>
        {(viewMode === "drawing" || viewMode === "threeD") && (
          <aside className="inspector-panel" aria-label="Svojstva izbora">
            <header><span>Svojstva</span><small>{selectedBoardIndex !== null ? "Ploča" : selected ? "Element" : "Projekat"}</small></header>
            <div className="inspector-scroll">
              {selected ? (
                <>
                  <div className="inspector-identity">
                    <strong>{selectedBoardIndex !== null ? selected.boards[selectedBoardIndex]?.name || `Ploča ${selectedBoardIndex + 1}` : selected.name || "Neimenovan element"}</strong>
                    <span>{selectedBoardIndex !== null ? selected.name : selected.code || selected.className || "Bez šifre"}</span>
                  </div>
                  {selectedBoardIndex !== null && selected.boards[selectedBoardIndex] ? (
                    <dl className="inspector-properties">
                      <div><dt>Širina</dt><dd>{formatNumber(selected.boards[selectedBoardIndex]!.width)} mm</dd></div>
                      <div><dt>Visina</dt><dd>{formatNumber(selected.boards[selectedBoardIndex]!.height)} mm</dd></div>
                      <div><dt>Debljina</dt><dd>{formatNumber(selected.boards[selectedBoardIndex]!.thickness)} mm</dd></div>
                      <div><dt>Materijal</dt><dd>{selected.boards[selectedBoardIndex]!.materialName || "Nije naveden"}</dd></div>
                    </dl>
                  ) : (
                    <dl className="inspector-properties">
                      <div><dt>Širina</dt><dd>{formatNumber(selected.width)} mm</dd></div>
                      <div><dt>Visina</dt><dd>{formatNumber(selected.height)} mm</dd></div>
                      <div><dt>Dubina</dt><dd>{formatNumber(selected.depth)} mm</dd></div>
                      <div><dt>Ploče</dt><dd>{selected.boards.length}</dd></div>
                    </dl>
                  )}
                  <button className="inspector-primary" onClick={() => setViewMode("data")}>{selectedBoardIndex !== null ? "Uredi ploču" : "Uredi element"}</button>
                  <div className="inspector-actions" aria-label="Osnovne radnje nad izborom">
                    {selectedBoardIndex === null && <><button disabled={!corpusElementAllowsModeling(selected)} title={corpusElementAllowsModeling(selected) ? "Rotiraj element 90° ulijevo" : "Element je zaključan ili nema potpunu geometriju"} onClick={() => rotateSelectedElement(-90)}>↶ −90°</button><button disabled={!corpusElementAllowsModeling(selected)} title={corpusElementAllowsModeling(selected) ? "Rotiraj element 90° udesno" : "Element je zaključan ili nema potpunu geometriju"} onClick={() => rotateSelectedElement(90)}>↷ +90°</button></>}
                    {selectedBoardIndex === null && selectedCanCopy && <button onClick={() => duplicateImportedElement()}>Kopiraj</button>}
                    {selectedBoardIndex === null && selectedCanRemove && <button className="danger" onClick={removeImportedElement}>Ukloni</button>}
                    {selectedBoardIndex !== null && selectedBoardCanChange && <button onClick={() => duplicateSelectedBoard(selectedBoardIndex)}>Kopiraj ploču</button>}
                    {selectedBoardIndex !== null && selectedBoardCanChange && selected.boards.length > 1 && <button className="danger" onClick={() => removeSelectedBoard(selectedBoardIndex)}>Ukloni ploču</button>}
                  </div>
                  <p className="inspector-help"><strong>Osnovne kontrole prostorije</strong><span>Klik bira cijeli element</span><span>Ctrl/Shift + klik označava grupu elemenata</span><span>Strelice pomjeraju po X/Z</span><span>Page Up/Down pomjera po Y</span></p>
                </>
              ) : (
                <div className="inspector-empty"><span>◇</span><strong>Ništa nije izabrano</strong><p>Klikni element ili ploču u canvasu da vidiš osnovna svojstva.</p></div>
              )}
            </div>
          </aside>
        )}
      </main>

      <footer className="statusbar">
        <span><i className={`status-dot ${project.dirty ? "status-dot-dirty" : ""}`} /> {project.dirty ? "Izmjene su samo u radnoj kopiji" : "Izvorni projekat otvoren samo za čitanje"}</span>
        <span>{error ?? (materialLibrary ? `${materialLibrary.folderName}: ${materialLibrary.catalogCount} kataloga · ${materialLibrary.textureByUid.size} tekstura · ${materialLibrary.ambiguousUids} dvosmislenih UID-a · ${materialLibrary.missingPictures} bez slike` : null) ?? layoutIssues[0]?.message ?? (project.inspection.unknownTopLevelTags.length ? `${project.inspection.unknownTopLevelTags.length} nepoznatih sekcija` : "Struktura prepoznata")}</span>
      </footer>
    </div>
    </MaterialLibraryContext.Provider>
  );
}

function libraryFilePath(file: File): string {
  return file.webkitRelativePath || file.name;
}

const EMPTY_MATERIAL_TEXTURES: ReadonlyMap<string, MaterialTextureSource> = new Map();

function normalizeLibraryPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "").toLocaleLowerCase("en-US");
}

function normalizeMaterialUid(value: string): string {
  return value.trim().toLocaleUpperCase("en-US");
}

function projectHistoryEntry(project: Pick<LoadedProject, "inspection" | "importedE3dSources" | "standaloneE3dSource">): ProjectHistoryEntry {
  return { inspection: project.inspection, importedE3dSources: project.importedE3dSources, standaloneE3dSource: project.standaloneE3dSource };
}

function appendProjectHistory(project: Pick<LoadedProject, "inspection" | "importedE3dSources" | "standaloneE3dSource" | "history">): readonly ProjectHistoryEntry[] {
  return [...project.history, projectHistoryEntry(project)].slice(-100);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function isImportedRoot(project: LoadedProject, element: CorpusS3dElement): boolean {
  const path = findCorpusElementPath(project.inspection.elements, element);
  return Boolean(path && path.length === 1 && path[0]! >= project.originalInspection.elements.length);
}

function useCloseOnEscape(onClose: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [enabled, onClose]);
}

function ElementCreatorDialog({ onCreate, onClose }: { onCreate(spec: CorpusElementSpec): void; onClose(): void }) {
  const [name, setName] = useState("Novi element");
  const [code, setCode] = useState("E600");
  const [width, setWidth] = useState("600");
  const [height, setHeight] = useState("720");
  const [depth, setDepth] = useState("560");
  const [direction, setDirection] = useState<0 | 1 | 2>(1);
  const [boardName, setBoardName] = useState("Početna ploča");
  const [thickness, setThickness] = useState("18");
  const [materialName, setMaterialName] = useState("Bijela");
  const [materialUid, setMaterialUid] = useState("");
  const [color, setColor] = useState("#f2f2ee");
  const [message, setMessage] = useState("");
  useCloseOnEscape(onClose);

  function submit() {
    const spec: CorpusElementSpec = {
      name, code,
      width: Number(width.replace(",", ".")),
      height: Number(height.replace(",", ".")),
      depth: Number(depth.replace(",", ".")),
      starterDirection: direction,
      starterBoardName: boardName,
      thickness: Number(thickness.replace(",", ".")),
      materialName, materialUid,
      color: Number.parseInt(color.slice(1), 16),
    };
    try {
      generateCorpusElementE3d(spec);
      onCreate(spec);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Provjeri unesene podatke.");
    }
  }

  return (
    <div className="library-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="cabinet-dialog" role="dialog" aria-modal="true" aria-label="Novi element" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">Opšti E3D</p><h2>Novi element</h2></div><button aria-label="Zatvori novi element" onClick={onClose}>×</button></header>
        <p>Pravi samostalan element sa jednom početnom pločom. Poslije dodaj, kopiraj i uređuj ostale ploče postojećim alatima.</p>
        <div className="cabinet-form">
          <label><span>Naziv elementa</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label><span>Šifra</span><input value={code} onChange={(event) => setCode(event.target.value)} /></label>
          <label><span>Širina omotača</span><div><input inputMode="decimal" value={width} onChange={(event) => setWidth(event.target.value)} /><small>mm</small></div></label>
          <label><span>Visina omotača</span><div><input inputMode="decimal" value={height} onChange={(event) => setHeight(event.target.value)} /><small>mm</small></div></label>
          <label><span>Dubina omotača</span><div><input inputMode="decimal" value={depth} onChange={(event) => setDepth(event.target.value)} /><small>mm</small></div></label>
          <label><span>Orijentacija početne ploče</span><select value={direction} onChange={(event) => setDirection(Number(event.target.value) as 0 | 1 | 2)}><option value={0}>Bočna</option><option value={1}>Uspravna / prednja</option><option value={2}>Horizontalna</option></select></label>
          <label><span>Naziv početne ploče</span><input value={boardName} onChange={(event) => setBoardName(event.target.value)} /></label>
          <label><span>Debljina ploče</span><div><input inputMode="decimal" value={thickness} onChange={(event) => setThickness(event.target.value)} /><small>mm</small></div></label>
          <label><span>Materijal</span><input value={materialName} onChange={(event) => setMaterialName(event.target.value)} /></label>
          <label><span>MATUID</span><input value={materialUid} onChange={(event) => setMaterialUid(event.target.value)} placeholder="opciono" /></label>
          <label><span>Boja</span><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
        </div>
        {message && <p className="error-message" role="alert">{message}</p>}
        <footer><button className="secondary-button" onClick={onClose}>Odustani</button><button className="primary-button" onClick={submit}>Napravi i dodaj u projekat</button></footer>
      </section>
    </div>
  );
}

function CabinetGeneratorDialog({ onCreate, onClose }: { onCreate(spec: CorpusCabinetSpec): void; onClose(): void }) {
  const [name, setName] = useState("Osnovni korpus");
  const [code, setCode] = useState("K600");
  const [width, setWidth] = useState("600");
  const [height, setHeight] = useState("820");
  const [depth, setDepth] = useState("560");
  const [thickness, setThickness] = useState("18");
  const [shelfCount, setShelfCount] = useState("1");
  const [shelfPlacement, setShelfPlacement] = useState<"even" | "custom">("even");
  const [shelfHeights, setShelfHeights] = useState("250; 500");
  const [shelfFrontInset, setShelfFrontInset] = useState("20");
  const [shelfRearInset, setShelfRearInset] = useState("18");
  const [dividerCount, setDividerCount] = useState("0");
  const [dividerPlacement, setDividerPlacement] = useState<"even" | "custom">("even");
  const [dividerPositions, setDividerPositions] = useState("300");
  const [usePlinth, setUsePlinth] = useState(false);
  const [baseHeight, setBaseHeight] = useState("100");
  const [plinthInset, setPlinthInset] = useState("30");
  const [topConstruction, setTopConstruction] = useState<"full" | "stretchers">("full");
  const [stretcherWidth, setStretcherWidth] = useState("100");
  const [rearStretcherInset, setRearStretcherInset] = useState("40");
  const [backType, setBackType] = useState<"none" | "panel" | "thin">("panel");
  const [backThickness, setBackThickness] = useState("3");
  const [backMaterialName, setBackMaterialName] = useState("HDF bijeli");
  const [backMaterialUid, setBackMaterialUid] = useState("");
  const [backColor, setBackColor] = useState("#ffffff");
  const [materialName, setMaterialName] = useState("Bijela");
  const [materialUid, setMaterialUid] = useState("");
  const [color, setColor] = useState("#f2f2ee");
  const [frontCount, setFrontCount] = useState("0");
  const [frontLayout, setFrontLayout] = useState<"doors" | "drawers">("doors");
  const [frontMount, setFrontMount] = useState<"overlay" | "inset">("overlay");
  const [frontDistribution, setFrontDistribution] = useState<"even" | "ratios">("even");
  const [frontRatios, setFrontRatios] = useState("1; 2; 1");
  const [frontThickness, setFrontThickness] = useState("18");
  const [frontGap, setFrontGap] = useState("2");
  const [frontMaterialName, setFrontMaterialName] = useState("Bijela fronta");
  const [frontMaterialUid, setFrontMaterialUid] = useState("");
  const [frontColor, setFrontColor] = useState("#f8f8f5");
  const [message, setMessage] = useState("");
  useCloseOnEscape(onClose);

  function submit() {
    const shelfOffsets = shelfPlacement === "custom"
      ? shelfHeights.split(/[;,\s]+/).filter(Boolean).map((value) => Number(value.replace(",", ".")))
      : undefined;
    const dividerOffsets = dividerPlacement === "custom"
      ? dividerPositions.split(/[;,\s]+/).filter(Boolean).map((value) => Number(value.replace(",", ".")))
      : undefined;
    const frontWeights = frontDistribution === "ratios" && frontCount !== "0"
      ? frontRatios.split(/[;,\s]+/).filter(Boolean).map((value) => Number(value.replace(",", ".")))
      : undefined;
    const spec: CorpusCabinetSpec = {
      name,
      code,
      width: Number(width.replace(",", ".")),
      height: Number(height.replace(",", ".")),
      depth: Number(depth.replace(",", ".")),
      thickness: Number(thickness.replace(",", ".")),
      shelfCount: shelfOffsets?.length ?? Number(shelfCount),
      shelfOffsets,
      shelfFrontInset: Number(shelfFrontInset.replace(",", ".")),
      shelfRearInset: Number(shelfRearInset.replace(",", ".")),
      dividerCount: dividerOffsets?.length ?? Number(dividerCount),
      dividerOffsets,
      baseHeight: usePlinth ? Number(baseHeight.replace(",", ".")) : 0,
      includePlinth: usePlinth,
      plinthInset: Number(plinthInset.replace(",", ".")),
      topConstruction,
      stretcherWidth: Number(stretcherWidth.replace(",", ".")),
      rearStretcherInset: Number(rearStretcherInset.replace(",", ".")),
      includeBack: backType !== "none",
      backType: backType === "thin" ? "thin" : "panel",
      backThickness: Number(backThickness.replace(",", ".")),
      backMaterialName,
      backMaterialUid,
      backColor: Number.parseInt(backColor.slice(1), 16),
      materialName,
      materialUid,
      color: Number.parseInt(color.slice(1), 16),
      frontCount: frontWeights?.length ?? Number(frontCount),
      frontLayout,
      frontMount,
      frontWeights,
      frontThickness: Number(frontThickness.replace(",", ".")),
      frontGap: Number(frontGap.replace(",", ".")),
      frontMaterialName,
      frontMaterialUid,
      frontColor: Number.parseInt(frontColor.slice(1), 16),
    };
    try {
      generateCorpusCabinetE3d(spec);
      onCreate(spec);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Provjeri unesene mjere.");
    }
  }

  return (
    <div className="library-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="cabinet-dialog" role="dialog" aria-modal="true" aria-label="Novi osnovni korpus" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">Parametarski E3D</p><h2>Novi osnovni korpus</h2></div><button aria-label="Zatvori generator" onClick={onClose}>×</button></header>
        <p>Pravi lokalni Corpus element od pravougaonih ploča. Poslije ga možeš pomjerati, uređivati, umnožiti i izvesti kao dio S3D projekta.</p>
        <div className="cabinet-form">
          <label><span>Naziv</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label><span>Šifra</span><input value={code} onChange={(event) => setCode(event.target.value)} /></label>
          <label><span>Širina</span><div><input inputMode="decimal" value={width} onChange={(event) => setWidth(event.target.value)} /><small>mm</small></div></label>
          <label><span>Visina</span><div><input inputMode="decimal" value={height} onChange={(event) => setHeight(event.target.value)} /><small>mm</small></div></label>
          <label><span>Dubina</span><div><input inputMode="decimal" value={depth} onChange={(event) => setDepth(event.target.value)} /><small>mm</small></div></label>
          <label><span>Debljina ploče</span><div><input inputMode="decimal" value={thickness} onChange={(event) => setThickness(event.target.value)} /><small>mm</small></div></label>
          <label><span>Raspored polica</span><select value={shelfPlacement} onChange={(event) => setShelfPlacement(event.target.value as "even" | "custom")}><option value="even">Ravnomjerno</option><option value="custom">Ručne visine</option></select></label>
          {shelfPlacement === "even"
            ? <label><span>Nivoi polica</span><input inputMode="numeric" value={shelfCount} onChange={(event) => setShelfCount(event.target.value)} /></label>
            : <label><span>Visine iznad poda korpusa</span><input value={shelfHeights} onChange={(event) => setShelfHeights(event.target.value)} placeholder="250; 500" /></label>}
          <label><span>Raspored pregrada</span><select value={dividerPlacement} onChange={(event) => setDividerPlacement(event.target.value as "even" | "custom")}><option value="even">Ravnomjerno</option><option value="custom">Ručni položaji</option></select></label>
          {dividerPlacement === "even"
            ? <label><span>Broj pregrada</span><input inputMode="numeric" value={dividerCount} onChange={(event) => setDividerCount(event.target.value)} /></label>
            : <label><span>Položaji od lijeve unutrašnje ivice</span><input value={dividerPositions} onChange={(event) => setDividerPositions(event.target.value)} placeholder="300; 600" /></label>}
          <label><span>Prednji uvlak police</span><div><input inputMode="decimal" value={shelfFrontInset} onChange={(event) => setShelfFrontInset(event.target.value)} /><small>mm</small></div></label>
          <label><span>Zadnji uvlak police</span><div><input inputMode="decimal" value={shelfRearInset} onChange={(event) => setShelfRearInset(event.target.value)} /><small>mm</small></div></label>
          <label><span>Materijal</span><input value={materialName} onChange={(event) => setMaterialName(event.target.value)} /></label>
          <label><span>MATUID materijala</span><input value={materialUid} onChange={(event) => setMaterialUid(event.target.value)} placeholder="opciono" /></label>
          <label><span>Boja</span><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
          <label><span>Poleđina</span><select value={backType} onChange={(event) => setBackType(event.target.value as "none" | "panel" | "thin")}><option value="none">Bez leđa</option><option value="panel">Pločasta leđa unutra</option><option value="thin">Tanka HDF leđa pozadi</option></select></label>
          {backType === "thin" && <>
            <label><span>Debljina HDF-a</span><div><input inputMode="decimal" value={backThickness} onChange={(event) => setBackThickness(event.target.value)} /><small>mm</small></div></label>
            <label><span>Materijal HDF-a</span><input value={backMaterialName} onChange={(event) => setBackMaterialName(event.target.value)} /></label>
            <label><span>MATUID HDF-a</span><input value={backMaterialUid} onChange={(event) => setBackMaterialUid(event.target.value)} placeholder="opciono" /></label>
            <label><span>Boja HDF-a</span><input type="color" value={backColor} onChange={(event) => setBackColor(event.target.value)} /></label>
          </>}
          <label className="cabinet-check"><input type="checkbox" checked={usePlinth} onChange={(event) => setUsePlinth(event.target.checked)} /><span>Donji element sa coklom</span></label>
          {usePlinth && <>
            <label><span>Visina postolja</span><div><input inputMode="decimal" value={baseHeight} onChange={(event) => setBaseHeight(event.target.value)} /><small>mm</small></div></label>
            <label><span>Uvlak cokle</span><div><input inputMode="decimal" value={plinthInset} onChange={(event) => setPlinthInset(event.target.value)} /><small>mm</small></div></label>
          </>}
          <label><span>Gornja konstrukcija</span><select value={topConstruction} onChange={(event) => setTopConstruction(event.target.value as "full" | "stretchers")}><option value="full">Puna gornja ploča</option><option value="stretchers">Prednji + zadnji vezač</option></select></label>
          {topConstruction === "stretchers" && <>
            <label><span>Širina vezača</span><div><input inputMode="decimal" value={stretcherWidth} onChange={(event) => setStretcherWidth(event.target.value)} /><small>mm</small></div></label>
            <label><span>Zadnji uvlak</span><div><input inputMode="decimal" value={rearStretcherInset} onChange={(event) => setRearStretcherInset(event.target.value)} /><small>mm</small></div></label>
          </>}
          <label><span>Raspored fronti</span><select value={frontCount === "0" ? "none" : frontLayout} onChange={(event) => { const value = event.target.value; if (value === "none") setFrontCount("0"); else { setFrontLayout(value as "doors" | "drawers"); if (frontCount === "0") setFrontCount(value === "drawers" ? "3" : "1"); } }}><option value="none">Bez fronti</option><option value="doors">Vrata po širini</option><option value="drawers">Frontovi ladica po visini</option></select></label>
          {frontCount !== "0" && <>
            <label><span>Ugradnja fronti</span><select value={frontMount} onChange={(event) => setFrontMount(event.target.value as "overlay" | "inset")}><option value="overlay">Naklopne preko korpusa</option><option value="inset">Uvučene unutar otvora</option></select></label>
            <label><span>Podjela fronti</span><select value={frontDistribution} onChange={(event) => setFrontDistribution(event.target.value as "even" | "ratios")}><option value="even">Jednaki dijelovi</option><option value="ratios">Ručni omjeri</option></select></label>
            {frontDistribution === "even"
              ? <label><span>Broj fronti</span><input inputMode="numeric" value={frontCount} onChange={(event) => setFrontCount(event.target.value)} /></label>
              : <label><span>Omjeri fronti</span><input value={frontRatios} onChange={(event) => setFrontRatios(event.target.value)} placeholder="1; 2; 1" /></label>}
            <label><span>Debljina fronte</span><div><input inputMode="decimal" value={frontThickness} onChange={(event) => setFrontThickness(event.target.value)} /><small>mm</small></div></label>
            <label><span>Zazor fronte</span><div><input inputMode="decimal" value={frontGap} onChange={(event) => setFrontGap(event.target.value)} /><small>mm</small></div></label>
            <label><span>Materijal fronte</span><input value={frontMaterialName} onChange={(event) => setFrontMaterialName(event.target.value)} /></label>
            <label><span>MATUID fronte</span><input value={frontMaterialUid} onChange={(event) => setFrontMaterialUid(event.target.value)} placeholder="nasljeđuje korpus" /></label>
            <label><span>Boja fronte</span><input type="color" value={frontColor} onChange={(event) => setFrontColor(event.target.value)} /></label>
          </>}
        </div>
        {message && <p className="error-message" role="alert">{message}</p>}
        <footer><button className="secondary-button" onClick={onClose}>Odustani</button><button className="primary-button" onClick={submit}>Napravi i dodaj u projekat</button></footer>
      </section>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark"><i /><i /><i /></span>
      <div><strong>IVERTIM</strong><span>CORPUS</span></div>
    </div>
  );
}

type DropZoneProps = {
  dragging: boolean;
  error: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDragging(value: boolean): void;
  onFile(file: File | undefined): void;
};

function DropZone({ dragging, error, inputRef, onDragging, onFile }: DropZoneProps) {
  return (
    <div
      className={`drop-zone ${dragging ? "is-dragging" : ""}`}
      onDragEnter={(event) => { event.preventDefault(); onDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => onDragging(false)}
      onDrop={(event) => { event.preventDefault(); onDragging(false); onFile(event.dataTransfer.files[0]); }}
    >
      <div className="file-icon">3D</div>
      <strong>Prevuci Corpus S3D ili E3D ovdje</strong>
      <span>ili izaberi fajl sa računara</span>
      <button className="primary-button" onClick={() => inputRef.current?.click()}>Izaberi .S3D / .E3D fajl</button>
      <input ref={inputRef} hidden type="file" accept=".s3d,.S3D,.e3d,.E3D,application/xml,text/xml" onChange={(event) => onFile(event.target.files?.[0])} />
      {error && <p className="error-message" role="alert">{error}</p>}
    </div>
  );
}

function Metric({ label, value, warning = false, title }: { label: string; value: string; warning?: boolean; title?: string }) {
  return <div className={`metric ${warning ? "metric-warning" : ""}`} title={title}><span>{label}</span><strong>{value}</strong></div>;
}

function CutListView({ result, consumables, groupResult, groupConsumables, groupCount, onExport, onExportConsumables }: {
  result: CorpusCutListResult;
  consumables: readonly CorpusConsumableItem[];
  groupResult: CorpusCutListResult;
  groupConsumables: readonly CorpusConsumableItem[];
  groupCount: number;
  onExport(result: CorpusCutListResult, groupOnly: boolean): void;
  onExportConsumables(items: readonly CorpusConsumableItem[], groupOnly: boolean): void;
}) {
  const [scope, setScope] = useState<"project" | "group">("project");
  useEffect(() => { if (!groupCount && scope === "group") setScope("project"); }, [groupCount, scope]);
  const groupOnly = scope === "group" && groupCount > 0;
  const activeResult = groupOnly ? groupResult : result;
  const activeConsumables = groupOnly ? groupConsumables : consumables;
  const validBoards = activeResult.totalBoards - activeResult.skippedBoards;
  return (
    <div className="detail-content cutlist-page">
      <div className="detail-title">
        <div><p className="eyebrow">Proizvodni pregled</p><h2>{groupOnly ? "Krojna lista označene grupe" : "Krojna lista projekta"}</h2><span>Grupisano po materijalu i izvornim Corpus mjerama VISINA × DUBINA × DEBLJINA</span></div>
        <button className="primary-button" disabled={!activeResult.items.length} title={activeResult.items.length ? "Izvezi prikazanu krojnu listu kao CSV" : "Nema potpunih proizvodnih mjera za CSV izvoz"} onClick={() => onExport(activeResult, groupOnly)}>Izvezi CSV</button>
      </div>
      <div className="cutlist-scope-switch" aria-label="Obuhvat proizvodne liste"><button aria-current={!groupOnly ? "true" : undefined} className={!groupOnly ? "active" : ""} onClick={() => setScope("project")}>Cijeli projekat</button><button aria-current={groupOnly ? "true" : undefined} className={groupOnly ? "active" : ""} disabled={!groupCount} title={groupCount ? "Prikaži proizvodne podatke samo za označene elemente" : "Prvo označi najmanje jedan element u strukturi projekta"} onClick={() => setScope("group")}>Označena grupa ({groupCount})</button></div>
      <div className="cutlist-summary">
        <Property label="Ploča sa mjerama" value={String(validBoards)} />
        <Property label="Grupa za krojenje" value={String(activeResult.items.length)} />
        <Property label="Preskočeno bez mjera" value={String(activeResult.skippedBoards)} />
      </div>
      {activeResult.items.length ? <div className="board-table-wrap cutlist-table-wrap"><table className="board-table cutlist-table">
        <thead><tr><th>Materijal</th><th>VISINA</th><th>DUBINA</th><th>Debljina</th><th>Kom.</th><th>Rupe</th><th>Elementi / ploče</th></tr></thead>
        <tbody>{activeResult.items.map((item, index) => <tr key={`${item.materialUid}-${item.materialName}-${item.height}-${item.width}-${item.thickness}-${index}`}>
          <td><strong>{item.materialName}</strong>{item.materialUid && <small>{item.materialUid}</small>}</td>
          <td>{formatMillimeters(item.height)}</td>
          <td>{formatMillimeters(item.width)}</td>
          <td>{formatMillimeters(item.thickness)}</td>
          <td><strong>{item.quantity}</strong>{item.hiddenCount > 0 && <small>{item.hiddenCount} skrivenih</small>}</td>
          <td>{item.holeCount}</td>
          <td className="cutlist-parts">{item.parts.join(" · ")}</td>
        </tr>)}</tbody>
      </table></div> : <div className="empty-details"><span>▤</span><h2>Nema ploča za krojnu listu</h2><p>Dodaj E3D element ili napravi osnovni korpus.</p></div>}
      <section className="data-section consumables-section">
        <div className="cutlist-section-heading"><div><div className="section-title"><h3>Potrošni materijal i rubne obrade</h3><span>{activeConsumables.length}</span></div><p>TIP, KOMADA i STR0–STR3 prikazani su direktno iz Corpus zapisa.</p></div><button className="secondary-button" disabled={!activeConsumables.length} title={activeConsumables.length ? "Izvezi prikazane potrošne stavke kao CSV" : "U izabranom obuhvatu nema potrošnih stavki"} onClick={() => onExportConsumables(activeConsumables, groupOnly)}>Izvezi potrošni CSV</button></div>
        {activeConsumables.length ? <div className="board-table-wrap"><table className="board-table consumables-table">
          <thead><tr><th>TIP</th><th>Naziv / oznaka</th><th>Materijal</th><th>Količina</th><th>Pojave</th><th>STR0–STR3</th><th>Izvori</th></tr></thead>
          <tbody>{activeConsumables.map((item, index) => <tr key={`${item.type}-${item.uid}-${item.designation}-${index}`}>
            <td><strong>{item.type || "—"}</strong></td>
            <td><strong>{item.name}</strong>{item.designation && <small>{item.designation}</small>}</td>
            <td>{item.materialName || "—"}{item.materialUid && item.materialUid !== item.materialName && <small>{item.materialUid}</small>}</td>
            <td><strong>{formatNumber(item.quantity)}</strong>{item.declaredQuantityOccurrences > 0 && <small>KOMADA u {item.declaredQuantityOccurrences} zapisa</small>}</td>
            <td>{item.occurrences}</td>
            <td>{item.sideApplications.join(" / ")}</td>
            <td className="cutlist-parts">{item.sources.join(" · ")}</td>
          </tr>)}</tbody>
        </table></div> : <p className="empty-copy">Projekat nema POTITEM zapise.</p>}
      </section>
      <div className="evidence-warning"><strong>Mjere nisu automatski rotirane niti normalizovane.</strong><span>CSV čuva izvorni Corpus redoslijed VISINA i DUBINA, materijal, broj rupa i trag do elementa. Ploče bez pozitivne tri mjere su jasno preskočene.</span></div>
    </div>
  );
}

type RoomForm = { width: string; length: string; height: string; lowerHeight: string };

function RoomEditor({ room, elements, groupElements, onInspectIssue, onContainIssue, onSeparateIssue, onUpdate, onDistribute, onUndo, canUndo }: {
  room: CorpusS3dRoom;
  elements: readonly CorpusS3dElement[];
  groupElements: readonly CorpusS3dElement[];
  onInspectIssue(elements: readonly CorpusS3dElement[]): void;
  onContainIssue(elements: readonly CorpusS3dElement[]): void;
  onSeparateIssue(elements: readonly CorpusS3dElement[], axis: CorpusLayoutSeparationAxis): void;
  onUpdate(patch: RoomGeometryPatch): void;
  onDistribute(axis: CorpusDistributionAxis, gap: number, margin: number): boolean;
  onUndo(): void;
  canUndo: boolean;
}) {
  const [form, setForm] = useState<RoomForm>(() => roomFormFor(room));
  const [message, setMessage] = useState("");
  useEffect(() => { setForm(roomFormFor(room)); setMessage(""); }, [room]);
  const fields: Array<{ key: keyof RoomForm; label: string }> = [
    { key: "width", label: "Širina prostorije" },
    { key: "length", label: "Dužina prostorije" },
    { key: "height", label: "Gornja visina" },
    { key: "lowerHeight", label: "Donja visina" },
  ];

  function apply() {
    const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, Number(value)])) as Record<keyof RoomForm, number>;
    if (Object.values(values).some((value) => !Number.isFinite(value))) return setMessage("Sve dimenzije moraju sadržati broj.");
    if (values.width <= 0 || values.length <= 0 || values.height < 0 || values.lowerHeight < 0 || values.height + values.lowerHeight <= 0) {
      return setMessage("Širina i dužina moraju biti pozitivne, a ukupna visina veća od nule.");
    }
    onUpdate(values);
    setMessage("Dimenzije prostorije su primijenjene u radnoj kopiji.");
  }

  return (
    <div className="detail-content room-editor-page">
      <div className="detail-title"><div><p className="eyebrow">Prostorija</p><h2>Raspored prostora</h2><span>Elementi i provjera rasporeda</span></div></div>
      <details className="room-settings">
        <summary>
          <span><strong>Dimenzije prostorije</strong><small>Otvori samo kada mijenjaš sobu</small></span>
          <span className="room-settings-values"><b>{formatNumber(room.width)} × {formatNumber(room.length)} m</b><small>visina {formatNumber(corpusRoomTotalHeight(room.height, room.lowerHeight))} m</small></span>
        </summary>
        <div className="room-settings-body">
          <section className="geometry-editor">
            <p>Promjena odmah prilagođava pod, zidove, mrežu i početnu kameru u 3D prikazu.</p>
            <div className="geometry-fields room-fields compact-number-fields">
              {fields.map((field) => <label key={field.key}><span>{field.label}</span><div><input type="number" min="0" step="0.01" value={form[field.key]} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} /><small>m</small></div></label>)}
            </div>
            <div className="geometry-actions">
              <button className="primary-button" onClick={apply}>Primijeni prostoriju</button>
              {canUndo && <button className="secondary-button" onClick={onUndo}>Poništi zadnju izmjenu</button>}
              {message && <span>{message}</span>}
            </div>
          </section>
        </div>
      </details>
      <RoomDistributionEditor elements={elements} onDistribute={onDistribute} />
      <RoomLayoutInspection elements={elements} groupElements={groupElements} room={room} onInspectIssue={onInspectIssue} onContainIssue={onContainIssue} onSeparateIssue={onSeparateIssue} />
      <div className="evidence-warning"><strong>Corpus visina je zbir dva polja.</strong><span>3D koristi VISINA + VISINALOW, isto kao dokazani projekti iz D:\sobasav.</span></div>
    </div>
  );
}

function RoomLayoutInspection({ elements, groupElements, room, onInspectIssue, onContainIssue, onSeparateIssue }: { elements: readonly CorpusS3dElement[]; groupElements: readonly CorpusS3dElement[]; room: CorpusS3dRoom; onInspectIssue(elements: readonly CorpusS3dElement[]): void; onContainIssue(elements: readonly CorpusS3dElement[]): void; onSeparateIssue(elements: readonly CorpusS3dElement[], axis: CorpusLayoutSeparationAxis): void }) {
  const [scope, setScope] = useState<"project" | "group">("project");
  useEffect(() => { if (!groupElements.length && scope === "group") setScope("project"); }, [groupElements.length, scope]);
  const groupOnly = scope === "group" && groupElements.length > 0;
  const analyzedElements = groupOnly ? groupElements : elements;
  const issues = useMemo(() => analyzeCorpusLayout(analyzedElements, room), [analyzedElements, room]);
  const outsideCount = issues.filter(({ type }) => type === "outside-room").length;
  const overlapCount = issues.filter(({ type }) => type === "overlap").length;
  return <section className="data-section room-layout-inspection">
    <div className="section-title"><h3>Provjera rasporeda</h3><span>{issues.length ? `${issues.length} upozorenja` : "čisto"}</span></div>
    <div className="cutlist-scope-switch" aria-label="Obuhvat provjere rasporeda"><button aria-current={!groupOnly ? "true" : undefined} className={!groupOnly ? "active" : ""} onClick={() => setScope("project")}>Cijeli projekat</button><button aria-current={groupOnly ? "true" : undefined} className={groupOnly ? "active" : ""} disabled={!groupElements.length} title={groupElements.length ? "Provjeri raspored samo označenih elemenata" : "Prvo označi najmanje jedan element u strukturi projekta"} onClick={() => setScope("group")}>Označena grupa ({groupElements.length})</button></div>
    <div className="layout-issue-summary"><Property label="Izvan prostorije" value={String(outsideCount)} /><Property label="Preklapanja" value={String(overlapCount)} /></div>
    {issues.length ? <ul className="layout-issue-list">{issues.map((issue, index) => {
      const issueElements = corpusLayoutIssueElements(issue, analyzedElements);
      return <LayoutIssueRow key={`${issue.type}-${issue.elementIndexes.join("-")}-${index}`} issue={issue} canContain={issue.type === "outside-room" && issueElements.some(corpusElementAllowsModeling)} canSeparate={issue.type === "overlap" && issueElements.length === 2 && corpusElementAllowsModeling(issueElements[1]!)} onInspect={() => onInspectIssue(issueElements)} onContain={() => onContainIssue(issueElements)} onSeparate={(axis) => onSeparateIssue(issueElements, axis)} />;
    })}</ul> : <p className="layout-clean-message">Nema izlaska iz prostorije ni stvarnih zapreminskih preklapanja u izabranom obuhvatu.</p>}
  </section>;
}

function LayoutIssueRow({ issue, canContain, canSeparate, onInspect, onContain, onSeparate }: { issue: CorpusLayoutIssue; canContain: boolean; canSeparate: boolean; onInspect(): void; onContain(): void; onSeparate(axis: CorpusLayoutSeparationAxis): void }) {
  return <li className={`layout-issue-${issue.type}`}>
    <span>{issue.type === "outside-room" ? "Granica" : "Preklapanje"}</span>
    <strong>{issue.message}</strong>
    <div className="layout-issue-actions">
      <button className="secondary-button" onClick={onInspect}>Prikaži u 3D</button>
      {issue.type === "outside-room" && <button className="primary-button" disabled={!canContain} title={canContain ? "Pomjeri element najmanjim dokazanim pomakom unutar prostorije" : "Element je zaključan, prevelik ili nema potpunu geometriju"} onClick={onContain}>Vrati u sobu</button>}
      {issue.type === "overlap" && <><button className="primary-button" disabled={!canSeparate} title={canSeparate ? "Razdvoji elemente najmanjim pomakom po X osi" : "Drugi element je zaključan ili geometrija nije potpuna"} onClick={() => onSeparate("x")}>Razdvoji X</button><button className="primary-button" disabled={!canSeparate} title={canSeparate ? "Razdvoji elemente najmanjim pomakom po Z osi" : "Drugi element je zaključan ili geometrija nije potpuna"} onClick={() => onSeparate("z")}>Razdvoji Z</button></>}
    </div>
  </li>;
}

function RoomDistributionEditor({ elements, onDistribute }: {
  elements: readonly CorpusS3dElement[];
  onDistribute(axis: CorpusDistributionAxis, gap: number, margin: number): boolean;
}) {
  const [axis, setAxis] = useState<CorpusDistributionAxis>("x");
  const [gap, setGap] = useState("0");
  const [margin, setMargin] = useState("0");
  const [message, setMessage] = useState("");

  function apply() {
    const parsedGap = Number(gap.replace(",", "."));
    const parsedMargin = Number(margin.replace(",", "."));
    if (!Number.isFinite(parsedGap) || parsedGap < 0 || !Number.isFinite(parsedMargin) || parsedMargin < 0) {
      setMessage("Razmak i odmak moraju biti brojevi 0 mm ili veći.");
      return;
    }
    setMessage(onDistribute(axis, parsedGap, parsedMargin)
      ? `Elementi su raspoređeni po ${axis.toUpperCase()} osi u jednom Undo koraku.`
      : "Za raspored trebaju najmanje dva potpuna elementa koja staju u prostoriju.");
  }

  return <section className="data-section geometry-editor room-distribution-editor">
    <div className="section-title"><h3>Raspored elemenata</h3><span>{elements.length} korijenskih</span></div>
    <p>Čuva redoslijed njihovih trenutnih omotača i druge dvije koordinate, a niz počinje od izabranog zida.</p>
    <div className="room-distribution-fields">
      <label><span>Osa niza</span><select aria-label="Osa rasporeda" value={axis} onChange={(event) => setAxis(event.target.value as CorpusDistributionAxis)}><option value="x">X · lijevo → desno</option><option value="z">Z · nazad → naprijed</option></select></label>
      <label><span>Razmak</span><div><input aria-label="Razmak rasporeda" inputMode="decimal" value={gap} onChange={(event) => setGap(event.target.value)} /><small>mm</small></div></label>
      <label><span>Odmak od zida</span><div><input aria-label="Odmak rasporeda od zida" inputMode="decimal" value={margin} onChange={(event) => setMargin(event.target.value)} /><small>mm</small></div></label>
    </div>
    <div className="geometry-actions"><button className="primary-button" disabled={elements.length < 2} title={elements.length < 2 ? "Za raspoređivanje su potrebna najmanje dva elementa" : "Rasporedi korijenske elemente prema zadanoj osi i razmaku"} onClick={apply}>Rasporedi elemente</button>{message && <span>{message}</span>}</div>
  </section>;
}

function roomFormFor(room: CorpusS3dRoom): RoomForm {
  return {
    width: String(room.width ?? 0), length: String(room.length ?? 0),
    height: String(room.height ?? 0), lowerHeight: String(room.lowerHeight ?? 0),
  };
}

type ElementTreeProps = {
  elements: readonly CorpusS3dElement[];
  query: string;
  selected: CorpusS3dElement | null;
  onSelect(element: CorpusS3dElement): void;
  groupSelection?: readonly number[];
  onToggleGroup?(index: number): void;
  depth?: number;
};

function ElementTree({ elements, query, selected, onSelect, groupSelection = [], onToggleGroup, depth = 0 }: ElementTreeProps) {
  const normalized = query.trim().toLocaleLowerCase("sr");
  const visible = elements.map((element, index) => ({ element, index }))
    .filter(({ element }) => !normalized || elementMatches(element, normalized));

  return (
    <ul className="element-tree">
      {visible.map(({ element, index }) => (
        <li key={`${element.code}-${element.name}-${depth}-${index}`}>
          <div className="tree-row-wrap">
            <button
              className={selected === element ? "tree-row selected" : "tree-row"}
              style={{ paddingLeft: `${18 + depth * 18}px` }}
              onClick={() => onSelect(element)}
            >
              <span className="tree-glyph">{element.children.length ? "◇" : "□"}</span>
              <span className="tree-label"><strong>{element.name || "Neimenovan element"}</strong><small>{element.code || element.className}</small></span>
              <span className="tree-count">{element.boards.length || ""}</span>
            </button>
            {depth === 0 && onToggleGroup && <button className={groupSelection.includes(index) ? "tree-multi-toggle active" : "tree-multi-toggle"} aria-label={`${groupSelection.includes(index) ? "Ukloni" : "Dodaj"} ${element.name || "element"} ${groupSelection.includes(index) ? "iz" : "u"} grupni izbor`} aria-pressed={groupSelection.includes(index)} title="Označi za grupno pomjeranje i poravnanje" onClick={() => onToggleGroup(index)}>{groupSelection.includes(index) ? "✓" : "+"}</button>}
          </div>
          {element.children.length > 0 && (
            <ElementTree elements={element.children} query={query} selected={selected} onSelect={onSelect} depth={depth + 1} />
          )}
        </li>
      ))}
      {!visible.length && depth === 0 && <li className="no-results">Nema elemenata za ovu pretragu.</li>}
    </ul>
  );
}

function elementMatches(element: CorpusS3dElement, query: string): boolean {
  return `${element.name} ${element.code} ${element.className}`.toLocaleLowerCase("sr").includes(query)
    || element.children.some((child) => elementMatches(child, query));
}

type ElevationViewProps = {
  fileName: string;
  elements: readonly CorpusS3dElement[];
  selected: CorpusS3dElement | null;
  groupElements: readonly CorpusS3dElement[];
  onSelect(element: CorpusS3dElement): void;
  onToggleGroup(element: CorpusS3dElement): void;
  onOpenData(): void;
};

function ElevationView({ fileName, elements, selected, groupElements, onSelect, onToggleGroup, onOpenData }: ElevationViewProps) {
  const [projection, setProjection] = useState<CorpusDrawingProjection>("front");
  const shapes = elements.map((element) => corpusDrawingShape(element, projection)).filter((shape) => shape !== null);
  const groupBounds = corpusDrawingGroupBounds(groupElements, projection);

  if (!shapes.length) {
    return <div className="empty-details"><span>⌗</span><h2>Nema geometrije za nacrt</h2><p>Projekat nema elemente sa potpunim X/Y/Z položajem i dimenzijama.</p></div>;
  }

  const minH = Math.min(0, ...shapes.map(({ bounds }) => bounds.minH));
  const maxH = Math.max(0, ...shapes.map(({ bounds }) => bounds.maxH));
  const minV = Math.min(0, ...shapes.map(({ bounds }) => bounds.minV));
  const maxV = Math.max(0, ...shapes.map(({ bounds }) => bounds.maxV));
  const padding = Math.max(120, (maxH - minH) * 0.04);
  const viewWidth = Math.max(1000, maxH - minH + padding * 2);
  const viewHeight = Math.max(1000, maxV - minV + padding * 2);
  const toScreenV = (value: number) => maxV + padding - value;
  const labels = projection === "front"
    ? ["Frontalni nacrt", "X/Y položaj elemenata", "X", "Y"]
    : projection === "top"
      ? ["Gornji nacrt", "X/Z položaj i rotacija elemenata", "X", "Z"]
      : ["Bočni nacrt", "Z/Y položaj elemenata", "Z", "Y"];

  return (
    <div className="drawing-view">
      <div className="drawing-toolbar">
        <div>
          <p className="eyebrow">{labels[0]}</p>
          <h2>{labels[1]}</h2>
          <span>Dokazani podaci iz S3D fajla · mjere u milimetrima</span>
        </div>
        <div><div className="view-switch" aria-label="Projekcija nacrta">{(["front", "top", "side"] as const).map((view) => <button key={view} aria-current={projection === view ? "true" : undefined} className={projection === view ? "active" : ""} onClick={() => setProjection(view)}>{view === "front" ? "Prednji" : view === "top" ? "Gornji" : "Bočni"}</button>)}<button onClick={() => downloadText(`${fileName.replace(/\.(?:s3d|e3d)$/i, "")}-${projection === "front" ? "PREDNJI" : projection === "top" ? "GORNJI" : "BOCNI"}-NACRT.svg`, corpusDrawingSvg(elements, projection, selected, groupElements), "image/svg+xml;charset=utf-8")}>Izvezi SVG</button></div><div className="drawing-legend"><span><i className="legend-normal" /> Element</span><span><i className="legend-selected" /> Izabran</span>{groupBounds && <span><i className="legend-group" /> Grupa</span>}</div></div>
      </div>

      <div className="canvas-frame">
        <svg
          className="elevation-svg"
          viewBox={`${minH - padding} 0 ${viewWidth} ${viewHeight}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${labels[0]} Corpus projekta`}
        >
          <defs>
            <pattern id="minorGrid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#dfe3dd" strokeWidth="2" />
            </pattern>
            <pattern id="majorGrid" width="500" height="500" patternUnits="userSpaceOnUse">
              <rect width="500" height="500" fill="url(#minorGrid)" />
              <path d="M 500 0 L 0 0 0 500" fill="none" stroke="#c7cdc4" strokeWidth="4" />
            </pattern>
          </defs>
          <rect x={minH - padding} y="0" width={viewWidth} height={viewHeight} fill="url(#majorGrid)" />
          {projection !== "top" && <line x1={minH - padding} y1={toScreenV(0)} x2={maxH + padding} y2={toScreenV(0)} className="floor-line" />}
          {shapes.map(({ element, points, bounds }, index) => {
            const isSelected = selected === element;
            const isGrouped = groupElements.includes(element);
            const centerH = (bounds.minH + bounds.maxH) / 2;
            const centerV = toScreenV((bounds.minV + bounds.maxV) / 2);
            const spans = corpusDrawingSpans({ bounds });
            const horizontalDimensionY = toScreenV(bounds.minV) + 62;
            const verticalDimensionX = bounds.maxH + 62;
            return (
              <g
                key={`${element.name}-${element.code}-${index}`}
                className={`drawing-element${isSelected ? " selected" : ""}${isGrouped ? " grouped" : ""}`}
                onClick={(event) => event.ctrlKey || event.metaKey || event.shiftKey ? onToggleGroup(element) : onSelect(element)}
                role="button"
                tabIndex={0}
                aria-pressed={isGrouped}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") event.ctrlKey || event.metaKey || event.shiftKey ? onToggleGroup(element) : onSelect(element); }}
              >
                <polygon points={points.map(([h, v]) => `${h},${toScreenV(v)}`).join(" ")} />
                {bounds.maxH - bounds.minH >= 180 && bounds.maxV - bounds.minV >= 130 && (
                  <text x={centerH} y={centerV} textAnchor="middle" dominantBaseline="middle">
                    {shortLabel(element.name || element.code || "Element")}
                  </text>
                )}
                {isSelected && !groupBounds && <g className="drawing-dimensions" aria-label={`Kote ${formatCoordinate(spans.horizontal)} × ${formatCoordinate(spans.vertical)}`}>
                  <line x1={bounds.minH} y1={toScreenV(bounds.minV)} x2={bounds.minH} y2={horizontalDimensionY + 14} />
                  <line x1={bounds.maxH} y1={toScreenV(bounds.minV)} x2={bounds.maxH} y2={horizontalDimensionY + 14} />
                  <line x1={bounds.minH} y1={horizontalDimensionY} x2={bounds.maxH} y2={horizontalDimensionY} />
                  <line x1={bounds.minH} y1={horizontalDimensionY - 14} x2={bounds.minH} y2={horizontalDimensionY + 14} />
                  <line x1={bounds.maxH} y1={horizontalDimensionY - 14} x2={bounds.maxH} y2={horizontalDimensionY + 14} />
                  <text x={centerH} y={horizontalDimensionY - 12} textAnchor="middle">{formatCoordinate(spans.horizontal)}</text>
                  <line x1={bounds.maxH} y1={toScreenV(bounds.minV)} x2={verticalDimensionX + 14} y2={toScreenV(bounds.minV)} />
                  <line x1={bounds.maxH} y1={toScreenV(bounds.maxV)} x2={verticalDimensionX + 14} y2={toScreenV(bounds.maxV)} />
                  <line x1={verticalDimensionX} y1={toScreenV(bounds.minV)} x2={verticalDimensionX} y2={toScreenV(bounds.maxV)} />
                  <line x1={verticalDimensionX - 14} y1={toScreenV(bounds.minV)} x2={verticalDimensionX + 14} y2={toScreenV(bounds.minV)} />
                  <line x1={verticalDimensionX - 14} y1={toScreenV(bounds.maxV)} x2={verticalDimensionX + 14} y2={toScreenV(bounds.maxV)} />
                  <text x={verticalDimensionX + 18} y={centerV} dominantBaseline="middle">{formatCoordinate(spans.vertical)}</text>
                </g>}
                <title>{`${element.name || "Neimenovan element"} · ${labels[2]} ${formatCoordinate(bounds.minH)}–${formatCoordinate(bounds.maxH)} · ${labels[3]} ${formatCoordinate(bounds.minV)}–${formatCoordinate(bounds.maxV)}`}</title>
              </g>
            );
          })}
          {groupBounds && (() => {
            const spans = corpusDrawingSpans({ bounds: groupBounds });
            const horizontalDimensionY = toScreenV(groupBounds.minV) + 92;
            const verticalDimensionX = groupBounds.maxH + 92;
            return <g className="drawing-group-envelope" aria-label={`Kote grupe ${formatCoordinate(spans.horizontal)} × ${formatCoordinate(spans.vertical)}`}>
              <rect x={groupBounds.minH} y={toScreenV(groupBounds.maxV)} width={spans.horizontal} height={spans.vertical} />
              <g className="drawing-dimensions">
                <line x1={groupBounds.minH} y1={toScreenV(groupBounds.minV)} x2={groupBounds.minH} y2={horizontalDimensionY + 14} />
                <line x1={groupBounds.maxH} y1={toScreenV(groupBounds.minV)} x2={groupBounds.maxH} y2={horizontalDimensionY + 14} />
                <line x1={groupBounds.minH} y1={horizontalDimensionY} x2={groupBounds.maxH} y2={horizontalDimensionY} />
                <text x={(groupBounds.minH + groupBounds.maxH) / 2} y={horizontalDimensionY - 12} textAnchor="middle">{formatCoordinate(spans.horizontal)}</text>
                <line x1={groupBounds.maxH} y1={toScreenV(groupBounds.minV)} x2={verticalDimensionX + 14} y2={toScreenV(groupBounds.minV)} />
                <line x1={groupBounds.maxH} y1={toScreenV(groupBounds.maxV)} x2={verticalDimensionX + 14} y2={toScreenV(groupBounds.maxV)} />
                <line x1={verticalDimensionX} y1={toScreenV(groupBounds.minV)} x2={verticalDimensionX} y2={toScreenV(groupBounds.maxV)} />
                <text x={verticalDimensionX + 18} y={toScreenV((groupBounds.minV + groupBounds.maxV) / 2)} dominantBaseline="middle">{formatCoordinate(spans.vertical)}</text>
              </g>
            </g>;
          })()}
        </svg>
        <div className="scale-chip"><span /> 500 mm mreža</div>
      </div>

      <div className="drawing-selection">
        {selected ? <><strong>{selected.name || "Neimenovan element"}</strong><span>{selected.code || selected.className} · X {formatCoordinate(selected.position[0])} · Y {formatCoordinate(selected.position[1])} · Z {formatCoordinate(selected.position[2])}</span><button onClick={onOpenData}>Otvori podatke →</button></> : <span>Izaberi element na nacrtu.</span>}
      </div>
      <p className="drawing-note"><strong>Projekcije:</strong> klik bira element, a Ctrl/Shift+klik mijenja grupni izbor; gornji nacrt koristi puni rotirani X/Z otisak, dok prednji i bočni koriste svjetski omotač i dokazanu Y visinu.</p>
    </div>
  );
}

function shortLabel(value: string): string {
  return value.length > 20 ? `${value.slice(0, 18)}…` : value;
}

function GroupTransformEditor({ count, bounds, roomClearances, canTransform, onTranslate, onPosition, onAlign, onDistribute, onSpace, onRotate, onContain, onCenter, onPlaceAtRoomSide, onSnap, onDuplicate, onDuplicateGrid, onRemove, canRemove, onSetVisibility, onIsolate, onShowAll, onClear }: {
  count: number;
  bounds: CorpusGroupBounds | null;
  roomClearances: readonly CorpusGroupRoomClearance[] | null;
  canTransform: boolean;
  onTranslate(delta: CorpusPosition): boolean;
  onPosition(targetMinimum: CorpusPosition): boolean;
  onAlign(alignment: CorpusAlignment): boolean;
  onDistribute(axis: CorpusGroupDistributionAxis): boolean;
  onSpace(axis: CorpusGroupDistributionAxis, gap: number): boolean;
  onRotate(angle: number, aroundCenter?: boolean): boolean;
  onContain(margin: number): boolean;
  onCenter(axis: CorpusGroupDistributionAxis): boolean;
  onPlaceAtRoomSide(side: CorpusGroupRoomSide, margin: number): boolean;
  onSnap(step: number): boolean;
  onDuplicate(offset: CorpusPosition, count: number): boolean;
  onDuplicateGrid(columns: number, rows: number, columnStep: CorpusPosition, rowStep: CorpusPosition): boolean;
  onRemove(): boolean;
  canRemove: boolean;
  onSetVisibility(visible: boolean): boolean;
  onIsolate(): boolean;
  onShowAll(): boolean;
  onClear(): void;
}) {
  const [x, setX] = useState("0");
  const [y, setY] = useState("0");
  const [z, setZ] = useState("0");
  const [targetMinimum, setTargetMinimum] = useState<[string, string, string]>(["0", "0", "0"]);
  const [angle, setAngle] = useState("90");
  const [gap, setGap] = useState("20");
  const [margin, setMargin] = useState("0");
  const [copyX, setCopyX] = useState("600");
  const [copyY, setCopyY] = useState("0");
  const [copyZ, setCopyZ] = useState("0");
  const [copyCount, setCopyCount] = useState("1");
  const [gridColumns, setGridColumns] = useState("2");
  const [gridRows, setGridRows] = useState("2");
  const [columnStep, setColumnStep] = useState<[string, string, string]>(["600", "0", "0"]);
  const [rowStep, setRowStep] = useState<[string, string, string]>(["0", "900", "0"]);
  const [message, setMessage] = useState("");
  const selectedEnough = count >= 2;
  const ready = selectedEnough && canTransform;

  useEffect(() => {
    if (bounds) setTargetMinimum([formatNumber(bounds.minX), formatNumber(bounds.minY), formatNumber(bounds.minZ)]);
  }, [bounds?.minX, bounds?.minY, bounds?.minZ]);

  function translate() {
    const delta = [x, y, z].map((value) => Number(value.replace(",", "."))) as unknown as CorpusPosition;
    if (delta.some((value) => !Number.isFinite(value))) return setMessage("Pomaci moraju biti brojevi.");
    setMessage(onTranslate(delta) ? `${count} elementa su pomjerena u jednom Undo koraku.` : "Izabrani elementi nemaju potpune položaje.");
  }

  function position() {
    const target = targetMinimum.map((value) => Number(value.replace(",", "."))) as unknown as CorpusPosition;
    if (target.some((value) => !Number.isFinite(value))) return setMessage("Ciljne koordinate moraju biti brojevi.");
    setMessage(onPosition(target) ? "Minimalni ugao zajedničkog omotača postavljen je na tačne X/Y/Z koordinate u jednom Undo koraku." : "Grupu nije moguće postaviti na zadane koordinate.");
  }

  function align(alignment: CorpusAlignment) {
    setMessage(onAlign(alignment) ? `${count} elementa su poravnata u jednom Undo koraku.` : "Za poravnanje trebaju potpune mjere i položaji.");
  }

  function distribute(axis: CorpusGroupDistributionAxis) {
    setMessage(onDistribute(axis) ? `${count} elementa su ravnomjerno raspoređena po ${axis.toUpperCase()} osi u jednom Undo koraku.` : "Za raspodjelu trebaju najmanje tri potpuna omotača sa dovoljno prostora između krajnjih.");
  }

  function space(axis: CorpusGroupDistributionAxis) {
    const value = Number(gap.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return setMessage("Razmak mora biti broj 0 mm ili veći.");
    setMessage(onSpace(axis, value) ? `${count} elementa su složena sa razmakom ${value} mm po ${axis.toUpperCase()} osi u jednom Undo koraku.` : "Za zadani razmak trebaju najmanje dva elementa sa potpunim omotačima.");
  }

  function rotate(value = Number(angle.replace(",", ".")), aroundCenter = false) {
    if (!Number.isFinite(value)) return setMessage("Ugao rotacije mora biti broj.");
    setMessage(onRotate(value, aroundCenter) ? `${count} elementa su rotirana ${aroundCenter ? "oko centra zajedničkog omotača" : "oko prvog sidra"} u jednom Undo koraku.` : "Izabrani elementi nemaju potpune položaje.");
  }

  function contain() {
    const value = Number(margin.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return setMessage("Sigurnosni odmak mora biti broj 0 mm ili veći.");
    setMessage(onContain(value) ? "Cijela grupa je vraćena unutar prostorije u jednom Undo koraku." : "Grupa nema potpune omotače ili sa zadanim odmakom ne staje u prostoriju.");
  }

  function placeAtRoomSide(side: CorpusGroupRoomSide, label: string) {
    const value = Number(margin.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return setMessage("Sigurnosni odmak mora biti broj 0 mm ili veći.");
    setMessage(onPlaceAtRoomSide(side, value) ? `Grupa je postavljena ${label} sa odmakom ${value} mm.` : "Grupa nema potpune omotače ili sa zadanim odmakom ne staje uz tu granicu.");
  }

  function duplicate() {
    const offset = [copyX, copyY, copyZ].map((value) => Number(value.replace(",", "."))) as unknown as CorpusPosition;
    const repetitions = Number(copyCount);
    if (offset.some((value) => !Number.isFinite(value)) || offset.every((value) => value === 0)) return setMessage("Pomak kopije mora sadržati broj i ne može biti nula na sve tri ose.");
    if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 50) return setMessage("Broj ponavljanja mora biti cijeli broj od 1 do 50.");
    setMessage(onDuplicate(offset, repetitions) ? `Napravljeno je ${count * repetitions} nezavisnih kopija u ${repetitions} ponavljanja i jednom Undo koraku; kopije su sada označene.` : "Grupu nije moguće kopirati.");
  }

  function duplicateGrid() {
    const columns = Number(gridColumns);
    const rows = Number(gridRows);
    const column = columnStep.map((value) => Number(value.replace(",", "."))) as unknown as CorpusPosition;
    const row = rowStep.map((value) => Number(value.replace(",", "."))) as unknown as CorpusPosition;
    const copyGroups = columns * rows - 1;
    if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1 || copyGroups < 1 || copyGroups > 50) return setMessage("Mreža mora imati najmanje dvije ćelije i najviše 50 novih grupa.");
    if (column.some((value) => !Number.isFinite(value)) || row.some((value) => !Number.isFinite(value))) return setMessage("Svi koraci mreže moraju biti brojevi.");
    if (columns > 1 && column.every((value) => value === 0)) return setMessage("Korak kolone ne može biti nula na sve tri ose.");
    if (rows > 1 && row.every((value) => value === 0)) return setMessage("Korak reda ne može biti nula na sve tri ose.");
    setMessage(onDuplicateGrid(columns, rows, column, row) ? `Napravljena je mreža sa ${copyGroups} novih grupa i ${count * copyGroups} elemenata u jednom Undo koraku.` : "Grupnu mrežu nije moguće napraviti.");
  }

  return <section className="data-section geometry-editor group-transform-editor">
    <div className="section-title"><h3>Grupne operacije</h3><span>{count} označeno</span><button className="secondary-button" onClick={onClear}>Poništi izbor</button></div>
    <p>{ready ? "Prvi označeni element je sidro poravnanja i rotacije. Pomjeranje i prostorna ograničenja čuvaju međusobni raspored cijele grupe." : !selectedEnough ? "Označi još najmanje jedan korijenski element dugmetom + u stablu projekta." : "Grupa sadrži zaključan ili neurediv Corpus element. Geometrijske operacije su onemogućene dok ga svjesno ne otključaš."}</p>
    {bounds && <div className="group-measurement-readout" aria-label="Mjere zajedničkog omotača">
      <strong>Mjere zajedničkog omotača</strong>
      <div><span>Širina X</span><b>{formatNumber(bounds.width)} mm</b></div>
      <div><span>Visina Y</span><b>{formatNumber(bounds.height)} mm</b></div>
      <div><span>Dubina Z</span><b>{formatNumber(bounds.depth)} mm</b></div>
    </div>}
    {roomClearances && <div className="room-clearance-readout" aria-label="Udaljenosti grupe do granica prostorije">
      {roomClearances.map((item) => <div key={item.side} className={`room-clearance-${item.status}`}><span>{roomSideLabel(item.side)}</span><b>{item.distance === null ? "—" : `${formatNumber(Math.abs(item.distance))} mm`}</b><small>{item.status === "outside" ? "izvan" : item.status === "touch" ? "dodir" : item.status === "unknown" ? "nepoznato" : "slobodno"}</small></div>)}
    </div>}
    <strong className="placement-subtitle">Postavi minimalni ugao omotača</strong>
    <div className="group-position-fields">
      {(["X", "Y", "Z"] as const).map((axis, index) => <label key={axis}><span>Cilj {axis}</span><div><input aria-label={`Ciljna koordinata grupe ${axis}`} inputMode="decimal" value={targetMinimum[index]} onChange={(event) => setTargetMinimum(targetMinimum.map((value, item) => item === index ? event.target.value : value) as [string, string, string])} /><small>mm</small></div></label>)}
      <button className="primary-button" disabled={!ready || !bounds} onClick={position}>Postavi grupu</button>
    </div>
    <div className="group-move-fields">
      <label><span>Pomak X</span><div><input aria-label="Grupni pomak X" inputMode="decimal" value={x} onChange={(event) => setX(event.target.value)} /><small>mm</small></div></label>
      <label><span>Pomak Y</span><div><input aria-label="Grupni pomak Y" inputMode="decimal" value={y} onChange={(event) => setY(event.target.value)} /><small>mm</small></div></label>
      <label><span>Pomak Z</span><div><input aria-label="Grupni pomak Z" inputMode="decimal" value={z} onChange={(event) => setZ(event.target.value)} /><small>mm</small></div></label>
      <button className="primary-button" disabled={!ready} onClick={translate}>Pomjeri grupu</button>
    </div>
    <strong className="placement-subtitle">Poravnaj prema prvom označenom</strong>
    <div className="placement-buttons group-align-buttons">
      <button disabled={!ready} onClick={() => align("left")}>Lijevo</button><button disabled={!ready} onClick={() => align("centerX")}>Sredina X</button><button disabled={!ready} onClick={() => align("right")}>Desno</button>
      <button disabled={!ready} onClick={() => align("back")}>Nazad</button><button disabled={!ready} onClick={() => align("centerZ")}>Sredina Z</button><button disabled={!ready} onClick={() => align("front")}>Naprijed</button>
      <button disabled={!ready} onClick={() => align("bottom")}>Dno</button><button disabled={!ready} onClick={() => align("centerY")}>Sredina Y</button><button disabled={!ready} onClick={() => align("top")}>Vrh</button>
    </div>
    <strong className="placement-subtitle">Ravnomjerni razmak između krajnjih</strong>
    <div className="placement-buttons">
      <button disabled={count < 3} onClick={() => distribute("x")}>Jednak razmak X</button>
      <button disabled={count < 3} onClick={() => distribute("y")}>Jednak razmak Y</button>
      <button disabled={count < 3} onClick={() => distribute("z")}>Jednak razmak Z</button>
    </div>
    <strong className="placement-subtitle">Postavi cijelu grupu uz granicu</strong>
    <div className="placement-buttons group-room-side-buttons">
      <button disabled={!ready} onClick={() => placeAtRoomSide("left", "uz lijevi zid")}>Lijevi zid</button>
      <button disabled={!ready} onClick={() => placeAtRoomSide("right", "uz desni zid")}>Desni zid</button>
      <button disabled={!ready} onClick={() => placeAtRoomSide("floor", "na pod")}>Pod</button>
      <button disabled={!ready} onClick={() => placeAtRoomSide("ceiling", "uz plafon")}>Plafon</button>
      <button disabled={!ready} onClick={() => placeAtRoomSide("back", "uz zadnji zid")}>Zadnji zid</button>
      <button disabled={!ready} onClick={() => placeAtRoomSide("front", "uz prednji zid")}>Prednji zid</button>
    </div>
    <strong className="placement-subtitle">Tačan razmak redom od prvog prostornog elementa</strong>
    <div className="group-constraint-fields">
      <label><span>Razmak</span><div><input aria-label="Tačan razmak grupe" inputMode="decimal" value={gap} onChange={(event) => setGap(event.target.value)} /><small>mm</small></div></label>
      <button disabled={!ready} onClick={() => space("x")}>Složi po X</button>
      <button disabled={!ready} onClick={() => space("y")}>Složi po Y</button>
      <button disabled={!ready} onClick={() => space("z")}>Složi po Z</button>
    </div>
    <strong className="placement-subtitle">Rotiraj grupu oko prvog označenog</strong>
    <div className="group-rotate-fields">
      <label><span>Ugao</span><div><input aria-label="Ugao grupne rotacije" inputMode="decimal" value={angle} onChange={(event) => setAngle(event.target.value)} /><small>°</small></div></label>
      <button disabled={!ready} onClick={() => rotate(-90)}>−90°</button><button disabled={!ready} onClick={() => rotate(90)}>+90°</button><button className="primary-button" disabled={!ready} onClick={() => rotate()}>Rotiraj grupu</button>
    </div>
    <div className="placement-buttons group-center-rotation-buttons">
      <button disabled={!ready} onClick={() => rotate(-90, true)}>−90° oko centra</button>
      <button disabled={!ready} onClick={() => rotate(90, true)}>+90° oko centra</button>
      <button disabled={!ready} onClick={() => rotate(Number(angle.replace(",", ".")), true)}>Zadani ugao oko centra</button>
    </div>
    <strong className="placement-subtitle">Grupna ograničenja</strong>
    <div className="group-constraint-fields">
      <label><span>Sigurnosni odmak</span><div><input aria-label="Sigurnosni odmak grupe" inputMode="decimal" value={margin} onChange={(event) => setMargin(event.target.value)} /><small>mm</small></div></label>
      <button disabled={!ready} onClick={() => setMessage(onSnap(10) ? "Pivot sidra je postavljen na mrežu 10 mm; grupa je zadržala raspored." : "Grupu nije moguće postaviti na mrežu.")}>Mreža 10 mm</button>
      <button className="primary-button" disabled={!ready} onClick={contain}>Vrati grupu unutar sobe</button>
    </div>
    <strong className="placement-subtitle">Centriraj zajednički omotač u prostoriji</strong>
    <div className="placement-buttons">
      <button disabled={!ready} onClick={() => setMessage(onCenter("x") ? "Grupa je centrirana po X osi prostorije." : "Grupu nije moguće centrirati po X osi prostorije.")}>Centriraj X</button>
      <button disabled={!ready} onClick={() => setMessage(onCenter("y") ? "Grupa je centrirana po Y osi prostorije." : "Grupu nije moguće centrirati po Y osi prostorije.")}>Centriraj Y</button>
      <button disabled={!ready} onClick={() => setMessage(onCenter("z") ? "Grupa je centrirana po Z osi prostorije." : "Grupu nije moguće centrirati po Z osi prostorije.")}>Centriraj Z</button>
    </div>
    <strong className="placement-subtitle">Vidljivost u projektu i 3D prikazu</strong>
    <div className="placement-buttons group-visibility-buttons">
      <button disabled={!selectedEnough} onClick={() => setMessage(onSetVisibility(false) ? "Označena grupa je sakrivena u jednom Undo koraku." : "Grupu nije moguće sakriti.")}>Sakrij grupu</button>
      <button disabled={!selectedEnough} onClick={() => setMessage(onSetVisibility(true) ? "Označena grupa je ponovo vidljiva." : "Grupu nije moguće prikazati.")}>Prikaži grupu</button>
      <button disabled={!selectedEnough} onClick={() => setMessage(onIsolate() ? "Prikazana je samo označena grupa; ostali korijeni su sakriveni." : "Grupu nije moguće izolovati.")}>Izoluj grupu</button>
      <button onClick={() => setMessage(onShowAll() ? "Svi korijenski elementi su vidljivi." : "Korijenske elemente nije moguće prikazati.")}>Prikaži sve</button>
    </div>
    <strong className="placement-subtitle">Kopiraj cijelu grupu</strong>
    <div className="group-copy-fields">
      <label><span>Ponavljanja</span><div><input aria-label="Broj kopija grupe" inputMode="numeric" value={copyCount} onChange={(event) => setCopyCount(event.target.value)} /><small>×</small></div></label>
      <label><span>Pomak X</span><div><input aria-label="Pomak X kopije grupe" inputMode="decimal" value={copyX} onChange={(event) => setCopyX(event.target.value)} /><small>mm</small></div></label>
      <label><span>Pomak Y</span><div><input aria-label="Pomak Y kopije grupe" inputMode="decimal" value={copyY} onChange={(event) => setCopyY(event.target.value)} /><small>mm</small></div></label>
      <label><span>Pomak Z</span><div><input aria-label="Pomak Z kopije grupe" inputMode="decimal" value={copyZ} onChange={(event) => setCopyZ(event.target.value)} /><small>mm</small></div></label>
      <button className="primary-button" disabled={!selectedEnough} onClick={duplicate}>Kopiraj grupu</button>
    </div>
    <strong className="placement-subtitle">2D mreža cijele grupe</strong>
    <div className="group-copy-fields">
      <label><span>Kolone</span><div><input aria-label="Broj kolona grupne mreže" inputMode="numeric" value={gridColumns} onChange={(event) => setGridColumns(event.target.value)} /><small>×</small></div></label>
      <label><span>Redovi</span><div><input aria-label="Broj redova grupne mreže" inputMode="numeric" value={gridRows} onChange={(event) => setGridRows(event.target.value)} /><small>×</small></div></label>
      {(["X", "Y", "Z"] as const).map((axis, index) => <label key={`column-${axis}`}><span>Kolona {axis}</span><div><input aria-label={`Korak kolone ${axis}`} inputMode="decimal" value={columnStep[index]} onChange={(event) => setColumnStep(columnStep.map((value, item) => item === index ? event.target.value : value) as [string, string, string])} /><small>mm</small></div></label>)}
      {(["X", "Y", "Z"] as const).map((axis, index) => <label key={`row-${axis}`}><span>Red {axis}</span><div><input aria-label={`Korak reda ${axis}`} inputMode="decimal" value={rowStep[index]} onChange={(event) => setRowStep(rowStep.map((value, item) => item === index ? event.target.value : value) as [string, string, string])} /><small>mm</small></div></label>)}
      <button className="primary-button" disabled={!selectedEnough} onClick={duplicateGrid}>Napravi grupnu mrežu</button>
    </div>
    <div className="group-remove-row"><span>{canRemove ? "Označeni su samo dodani elementi; izvorni fajlovi ostaju netaknuti." : "Grupno uklanjanje je dostupno samo kada su svi označeni elementi dodani ili kopirani u radnoj kopiji."}</span><button className="danger-button" disabled={!canRemove} onClick={onRemove}>Ukloni označene dodane elemente</button></div>
    {message && <p className="placement-message">{message}</p>}
  </section>;
}

function ElementDetails({ element, room, placementElements, groupSelection, canEdit, canTransformGroup, onTranslateGroup, onPositionGroup, onAlignGroup, onDistributeGroup, onSpaceGroup, onRotateGroup, onContainGroup, onCenterGroup, onPlaceGroupAtRoomSide, onSnapGroup, onDuplicateGroup, onDuplicateGroupGrid, onRemoveGroup, canRemoveGroup, onSetGroupVisibility, onIsolateGroup, onShowAllRoots, onClearGroup, selectedBoardIndex, boardSelection, onBoardSelectionChange, onSelectBoard, onUpdate, onFitToBoards, onUpdateIdentity, onUpdateVariables, onUpdateBoard, onUpdateBoardAppearance, onUpdateBoardHoles, onUpdateBoardContour, onUpdateBoardEdgeBanding, onAddBoard, onRenameBoard, onMoveBoard, onDuplicateBoard, onDuplicateBoardArray, onDuplicateBoardGrid, onTranslateBoards, onDistributeBoards, onAlignBoards, onPlaceBoards, onDuplicateBoards, onRemoveBoards, onApplyBoardAppearance, onSetBoardsVisibility, onDistributeBoardArray, onRemoveBoard, onUndo, onRemoveImported, onDuplicateImported, onExportSelectedE3d, canChangeStructure, canRemoveImported, canExportE3d, canDuplicate, canUndo, onOpenProduction }: {
  element: CorpusS3dElement;
  room: CorpusS3dRoom;
  placementElements: readonly CorpusS3dElement[];
  groupSelection: readonly number[];
  canEdit: boolean;
  canTransformGroup: boolean;
  onTranslateGroup(delta: CorpusPosition): boolean;
  onPositionGroup(targetMinimum: CorpusPosition): boolean;
  onAlignGroup(alignment: CorpusAlignment): boolean;
  onDistributeGroup(axis: CorpusGroupDistributionAxis): boolean;
  onSpaceGroup(axis: CorpusGroupDistributionAxis, gap: number): boolean;
  onRotateGroup(angle: number): boolean;
  onContainGroup(margin: number): boolean;
  onCenterGroup(axis: CorpusGroupDistributionAxis): boolean;
  onPlaceGroupAtRoomSide(side: CorpusGroupRoomSide, margin: number): boolean;
  onSnapGroup(step: number): boolean;
  onDuplicateGroup(offset: CorpusPosition, count: number): boolean;
  onDuplicateGroupGrid(columns: number, rows: number, columnStep: CorpusPosition, rowStep: CorpusPosition): boolean;
  onRemoveGroup(): boolean;
  canRemoveGroup: boolean;
  onSetGroupVisibility(visible: boolean): boolean;
  onIsolateGroup(): boolean;
  onShowAllRoots(): boolean;
  onClearGroup(): void;
  selectedBoardIndex: number | null;
  boardSelection: readonly number[];
  onBoardSelectionChange(selection: readonly number[]): void;
  onSelectBoard(boardIndex: number | null): void;
  onUpdate(patch: ElementGeometryPatch): void;
  onFitToBoards(): boolean;
  onUpdateIdentity(patch: ElementIdentityPatch): void;
  onUpdateVariables(variables: ElementVariablesPatch): void;
  onUpdateBoard(boardIndex: number, patch: BoardGeometryPatch): void;
  onUpdateBoardAppearance(boardIndex: number, patch: BoardAppearancePatch): void;
  onUpdateBoardHoles(boardIndex: number, holes: readonly CorpusS3dHole[]): void;
  onUpdateBoardContour(boardIndex: number, points: readonly CorpusStraightContourPoint[]): void;
  onUpdateBoardEdgeBanding(boardIndex: number, spec: CorpusEdgeBandingSpec): void;
  onAddBoard(spec: CorpusNewBoardSpec): void;
  onRenameBoard(boardIndex: number, name: string): void;
  onMoveBoard(boardIndex: number, direction: -1 | 1): void;
  onDuplicateBoard(boardIndex: number): void;
  onDuplicateBoardArray(boardIndex: number, count: number, offset: CorpusCopyOffset): void;
  onDuplicateBoardGrid(boardIndex: number, columns: number, rows: number, columnStep: CorpusCopyOffset, rowStep: CorpusCopyOffset): boolean;
  onTranslateBoards(boardIndexes: readonly number[], delta: CorpusCopyOffset): boolean;
  onDistributeBoards(boardIndexes: readonly number[], axis: CorpusBoardGroupAxis): number | null;
  onAlignBoards(boardIndexes: readonly number[], axis: CorpusBoardGroupAxis, alignment: CorpusBoardGroupAlignment): boolean;
  onPlaceBoards(boardIndexes: readonly number[], axis: CorpusBoardGroupAxis, alignment: CorpusBoardGroupAlignment, inset: number): boolean;
  onDuplicateBoards(boardIndexes: readonly number[], delta: CorpusCopyOffset): boolean;
  onRemoveBoards(boardIndexes: readonly number[]): boolean;
  onApplyBoardAppearance(boardIndexes: readonly number[], sourceBoardIndex: number): boolean;
  onSetBoardsVisibility(boardIndexes: readonly number[], visible: boolean): boolean;
  onDistributeBoardArray(boardIndex: number, copiesCount: number, axis: CorpusBoardPlacementAxis, inset: number): boolean;
  onRemoveBoard(boardIndex: number): void;
  onUndo(): void;
  onRemoveImported(): void;
  onDuplicateImported(count?: number, offset?: CorpusCopyOffset): void;
  onExportSelectedE3d(): void;
  canChangeStructure: boolean;
  canRemoveImported: boolean;
  canExportE3d: boolean;
  canDuplicate: boolean;
  canUndo: boolean;
  onOpenProduction(): void;
}) {
  const [editorTab, setEditorTab] = useState<"basic" | "placement" | "construction" | "materials" | "variables" | "operations" | "production" | "advanced">("basic");
  const [boardCreatorOpen, setBoardCreatorOpen] = useState(false);
  const [boardGroupDelta, setBoardGroupDelta] = useState<[string, string, string]>(["0", "100", "0"]);
  const [boardGroupAxis, setBoardGroupAxis] = useState<CorpusBoardGroupAxis>("y");
  const [boardGroupInset, setBoardGroupInset] = useState("0");
  const [boardGroupMessage, setBoardGroupMessage] = useState("");
  const boardStructureKey = element.boards.map((board) => board.name).join("\u0000");
  const previousBoardStructureKey = useRef(boardStructureKey);
  const previousSelectedBoardIndex = useRef(selectedBoardIndex);
  useEffect(() => {
    if (selectedBoardIndex !== null && previousSelectedBoardIndex.current !== selectedBoardIndex) {
      setEditorTab((current) => current === "materials" || current === "operations" || current === "construction" ? current : "construction");
    }
    previousSelectedBoardIndex.current = selectedBoardIndex;
  }, [selectedBoardIndex]);
  useEffect(() => {
    if (previousBoardStructureKey.current === boardStructureKey) return;
    previousBoardStructureKey.current = boardStructureKey;
    onBoardSelectionChange([]);
    setBoardGroupMessage("");
  }, [boardStructureKey, onBoardSelectionChange]);
  const materials = useMemo(() => {
    const counts = new Map<string, number>();
    for (const board of element.boards) {
      const name = board.materialName || "Materijal nije naveden";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [element]);
  const elementCutList = useMemo(() => buildCorpusCutList([element]), [element]);
  const elementConsumables = useMemo(() => buildCorpusConsumablesList([element]), [element]);
  const elementHoleCount = element.boards.reduce((total, board) => total + board.holeCount, 0);
  const elementFrontCount = element.boards.filter((board) => board.frontType !== null).length;
  const groupBounds = useMemo(() => corpusGroupBounds(placementElements, groupSelection), [placementElements, groupSelection]);
  const groupRoomClearances = useMemo(() => corpusGroupRoomClearances(placementElements, groupSelection, room), [placementElements, groupSelection, room]);
  const validBoardSelection = boardSelection.filter((index) => index >= 0 && index < element.boards.length);

  function toggleBoardSelection(index: number) {
    onBoardSelectionChange(boardSelection.includes(index) ? boardSelection.filter((item) => item !== index) : [...boardSelection, index].sort((left, right) => left - right));
    setBoardGroupMessage("");
  }

  function translateBoardSelection() {
    const delta = boardGroupDelta.map((value) => Number(value.replace(",", "."))) as [number, number, number];
    if (validBoardSelection.length < 2) return setBoardGroupMessage("Označi najmanje dvije ploče.");
    if (delta.some((value) => !Number.isFinite(value))) return setBoardGroupMessage("Sva tri pomaka moraju biti brojevi.");
    if (delta.every((value) => value === 0)) return setBoardGroupMessage("Najmanje jedan pomak mora biti različit od nule.");
    if (onTranslateBoards(validBoardSelection, delta)) setBoardGroupMessage(`${validBoardSelection.length} ploča je pomjereno kao jedna Undo operacija.`);
  }

  function distributeBoardSelection() {
    if (validBoardSelection.length < 3) return setBoardGroupMessage("Za raspodjelu označi najmanje tri ploče.");
    const gap = onDistributeBoards(validBoardSelection, boardGroupAxis);
    if (gap !== null) setBoardGroupMessage(`${validBoardSelection.length} ploča je raspoređeno sa razmakom ${formatNumber(gap)} mm kao jedna Undo operacija.`);
  }

  function alignBoardSelection(alignment: CorpusBoardGroupAlignment) {
    if (validBoardSelection.length < 2) return setBoardGroupMessage("Za poravnanje označi najmanje dvije ploče.");
    if (onAlignBoards(validBoardSelection, boardGroupAxis, alignment)) {
      const label = alignment === "min" ? "početnoj ivici" : alignment === "center" ? "centru" : "završnoj ivici";
      setBoardGroupMessage(`${validBoardSelection.length} ploča je poravnato prema ${label} prve označene ploče.`);
    }
  }

  function placeBoardSelection(alignment: CorpusBoardGroupAlignment) {
    if (validBoardSelection.length < 2) return setBoardGroupMessage("Za grupno postavljanje označi najmanje dvije ploče.");
    const inset = Number(boardGroupInset.replace(",", "."));
    if (!Number.isFinite(inset) || inset < 0) return setBoardGroupMessage("Odmak grupe mora biti nenegativan broj.");
    if (onPlaceBoards(validBoardSelection, boardGroupAxis, alignment, inset)) {
      const label = alignment === "min" ? "početnu granicu" : alignment === "center" ? "centar" : "završnu granicu";
      setBoardGroupMessage(`${validBoardSelection.length} ploča je postavljeno uz ${label} elementa po osi ${boardGroupAxis.toUpperCase()} kao jedna Undo operacija.`);
    }
  }

  function duplicateBoardSelection() {
    const delta = boardGroupDelta.map((value) => Number(value.replace(",", "."))) as [number, number, number];
    if (validBoardSelection.length < 2) return setBoardGroupMessage("Za grupno kopiranje označi najmanje dvije ploče.");
    if (delta.some((value) => !Number.isFinite(value))) return setBoardGroupMessage("Sva tri pomaka moraju biti brojevi.");
    if (delta.every((value) => value === 0)) return setBoardGroupMessage("Najmanje jedan pomak kopija mora biti različit od nule.");
    if (onDuplicateBoards(validBoardSelection, delta)) setBoardGroupMessage(`${validBoardSelection.length} ploča je kopirano kao jedna Undo operacija.`);
  }

  function removeBoardSelection() {
    if (onRemoveBoards(validBoardSelection)) setBoardGroupMessage(`${validBoardSelection.length} ploča je uklonjeno iz radne kopije.`);
  }

  function applyAppearanceToBoardSelection() {
    if (selectedBoardIndex === null || !element.boards[selectedBoardIndex]) return setBoardGroupMessage("Izaberi aktivnu ploču čiji izgled želiš prenijeti.");
    if (validBoardSelection.length < 2) return setBoardGroupMessage("Za grupni izgled označi najmanje dvije ploče.");
    if (onApplyBoardAppearance(validBoardSelection, selectedBoardIndex)) {
      setBoardGroupMessage(`Materijal, boja, providnost i vidljivost ploče „${element.boards[selectedBoardIndex]!.name || selectedBoardIndex + 1}“ primijenjeni su na ${validBoardSelection.length} označene ploče.`);
    }
  }

  function setBoardSelectionVisibility(visible: boolean) {
    if (validBoardSelection.length < 2) return setBoardGroupMessage("Za grupnu vidljivost označi najmanje dvije ploče.");
    if (onSetBoardsVisibility(validBoardSelection, visible)) {
      setBoardGroupMessage(`${validBoardSelection.length} označene ploče su ${visible ? "prikazane" : "sakrivene"} kao jedna Undo operacija.`);
    }
  }

  return (
    <div className="detail-content element-editor">
      <nav className="element-editor-tabs" aria-label="Grupe funkcija elementa">
        <button aria-current={editorTab === "basic" ? "page" : undefined} className={editorTab === "basic" ? "active" : ""} onClick={() => setEditorTab("basic")}>Osnovno</button>
        <button aria-current={editorTab === "placement" ? "page" : undefined} className={editorTab === "placement" ? "active" : ""} onClick={() => setEditorTab("placement")}>Raspored</button>
        <button aria-current={editorTab === "construction" ? "page" : undefined} className={editorTab === "construction" ? "active" : ""} onClick={() => setEditorTab("construction")}>Konstrukcija <span>{element.boards.length}</span></button>
        <button aria-current={editorTab === "materials" ? "page" : undefined} className={editorTab === "materials" ? "active" : ""} onClick={() => setEditorTab("materials")}>Materijali</button>
        <button aria-current={editorTab === "variables" ? "page" : undefined} className={editorTab === "variables" ? "active" : ""} onClick={() => setEditorTab("variables")}>Varijable <span>{Object.keys(element.variables).length}</span></button>
        <button aria-current={editorTab === "operations" ? "page" : undefined} className={editorTab === "operations" ? "active" : ""} onClick={() => setEditorTab("operations")}>Obrade <span>{elementHoleCount + element.macroLinks.length}</span></button>
        <button aria-current={editorTab === "production" ? "page" : undefined} className={editorTab === "production" ? "active" : ""} onClick={() => setEditorTab("production")}>Proizvodnja</button>
        <button aria-current={editorTab === "advanced" ? "page" : undefined} className={editorTab === "advanced" ? "active" : ""} onClick={() => setEditorTab("advanced")}>Napredno</button>
      </nav>

      {editorTab === "basic" && <><div className="property-grid">
        <Property label="Širina" value={formatMillimeters(element.width)} />
        <Property label="Visina" value={formatMillimeters(element.height)} />
        <Property label="Dubina" value={formatMillimeters(element.depth)} />
        <Property label="Ugao" value={element.angle === null ? "—" : `${formatNumber(element.angle)}°`} />
        <Property label="Pozicija X" value={formatCoordinate(element.position[0])} />
        <Property label="Pozicija Y / Z" value={`${formatCoordinate(element.position[1])} / ${formatCoordinate(element.position[2])}`} />
      </div>

      <ElementGeometryEditor element={element} canEdit={canEdit} onUpdate={onUpdate} onFitToBoards={onFitToBoards} onUndo={onUndo} onRemoveImported={onRemoveImported} onDuplicateImported={onDuplicateImported} onExportSelectedE3d={onExportSelectedE3d} canRemoveImported={canRemoveImported} canExportE3d={canExportE3d} canDuplicate={canDuplicate} canUndo={canUndo} />
      <ElementIdentityEditor element={element} onUpdate={onUpdateIdentity} /></>}
      {editorTab === "placement" && <>
      {groupSelection.length > 0 && <GroupTransformEditor count={groupSelection.length} bounds={groupBounds} roomClearances={groupRoomClearances} canTransform={canTransformGroup} onTranslate={onTranslateGroup} onPosition={onPositionGroup} onAlign={onAlignGroup} onDistribute={onDistributeGroup} onSpace={onSpaceGroup} onRotate={onRotateGroup} onContain={onContainGroup} onCenter={onCenterGroup} onPlaceAtRoomSide={onPlaceGroupAtRoomSide} onSnap={onSnapGroup} onDuplicate={onDuplicateGroup} onDuplicateGrid={onDuplicateGroupGrid} onRemove={onRemoveGroup} canRemove={canRemoveGroup} onSetVisibility={onSetGroupVisibility} onIsolate={onIsolateGroup} onShowAll={onShowAllRoots} onClear={onClearGroup} />}
      {canEdit ? <ElementPlacementEditor element={element} room={room} elements={placementElements} onUpdate={onUpdate} /> : <section className="data-section locked-editor-notice"><div className="section-title"><h3>Precizno postavljanje</h3><span>zaštićeno</span></div><p>Corpus element je zaključan ili označen kao neurediv. Otključaj ga u odjeljku „Identitet i stanje“ da bi promijenio geometriju, ploče ili bušenja.</p></section>}
      {canDuplicate && <ElementArrayEditor element={element} onCreate={onDuplicateImported} />}
      </>}

      {editorTab === "construction" && <section className="data-section">
        <div className="section-title"><h3>Ploče</h3><span>{element.boards.length}</span>{canChangeStructure && <button className="secondary-button" onClick={() => setBoardCreatorOpen(true)}>Dodaj ploču</button>}</div>
        {element.boards.length ? (
          <div className="board-table-wrap"><table className="board-table">
            <thead><tr><th aria-label="Grupni izbor ploča">✓</th><th>Naziv</th><th>Dimenzije</th><th>Smjer</th><th>Kontura</th><th>Materijal</th><th>Rupe</th></tr></thead>
            <tbody>{element.boards.map((board, index) => (
              <tr key={`${board.name}-${index}`} className={selectedBoardIndex === index ? "selected" : ""} tabIndex={0} onClick={() => onSelectBoard(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelectBoard(index); }}>
                <td><input type="checkbox" aria-label={`Označi ploču ${board.name || index + 1}`} checked={validBoardSelection.includes(index)} onClick={(event) => event.stopPropagation()} onChange={() => toggleBoardSelection(index)} /></td>
                <td><strong>{board.name || `Ploča ${index + 1}`}</strong>{board.frontType !== null && <small className="board-part-kind">Fronta · TIPFRONTE {formatNumber(board.frontType)}</small>}</td>
                <td>{formatMillimeters(board.width)} × {formatMillimeters(board.height)} × {formatMillimeters(board.thickness)}</td>
                <td>{formatBoardDirection(board.direction)}</td>
                <td>{board.curvePoints.length ? `${board.curvePoints.length} tač. ${board.curveIsApproximate ? "· luk" : "· ravno"}` : "—"}</td>
                <td>{board.materialName || "—"}</td>
                <td>{board.holeCount}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="empty-copy">Ovaj element nema direktno pridružene ploče.</p>}
        {canEdit && element.boards.length > 1 && <div className="board-group-editor">
          <div className="board-group-heading"><div><strong>Grupni izbor ploča</strong><span>{validBoardSelection.length} označeno · tabela ili Ctrl/Shift+klik u 3D prikazu</span></div><div><button className="secondary-button" onClick={() => onBoardSelectionChange(element.boards.map((_, index) => index))}>Označi sve</button><button className="secondary-button" disabled={!validBoardSelection.length} title={validBoardSelection.length ? "Očisti grupni izbor ploča" : "Nijedna ploča nije označena"} onClick={() => onBoardSelectionChange([])}>Poništi</button></div></div>
          <div className="board-group-fields">
            {(["X", "Y", "Z"] as const).map((axis, index) => <label key={`board-group-${axis}`}><span>Pomak {axis}</span><div><input aria-label={`Grupni pomak ploča ${axis}`} inputMode="decimal" value={boardGroupDelta[index]} onChange={(event) => setBoardGroupDelta(boardGroupDelta.map((value, item) => item === index ? event.target.value : value) as [string, string, string])} /><small>mm</small></div></label>)}
            <button className="primary-button" disabled={validBoardSelection.length < 2} title={validBoardSelection.length < 2 ? "Označi najmanje dvije ploče za grupno pomjeranje" : "Pomjeri označene ploče za zadane X, Y i Z vrijednosti"} onClick={translateBoardSelection}>Pomjeri označene</button>
            <button className="secondary-button" disabled={validBoardSelection.length < 2 || !canChangeStructure} title={canChangeStructure ? "Kopiraj cijele Corpus AD fragmente" : "Strukturno kopiranje dostupno je za samostalne, nove i uvezene E3D elemente"} onClick={duplicateBoardSelection}>Kopiraj označene</button>
          </div>
          <div className="board-group-distribution">
            <strong>Jednak razmak između krajnjih ploča</strong>
            <label><span>Osa</span><select aria-label="Osa raspodjele označenih ploča" value={boardGroupAxis} onChange={(event) => setBoardGroupAxis(event.target.value as CorpusBoardGroupAxis)}><option value="x">X</option><option value="y">Y</option><option value="z">Z</option></select></label>
            <button className="secondary-button" disabled={validBoardSelection.length < 3} title={validBoardSelection.length < 3 ? "Označi najmanje tri ploče za jednak razmak" : "Rasporedi ploče ravnomjerno između dvije krajnje"} onClick={distributeBoardSelection}>Rasporedi označene</button>
          </div>
          <div className="board-group-alignment">
            <strong>Poravnaj prema prvoj označenoj</strong>
            <button disabled={validBoardSelection.length < 2} title={validBoardSelection.length < 2 ? "Označi najmanje dvije ploče za poravnanje" : "Poravnaj početke prema prvoj označenoj ploči"} onClick={() => alignBoardSelection("min")}>Početak</button>
            <button disabled={validBoardSelection.length < 2} title={validBoardSelection.length < 2 ? "Označi najmanje dvije ploče za poravnanje" : "Poravnaj centre prema prvoj označenoj ploči"} onClick={() => alignBoardSelection("center")}>Centar</button>
            <button disabled={validBoardSelection.length < 2} title={validBoardSelection.length < 2 ? "Označi najmanje dvije ploče za poravnanje" : "Poravnaj krajeve prema prvoj označenoj ploči"} onClick={() => alignBoardSelection("max")}>Kraj</button>
          </div>
          <div className="board-group-placement">
            <div><strong>Postavi zajednički omotač u element</strong><span>Osa {boardGroupAxis.toUpperCase()} · međusobni raspored ostaje isti</span></div>
            <label><span>Odmak</span><div><input aria-label="Odmak grupnog postavljanja ploča" inputMode="decimal" value={boardGroupInset} onChange={(event) => setBoardGroupInset(event.target.value)} /><small>mm</small></div></label>
            <button disabled={validBoardSelection.length < 2} title={validBoardSelection.length < 2 ? "Označi najmanje dvije ploče za zajedničko postavljanje" : "Postavi zajednički omotač uz početak elementa"} onClick={() => placeBoardSelection("min")}>Uz početak</button>
            <button disabled={validBoardSelection.length < 2} title={validBoardSelection.length < 2 ? "Označi najmanje dvije ploče za zajedničko postavljanje" : "Centriraj zajednički omotač u elementu"} onClick={() => placeBoardSelection("center")}>Po centru</button>
            <button disabled={validBoardSelection.length < 2} title={validBoardSelection.length < 2 ? "Označi najmanje dvije ploče za zajedničko postavljanje" : "Postavi zajednički omotač uz kraj elementa"} onClick={() => placeBoardSelection("max")}>Uz kraj</button>
          </div>
          <div className="board-group-appearance">
            <div><strong>Izgled aktivne ploče</strong><span>{selectedBoardIndex !== null && element.boards[selectedBoardIndex] ? element.boards[selectedBoardIndex]!.name || `Ploča ${selectedBoardIndex + 1}` : "Klikni red ploče koja je izvor izgleda"}</span></div>
            <button className="secondary-button" disabled={validBoardSelection.length < 2 || selectedBoardIndex === null} title={selectedBoardIndex === null ? "Prvo izaberi ploču koja je izvor izgleda" : validBoardSelection.length < 2 ? "Označi najmanje dvije ploče" : "Primijeni materijal i izgled aktivne ploče na označene"} onClick={applyAppearanceToBoardSelection}>Primijeni na označene</button>
            <button className="secondary-button" disabled={validBoardSelection.length < 2} title={validBoardSelection.length < 2 ? "Označi najmanje dvije ploče" : "Prikaži sve označene ploče"} onClick={() => setBoardSelectionVisibility(true)}>Prikaži označene</button>
            <button className="secondary-button" disabled={validBoardSelection.length < 2} title={validBoardSelection.length < 2 ? "Označi najmanje dvije ploče" : "Sakrij sve označene ploče"} onClick={() => setBoardSelectionVisibility(false)}>Sakrij označene</button>
          </div>
          <div className="board-group-remove"><span>{canChangeStructure ? "Uklanjanje mijenja samo lokalnu radnu kopiju i može se vratiti jednim Undo korakom." : "Strukturno uklanjanje dostupno je za samostalne, nove i uvezene E3D elemente."}</span><button className="danger-button" disabled={!canChangeStructure || validBoardSelection.length < 2 || validBoardSelection.length >= element.boards.length} title={!canChangeStructure ? "Strukturno uklanjanje nije dostupno za ovaj element" : validBoardSelection.length < 2 ? "Označi najmanje dvije ploče" : validBoardSelection.length >= element.boards.length ? "Element mora zadržati najmanje jednu ploču" : "Ukloni označene ploče iz lokalne radne kopije"} onClick={removeBoardSelection}>Ukloni označene ploče</button></div>
          {boardGroupMessage && <p className="placement-message">{boardGroupMessage}</p>}
        </div>}
        {canEdit && selectedBoardIndex !== null && element.boards[selectedBoardIndex] && (
          <><BoardGeometryEditor element={element} board={element.boards[selectedBoardIndex]} boardIndex={selectedBoardIndex} boardCount={element.boards.length} onUpdate={onUpdateBoard} onRename={onRenameBoard} onMove={onMoveBoard} onDuplicate={onDuplicateBoard} onDuplicateArray={onDuplicateBoardArray} onDuplicateGrid={onDuplicateBoardGrid} onDistributeArray={onDistributeBoardArray} onRemove={onRemoveBoard} canChangeStructure={canChangeStructure} canRemove={canChangeStructure && element.boards.length > 1} />
          <BoardContourEditor board={element.boards[selectedBoardIndex]} boardIndex={selectedBoardIndex} onUpdate={onUpdateBoardContour} canChange={canChangeStructure} />
          <BoardEdgeBandingEditor board={element.boards[selectedBoardIndex]} boardIndex={selectedBoardIndex} onUpdate={onUpdateBoardEdgeBanding} canChange={canChangeStructure} /></>
        )}
      </section>}

      {editorTab === "materials" && <section className="data-section">
        {selectedBoardIndex !== null && element.boards[selectedBoardIndex] ? <div className="active-board-context"><strong>Aktivna ploča</strong><span>{element.boards[selectedBoardIndex]!.name || `Ploča ${selectedBoardIndex + 1}`} · dio elementa {element.name || "bez naziva"}</span></div> : <p className="empty-copy">Izaberi ploču u lijevom 3D prikazu ili u kartici Konstrukcija da urediš njen materijal.</p>}
        {selectedBoardIndex !== null && element.boards[selectedBoardIndex] && <><BoardMaterialPreview board={element.boards[selectedBoardIndex]} />{canEdit && <BoardAppearanceEditor board={element.boards[selectedBoardIndex]} boardIndex={selectedBoardIndex} onUpdate={onUpdateBoardAppearance} />}</>}
        <div className="element-material-summary"><div className="section-title"><h3>Svi materijali elementa</h3><span>{materials.length}</span></div>
          {materials.length ? <ul className="material-list">{materials.map(([name, count]) => <li key={name}><span className="material-swatch" /><span>{name}</span><strong>{count}×</strong></li>)}</ul> : <p className="empty-copy">Nema materijala.</p>}
        </div></section>}
      {editorTab === "variables" && <section className="data-section"><ElementVariablesEditor element={element} canEdit={canEdit} canChangeStructure={canChangeStructure} onUpdate={onUpdateVariables} /></section>}

      {editorTab === "operations" && <section className="data-section">
        {selectedBoardIndex !== null && element.boards[selectedBoardIndex] ? <><div className="active-board-context"><strong>Aktivna ploča</strong><span>{element.boards[selectedBoardIndex]!.name || `Ploča ${selectedBoardIndex + 1}`} · {element.boards[selectedBoardIndex]!.holeCount} rupa</span></div>{canEdit && <BoardHoleEditor board={element.boards[selectedBoardIndex]} onUpdate={(holes) => onUpdateBoardHoles(selectedBoardIndex, holes)} />}<BoardMachiningDetails board={element.boards[selectedBoardIndex]} /></> : <p className="empty-copy">Izaberi ploču u lijevom 3D prikazu ili u kartici Konstrukcija da pregledaš njene rupe i obrade.</p>}
        <div className="element-macro-summary">{element.macroLinks.length > 0 ? <MacroLinkDetails links={element.macroLinks} element={element} onApplyHoles={onUpdateBoardHoles} /> : <p className="empty-copy">Ovaj element nema povezane Corpus makroe.</p>}</div>
      </section>}
      {editorTab === "production" && <section className="data-section production-overview">
        <div className="production-overview-heading"><div><h3>Proizvodni pregled elementa</h3><p>Brza provjera prije otvaranja pune krojne liste projekta.</p></div><button className="primary-button" onClick={onOpenProduction}>Otvori krojnu listu →</button></div>
        <div className="production-overview-metrics">
          <Property label="Ploče" value={String(element.boards.length)} />
          <Property label="Fronte" value={String(elementFrontCount)} />
          <Property label="Grupe za krojenje" value={String(elementCutList.items.length)} />
          <Property label="Rupe" value={String(elementHoleCount)} />
          <Property label="Potrošne stavke" value={String(elementConsumables.length)} />
        </div>
        {elementCutList.skippedBoards > 0 ? <div className="evidence-warning"><strong>{elementCutList.skippedBoards} ploča nema potpune proizvodne mjere.</strong><span>Te ploče su sačuvane u elementu, ali se ne pojavljuju u krojnoj listi dok mjere ne budu dokazane.</span></div> : <p className="production-ready">Sve ploče elementa imaju upotrebljive mjere za krojnu listu.</p>}
      </section>}
      {editorTab === "advanced" && <section className="data-section"><div className="section-title"><h3>Napredni i izvorni podaci</h3></div><p className="empty-copy">Ovdje su izdvojene informacije koje nisu dio svakodnevnog modeliranja. Dok nešto nije dokazano iz Corpus formata, ostaje jasno označeno i ne utiče na geometriju.</p>{(element.unknownChildTags.length > 0 || element.boards.some((board) => board.unknownChildTags.length > 0)) && (
        <div className="evidence-warning"><strong>Nepoznata struktura je sačuvana kao upozorenje.</strong><span>Ne tumačimo podatke koje još nismo dokazali.</span></div>
      )}</section>}

      {boardCreatorOpen && <BoardCreatorDialog element={element} onClose={() => setBoardCreatorOpen(false)} onCreate={(spec) => { onAddBoard(spec); setBoardCreatorOpen(false); }} />}
    </div>
  );
}

function ElementVariablesEditor({ element, canEdit, canChangeStructure, onUpdate }: {
  element: CorpusS3dElement;
  canEdit: boolean;
  canChangeStructure: boolean;
  onUpdate(variables: ElementVariablesPatch): void;
}) {
  const variables = element.variables;
  const [draft, setDraft] = useState<Array<{ name: string; value: string }>>(() => Object.entries(variables).map(([name, value]) => ({ name, value })));
  const [message, setMessage] = useState("");
  useEffect(() => {
    setDraft(Object.entries(variables).map(([name, value]) => ({ name, value })));
    setMessage("");
  }, [variables]);
  const sourceEntries = Object.entries(variables);
  const changed = JSON.stringify(draft.map(({ name, value }) => [name, value])) !== JSON.stringify(sourceEntries);
  const contextValues: Record<string, CorpusExpressionValue> = {};
  const addContext = (name: string, value: number | null) => { if (value !== null && Number.isFinite(value)) contextValues[name] = value; };
  addContext("X", element.position[0]); addContext("Y", element.position[1]); addContext("Z", element.position[2]);
  addContext("V", element.height); addContext("S", element.width); addContext("D", element.depth);
  addContext("VISINA", element.height); addContext("SIRINA", element.width); addContext("DUBINA", element.depth);
  const analysis = analyzeCorpusAssignments(draft.map(({ name, value }) => ({ name, expression: value })), contextValues);

  function addVariable() {
    const used = new Set(draft.map(({ name }) => name.toUpperCase()));
    let index = draft.length + 1;
    while (used.has(`VARIJABLA_${index}`)) index += 1;
    setDraft((current) => [...current, { name: `VARIJABLA_${index}`, value: "0" }]);
    setMessage("Nova varijabla je pripremljena. Sačuvaj da se upiše u E3D radnu kopiju.");
  }

  function save() {
    const names = draft.map(({ name }) => name.trim());
    if (names.some((name) => !name || name.includes("="))) return setMessage("Naziv ne smije biti prazan niti sadržati znak =.");
    const normalized = names.map((name) => name.toUpperCase());
    if (new Set(normalized).size !== normalized.length) return setMessage("Nazivi moraju biti jednoznačni bez obzira na velika i mala slova.");
    onUpdate(Object.fromEntries(draft.map((entry, index) => [names[index]!, entry.value])));
    setMessage("Varijable su sačuvane u lokalnoj radnoj kopiji.");
  }

  return <div className="variable-editor"><div className="section-title"><h3>Varijable</h3><span>{draft.length}</span>{canChangeStructure && <button className="secondary-button" disabled={!canEdit} title={canEdit ? "Dodaj novu E3D varijablu" : "Element je zaključan ili označen kao neurediv"} onClick={addVariable}>Dodaj</button>}</div>
    {draft.length ? <>
      <div className="variable-list">{draft.map((entry, index) => <div className="variable-row" key={`${index}-${sourceEntries[index]?.[0] ?? "nova"}`}>
        <input aria-label={`Naziv varijable ${index + 1}`} value={entry.name} disabled={!canEdit || !canChangeStructure} onChange={(event) => setDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />
        <input aria-label={`Vrijednost varijable ${entry.name || index + 1}`} value={entry.value} disabled={!canEdit} onChange={(event) => setDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} />
        <span className={`variable-result ${analysis[index]?.status ?? "invalid"}`}>{formatVariableAnalysis(analysis[index])}</span>
        {canChangeStructure && <button className="icon-button danger" aria-label={`Ukloni varijablu ${entry.name || index + 1}`} disabled={!canEdit} onClick={() => { setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index)); setMessage("Varijabla je označena za uklanjanje. Sačuvaj za primjenu."); }}>×</button>}
      </div>)}</div>
      <div className="variable-actions"><small>{canChangeStructure ? "E3D čuva neprekinut VAR0…VARn redoslijed; izrazi ostaju tekst." : "Izvorni S3D dozvoljava samo promjenu postojećih vrijednosti."}</small><button className="secondary-button" disabled={!canEdit || !changed} title={!canEdit ? "Element je zaključan ili označen kao neurediv" : !changed ? "Nema izmjena za čuvanje" : "Sačuvaj varijable u lokalnoj radnoj kopiji"} onClick={save}>Sačuvaj varijable</button></div>
    </> : <><p className="empty-copy">Nema varijabli.</p>{canChangeStructure && <button className="secondary-button" disabled={!canEdit} onClick={addVariable}>Dodaj prvu varijablu</button>}</>}
    {message && <p className="placement-message">{message}</p>}
  </div>;
}

function formatVariableAnalysis(analysis: ReturnType<typeof analyzeCorpusAssignments>[number] | undefined): string {
  if (!analysis || analysis.status === "invalid") return "nepodržan izraz";
  if (analysis.status === "resolved") return `= ${typeof analysis.value === "boolean" ? (analysis.value ? "TRUE" : "FALSE") : formatNumber(analysis.value)}`;
  if (analysis.status === "missing") return `nedostaje ${analysis.missing.join(", ")}`;
  if (analysis.status === "cycle") return "ciklična zavisnost";
  return "nije razriješeno";
}

function BoardCreatorDialog({ element, onCreate, onClose }: {
  element: CorpusS3dElement;
  onCreate(spec: CorpusNewBoardSpec): void;
  onClose(): void;
}) {
  const template = element.boards.find((board) => board.thickness !== null) ?? element.boards[0];
  const defaultThickness = template?.thickness && template.thickness > 0 ? template.thickness : 18;
  const defaultLength = Math.max((element.width ?? 600) - defaultThickness * 2, defaultThickness);
  const [name, setName] = useState("Nova ploča");
  const [x, setX] = useState(String(defaultThickness));
  const [y, setY] = useState(String(Math.max(defaultThickness, ((element.height ?? 720) - defaultThickness) / 2)));
  const [z, setZ] = useState("0");
  const [width, setWidth] = useState(String(Math.max(element.depth ?? 560, defaultThickness)));
  const [height, setHeight] = useState(String(defaultLength));
  const [thickness, setThickness] = useState(String(defaultThickness));
  const [direction, setDirection] = useState<"0" | "1" | "2">("2");
  const [materialName, setMaterialName] = useState(template?.materialName ?? "");
  const [materialUid, setMaterialUid] = useState(template?.materialUid ?? "");
  const [color, setColor] = useState(colorToHex(template?.color ?? 0xd8d1c1));
  const [transparent, setTransparent] = useState(template?.transparent ?? false);
  const [visible, setVisible] = useState(template?.visible ?? true);
  const [message, setMessage] = useState("");
  useCloseOnEscape(onClose);

  function submit() {
    const values = [x, y, z, width, height, thickness].map((value) => Number(value.replace(",", ".")));
    const [parsedX, parsedY, parsedZ, parsedWidth, parsedHeight, parsedThickness] = values;
    if (!name.trim()) return setMessage("Naziv ploče ne može biti prazan.");
    if (values.some((value) => !Number.isFinite(value))) return setMessage("Položaj i mjere moraju sadržati brojeve.");
    if (parsedWidth! <= 0 || parsedHeight! <= 0 || parsedThickness! <= 0) return setMessage("Mjere ploče moraju biti veće od nule.");
    const parsedColor = Number.parseInt(color.replace(/^#/, ""), 16);
    if (!/^#[0-9a-f]{6}$/i.test(color) || !Number.isInteger(parsedColor)) return setMessage("Boja mora biti zapisana kao #RRGGBB.");
    onCreate({
      name: name.trim(), position: [parsedX!, parsedY!, parsedZ!], width: parsedWidth!, height: parsedHeight!, thickness: parsedThickness!,
      direction: Number(direction) as 0 | 1 | 2, materialName, materialUid, color: parsedColor, transparent, visible,
    });
  }

  return (
    <div className="library-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="cabinet-dialog board-creator-dialog" role="dialog" aria-modal="true" aria-label="Dodaj novu ploču" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">Struktura elementa</p><h2>Dodaj novu ploču</h2></div><button aria-label="Zatvori dodavanje ploče" onClick={onClose}>×</button></header>
        <p>Dodaje pravougaonu Corpus ploču u izabrani element. Početne vrijednosti su podešene kao polica; sve mjere i orijentaciju možeš promijeniti.</p>
        <div className="cabinet-form">
          <label><span>Naziv</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label><span>Orijentacija</span><select aria-label="Orijentacija nove ploče" value={direction} onChange={(event) => setDirection(event.target.value as "0" | "1" | "2")}><option value="0">0 · bočna</option><option value="1">1 · uspravna</option><option value="2">2 · horizontalna</option></select></label>
          <label><span>Debljina</span><div><input inputMode="decimal" value={thickness} onChange={(event) => setThickness(event.target.value)} /><small>mm</small></div></label>
          <label><span>Pozicija X</span><div><input inputMode="decimal" value={x} onChange={(event) => setX(event.target.value)} /><small>mm</small></div></label>
          <label><span>Pozicija Y</span><div><input inputMode="decimal" value={y} onChange={(event) => setY(event.target.value)} /><small>mm</small></div></label>
          <label><span>Pozicija Z</span><div><input inputMode="decimal" value={z} onChange={(event) => setZ(event.target.value)} /><small>mm</small></div></label>
          <label><span>Širina konture</span><div><input inputMode="decimal" value={width} onChange={(event) => setWidth(event.target.value)} /><small>mm</small></div></label>
          <label><span>Dužina konture</span><div><input inputMode="decimal" value={height} onChange={(event) => setHeight(event.target.value)} /><small>mm</small></div></label>
          <label><span>Materijal</span><input value={materialName} onChange={(event) => setMaterialName(event.target.value)} /></label>
          <label><span>UID materijala</span><input value={materialUid} onChange={(event) => setMaterialUid(event.target.value)} /></label>
          <label><span>Boja</span><input type="color" aria-label="Boja nove ploče" value={color} onChange={(event) => setColor(event.target.value)} /></label>
          <label className="cabinet-check"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /><span>Vidljiva ploča</span></label>
          <label className="cabinet-check"><input type="checkbox" checked={transparent} onChange={(event) => setTransparent(event.target.checked)} /><span>Providna ploča</span></label>
        </div>
        {message && <p className="error-message" role="alert">{message}</p>}
        <footer><button className="secondary-button" onClick={onClose}>Odustani</button><button className="primary-button" onClick={submit}>Dodaj ploču</button></footer>
      </section>
    </div>
  );
}

function BoardContourEditor({ board, boardIndex, onUpdate, canChange }: {
  board: CorpusS3dBoard;
  boardIndex: number;
  onUpdate(boardIndex: number, points: readonly CorpusStraightContourPoint[]): void;
  canChange: boolean;
}) {
  const editableNumber = (value: number) => String(Number(value.toFixed(3)));
  const contourRows = (points: readonly CorpusStraightContourPoint[]) => points.map(({ x, z }) => ({ x: editableNumber(x), z: editableNumber(z) }));
  const [rows, setRows] = useState(() => contourRows(board.curvePoints));
  const [message, setMessage] = useState("");
  const hasCurves = board.curvePoints.some((point) => point.style !== 0);
  useEffect(() => { setRows(contourRows(board.curvePoints)); setMessage(""); }, [board]);
  const preview = useMemo(() => {
    const points = rows.map(({ x, z }) => ({ x: Number(x.replace(",", ".")), z: Number(z.replace(",", ".")) }));
    if (points.length < 3 || points.some(({ x, z }) => !Number.isFinite(x) || !Number.isFinite(z))) return null;
    const minX = Math.min(...points.map(({ x }) => x)); const maxX = Math.max(...points.map(({ x }) => x));
    const minZ = Math.min(...points.map(({ z }) => z)); const maxZ = Math.max(...points.map(({ z }) => z));
    const rangeX = Math.max(maxX - minX, 1); const rangeZ = Math.max(maxZ - minZ, 1);
    const scale = Math.min(280 / rangeX, 140 / rangeZ);
    return points.map(({ x, z }) => ({ x: 20 + (x - minX) * scale, y: 160 - (z - minZ) * scale }));
  }, [rows]);

  function rectangle() {
    const length = board.height ?? 600;
    const width = board.width ?? 560;
    setRows(contourRows([{ x: 0, z: 0 }, { x: length, z: 0 }, { x: length, z: width }, { x: 0, z: width }]));
    setMessage("Pripremljena je pravougaona kontura. Klikni Primijeni konturu.");
  }

  function cornerNotch() {
    const length = board.height ?? 600;
    const width = board.width ?? 560;
    const notchX = Math.min(100, length / 3);
    const notchZ = Math.min(100, width / 3);
    setRows(contourRows([
      { x: 0, z: 0 }, { x: length, z: 0 }, { x: length, z: width - notchZ },
      { x: length - notchX, z: width - notchZ }, { x: length - notchX, z: width }, { x: 0, z: width },
    ]));
    setMessage("Pripremljen je ugaoni urez 100 × 100 mm, ograničen mjerama ploče.");
  }

  function apply() {
    const points: CorpusStraightContourPoint[] = [];
    for (let index = 0; index < rows.length; index += 1) {
      const x = Number(rows[index]!.x.replace(",", "."));
      const z = Number(rows[index]!.z.replace(",", "."));
      if (!Number.isFinite(x) || !Number.isFinite(z)) return setMessage(`Red ${index + 1} ne sadrži ispravne brojeve.`);
      points.push({ x, z });
    }
    if (points.length < 3) return setMessage("Kontura mora imati najmanje tri tačke.");
    onUpdate(boardIndex, points);
    setMessage("Kontura je primijenjena u radnoj kopiji.");
  }

  function updateRow(index: number, key: "x" | "z", value: string) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  }

  function addPoint() {
    setRows((current) => {
      const previous = current.at(-1) ?? { x: "0", z: "0" };
      return [...current, { ...previous }];
    });
    setMessage("Nova tačka je dodana na kraj. Promijeni njene koordinate prije primjene.");
  }

  function movePoint(index: number, delta: -1 | 1) {
    setRows((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  return (
    <details className="contour-editor">
      <summary><span>Kontura ploče</span><small>{board.curvePoints.length} tačaka · {hasCurves ? "sadrži luk" : "ravni segmenti"}</small></summary>
      <p>Tačke su lokalne X/Z koordinate u milimetrima. Posljednja tačka se automatski spaja sa prvom.</p>
      {hasCurves && <p className="evidence-warning"><strong>Kontura sadrži krive segmente.</strong><span>Uređivanje je zaključano da se dokazani luk ne bi slučajno pretvorio u ravne linije.</span></p>}
      {!canChange && <p className="editor-readonly-note">Strukturno uređivanje konture dostupno je za dodane, generisane i udvostručene elemente.</p>}
      <div className="contour-workspace">
        <svg className="contour-preview" viewBox="0 0 320 180" role="img" aria-label="Pregled konture ploče">
          <rect x="1" y="1" width="318" height="178" rx="8" />
          {preview && <><polygon points={preview.map(({ x, y }) => `${x},${y}`).join(" ")} />{preview.map(({ x, y }, index) => <g key={index}><circle cx={x} cy={y} r="5" /><text x={x + 7} y={y - 7}>{index + 1}</text></g>)}</>}
          {!preview && <text className="preview-empty" x="160" y="92" textAnchor="middle">Unesi najmanje tri ispravne tačke</text>}
        </svg>
        <div className="contour-point-list">
          <div className="contour-point-head"><span>#</span><span>X (mm)</span><span>Z (mm)</span><span>Redoslijed</span></div>
          {rows.map((row, index) => <div className="contour-point-row" key={index}>
            <strong>{index + 1}</strong>
            <input aria-label={`Tačka ${index + 1} X`} inputMode="decimal" value={row.x} disabled={!canChange || hasCurves} onChange={(event) => updateRow(index, "x", event.target.value)} />
            <input aria-label={`Tačka ${index + 1} Z`} inputMode="decimal" value={row.z} disabled={!canChange || hasCurves} onChange={(event) => updateRow(index, "z", event.target.value)} />
            <span><button aria-label={`Pomjeri tačku ${index + 1} gore`} disabled={!canChange || hasCurves || index === 0} onClick={() => movePoint(index, -1)}>↑</button><button aria-label={`Pomjeri tačku ${index + 1} dolje`} disabled={!canChange || hasCurves || index === rows.length - 1} onClick={() => movePoint(index, 1)}>↓</button><button aria-label={`Ukloni tačku ${index + 1}`} disabled={!canChange || hasCurves || rows.length <= 3} onClick={() => setRows((current) => current.filter((_row, rowIndex) => rowIndex !== index))}>×</button></span>
          </div>)}
        </div>
      </div>
      {canChange && !hasCurves && <div className="geometry-actions"><button className="secondary-button" onClick={rectangle}>Pravougaonik</button><button className="secondary-button" onClick={cornerNotch}>Ugaoni urez</button><button className="secondary-button" onClick={addPoint}>Dodaj tačku</button><button className="primary-button" onClick={apply}>Primijeni konturu</button>{message && <span>{message}</span>}</div>}
    </details>
  );
}

function BoardEdgeBandingEditor({ board, boardIndex, onUpdate, canChange }: {
  board: CorpusS3dBoard;
  boardIndex: number;
  onUpdate(boardIndex: number, spec: CorpusEdgeBandingSpec): void;
  canChange: boolean;
}) {
  const existing = board.consumables.find((item) => item.type === "0");
  const [name, setName] = useState(existing?.name || "ABS 1 mm");
  const [materialName, setMaterialName] = useState(existing?.materialName || board.materialName);
  const [materialUid, setMaterialUid] = useState(existing?.materialUid || board.materialUid);
  const [uid, setUid] = useState(existing?.uid || "");
  const [sides, setSides] = useState<[boolean, boolean, boolean, boolean]>(() => [0, 1, 2, 3].map((index) => existing?.sides[index] === true) as [boolean, boolean, boolean, boolean]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const edge = board.consumables.find((item) => item.type === "0");
    setName(edge?.name || "ABS 1 mm"); setMaterialName(edge?.materialName || board.materialName);
    setMaterialUid(edge?.materialUid || board.materialUid); setUid(edge?.uid || "");
    setSides([0, 1, 2, 3].map((index) => edge?.sides[index] === true) as [boolean, boolean, boolean, boolean]); setMessage("");
  }, [board]);

  function apply(nextSides = sides) {
    if (nextSides.some(Boolean) && !name.trim()) return setMessage("Naziv rubne trake ne može biti prazan.");
    onUpdate(boardIndex, { name, materialName, materialUid, uid, sides: nextSides });
    setMessage(nextSides.some(Boolean) ? "Rubna obrada je primijenjena u radnoj kopiji." : "Rubna obrada je uklonjena sa ploče.");
  }

  return (
    <details className="edge-editor">
      <summary><span>Rubna obrada</span><small>{existing ? existing.sides.filter(Boolean).length : 0} od 4 ivice</small></summary>
      <p>STR0–STR3 su izvorne Corpus oznake ivica. Ne prevodimo ih u „prednja/lijeva“ dok smjer nije dokazan za svaku orijentaciju ploče.</p>
      {!canChange && <p className="editor-readonly-note">Rubna obrada se može mijenjati na dodanim, generisanim i udvostručenim elementima.</p>}
      <div className="edge-form">
        <label><span>Naziv trake</span><input value={name} disabled={!canChange} onChange={(event) => setName(event.target.value)} /></label>
        <label><span>Materijal</span><input value={materialName} disabled={!canChange} onChange={(event) => setMaterialName(event.target.value)} /></label>
        <label><span>UID materijala</span><input value={materialUid} disabled={!canChange} onChange={(event) => setMaterialUid(event.target.value)} /></label>
        <label><span>UID trake</span><input value={uid} disabled={!canChange} onChange={(event) => setUid(event.target.value)} /></label>
      </div>
      <div className="edge-side-grid">
        {sides.map((active, index) => <label key={index} className={active ? "active" : ""}><input type="checkbox" checked={active} disabled={!canChange} onChange={(event) => setSides((current) => current.map((value, side) => side === index ? event.target.checked : value) as [boolean, boolean, boolean, boolean])} /><strong>STR{index}</strong><span>Ivica {index + 1}</span></label>)}
      </div>
      {canChange && <div className="geometry-actions"><button className="primary-button" onClick={() => apply()}>Primijeni rubove</button><button className="secondary-button" disabled={!existing && !sides.some(Boolean)} onClick={() => { const empty: [boolean, boolean, boolean, boolean] = [false, false, false, false]; setSides(empty); apply(empty); }}>Ukloni sve rubove</button>{message && <span>{message}</span>}</div>}
    </details>
  );
}

function MacroLinkDetails({ links, element, onApplyHoles }: { links: readonly CorpusS3dMacroLink[]; element: CorpusS3dElement; onApplyHoles(boardIndex: number, holes: readonly CorpusS3dHole[]): void }) {
  const [decoded, setDecoded] = useState<readonly { linkIndex: number; source: "primary" | "secondary"; section: string; title: string; content: string; analysis: CorpusMacroAnalysis }[]>([]);
  const [embeddedDocuments, setEmbeddedDocuments] = useState<Readonly<Record<number, CorpusCmkDocument>>>({});
  const [simulationLinkIndex, setSimulationLinkIndex] = useState<number | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  async function decodeLink(linkIndex: number) {
    setDecodeError(null);
    try {
      const link = links[linkIndex];
      if (!link) return;
      const results = await Promise.all([
        ...Object.entries(link.encodedPayloads).flatMap(([section, payloads]) => payloads.map(async (payload, index) => {
          const content = await decodeCorpusC6Dat(payload);
          return { linkIndex, source: "primary" as const, section, title: `${link.name || "Neimenovan makro"} · ${section}${payloads.length > 1 ? ` ${index + 1}` : ""}`, content, analysis: analyzeCorpusMacroPayload(content) };
        })),
        ...Object.entries(link.secondaryEncodedPayloads).flatMap(([section, payloads]) => payloads.map(async (payload, index) => {
          const content = await decodeCorpusC6Dat(payload);
          return { linkIndex, source: "secondary" as const, section, title: `${link.secondaryName || "MM2"} · ${section}${payloads.length > 1 ? ` ${index + 1}` : ""}`, content, analysis: analyzeCorpusMacroPayload(content) };
        })),
      ]);
      setDecoded((current) => [...current.filter((entry) => entry.linkIndex !== linkIndex), ...results]);
      const primaryPayloads: Record<string, string[]> = {};
      for (const result of results.filter(({ source }) => source === "primary")) (primaryPayloads[result.section] ??= []).push(result.content);
      setEmbeddedDocuments((current) => ({ ...current, [linkIndex]: corpusCmkDocumentFromDecodedPayloads(primaryPayloads) }));
    } catch (reason) {
      const detail = reason instanceof Error ? ` (${reason.message})` : "";
      setDecodeError(`Kompresovana formula nije mogla biti dekodirana${detail}. Izvorni podatak je ostao nepromijenjen.`);
    }
  }
  return (
    <section className="data-section">
      <div className="section-title"><h3>Makro veze</h3><span>{links.length}</span></div>
      <div className="board-table-wrap"><table className="board-table"><thead><tr><th>Naziv</th><th>Objekat 1</th><th>Objekat 2</th><th>CSP</th><th>Kompresovane sekcije</th><th>Pregled</th></tr></thead>
        <tbody>{links.map((link, index) => <tr key={`${link.name}-${index}`}><td><strong>{link.name || "Neimenovan makro"}</strong>{link.secondaryName && <small>MM2: {link.secondaryName}</small>}</td><td>{formatMacroObject(link.object1, element.boards)}</td><td>{formatMacroObject(link.object2, element.boards)}</td><td>{link.corpusFlag ?? "—"}</td><td>{formatMacroSections(link.encodedPayloads)}{Object.keys(link.secondaryEncodedPayloads).length ? ` · MM2 ${formatMacroSections(link.secondaryEncodedPayloads)}` : ""}</td><td><div className="table-actions"><button className="table-action" type="button" onClick={() => decodeLink(index)}>{decoded.some((entry) => entry.linkIndex === index) ? "Ponovo" : "Dekodiraj"}</button>{embeddedDocuments[index] && <button className="table-action" type="button" onClick={() => setSimulationLinkIndex(index)}>Simuliraj</button>}</div></td></tr>)}</tbody>
      </table></div>
      {decodeError && <p className="error-copy">{decodeError}</p>}
      {decoded.map((entry, index) => <details key={`${entry.linkIndex}-${entry.title}-${index}`}><summary>{entry.title} · {entry.analysis.assignments.length} dodjela</summary>
        <div className="macro-analysis">
          <p><strong>Ulazne varijable:</strong> {entry.analysis.externalVariables.join(", ") || "nema"}</p>
          <p><strong>Podržana sintaksa:</strong> {entry.analysis.assignments.filter(({ syntaxSupported }) => syntaxSupported).length}/{entry.analysis.assignments.length}</p>
        </div>
        <pre className="macro-formula">{entry.content}</pre>
      </details>)}
      {!decoded.length && <p className="empty-copy">Izaberi jednu vezu za lokalno dekodiranje. C6DAT sadržaj se nikada ne izvršava.</p>}
      {simulationLinkIndex !== null && embeddedDocuments[simulationLinkIndex] && links[simulationLinkIndex] && (
        <div className="embedded-macro-simulation">
          <div className="section-title"><h3>Simulacija ugrađene veze</h3><button className="table-action" onClick={() => setSimulationLinkIndex(null)}>Zatvori</button></div>
          <MacroDocumentDetails
            key={`embedded-${simulationLinkIndex}`}
            macro={{ path: `Ugrađeno/${links[simulationLinkIndex]!.name || `Makro ${simulationLinkIndex + 1}`}`, document: embeddedDocuments[simulationLinkIndex]! }}
            element={element}
            initialObject1Index={links[simulationLinkIndex]!.object1 ?? 0}
            initialObject2Index={links[simulationLinkIndex]!.object2 !== null && links[simulationLinkIndex]!.object2! >= 0 ? links[simulationLinkIndex]!.object2! : (links[simulationLinkIndex]!.object1 === 0 ? 1 : 0)}
            onApplyHoles={onApplyHoles}
          />
        </div>
      )}
    </section>
  );
}

function formatMacroSections(payloads: Readonly<Record<string, readonly string[]>>) {
  return Object.entries(payloads).map(([section, values]) => `${section}${values.length > 1 ? `×${values.length}` : ""}`).join(", ") || "—";
}

function formatMacroObject(index: number | null, boards: readonly CorpusS3dBoard[]) {
  if (index === -1) return "dinamički";
  if (index === null) return "—";
  return boards[index] ? `${index} · ${boards[index]!.name || `Ploča ${index + 1}`}` : String(index);
}

function formatBoardContactFace(face: CorpusBoardContactFace | null) {
  if (!face) return "—";
  return `${face.localAxis} · ${face.side}${face.autostCandidate === null ? " · AUTOST još nepoznat" : ` · AUTOST kandidat ${face.autostCandidate}`}`;
}

function formatBoardLocalOverlap(rectangle: CorpusBoardLocalContactRectangle | null) {
  if (!rectangle) return "—";
  return `X/${rectangle.xAxis} ${rectangle.minX}–${rectangle.maxX} mm · Y/${rectangle.yAxis} ${rectangle.minY}–${rectangle.maxY} mm`;
}

function MacroDocumentDetails({ macro, element, initialObject1Index = 0, initialObject2Index = 1, onApplyHoles }: {
  macro: { path: string; document: CorpusCmkDocument };
  element: CorpusS3dElement | null;
  initialObject1Index?: number;
  initialObject2Index?: number;
  onApplyHoles?(boardIndex: number, holes: readonly CorpusS3dHole[]): void;
}) {
  const [object1Index, setObject1Index] = useState(initialObject1Index);
  const [object2Index, setObject2Index] = useState(initialObject2Index);
  const [runtimeInputs, setRuntimeInputs] = useState<Record<string, string>>({});
  const entries = macro.document.sections.flatMap((section) => section.entries.map((entry) => ({ section: section.name, ...entry })));
  const supported = entries.filter((entry) => entry.syntaxSupported).length;
  const object1 = element?.boards[object1Index] ?? element?.boards[0] ?? null;
  const object2 = element?.boards[object2Index] ?? element?.boards[1] ?? element?.boards[0] ?? null;
  const boardContact = useMemo(() => analyzeCorpusBoardContact(object1, object2), [object1, object2]);
  const runtimeValues = useMemo(() => Object.fromEntries(Object.entries(runtimeInputs)
    .filter(([, value]) => value.trim() !== "" && Number.isFinite(Number(value)))
    .map(([key, value]) => [key, Number(value)])), [runtimeInputs]);
  const automaticValues = useMemo(() => element ? corpusMacroBoardContext(element, object1, object2) : {}, [element, object1, object2]);
  const simulation = useMemo(() => simulateCorpusCmk(macro.document, {
    ...automaticValues,
    ...runtimeValues,
  }), [macro.document, automaticValues, runtimeValues]);
  const unresolvedOperations = simulation.operations.reduce((sum, operation) => sum + operation.fields.filter(({ value, literal }) => value === null && literal === null).length, 0);
  const rasterConversion = useMemo(() => corpusRasterOperationsToHoles(simulation.operations), [simulation.operations]);
  const sawResolution = useMemo(() => resolveCorpusSawPaths(simulation.operations), [simulation.operations]);
  const [applyMessage, setApplyMessage] = useState("");
  return (
    <div className="macro-document">
      <header><strong>{macro.path.split("/").at(-1)}</strong><small>{macro.path}</small></header>
      <p>{macro.document.sections.length} sekcija · {entries.length} zapisa · {supported} analiziranih izraza · {macro.document.unparsedLines.length} neprotumačenih redova</p>
      <section className="macro-simulation">
        <div className="macro-simulation-heading">
          <div><strong>Bezbjedna simulacija</strong><small>Računa formule iz mjera izabranih dasaka; ne mijenja projekat.</small></div>
          <span>{simulation.operations.length} operacija · {unresolvedOperations} neriješenih polja</span>
        </div>
        {element && element.boards.length > 0 ? (
          <>
            <div className="macro-object-pickers">
              <label>OBJ1<select value={Math.min(object1Index, element.boards.length - 1)} onChange={(event) => setObject1Index(Number(event.target.value))}>{element.boards.map((board, index) => <option key={`${board.name}-${index}`} value={index}>{index + 1}. {board.name || "Bez naziva"}</option>)}</select></label>
              <label>OBJ2<select value={Math.min(object2Index, element.boards.length - 1)} onChange={(event) => setObject2Index(Number(event.target.value))}>{element.boards.map((board, index) => <option key={`${board.name}-${index}`} value={index}>{index + 1}. {board.name || "Bez naziva"}</option>)}</select></label>
            </div>
            <div className={`macro-contact-panel ${boardContact.status}`}>
              <div><strong>3D odnos OBJ1 ↔ OBJ2</strong><span>{boardContact.status === "contact" ? "dodirna površina" : boardContact.status === "overlap" ? "preklapanje" : boardContact.status === "edge-only" ? "samo ivica/tačka" : boardContact.status === "unsupported" ? "nije podržano" : "bez dodira"}</span></div>
              <p>{boardContact.reason}</p>
              {boardContact.axis && <small>Osa dodira: {boardContact.axis} · OBJ1: {formatBoardContactFace(boardContact.object1Face)} · OBJ2: {formatBoardContactFace(boardContact.object2Face)}</small>}
              {Object.keys(boardContact.overlap).length > 0 && <small>Svjetski presjek: {Object.entries(boardContact.overlap).map(([axis, range]) => `${axis} ${range?.[0]}–${range?.[1]} mm`).join(" · ")}</small>}
              {boardContact.object1LocalOverlap && <small>OBJ1 lokalni presjek: {formatBoardLocalOverlap(boardContact.object1LocalOverlap)}</small>}
              {boardContact.object2LocalOverlap && <small>OBJ2 lokalni presjek: {formatBoardLocalOverlap(boardContact.object2LocalOverlap)}</small>}
              {boardContact.status === "contact" && <em>Lokalni presjeci su geometrijski dokaz; još nisu automatski PMIN/PMAX.</em>}
            </div>
            <details className="macro-runtime-inputs macro-automatic-context">
              <summary>Automatski kontekst · {Object.keys(automaticValues).length} vrijednosti</summary>
              <p>Direktno iz mjera, konture i SMJER-a izabranih ploča. Ovo nisu pretpostavljene vrijednosti spoja.</p>
              <div>{Object.entries(automaticValues).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => <label key={key}>{key}<output>{String(value)}</output></label>)}</div>
            </details>
            <details className="macro-runtime-inputs">
              <summary>Napredni Corpus runtime kontekst</summary>
              <p>Opcionalne vrijednosti spoja koje nisu zapisane u E3D-u. Prazno polje ostaje neriješeno — sistem ništa ne pretpostavlja.</p>
              <div>{["PMINX", "PMINY", "PMAXX", "PMAXY", "DELTAX", "DELTAY", "DELTAZ", "DELLTAX", "DELLTAY", "DELLTAZ", "EVAR.T_L", "EVAR.T_P"].map((key) => <label key={key}>{key}<input inputMode="decimal" value={runtimeInputs[key] ?? ""} onChange={(event) => setRuntimeInputs((current) => ({ ...current, [key]: event.target.value }))} placeholder="—" /></label>)}</div>
              <div>{["OBJ1.AUTOST", "OBJ2.AUTOST"].map((key) => <label key={key}>{key}<select value={runtimeInputs[key] ?? ""} onChange={(event) => setRuntimeInputs((current) => ({ ...current, [key]: event.target.value }))}><option value="">nije zadano</option>{[0, 1, 2, 3, 4, 5].map((side) => <option key={side} value={side}>{side}</option>)}</select></label>)}</div>
            </details>
            <button className="secondary-button macro-export-button" onClick={() => downloadText(`${macro.path.split("/").at(-1)?.replace(/\.cmk$/i, "") || "CMK"}-SIMULACIJA.json`, `${JSON.stringify({ macro: macro.path, element: element.name, object1: object1?.name, object2: object2?.name, runtimeValues, simulation }, null, 2)}\n`, "application/json")}>Izvezi simulaciju JSON</button>
            <div className="raster-apply-panel">
              <div><strong>Primjena RASTER rupa na OBJ1</strong><small>{rasterConversion.holes.length} spremnih · {rasterConversion.rejected.length} blokiranih operacija</small></div>
              <button className="primary-button" type="button" disabled={!onApplyHoles || !rasterConversion.holes.length} onClick={() => {
                if (!onApplyHoles || !object1) return;
                onApplyHoles(object1Index, [...object1.holes, ...rasterConversion.holes]);
                setApplyMessage(`Dodano ${rasterConversion.holes.length} rupa na ploču ${object1.name || object1Index + 1}.`);
              }}>Primijeni spremne rupe</button>
              {applyMessage && <span>{applyMessage}</span>}
              {rasterConversion.rejected.length > 0 && <details><summary>Zašto su neke operacije blokirane</summary>{rasterConversion.rejected.map(({ section, reason }) => <p key={section}><strong>{section}</strong> · {reason}</p>)}</details>}
            </div>
            {(sawResolution.paths.length > 0 || sawResolution.inactive.length > 0 || sawResolution.rejected.length > 0) && <SawPathPanel resolution={sawResolution} />}
            <div className="macro-operation-list">
              {simulation.operations.map((operation) => (
                <details key={operation.section}>
                  <summary><span>{operationKindLabel(operation.kind)}</span>{operation.section}<i>{operation.fields.filter(({ value, literal }) => value !== null || literal !== null).length}/{operation.fields.length}</i></summary>
                  <div>{operation.fields.map((field) => <p key={field.key} className={field.value === null && field.literal === null ? "unresolved" : ""}><strong>{field.key}</strong><code>{field.value === null ? field.literal ?? "?" : String(field.value)}</code><small>{field.expression}{field.value === null && field.literal === null && field.dependencies.length ? ` · nedostaje: ${field.dependencies.filter((name) => simulation.values[name.toUpperCase()] === undefined).join(", ") || "runtime kontekst"}` : ""}</small></p>)}</div>
                </details>
              ))}
              {!simulation.operations.length && <p className="no-results">Ovaj CMK nema RASTER, PILA, POTROSNI, MAKRO ili GRUPA sekcije.</p>}
            </div>
          </>
        ) : <p className="no-results">Izabrani element nema daske za OBJ1/OBJ2 simulaciju.</p>}
      </section>
      {macro.document.sections.map((section) => (
        <details key={section.name} open={section.name === "VARIJABLE" || section.name === "JOINT"}>
          <summary>{section.name} <span>{section.entries.length}</span></summary>
          <div className="macro-entry-list">
            {section.entries.map((entry, index) => (
              <article key={`${entry.line}-${entry.key}-${index}`}>
                <div><strong>{entry.key}</strong><small>red {entry.line}{entry.dependencies.length ? ` · zavisi od ${entry.dependencies.join(", ")}` : ""}</small></div>
                <code>{entry.value}</code>
              </article>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function SawPathPanel({ resolution }: { resolution: CorpusSawResolution }) {
  const points = resolution.paths.flatMap(({ start, end }) => [start, end]);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 1;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 1;
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const sx = (x: number) => 24 + ((x - minX) / spanX) * 312;
  const sy = (y: number) => 156 - ((y - minY) / spanY) * 132;
  return <section className="saw-path-panel" aria-label="Read-only PILA putanje">
    <div className="saw-path-heading"><div><strong>PILA putanje</strong><small>Read-only dokaz iz CMK-a · ništa se ne upisuje u ploču</small></div><span>{resolution.paths.length} spremnih · {resolution.rejected.length} neriješenih</span></div>
    {resolution.paths.length > 0 && <div className="saw-path-content">
      <svg viewBox="0 0 360 180" role="img" aria-label="Lokalne GX GY do PX PY putanje">
        <rect x="12" y="12" width="336" height="156" rx="8" />
        {resolution.paths.map((path, index) => <g key={path.section}>
          <line x1={sx(path.start[0])} y1={sy(path.start[1])} x2={sx(path.end[0])} y2={sy(path.end[1])} />
          <circle cx={sx(path.start[0])} cy={sy(path.start[1])} r="4" />
          <circle cx={sx(path.end[0])} cy={sy(path.end[1])} r="4" />
          <text x={sx(path.start[0]) + 7} y={sy(path.start[1]) - 7}>{index + 1}</text>
        </g>)}
      </svg>
      <div>{resolution.paths.map((path) => <article key={path.section}>
        <strong>{path.name}</strong><span>{path.section} · GS {path.surface}</span>
        <code>({formatNumber(path.start[0])}, {formatNumber(path.start[1])}) → ({formatNumber(path.end[0])}, {formatNumber(path.end[1])})</code>
        <small>GD {formatNumber(path.depth)} · PSP {formatNumber(path.toolWidth)} · PO/PS/PP/PA {path.modes.PO ?? "?"}/{path.modes.PS ?? "?"}/{path.modes.PP ?? "?"}/{path.modes.PA ?? "?"}</small>
        {path.routerConversion && <small>PMU {path.routerConversion.name ?? "?"} · PMT {path.routerConversion.tool ?? "?"}</small>}
      </article>)}</div>
    </div>}
    {resolution.inactive.length > 0 && <p className="evidence-note">Neaktivne operacije (J=0 ili GB=0): {resolution.inactive.join(", ")}</p>}
    {resolution.rejected.length > 0 && <details><summary>Zašto neke PILA putanje nisu prikazane</summary>{resolution.rejected.map(({ section, reason }) => <p key={section}><strong>{section}</strong> · {reason}</p>)}</details>}
    <p className="evidence-note">GX/GY, PX/PY, GD, PSP i GS su prikazani doslovno. Značenje režima PO/PS/PP/PA i preslikavanje GS plohe u 3D još nisu proglašeni dokazanim.</p>
  </section>;
}

function operationKindLabel(kind: CorpusCmkOperationKind) {
  if (kind === "raster") return "Rupe";
  if (kind === "saw") return "Rez";
  if (kind === "consumable") return "Okov";
  if (kind === "macro") return "Poziv";
  return "Grupa";
}

async function decodeCorpusC6Dat(encoded: string): Promise<string> {
  const bytes = Uint8Array.from(atob(encoded.replace(/\s/g, "")), (character) => character.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return decodeCorpusText(new Uint8Array(await new Response(stream).arrayBuffer()));
}

function BoardMachiningDetails({ board }: { board: CorpusS3dBoard }) {
  const operations = board.holes.filter((hole) => hole.machiningMode !== null || Object.keys(hole.machining).length > 0);
  if (!operations.length) return null;
  return (
    <div className="board-editor machining-details">
      <div className="section-title"><h3>Proizvodne obrade</h3><span>{operations.length} RAS</span></div>
      <p>Prikazani su izvorni S3D ključevi i vrijednosti bez pretpostavljanja nedokazane semantike.</p>
      {operations.map((hole, index) => (
        <div className="machining-operation" key={`${hole.groupType}-${hole.name}-${index}`}>
          <strong>{hole.name || `${hole.groupType} ${index + 1}`}</strong>
          <span>RAS MODE {hole.machiningMode ?? "—"}</span>
          <dl>{Object.entries(hole.machining).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value || "—"}</dd></div>)}</dl>
        </div>
      ))}
    </div>
  );
}

function BoardHoleEditor({ board, onUpdate }: { board: CorpusS3dBoard; onUpdate(holes: readonly CorpusS3dHole[]): void }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(board.holes.length ? 0 : null);
  const selectedHole = selectedIndex === null ? null : board.holes[selectedIndex] ?? null;
  const [draft, setDraft] = useState(() => holeDraft(selectedHole));
  const [message, setMessage] = useState("");
  const [patternCount, setPatternCount] = useState("4");
  const [patternSpacing, setPatternSpacing] = useState("32");
  const [patternAxis, setPatternAxis] = useState<CorpusHolePatternAxis>("y");
  const [gridColumns, setGridColumns] = useState("2");
  const [gridRows, setGridRows] = useState("2");
  const [gridXSpacing, setGridXSpacing] = useState("32");
  const [gridYSpacing, setGridYSpacing] = useState("32");
  const [mirrorAxis, setMirrorAxis] = useState<CorpusHoleMirrorAxis>("x");
  const [keepMirrorSource, setKeepMirrorSource] = useState(true);

  useEffect(() => {
    const nextIndex = selectedIndex !== null && board.holes[selectedIndex] ? selectedIndex : (board.holes.length ? 0 : null);
    if (nextIndex !== selectedIndex) setSelectedIndex(nextIndex);
    setDraft(holeDraft(nextIndex === null ? null : board.holes[nextIndex] ?? null));
    setMessage("");
  }, [board]);

  function select(index: number) {
    setSelectedIndex(index);
    setDraft(holeDraft(board.holes[index] ?? null));
    setMessage("");
  }

  function startNew() {
    setSelectedIndex(null);
    setDraft(holeDraft(null));
    setMessage("Nova rupa još nije dodana.");
  }

  function apply() {
    const diameter = Number(draft.diameter);
    const depth = Number(draft.depth);
    const plane = Number(draft.plane);
    const angle = Number(draft.angle);
    if (!draft.name.trim()) return setMessage("Upiši naziv rupe.");
    if (!draft.xExpression.trim() || !draft.yExpression.trim()) return setMessage("X i Y položaj ne mogu biti prazni.");
    if (![diameter, depth].every((value) => Number.isFinite(value) && value > 0)) return setMessage("Prečnik i dubina moraju biti veći od nule.");
    if (![plane, angle].every(Number.isFinite)) return setMessage("Ravan i ugao moraju biti brojevi.");
    const previous = selectedHole;
    const hole: CorpusS3dHole = {
      groupType: previous?.groupType || "GRUPA14",
      name: draft.name.trim(), xExpression: draft.xExpression.trim(), yExpression: draft.yExpression.trim(),
      diameter, depth, plane, angle,
      machiningMode: previous?.machiningMode ?? null,
      machining: previous ? { ...previous.machining } : {},
    };
    const holes = selectedIndex === null ? [...board.holes, hole] : board.holes.map((item, index) => index === selectedIndex ? hole : item);
    onUpdate(holes);
    setSelectedIndex(selectedIndex === null ? holes.length - 1 : selectedIndex);
    setMessage(selectedIndex === null ? "Rupa je dodana u radnu kopiju." : "Rupa je izmijenjena u radnoj kopiji.");
  }

  function remove() {
    if (selectedIndex === null) return;
    const holes = board.holes.filter((_, index) => index !== selectedIndex);
    onUpdate(holes);
    setSelectedIndex(holes.length ? Math.min(selectedIndex, holes.length - 1) : null);
    setMessage("Rupa je uklonjena iz radne kopije. Poništi vraća prethodno stanje.");
  }

  function applyPattern() {
    const diameter = Number(draft.diameter);
    const depth = Number(draft.depth);
    const plane = Number(draft.plane);
    const angle = Number(draft.angle);
    if (!draft.name.trim() || !draft.xExpression.trim() || !draft.yExpression.trim()) return setMessage("Popuni naziv i početni X/Y položaj.");
    if (![diameter, depth].every((value) => Number.isFinite(value) && value > 0)) return setMessage("Prečnik i dubina moraju biti veći od nule.");
    if (![plane, angle].every(Number.isFinite)) return setMessage("Ravan i ugao moraju biti brojevi.");
    const template: CorpusS3dHole = {
      groupType: selectedHole?.groupType || "GRUPA14", name: draft.name.trim(), xExpression: draft.xExpression.trim(), yExpression: draft.yExpression.trim(),
      diameter, depth, plane, angle, machiningMode: selectedHole?.machiningMode ?? null, machining: selectedHole ? { ...selectedHole.machining } : {},
    };
    try {
      const pattern = createCorpusLinearHolePattern(template, Number(patternCount), Number(patternSpacing), patternAxis);
      const holes = selectedIndex === null
        ? [...board.holes, ...pattern]
        : [...board.holes.slice(0, selectedIndex), ...pattern, ...board.holes.slice(selectedIndex + 1)];
      onUpdate(holes);
      setSelectedIndex(selectedIndex === null ? board.holes.length : selectedIndex);
      setMessage(`Dodana je serija od ${pattern.length} rupa sa razmakom ${patternSpacing} mm.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Seriju rupa nije moguće napraviti.");
    }
  }

  function applyGrid() {
    const template = holeFromDraft(draft, selectedHole);
    if (typeof template === "string") return setMessage(template);
    try {
      const pattern = createCorpusRectangularHolePattern(template, Number(gridColumns), Number(gridRows), Number(gridXSpacing), Number(gridYSpacing));
      const holes = selectedIndex === null
        ? [...board.holes, ...pattern]
        : [...board.holes.slice(0, selectedIndex), ...pattern, ...board.holes.slice(selectedIndex + 1)];
      onUpdate(holes);
      setSelectedIndex(selectedIndex === null ? board.holes.length : selectedIndex);
      setMessage(`Dodana je mreža ${gridColumns} × ${gridRows}, ukupno ${pattern.length} rupa.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Mrežu rupa nije moguće napraviti.");
    }
  }

  function applyMirror() {
    if (selectedIndex === null || !selectedHole) return setMessage("Prvo izaberi postojeću rupu koju želiš ogledati.");
    const mirrored = mirrorCorpusHole(selectedHole, mirrorAxis);
    const holes = keepMirrorSource
      ? [...board.holes.slice(0, selectedIndex + 1), mirrored, ...board.holes.slice(selectedIndex + 1)]
      : board.holes.map((item, index) => index === selectedIndex ? mirrored : item);
    onUpdate(holes);
    setSelectedIndex(keepMirrorSource ? selectedIndex + 1 : selectedIndex);
    setMessage(keepMirrorSource ? `Dodana je ogledana kopija po ${mirrorAxis.toUpperCase()} osi.` : `Izabrana rupa je ogledana po ${mirrorAxis.toUpperCase()} osi.`);
  }

  function applyOppositeFace() {
    if (selectedIndex === null || !selectedHole) return setMessage("Prvo izaberi postojeću rupu koju želiš prenijeti na suprotnu plohu.");
    try {
      const opposite = oppositeCorpusHoleFace(selectedHole);
      const holes = keepMirrorSource
        ? [...board.holes.slice(0, selectedIndex + 1), opposite, ...board.holes.slice(selectedIndex + 1)]
        : board.holes.map((item, index) => index === selectedIndex ? opposite : item);
      onUpdate(holes);
      setSelectedIndex(keepMirrorSource ? selectedIndex + 1 : selectedIndex);
      setMessage(keepMirrorSource ? `Dodana je kopija na RPL ${opposite.plane} plohi.` : `Izabrana rupa je premještena na RPL ${opposite.plane} plohu.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Rupu nije moguće prenijeti na suprotnu plohu.");
    }
  }

  return (
    <div className="board-editor hole-editor">
      <div className="section-title"><h3>Ručno bušenje</h3><span>{board.holes.length} rupa</span></div>
      <p>Osnovna operacija bez makroa. Položaj prihvata broj ili Corpus izraz, npr. <code>B/2</code> i <code>L/2-32</code>.</p>
      <div className="hole-editor-toolbar">
        <select aria-label="Izabrana rupa" value={selectedIndex ?? "new"} onChange={(event) => event.target.value === "new" ? startNew() : select(Number(event.target.value))}>
          <option value="new">+ Nova rupa</option>
          {board.holes.map((hole, index) => <option key={`${hole.groupType}-${index}`} value={index}>{index + 1}. {hole.name || hole.groupType}</option>)}
        </select>
        <button className="secondary-button" type="button" onClick={startNew}>Nova</button>
      </div>
      <div className="hole-fields">
        <label><span>Naziv</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label><span>X položaj</span><input value={draft.xExpression} onChange={(event) => setDraft({ ...draft, xExpression: event.target.value })} /></label>
        <label><span>Y položaj</span><input value={draft.yExpression} onChange={(event) => setDraft({ ...draft, yExpression: event.target.value })} /></label>
        <label><span>Prečnik (mm)</span><input inputMode="decimal" value={draft.diameter} onChange={(event) => setDraft({ ...draft, diameter: event.target.value })} /></label>
        <label><span>Dubina (mm)</span><input inputMode="decimal" value={draft.depth} onChange={(event) => setDraft({ ...draft, depth: event.target.value })} /></label>
        <label><span>Ravan</span><input inputMode="numeric" value={draft.plane} onChange={(event) => setDraft({ ...draft, plane: event.target.value })} /></label>
        <label><span>Ugao (°)</span><input inputMode="decimal" value={draft.angle} onChange={(event) => setDraft({ ...draft, angle: event.target.value })} /></label>
      </div>
      <div className="geometry-actions">
        <button className="primary-button" type="button" onClick={apply}>{selectedIndex === null ? "Dodaj rupu" : "Sačuvaj rupu"}</button>
        {selectedIndex !== null && <button className="danger-button" type="button" onClick={remove}>Obriši rupu</button>}
        {message && <span>{message}</span>}
      </div>
      <details className="hole-pattern">
        <summary>Linearna serija rupa</summary>
        <p>Počinje od gornjeg X/Y položaja. Izabrana rupa se zamjenjuje serijom; kod nove rupe serija se dodaje na kraj.</p>
        <div>
          <label><span>Broj rupa</span><input inputMode="numeric" value={patternCount} onChange={(event) => setPatternCount(event.target.value)} /></label>
          <label><span>Razmak (mm)</span><input inputMode="decimal" value={patternSpacing} onChange={(event) => setPatternSpacing(event.target.value)} /></label>
          <label><span>Smjer</span><select value={patternAxis} onChange={(event) => setPatternAxis(event.target.value as CorpusHolePatternAxis)}><option value="x">X osa</option><option value="y">Y osa</option></select></label>
          <button className="secondary-button" type="button" onClick={applyPattern}>Napravi seriju</button>
        </div>
      </details>
      <details className="hole-pattern">
        <summary>Pravougaona mreža rupa</summary>
        <p>Početna rupa je gornji lijevi položaj mreže. Redovi povećavaju Y, a kolone X izraz.</p>
        <div className="hole-grid-fields">
          <label><span>Kolone</span><input inputMode="numeric" value={gridColumns} onChange={(event) => setGridColumns(event.target.value)} /></label>
          <label><span>Redovi</span><input inputMode="numeric" value={gridRows} onChange={(event) => setGridRows(event.target.value)} /></label>
          <label><span>X razmak</span><input inputMode="decimal" value={gridXSpacing} onChange={(event) => setGridXSpacing(event.target.value)} /></label>
          <label><span>Y razmak</span><input inputMode="decimal" value={gridYSpacing} onChange={(event) => setGridYSpacing(event.target.value)} /></label>
          <button className="secondary-button" type="button" onClick={applyGrid}>Napravi mrežu</button>
        </div>
      </details>
      <details className="hole-pattern">
        <summary>Kopiranje i ogledanje rupe</summary>
        <p>X ogledalo koristi <code>B-(RXP)</code>, a Y ogledalo <code>L-(RYP)</code>, tako da se položaj prilagođava promjeni dimenzije ploče.</p>
        <div className="hole-mirror-fields">
          <label><span>Osa ogledala</span><select value={mirrorAxis} onChange={(event) => setMirrorAxis(event.target.value as CorpusHoleMirrorAxis)}><option value="x">X · suprotna B ivica</option><option value="y">Y · suprotna L ivica</option></select></label>
          <label className="check-field"><input type="checkbox" checked={keepMirrorSource} onChange={(event) => setKeepMirrorSource(event.target.checked)} /><span>Zadrži originalnu rupu</span></label>
          <button className="secondary-button" type="button" disabled={selectedIndex === null} title={selectedIndex === null ? "Prvo izaberi postojeću rupu" : "Ogledaj izabranu rupu prema dimenziji ploče"} onClick={applyMirror}>{keepMirrorSource ? "Dodaj ogledanu kopiju" : "Ogledaj izabranu"}</button>
          <button className="secondary-button" type="button" disabled={selectedIndex === null || (selectedHole?.plane !== 0 && selectedHole?.plane !== 1)} title={selectedIndex === null ? "Prvo izaberi postojeću rupu" : selectedHole?.plane !== 0 && selectedHole?.plane !== 1 ? "Suprotna ploha je dokazana samo za RPL 0 i RPL 1" : "Preslikaj izabranu rupu na dokazanu suprotnu plohu"} onClick={applyOppositeFace}>{keepMirrorSource ? "Kopiraj na suprotnu plohu" : "Premjesti na suprotnu plohu"}</button>
        </div>
      </details>
      {selectedHole && (selectedHole.machiningMode !== null || Object.keys(selectedHole.machining).length > 0) && <p className="evidence-note">Postojeći RAS proizvodni podaci ove rupe ostaju sačuvani dok mijenjaš njene osnovne vrijednosti.</p>}
    </div>
  );
}

function holeDraft(hole: CorpusS3dHole | null) {
  return {
    name: hole?.name ?? "Rupa",
    xExpression: hole?.xExpression || "B/2",
    yExpression: hole?.yExpression || "L/2",
    diameter: hole?.diameter === null || hole?.diameter === undefined ? "5" : String(hole.diameter),
    depth: hole?.depth === null || hole?.depth === undefined ? "5" : String(hole.depth),
    plane: hole?.plane === null || hole?.plane === undefined ? "1" : String(hole.plane),
    angle: hole?.angle === null || hole?.angle === undefined ? "90" : String(hole.angle),
  };
}

function holeFromDraft(draft: ReturnType<typeof holeDraft>, previous: CorpusS3dHole | null): CorpusS3dHole | string {
  const diameter = Number(draft.diameter);
  const depth = Number(draft.depth);
  const plane = Number(draft.plane);
  const angle = Number(draft.angle);
  if (!draft.name.trim() || !draft.xExpression.trim() || !draft.yExpression.trim()) return "Popuni naziv i početni X/Y položaj.";
  if (![diameter, depth].every((value) => Number.isFinite(value) && value > 0)) return "Prečnik i dubina moraju biti veći od nule.";
  if (![plane, angle].every(Number.isFinite)) return "Ravan i ugao moraju biti brojevi.";
  return {
    groupType: previous?.groupType || "GRUPA14", name: draft.name.trim(), xExpression: draft.xExpression.trim(), yExpression: draft.yExpression.trim(),
    diameter, depth, plane, angle, machiningMode: previous?.machiningMode ?? null, machining: previous ? { ...previous.machining } : {},
  };
}

function ElementIdentityEditor({ element, onUpdate }: { element: CorpusS3dElement; onUpdate(patch: ElementIdentityPatch): void }) {
  const [name, setName] = useState(element.name);
  const [code, setCode] = useState(element.code);
  const [className, setClassName] = useState(element.className);
  const [visible, setVisible] = useState(element.visible !== false);
  const [editable, setEditable] = useState(element.editable !== false);
  const [locked, setLocked] = useState(element.locked === true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setName(element.name); setCode(element.code); setClassName(element.className);
    setVisible(element.visible !== false); setEditable(element.editable !== false); setLocked(element.locked === true); setMessage("");
  }, [element]);

  function apply() {
    if (!name.trim()) return setMessage("Naziv elementa ne može biti prazan.");
    onUpdate({ name: name.trim(), code: code.trim(), className: className.trim(), visible, editable, locked });
    setMessage("Identitet i stanje elementa su primijenjeni u radnoj kopiji.");
  }

  return (
    <section className="data-section geometry-editor">
      <div className="section-title"><h3>Identitet i stanje</h3><span>ELEMENT / ELM</span></div>
      <p>Uređuje samo dokazane atribute iz Corpus projekta.</p>
      <div className="appearance-fields">
        <label><span>Naziv</span><input aria-label="Naziv elementa" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label><span>Šifra</span><input aria-label="Šifra elementa" value={code} onChange={(event) => setCode(event.target.value)} /></label>
        <label><span>Klasa</span><input aria-label="Klasa elementa" value={className} onChange={(event) => setClassName(event.target.value)} /></label>
        <label className="check-field"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /><span>Vidljiv element</span></label>
        <label className="check-field"><input type="checkbox" checked={editable} onChange={(event) => setEditable(event.target.checked)} /><span>Dozvoljeno uređivanje</span></label>
        <label className="check-field"><input type="checkbox" checked={locked} onChange={(event) => setLocked(event.target.checked)} /><span>Zaključan element</span></label>
      </div>
      <div className="geometry-actions"><button className="primary-button" onClick={apply}>Primijeni identitet i stanje</button>{message && <span>{message}</span>}</div>
    </section>
  );
}

function ElementPlacementEditor({ element, room, elements, onUpdate }: {
  element: CorpusS3dElement;
  room: CorpusS3dRoom;
  elements: readonly CorpusS3dElement[];
  onUpdate(patch: ElementGeometryPatch): void;
}) {
  const targets = elements.filter((candidate) => candidate !== element);
  const [targetIndex, setTargetIndex] = useState("0");
  const [gap, setGap] = useState("0");
  const [roomMargin, setRoomMargin] = useState("0");
  const [message, setMessage] = useState("");
  const measurementTarget = targets[Number(targetIndex)] ?? null;
  const clearances = measurementTarget ? corpusElementClearances(element, measurementTarget) : null;
  const roomClearances = corpusRoomClearances(element, room);
  useEffect(() => { setTargetIndex("0"); setMessage(""); }, [element]);

  function applyPosition(position: CorpusPosition | null, action: string) {
    const patch = position ? geometryPatchAt(element, position) : null;
    if (!patch) {
      setMessage("Postavljanje traži potpune mjere elementa i, za zidove, poznate mjere prostorije.");
      return;
    }
    onUpdate(patch);
    setMessage(action);
  }

  function placeAtRoom(edge: CorpusRoomEdge, label: string) {
    applyPosition(corpusRoomPlacementPosition(element, room, edge), label);
  }

  function containInRoom() {
    const margin = Number(roomMargin.replace(",", "."));
    if (!Number.isFinite(margin) || margin < 0) {
      setMessage("Sigurnosni odmak mora biti broj 0 mm ili veći.");
      return;
    }
    const position = corpusContainedRoomPosition(element, room, margin);
    if (!position) {
      setMessage("Element sa ovim odmakom ne staje u poznate mjere prostorije.");
      return;
    }
    applyPosition(position, position.every((value, index) => value === element.position[index])
      ? "Element je već potpuno unutar prostorije."
      : "Element je vraćen unutar svih granica prostorije.");
  }

  function placeByTarget(side: CorpusAdjacentSide, label: string) {
    const target = targets[Number(targetIndex)];
    const parsedGap = Number(gap.replace(",", "."));
    if (!target || !Number.isFinite(parsedGap) || parsedGap < 0) {
      setMessage("Izaberi susjedni element i unesi razmak 0 mm ili veći.");
      return;
    }
    applyPosition(corpusAdjacentPlacementPosition(element, target, side, parsedGap), label);
  }

  function alignByTarget(alignment: CorpusAlignment, label: string) {
    const target = targets[Number(targetIndex)];
    if (!target) {
      setMessage("Izaberi element prema kojem želiš poravnanje.");
      return;
    }
    applyPosition(corpusAlignedPlacementPosition(element, target, alignment), label);
  }

  return (
    <section className="data-section geometry-editor placement-editor">
      <div className="section-title"><h3>Precizno postavljanje</h3><span>omotač</span></div>
      <p>Postavlja cijeli element po njegovim dokazanim vanjskim mjerama i Corpus pivotu, uključujući horizontalno rotirane elemente.</p>
      <div className="placement-groups">
        <div>
          <strong>Granice prostorije</strong>
          {roomClearances && <div className="room-clearance-readout" aria-label="Udaljenosti do granica prostorije">
            {roomClearances.map((item) => <div key={item.side} className={`room-clearance-${item.status}`}><span>{roomSideLabel(item.side)}</span><b>{item.distance === null ? "—" : `${formatNumber(Math.abs(item.distance))} mm`}</b><small>{item.status === "outside" ? "izvan" : item.status === "touch" ? "dodir" : item.status === "unknown" ? "nepoznato" : "slobodno"}</small></div>)}
          </div>}
          <div className="room-containment-fields">
            <label><input aria-label="Sigurnosni odmak od granica" inputMode="decimal" value={roomMargin} onChange={(event) => setRoomMargin(event.target.value)} /><span>mm odmak</span></label>
            <button onClick={containInRoom}>Vrati unutar sobe</button>
          </div>
          <div className="placement-buttons">
            <button onClick={() => placeAtRoom("floor", "Element je postavljen na pod.")}>Na pod</button>
            <button onClick={() => placeAtRoom("left", "Element je priljubljen uz lijevi zid.")}>Lijevi zid</button>
            <button onClick={() => placeAtRoom("right", "Element je priljubljen uz desni zid.")}>Desni zid</button>
            <button onClick={() => placeAtRoom("back", "Element je priljubljen uz zadnji zid.")}>Zadnji zid</button>
            <button onClick={() => placeAtRoom("front", "Element je priljubljen uz prednji zid.")}>Prednji zid</button>
            <button onClick={() => applyPosition(corpusSnappedPosition(element, 10), "Koordinate su zaokružene na mrežu 10 mm.")}>Mreža 10 mm</button>
          </div>
        </div>
        <div>
          <strong>Spoj sa elementom</strong>
          {targets.length ? <>
            <div className="placement-target-fields">
              <select aria-label="Susjedni element" value={targetIndex} onChange={(event) => setTargetIndex(event.target.value)}>
                {targets.map((target, index) => <option value={index} key={`${target.name}-${target.code}-${index}`}>{target.name || target.code || `Element ${index + 1}`}</option>)}
              </select>
              <label><input aria-label="Razmak između elemenata" inputMode="decimal" value={gap} onChange={(event) => setGap(event.target.value)} /><span>mm razmak</span></label>
            </div>
            {clearances && <div className="clearance-readout" aria-label="Mjerenje razmaka omotača">
              {clearances.map((item) => <div key={item.axis} className={`clearance-${item.status}`}><strong>{item.axis}</strong><span>{item.status === "gap" ? "Razmak" : item.status === "touch" ? "Dodir" : "Preklapanje"}</span><b>{item.status === "touch" ? "0 mm" : `${formatNumber(Math.abs(item.distance))} mm`}</b></div>)}
            </div>}
            <div className="placement-buttons">
              <button onClick={() => placeByTarget("left", "Element je spojen lijevo od izabranog.")}>Lijevo od</button>
              <button onClick={() => placeByTarget("right", "Element je spojen desno od izabranog.")}>Desno od</button>
              <button onClick={() => placeByTarget("back", "Element je spojen iza izabranog.")}>Iza</button>
              <button onClick={() => placeByTarget("front", "Element je spojen ispred izabranog.")}>Ispred</button>
            </div>
            <strong className="placement-subtitle">Poravnanje omotača</strong>
            <div className="placement-buttons">
              <button onClick={() => alignByTarget("left", "Poravnate su lijeve ivice.")}>Lijevo</button>
              <button onClick={() => alignByTarget("centerX", "Poravnati su centri po X osi.")}>Centar X</button>
              <button onClick={() => alignByTarget("right", "Poravnate su desne ivice.")}>Desno</button>
              <button onClick={() => alignByTarget("back", "Poravnate su zadnje ivice.")}>Nazad</button>
              <button onClick={() => alignByTarget("centerZ", "Poravnati su centri po Z osi.")}>Centar Z</button>
              <button onClick={() => alignByTarget("front", "Poravnate su prednje ivice.")}>Naprijed</button>
              <button onClick={() => alignByTarget("bottom", "Poravnate su donje ivice.")}>Dno</button>
              <button onClick={() => alignByTarget("centerY", "Poravnati su centri po Y osi.")}>Centar Y</button>
              <button onClick={() => alignByTarget("top", "Poravnate su gornje ivice.")}>Vrh</button>
            </div>
          </> : <p className="empty-copy">Dodaj još jedan korijenski element da bi ih mogao spojiti bez preklapanja.</p>}
        </div>
      </div>
      {message && <div className="placement-message">{message}</div>}
    </section>
  );
}

function roomSideLabel(side: "left" | "right" | "back" | "front" | "floor" | "ceiling"): string {
  return side === "left" ? "Lijevo" : side === "right" ? "Desno" : side === "back" ? "Nazad" : side === "front" ? "Naprijed" : side === "floor" ? "Pod" : "Plafon";
}

function geometryPatchAt(element: CorpusS3dElement, position: CorpusPosition): ElementGeometryPatch | null {
  if (element.width === null || element.height === null || element.depth === null) return null;
  if (element.width <= 0 || element.height <= 0 || element.depth <= 0) return null;
  return {
    position,
    width: element.width,
    height: element.height,
    depth: element.depth,
    angle: element.angle ?? 0,
    xAngle: element.xAngle ?? 0,
    zAngle: element.zAngle ?? 0,
  };
}

function ElementArrayEditor({ element, onCreate }: { element: CorpusS3dElement; onCreate(count: number, offset: CorpusCopyOffset): void }) {
  const [count, setCount] = useState("1");
  const [offset, setOffset] = useState(() => ({ x: String(Math.max(element.width ?? 0, 100)), y: "0", z: "0" }));
  const [message, setMessage] = useState("");
  useEffect(() => {
    setCount("1");
    setOffset({ x: String(Math.max(element.width ?? 0, 100)), y: "0", z: "0" });
    setMessage("");
  }, [element]);

  function apply() {
    const parsedCount = Number(count);
    const values = [offset.x, offset.y, offset.z].map((value) => Number(value.replace(",", "."))) as [number, number, number];
    if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 50) return setMessage("Broj kopija mora biti cijeli broj od 1 do 50.");
    if (values.some((value) => !Number.isFinite(value))) return setMessage("Svi X/Y/Z razmaci moraju biti brojevi.");
    if (values.every((value) => value === 0)) return setMessage("Najmanje jedan razmak mora biti različit od nule.");
    onCreate(parsedCount, values);
    setMessage(`Napravljeno kopija: ${parsedCount}.`);
  }

  return <section className="data-section geometry-editor array-editor">
    <div className="section-title"><h3>Linearni niz kopija</h3><span>jedan Undo korak</span></div>
    <p>Svaka naredna kopija pomjera se za isti X/Y/Z razmak u odnosu na prethodnu.</p>
    <div className="geometry-fields array-fields">
      <label><span>Broj kopija</span><div><input type="number" min="1" max="50" step="1" value={count} onChange={(event) => setCount(event.target.value)} /><small>kom.</small></div></label>
      {(["x", "y", "z"] as const).map((axis) => <label key={axis}><span>Razmak {axis.toUpperCase()}</span><div><input inputMode="decimal" value={offset[axis]} onChange={(event) => setOffset((current) => ({ ...current, [axis]: event.target.value }))} /><small>mm</small></div></label>)}
    </div>
    <div className="geometry-actions"><button className="primary-button" onClick={apply}>Napravi kopije</button>{message && <span>{message}</span>}</div>
  </section>;
}

type GeometryForm = {
  x: string; y: string; z: string; width: string; height: string; depth: string; angle: string; xAngle: string; zAngle: string;
};

function ElementGeometryEditor({ element, canEdit, onUpdate, onFitToBoards, onUndo, onRemoveImported, onDuplicateImported, onExportSelectedE3d, canRemoveImported, canExportE3d, canDuplicate, canUndo }: {
  element: CorpusS3dElement;
  canEdit: boolean;
  onUpdate(patch: ElementGeometryPatch): void;
  onFitToBoards(): boolean;
  onUndo(): void;
  onRemoveImported(): void;
  onDuplicateImported(count?: number, offset?: CorpusCopyOffset): void;
  onExportSelectedE3d(): void;
  canRemoveImported: boolean;
  canExportE3d: boolean;
  canDuplicate: boolean;
  canUndo: boolean;
}) {
  const [form, setForm] = useState<GeometryForm>(() => geometryFormFor(element));
  const [message, setMessage] = useState("");
  useEffect(() => { setForm(geometryFormFor(element)); }, [element]);

  const fields: Array<{ key: keyof GeometryForm; label: string; suffix: string }> = [
    { key: "x", label: "Pozicija X", suffix: "mm" },
    { key: "y", label: "Pozicija Y", suffix: "mm" },
    { key: "z", label: "Pozicija Z", suffix: "mm" },
    { key: "width", label: "Širina", suffix: "mm" },
    { key: "height", label: "Visina", suffix: "mm" },
    { key: "depth", label: "Dubina", suffix: "mm" },
    { key: "angle", label: "Ugao", suffix: "°" },
    { key: "xAngle", label: "X ugao", suffix: "°" },
    { key: "zAngle", label: "Z ugao", suffix: "°" },
  ];

  function apply() {
    const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, Number(value)])) as Record<keyof GeometryForm, number>;
    if (Object.values(values).some((value) => !Number.isFinite(value))) {
      setMessage("Sva polja moraju sadržati broj.");
      return;
    }
    if (values.width <= 0 || values.height <= 0 || values.depth <= 0) {
      setMessage("Dimenzije moraju biti veće od nule.");
      return;
    }
    onUpdate({
      position: [values.x, values.y, values.z],
      width: values.width,
      height: values.height,
      depth: values.depth,
      angle: values.angle,
      xAngle: values.xAngle,
      zAngle: values.zAngle,
    });
    setMessage("Izmjena je primijenjena samo na lokalnu radnu kopiju.");
  }

  function fitToBoards() {
    setMessage(onFitToBoards()
      ? "Omotač je prilagođen direktnim pločama bez pomjeranja njihovog svjetskog položaja."
      : "Prilagođavanje traži potpune, nerotirane direktne ploče i element bez pod-elemenata.");
  }

  return (
    <section className="data-section geometry-editor">
      <div className="section-title"><h3>Radna geometrija</h3><span>lokalno</span></div>
      <p>{canEdit ? "Promijeni položaj ili omotač elementa. Izvorni S3D fajl ostaje netaknut." : "Geometrija je samo za čitanje jer je Corpus element zaključan ili označen kao neurediv."}</p>
      <div className="geometry-fields">
        {fields.map((field) => (
          <label key={field.key}><span>{field.label}</span><div><input type="number" step="any" disabled={!canEdit} value={form[field.key]} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} /><small>{field.suffix}</small></div></label>
        ))}
      </div>
      <div className="geometry-actions">
        <button className="primary-button" disabled={!canEdit} title={canEdit ? "Primijeni geometriju bez mijenjanja izvornog fajla" : "Element je zaključan ili označen kao neurediv"} onClick={apply}>Primijeni u radnoj kopiji</button>
        <button className="secondary-button" disabled={!canEdit || !element.boards.length} title={!canEdit ? "Element je zaključan ili označen kao neurediv" : !element.boards.length ? "Element nema ploča prema kojima se može prilagoditi" : "Prilagodi omotač stvarnim granicama ploča"} onClick={fitToBoards}>Prilagodi omotač pločama</button>
        {canUndo && <button className="secondary-button" onClick={onUndo}>Poništi zadnju izmjenu</button>}
        {canDuplicate && <button className="secondary-button" onClick={() => onDuplicateImported()}>Udvostruči element</button>}
        {canExportE3d && <button className="secondary-button" onClick={onExportSelectedE3d}>Izvezi izabrani E3D</button>}
        {canRemoveImported && <button className="secondary-button" onClick={onRemoveImported}>Ukloni dodani E3D</button>}
        {message && <span>{message}</span>}
      </div>
    </section>
  );
}

function geometryFormFor(element: CorpusS3dElement): GeometryForm {
  return {
    x: String(element.position[0] ?? 0), y: String(element.position[1] ?? 0), z: String(element.position[2] ?? 0),
    width: String(element.width ?? 1), height: String(element.height ?? 1), depth: String(element.depth ?? 1), angle: String(element.angle ?? 0),
    xAngle: String(element.xAngle ?? 0), zAngle: String(element.zAngle ?? 0),
  };
}

type BoardGeometryForm = {
  x: string; y: string; z: string; width: string; height: string; thickness: string;
  direction: string; angle: string; xAngle: string; zAngle: string;
};

function BoardGeometryEditor({ element, board, boardIndex, boardCount, onUpdate, onRename, onMove, onDuplicate, onDuplicateArray, onDuplicateGrid, onDistributeArray, onRemove, canChangeStructure, canRemove }: {
  element: CorpusS3dElement;
  board: CorpusS3dBoard;
  boardIndex: number;
  boardCount: number;
  onUpdate(boardIndex: number, patch: BoardGeometryPatch): void;
  onRename(boardIndex: number, name: string): void;
  onMove(boardIndex: number, direction: -1 | 1): void;
  onDuplicate(boardIndex: number): void;
  onDuplicateArray(boardIndex: number, count: number, offset: CorpusCopyOffset): void;
  onDuplicateGrid(boardIndex: number, columns: number, rows: number, columnStep: CorpusCopyOffset, rowStep: CorpusCopyOffset): boolean;
  onDistributeArray(boardIndex: number, copiesCount: number, axis: CorpusBoardPlacementAxis, inset: number): boolean;
  onRemove(boardIndex: number): void;
  canChangeStructure: boolean;
  canRemove: boolean;
}) {
  const [form, setForm] = useState<BoardGeometryForm>(() => boardGeometryFormFor(board));
  const [name, setName] = useState(board.name);
  const [alignmentInset, setAlignmentInset] = useState("0");
  const [arrayCount, setArrayCount] = useState("1");
  const [arrayOffset, setArrayOffset] = useState<[string, string, string]>(["0", "100", "0"]);
  const [gridColumns, setGridColumns] = useState("2");
  const [gridRows, setGridRows] = useState("2");
  const [gridColumnStep, setGridColumnStep] = useState<[string, string, string]>(["100", "0", "0"]);
  const [gridRowStep, setGridRowStep] = useState<[string, string, string]>(["0", "100", "0"]);
  const [distributionAxis, setDistributionAxis] = useState<CorpusBoardPlacementAxis>("y");
  const [distributionInset, setDistributionInset] = useState("0");
  const [message, setMessage] = useState("");
  useEffect(() => { setForm(boardGeometryFormFor(board)); setName(board.name); setMessage(""); }, [board]);
  const fields: Array<{ key: keyof BoardGeometryForm; label: string; suffix: string }> = [
    { key: "x", label: "Pozicija X", suffix: "mm" }, { key: "y", label: "Pozicija Y", suffix: "mm" },
    { key: "z", label: "Pozicija Z", suffix: "mm" }, { key: "width", label: "Širina konture", suffix: "mm" },
    { key: "height", label: "Dužina konture", suffix: "mm" }, { key: "thickness", label: "Debljina", suffix: "mm" },
    { key: "angle", label: "Ugao", suffix: "°" }, { key: "xAngle", label: "X ugao", suffix: "°" },
    { key: "zAngle", label: "Z ugao", suffix: "°" },
  ];

  function apply() {
    const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, Number(value)])) as Record<keyof BoardGeometryForm, number>;
    if (Object.values(values).some((value) => !Number.isFinite(value))) return setMessage("Sva polja moraju sadržati broj.");
    if (values.width <= 0 || values.height <= 0 || values.thickness <= 0) return setMessage("Mjere ploče moraju biti veće od nule.");
    if (![0, 1, 2].includes(values.direction)) return setMessage("Orijentacija ploče mora biti 0, 1 ili 2.");
    onUpdate(boardIndex, {
      position: [values.x, values.y, values.z], width: values.width, height: values.height, thickness: values.thickness,
      direction: values.direction, angle: values.angle, xAngle: values.xAngle, zAngle: values.zAngle,
    });
    setMessage("Geometrija ploče je primijenjena u radnoj kopiji.");
  }

  function applyName() {
    if (!name.trim()) return setMessage("Naziv ploče ne može biti prazan.");
    if (name.trim() === board.name) return setMessage("Naziv ploče nije promijenjen.");
    onRename(boardIndex, name);
  }

  function align(axis: CorpusBoardPlacementAxis, alignment: CorpusBoardPlacementAlignment) {
    const inset = Number(alignmentInset.replace(",", "."));
    const result = corpusAlignedBoardPosition(element, board, axis, alignment, inset);
    if (!result.ok) return setMessage(result.reason);
    onUpdate(boardIndex, {
      position: result.position,
      width: board.width,
      height: board.height,
      thickness: board.thickness,
      direction: board.direction,
      angle: board.angle,
      xAngle: board.xAngle,
      zAngle: board.zAngle,
    });
    setMessage("Ploča je poravnata unutar lokalnog omotača elementa.");
  }

  function createArray() {
    const count = Number(arrayCount);
    const offset = arrayOffset.map((value) => Number(value.replace(",", "."))) as [number, number, number];
    if (!Number.isInteger(count) || count < 1 || count > 50) return setMessage("Broj kopija mora biti cijeli broj od 1 do 50.");
    if (offset.some((value) => !Number.isFinite(value))) return setMessage("Sva tri koraka niza moraju biti brojevi.");
    if (offset.every((value) => value === 0)) return setMessage("Najmanje jedan korak niza mora biti različit od nule.");
    onDuplicateArray(boardIndex, count, offset);
    setMessage(`${count} ${count === 1 ? "kopija je dodana" : "kopija je dodano"} kao jedna Undo operacija.`);
  }

  function distributeArray() {
    const count = Number(arrayCount);
    const inset = Number(distributionInset.replace(",", "."));
    if (!Number.isInteger(count) || count < 1 || count > 50) return setMessage("Broj kopija mora biti cijeli broj od 1 do 50.");
    if (!Number.isFinite(inset) || inset < 0) return setMessage("Odmak raspodjele mora biti nenegativan broj.");
    if (onDistributeArray(boardIndex, count, distributionAxis, inset)) {
      setMessage(`Izabrana ploča i ${count} ${count === 1 ? "kopija" : "kopija"} ravnomjerno su raspoređene.`);
    }
  }

  function createGrid() {
    const columns = Number(gridColumns);
    const rows = Number(gridRows);
    const columnStep = gridColumnStep.map((value) => Number(value.replace(",", "."))) as [number, number, number];
    const rowStep = gridRowStep.map((value) => Number(value.replace(",", "."))) as [number, number, number];
    try {
      const copyCount = corpusGridCopyOffsets(columns, rows, columnStep, rowStep).length;
      if (onDuplicateGrid(boardIndex, columns, rows, columnStep, rowStep)) {
        setMessage(`${copyCount} ${copyCount === 1 ? "kopija je dodana" : "kopija je dodano"} u 2D mreži kao jedna Undo operacija.`);
      }
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Parametri mreže nisu ispravni.");
    }
  }

  return (
    <div className="board-editor geometry-editor">
      <div className="section-title"><h3>{board.name || `Ploča ${boardIndex + 1}`}</h3><span>ploča</span></div>
      <p>Mijenjaju se samo dokazani S3D atributi ploče; kontura, rupe i obrade ostaju sačuvane.</p>
      {canChangeStructure && <div className="appearance-fields"><label><span>Naziv ploče</span><input value={name} onChange={(event) => setName(event.target.value)} /></label><div className="geometry-actions"><button className="secondary-button" onClick={applyName}>Primijeni naziv</button></div></div>}
      <div className="geometry-fields">
        {fields.map((field) => <label key={field.key}><span>{field.label}</span><div><input type="number" step="any" value={form[field.key]} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} /><small>{field.suffix}</small></div></label>)}
        <label><span>Orijentacija</span><div><select aria-label="Orijentacija ploče" value={form.direction} onChange={(event) => setForm((current) => ({ ...current, direction: event.target.value }))}><option value="0">0 · bočna</option><option value="1">1 · uspravna</option><option value="2">2 · horizontalna</option></select></div></label>
      </div>
      <div className="geometry-actions"><button className="primary-button" onClick={apply}>Primijeni ploču</button>{canChangeStructure && <><button className="secondary-button" disabled={boardIndex === 0} title={boardIndex === 0 ? "Ploča je već prva u Corpus redoslijedu" : "Pomjeri ploču ranije u Corpus redoslijedu"} onClick={() => onMove(boardIndex, -1)}>↑ Ranije</button><button className="secondary-button" disabled={boardIndex >= boardCount - 1} title={boardIndex >= boardCount - 1 ? "Ploča je već posljednja u Corpus redoslijedu" : "Pomjeri ploču kasnije u Corpus redoslijedu"} onClick={() => onMove(boardIndex, 1)}>↓ Kasnije</button><button className="secondary-button" onClick={() => onDuplicate(boardIndex)}>Udvostruči ploču</button></>}{canRemove && <button className="danger-button" onClick={() => onRemove(boardIndex)}>Ukloni ploču</button>}{message && <span>{message}</span>}</div>
      <div className="board-alignment-editor">
        <div><strong>Poravnanje u elementu</strong><span>Za nerotirane ploče; prvo primijeni eventualno promijenjene mjere.</span></div>
        <label><span>Odmak</span><div><input aria-label="Odmak poravnanja ploče" inputMode="decimal" value={alignmentInset} onChange={(event) => setAlignmentInset(event.target.value)} /><small>mm</small></div></label>
        <div className="placement-buttons board-alignment-buttons">
          <button onClick={() => align("x", "min")}>Lijevo</button><button onClick={() => align("x", "center")}>Centar X</button><button onClick={() => align("x", "max")}>Desno</button>
          <button onClick={() => align("y", "min")}>Dno</button><button onClick={() => align("y", "center")}>Centar Y</button><button onClick={() => align("y", "max")}>Vrh</button>
          <button onClick={() => align("z", "min")}>Naprijed</button><button onClick={() => align("z", "center")}>Centar Z</button><button onClick={() => align("z", "max")}>Nazad</button>
        </div>
      </div>
      {canChangeStructure && <div className="board-array-editor">
        <div><strong>Linearni niz ploče</strong><span>Svaka kopija zadržava konturu, rupe i obrade.</span></div>
        <label><span>Kopija</span><div><input aria-label="Broj kopija ploče" inputMode="numeric" value={arrayCount} onChange={(event) => setArrayCount(event.target.value)} /><small>×</small></div></label>
        {(["X", "Y", "Z"] as const).map((axis, index) => <label key={axis}><span>Korak {axis}</span><div><input aria-label={`Korak ${axis} niza ploče`} inputMode="decimal" value={arrayOffset[index]} onChange={(event) => setArrayOffset(arrayOffset.map((value, item) => item === index ? event.target.value : value) as [string, string, string])} /><small>mm</small></div></label>)}
        <button className="primary-button" onClick={createArray}>Napravi niz ploča</button>
        <div className="board-distribution-row">
          <strong>Ravnomjerno kroz omotač</strong>
          <label><span>Osa</span><select aria-label="Osa ravnomjerne raspodjele ploča" value={distributionAxis} onChange={(event) => setDistributionAxis(event.target.value as CorpusBoardPlacementAxis)}><option value="x">X</option><option value="y">Y</option><option value="z">Z</option></select></label>
          <label><span>Odmak krajeva</span><div><input aria-label="Odmak ravnomjerne raspodjele ploča" inputMode="decimal" value={distributionInset} onChange={(event) => setDistributionInset(event.target.value)} /><small>mm</small></div></label>
          <button className="secondary-button" onClick={distributeArray}>Rasporedi original i kopije</button>
        </div>
        <div className="board-grid-row">
          <div><strong>2D mreža ploče</strong><span>Početna ćelija je izabrana ploča; najviše 50 novih kopija.</span></div>
          <label><span>Kolone</span><div><input aria-label="Broj kolona mreže ploče" inputMode="numeric" value={gridColumns} onChange={(event) => setGridColumns(event.target.value)} /><small>×</small></div></label>
          <label><span>Redovi</span><div><input aria-label="Broj redova mreže ploče" inputMode="numeric" value={gridRows} onChange={(event) => setGridRows(event.target.value)} /><small>×</small></div></label>
          {(["X", "Y", "Z"] as const).map((axis, index) => <label key={`board-column-${axis}`}><span>Kolona {axis}</span><div><input aria-label={`Korak kolone ${axis} mreže ploče`} inputMode="decimal" value={gridColumnStep[index]} onChange={(event) => setGridColumnStep(gridColumnStep.map((value, item) => item === index ? event.target.value : value) as [string, string, string])} /><small>mm</small></div></label>)}
          {(["X", "Y", "Z"] as const).map((axis, index) => <label key={`board-row-${axis}`}><span>Red {axis}</span><div><input aria-label={`Korak reda ${axis} mreže ploče`} inputMode="decimal" value={gridRowStep[index]} onChange={(event) => setGridRowStep(gridRowStep.map((value, item) => item === index ? event.target.value : value) as [string, string, string])} /><small>mm</small></div></label>)}
          <button className="primary-button" onClick={createGrid}>Napravi mrežu ploča</button>
        </div>
      </div>}
    </div>
  );
}

function boardGeometryFormFor(board: CorpusS3dBoard): BoardGeometryForm {
  return {
    x: String(board.position[0] ?? 0), y: String(board.position[1] ?? 0), z: String(board.position[2] ?? 0),
    width: String(board.width ?? 1), height: String(board.height ?? 1), thickness: String(board.thickness ?? 1),
    direction: String(board.direction ?? 2), angle: String(board.angle ?? 0), xAngle: String(board.xAngle ?? 0), zAngle: String(board.zAngle ?? 0),
  };
}

function nextBoardCopyName(name: string, existingNames: readonly string[]): string {
  return nextUniqueName(`${name.trim() || "Ploča"} kopija`, existingNames);
}

function nextUniqueName(base: string, existingNames: readonly string[]): string {
  const existing = new Set(existingNames.map((entry) => entry.toLocaleLowerCase()));
  if (!existing.has(base.toLocaleLowerCase())) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base} ${suffix}`;
    if (!existing.has(candidate.toLocaleLowerCase())) return candidate;
  }
  return `${base} ${Date.now()}`;
}

function BoardAppearanceEditor({ board, boardIndex, onUpdate }: {
  board: CorpusS3dBoard;
  boardIndex: number;
  onUpdate(boardIndex: number, patch: BoardAppearancePatch): void;
}) {
  const [materialName, setMaterialName] = useState(board.materialName);
  const [materialUid, setMaterialUid] = useState(board.materialUid);
  const [color, setColor] = useState(colorToHex(board.color));
  const [transparent, setTransparent] = useState(board.transparent === true);
  const [visible, setVisible] = useState(board.visible !== false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setMaterialName(board.materialName); setMaterialUid(board.materialUid); setColor(colorToHex(board.color));
    setTransparent(board.transparent === true); setVisible(board.visible !== false); setMessage("");
  }, [board]);

  function apply() {
    const parsedColor = Number.parseInt(color.replace(/^#/, ""), 16);
    if (!/^#[0-9a-f]{6}$/i.test(color) || !Number.isInteger(parsedColor)) return setMessage("Boja mora biti zapisana kao #RRGGBB.");
    onUpdate(boardIndex, { materialName, materialUid, color: parsedColor, transparent, visible });
    setMessage("Izgled ploče je primijenjen u radnoj kopiji.");
  }

  return (
    <div className="appearance-editor">
      <div className="section-title"><h3>Materijal i izgled</h3><span>3D</span></div>
      <div className="appearance-fields">
        <label><span>Naziv materijala</span><input value={materialName} onChange={(event) => setMaterialName(event.target.value)} /></label>
        <label><span>UID materijala</span><input value={materialUid} onChange={(event) => setMaterialUid(event.target.value)} /></label>
        <label><span>Boja</span><div className="color-field"><input type="color" aria-label="Boja ploče" value={color} onChange={(event) => setColor(event.target.value)} /><input aria-label="HEX boja ploče" value={color} onChange={(event) => setColor(event.target.value)} /></div></label>
        <label className="check-field"><input type="checkbox" checked={transparent} onChange={(event) => setTransparent(event.target.checked)} /><span>Providna ploča</span></label>
        <label className="check-field"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /><span>Vidljiva ploča</span></label>
      </div>
      <div className="geometry-actions"><button className="primary-button" onClick={apply}>Primijeni izgled</button>{message && <span>{message}</span>}</div>
    </div>
  );
}

function BoardMaterialPreview({ board }: { board: CorpusS3dBoard }) {
  const library = useContext(MaterialLibraryContext);
  const uid = normalizeMaterialUid(board.materialUid);
  const resolution = uid ? library?.resolutionByUid.get(uid) : undefined;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (resolution?.kind !== "ready") { setImageUrl(null); return; }
    const url = URL.createObjectURL(resolution.source.file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [resolution]);

  let status = "Učitaj lokalni elmtex folder da provjeriš tačan kataloški materijal.";
  if (library && !uid) status = "Ploča nema MATUID; naziv se namjerno ne koristi za automatski izbor teksture.";
  else if (library && !resolution) status = "MATUID nije pronađen u izabranom katalogu.";
  else if (resolution?.kind === "ambiguous") status = `MATUID ima ${resolution.candidates} kataloška zapisa; tekstura nije automatski izabrana.`;
  else if (resolution?.kind === "missing-picture") status = `${resolution.name || board.materialName}: ${resolution.reason} (${resolution.pictureFile || "PICFILE nije naveden"}).`;
  else if (resolution?.kind === "ready") status = "Jednoznačan MATUID i lokalna slika; tekstura je dostupna u 3D prikazu.";

  return <div className={`material-preview ${resolution?.kind === "ready" ? "ready" : "unresolved"}`}>
    <div className="material-preview-image">{imageUrl ? <img src={imageUrl} alt={`Lokalna tekstura ${resolution?.kind === "ready" ? resolution.source.name : board.materialName}`} /> : <span>Bez slike</span>}</div>
    <div>
      <div className="section-title"><h3>Kataloški materijal</h3><span>{resolution?.kind === "ready" ? "MATUID" : "provjera"}</span></div>
      <strong>{resolution?.kind === "ready" ? resolution.source.name : board.materialName || "Materijal nije naveden"}</strong>
      <code>{board.materialUid || "MATUID nije naveden"}</code>
      {resolution?.kind === "ready" && <small>TEXX / TEXY / TEXZ: {resolution.source.textureSize.map((value) => value ?? "?").join(" / ")} mm</small>}
      <p>{status}</p>
    </div>
  </div>;
}

function colorToHex(color: number | null): string {
  return `#${(color ?? 0xd8d1c1).toString(16).padStart(6, "0").slice(-6)}`;
}

function Property({ label, value }: { label: string; value: string }) {
  return <div className="property"><span>{label}</span><strong>{value}</strong></div>;
}

function ElementEditorSidebar({ element, selectedBoardIndex, onSelectBoard, onBack }: { element: CorpusS3dElement; selectedBoardIndex: number | null; onSelectBoard(boardIndex: number | null): void; onBack(): void }) {
  return <aside className="element-editor-sidebar">
    <button className="editor-sidebar-back" onClick={onBack}>← Nazad u prostoriju</button>
    <div className="editor-sidebar-heading"><p className="eyebrow">Aktivni element</p><h2>{element.name || "Neimenovan element"}</h2><span>{element.code || element.className || "Bez šifre"}</span>{selectedBoardIndex !== null && element.boards[selectedBoardIndex] && <strong>Izabrana ploča: {element.boards[selectedBoardIndex]!.name || `Ploča ${selectedBoardIndex + 1}`}</strong>}</div>
    <Suspense fallback={<div className="element-preview-loading">Pripremam 3D element…</div>}><Element3DPreview element={element} selectedBoardIndex={selectedBoardIndex} onSelectBoard={onSelectBoard} /></Suspense>
    <dl className="editor-sidebar-properties">
      <div><dt>Širina</dt><dd>{formatNumber(element.width)} mm</dd></div>
      <div><dt>Visina</dt><dd>{formatNumber(element.height)} mm</dd></div>
      <div><dt>Dubina</dt><dd>{formatNumber(element.depth)} mm</dd></div>
      <div><dt>Ploče</dt><dd>{element.boards.length}</dd></div>
      <div><dt>Položaj</dt><dd>X {formatCoordinate(element.position[0])}<br />Y {formatCoordinate(element.position[1])}<br />Z {formatCoordinate(element.position[2])}</dd></div>
    </dl>
    <div className="editor-sidebar-state"><i className={element.visible === false ? "off" : ""} /><span>{element.visible === false ? "Sakriven element" : "Vidljiv element"}{element.locked ? " · zaključan" : ""}</span></div>
  </aside>;
}

function EmptyDetails() {
  return <div className="empty-details"><span>◇</span><h2>Izaberi element</h2><p>Detalji elementa i njegovih ploča pojaviće se ovdje.</p></div>;
}

function formatNumber(value: number | null): string {
  return value === null ? "—" : new Intl.NumberFormat("bs-BA", { maximumFractionDigits: 2 }).format(value);
}

function formatMillimeters(value: number | null): string {
  return value === null ? "—" : `${formatNumber(value)} mm`;
}

function formatCoordinate(value: number | null): string {
  return value === null ? "—" : `${formatNumber(value)} mm`;
}

function formatBoardDirection(direction: number | null): string {
  if (direction === 0) return "Bočna";
  if (direction === 1) return "Uspravna";
  if (direction === 2) return "Horizontalna";
  return direction === null ? "—" : `SMJER ${direction}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRecoveryTime(value: string): string {
  const time = new Date(value);
  return Number.isFinite(time.getTime())
    ? new Intl.DateTimeFormat("bs-BA", { dateStyle: "medium", timeStyle: "short" }).format(time)
    : value;
}

function downloadText(fileName: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
