// Test app for the globe's `directed` option: one view on the front hemisphere, one on the back,
// an empty texture and an upright camera (identity), with the Mollweide inset. The smoke tests
// drive it; the model is on the globe's canvas as `appModel`, the geometry helpers on `window.geom`.

import { mount as mountGlobe } from "figpress-apps/globe.js";
import * as geom from "figpress-apps/geom.js";

export const FRONT = geom.unit([0.3, 0.5, 0.81]), BACK = geom.unit([-0.4, -0.3, -0.866]);

export default {
  render({ model, el, signal }) {
    window.geom = geom;
    model.set("camera", geom.mat3.identity());
    model.set("views", { front: FRONT, back: BACK });
    const globeEl = document.createElement("div");
    globeEl.style.cssText = "width:500px;height:500px";
    el.replaceChildren(globeEl);
    const dispose = mountGlobe(globeEl, model, {
      texture: { data: new Uint8Array(3 * 5 * 4), shape: [3, 5, 4] }, // transparent: the page background
      colors: { front: "#0000ff", back: "#ff00ff" },
      mollweide: true,
      directed: true,
    });
    signal?.addEventListener("abort", dispose);
  },
};
