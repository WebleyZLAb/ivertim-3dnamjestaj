import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const SAVE_ELEMENT_URL = "/__ivertim/library/save-element";
export const SAVE_TEMPLATE_URL = "/__ivertim/library/save-template";
const MAX_BODY_BYTES = 25 * 1024 * 1024;
const LIBRARY_ROOT = "Elmsav";

export class LibrarySaveError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Normalizuje relativnu putanju elementa i odbija sve što izlazi iz foldera Elmsav. */
export function normalizeTemplatePath(value) {
  if (typeof value !== "string") throw new LibrarySaveError(400, "Putanja šablona nije tekst.");
  const parts = value.replaceAll("\\", "/").split("/").filter((part) => part !== "");
  if (parts.length < 3 || parts[0] !== "Template" || parts[1] !== "fr3") throw new LibrarySaveError(400, "Šablon se sprema samo u Template/fr3.");
  for (const part of parts) {
    if (part === "." || part === ".." || /[<>:"|?*\u0000-\u001f]/.test(part) || /[. ]$/.test(part)) throw new LibrarySaveError(400, `Nedozvoljen dio putanje: ${part}`);
  }
  if (!/\.fr3$/i.test(parts.at(-1))) throw new LibrarySaveError(400, "Ime šablona mora završavati na .fr3.");
  return parts.join("/");
}

export function normalizeElementPath(value) {
  if (typeof value !== "string") throw new LibrarySaveError(400, "Putanja elementa nije tekst.");
  const parts = value.replaceAll("\\", "/").split("/").filter((part) => part !== "");
  if (parts.length < 2 || parts[0] !== LIBRARY_ROOT) throw new LibrarySaveError(400, `Element se sprema samo u folder ${LIBRARY_ROOT}.`);
  for (const part of parts) {
    if (part === "." || part === ".." || /[<>:"|?*\u0000-\u001f]/.test(part) || /[. ]$/.test(part)) throw new LibrarySaveError(400, `Nedozvoljen dio putanje: ${part}`);
  }
  if (!/\.e3d$/i.test(parts.at(-1))) throw new LibrarySaveError(400, "Ime elementa mora završavati na .E3D.");
  return parts.join("/");
}

async function exists(target) {
  try { return (await stat(target)).isFile(); } catch { return false; }
}

async function updateManifest(libraryDir, relative, listKey = "elements") {
  const manifestPath = path.join(libraryDir, "manifest.json");
  if (!(await exists(manifestPath))) return;
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  let changed = false;
  if (!Array.isArray(manifest[listKey]) && listKey !== "elements") manifest[listKey] = [];
  if (Array.isArray(manifest[listKey]) && !manifest[listKey].includes(relative)) {
    manifest[listKey].push(relative);
    manifest[listKey].sort((a, b) => a.localeCompare(b, "sr"));
    changed = true;
  }
  if (Array.isArray(manifest.files) && !manifest.files.includes(relative)) {
    manifest.files.push(relative);
    changed = true;
  }
  if (!changed) return;
  const temp = `${manifestPath}.tmp`;
  await writeFile(temp, JSON.stringify(manifest), "utf8");
  await rename(temp, manifestPath);
}

/**
 * Upisuje E3D u lokalnu biblioteku. Izvor je public/local-corpus; ako postoji i dist/local-corpus
 * (izgrađena kopija koju poslužuje pokretač), upisuje se i tamo da element odmah bude vidljiv.
 */
export async function saveLibraryElement({ root, relativePath, xml, overwrite }) {
  const relative = normalizeElementPath(relativePath);
  if (typeof xml !== "string" || !/^\s*(?:<\?xml[^>]*\?>\s*)?</.test(xml)) throw new LibrarySaveError(400, "Sadržaj nije XML.");
  const targets = [path.join(root, "public", "local-corpus"), path.join(root, "dist", "local-corpus")];
  const libraries = [];
  for (const dir of targets) if (await stat(dir).then((info) => info.isDirectory(), () => false)) libraries.push(dir);
  if (libraries.length === 0) throw new LibrarySaveError(404, "Lokalna biblioteka nije pronađena.");
  const primary = libraries[0];
  const taken = await exists(path.join(primary, relative));
  if (taken && !overwrite) throw new LibrarySaveError(409, "Element s tim imenom već postoji u tom folderu.");
  for (const dir of libraries) {
    const target = path.resolve(dir, relative);
    if (!target.startsWith(`${path.resolve(dir, LIBRARY_ROOT)}${path.sep}`)) throw new LibrarySaveError(403, "Putanja izlazi iz biblioteke.");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, xml, "utf8");
    await updateManifest(dir, relative);
  }
  return { path: relative, replaced: taken };
}

/** Upisuje FastReport šablon (.fr3) u lokalnu biblioteku, isto kao saveLibraryElement. */
export async function saveLibraryTemplate({ root, relativePath, xml, overwrite }) {
  const relative = normalizeTemplatePath(relativePath);
  if (typeof xml !== "string" || !/<TfrxReport[\s>]/.test(xml)) throw new LibrarySaveError(400, "Sadržaj nije FastReport šablon.");
  const libraries = [];
  for (const dir of [path.join(root, "public", "local-corpus"), path.join(root, "dist", "local-corpus")]) if (await stat(dir).then((info) => info.isDirectory(), () => false)) libraries.push(dir);
  if (libraries.length === 0) throw new LibrarySaveError(404, "Lokalna biblioteka nije pronađena.");
  const taken = await exists(path.join(libraries[0], relative));
  if (taken && !overwrite) throw new LibrarySaveError(409, "Šablon s tim imenom već postoji.");
  for (const dir of libraries) {
    const target = path.resolve(dir, relative);
    if (!target.startsWith(`${path.resolve(dir, "Template", "fr3")}${path.sep}`)) throw new LibrarySaveError(403, "Putanja izlazi iz biblioteke.");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, xml, "utf8");
    await updateManifest(dir, relative, "templates");
  }
  return { path: relative, replaced: taken };
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === host && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
  } catch { return false; }
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new LibrarySaveError(413, "Element je prevelik.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Zajednički rukovalac za pokretač (serve-corpus.mjs) i Vite razvojni server. Vraća true ako je zahtjev obrađen. */
export async function handleSaveElementRequest(request, response, root) {
  const url = new URL(request.url || "/", "http://local");
  if (url.pathname !== SAVE_ELEMENT_URL && url.pathname !== SAVE_TEMPLATE_URL) return false;
  const template = url.pathname === SAVE_TEMPLATE_URL;
  const reply = (status, value) => {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    response.end(JSON.stringify(value));
  };
  try {
    if (request.method !== "POST") throw new LibrarySaveError(405, "Dozvoljen je samo POST.");
    if (!sameOrigin(request)) throw new LibrarySaveError(403, "Zahtjev nije iz programa.");
    if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) throw new LibrarySaveError(415, "Očekivan je JSON.");
    let body;
    try { body = JSON.parse(await readBody(request)); } catch (error) {
      if (error instanceof LibrarySaveError) throw error;
      throw new LibrarySaveError(400, "Neispravan JSON.");
    }
    const save = template ? saveLibraryTemplate : saveLibraryElement;
    reply(200, await save({ root, relativePath: body?.path, xml: body?.xml, overwrite: body?.overwrite === true }));
  } catch (error) {
    if (error instanceof LibrarySaveError) reply(error.status, { error: error.message });
    else reply(500, { error: "Upis u biblioteku nije uspio." });
  }
  return true;
}
