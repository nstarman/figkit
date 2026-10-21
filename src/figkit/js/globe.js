// A rotatable orthographic globe: a shaded region texture, lines and points (back half faint),
// and one draggable square marker per viewing direction. State lives in the model:
//   camera  number[9]  rows page-right, page-up, toward-viewer (data frame); written on rotate
//   views   {id: [x, y, z]}  unit viewing directions; written when a marker is dragged
// A view and its antipode are equivalent: a marker is drawn on the camera-facing end, and a drag
// keeps the view on its own end of the line.

import { createStage, dragHelper } from "figkit/stage.js";
import { mat3, trackball, project, unproject, facing, unit, dot } from "figkit/geom.js";

const DRAG_STEP = 3; // shading resolution divisor while rotating

/**
 * Shade the front hemisphere into `out` (RGBA, size×size): texture sampled at each pixel's
 * direction, composited over white, with gentle limb darkening. Pixels outside the disc are left
 * untouched. `step` > 1 samples every step-th pixel and fills blocks (fast, for dragging).
 * texture: {data: Uint8Array, shape: [H, W, 4]}, rows colatitude 0..π, columns azimuth 0..2π.
 */
export function shade(camera, texture, size, out, step = 1) {
  const [H, W] = texture.shape, tex = texture.data, half = size / 2;
  const r0 = mat3.row(camera, 0), r1 = mat3.row(camera, 1), r2 = mat3.row(camera, 2);
  for (let by = 0; by < size; by += step) for (let bx = 0; bx < size; bx += step) {
    const sx = Math.min(bx + (step >> 1), size - 1), sy = Math.min(by + (step >> 1), size - 1);
    const u = (sx + 0.5 - half) / half, v = -(sy + 0.5 - half) / half, rr = u * u + v * v;
    if (rr > 1 && step === 1) continue;
    const w = Math.sqrt(Math.max(0, 1 - rr));
    const px = r0[0] * u + r1[0] * v + r2[0] * w, py = r0[1] * u + r1[1] * v + r2[1] * w;
    const pz = r0[2] * u + r1[2] * v + r2[2] * w;
    const i = Math.round(Math.acos(Math.max(-1, Math.min(1, pz))) / Math.PI * (H - 1));
    const az = (Math.atan2(py, px) + 2 * Math.PI) % (2 * Math.PI);
    const t = 4 * (i * W + Math.round(az / (2 * Math.PI) * (W - 1)));
    const a = tex[t + 3] / 255, limb = 0.86 + 0.14 * w;
    const rgb = [0, 1, 2].map((c) => limb * ((1 - a) * 255 + a * tex[t + c]));
    for (let y = by; y < Math.min(by + step, size); y++) for (let x = bx; x < Math.min(bx + step, size); x++) {
      const uu = (x + 0.5 - half) / half, vv = -(y + 0.5 - half) / half;
      if (uu * uu + vv * vv > 1) continue;
      const o = 4 * (y * size + x);
      out[o] = rgb[0]; out[o + 1] = rgb[1]; out[o + 2] = rgb[2]; out[o + 3] = 255;
    }
  }
  return out;
}

const triples = ({ data }) => Array.from({ length: data.length / 3 }, (_, i) => [data[3 * i], data[3 * i + 1], data[3 * i + 2]]);

function inside(poly, x, y) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/**
 * opts: texture, lines {id: {data, shape:[n,3]}} (globe radius 1), points {id: …} (optional),
 * colors {id: css colour}, markerAxes(id, view) → [ex, ey] tangent axes of the square,
 * markerSizeDeg (half-width of a square, degrees on the sphere).
 */
