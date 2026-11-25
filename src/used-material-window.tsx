import { useMemo, useState } from "react";
import type { UsedMaterial } from "../lib/corpus-used-material.ts";

type Props = {
  used: UsedMaterial;
  onOpenCutList(): void;
  onPrint(): void;
};

const m2 = (value: number) => value.toFixed(3);
const total = (value: number) => value.toFixed(2);

/** Prozor „Utrošeni materijal": ploče po materijalu, rubne trake i okovi. Izmjene količina važe samo u prozoru. */
export function UsedMaterialWindow({ used, onOpenCutList, onPrint }: Props) {
  const [tab, setTab] = useState<"boards" | "elements">("boards");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set(used.materials.map((group) => group.key)));
  const [quantities, setQuantities] = useState<ReadonlyMap<string, number>>(() => new Map());
  const quantityOf = (key: string) => quantities.get(key) ?? 1;
  const setQuantity = (key: string, value: number) => setQuantities((current) => new Map(current).set(key, Math.max(0, value)));
  const groups = useMemo(() => used.materials.map((group) => {
    const rows = group.rows.filter((row) => (quantities.get(row.key) ?? 1) > 0);
    return { ...group, rows, area: rows.reduce((sum, row) => sum + row.area * (quantities.get(row.key) ?? 1), 0) };
  }).filter((group) => group.rows.length > 0), [used.materials, quantities]);
  const totalArea = groups.reduce((sum, group) => sum + group.area, 0);
  const edgeTotal = used.edges.reduce((sum, edge) => sum + edge.length, 0);
  const toggle = (key: string) => setCollapsed((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });

  return <div className="used-material">
    <div className="used-material-tabs" role="tablist">
      <button role="tab" aria-selected={tab === "boards"} onClick={() => setTab("boards")}>Ploče</button>
      <button role="tab" aria-selected={tab === "elements"} onClick={() => setTab("elements")}>Elementi</button>
    </div>
    {tab === "elements" ? <p className="used-material-note">Kartica Elementi još nije snimljena u Corpusu, pa je ovdje prazna.</p> : <>
      <div className="used-material-toolbar">
        <button title="Proširi sve" onClick={() => setCollapsed(new Set())}>Proširi sve</button>
        <button title="Skupi sve" onClick={() => setCollapsed(new Set(used.materials.map((group) => group.key)))}>Skupi sve</button>
      </div>
      <div className="used-material-scroll">
        <table>
          <thead><tr><th>Materijal</th><th>Dimenzije</th><th>Kol.</th><th>m²</th></tr></thead>
          <tbody>
            {groups.map((group) => <GroupRows key={group.key} group={group} open={!collapsed.has(group.key)} onToggle={() => toggle(group.key)} quantityOf={quantityOf} setQuantity={setQuantity} />)}
            <tr className="used-material-section"><th colSpan={3}>Rubne trake (neto dužina)</th><th>{total(edgeTotal)} m</th></tr>
            {used.edges.map((edge) => <tr key={edge.key}><td colSpan={3}>{edge.edgeName} {edge.edgeMaterialName} ( {edge.boardThickness} ) na {edge.boardMaterialName}</td><td>{total(edge.length)} m</td></tr>)}
            <tr className="used-material-section"><th colSpan={3}>Okovi</th><th>Kol.</th></tr>
            {used.fittings.map((item) => <tr key={`${item.uid}-${item.name}`}><td colSpan={3}>{item.name}</td><td>{item.quantity}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="used-material-total">Ploče ukupno: <strong>{total(totalArea)} m²</strong> · Rubne trake: <strong>{total(edgeTotal)} m</strong> · Okovi: <strong>{used.fittings.reduce((sum, item) => sum + item.quantity, 0)} kom</strong></p>
      <p className="used-material-note">Količine (− / +) i brisanje redova mijenjaju samo ovaj prikaz, ne projekat. Cijene i marže još nisu uključeni. Rubne trake su neto, bez dodatka koji Corpus dodaje za neke grupe.</p>
    </>}
    <div className="used-material-actions"><button onClick={onPrint}>Ispiši…</button><button onClick={onOpenCutList}>Krojna lista</button></div>
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
    </tr>)}
  </>;
}
