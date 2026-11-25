import { useEffect, useMemo, useRef, useState } from "react";
import { describeTemplate } from "../lib/fastreport/fr3-info.ts";
import { reportPagesToHtml } from "../lib/fastreport/fr3-html.ts";
import { layoutReport } from "../lib/fastreport/fr3-layout.ts";
import { parseFr3, type Fr3Node } from "../lib/fastreport/fr3-parse.ts";
import { serializeFr3 } from "../lib/fastreport/fr3-edit.ts";
import { ReportDesigner } from "./report-designer.tsx";
import type { ReportDatasets } from "../lib/fastreport/project-datasets.ts";

type Props = {
  /** Putanje šablona u biblioteci, npr. "Template/fr3/ex/HR-01_Popis fronti.fr3". */
  templates: readonly string[];
  loadTemplate(path: string): Promise<string>;
  datasets: ReportDatasets;
  projectName: string;
  /** Poziva se nakon uspješnog upisa šablona u biblioteku. */
  onTemplateSaved(path: string): void;
};

const CATEGORY_NAMES: Record<string, string> = {
  ex: "Izvještaji", "ex/Edgeband": "Rubne trake", "ex/Fittings": "Okovi", "ex/Forms": "Obrasci", "ex/Fronts": "Fronte",
  opti: "Optimizacija", pon: "Ponude", prj: "Projekt", elm: "Element",
};

export type TemplateEntry = { path: string; language: string; category: string; title: string };

