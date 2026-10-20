import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { corpusDrawingShape, corpusDrawingSpans, corpusDrawingSvg, type CorpusDrawingProjection } from "../lib/corpus-drawing";
import { corpusLinearCopies, type CorpusCopyOffset } from "../lib/corpus-array";
import { corpusElementClearances, corpusRoomClearances } from "../lib/corpus-clearance";
import { corpusDistributedElements, type CorpusDistributionAxis } from "../lib/corpus-distribution";
import { corpusAdjacentPlacementPosition, corpusAlignedPlacementPosition, corpusContainedRoomPosition, corpusRoomPlacementPosition, corpusSnappedPosition, type CorpusAdjacentSide, type CorpusAlignment, type CorpusPosition, type CorpusRoomEdge } from "../lib/corpus-placement";
import { analyzeCorpusLayout } from "../lib/corpus-layout";
import { generateCorpusCabinetE3d, type CorpusCabinetSpec } from "../lib/corpus-generator";
import { buildCorpusCutList, corpusCutListCsv, type CorpusCutListResult } from "../lib/corpus-cutlist";
import { buildCorpusConsumablesList, corpusConsumablesCsv, type CorpusConsumableItem } from "../lib/corpus-consumables";
import { analyzeCorpusMacroPayload, decodeCorpusText, type CorpusMacroAnalysis } from "../lib/corpus-macro";
import { corpusCmkDocumentFromDecodedPayloads, parseCorpusCmk, type CorpusCmkDocument } from "../lib/corpus-cmk";
import { corpusMacroBoardContext, simulateCorpusCmk, type CorpusCmkOperationKind } from "../lib/corpus-cmk-simulation";
import { analyzeCorpusBoardContact, type CorpusBoardContactFace, type CorpusBoardLocalContactRectangle } from "../lib/corpus-board-contact";
import { corpusRasterOperationsToHoles, createCorpusLinearHolePattern, createCorpusRectangularHolePattern, mirrorCorpusHole, oppositeCorpusHoleFace, type CorpusHoleMirrorAxis, type CorpusHolePatternAxis } from "../lib/corpus-machining";
import { applyCorpusWorkingCopyProject, corpusElementAtPath, createCorpusWorkingCopyFile, findCorpusElementPath, updateCorpusBoard, updateCorpusBoardAppearance, updateCorpusBoardHoles, updateCorpusElement, updateCorpusElementIdentity, updateCorpusRoom, type BoardAppearancePatch, type BoardGeometryPatch, type ElementGeometryPatch, type ElementIdentityPatch, type RoomGeometryPatch } from "../lib/corpus-model";
import { appendCorpusE3dBoard, createCorpusE3dSourceFromS3d, duplicateCorpusE3dBoard, removeCorpusE3dBoard, renameCorpusE3dBoard, replaceCorpusE3dBoardContour, replaceCorpusE3dBoardEdgeBanding, writeCorpusE3dGeometryCopy, writeCorpusS3dWithImportedElements, type CorpusE3dImportSource, type CorpusEdgeBandingSpec, type CorpusNewBoardSpec, type CorpusStraightContourPoint } from "../lib/corpus-s3d-writer";
import { DEMO_S3D, EMPTY_S3D } from "./demo-project";

const Room3DView = lazy(() => import("./room-3d").then((module) => ({ default: module.Room3DView })));

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
};

type ProjectHistoryEntry = {
  inspection: CorpusS3dInspection;
  importedE3dSources: readonly CorpusE3dImportSource[];
};

