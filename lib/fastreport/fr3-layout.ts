import { hexBytes, type Fr3Node } from "./fr3-parse.ts";
import { evaluateNode, evaluateText, parseExpression, type ExprContext, type Row } from "./fr3-expr.ts";

/**
 * Motor rasporeda FastReport šablona: trake (title, header, master/detail, group, footer, summary),
 * paginacija i izračun izraza. Daje stranice sa apsolutno pozicioniranim objektima (px, 96 dpi).
 * Ne izvršava Pascal skripte, podizvještaje, ni barkodove; rastezanje memo polja nije podržano.
 */

export type RenderedStyle = {
  fontName: string; fontSize: number; bold: boolean; italic: boolean; underline: boolean; color: string;
  hAlign: "left" | "center" | "right" | "justify"; vAlign: "top" | "center" | "bottom"; wordWrap: boolean;
  fill: string | null; frame: { left: boolean; right: boolean; top: boolean; bottom: boolean; width: number; color: string };
};

export type RenderedObject =
  | { kind: "memo"; left: number; top: number; width: number; height: number; text: string; style: RenderedStyle; source: string }
  | { kind: "line"; left: number; top: number; width: number; height: number; color: string; lineWidth: number }
  | { kind: "shape"; left: number; top: number; width: number; height: number; shape: string; style: RenderedStyle }
  | { kind: "gradient"; left: number; top: number; width: number; height: number; from: string; to: string; vertical: boolean }
  | { kind: "picture"; left: number; top: number; width: number; height: number; mime: string; base64: string; clipHeight?: number };

export type RenderedPage = { width: number; height: number; objects: RenderedObject[] };

export type Datasets = Readonly<Record<string, readonly Row[]>>;

const MM = 96 / 25.4;
const num = (value: string | undefined, fallback = 0) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; };
const bool = (value: string | undefined, fallback: boolean) => value === undefined ? fallback : value.toLowerCase() === "true";

const SYSTEM_COLORS: Record<number, string> = { 5: "#ffffff", 8: "#000000", 15: "#f0f0f0", 16: "#808080", 17: "#808080", 18: "#000000", 21: "#ffffff" };

/** Delphi TColor (BGR) ili sistemska boja (negativna) u CSS. clNone/clDefault daju null. */
export function delphiColor(value: string | undefined, fallback: string | null = null): string | null {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed === 536870911 || parsed === 536870912) return null;
  if (parsed < 0) return SYSTEM_COLORS[parsed & 0xff] ?? "#000000";
  const r = parsed & 255, g = (parsed >> 8) & 255, b = (parsed >> 16) & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

export function styleOf(attrs: Record<string, string>, shape = false): RenderedStyle {
  const frameType = num(attrs["Frame.Typ"], 0);
  const fillColor = attrs["FillType"] === "ftNone" ? null : delphiColor(attrs["Fill.BackColor"]);
  const fontStyle = num(attrs["Font.Style"], 0);
  const hAlign = attrs["HAlign"] === "haCenter" ? "center" : attrs["HAlign"] === "haRight" ? "right" : attrs["HAlign"] === "haBlock" ? "justify" : "left";
  const vAlign = attrs["VAlign"] === "vaCenter" ? "center" : attrs["VAlign"] === "vaBottom" ? "bottom" : "top";
  const frameAll = shape && frameType === 0;
  return {
    fontName: attrs["Font.Name"] || "Arial",
    fontSize: attrs["Font.Height"] ? Math.abs(num(attrs["Font.Height"], -13)) : 13,
    bold: (fontStyle & 1) !== 0, italic: (fontStyle & 2) !== 0, underline: (fontStyle & 4) !== 0,
    color: delphiColor(attrs["Font.Color"], "#000000") ?? "#000000",
    hAlign, vAlign, wordWrap: bool(attrs["WordWrap"], true),
    fill: fillColor,
    frame: {
      left: frameAll || (frameType & 1) !== 0, right: frameAll || (frameType & 2) !== 0, top: frameAll || (frameType & 4) !== 0, bottom: frameAll || (frameType & 8) !== 0,
      width: Math.max(1, num(attrs["Frame.Width"], 1)), color: delphiColor(attrs["Frame.Color"], "#000000") ?? "#000000",
    },
  };
}

