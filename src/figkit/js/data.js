// Load a figkit dataset (manifest.json + .npy files) into typed arrays — the same result from a
// served folder, from the data: URLs of a single-file build, or from a notebook model.

import { parseNpy } from "figkit/npy.js";

export const FORMAT = 1; // figkit_data major this library reads

export class FigkitDataError extends Error {
  constructor(message) { super(message); this.name = "FigkitDataError"; }
}

function check(manifest, where) {
  if (manifest.figkit_data !== FORMAT) {
    throw new FigkitDataError(`${where}: dataset has figkit_data ${manifest.figkit_data}, `
      + `this figkit reads figkit_data ${FORMAT}; re-export it with the matching figkit version`);
  }
}

const result = (m) => ({ name: m.name, meta: m.meta ?? {}, arrays: {}, json: {} });

/**
 * source: a dataset name (fetched from `${base}${name}/`), {name, urls: {file: url}} from a
 * single-file build, or a notebook model holding `manifest`, `arrays` (entry → .npy bytes) and `json`.
 */
export async function loadData(source, { fetch = globalThis.fetch, base = "data/" } = {}) {
  if (source && typeof source.get === "function") return fromModel(source);
  // a single-file build registers its datasets as data: URLs on globalThis.FIGKIT_DATA
  if (typeof source === "string" && globalThis.FIGKIT_DATA?.[source]) source = globalThis.FIGKIT_DATA[source];
  const [name, urlOf] = typeof source === "string"
    ? [source, (f) => `${base}${source}/${f}`]
    : [source.name, (f) => source.urls[f]];
  const get = async (file, kind) => {
    const url = urlOf(file);
    let res;
    try { res = url && await fetch(url); } catch { res = null; }
    if (!res?.ok) throw new FigkitDataError(`could not load ${name}/${file}; run the export for dataset "${name}" and rebuild`);
    return kind === "json" ? res.json() : res.arrayBuffer();
  };
  const manifest = await get("manifest.json", "json");
  check(manifest, `${name}/manifest.json`);
  const out = result(manifest);
  await Promise.all(Object.entries(manifest.entries).map(async ([key, e]) => {
    if (e.kind === "json") out.json[key] = await get(e.file, "json");
    else out.arrays[key] = parseNpy(await get(e.file, "binary"));
  }));
  return out;
}

function fromModel(model) {
  const manifest = model.get("manifest");
  if (!manifest) throw new FigkitDataError("the widget has no dataset (manifest is missing)");
  check(manifest, "widget manifest");
  const out = result(manifest), arrays = model.get("arrays") ?? {}, json = model.get("json") ?? {};
  for (const [key, e] of Object.entries(manifest.entries)) {
    if (e.kind === "json") { out.json[key] = json[key]; continue; }
    const raw = arrays[key];
    if (!raw) throw new FigkitDataError(`the widget is missing array ${key}`);
    // notebooks deliver DataViews, possibly unaligned: copy the bytes once, then view them
    const bytes = raw instanceof DataView ? new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
      : new Uint8Array(raw.buffer ?? raw);
    out.arrays[key] = parseNpy(bytes.slice().buffer);
  }
  return out;
}