export function mount(el, model, { texture, lines = {}, points = {}, colors = {}, markerAxes, markerSizeDeg = 5.5 }) {
  const box = document.createElement("div");
  box.className = "fk-plot fk-globe";
  box.style.cursor = "grab";
  el.appendChild(box);
  const L = Object.fromEntries(Object.entries(lines).map(([k, v]) => [k, triples(v)]));
  const P = Object.fromEntries(Object.entries(points).map(([k, v]) => [k, triples(v)]));
  const H = Math.tan(markerSizeDeg * Math.PI / 180);
  const shadeCanvas = document.createElement("canvas");
  let geo = { cx: 0, cy: 0, r: 0 }, shadeKey = null, rotating = false, squares = [];

  const stage = createStage(box, {
    onResize(s) {
      const size = Math.min(s.width, s.height);
      geo = { cx: s.width / 2, cy: s.height / 2, r: 0.46 * size };
      Object.assign(s.canvas.dataset, { cx: geo.cx, cy: geo.cy, r: geo.r });
      shadeKey = null;
    },
    draw,
  });

  function drawShade(camera) {
    const step = rotating ? DRAG_STEP : 1;
    const n = Math.max(2, Math.round(2 * geo.r * stage.dpr));
    const key = `${camera.join()}|${n}|${step}`;
    if (key === shadeKey) return;
    shadeKey = key;
    shadeCanvas.width = shadeCanvas.height = n;
    const g = shadeCanvas.getContext("2d"), img = g.createImageData(n, n);
    shade(camera, texture, n, img.data, step);
    g.putImageData(img, 0, 0);
  }

  function draw({ ctx, width, height }) {
    const camera = model.get("camera"), views = model.get("views") ?? {};
    const P3 = (p) => project(camera, p, geo);
    ctx.clearRect(0, 0, width, height);
    drawShade(camera);
    ctx.drawImage(shadeCanvas, geo.cx - geo.r, geo.cy - geo.r, 2 * geo.r, 2 * geo.r);
    ctx.beginPath(); ctx.arc(geo.cx, geo.cy, geo.r, 0, 2 * Math.PI);
    ctx.strokeStyle = "#999"; ctx.lineWidth = 1; ctx.stroke();

    // principal-plane great circles and the a, b, c axes
    ctx.lineWidth = 0.6;
    for (const k of [0, 1, 2]) {
      ctx.beginPath();
      for (let t = 0; t <= 200; t++) {
        const p = [0, 0, 0], th = 2 * Math.PI * t / 200;
        p[(k + 1) % 3] = Math.cos(th); p[(k + 2) % 3] = Math.sin(th);
        const [x, y] = P3(p);
        t ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = "rgba(120,120,120,0.6)"; ctx.stroke();
      const e = [0, 0, 0]; e[k] = 1.12;
      const [x0, y0] = P3([0, 0, 0]), [x1, y1] = P3(e);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = "#333"; ctx.stroke();
      ctx.fillStyle = "#333"; ctx.font = "13px serif"; ctx.fillText("abc"[k], x1 + 4, y1);
    }

    // streams: back half faint, front half strong
    for (const id of Object.keys(L)) {
      ctx.fillStyle = colors[id] ?? "#555";
      for (const p of P[id] ?? []) {
        const [x, y, z] = P3(p);
        ctx.globalAlpha = z >= 0 ? 0.35 : 0.12; ctx.fillRect(x, y, 1, 1);
      }
      ctx.strokeStyle = colors[id] ?? "#555"; ctx.lineWidth = 1.6;
      for (const front of [false, true]) {
        ctx.globalAlpha = front ? 0.95 : 0.3; ctx.beginPath();
        for (let i = 1; i < L[id].length; i++) {
          const a = P3(L[id][i - 1]), b = P3(L[id][i]);
          if ((a[2] + b[2] >= 0) === front) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // viewing-direction squares, on the camera-facing end of each line
    squares = Object.entries(views).map(([id, view]) => {
      const n = facing(camera, view);
      const [ex, ey] = markerAxes ? markerAxes(id, view) : [mat3.row(camera, 0), mat3.row(camera, 1)];
      const poly = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) =>
        P3(unit([0, 1, 2].map((k) => n[k] + H * (i * ex[k] + j * ey[k])))));
      ctx.beginPath(); poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = colors[id] ?? "#555"; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = "#000"; ctx.lineWidth = 1.2; ctx.stroke();
      return { id, poly };
    });
  }

  let sign = 1;
  const undrag = dragHelper(stage.canvas, {
    hitTest: (x, y) => [...squares].reverse().find((s) => inside(s.poly, x, y))?.id ?? null,
    onStart(target) {
      if (target === null) { rotating = true; box.style.cursor = "grabbing"; return; }
      sign = dot(mat3.row(model.get("camera"), 2), model.get("views")[target]) < 0 ? -1 : 1;
    },
    onMove(target, dx, dy, x, y) {
      if (target === null) {
        model.set("camera", trackball(model.get("camera"), dx, dy, geo.r));
      } else {
        const v = unproject(model.get("camera"), x, y, geo).map((c) => sign * c);
        model.set("views", { ...model.get("views"), [target]: v });
      }
    },
    onEnd(target) {
      if (target === null) { rotating = false; box.style.cursor = "grab"; stage.requestDraw(); }
      model.save_changes();
    },
  });

  const redraw = () => stage.requestDraw();
  model.on("change:camera", redraw);
  model.on("change:views", redraw);
  return () => {
    model.off("change:camera", redraw);
    model.off("change:views", redraw);
    undrag();
    stage.dispose();
    box.remove();
  };
}
