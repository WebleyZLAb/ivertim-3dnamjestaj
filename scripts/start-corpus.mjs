import { spawn, spawnSync } from "node:child_process";
import { access, appendFile, mkdir, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = "http://127.0.0.1:4317/";
const checkOnly = process.argv.includes("--provjera");
const logDirectory = path.join(process.env.LOCALAPPDATA || os.tmpdir(), "IVERTIM Corpus");
const logFile = path.join(logDirectory, "launcher.log");

await mkdir(logDirectory, { recursive: true });

try {
  assertSupportedNode();
  const nodeModulesReady = await exists(path.join(root, "node_modules"));
  const buildReady = await buildIsCurrent();
  await log(`Pokretanje: node_modules=${nodeModulesReady}, build=${buildReady}, provjera=${checkOnly}`);

  if (checkOnly) {
    const pnpm = runPnpm(["--version"], "pipe");
    if (pnpm.status !== 0) throw new Error("pnpm nije dostupan. Instaliraj Node.js sa Corepack/pnpm podrškom.");
    console.log(JSON.stringify({ ok: true, root, url, nodeModulesReady, buildReady, pnpm: pnpm.stdout.trim() }, null, 2));
    process.exit(0);
  }

  const live = await probeCorpus();
  if (live === "other") throw new Error(`Port ${new URL(url).port} koristi druga aplikacija. Zatvori je pa ponovo pokreni Corpus.`);

  if (!nodeModulesReady) runPnpmRequired(["install", "--frozen-lockfile"]);
  if (!buildReady) runPnpmRequired(["build"]);

  if (live !== "corpus") {
    const serverToken = randomUUID();
    const child = spawn(process.execPath, [path.join(root, "scripts", "serve-corpus.mjs")], {
      cwd: root,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: { ...process.env, IVERTIM_CORPUS_SERVER_TOKEN: serverToken },
    });
    child.unref();
    await waitForCorpus(60_000, serverToken);
  }

  openBrowser(url);
  await log("Corpus je spreman i preglednik je otvoren.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await log(`GREŠKA: ${message}`);
  console.error(message);
  process.exit(1);
}

async function buildIsCurrent() {
  const output = path.join(root, "dist", "index.html");
  if (!await exists(output)) return false;
  const outputTime = (await stat(output)).mtimeMs;
  const inputs = ["index.html", "package.json", "pnpm-lock.yaml", "tsconfig.json", "vite.config.ts", "src", "lib"];
  for (const input of inputs) if (await newestMtime(path.join(root, input)) > outputTime) return false;
  return true;
}

async function newestMtime(target) {
  const info = await stat(target);
  if (!info.isDirectory()) return info.mtimeMs;
  let newest = info.mtimeMs;
  for (const entry of await readdir(target, { withFileTypes: true })) {
    const value = await newestMtime(path.join(target, entry.name));
    if (value > newest) newest = value;
  }
  return newest;
}

async function exists(target) {
  try { await access(target, constants.F_OK); return true; } catch { return false; }
}

async function probeCorpus() {
  let response;
  try {
    response = await fetch(new URL("/__ivertim_corpus_health", url), { signal: AbortSignal.timeout(1_500), cache: "no-store" });
  } catch {
    return "offline";
  }
  try {
    const value = await response.json();
    return response.ok && value?.app === "ivertim-corpus-local-v1" && samePath(value.root, root) ? "corpus" : "other";
  } catch {
    return "other";
  }
}

async function waitForCorpus(timeoutMs, expectedToken) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let response;
    try {
      response = await fetch(new URL("/__ivertim_corpus_health", url), { signal: AbortSignal.timeout(1_500), cache: "no-store" });
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
      continue;
    }
    try {
      const value = await response.json();
      if (response.ok && value?.app === "ivertim-corpus-local-v1" && value.token === expectedToken && samePath(value.root, root)) return;
    } catch {
      // Odgovarajući port bez našeg JSON ugovora pripada drugoj aplikaciji.
    }
    throw new Error("Pokrenuti port je preuzela druga aplikacija.");
  }
  throw new Error(`Corpus se nije javio na ${url} u roku od ${Math.round(timeoutMs / 1000)} sekundi.`);
}

function runPnpmRequired(args) {
  const result = runPnpm(args, "inherit");
  if (result.status !== 0) throw new Error(`pnpm ${args[0]} nije uspio (izlazni kod ${result.status ?? "nepoznat"}).`);
}

function runPnpm(args, stdio) {
  const invocation = pnpmInvocation();
  return spawnSync(invocation.command, [...invocation.prefix, ...args], { cwd: root, encoding: "utf8", shell: process.platform === "win32", stdio, windowsHide: true });
}

function pnpmInvocation() {
  if (commandAvailable("pnpm")) return { command: process.platform === "win32" ? "pnpm.cmd" : "pnpm", prefix: [] };
  if (commandAvailable("corepack")) return { command: process.platform === "win32" ? "corepack.cmd" : "corepack", prefix: ["pnpm"] };
  return { command: process.platform === "win32" ? "pnpm.cmd" : "pnpm", prefix: [] };
}

function commandAvailable(command) {
  const lookup = process.platform === "win32"
    ? spawnSync("where.exe", [command], { stdio: "ignore", windowsHide: true })
    : spawnSync("sh", ["-c", `command -v "$1"`, "sh", command], { stdio: "ignore" });
  return lookup.status === 0;
}

function samePath(left, right) {
  const normalize = (value) => path.resolve(String(value)).replace(/[\\/]+$/, "").toLocaleLowerCase("en-US");
  return normalize(left) === normalize(right);
}

function openBrowser(target) {
  if (process.platform === "win32") {
    const child = spawn("cmd.exe", ["/d", "/s", "/c", "start", "", target], { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
    return;
  }
  const command = process.platform === "darwin" ? "open" : "xdg-open";
  const child = spawn(command, [target], { detached: true, stdio: "ignore" });
  child.unref();
}

async function log(message) {
  await appendFile(logFile, `${new Date().toISOString()} ${message}\n`, "utf8");
}

function assertSupportedNode() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  const supported = major > 22 || major === 22 && minor >= 12 || major === 20 && minor >= 19;
  if (!supported) throw new Error(`Node.js ${process.versions.node} nije podržan. Instaliraj Node.js 20.19+ ili 22.12+ pa ponovo pokreni Corpus.`);
}
