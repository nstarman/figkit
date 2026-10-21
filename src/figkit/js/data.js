// Load a figkit dataset (manifest.json + .npy files) into typed arrays — the same result from a
// served folder, from the data: URLs of a single-file build, or from a notebook model.

import { parseNpy, asTyped } from "figkit/npy.js";

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
 * single-file build, or a model holding `manifest` and `npy_<entry>` / `json_<entry>` values.
 */
export async function loadData(source, { fetch = globalThis.fetch, base = "data/" } = {}) {
  if (source && typeof source.get === "function") return fromModel(source);
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
  const out = result(manifest);
  for (const [key, e] of Object.entries(manifest.entries)) {
    if (e.kind === "json") { out.json[key] = model.get(`json_${key}`); continue; }
    const raw = model.get(`npy_${key}`);
    if (!raw) throw new FigkitDataError(`the widget is missing array ${key}`);
    const view = raw instanceof DataView ? raw : new DataView(raw.buffer ?? raw);
    const parsed = parseNpy(asTyped(view, "|u1").slice().buffer);
    out.arrays[key] = parsed;
  }
  return out;
}
