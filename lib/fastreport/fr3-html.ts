import type { RenderedObject, RenderedPage, RenderedStyle } from "./fr3-layout.ts";

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const px = (value: number) => `${Math.round(value * 100) / 100}px`;

export function memoCss(style: RenderedStyle): string {
  const border = (on: boolean) => on ? `${style.frame.width}px solid ${style.frame.color}` : "0";
  const justify = style.vAlign === "center" ? "center" : style.vAlign === "bottom" ? "flex-end" : "flex-start";
  return [
    `font-family:'${style.fontName}',Arial,sans-serif`, `font-size:${style.fontSize}px`, `color:${style.color}`,
    style.bold ? "font-weight:700" : "", style.italic ? "font-style:italic" : "", style.underline ? "text-decoration:underline" : "",
    style.fill ? `background:${style.fill}` : "",
    `border-left:${border(style.frame.left)}`, `border-right:${border(style.frame.right)}`, `border-top:${border(style.frame.top)}`, `border-bottom:${border(style.frame.bottom)}`,
    `text-align:${style.hAlign}`, `justify-content:${justify}`, `white-space:${style.wordWrap ? "pre-wrap" : "pre"}`,
  ].filter(Boolean).join(";");
}

function objectHtml(object: RenderedObject): string {
  const box = `left:${px(object.left)};top:${px(object.top)};width:${px(object.width)};height:${px(object.height)}`;
  switch (object.kind) {
    case "memo":
      if (!object.text && !object.style.fill && !object.style.frame.left && !object.style.frame.right && !object.style.frame.top && !object.style.frame.bottom) return "";
      return `<div class="fr-memo" style="${box};${memoCss(object.style)}"><span>${escapeHtml(object.text)}</span></div>`;
    case "line": {
      const width = Math.max(object.width, 0), height = Math.max(object.height, 0);
      return `<svg class="fr-line" style="left:${px(object.left)};top:${px(object.top)}" width="${Math.max(width, 1) + 1}" height="${Math.max(height, 1) + 1}"><line x1="0" y1="0.5" x2="${width}" y2="${height + 0.5}" stroke="${object.color}" stroke-width="${object.lineWidth}"/></svg>`;
    }
    case "shape": {
      const frame = `${object.style.frame.width}px solid ${object.style.frame.color}`;
      const radius = object.shape === "skEllipse" ? "border-radius:50%" : object.shape === "skRoundRectangle" ? "border-radius:8px" : "";
      return `<div class="fr-shape" style="${box};border:${frame};${object.style.fill ? `background:${object.style.fill};` : ""}${radius}"></div>`;
    }
    case "gradient":
      return `<div class="fr-gradient" style="${box};background:linear-gradient(${object.vertical ? "to bottom" : "to right"},${object.from},${object.to})"></div>`;
    case "picture": {
      const image = `<img class="fr-picture" style="width:100%;height:${px(object.height)}" alt="" src="data:${object.mime};base64,${object.base64}">`;
      const visible = object.clipHeight !== undefined ? object.clipHeight : object.height;
      return `<div class="fr-clip" style="left:${px(object.left)};top:${px(object.top)};width:${px(object.width)};height:${px(visible)}">${image}</div>`;
    }
  }
}

export const REPORT_CSS = `
body{margin:0;background:#9aa5ad;font-family:Arial,sans-serif}
.fr-page{position:relative;background:#fff;margin:12px auto;box-shadow:0 1px 6px rgba(0,0,0,.35);overflow:hidden;page-break-after:always;break-after:page}
.fr-page>*{position:absolute;box-sizing:border-box}
.fr-memo{display:flex;flex-direction:column;overflow:hidden;line-height:1.15;padding:1px 2px}
.fr-memo>span{display:block;width:100%}
.fr-clip{overflow:hidden}
.fr-picture{object-fit:contain;display:block}
.fr-line{overflow:visible}
@media print{body{background:#fff}.fr-page{margin:0;box-shadow:none}}
`;

/** Stranice u samostalan HTML dokument (prikaz u iframe-u i štampa). */
export function reportPagesToHtml(pages: readonly RenderedPage[], title = "Izvještaj"): string {
  const first = pages[0];
  const pageSize = first ? `@page{size:${Math.round(first.width)}px ${Math.round(first.height)}px;margin:0}` : "";
  const body = pages.map((page) => `<div class="fr-page" style="width:${px(page.width)};height:${px(page.height)}">${page.objects.map(objectHtml).join("")}</div>`).join("");
  return `<!doctype html><html lang="hr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${REPORT_CSS}${pageSize}</style></head><body>${body}</body></html>`;
}
