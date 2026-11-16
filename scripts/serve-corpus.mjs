import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(scriptFile), "..");

export function createCorpusServer({ root = defaultRoot, host = "127.0.0.1", token = "manual" } = {}) {
  const dist = path.join(root, "dist");
  return http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${host}`);
    if (request.method !== "GET" && request.method !== "HEAD") return text(response, 405, "Method Not Allowed");
    if (url.pathname === "/__ivertim_corpus_health") {
      return json(response, 200, { app: "ivertim-corpus-local-v1", root, pid: process.pid, token }, request.method === "HEAD");
    }
    const requested = decodeURIComponent(url.pathname);
    const relative = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
    let target = safeTarget(relative);
    let info = await fileInfo(target);
    if (!info?.isFile() && !path.extname(relative)) {
      target = path.join(dist, "index.html");
      info = await fileInfo(target);
    }
    if (!info?.isFile()) return text(response, 404, "Not Found");
    response.writeHead(200, securityHeaders(target));
    if (request.method === "HEAD") return response.end();
    createReadStream(target).on("error", () => response.destroy()).pipe(response);
  } catch (error) {
    const status = error instanceof URIError ? 400 : error instanceof RangeError ? 403 : 500;
    text(response, status, status === 400 ? "Bad Request" : status === 403 ? "Forbidden" : "Internal Server Error");
  }
  });

  function safeTarget(relative) {
    const target = path.resolve(dist, relative);
    if (target !== dist && !target.startsWith(`${dist}${path.sep}`)) throw new RangeError("Putanja izlazi iz dist foldera.");
    return target;
  }

  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptFile) {
  const host = "127.0.0.1";
  const port = serverPort(process.env.IVERTIM_CORPUS_SERVER_PORT);
  const server = createCorpusServer({ root: defaultRoot, host, token: process.env.IVERTIM_CORPUS_SERVER_TOKEN || "manual" });
  server.listen(port, host);
  server.on("error", (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
}

async function fileInfo(target) {
  try { return await stat(target); } catch { return null; }
}

function securityHeaders(target) {
  const extension = path.extname(target).toLowerCase();
  const contentTypes = new Map([
    [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"], [".css", "text/css; charset=utf-8"],
    [".json", "application/json; charset=utf-8"], [".svg", "image/svg+xml"], [".png", "image/png"], [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"], [".webp", "image/webp"], [".gif", "image/gif"], [".ico", "image/x-icon"], [".woff2", "font/woff2"],
  ]);
  const immutableAsset = target.includes(`${path.sep}assets${path.sep}`);
  return {
    "Content-Type": contentTypes.get(extension) || "application/octet-stream",
    "Cache-Control": immutableAsset ? "public, max-age=31536000, immutable" : "no-store",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

function json(response, status, value, head = false) {
  response.writeHead(status, { ...securityHeaders("health.json"), "Cache-Control": "no-store" });
  response.end(head ? undefined : JSON.stringify(value));
}

function text(response, status, value) {
  response.writeHead(status, { ...securityHeaders("error.txt"), "Cache-Control": "no-store" });
  response.end(value);
}

function serverPort(value) {
  if (value === undefined || value === "") return 4317;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error("IVERTIM_CORPUS_SERVER_PORT mora biti cijeli broj od 1 do 65535.");
  return parsed;
}
