import assert from "node:assert/strict";
import test from "node:test";
import { parseFittingPrices } from "../lib/corpus-fitting-prices.ts";

test("cijene okova iz kataloga: samo Tip=1 sa cijenom većom od nule, ključ je OznId", () => {
  const xml = `<Potrosni FILE="X">
  <PotItem Naziv="KONFIRMAT" Tip="1"><Data Cijena="0.05" Sirina="0"/><Dodatno OznId="{AAA}"/></PotItem>
  <PotItem Naziv="BESPLATNO" Tip="1"><Data Cijena="0"/><Dodatno OznId="{BBB}"/></PotItem>
  <PotItem Naziv="TRAKA" Tip="0"><Data Cijena="3"/><Dodatno OznId="{CCC}"/></PotItem>
  <PotItem Naziv="ZAREZ" Tip="1"><Data Cijena="1,5"/><Dodatno OznId="Corpus_1"/></PotItem></Potrosni>`;
  assert.deepEqual(parseFittingPrices(xml), { "{AAA}": 0.05, Corpus_1: 1.5 });
});

test("stavka bez djece ne preuzima cijenu sljedeće stavke", () => {
  const xml = `<Potrosni><PotItem Naziv="A" Tip="1"/><PotItem Naziv="B" Tip="1"><Data Cijena="5"/><Dodatno OznId="{B}"/></PotItem></Potrosni>`;
  assert.deepEqual(parseFittingPrices(xml), { "{B}": 5 });
});
