/**
 * Bušenja vrata iz Corpusovog makroa `MAKRO HETTICH` (šarke): čašice Ø35 (dubina 14) i po dvije Ø3 rupe (dubina 3) uz svaku.
 * Formule su preuzete iz dekodiranog makroa (MSVA/MSFO/MSGR/MSRA) i provjerene na 11 stvarnih vrata iz projekta
 * Siniša Buić - Ormari (programi `100000031` itd.): položaji šarki, čašica i malih rupa se poklapaju s `.mpr`.
 *
 * Podržano samo ono što je provjereno: tip fronte 1 (OTVARANJE 0, šarke s Y = 21,5) i 2 (OTVARANJE 1, Y = S − 21,5),
 * PRO_SAR = 0, vrata kod kojih je VISINA ≥ DUBINA. Za sve ostalo funkcija vraća `null` (ne nagađa).
 */
export type HettichBore = { x: number; y: number; diameter: number; depth: number };
export type HettichDoorInput = { height: number; width: number; frontType: number | null; variables: Readonly<Record<string, string>> };

const POCETAK_RUPE = 21.5, POCETAK_RUPA_FRONT = 27, RAZMAK_FRONT = 52, CUP_DIAMETER = 35, CUP_DEPTH = 14, FRONT_DIAMETER = 3, FRONT_DEPTH = 3;

const variable = (variables: Readonly<Record<string, string>>, name: string): number | null => {
  const raw = variables[name] ?? variables[name.toUpperCase()];
  if (raw === undefined || raw.trim() === "") return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
};

/** Visine šarki (V koordinata duž visine vrata) redom kojim ih makro piše (prva, druga, treća, četvrta, peta); `null` ako je broj šarki izvan podržanog. */
export function hettichHingePositions(height: number, variables: Readonly<Record<string, string>>): number[] | null {
  const oscillation = variable(variables, "S_O") === 1;
  const offset = (index: number) => (oscillation ? variable(variables, `SARKA_${index}`) ?? 0 : 0);
  const fixedCount = variable(variables, "BR_SARKI") === 1 ? variable(variables, "BR_SA") : null;
  const count = fixedCount ?? (height < 900 ? 2 : height < 1600 ? 3 : height < 2000 ? 4 : 5);
  if (![2, 3, 4, 5].includes(count)) return null;
  const quarter = count === 4 ? (height + 100) / 3 : (height + 200) / 4;
  const positions = [100 + offset(1), height - 100 + offset(count)];
  if (count === 3) positions.push(height / 2 + offset(2));
  if (count === 5) positions.push(height / 2 + offset(3));
  if (count >= 4) {
    positions.push(quarter + offset(2));
    positions.push(height - quarter + offset(count === 4 ? 3 : 4));
  }
  return positions;
}

/** Bušenja vrata u koordinatama programa (X duž visine, Y duž dubine vrata, gornje lice). */
export function hettichDoorBores(door: HettichDoorInput): HettichBore[] | null {
  if (door.frontType !== 1 && door.frontType !== 2) return null;
  if (door.height < door.width || (variable(door.variables, "PRO_SAR") ?? 0) !== 0) return null;
  const hinges = hettichHingePositions(door.height, door.variables);
  if (!hinges) return null;
  // Redoslijed makroa: čašice prve, druge, treće, četvrte i pete šarke (MSGR), pa male rupe istim redom (MSRA).
  const positions = hinges;
  const rightHinge = door.frontType === 2;
  const cupY = rightHinge ? door.width - POCETAK_RUPE : POCETAK_RUPE;
  const smallY = rightHinge ? door.width - POCETAK_RUPA_FRONT : POCETAK_RUPA_FRONT;
  const bores: HettichBore[] = [];
  for (const x of positions) bores.push({ x, y: cupY, diameter: CUP_DIAMETER, depth: CUP_DEPTH });
  for (const x of positions) for (const offset of [-RAZMAK_FRONT / 2, RAZMAK_FRONT / 2]) bores.push({ x: x + offset, y: smallY, diameter: FRONT_DIAMETER, depth: FRONT_DEPTH });
  return bores;
}

/** Bušenja vrata ploče `boardIndex` ako element ima `MAKRO HETTICH` vezan na tu ploču; inače `null`. */
export function corpusElementHettichBores(element: { boards: readonly { height: number | null; width: number | null; frontType: number | null }[]; macroLinks: readonly { name: string; object1: number | null }[]; variables: Readonly<Record<string, string>> }, boardIndex: number): HettichBore[] | null {
  const board = element.boards[boardIndex];
  if (!board || board.height === null || board.width === null) return null;
  if (!element.macroLinks.some((link) => /MAKRO HETTICH/i.test(link.name) && link.object1 === boardIndex)) return null;
  return hettichDoorBores({ height: board.height, width: board.width, frontType: board.frontType, variables: element.variables });
}
