const WINDOWS_RESERVED_STEM = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

export function corpusSafeFileStem(value: string, fallback = "IVERTIM"): string {
  let stem = sanitize(value).replace(/\s+/g, "-");
  stem = trimWindowsEnding(stem).replace(/^-+|-+$/g, "");
  if (!stem) stem = sanitize(fallback) || "IVERTIM";
  if (WINDOWS_RESERVED_STEM.test(stem)) stem = `IVERTIM-${stem}`;
  stem = trimWindowsEnding([...stem].slice(0, 120).join(""));
  return stem || "IVERTIM";
}

export function corpusSafeDownloadFileName(value: string): string {
  const normalized = sanitize(value);
  const dot = normalized.lastIndexOf(".");
  const hasExtension = dot > 0 && dot < normalized.length - 1;
  const rawStem = hasExtension ? normalized.slice(0, dot) : normalized;
  const extension = hasExtension ? normalized.slice(dot + 1).replace(/[^a-z0-9_-]/gi, "") : "";
  const stem = corpusSafeFileStem(rawStem);
  return extension ? `${stem}.${extension.slice(0, 16)}` : stem;
}

function sanitize(value: string): string {
  return value.normalize("NFC").replace(/[<>:"/\\|?*\x00-\x1f]/g, "-");
}

function trimWindowsEnding(value: string): string {
  return value.replace(/[ .]+$/g, "");
}