export function imageFromPropData(hex: string): { mime: string; base64: string } | null {
  const bytes = hexBytes(hex);
  const find = (signature: number[]) => { for (let at = 0; at + signature.length <= bytes.length; at++) if (signature.every((value, index) => bytes[at + index] === value)) return at; return -1; };
  const png = find([0x89, 0x50, 0x4e, 0x47]);
  const jpeg = find([0xff, 0xd8, 0xff]);
  const bmp = find([0x42, 0x4d]);
  const pick = png >= 0 ? { at: png, mime: "image/png" } : jpeg >= 0 ? { at: jpeg, mime: "image/jpeg" } : bmp >= 0 && bmp < 64 ? { at: bmp, mime: "image/bmp" } : null;
  if (!pick) return null;
  let binary = "";
  const slice = bytes.subarray(pick.at);
  for (let index = 0; index < slice.length; index += 0x8000) binary += String.fromCharCode(...slice.subarray(index, index + 0x8000));
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
  return { mime: pick.mime, base64 };
}

/** Vrlo jednostavno izvlačenje teksta iz RTF-a (bez formatiranja). */
export function rtfToText(rtf: string): string {
  let depth = 0, skip = -1, out = "";
  for (let index = 0; index < rtf.length; index++) {
    const char = rtf[index]!;
    if (char === "{") { depth++; continue; }
    if (char === "}") { if (skip === depth) skip = -1; depth--; continue; }
    if (char === "\\") {
      const rest = rtf.slice(index + 1);
      const hex = /^'([0-9a-fA-F]{2})/.exec(rest);
      if (hex) { if (skip < 0) out += String.fromCharCode(parseInt(hex[1]!, 16)); index += 3; continue; }
      const word = /^([a-zA-Z]+)(-?\d+)? ?/.exec(rest);
      if (word) {
        const name = word[1]!;
        if (["fonttbl", "colortbl", "stylesheet", "info", "pict"].includes(name) && skip < 0) skip = depth;
        if (skip < 0 && (name === "par" || name === "line")) out += "\n";
        if (skip < 0 && name === "tab") out += "\t";
        index += word[0].length; continue;
      }
      if (rest[0] === "*") { if (skip < 0) skip = depth; index += 1; continue; }
      index += 1; continue;
    }
    if (skip < 0 && char !== "\r" && char !== "\n") out += char;
  }
  return out.trim();
}

const BAND_TAGS = new Set(["TfrxReportTitle", "TfrxPageHeader", "TfrxPageFooter", "TfrxReportSummary", "TfrxMasterData", "TfrxDetailData", "TfrxSubdetailData", "TfrxHeader", "TfrxFooter", "TfrxGroupHeader", "TfrxGroupFooter"]);

type Band = { node: Fr3Node; tag: string; name: string; top: number; height: number };

export type LayoutOptions = { now?: Date; maxPages?: number };

export function layoutReport(report: Fr3Node, datasets: Datasets, options: LayoutOptions = {}): RenderedPage[] {
  // Dva prolaza: prvi odredi broj stranica za [TOTALPAGES#].
  const first = layoutOnce(report, datasets, options, 0);
  return layoutOnce(report, datasets, options, first.length);
}

