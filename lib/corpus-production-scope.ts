import type { CorpusS3dElement } from "./corpus-s3d.ts";

/** Keep inherited exclusion when a nested element is inspected in isolation. */
export function corpusElementProductionScope(root: CorpusS3dElement, path: readonly number[] = [0]): {
  element: CorpusS3dElement; hiddenByAncestor: boolean;
} {
  if (path[0] !== 0) throw new Error("Proizvodni kontekst mora početi korijenskim elementom.");
  let element = root;
  let hiddenByAncestor = false;
  for (const index of path.slice(1)) {
    if (!Number.isInteger(index) || index < 0 || !element.children[index]) throw new Error("Pod-element ne postoji u proizvodnom kontekstu.");
    hiddenByAncestor ||= element.visible === false;
    element = element.children[index]!;
  }
  return { element: hiddenByAncestor ? { ...element, visible: false } : element, hiddenByAncestor };
}
