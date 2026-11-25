const ROOT = "Elmsav";

export function libraryFolders(elements: readonly string[]): string[] {
  const folders = new Set<string>([ROOT]);
  for (const element of elements) {
    const parts = element.split("/");
    for (let end = 1; end < parts.length; end++) folders.add(parts.slice(0, end).join("/"));
  }
  return [...folders].filter((folder) => folder === ROOT || folder.startsWith(`${ROOT}/`)).sort((a, b) => a.localeCompare(b, "sr"));
}

/** Čisti ime fajla: bez putanje, nedozvoljenih znakova i s ekstenzijom .E3D. */
export function elementFileName(name: string): string {
  const cleaned = name.replace(/\.e3d$/i, "").replace(/[\\/<>:"|?*\u0000-\u001f]/g, "-").trim().replace(/[. ]+$/, "");
  return cleaned ? `${cleaned}.E3D` : "";
}
