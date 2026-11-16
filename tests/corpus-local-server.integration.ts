import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
// Server ostaje obični .mjs jer launcher podržava i Node 20; ugovor se provjerava ovim integracionim testom.
// @ts-expect-error Lokalni JavaScript server nema zaseban objavljeni declaration paket.
import { createCorpusServer } from "../scripts/serve-corpus.mjs";

test("lokalni server dokazuje identitet i odbija nedozvoljene zahtjeve", async () => {
  const token = `test-${process.pid}-${Date.now()}`;
  const root = path.resolve(import.meta.dirname, "..");
  const server = createCorpusServer({ root, token });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Testni server nema TCP adresu.");
  const port = address.port;
  try {
    const healthResponse = await fetch(`http://127.0.0.1:${port}/__ivertim_corpus_health`, { cache: "no-store" });
    assert.equal(healthResponse.status, 200);
    assert.equal(healthResponse.headers.get("x-content-type-options"), "nosniff");
    const health = await healthResponse.json();
    assert.deepEqual({ app: health.app, root: health.root, pid: health.pid, token: health.token }, {
      app: "ivertim-corpus-local-v1", root, pid: process.pid, token,
    });

    const head = await fetch(`http://127.0.0.1:${port}/__ivertim_corpus_health`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    assert.equal((await fetch(`http://127.0.0.1:${port}/__ivertim_corpus_health`, { method: "POST" })).status, 405);
    assert.equal((await fetch(`http://127.0.0.1:${port}/%2e%2e%5cpackage.json`)).status, 403);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error: Error | undefined) => error ? reject(error) : resolve()));
  }
});
