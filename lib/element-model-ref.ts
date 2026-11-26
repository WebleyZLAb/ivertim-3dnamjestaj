/**
 * Veza elementa s 3D modelom (npr. ručka): putanja modela u odnosu na `Modeli` se čuva u opisu elementa (`EOPIS`) kao
 * `ivertim-model=Handles/100_66_043.dae`. Corpus opis ignoriše, a Ivertim 3D prikaz učitava model umjesto kvadra.
 */
export const MODEL_REF_PREFIX = "ivertim-model=";

/** Putanja modela iz opisa elementa, ili null. Putanja ne smije izlaziti iz foldera `Modeli`. */
export function elementModelRef(description: string | undefined | null): string | null {
  const text = description?.trim() ?? "";
  if (!text.startsWith(MODEL_REF_PREFIX)) return null;
  const path = text.slice(MODEL_REF_PREFIX.length).trim().split("\\").join("/");
  if (!/^[\w .()+-]+(?:\/[\w .()+-]+)*\.dae$/i.test(path) || path.split("/").includes("..")) return null;
  return path;
}

const escapeAttribute = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Upisuje putanju modela u `EOPIS` korijenskog elementa E3D izvora. */
export function withElementModelRef(xml: string, modelPath: string): string {
  if (elementModelRef(`${MODEL_REF_PREFIX}${modelPath}`) === null) throw new Error("Putanja modela nije ispravna.");
  const opening = /<ELEMENT\b[^>]*>/.exec(xml);
  if (!opening) throw new Error("E3D izvor nema korijenski element.");
  const value = escapeAttribute(`${MODEL_REF_PREFIX}${modelPath}`);
  const tag = /\bEOPIS="[^"]*"/.test(opening[0])
    ? opening[0].replace(/\bEOPIS="[^"]*"/, `EOPIS="${value}"`)
    : opening[0].replace(/\bENAME="/, `EOPIS="${value}" ENAME="`);
  if (tag === opening[0]) throw new Error("Korijenski element nema naziv za umetanje opisa.");
  return xml.slice(0, opening.index) + tag + xml.slice(opening.index + opening[0].length);
}