export function templateEntries(paths: readonly string[]): TemplateEntry[] {
  return paths.map((path) => {
    const relative = path.replace(/^Template\/fr3\//i, "");
    const parts = relative.split("/");
    const file = parts.pop()!;
    const stem = file.replace(/\.fr3$/i, "");
    const language = /^HR[-_]/i.test(stem) ? "Hrvatski" : /^EN[-_]/i.test(stem) ? "English" : "Ostalo";
    return { path, language, category: CATEGORY_NAMES[parts.join("/")] ?? parts.join("/") ?? "", title: stem.replace(/_/g, " ") };
  });
}

/** Prozor „Ispiši": stablo šablona, pregled i štampa izvještaja iz podataka projekta. */
export function ReportWindow({ templates, loadTemplate, datasets, projectName, onTemplateSaved }: Props) {
  const entries = useMemo(() => templateEntries(templates), [templates]);
  const tree = useMemo(() => {
    const languages = new Map<string, Map<string, TemplateEntry[]>>();
    for (const entry of entries) {
      const categories = languages.get(entry.language) ?? new Map<string, TemplateEntry[]>();
      categories.set(entry.category, [...(categories.get(entry.category) ?? []), entry]);
      languages.set(entry.language, categories);
    }
    return [...languages.entries()].sort(([left], [right]) => left.localeCompare(right, "hr"));
  }, [entries]);
  const [selected, setSelected] = useState<string | null>(null);
  const [report, setReport] = useState<Fr3Node | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(0.6);
  const frame = useRef<HTMLIFrameElement>(null);
  const [design, setDesign] = useState(false);
  const [history, setHistory] = useState<readonly Fr3Node[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const isUserTemplate = selected?.startsWith("Template/fr3/user/") ?? false;

  useEffect(() => {
    setHistory([]); setSaveMessage(null); setDesign(false);
    if (!selected) { setReport(null); return; }
    let active = true;
    setLoading(true); setError(null);
    loadTemplate(selected).then((xml) => { if (active) setReport(parseFr3(xml)); }, (reason) => { if (active) { setReport(null); setError(reason instanceof Error ? reason.message : "Šablon nije moguće učitati."); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected, loadTemplate]);

  const info = useMemo(() => report ? describeTemplate(report) : null, [report]);
  const rendered = useMemo(() => {
    if (!report) return null;
    try { return { pages: layoutReport(report, datasets), error: null }; } catch (reason) { return { pages: [], error: reason instanceof Error ? reason.message : "Izvještaj nije moguće složiti." }; }
  }, [report, datasets]);
  const html = useMemo(() => rendered && rendered.pages.length > 0 ? reportPagesToHtml(rendered.pages, `${projectName} — ${selected ?? ""}`) : null, [rendered, projectName, selected]);
  const previewHtml = useMemo(() => html ? html.replace("</style>", `body{zoom:${zoom}}</style>`) : null, [html, zoom]);

  const selectedTitle = entries.find((entry) => entry.path === selected)?.title ?? "";
  useEffect(() => { setSaveName(isUserTemplate ? selectedTitle : selectedTitle ? `${selectedTitle} (moj)` : ""); }, [selectedTitle, isUserTemplate]);

  function change(next: Fr3Node) {
    if (report) setHistory((current) => [...current.slice(-49), report]);
    setReport(next);
    setSaveMessage(null);
  }
  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((current) => current.slice(0, -1));
    setReport(previous);
  }
  function download() {
    if (!report) return;
    const blob = new Blob([serializeFr3(report)], { type: "application/xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${saveName.trim() || "sablon"}.fr3`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  async function save(overwrite: boolean) {
    if (!report) return;
    const clean = saveName.replace(/[\\/<>:"|?*\u0000-\u001f]/g, "-").trim().replace(/[. ]+$/, "");
    if (!clean) { setSaveMessage("Upiši naziv šablona."); return; }
    const path = overwrite && selected ? selected : `Template/fr3/user/${clean}.fr3`;
    setSaveMessage("Spremam…");
    try {
      const response = await fetch("/__ivertim/library/save-template", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, xml: serializeFr3(report), overwrite }) });
      const result = await response.json().catch(() => ({})) as { path?: string; error?: string };
      if (!response.ok || !result.path) throw new Error(result.error ?? "Upis nije uspio. Program mora biti pokrenut lokalno.");
      onTemplateSaved(result.path);
      setSelected(result.path);
      setSaveMessage(`Šablon je spremljen: ${result.path}`);
    } catch (reason) {
      setSaveMessage(reason instanceof Error ? reason.message : "Upis nije uspio.");
    }
  }

  function print() {
    if (!html) return;
    const printFrame = document.createElement("iframe");
    printFrame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    printFrame.srcdoc = html;
    printFrame.onload = () => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      window.setTimeout(() => printFrame.remove(), 60_000);
    };
    document.body.appendChild(printFrame);
  }

  return <div className="report-window">
    <nav className="report-tree" aria-label="Šabloni izvještaja">
      {tree.length === 0 && <p className="report-note">Šabloni nisu pronađeni u lokalnoj biblioteci. Ponovi uvoz biblioteke.</p>}
      {tree.map(([language, categories]) => <details key={language} open={language === "Hrvatski"}>
        <summary>{language}</summary>
        {[...categories.entries()].sort(([left], [right]) => left.localeCompare(right, "hr")).map(([category, items]) => <details key={category} open>
          <summary>{category || "Ostalo"}</summary>
          <ul>{items.map((item) => <li key={item.path}><button className={selected === item.path ? "selected" : ""} onClick={() => setSelected(item.path)}>{item.title}</button></li>)}</ul>
        </details>)}
      </details>)}
    </nav>
    <section className="report-preview">
      {!selected && <p className="report-note">Izaberi šablon da vidiš pregled s podacima ovog projekta.</p>}
      {loading && <p className="report-note">Učitavam šablon…</p>}
      {error && <p className="report-error" role="alert">{error}</p>}
      {info && <div className="report-meta">
        <strong>{info.name || "Šablon"}</strong>{info.description && <span> — {info.description}</span>}
        {info.missing.length > 0 && <p className="report-warning">Šablon koristi podatke koje program još ne računa ({info.missing.join(", ")}); ti dijelovi će biti prazni.</p>}
      </div>}
      {rendered?.error && <p className="report-error" role="alert">{rendered.error}</p>}
      {report && <div className="report-actions">
        {!design && previewHtml && <button className="primary-button" onClick={print}>Štampaj</button>}
        <button onClick={() => setDesign((value) => !value)}>{design ? "Pregled" : "Uredi izgled"}</button>
        {design && <button onClick={undo} disabled={history.length === 0}>Poništi</button>}
        {!design && previewHtml && <label>Veličina <input type="range" min="0.3" max="1.2" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>}
        {!design && rendered && <span>{rendered.pages.length} str.</span>}
      </div>}
      {report && design && <>
        <div className="report-actions report-save">
          <label>Naziv <input value={saveName} onChange={(event) => setSaveName(event.target.value)} /></label>
          {isUserTemplate && <button onClick={() => void save(true)}>Spremi</button>}
          <button className="primary-button" onClick={() => void save(false)}>Spremi kao novi šablon</button>
          <button onClick={download}>Preuzmi .fr3</button>
          {saveMessage && <span className="report-note">{saveMessage}</span>}
        </div>
        <ReportDesigner report={report} onChange={change} />
      </>}
      {!design && previewHtml && <iframe ref={frame} title="Pregled izvještaja" srcDoc={previewHtml} sandbox="allow-same-origin allow-modals" />}
    </section>
  </div>;
}
