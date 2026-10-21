// The app. An anywidget module: the same file runs on the web page (figkit's `run`) and in
// Jupyter/marimo (figkit.anywidget.Widget). Compose figkit components here; keep science in science.js.
import { loadData } from "figkit/data.js";
import { mount as mountPanel } from "figkit/skypanel.js";
import { project } from "app/science.js";

export default {
  async render({ model, el, signal }) {
    const source = model.get("manifest") ? model : (model.get("data_source") ?? "points");
    const data = await loadData(source, { base: model.get("data_base") ?? "data/" });
    const xyz = data.arrays.xyz.data;
    const initial = () => ({ main: data.meta.view.slice() });
    if (!Object.keys(model.get("views") ?? {}).length) model.set("views", initial());
    model.save_changes();

    el.classList.add("fk-app");
    const toolbar = document.createElement("div");
    toolbar.className = "fk-toolbar";
    const slider = Object.assign(document.createElement("input"), { type: "range", min: 0, max: 180, value: 0 });
    slider.oninput = () => { // tilt the view away from +z; replace the value, never mutate it
      const a = slider.value * Math.PI / 180;
      model.set("views", { main: [Math.sin(a), 0, Math.cos(a)] });
    };
    slider.onchange = () => model.save_changes(); // notebooks: sync once, at the end of the interaction
    const reset = Object.assign(document.createElement("button"), { textContent: "Reset" });
    reset.onclick = () => { slider.value = 0; model.set("views", initial()); model.save_changes(); };
    toolbar.append("Tilt", slider, reset);
    const panel = document.createElement("div");
    panel.style.maxWidth = "420px";
    el.replaceChildren(toolbar, panel);

    const dispose = mountPanel(panel, model, { id: "main", title: data.meta.title, compute: (view) => project(xyz, view) });
    signal?.addEventListener("abort", dispose);
  },
};
