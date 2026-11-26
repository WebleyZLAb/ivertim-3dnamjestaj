/**
 * Cijene okova iz kataloga potrošnog materijala (`Potrosni/*.cxm`). Svaki `PotItem` ima
 * `Data Cijena` (po komadu) i `Dodatno OznId`, što je isti identifikator kao `UID` stavke okova u S3D-u.
 * Provjereno na Kuhinja_1: KONFIRMAT 0,05 i DRVENA TIPLA 0,01 daju zbir okova kao u Corpusu.
 */
export function parseFittingPrices(xml: string): Record<string, number> {
  const prices: Record<string, number> = {};
  // Dijeli se po otvarajućoj oznaci, pa stavka bez djece (<PotItem .../>) ne preuzima podatke sljedeće.
  for (const chunk of xml.split("<PotItem").slice(1)) {
    const headEnd = chunk.indexOf(">");
    if (headEnd < 0) continue;
    const head = chunk.slice(0, headEnd);
    const block = head.endsWith("/") ? head : chunk;
    if (!/\bTip="1"/.test(head)) continue;
    const id = /\bOznId="([^"]+)"/.exec(block)?.[1];
    const price = Number(/<Data\b[^>]*\bCijena="([^"]*)"/.exec(block)?.[1]?.replace(",", "."));
    if (id && Number.isFinite(price) && price > 0) prices[id] = price;
  }
  return prices;
}
