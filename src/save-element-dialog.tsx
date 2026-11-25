import { useMemo, useState } from "react";
import { elementFileName, libraryFolders } from "../lib/library-folders.ts";

export type SaveElementRequest = { path: string; overwrite: boolean };

type Props = {
  /** Putanja elementa u biblioteci (npr. "Elmsav/Kuhinja/Gornji.E3D") ili null kad element nije iz biblioteke. */
  existingPath: string | null;
  defaultName: string;
  /** Svi E3D elementi biblioteke; iz njih se izvode folderi. */
  libraryElements: readonly string[];
  busy: boolean;
  message: string | null;
  onSave(request: SaveElementRequest): void;
  onDownload(): void;
  onCancel(): void;
};

const ROOT = "Elmsav";

export function SaveElementDialog({ existingPath, defaultName, libraryElements, busy, message, onSave, onDownload, onCancel }: Props) {
  const [mode, setMode] = useState<"choose" | "new">(existingPath ? "choose" : "new");
  const existingName = existingPath?.split("/").at(-1)?.replace(/\.e3d$/i, "") ?? defaultName;
  const [name, setName] = useState(existingName);
  const existingFolder = existingPath ? existingPath.split("/").slice(0, -1).join("/") : ROOT;
  const folders = useMemo(() => libraryFolders(libraryElements), [libraryElements]);
  const [folder, setFolder] = useState(folders.includes(existingFolder) ? existingFolder : ROOT);
  const [newSubfolder, setNewSubfolder] = useState("");
  const fileName = elementFileName(name);
  const subfolder = newSubfolder.split(/[\\/]/).map((part) => part.trim()).filter(Boolean).join("/");
  const targetPath = `${folder}${subfolder ? `/${subfolder}` : ""}/${fileName}`;
  const taken = fileName !== "" && libraryElements.some((element) => element.toLocaleLowerCase() === targetPath.toLocaleLowerCase());

  if (mode === "choose" && existingPath) {
    return <div className="save-element">
      <p>Element je učitan iz biblioteke:</p>
      <p className="save-element-path">{existingPath}</p>
      <p>Želite li zamijeniti postojeći element ili snimiti novi?</p>
      <div className="save-element-actions">
        <button className="primary-button" disabled={busy} onClick={() => onSave({ path: existingPath, overwrite: true })}>Zamijeni postojeći</button>
        <button disabled={busy} onClick={() => setMode("new")}>Snimi novi element</button>
        <button disabled={busy} onClick={onCancel}>Odustani</button>
      </div>
      {message && <p className="save-element-error">{message}</p>}
    </div>;
  }

  return <div className="save-element">
    <label>Naziv elementa<input value={name} autoFocus onChange={(event) => setName(event.target.value)} /></label>
    <label>Folder u biblioteci
      <select value={folder} onChange={(event) => setFolder(event.target.value)}>
        {folders.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
    <label>Novi podfolder (nije obavezno)<input value={newSubfolder} placeholder="npr. Moji elementi" onChange={(event) => setNewSubfolder(event.target.value)} /></label>
    <p className="save-element-path">{fileName ? targetPath : "Upiši naziv elementa."}</p>
    {taken && <p className="save-element-error">Element s tim imenom već postoji u tom folderu. Promijeni ime ili folder.</p>}
    {message && <p className="save-element-error">{message}</p>}
    <div className="save-element-actions">
      <button className="primary-button" disabled={busy || !fileName || taken} onClick={() => onSave({ path: targetPath, overwrite: false })}>Spremi u biblioteku</button>
      {existingPath && <button disabled={busy} onClick={() => setMode("choose")}>Nazad</button>}
      <button disabled={busy} onClick={onDownload}>Preuzmi kao fajl</button>
      <button disabled={busy} onClick={onCancel}>Odustani</button>
    </div>
  </div>;
}
