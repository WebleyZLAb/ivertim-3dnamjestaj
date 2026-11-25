import type { Fr3Node } from "./fr3-parse.ts";
import { AVAILABLE_DATASETS } from "./project-datasets.ts";

export type TemplateInfo = {
  /** Naziv iz ReportOptions.Name (ako postoji). */
  name: string;
  description: string;
  datasets: string[];
  /** Skupovi podataka koje naš program još ne gradi. */
  missing: string[];
};

/** Skupovi podataka koje šablon koristi: trake (DataSet) i izrazi [DS."POLJE"] u tekstovima. */
export function describeTemplate(report: Fr3Node): TemplateInfo {
  const used = new Set<string>();
  const visit = (node: Fr3Node) => {
    if (node.tag === "TfrxDataPage" || node.tag === "Datasets") return;
    const dataset = node.attrs["DataSet"] ?? node.attrs["DataSetName"];
    if (dataset) used.add(dataset.toUpperCase());
    const text = node.attrs["Text"];
    if (text) for (const match of text.matchAll(/([A-Za-z_]\w*)\."/g)) used.add(match[1]!.toUpperCase());
    for (const child of node.children) visit(child);
  };
  for (const page of report.children.filter((child) => child.tag === "TfrxReportPage")) visit(page);
  const datasets = [...used].filter((name) => /^[A-Z_][A-Z0-9_]*$/.test(name)).sort();
  return {
    name: report.attrs["ReportOptions.Name"] ?? "",
    description: report.attrs["ReportOptions.Description.Text"] ?? "",
    datasets,
    missing: datasets.filter((name) => !AVAILABLE_DATASETS.has(name)),
  };
}
