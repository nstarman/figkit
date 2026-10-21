// The globe example app. It is an anywidget module, so the same file runs on the web page
// (through figkit's `run`) and in Jupyter/marimo (through figkit.anywidget.Widget).

import { loadData } from "figkit/data.js";
import { mount as mountGlobe } from "figkit/globe.js";
import { mount as mountPanel } from "figkit/skypanel.js";
import { streamFromData, classify, markerAxes } from "app/science.js";

export default {
  async render({ model, el, signal }) {
    const source = model.get("manifest") ? model : (model.get("data_source") ?? "globe");
    const data = await loadData(source, { base: model.get("data_base") ?? "data/" });
    const { meta, arrays } = data;
    const streams = Object.fromEntries(meta.streams.map((s) => [s.id, streamFromData(data, s.id)]));
    const paperViews = () => Object.fromEntries(meta.streams.map((s) => [s.id, s.view.slice()]));
    const colors = Object.fromEntries(meta.streams.map((s) => [s.id, s.color]));
    if (!(model.get("camera")?.length === 9)) model.set("camera", meta.camera.slice());
    if (!Object.keys(model.get("views") ?? {}).length) model.set("views", paperViews());
    model.save_changes();

    el.classList.add("fk-app");
    el.dataset.figkitApp = "";
    const toolbar = document.createElement("div");
    toolbar.className = "fk-toolbar";
    const button = (label, fn) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.onclick = () => { fn(); model.save_changes(); };
      return b;
    };
    toolbar.append(
      button("Reset camera", () => model.set("camera", meta.camera.slice())),
      button("Reset views", () => model.set("views", paperViews())),
      "Drag the globe to turn it; drag a square to view that stream from there. Red: non-concave.",
    );
    const grid = document.createElement("div");
    grid.className = "fk-grid";
    grid.style.gridTemplateColumns = "minmax(280px, 1.4fr) minmax(320px, 1fr)";
    const globeEl = document.createElement("div");
    const panels = document.createElement("div");
    panels.className = "fk-grid";
    panels.style.gridTemplateColumns = "1fr 1fr";
    grid.append(globeEl, panels);
    el.replaceChildren(toolbar, grid);

    const disposers = [mountGlobe(globeEl, model, {
      texture: arrays.texture,
      lines: Object.fromEntries(meta.streams.map((s) => [s.id, arrays[`${s.id}_globe_line`]])),
      points: Object.fromEntries(meta.streams.map((s) => [s.id, arrays[`${s.id}_globe_points`]])),
      colors,
      markerAxes: (id, view) => markerAxes(streams[id], view),
      markerSizeDeg: meta.cap_deg,
    })];
    for (const s of meta.streams) {
      const panel = document.createElement("div");
      panels.appendChild(panel);
      disposers.push(mountPanel(panel, model, {
        id: s.id, title: s.name, color: s.color, compute: (view) => classify(streams[s.id], view),
      }));
    }
    signal?.addEventListener("abort", () => disposers.forEach((d) => d()));
  },
};
