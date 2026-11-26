import assert from "node:assert/strict";
import test from "node:test";
import { fittingModelPath, mdrlPathForModel, parseFittingCatalog } from "../lib/corpus-fitting-model.ts";

// DPKSEXTRA stvarne Blumove stavke (METABOX, oznaka 01963053_L): iza naziva modela slijedi putanja "Blum\320H3500C15_L.wrl".
const DPKSEXTRA = "0705504F54455801020006025551022906034441540102FF0200020002FF05000000000000000000001200000000060D33323048333530304331355F4C0616426C756D5C33323048333530304331355F4C2E77726C120000000000060350414B020000";

test("putanja modela se vadi iz DPKSEXTRA, obrnute kose crte postaju kose", () => {
  assert.equal(fittingModelPath(DPKSEXTRA), "Blum/320H3500C15_L.wrl");
  assert.equal(mdrlPathForModel("Blum/320H3500C15_L.wrl"), "Blum/320H3500C15_L.mdrl");
});

test("stavka bez modela (vlastiti okov) i neispravan zapis nemaju putanju", () => {
  assert.equal(fittingModelPath("0705504F54455801020006025551045F94000006034441540102FF02FF02"), null);
  assert.equal(fittingModelPath(""), null);
  assert.equal(fittingModelPath("nije heks"), null);
});

test("katalog: naziv, oznaka, UID i putanja modela po stavci", () => {
  const xml = `<Potrosni FILE="X">
  <PotItem Naziv="METABOX &quot;test&quot;" oznakaP="01963053_L" Tip="1" DPKSEXTRA="${DPKSEXTRA}" FKOMPARL2="00">
    <Data Cijena="0"/>
    <Dodatno OznId="{229CB1FF-5108-416E-B1AA-32AA8BC75038}"/>
  </PotItem>
  <PotItem Naziv="BAGLAMA RAVNA BLUM" oznakaP="3" Tip="1" DPKSEXTRA="0705504F54455801020006025551045F94000006034441540102FF02FF02">
    <Dodatno OznId="{F2CDB877-1710-4A58-8683-EFAD18F9A81E}"/>
  </PotItem></Potrosni>`;
  const items = parseFittingCatalog(xml);
  assert.deepEqual(items, [
    { name: 'METABOX "test"', code: "01963053_L", uid: "{229CB1FF-5108-416E-B1AA-32AA8BC75038}", modelPath: "Blum/320H3500C15_L.wrl" },
    { name: "BAGLAMA RAVNA BLUM", code: "3", uid: "{F2CDB877-1710-4A58-8683-EFAD18F9A81E}", modelPath: null },
  ]);
});
