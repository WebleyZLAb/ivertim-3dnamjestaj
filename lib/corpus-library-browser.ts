export type LibraryKind = "elements" | "hardware";
const hardwareFolders = new Set(["_okov", "_ruckice", "_ladice", "handles", "hranipex_handles", "blum_drawers", "hettich_drawers", "grass", "legs", "profili", "vertical_profile", "wall_installations"]);
export function libraryDisplayPath(path: string): string { return path.replaceAll("\\", "/").replace(/^Elmsav\//i, ""); }
export function libraryItemKind(path: string): LibraryKind {
  return hardwareFolders.has(libraryDisplayPath(path).split("/")[0]!.toLowerCase()) ? "hardware" : "elements";
}
export function libraryFolders(paths: readonly string[]): string[] {
  const folders = new Set<string>();
  for (const path of paths) {
    const parts = libraryDisplayPath(path).split("/").slice(0, -1);
    for (let i = 1; i <= parts.length; i++) folders.add(parts.slice(0, i).join("/"));
  }
  return [...folders].sort((a,b) => a.localeCompare(b,"sr"));
}
export function libraryChildren(folders: readonly string[], parent: string): string[] {
  return folders.filter(path => path.slice(0,path.lastIndexOf("/") < 0 ? 0 : path.lastIndexOf("/")) === parent);
}
export function libraryMatches(path: string, folder: string, query: string): boolean {
  const display = libraryDisplayPath(path), term = query.trim().toLocaleLowerCase("sr");
  const parent = display.includes("/") ? display.slice(0, display.lastIndexOf("/")) : "";
  return term ? (!folder || display.startsWith(folder + "/")) && display.toLocaleLowerCase("sr").includes(term) : parent === folder;
}
export function libraryPicture(path: string, files: ReadonlyMap<string,string>): string | undefined {
  const stem = path.replace(/\.e3d$/i, "").toLowerCase();
  for (const extension of ["64.jpg", "64.png", ".jpg", ".jpeg", ".png", ".bmp"]) {
    const match = files.get(stem + extension); if (match) return match;
  }
}

/** Gola selection uses actual library files, including horizontal C/L and vertical profiles. */
export function isGolaLibraryPath(path: string): boolean {
  const parts = libraryDisplayPath(path).split("/");
  return parts.slice(0,-1).some(part => part.toLowerCase() === "gola") || /gola/i.test(parts.at(-1) ?? "");
}