function layoutOnce(report: Fr3Node, datasets: Datasets, options: LayoutOptions, totalPages: number): RenderedPage[] {
  const pageNode = report.children.find((child) => child.tag === "TfrxReportPage");
  if (!pageNode) return [];
  const variables = new Map<string, string>();
  for (const container of report.children.filter((child) => child.tag === "Variables")) {
    for (const item of container.children) if (item.attrs["Name"] && item.attrs["Value"] !== undefined) variables.set(item.attrs["Name"].trim().toUpperCase(), item.attrs["Value"]);
  }
  const variableNames: ReadonlySet<string> = new Set(variables.keys());
  const now = options.now ?? new Date();
  const two = (value: number) => String(value).padStart(2, "0");
  const dateText = `${two(now.getDate())}.${two(now.getMonth() + 1)}.${now.getFullYear()}`;
  const timeText = `${two(now.getHours())}:${two(now.getMinutes())}:${two(now.getSeconds())}`;

  const paperWidth = num(pageNode.attrs["PaperWidth"], 210) * MM;
  const paperHeight = num(pageNode.attrs["PaperHeight"], 297) * MM;
  const margin = { left: num(pageNode.attrs["LeftMargin"], 10) * MM, right: num(pageNode.attrs["RightMargin"], 10) * MM, top: num(pageNode.attrs["TopMargin"], 10) * MM, bottom: num(pageNode.attrs["BottomMargin"], 10) * MM };
  const bandsOf = (node: Fr3Node): Band[] => node.children.filter((child) => BAND_TAGS.has(child.tag)).map((child) => ({ node: child, tag: child.tag, name: child.attrs["Name"] ?? "", top: num(child.attrs["Top"]), height: num(child.attrs["Height"]) })).sort((left, right) => left.top - right.top);
  const bands = bandsOf(pageNode);
  const allPages = report.children.filter((child) => child.tag === "TfrxReportPage");
  const byName = new Map(allPages.flatMap((node) => bandsOf(node)).map((band) => [band.name.toUpperCase(), band]));
  let originLeft = 0;

  const pages: RenderedPage[] = [];
  let pageNumber = 0, y = 0, lineNumber = 0;
  const rows = new Map<string, Row>();
  const footer = bands.find((band) => band.tag === "TfrxPageFooter");
  const header = bands.find((band) => band.tag === "TfrxPageHeader");
  const bodyBottom = () => paperHeight - margin.bottom - (footer?.height ?? 0);
  const maxPages = options.maxPages ?? 500;

  const filteredRows = (band: Band, ctx: ExprContext): Row[] => {
    const dataset = (band.node.attrs["DataSet"] ?? band.node.attrs["DataSetName"] ?? "").toUpperCase();
    let all = [...(datasets[dataset] ?? [])];
    const filter = band.node.attrs["Filter"];
    if (!filter) {
      // Corpus skripte vezuju detalj za trenutni ELEMENT; bez njih bi se svi redovi ponavljali za svaki element.
      const element = rows.get("ELEMENT");
      const key = all[0] && "ELEMENTID" in all[0] ? "ELEMENTID" : all[0] && "PARENTID" in all[0] ? "PARENTID" : null;
      if (element && key && dataset !== "ELEMENT" && (band.tag === "TfrxDetailData" || band.tag === "TfrxSubdetailData")) all = all.filter((row) => row[key] === element["ID"]);
      return all;
    }
    let expression;
    try { expression = parseExpression(filter, variableNames); } catch { return all; }
    return all.filter((row) => { const rowContext = withRow(ctx, dataset, row); const value = evaluateNode(expression, rowContext); return value === true || (typeof value === "number" && value !== 0); });
  };

  const makeContext = (): ExprContext => {
    const context: ExprContext = {
      variableNames,
      row: (dataset) => {
        const key = dataset.toUpperCase();
        // Skup s jednim redom (PROJECT, PROJECTS) dostupan je i u naslovu i podnožju, izvan master trake.
        return rows.get(key) ?? (datasets[key]?.length === 1 ? datasets[key]![0] : undefined);
      },
      variable: (name) => variables.get(name),
      system: (name) => {
        switch (name) {
          case "DATE": return dateText;
          case "TIME": return timeText;
          case "PAGE#": return pageNumber;
          case "TOTALPAGES#": return totalPages || pageNumber;
          case "LINE#": return lineNumber;
          default: return undefined;
        }
      },
      forEachBandRow: (bandName, visit) => {
        const band = byName.get(bandName.toUpperCase());
        if (!band) return;
        const dataset = (band.node.attrs["DataSet"] ?? band.node.attrs["DataSetName"] ?? "").toUpperCase();
        for (const row of filteredRows(band, context)) visit(withRow(context, dataset, row));
      },
    };
    return context;
  };
  function withRow(base: ExprContext, dataset: string, row: Row): ExprContext {
    return { ...base, row: (name) => name.toUpperCase() === dataset ? row : base.row(name) };
  }
  const context = makeContext();

  const newPage = () => {
    if (pages.length >= maxPages) throw new Error("Izvještaj ima previše stranica.");
    pageNumber += 1; lineNumber = 0;
    const page: RenderedPage = { width: paperWidth, height: paperHeight, objects: [] };
    pages.push(page);
    y = margin.top;
    if (header) y += printBand(header, page, y);
    return page;
  };
  const evaluate = (text: string) => { try { return evaluateText(text, context); } catch { return ""; } };
  let page = newPage();

  function printBand(band: Band, target: RenderedPage, atY: number): number {
    if (band.node.attrs["Visible"]?.toLowerCase() === "false") return 0;
    const baseLeft = margin.left + originLeft + num(band.node.attrs["Left"]);
    for (const object of band.node.children) {
      if (object.attrs["Visible"]?.toLowerCase() === "false") continue;
      const left = baseLeft + num(object.attrs["Left"]), top = atY + num(object.attrs["Top"]);
      const width = num(object.attrs["Width"]);
      let height = num(object.attrs["Height"]);
      // FastReport siječe objekte na visinu trake; slike zadržavaju puni razmjer pa se siječe prikaz.
      const available = band.height - num(object.attrs["Top"]);
      const clipHeight = band.height > 0 && height > available && available > 0 ? available : undefined;
      if (clipHeight !== undefined && object.tag !== "TfrxPictureView" && object.tag !== "TfrxLineView") height = clipHeight;
      switch (object.tag) {
        case "TfrxMemoView": case "TfrxSysMemoView": {
          const source = object.attrs["Text"] ?? "";
          target.objects.push({ kind: "memo", left, top, width, height, text: evaluate(source).replace(/\r\n?/g, "\n"), style: styleOf(object.attrs), source });
          break;
        }
        case "TfrxRichView": {
          const hex = object.attrs["PropData"] ?? "";
          const bytes = hexBytes(hex);
          const start = Array.from(bytes).findIndex((value, index) => value === 0x7b && bytes[index + 1] === 0x5c);
          const rtf = start >= 0 ? new TextDecoder("latin1").decode(bytes.subarray(start)) : "";
          const text = rtfToText(rtf);
          target.objects.push({ kind: "memo", left, top, width, height, text: evaluate(text), style: styleOf(object.attrs), source: text });
          break;
        }
        case "TfrxLineView":
          target.objects.push({ kind: "line", left, top, width, height, color: delphiColor(object.attrs["Color"], "#000000") ?? "#000000", lineWidth: Math.max(1, num(object.attrs["Frame.Width"], 1)) });
          break;
        case "TfrxShapeView":
          target.objects.push({ kind: "shape", left, top, width, height, shape: object.attrs["Shape"] ?? "skRectangle", style: styleOf(object.attrs, true) });
          break;
        case "TfrxGradientView":
          target.objects.push({ kind: "gradient", left, top, width, height, from: delphiColor(object.attrs["BeginColor"], "#ffffff") ?? "#ffffff", to: delphiColor(object.attrs["EndColor"], "#000000") ?? "#000000", vertical: object.attrs["Style"] !== "gsHorizontal" });
          break;
        case "TfrxPictureView": {
          const image = imageFromPropData(object.attrs["Picture.PropData"] ?? object.attrs["PropData"] ?? "");
          if (image) target.objects.push({ kind: "picture", left, top, width, height, ...image, clipHeight });
          break;
        }
        default: break;
      }
    }
    return band.height;
  }

  /** Ispisuje traku na trenutnu stranicu; ako se ne stane, prelazi na novu. */
  const place = (band: Band) => {
    if (y + band.height > bodyBottom() && y > margin.top + (header?.height ?? 0)) page = newPage();
    const subreports = band.node.children.filter((child) => child.tag === "TfrxSubreport");
    if (subreports.length === 0) { y += printBand(band, page, y); return; }
    // Podizvještaj: trake druge stranice šablona ispisuju se u toku, ispod gornje ivice podizvještaja.
    const start = y;
    printBand(band, page, y);
    let end = start + band.height;
    for (const sub of subreports) {
      const target = allPages.find((candidate) => candidate.attrs["Name"] === sub.attrs["Page"]);
      if (!target || target === pageNode) continue;
      y = start + num(sub.attrs["Top"]);
      const savedLeft = originLeft;
      originLeft += num(sub.attrs["Left"]);
      runPage(target);
      originLeft = savedLeft;
      end = Math.max(end, y);
    }
    y = end;
  };

  // Trake koje pripadaju jednom master redu: Header/GroupHeader iznad DetailData, Footer/GroupFooter ispod.
  type Chain = { headers: Band[]; detail: Band; footers: Band[] };
  const buildChains = (children: Band[]): Chain[] => {
    const chains: Chain[] = [];
    let pending: Band[] = [];
    for (const band of children) {
      if (band.tag === "TfrxHeader" || band.tag === "TfrxGroupHeader") pending.push(band);
      else if (band.tag === "TfrxDetailData") { chains.push({ headers: pending, detail: band, footers: [] }); pending = []; }
      else if ((band.tag === "TfrxFooter" || band.tag === "TfrxGroupFooter") && chains.length > 0) chains[chains.length - 1]!.footers.push(band);
    }
    return chains;
  };

  const runChain = (chain: Chain) => {
    const dataset = (chain.detail.node.attrs["DataSet"] ?? chain.detail.node.attrs["DataSetName"] ?? "").toUpperCase();
    const groupHeaders = chain.headers.filter((band) => band.tag === "TfrxGroupHeader");
    const plainHeaders = chain.headers.filter((band) => band.tag === "TfrxHeader");
    let detailRows = filteredRows(chain.detail, context);
    // Grupisanje traži poredan skup: stabilno sortiranje po uslovu prve grupe.
    const conditionOf = (group: Band, row: Row) => {
      try { return String(evaluateNode(parseExpression(group.node.attrs["Condition"] ?? "", variableNames), withRow(context, dataset, row)) ?? ""); } catch { return ""; }
    };
    const firstGroup = groupHeaders[0];
    if (firstGroup) detailRows = detailRows.map((row, index) => ({ row, index, key: conditionOf(firstGroup, row) })).sort((left, right) => left.key.localeCompare(right.key, "hr") || left.index - right.index).map((entry) => entry.row);
    // Detalj koji sadrži samo podizvještaje (Corpus skriptom ga svodi na jedan red) ispisuje se jednom po masteru.
    const onlySubreports = chain.detail.node.children.length > 0 && chain.detail.node.children.every((child) => child.tag === "TfrxSubreport");
    if (onlySubreports) detailRows = detailRows.slice(0, 1);
    if (detailRows.length === 0 && chain.detail.node.attrs["PrintIfDetailEmpty"]?.toLowerCase() !== "true") return;
    for (const band of plainHeaders) place(band);
    lineNumber = 0;
    let previousKey: string | null = null;
    for (const row of detailRows) {
      rows.set(dataset, row);
      if (firstGroup) {
        const key = conditionOf(firstGroup, row);
        if (key !== previousKey) { for (const band of groupHeaders) place(band); previousKey = key; }
      }
      lineNumber += 1;
      place(chain.detail);
    }
    for (const band of chain.footers) place(band);
    rows.delete(dataset);
  };

  function runPage(node: Fr3Node) {
  const topLevel = bandsOf(node).filter((band) => band.tag !== "TfrxPageHeader" && band.tag !== "TfrxPageFooter");
  const masters = topLevel.filter((band) => band.tag === "TfrxMasterData");
  const nonMaster = topLevel.filter((band) => band.tag !== "TfrxMasterData");
  const beforeMasters = (masters[0] ? topLevel.filter((band) => band.top < masters[0]!.top) : topLevel);

  // Naslov izvještaja i trake iznad prvog master-a (osim Header/GroupHeader koji pripadaju detalju).
  for (const band of beforeMasters) if (band.tag === "TfrxReportTitle") place(band);

  if (masters.length === 0) {
    for (const chain of buildChains(nonMaster)) runChain(chain);
  } else {
    masters.forEach((master, masterIndex) => {
      const nextTop = masters[masterIndex + 1]?.top ?? Infinity;
      const masterDataset = (master.node.attrs["DataSet"] ?? master.node.attrs["DataSetName"] ?? "").toUpperCase();
      const children = nonMaster.filter((band) => band.top > master.top && band.top < nextTop && band.tag !== "TfrxReportSummary" && band.tag !== "TfrxReportTitle");
      let masterRows = filteredRows(master, context);
      // Master koji dijeli skup podataka s vlastitim detaljem (obrazac podizvještaja) ispisuje se jednom.
      if (children.some((band) => band.tag === "TfrxDetailData" && (band.node.attrs["DataSet"] ?? "").toUpperCase() === masterDataset && masterDataset !== "")) masterRows = masterRows.slice(0, 1);
      if (masterRows.length === 0) return;
      lineNumber = 0;
      for (const row of masterRows) {
        rows.set(masterDataset, row);
        if (masterDataset === "PROJECTS") rows.set("PROJECT", row);
        if (masterDataset === "PROJECT") rows.set("PROJECTS", row);
        lineNumber += 1;
        place(master);
        for (const chain of buildChains(children)) runChain(chain);
      }
      rows.delete(masterDataset);
    });
  }
  for (const band of nonMaster) if (band.tag === "TfrxReportSummary") place(band);

  }
  runPage(pageNode);

  if (footer) {
    const savedPage = pageNumber;
    pages.forEach((target, index) => {
      pageNumber = index + 1;
      printBand(footer, target, paperHeight - margin.bottom - footer.height);
    });
    pageNumber = savedPage;
  }
  return pages;
}