export function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const workingCopyInputRef = useRef<HTMLInputElement>(null);
  const e3dImportInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const macroLibraryInputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<LoadedProject | null>(null);
  const [selected, setSelected] = useState<CorpusS3dElement | null>(null);
  const [selectedBoardIndex, setSelectedBoardIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [viewMode, setViewMode] = useState<"data" | "drawing" | "threeD" | "room" | "cutlist">("threeD");
  const [libraryFiles, setLibraryFiles] = useState<readonly File[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [macroFiles, setMacroFiles] = useState<readonly File[]>([]);
  const [macroLibraryOpen, setMacroLibraryOpen] = useState(false);
  const [macroQuery, setMacroQuery] = useState("");
  const [selectedMacro, setSelectedMacro] = useState<{ path: string; document: CorpusCmkDocument } | null>(null);
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
  const cutList = useMemo(() => buildCorpusCutList(project?.inspection.elements ?? []), [project]);
  const consumablesList = useMemo(() => buildCorpusConsumablesList(project?.inspection.elements ?? []), [project]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!project || (!event.ctrlKey && !event.metaKey) || event.altKey || isEditableTarget(event.target)) return;
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
  }, [project, selected]);

  async function openFile(file: File | undefined) {
    if (!file) return;
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
    setProject({ fileName, fileSize, sourceXml, inspection, originalInspection: inspection, dirty: false, history: [], future: [], importedE3dSources: [] });
    setSelected(inspection.elements[0] ?? null);
    setSelectedBoardIndex(null);
    setQuery("");
  }

  const selectElement = useCallback((element: CorpusS3dElement) => {
    setSelected(element);
    setSelectedBoardIndex(null);
  }, []);

  const selectBoard = useCallback((element: CorpusS3dElement, boardIndex: number) => {
    setSelected(element);
    setSelectedBoardIndex(boardIndex);
  }, []);

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
          <p className="privacy-note"><span>●</span> Read-only analiza · bez slanja podataka</p>
        </section>
      </main>
    );
  }

  const allElements = flattenCorpusS3dElements(project.inspection.elements);
  const boards = allElements.reduce((sum, element) => sum + element.boards.length, 0);
  const consumables = allElements.reduce(
    (sum, element) => sum + element.consumables.length + element.boards.reduce((n, board) => n + board.consumables.length, 0),
    0,
  );

  function updateSelectedElement(patch: ElementGeometryPatch) {
    if (!selected) return;
    const { elements, updated: updatedSelection } = updateCorpusElement(project!.inspection.elements, selected, patch);
    setProject((current) => current ? { ...current, history: appendProjectHistory(current), future: [], inspection: { ...current.inspection, elements }, dirty: true } : current);
    setSelected(updatedSelection);
  }

  function moveElementIn3D(target: CorpusS3dElement, position: CorpusPosition) {
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

  function updateSelectedBoard(boardIndex: number, patch: BoardGeometryPatch) {
    if (!selected) return;
    const result = updateCorpusBoard(project!.inspection.elements, selected, boardIndex, patch);
    if (!result.updatedElement) return;
    setProject((current) => current ? { ...current, history: appendProjectHistory(current), future: [], inspection: { ...current.inspection, elements: result.elements }, dirty: true } : current);
    setSelected(result.updatedElement);
  }

  function updateSelectedBoardAppearance(boardIndex: number, patch: BoardAppearancePatch) {
    if (!selected) return;
    const result = updateCorpusBoardAppearance(project!.inspection.elements, selected, boardIndex, patch);
    if (!result.updatedElement) return;
    setProject((current) => current ? { ...current, history: appendProjectHistory(current), future: [], inspection: { ...current.inspection, elements: result.elements }, dirty: true } : current);
    setSelected(result.updatedElement);
  }

  function updateSelectedBoardHoles(boardIndex: number, holes: readonly CorpusS3dHole[]) {
    if (!selected) return;
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

  function resetWorkingCopy() {
    const original = project!.originalInspection;
    setProject((current) => current ? { ...current, inspection: original, dirty: false, history: [], future: [], importedE3dSources: [] } : current);
    setSelected(original.elements[0] ?? null);
    setSelectedBoardIndex(null);
  }

  function undoWorkingCopy() {
    if (!project!.history.length) return;
    const selectionPath = selected ? findCorpusElementPath(project!.inspection.elements, selected) : null;
    const previous = project!.history[project!.history.length - 1]!;
    const history = project!.history.slice(0, -1);
    setProject((current) => current ? { ...current, inspection: previous.inspection, importedE3dSources: previous.importedE3dSources, history, future: [...current.future, projectHistoryEntry(current)].slice(-100), dirty: previous.inspection !== current.originalInspection || previous.importedE3dSources.length > 0 } : current);
    setSelected(selectionPath ? corpusElementAtPath(previous.inspection.elements, selectionPath) : previous.inspection.elements[0] ?? null);
  }

  function redoWorkingCopy() {
    if (!project!.future.length) return;
    const selectionPath = selected ? findCorpusElementPath(project!.inspection.elements, selected) : null;
    const next = project!.future[project!.future.length - 1]!;
    const future = project!.future.slice(0, -1);
    setProject((current) => current ? { ...current, inspection: next.inspection, importedE3dSources: next.importedE3dSources, history: appendProjectHistory(current), future, dirty: next.inspection !== current.originalInspection || next.importedE3dSources.length > 0 } : current);
    setSelected(selectionPath ? corpusElementAtPath(next.inspection.elements, selectionPath) : next.inspection.elements[0] ?? null);
  }

  function removeImportedElement() {
    const elements = project!.inspection.elements;
    const path = selected ? findCorpusElementPath(elements, selected) : null;
    const originalCount = project!.originalInspection.elements.length;
    if (!path || path.length !== 1 || path[0]! < originalCount) return;
    const rootIndex = path[0]!;
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
  }

  function duplicateSelectedBoard(boardIndex: number) {
    if (!project || !selected || project.inspection.format !== "corpus-s3d") return;
    const path = findCorpusElementPath(project.inspection.elements, selected);
    const originalCount = project.originalInspection.elements.length;
    if (!path || path.length !== 1 || path[0]! < originalCount || !selected.boards[boardIndex]) return;
    const importIndex = path[0]! - originalCount;
    const source = project.importedE3dSources[importIndex];
    if (!source) return;
    try {
      const editedSource = writeCorpusE3dGeometryCopy(source.sourceXml, [source.originalElement], [selected]);
      const copyName = nextBoardCopyName(selected.boards[boardIndex]!.name, selected.boards.map((board) => board.name));
      const nextSourceXml = duplicateCorpusE3dBoard(editedSource, boardIndex, copyName);
      const nextInspection = parseCorpusE3d(nextSourceXml);
      const nextElement = nextInspection.elements[0];
      if (!nextElement) throw new Error("Udvostručeni E3D nema korijenski element.");
      setProject((current) => current ? {
        ...current,
        history: appendProjectHistory(current),
        future: [],
        inspection: { ...current.inspection, elements: current.inspection.elements.map((element, index) => index === path[0] ? nextElement : element) },
        importedE3dSources: current.importedE3dSources.map((entry, index) => index === importIndex ? { ...entry, sourceXml: nextSourceXml, originalElement: nextElement } : entry),
        dirty: true,
      } : current);
      setSelected(nextElement);
      setSelectedBoardIndex(boardIndex + 1);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ploču nije moguće udvostručiti.");
    }
  }

  function removeSelectedBoard(boardIndex: number) {
    if (!project || !selected || project.inspection.format !== "corpus-s3d") return;
    const board = selected.boards[boardIndex];
    const path = findCorpusElementPath(project.inspection.elements, selected);
    const originalCount = project.originalInspection.elements.length;
    if (!board || !path || path.length !== 1 || path[0]! < originalCount || selected.boards.length <= 1) return;
    if (!window.confirm(`Ukloniti ploču „${board.name || `Ploča ${boardIndex + 1}`}“?\n\nPloča, njena kontura, rupe i obrade biće uklonjene iz radne kopije. Izvorni fajl ostaje netaknut.`)) return;
    const importIndex = path[0]! - originalCount;
    const source = project.importedE3dSources[importIndex];
    if (!source) return;
    try {
      const editedSource = writeCorpusE3dGeometryCopy(source.sourceXml, [source.originalElement], [selected]);
      const nextSourceXml = removeCorpusE3dBoard(editedSource, boardIndex);
      const nextInspection = parseCorpusE3d(nextSourceXml);
      const nextElement = nextInspection.elements[0];
      if (!nextElement) throw new Error("Izmijenjeni E3D nema korijenski element.");
      setProject((current) => current ? {
        ...current,
        history: appendProjectHistory(current),
        future: [],
        inspection: { ...current.inspection, elements: current.inspection.elements.map((element, index) => index === path[0] ? nextElement : element) },
        importedE3dSources: current.importedE3dSources.map((entry, index) => index === importIndex ? { ...entry, sourceXml: nextSourceXml, originalElement: nextElement } : entry),
        dirty: true,
      } : current);
      setSelected(nextElement);
      setSelectedBoardIndex(Math.min(boardIndex, nextElement.boards.length - 1));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ploču nije moguće ukloniti.");
    }
  }

  function addBoardToSelectedElement(spec: CorpusNewBoardSpec) {
    if (!project || !selected || project.inspection.format !== "corpus-s3d") return;
    const path = findCorpusElementPath(project.inspection.elements, selected);
    const originalCount = project.originalInspection.elements.length;
    if (!path || path.length !== 1 || path[0]! < originalCount) return;
    const importIndex = path[0]! - originalCount;
    const source = project.importedE3dSources[importIndex];
    if (!source) return;
    try {
      const editedSource = writeCorpusE3dGeometryCopy(source.sourceXml, [source.originalElement], [selected]);
      const nextSourceXml = appendCorpusE3dBoard(editedSource, {
        ...spec,
        name: nextUniqueName(spec.name.trim(), selected.boards.map((board) => board.name)),
      });
      const nextInspection = parseCorpusE3d(nextSourceXml);
      const nextElement = nextInspection.elements[0];
      if (!nextElement) throw new Error("Izmijenjeni E3D nema korijenski element.");
      setProject((current) => current ? {
        ...current,
        history: appendProjectHistory(current),
        future: [],
        inspection: { ...current.inspection, elements: current.inspection.elements.map((element, index) => index === path[0] ? nextElement : element) },
        importedE3dSources: current.importedE3dSources.map((entry, index) => index === importIndex ? { ...entry, sourceXml: nextSourceXml, originalElement: nextElement } : entry),
        dirty: true,
      } : current);
      setSelected(nextElement);
      setSelectedBoardIndex(nextElement.boards.length - 1);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Novu ploču nije moguće dodati.");
    }
  }

  function renameSelectedBoard(boardIndex: number, name: string) {
    if (!project || !selected || project.inspection.format !== "corpus-s3d") return;
    const path = findCorpusElementPath(project.inspection.elements, selected);
    const originalCount = project.originalInspection.elements.length;
    if (!path || path.length !== 1 || path[0]! < originalCount || !selected.boards[boardIndex]) return;
    const importIndex = path[0]! - originalCount;
    const source = project.importedE3dSources[importIndex];
    if (!source) return;
    try {
      const editedSource = writeCorpusE3dGeometryCopy(source.sourceXml, [source.originalElement], [selected]);
      const nextSourceXml = renameCorpusE3dBoard(editedSource, boardIndex, name);
      const nextInspection = parseCorpusE3d(nextSourceXml);
      const nextElement = nextInspection.elements[0];
      if (!nextElement) throw new Error("Izmijenjeni E3D nema korijenski element.");
      setProject((current) => current ? {
        ...current,
        history: appendProjectHistory(current),
        future: [],
        inspection: { ...current.inspection, elements: current.inspection.elements.map((element, index) => index === path[0] ? nextElement : element) },
        importedE3dSources: current.importedE3dSources.map((entry, index) => index === importIndex ? { ...entry, sourceXml: nextSourceXml, originalElement: nextElement } : entry),
        dirty: true,
      } : current);
      setSelected(nextElement);
      setSelectedBoardIndex(boardIndex);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Naziv ploče nije moguće promijeniti.");
    }
  }

  function updateSelectedBoardContour(boardIndex: number, points: readonly CorpusStraightContourPoint[]) {
    if (!project || !selected || project.inspection.format !== "corpus-s3d") return;
    const path = findCorpusElementPath(project.inspection.elements, selected);
    const originalCount = project.originalInspection.elements.length;
    if (!path || path.length !== 1 || path[0]! < originalCount || !selected.boards[boardIndex]) return;
    const importIndex = path[0]! - originalCount;
    const source = project.importedE3dSources[importIndex];
    if (!source) return;
    try {
      const editedSource = writeCorpusE3dGeometryCopy(source.sourceXml, [source.originalElement], [selected]);
      const nextSourceXml = replaceCorpusE3dBoardContour(editedSource, boardIndex, points);
      const nextInspection = parseCorpusE3d(nextSourceXml);
      const nextElement = nextInspection.elements[0];
      if (!nextElement) throw new Error("Izmijenjeni E3D nema korijenski element.");
      setProject((current) => current ? {
        ...current,
        history: appendProjectHistory(current),
        future: [],
        inspection: { ...current.inspection, elements: current.inspection.elements.map((element, index) => index === path[0] ? nextElement : element) },
        importedE3dSources: current.importedE3dSources.map((entry, index) => index === importIndex ? { ...entry, sourceXml: nextSourceXml, originalElement: nextElement } : entry),
        dirty: true,
      } : current);
      setSelected(nextElement);
      setSelectedBoardIndex(boardIndex);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Konturu ploče nije moguće promijeniti.");
    }
  }

  function updateSelectedBoardEdgeBanding(boardIndex: number, spec: CorpusEdgeBandingSpec) {
    if (!project || !selected || project.inspection.format !== "corpus-s3d") return;
    const path = findCorpusElementPath(project.inspection.elements, selected);
    const originalCount = project.originalInspection.elements.length;
    if (!path || path.length !== 1 || path[0]! < originalCount || !selected.boards[boardIndex]) return;
    const importIndex = path[0]! - originalCount;
    const source = project.importedE3dSources[importIndex];
    if (!source) return;
    try {
      const editedSource = writeCorpusE3dGeometryCopy(source.sourceXml, [source.originalElement], [selected]);
      const nextSourceXml = replaceCorpusE3dBoardEdgeBanding(editedSource, boardIndex, spec);
      const nextElement = parseCorpusE3d(nextSourceXml).elements[0];
      if (!nextElement) throw new Error("Izmijenjeni E3D nema korijenski element.");
      setProject((current) => current ? {
        ...current, history: appendProjectHistory(current), future: [], dirty: true,
        inspection: { ...current.inspection, elements: current.inspection.elements.map((element, index) => index === path[0] ? nextElement : element) },
        importedE3dSources: current.importedE3dSources.map((entry, index) => index === importIndex ? { ...entry, sourceXml: nextSourceXml, originalElement: nextElement } : entry),
      } : current);
      setSelected(nextElement);
      setSelectedBoardIndex(boardIndex);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Rubnu obradu nije moguće promijeniti.");
    }
  }

  function exportWorkingCopy() {
    const originalCount = project!.originalInspection.elements.length;
    const imports = project!.importedE3dSources
      .slice(0, project!.inspection.elements.length - originalCount)
      .map((source, index) => ({
        sourceFile: source.sourceFile,
        sourceXml: writeCorpusE3dGeometryCopy(source.sourceXml, [source.originalElement], [project!.inspection.elements[originalCount + index]!]),
      }));
    const sidecar = createCorpusWorkingCopyFile(
      project!.fileName,
      project!.originalInspection.elements,
      project!.inspection.elements,
      undefined,
      { original: project!.originalInspection.room, current: project!.inspection.room },
      imports,
    );
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
        ? writeCorpusE3dGeometryCopy(project!.sourceXml, project!.originalInspection.elements, project!.inspection.elements)
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

  function exportCutList() {
    const stem = project!.fileName.replace(/\.(?:s3d|e3d)$/i, "");
    downloadText(`${stem}-KROJNA-LISTA.csv`, corpusCutListCsv(cutList), "text/csv;charset=utf-8");
  }

  function exportConsumables() {
    const stem = project!.fileName.replace(/\.(?:s3d|e3d)$/i, "");
    downloadText(`${stem}-POTROSNI-MATERIJAL.csv`, corpusConsumablesCsv(consumablesList), "text/csv;charset=utf-8");
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
    <div className="app-shell">
      <header className="topbar">
        <Brand compact />
        <div className="file-identity">
          <strong>{project.fileName}</strong>
          <span>{project.inspection.format === "corpus-e3d" ? "E3D" : "S3D"} v{project.inspection.version || "?"} · {formatBytes(project.fileSize)}{project.dirty ? " · radna kopija izmijenjena" : ""}</span>
        </div>
        <nav className="view-switch" aria-label="Prikaz projekta">
          <button className={viewMode === "drawing" ? "active" : ""} onClick={() => setViewMode("drawing")}>Nacrt</button>
          <button className={viewMode === "threeD" ? "active" : ""} onClick={() => setViewMode("threeD")}>3D</button>
          <button className={viewMode === "data" ? "active" : ""} onClick={() => setViewMode("data")}>Podaci</button>
          <button className={viewMode === "cutlist" ? "active" : ""} onClick={() => setViewMode("cutlist")}>Krojna</button>
          {project.inspection.format === "corpus-s3d" && <button className={viewMode === "room" ? "active" : ""} onClick={() => setViewMode("room")}>Prostorija</button>}
        </nav>
        <div className="topbar-actions">
          <button className="secondary-button" aria-keyshortcuts="Control+Z Meta+Z" disabled={!project.history.length} onClick={undoWorkingCopy} title={`Poništi zadnju izmjenu · Ctrl+Z${project.history.length ? ` · ${project.history.length} koraka dostupno` : ""}`}>↶ Undo</button>
          <button className="secondary-button" aria-keyshortcuts="Control+Y Control+Shift+Z Meta+Shift+Z" disabled={!project.future.length} onClick={redoWorkingCopy} title={`Vrati poništenu izmjenu · Ctrl+Y / Ctrl+Shift+Z${project.future.length ? ` · ${project.future.length} koraka dostupno` : ""}`}>↷ Redo</button>
          {project.inspection.format === "corpus-s3d" && <button className="secondary-button" onClick={() => setGeneratorOpen(true)}>Novi korpus</button>}
          {project.inspection.format === "corpus-s3d" && <button className="secondary-button" onClick={() => libraryFiles.length ? setLibraryOpen(true) : libraryInputRef.current?.click()}>{libraryFiles.length ? `Biblioteka (${libraryFiles.length})` : "Učitaj E3D biblioteku"}</button>}
          <button className="secondary-button" onClick={() => macroFiles.length ? setMacroLibraryOpen(true) : macroLibraryInputRef.current?.click()}>{macroFiles.length ? `Makroi (${macroFiles.length})` : "Učitaj Makro folder"}</button>
          {project.inspection.format === "corpus-s3d" && <button className="secondary-button" onClick={() => e3dImportInputRef.current?.click()}>Dodaj E3D fajl</button>}
          <button className="secondary-button" onClick={() => workingCopyInputRef.current?.click()}>Učitaj radnu kopiju</button>
          <button className="secondary-button" onClick={() => inputRef.current?.click()}>Otvori drugi projekat</button>
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
                  return <button key={path} className={selectedMacro?.path === path ? "active" : ""} onClick={() => inspectMacro(file)}><span><strong>{file.name.replace(/\.cmk$/i, "")}</strong><small>{parts.slice(0, -1).join(" / ") || "Korijenski folder"} · {formatBytes(file.size)}</small></span><i>Pregled</i></button>;
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

      <section className="summary-strip">
        <Metric label="Prostorija" value={`${formatNumber(project.inspection.room.width)} × ${formatNumber(project.inspection.room.length)} m`} />
        <Metric label="Visina" value={`${formatNumber(corpusRoomTotalHeight(project.inspection.room.height, project.inspection.room.lowerHeight))} m`} />
        <Metric label="Elemenata" value={String(allElements.length)} />
        <Metric label="Ploča" value={String(boards)} />
        <Metric label="Potrošnih stavki" value={String(consumables)} />
        <Metric label="Provjera rasporeda" value={layoutIssues.length ? `${layoutIssues.length} upozorenja` : "Bez preklapanja"} warning={layoutIssues.length > 0} title={layoutIssues.map(({ message }) => message).join("\n")} />
      </section>

      <main className="workspace">
        <aside className="tree-panel">
          <div className="panel-heading">
            <div><span>Struktura projekta</span><small>{allElements.length} elemenata</small></div>
            <label className="search-box">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Traži naziv ili šifru…" />
            </label>
          </div>
          <div className="tree-scroll">
            <ElementTree
              elements={project.inspection.elements}
              query={query}
              selected={selected}
              onSelect={selectElement}
            />
          </div>
        </aside>

        <section className={viewMode !== "data" && viewMode !== "room" && viewMode !== "cutlist" ? "detail-panel drawing-panel" : "detail-panel"}>
          {viewMode === "room" ? (
            <RoomEditor room={project.inspection.room} elements={project.inspection.elements} onUpdate={updateRoom} onDistribute={distributeRootElements} onUndo={undoWorkingCopy} onResetProject={resetWorkingCopy} canUndo={project.history.length > 0} projectDirty={project.dirty} onExport={exportWorkingCopy} onExportS3d={exportS3dCopy} />
          ) : viewMode === "cutlist" ? (
            <CutListView result={cutList} consumables={consumablesList} onExport={exportCutList} onExportConsumables={exportConsumables} />
          ) : viewMode === "drawing" ? (
            <ElevationView fileName={project.fileName} elements={project.inspection.elements} selected={selected} onSelect={selectElement} onOpenData={() => setViewMode("data")} />
          ) : viewMode === "threeD" ? (
            <Suspense fallback={<div className="three-loading"><span /><strong>Pripremam 3D prikaz…</strong></div>}>
              <Room3DView
                elements={project.inspection.elements}
                room={project.inspection.room}
                selected={selected}
                selectedBoardIndex={selectedBoardIndex}
                onSelect={selectElement}
                onSelectBoard={selectBoard}
                onMove={moveElementIn3D}
                onOpenData={() => setViewMode("data")}
              />
            </Suspense>
          ) : (
            selected ? <ElementDetails element={selected} room={project.inspection.room} placementElements={project.inspection.elements} selectedBoardIndex={selectedBoardIndex} onSelectBoard={setSelectedBoardIndex} onUpdate={updateSelectedElement} onUpdateIdentity={updateSelectedElementIdentity} onUpdateBoard={updateSelectedBoard} onUpdateBoardAppearance={updateSelectedBoardAppearance} onUpdateBoardHoles={updateSelectedBoardHoles} onUpdateBoardContour={updateSelectedBoardContour} onUpdateBoardEdgeBanding={updateSelectedBoardEdgeBanding} onAddBoard={addBoardToSelectedElement} onRenameBoard={renameSelectedBoard} onDuplicateBoard={duplicateSelectedBoard} onRemoveBoard={removeSelectedBoard} onUndo={undoWorkingCopy} onResetProject={resetWorkingCopy} onRemoveImported={removeImportedElement} onDuplicateImported={duplicateImportedElement} onExportSelectedE3d={exportSelectedE3d} canManageImported={isImportedRoot(project, selected)} canDuplicate={project.inspection.format === "corpus-s3d" && Boolean(findCorpusElementPath(project.inspection.elements, selected)?.length === 1)} onExport={exportWorkingCopy} onExportS3d={exportS3dCopy} projectDirty={project.dirty} canUndo={project.history.length > 0} /> : <EmptyDetails />
          )}
        </section>
      </main>

      <footer className="statusbar">
        <span><i className={`status-dot ${project.dirty ? "status-dot-dirty" : ""}`} /> {project.dirty ? "Izmjene su samo u radnoj kopiji" : "Izvorni projekat otvoren samo za čitanje"}</span>
        <span>{error ?? layoutIssues[0]?.message ?? (project.inspection.unknownTopLevelTags.length ? `${project.inspection.unknownTopLevelTags.length} nepoznatih sekcija` : "Struktura prepoznata")}</span>
      </footer>
    </div>
  );
}

function libraryFilePath(file: File): string {
  return file.webkitRelativePath || file.name;
}

function projectHistoryEntry(project: Pick<LoadedProject, "inspection" | "importedE3dSources">): ProjectHistoryEntry {
  return { inspection: project.inspection, importedE3dSources: project.importedE3dSources };
}

function appendProjectHistory(project: Pick<LoadedProject, "inspection" | "importedE3dSources" | "history">): readonly ProjectHistoryEntry[] {
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
  const [backColor, setBackColor] = useState("#ffffff");
  const [materialName, setMaterialName] = useState("Bijela");
  const [color, setColor] = useState("#f2f2ee");
  const [frontCount, setFrontCount] = useState("0");
  const [frontLayout, setFrontLayout] = useState<"doors" | "drawers">("doors");
  const [frontMount, setFrontMount] = useState<"overlay" | "inset">("overlay");
  const [frontDistribution, setFrontDistribution] = useState<"even" | "ratios">("even");
  const [frontRatios, setFrontRatios] = useState("1; 2; 1");
  const [frontThickness, setFrontThickness] = useState("18");
  const [frontGap, setFrontGap] = useState("2");
  const [frontMaterialName, setFrontMaterialName] = useState("Bijela fronta");
  const [frontColor, setFrontColor] = useState("#f8f8f5");
  const [message, setMessage] = useState("");

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
      backColor: Number.parseInt(backColor.slice(1), 16),
      materialName,
      color: Number.parseInt(color.slice(1), 16),
      frontCount: frontWeights?.length ?? Number(frontCount),
      frontLayout,
      frontMount,
      frontWeights,
      frontThickness: Number(frontThickness.replace(",", ".")),
      frontGap: Number(frontGap.replace(",", ".")),
      frontMaterialName,
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
          <label><span>Naziv</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
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
          <label><span>Boja</span><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
          <label><span>Poleđina</span><select value={backType} onChange={(event) => setBackType(event.target.value as "none" | "panel" | "thin")}><option value="none">Bez leđa</option><option value="panel">Pločasta leđa unutra</option><option value="thin">Tanka HDF leđa pozadi</option></select></label>
          {backType === "thin" && <>
            <label><span>Debljina HDF-a</span><div><input inputMode="decimal" value={backThickness} onChange={(event) => setBackThickness(event.target.value)} /><small>mm</small></div></label>
            <label><span>Materijal HDF-a</span><input value={backMaterialName} onChange={(event) => setBackMaterialName(event.target.value)} /></label>
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
            <label><span>Boja fronte</span><input type="color" value={frontColor} onChange={(event) => setFrontColor(event.target.value)} /></label>
          </>}
        </div>
        {message && <p className="error-message">{message}</p>}
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
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

function Metric({ label, value, warning = false, title }: { label: string; value: string; warning?: boolean; title?: string }) {
  return <div className={`metric ${warning ? "metric-warning" : ""}`} title={title}><span>{label}</span><strong>{value}</strong></div>;
}

function CutListView({ result, consumables, onExport, onExportConsumables }: { result: CorpusCutListResult; consumables: readonly CorpusConsumableItem[]; onExport(): void; onExportConsumables(): void }) {
  const validBoards = result.totalBoards - result.skippedBoards;
  return (
    <div className="detail-content cutlist-page">
      <div className="detail-title">
        <div><p className="eyebrow">Proizvodni pregled</p><h2>Krojna lista projekta</h2><span>Grupisano po materijalu i izvornim Corpus mjerama VISINA × DUBINA × DEBLJINA</span></div>
        <button className="primary-button" disabled={!result.items.length} onClick={onExport}>Izvezi CSV</button>
      </div>
      <div className="cutlist-summary">
        <Property label="Ploča sa mjerama" value={String(validBoards)} />
        <Property label="Grupa za krojenje" value={String(result.items.length)} />
        <Property label="Preskočeno bez mjera" value={String(result.skippedBoards)} />
      </div>
      {result.items.length ? <div className="board-table-wrap cutlist-table-wrap"><table className="board-table cutlist-table">
        <thead><tr><th>Materijal</th><th>VISINA</th><th>DUBINA</th><th>Debljina</th><th>Kom.</th><th>Rupe</th><th>Elementi / ploče</th></tr></thead>
        <tbody>{result.items.map((item, index) => <tr key={`${item.materialUid}-${item.materialName}-${item.height}-${item.width}-${item.thickness}-${index}`}>
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
        <div className="cutlist-section-heading"><div><div className="section-title"><h3>Potrošni materijal i rubne obrade</h3><span>{consumables.length}</span></div><p>TIP, KOMADA i STR0–STR3 prikazani su direktno iz Corpus zapisa.</p></div><button className="secondary-button" disabled={!consumables.length} onClick={onExportConsumables}>Izvezi potrošni CSV</button></div>
        {consumables.length ? <div className="board-table-wrap"><table className="board-table consumables-table">
          <thead><tr><th>TIP</th><th>Naziv / oznaka</th><th>Materijal</th><th>Količina</th><th>Pojave</th><th>STR0–STR3</th><th>Izvori</th></tr></thead>
          <tbody>{consumables.map((item, index) => <tr key={`${item.type}-${item.uid}-${item.designation}-${index}`}>
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

function RoomEditor({ room, elements, onUpdate, onDistribute, onUndo, onResetProject, canUndo, projectDirty, onExport, onExportS3d }: {
  room: CorpusS3dRoom;
  elements: readonly CorpusS3dElement[];
  onUpdate(patch: RoomGeometryPatch): void;
  onDistribute(axis: CorpusDistributionAxis, gap: number, margin: number): boolean;
  onUndo(): void;
  onResetProject(): void;
  canUndo: boolean;
  projectDirty: boolean;
  onExport(): void;
  onExportS3d(): void;
}) {
  const [form, setForm] = useState<RoomForm>(() => roomFormFor(room));
  const [message, setMessage] = useState("");
  useEffect(() => { setForm(roomFormFor(room)); setMessage(""); }, [room]);
  const fields: Array<{ key: keyof RoomForm; label: string; note: string }> = [
    { key: "width", label: "Širina prostorije", note: "SIRINA" },
    { key: "length", label: "Dužina prostorije", note: "DUZINA" },
    { key: "height", label: "Gornja visina", note: "VISINA" },
    { key: "lowerHeight", label: "Donja visina", note: "VISINALOW" },
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
      <div className="detail-title"><div><p className="eyebrow">Prostorija</p><h2>Dimenzije prostora</h2><span>Corpus SOBA · mjere u metrima</span></div><div className="badges"><span>Ukupno {formatNumber(corpusRoomTotalHeight(room.height, room.lowerHeight))} m</span></div></div>
      <div className="room-preview" aria-label="Pregled dimenzija prostorije"><div><span>{formatNumber(room.length)} m</span><strong>{formatNumber(corpusRoomTotalHeight(room.height, room.lowerHeight))} m</strong><i>{formatNumber(room.width)} m</i></div></div>
      <section className="data-section geometry-editor">
        <div className="section-title"><h3>Radna prostorija</h3><span>lokalno</span></div>
        <p>Promjena odmah prilagođava pod, zidove, mrežu i početnu kameru u 3D prikazu.</p>
        <div className="geometry-fields room-fields">
          {fields.map((field) => <label key={field.key}><span>{field.label}</span><div><input type="number" min="0" step="0.01" value={form[field.key]} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} /><small>m · {field.note}</small></div></label>)}
        </div>
        <div className="geometry-actions">
          <button className="primary-button" onClick={apply}>Primijeni prostoriju</button>
          {canUndo && <button className="secondary-button" onClick={onUndo}>Poništi zadnju izmjenu</button>}
          {projectDirty && <button className="secondary-button" onClick={onExport}>Sačuvaj izmjene (.json)</button>}
          {projectDirty && <button className="secondary-button" onClick={onExportS3d}>Izvezi novi S3D</button>}
          {projectDirty && <button className="secondary-button" onClick={onResetProject}>Vrati originalni projekat</button>}
          {message && <span>{message}</span>}
        </div>
      </section>
      <RoomDistributionEditor elements={elements} onDistribute={onDistribute} />
      <div className="evidence-warning"><strong>Corpus visina je zbir dva polja.</strong><span>3D koristi VISINA + VISINALOW, isto kao dokazani projekti iz D:\sobasav.</span></div>
    </div>
  );
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
    <div className="geometry-actions"><button className="primary-button" disabled={elements.length < 2} onClick={apply}>Rasporedi elemente</button>{message && <span>{message}</span>}</div>
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
  depth?: number;
};

function ElementTree({ elements, query, selected, onSelect, depth = 0 }: ElementTreeProps) {
  const normalized = query.trim().toLocaleLowerCase("sr");
  const visible = normalized
    ? elements.filter((element) => elementMatches(element, normalized))
    : elements;

  return (
    <ul className="element-tree">
      {visible.map((element, index) => (
        <li key={`${element.code}-${element.name}-${depth}-${index}`}>
          <button
            className={selected === element ? "tree-row selected" : "tree-row"}
            style={{ paddingLeft: `${18 + depth * 18}px` }}
            onClick={() => onSelect(element)}
          >
            <span className="tree-glyph">{element.children.length ? "◇" : "□"}</span>
            <span className="tree-label"><strong>{element.name || "Neimenovan element"}</strong><small>{element.code || element.className}</small></span>
            <span className="tree-count">{element.boards.length || ""}</span>
          </button>
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
  onSelect(element: CorpusS3dElement): void;
  onOpenData(): void;
};

function ElevationView({ fileName, elements, selected, onSelect, onOpenData }: ElevationViewProps) {
  const [projection, setProjection] = useState<CorpusDrawingProjection>("front");
  const shapes = elements.map((element) => corpusDrawingShape(element, projection)).filter((shape) => shape !== null);

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
        <div><div className="view-switch" aria-label="Projekcija nacrta">{(["front", "top", "side"] as const).map((view) => <button key={view} className={projection === view ? "active" : ""} onClick={() => setProjection(view)}>{view === "front" ? "Prednji" : view === "top" ? "Gornji" : "Bočni"}</button>)}<button onClick={() => downloadText(`${fileName.replace(/\.(?:s3d|e3d)$/i, "")}-${projection === "front" ? "PREDNJI" : projection === "top" ? "GORNJI" : "BOCNI"}-NACRT.svg`, corpusDrawingSvg(elements, projection, selected), "image/svg+xml;charset=utf-8")}>Izvezi SVG</button></div><div className="drawing-legend"><span><i className="legend-normal" /> Element</span><span><i className="legend-selected" /> Izabran</span></div></div>
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
            const centerH = (bounds.minH + bounds.maxH) / 2;
            const centerV = toScreenV((bounds.minV + bounds.maxV) / 2);
            const spans = corpusDrawingSpans({ bounds });
            const horizontalDimensionY = toScreenV(bounds.minV) + 62;
            const verticalDimensionX = bounds.maxH + 62;
            return (
              <g
                key={`${element.name}-${element.code}-${index}`}
                className={isSelected ? "drawing-element selected" : "drawing-element"}
                onClick={() => onSelect(element)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(element); }}
              >
                <polygon points={points.map(([h, v]) => `${h},${toScreenV(v)}`).join(" ")} />
                {bounds.maxH - bounds.minH >= 180 && bounds.maxV - bounds.minV >= 130 && (
                  <text x={centerH} y={centerV} textAnchor="middle" dominantBaseline="middle">
                    {shortLabel(element.name || element.code || "Element")}
                  </text>
                )}
                {isSelected && <g className="drawing-dimensions" aria-label={`Kote ${formatCoordinate(spans.horizontal)} × ${formatCoordinate(spans.vertical)}`}>
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
        </svg>
        <div className="scale-chip"><span /> 500 mm mreža</div>
      </div>

      <div className="drawing-selection">
        {selected ? <><strong>{selected.name || "Neimenovan element"}</strong><span>{selected.code || selected.className} · X {formatCoordinate(selected.position[0])} · Y {formatCoordinate(selected.position[1])} · Z {formatCoordinate(selected.position[2])}</span><button onClick={onOpenData}>Otvori podatke →</button></> : <span>Izaberi element na nacrtu.</span>}
      </div>
      <p className="drawing-note"><strong>Projekcije:</strong> izabrani element dobija kote raspona; gornji nacrt koristi puni rotirani X/Z otisak, a prednji i bočni nacrt njegov svjetski omotač i dokazanu Y visinu.</p>
    </div>
  );
}

function shortLabel(value: string): string {
  return value.length > 20 ? `${value.slice(0, 18)}…` : value;
}

function ElementDetails({ element, room, placementElements, selectedBoardIndex, onSelectBoard, onUpdate, onUpdateIdentity, onUpdateBoard, onUpdateBoardAppearance, onUpdateBoardHoles, onUpdateBoardContour, onUpdateBoardEdgeBanding, onAddBoard, onRenameBoard, onDuplicateBoard, onRemoveBoard, onUndo, onResetProject, onRemoveImported, onDuplicateImported, onExportSelectedE3d, canManageImported, canDuplicate, onExport, onExportS3d, projectDirty, canUndo }: {
  element: CorpusS3dElement;
  room: CorpusS3dRoom;
  placementElements: readonly CorpusS3dElement[];
  selectedBoardIndex: number | null;
  onSelectBoard(boardIndex: number | null): void;
  onUpdate(patch: ElementGeometryPatch): void;
  onUpdateIdentity(patch: ElementIdentityPatch): void;
  onUpdateBoard(boardIndex: number, patch: BoardGeometryPatch): void;
  onUpdateBoardAppearance(boardIndex: number, patch: BoardAppearancePatch): void;
  onUpdateBoardHoles(boardIndex: number, holes: readonly CorpusS3dHole[]): void;
  onUpdateBoardContour(boardIndex: number, points: readonly CorpusStraightContourPoint[]): void;
  onUpdateBoardEdgeBanding(boardIndex: number, spec: CorpusEdgeBandingSpec): void;
  onAddBoard(spec: CorpusNewBoardSpec): void;
  onRenameBoard(boardIndex: number, name: string): void;
  onDuplicateBoard(boardIndex: number): void;
  onRemoveBoard(boardIndex: number): void;
  onUndo(): void;
  onResetProject(): void;
  onRemoveImported(): void;
  onDuplicateImported(count?: number, offset?: CorpusCopyOffset): void;
  onExportSelectedE3d(): void;
  canManageImported: boolean;
  canDuplicate: boolean;
  onExport(): void;
  onExportS3d(): void;
  projectDirty: boolean;
  canUndo: boolean;
}) {
  const [boardCreatorOpen, setBoardCreatorOpen] = useState(false);
  const materials = useMemo(() => {
    const counts = new Map<string, number>();
    for (const board of element.boards) {
      const name = board.materialName || "Materijal nije naveden";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [element]);

  return (
    <div className="detail-content">
      <div className="detail-title">
        <div><p className="eyebrow">Izabrani element</p><h2>{element.name || "Neimenovan element"}</h2><span>{element.code || element.className}</span></div>
        <div className="badges"><span>{element.visible === false ? "Sakriven" : "Vidljiv"}</span>{element.locked && <span>Zaključan</span>}</div>
      </div>

      <div className="property-grid">
        <Property label="Širina" value={formatMillimeters(element.width)} />
        <Property label="Visina" value={formatMillimeters(element.height)} />
        <Property label="Dubina" value={formatMillimeters(element.depth)} />
        <Property label="Ugao" value={element.angle === null ? "—" : `${formatNumber(element.angle)}°`} />
        <Property label="Pozicija X" value={formatCoordinate(element.position[0])} />
        <Property label="Pozicija Y / Z" value={`${formatCoordinate(element.position[1])} / ${formatCoordinate(element.position[2])}`} />
      </div>

      <ElementGeometryEditor element={element} onUpdate={onUpdate} onUndo={onUndo} onResetProject={onResetProject} onRemoveImported={onRemoveImported} onDuplicateImported={onDuplicateImported} onExportSelectedE3d={onExportSelectedE3d} canManageImported={canManageImported} canDuplicate={canDuplicate} onExport={onExport} onExportS3d={onExportS3d} projectDirty={projectDirty} canUndo={canUndo} />
      <ElementPlacementEditor element={element} room={room} elements={placementElements} onUpdate={onUpdate} />
      {canDuplicate && <ElementArrayEditor element={element} onCreate={onDuplicateImported} />}
      <ElementIdentityEditor element={element} onUpdate={onUpdateIdentity} />

      <section className="data-section">
        <div className="section-title"><h3>Ploče</h3><span>{element.boards.length}</span>{canManageImported && <button className="secondary-button" onClick={() => setBoardCreatorOpen(true)}>Dodaj ploču</button>}</div>
        {element.boards.length ? (
          <div className="board-table-wrap"><table className="board-table">
            <thead><tr><th>Naziv</th><th>Dimenzije</th><th>Smjer</th><th>Kontura</th><th>Materijal</th><th>Rupe</th></tr></thead>
            <tbody>{element.boards.map((board, index) => (
              <tr key={`${board.name}-${index}`} className={selectedBoardIndex === index ? "selected" : ""} tabIndex={0} onClick={() => onSelectBoard(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelectBoard(index); }}>
                <td><strong>{board.name || `Ploča ${index + 1}`}</strong></td>
                <td>{formatMillimeters(board.width)} × {formatMillimeters(board.height)} × {formatMillimeters(board.thickness)}</td>
                <td>{formatBoardDirection(board.direction)}</td>
                <td>{board.curvePoints.length ? `${board.curvePoints.length} tač. ${board.curveIsApproximate ? "· luk" : "· ravno"}` : "—"}</td>
                <td>{board.materialName || "—"}</td>
                <td>{board.holeCount}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="empty-copy">Ovaj element nema direktno pridružene ploče.</p>}
        {selectedBoardIndex !== null && element.boards[selectedBoardIndex] && (
          <><BoardGeometryEditor board={element.boards[selectedBoardIndex]} boardIndex={selectedBoardIndex} onUpdate={onUpdateBoard} onUpdateAppearance={onUpdateBoardAppearance} onRename={onRenameBoard} onDuplicate={onDuplicateBoard} onRemove={onRemoveBoard} canChangeStructure={canManageImported} canRemove={canManageImported && element.boards.length > 1} />
          <BoardContourEditor board={element.boards[selectedBoardIndex]} boardIndex={selectedBoardIndex} onUpdate={onUpdateBoardContour} canChange={canManageImported} />
          <BoardEdgeBandingEditor board={element.boards[selectedBoardIndex]} boardIndex={selectedBoardIndex} onUpdate={onUpdateBoardEdgeBanding} canChange={canManageImported} />
          <BoardHoleEditor board={element.boards[selectedBoardIndex]} onUpdate={(holes) => onUpdateBoardHoles(selectedBoardIndex, holes)} />
          <BoardMachiningDetails board={element.boards[selectedBoardIndex]} /></>
        )}
      </section>

      <section className="data-section two-column-section">
        <div><div className="section-title"><h3>Materijali</h3><span>{materials.length}</span></div>
          {materials.length ? <ul className="material-list">{materials.map(([name, count]) => <li key={name}><span className="material-swatch" /><span>{name}</span><strong>{count}×</strong></li>)}</ul> : <p className="empty-copy">Nema materijala.</p>}
        </div>
        <div><div className="section-title"><h3>Varijable</h3><span>{Object.keys(element.variables).length}</span></div>
          {Object.keys(element.variables).length ? <dl className="variable-list">{Object.entries(element.variables).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl> : <p className="empty-copy">Nema varijabli.</p>}
        </div>
      </section>

      {element.macroLinks.length > 0 && <MacroLinkDetails links={element.macroLinks} element={element} onApplyHoles={onUpdateBoardHoles} />}

      {boardCreatorOpen && <BoardCreatorDialog element={element} onClose={() => setBoardCreatorOpen(false)} onCreate={(spec) => { onAddBoard(spec); setBoardCreatorOpen(false); }} />}

      {(element.unknownChildTags.length > 0 || element.boards.some((board) => board.unknownChildTags.length > 0)) && (
        <div className="evidence-warning"><strong>Nepoznata struktura je sačuvana kao upozorenje.</strong><span>Ne tumačimo podatke koje još nismo dokazali.</span></div>
      )}
    </div>
  );
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
          <label><span>Naziv</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
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
        {message && <p className="error-message">{message}</p>}
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
              <div>{["PMINX", "PMINY", "PMAXX", "PMAXY", "DELTAX", "DELTAY", "DELTAZ", "DELLTAX", "DELLTAY", "DELLTAZ"].map((key) => <label key={key}>{key}<input inputMode="decimal" value={runtimeInputs[key] ?? ""} onChange={(event) => setRuntimeInputs((current) => ({ ...current, [key]: event.target.value }))} placeholder="—" /></label>)}</div>
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
          <button className="secondary-button" type="button" disabled={selectedIndex === null} onClick={applyMirror}>{keepMirrorSource ? "Dodaj ogledanu kopiju" : "Ogledaj izabranu"}</button>
          <button className="secondary-button" type="button" disabled={selectedIndex === null || (selectedHole?.plane !== 0 && selectedHole?.plane !== 1)} onClick={applyOppositeFace}>{keepMirrorSource ? "Kopiraj na suprotnu plohu" : "Premjesti na suprotnu plohu"}</button>
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

function ElementGeometryEditor({ element, onUpdate, onUndo, onResetProject, onRemoveImported, onDuplicateImported, onExportSelectedE3d, canManageImported, canDuplicate, onExport, onExportS3d, projectDirty, canUndo }: {
  element: CorpusS3dElement;
  onUpdate(patch: ElementGeometryPatch): void;
  onUndo(): void;
  onResetProject(): void;
  onRemoveImported(): void;
  onDuplicateImported(count?: number, offset?: CorpusCopyOffset): void;
  onExportSelectedE3d(): void;
  canManageImported: boolean;
  canDuplicate: boolean;
  onExport(): void;
  onExportS3d(): void;
  projectDirty: boolean;
  canUndo: boolean;
}) {
  const [form, setForm] = useState<GeometryForm>(() => geometryFormFor(element));
  const [message, setMessage] = useState("");
  useEffect(() => { setForm(geometryFormFor(element)); setMessage(""); }, [element]);

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

  return (
    <section className="data-section geometry-editor">
      <div className="section-title"><h3>Radna geometrija</h3><span>lokalno</span></div>
      <p>Promijeni položaj ili omotač elementa. Izvorni S3D fajl ostaje netaknut.</p>
      <div className="geometry-fields">
        {fields.map((field) => (
          <label key={field.key}><span>{field.label}</span><div><input type="number" step="any" value={form[field.key]} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} /><small>{field.suffix}</small></div></label>
        ))}
      </div>
      <div className="geometry-actions">
        <button className="primary-button" onClick={apply}>Primijeni u radnoj kopiji</button>
        {canUndo && <button className="secondary-button" onClick={onUndo}>Poništi zadnju izmjenu</button>}
        {projectDirty && <button className="secondary-button" onClick={onExport}>Sačuvaj izmjene (.json)</button>}
        {projectDirty && <button className="secondary-button" onClick={onExportS3d}>Izvezi novi S3D</button>}
        {canDuplicate && <button className="secondary-button" onClick={() => onDuplicateImported()}>Udvostruči element</button>}
        {canManageImported && <button className="secondary-button" onClick={onExportSelectedE3d}>Izvezi izabrani E3D</button>}
        {canManageImported && <button className="secondary-button" onClick={onRemoveImported}>Ukloni dodani E3D</button>}
        {projectDirty && <button className="secondary-button" onClick={onResetProject}>Vrati originalni projekat</button>}
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

function BoardGeometryEditor({ board, boardIndex, onUpdate, onUpdateAppearance, onRename, onDuplicate, onRemove, canChangeStructure, canRemove }: {
  board: CorpusS3dBoard;
  boardIndex: number;
  onUpdate(boardIndex: number, patch: BoardGeometryPatch): void;
  onUpdateAppearance(boardIndex: number, patch: BoardAppearancePatch): void;
  onRename(boardIndex: number, name: string): void;
  onDuplicate(boardIndex: number): void;
  onRemove(boardIndex: number): void;
  canChangeStructure: boolean;
  canRemove: boolean;
}) {
  const [form, setForm] = useState<BoardGeometryForm>(() => boardGeometryFormFor(board));
  const [name, setName] = useState(board.name);
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

  return (
    <div className="board-editor geometry-editor">
      <div className="section-title"><h3>{board.name || `Ploča ${boardIndex + 1}`}</h3><span>ploča</span></div>
      <p>Mijenjaju se samo dokazani S3D atributi ploče; kontura, rupe i obrade ostaju sačuvane.</p>
      {canChangeStructure && <div className="appearance-fields"><label><span>Naziv ploče</span><input value={name} onChange={(event) => setName(event.target.value)} /></label><div className="geometry-actions"><button className="secondary-button" onClick={applyName}>Primijeni naziv</button></div></div>}
      <div className="geometry-fields">
        {fields.map((field) => <label key={field.key}><span>{field.label}</span><div><input type="number" step="any" value={form[field.key]} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} /><small>{field.suffix}</small></div></label>)}
        <label><span>Orijentacija</span><div><select aria-label="Orijentacija ploče" value={form.direction} onChange={(event) => setForm((current) => ({ ...current, direction: event.target.value }))}><option value="0">0 · bočna</option><option value="1">1 · uspravna</option><option value="2">2 · horizontalna</option></select></div></label>
      </div>
      <div className="geometry-actions"><button className="primary-button" onClick={apply}>Primijeni ploču</button>{canChangeStructure && <button className="secondary-button" onClick={() => onDuplicate(boardIndex)}>Udvostruči ploču</button>}{canRemove && <button className="danger-button" onClick={() => onRemove(boardIndex)}>Ukloni ploču</button>}{message && <span>{message}</span>}</div>
      <BoardAppearanceEditor board={board} boardIndex={boardIndex} onUpdate={onUpdateAppearance} />
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

function colorToHex(color: number | null): string {
  return `#${(color ?? 0xd8d1c1).toString(16).padStart(6, "0").slice(-6)}`;
}

function Property({ label, value }: { label: string; value: string }) {
  return <div className="property"><span>{label}</span><strong>{value}</strong></div>;
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

function downloadText(fileName: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
