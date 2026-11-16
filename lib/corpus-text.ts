export type CorpusTextDecoding = {
  readonly text: string;
  readonly sourceEncoding: string;
};

/**
 * Čita lokalni Corpus tekst bez oslanjanja na File.text() UTF-8 pretpostavku.
 * XML se u radnoj kopiji normalizuje na UTF-8 jer browser i izvoz koriste UTF-8 bajtove.
 */
export function decodeCorpusTextDocument(input: ArrayBuffer | Uint8Array): CorpusTextDecoding {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const bom = byteOrderMark(bytes);
  const signatureEncoding = bom ? null : xmlByteSignatureEncoding(bytes);
  const declared = bom || signatureEncoding ? null : declaredXmlEncoding(bytes);
  const sourceEncoding = bom?.encoding ?? signatureEncoding ?? declared ?? detectUndeclaredEncoding(bytes);
  let text: string;
  try {
    text = new TextDecoder(sourceEncoding, { fatal: true }).decode(bytes.subarray(bom?.skip ?? 0));
  } catch (reason) {
    throw new Error(`Corpus tekst nije moguće pročitati kao ${sourceEncoding}.`, { cause: reason });
  }
  text = text.replace(/^\uFEFF/, "");
  return { text: normalizeXmlDeclaration(text), sourceEncoding };
}

function xmlByteSignatureEncoding(bytes: Uint8Array): string | null {
  if (bytes[0] === 0x3c && bytes[1] === 0x00 && bytes[2] === 0x3f && bytes[3] === 0x00) return "utf-16le";
  if (bytes[0] === 0x00 && bytes[1] === 0x3c && bytes[2] === 0x00 && bytes[3] === 0x3f) return "utf-16be";
  return null;
}

function byteOrderMark(bytes: Uint8Array): { encoding: string; skip: number } | null {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { encoding: "utf-8", skip: 3 };
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { encoding: "utf-16le", skip: 2 };
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { encoding: "utf-16be", skip: 2 };
  return null;
}

function declaredXmlEncoding(bytes: Uint8Array): string | null {
  const prefix = new TextDecoder("windows-1252").decode(bytes.subarray(0, Math.min(bytes.length, 512)));
  const match = prefix.match(/^\s*<\?xml\b[^>]*\bencoding\s*=\s*["']([^"']+)["']/i);
  return match ? normalizeEncodingLabel(match[1]!) : null;
}

function detectUndeclaredEncoding(bytes: Uint8Array): string {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return "utf-8";
  } catch {
    return "windows-1250";
  }
}

function normalizeEncodingLabel(value: string): string {
  const label = value.trim().toLowerCase().replace(/_/g, "-");
  if (label === "utf8") return "utf-8";
  if (label === "cp1250" || label === "windows1250" || label === "win-1250") return "windows-1250";
  if (label === "utf16" || label === "utf-16") return "utf-16le";
  return label;
}

function normalizeXmlDeclaration(text: string): string {
  return text.replace(/^(\s*<\?xml\b[^>]*\bencoding\s*=\s*["'])[^"']+(["'][^>]*\?>)/i, "$1UTF-8$2");
}
