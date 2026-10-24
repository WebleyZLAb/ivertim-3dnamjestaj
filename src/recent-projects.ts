export type RecentProject = { id: string; fileName: string; fileSize: number; sourceXml: string; openedAt: string };
const DB = "ivertim-corpus-recent";
const STORE = "projects";
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Lista nedavnih projekata je zauzeta."));
  });
}
export async function loadRecentProjects(): Promise<RecentProject[]> {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as RecentProject[]).sort((a, b) => b.openedAt.localeCompare(a.openedAt)).slice(0, 10));
    request.onerror = () => reject(request.error);
  }); } finally { db.close(); }
}
export async function rememberProject(project: Omit<RecentProject, "id" | "openedAt">): Promise<RecentProject[]> {
  const db = await database();
  const entry: RecentProject = { ...project, id: project.fileName, openedAt: new Date().toISOString() };
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite"); const store = transaction.objectStore(STORE);
    store.put(entry);
    const request = store.getAll();
    request.onsuccess = () => {
      const projects = (request.result as RecentProject[]).sort((a, b) => b.openedAt.localeCompare(a.openedAt));
      for (const stale of projects.slice(10)) store.delete(stale.id);
    };
    transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error);
  }); } finally { db.close(); }
  return loadRecentProjects();
}
