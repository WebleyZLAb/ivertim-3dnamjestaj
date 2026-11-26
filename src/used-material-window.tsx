import { useMemo, useState } from "react";
import { applyUsedMaterialMargins, NO_MARGINS, type UsedElement, type UsedMaterial, type UsedMaterialMargins } from "../lib/corpus-used-material.ts";

type Props = {
  used: UsedMaterial;
  byElement: readonly UsedElement[];
  onOpenCutList(): void;
  onPrint(): void;
  onExport(): void;
};

const m2 = (value: number) => value.toFixed(3);
const total = (value: number) => value.toFixed(2);
const MARGINS_KEY = "ivertim.usedMaterialMargins";

function loadMargins(): UsedMaterialMargins {
  try {
    const raw = JSON.parse(window.localStorage.getItem(MARGINS_KEY) ?? "null") as Partial<UsedMaterialMargins> | null;
    const percent = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
    return raw ? { disabled: raw.disabled === true, boards: percent(raw.boards), edges: percent(raw.edges), other: percent(raw.other) } : NO_MARGINS;
  } catch { return NO_MARGINS; }
}

/** Prozor „Utrošeni materijal": ploče po materijalu, rubne trake i okovi. Izmjene količina važe samo u prozoru. */
export function UsedMaterialWindow({ used, byElement, onOpenCutList, onPrint, onExport }: Props) {
  const [tab, setTab] = useState<"boards" | "elements">("boards");
  const [margins, setMargins] = useState<UsedMaterialMargins>(loadMargins);
  // Sirovi tekst polja marže dok se piše (da se može upisati "12." i "12,5"); po izlasku iz polja prikazuje se broj.
  const [marginText, setMarginText] = useState<Record<string, string>>({});
  const changeMargins = (next: UsedMaterialMargins) => {
    setMargins(next);
    try { window.localStorage.setItem(MARGINS_KEY, JSON.stringify(next)); } catch { /* privatni prozor ili blokiran prostor */ }
  };
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set(used.materials.map((group) => group.key)));
  const [quantities, setQuantities] = useState<ReadonlyMap<string, number>>(() => new Map());
  const quantityOf = (key: string) => quantities.get(key) ?? 1;
  const setQuantity = (key: string, value: number) => setQuantities((current) => new Map(current).set(key, Math.max(0, value)));
  const groups = useMemo(() => used.materials.map((group) => {
    const rows = group.rows.filter((row) => (quantities.get(row.key) ?? 1) > 0);
    const area = rows.reduce((sum, row) => sum + row.area * (quantities.get(row.key) ?? 1), 0);
    return { ...group, rows, area, cost: group.price === null ? 0 : Math.round(area * group.price * 100) / 100 };
  }).filter((group) => group.rows.length > 0), [used.materials, quantities]);
  const totalArea = groups.reduce((sum, group) => sum + group.area, 0);
  const edgeTotal = used.edges.reduce((sum, edge) => sum + edge.length, 0);
  const boardsCost = groups.reduce((sum, group) => sum + group.cost, 0);
  const edgeCost = used.edges.reduce((sum, edge) => sum + edge.cost, 0);
  const otherCost = used.fittings.reduce((sum, item) => sum + item.cost, 0);
  const shown = applyUsedMaterialMargins({ boards: boardsCost, edges: edgeCost, other: otherCost }, margins);
  const toggle = (key: string) => setCollapsed((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });

  return <div className="used-material">
    <div className="used-material-tabs" role="tablist">
      <button role="tab" aria-selected={tab === "boards"} onClick={() => setTab("boards")}>Ploče</button>
      <button role="tab" aria-selected={tab === "elements"} onClick={() => setTab("elements")}>Elementi</button>
    </div>
    {tab === "elements" ? <>
      <div className="used-material-scroll">
        <table>
          <thead><tr><th>Element</th><th>Šifra</th><th>Ploča</th><th>m²</th><th>Iznos</th></tr></thead>
          <tbody>{byElement.map((element) => <ElementRows key={element.index} element={element} />)}</tbody>
        </table>
      </div>
      <p className="used-material-note">Pregled potrošnje po elementima (ploče podelemenata ulaze u svoj korijenski element). Izveden je iz istih podataka kao popis materijala; kartica Elementi u Corpusu još nije snimljena, pa raspored ne mora biti isti.</p>
    </> : <>
      <div className="used-material-toolbar">
        <button title="Proširi sve" onClick={() => setCollapsed(new Set())}>Proširi sve</button>
        <button title="Skupi sve" onClick={() => setCollapsed(new Set(used.materials.map((group) => group.key)))}>Skupi sve</button>
      </div>
      <div className="used-material-scroll">
        <table>
          <thead><tr><th>Materijal</th><th>Dimenzije</th><th>Kol.</th><th>m²</th><th>Iznos</th></tr></thead>
          <tbody>
            {groups.map((group) => <GroupRows key={group.key} group={group} open={!collapsed.has(group.key)} onToggle={() => toggle(group.key)} quantityOf={quantityOf} setQuantity={setQuantity} />)}
            <tr className="used-material-section"><th colSpan={3}>Rubne trake</th><th>{total(edgeTotal)} m</th><th>{total(edgeCost)}</th></tr>
            {used.edges.map((edge) => <tr key={edge.key}><td colSpan={3}>{edge.edgeName} {edge.edgeMaterialName} ( {edge.boardThickness} ) {edge.edgeCode}</td><td>{total(edge.length)} m</td><td>{total(edge.cost)}</td></tr>)}
            <tr className="used-material-section"><th colSpan={3}>Okovi</th><th>Kol.</th><th>Iznos</th></tr>
            {used.fittings.map((item) => <tr key={`${item.uid}-${item.name}`}><td colSpan={3}>{item.name}</td><td>{item.quantity}</td><td>{total(item.cost)}</td></tr>)}
          </tbody>
        </table>
      </div>
      <details className="used-material-margins">
        <summary>Marže{margins.disabled ? " (onemogućene)" : margins.boards || margins.edges || margins.other ? ` (${margins.boards}% / ${margins.edges}% / ${margins.other}%)` : ""}</summary>
        <label className="used-material-check"><input type="checkbox" checked={margins.disabled} onChange={(event) => changeMargins({ ...margins, disabled: event.target.checked })} /> Onemogući računanje marže</label>
        {([["boards", "Ploče"], ["edges", "Rubne trake"], ["other", "Okovi (ostalo)"]] as const).map(([field, label]) => <label key={field}>{label} osnovna marža %<input inputMode="decimal" value={marginText[field] ?? String(margins[field])} onChange={(event) => { const text = event.target.value; setMarginText((current) => ({ ...current, [field]: text })); const value = Number(text.replace(",", ".")); changeMargins({ ...margins, [field]: Number.isFinite(value) ? value : 0 }); }} onBlur={() => setMarginText((current) => { const { [field]: _removed, ...rest } = current; return rest; })} /></label>)}
        <p className="used-material-note">Osnovna marža po kategoriji, kao grupa „Osnovni" u Corpusu. Grupe 1–5 i dodjela grupa pojedinim stavkama još nisu podržane. Zadano je 0 %, pa zbir ostaje kao u Corpusu.</p>
      </details>
      <p className="used-material-total">Ploče: <strong>{total(shown.boards)}</strong> · Rubne trake: <strong>{total(shown.edges)}</strong> · Ostalo: <strong>{total(shown.other)}</strong> · UKUPNO: <strong>{total(shown.total)}</strong></p>
      <p className="used-material-total">{quantities.size > 0 && <em>Zbir uključuje ručne izmjene ploča; trake i okovi nisu preračunati. </em>}{used.unpricedGroups > 0 && <span>{used.unpricedGroups} grupa ploča bez cijene u katalogu. </span>}{total(totalArea)} m² ploča · {total(edgeTotal)} m traka · {used.fittings.reduce((sum, item) => sum + item.quantity, 0)} kom okova</p>
      <p className="used-material-note">Zbir računa samo stavke kojima je u katalogu zadana cijena (kao Corpus), bez marže. Količine (− / +) i brisanje redova mijenjaju samo ovaj prikaz, ne projekat. Dužina traka je zbir strana plus 80 mm po strani, kao u Corpusu.</p>
    </>}
    <div className="used-material-actions"><button onClick={onPrint}>Ispiši…</button><button onClick={onExport}>Export (CSV po pločama)</button><button onClick={onOpenCutList}>Krojna lista</button></div>
  </div>;
}

