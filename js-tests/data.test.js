import { test } from "node:test";
import assert from "node:assert/strict";
import { loadData, FigkitDataError } from "figkit/data.js";
import { read, fixtureFetch } from "./helpers.js";

const b64 = (buf) => Buffer.from(buf).toString("base64");

test("loads a dataset by name", async () => {
  const d = await loadData("ds", { fetch: fixtureFetch, base: "fixtures/" });
  assert.equal(d.name, "ds");
  assert.deepEqual(d.meta, { title: "fixture" });
  assert.deepEqual(d.arrays.track.shape, [5, 3]);
  assert.equal(d.arrays.track.dtype, "<f4");
  assert.deepEqual(d.json.style, { color: "#123456" });
});

test("loads from a data:-URL map (single-file build)", async () => {
  const files = ["manifest.json", "track.npy", "flag.npy", "style.json"];
  const urls = Object.fromEntries(files.map((f) => [f, `data:application/octet-stream;base64,${b64(read(`ds/${f}`))}`]));
  const d = await loadData({ name: "ds", urls });
  assert.deepEqual(Array.from(d.arrays.flag.data), [1, 0, 0, 1, 0]);
});

test("errors name the missing file and version mismatch", async () => {
  await assert.rejects(loadData("nope", { fetch: fixtureFetch, base: "fixtures/" }),
    (e) => e instanceof FigkitDataError && /nope\/manifest\.json/.test(e.message));
  const m = JSON.parse(new TextDecoder().decode(read("ds/manifest.json")));
  const bad = { ...m, figkit_data: 2 };
  const fetch2 = async (url) => (String(url).endsWith("manifest.json")
    ? { ok: true, json: async () => bad } : fixtureFetch(url));
  await assert.rejects(loadData("ds", { fetch: fetch2, base: "fixtures/" }),
    (e) => e instanceof FigkitDataError && /figkit_data 2/.test(e.message) && /1/.test(e.message));
});
