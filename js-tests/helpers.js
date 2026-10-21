// Shared helpers for the JS tests.
import { readFileSync } from "node:fs";

export const FIXTURES = new URL("./fixtures/", import.meta.url);
export const read = (name) => {
  const b = readFileSync(new URL(name, FIXTURES));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
export const expected = () => JSON.parse(readFileSync(new URL("expected.json", FIXTURES), "utf8"));

// fetch over the fixtures folder, for loadData
export const fixtureFetch = async (url) => {
  const name = String(url).replace(/^.*?fixtures\//, "").replace(/^data\//, "");
  try {
    const buf = read(name);
    return { ok: true, status: 200, arrayBuffer: async () => buf, json: async () => JSON.parse(new TextDecoder().decode(buf)) };
  } catch {
    return { ok: false, status: 404, arrayBuffer: async () => { throw new Error("404"); }, json: async () => { throw new Error("404"); } };
  }
};