function GroupRows({ group, open, onToggle, quantityOf, setQuantity }: {
  group: UsedMaterial["materials"][number];
  open: boolean;
  onToggle(): void;
  quantityOf(key: string): number;
  setQuantity(key: string, value: number): void;
}) {
  return <>
    <tr className="used-material-group">
      <th colSpan={3}><button className="used-material-toggle" aria-expanded={open} onClick={onToggle}>{open ? "−" : "+"}</button> {group.materialName} ( {group.thickness} )</th>
      <th>{total(group.area)} m²</th>
      <th>{group.price === null ? "" : total(group.cost)}</th>
    </tr>
    {open && group.rows.map((row) => <tr key={row.key}>
      <td title={`${row.element} / ${row.board}`}><small>{row.element} / {row.board}</small></td>
      <td>{row.height} × {row.width}</td>
      <td>
        <button aria-label="Smanji količinu" onClick={() => setQuantity(row.key, quantityOf(row.key) - 1)}>−</button>
        {quantityOf(row.key)}
        <button aria-label="Povećaj količinu" onClick={() => setQuantity(row.key, quantityOf(row.key) + 1)}>+</button>
        <button aria-label="Ukloni red" onClick={() => setQuantity(row.key, 0)}>✖</button>
      </td>
      <td>{m2(row.area * quantityOf(row.key))}</td>
      <td>{group.price === null ? "" : total(row.area * quantityOf(row.key) * group.price)}</td>
    </tr>)}
  </>;
}

function ElementRows({ element }: { element: UsedElement }) {
  const [open, setOpen] = useState(false);
  return <>
    <tr className="used-material-group">
      <th><button className="used-material-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "−" : "+"}</button> {element.name}</th>
      <th>{element.code}</th><th>{element.boards}</th><th>{total(element.area)}</th><th>{total(element.cost)}</th>
    </tr>
    {open && element.materials.map((item) => <tr key={item.key}>
      <td colSpan={2}><small>{item.materialName} ( {item.thickness} )</small></td><td>{item.boards}</td><td>{m2(item.area)}</td><td>{total(item.cost)}</td>
    </tr>)}
  </>;
}
