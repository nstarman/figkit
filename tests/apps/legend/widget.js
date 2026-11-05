// Test app for figpress-apps/legend.js: a legend of a plain entry, two toggles and two cards over a
// small SVG plot. The smoke tests drive it; the model is on the app element as `appModel`.

import { mount as mountLegend } from "figpress-apps/legend.js";

const SVG = "http://www.w3.org/2000/svg";
const swatch = (color, dash = "") => {
  const s = document.createElementNS(SVG, "svg");
  s.setAttribute("width", 30); s.setAttribute("height", 12); s.setAttribute("aria-hidden", "true");
  s.innerHTML = `<line x1="0" x2="30" y1="6" y2="6" stroke="${color}" stroke-width="2" stroke-dasharray="${dash}"/>`;
  return s;
};

export default {
  render({ model, el, signal }) {
    el.classList.add("fk-app");
    el.appModel = model;
    if (model.get("width") === undefined) model.set("width", 2);

    const plot = document.createElementNS(SVG, "svg");
    plot.setAttribute("viewBox", "0 0 200 60"); plot.setAttribute("width", "100%"); plot.id = "plot";
    const line = (id, y, color) => {
      const l = document.createElementNS(SVG, "line");
      Object.entries({ id, x1: 10, x2: 190, y1: y, y2: y, stroke: color }).forEach(([k, v]) => l.setAttribute(k, v));
      plot.append(l);
      return l;
    };
    const la = line("line-a", 20, "#3b6ea8"), lb = line("line-b", 40, "#c0392b");
    const draw = () => {
      la.style.display = model.get("a") === false ? "none" : "";
      lb.style.display = model.get("b") === false ? "none" : "";
      la.setAttribute("stroke-width", model.get("width")); lb.setAttribute("stroke-width", model.get("width"));
    };

    // card 1: a slider; card 2: an area that is busy while a pointer drag is in progress
    const slider = Object.assign(document.createElement("input"), { type: "range", min: 1, max: 8, step: 1, value: model.get("width"), id: "width" });
    slider.oninput = () => model.set("width", +slider.value);
    slider.onchange = () => model.save_changes();
    const card1 = document.createElement("div");
    card1.append("width ", slider);
    let dragging = false;
    const area = Object.assign(document.createElement("div"), { id: "drag-area", textContent: "drag here" });
    area.style.cssText = "width:120px;height:60px;background:var(--fk-line);touch-action:none";
    area.onpointerdown = (e) => { dragging = true; area.setPointerCapture(e.pointerId); };
    area.onpointerup = () => { dragging = false; };
    const card2 = document.createElement("div");
    card2.append(area);

    const legendEl = document.createElement("div");
    const disposeLegend = mountLegend(legendEl, model, {
      entries: [
        { icon: swatch("#888"), label: "plain" },
        { icon: swatch("#3b6ea8"), label: "line a", toggle: "a", title: "Show or hide line a" },
        { icon: swatch("#c0392b", "4 2"), label: "line b", toggle: "b" },
        { icon: swatch("#3b6ea8"), label: "width", card: card1, title: "Set the line width" },
        { icon: swatch("#555"), label: "drag", card: card2, busy: () => dragging },
      ],
    });

    const setA = Object.assign(document.createElement("button"), { id: "set-a", textContent: "set a from outside" });
    setA.onclick = () => { model.set("a", model.get("a") === false); model.save_changes(); };

    model.on("change:a", draw); model.on("change:b", draw); model.on("change:width", draw);
    draw();
    el.replaceChildren(legendEl, plot, setA);
    signal.addEventListener("abort", () => {
      disposeLegend();
      model.off("change:a", draw); model.off("change:b", draw); model.off("change:width", draw);
      el.replaceChildren();
    });
  },
};
