# Components and the model

Every component: `mount(el, model, opts) → dispose`. It renders into `el`, listens to model keys
and removes its listeners on dispose. Mount several components on one model to link them.

## figkit/globe.js — `mount(el, model, opts)`

| Option | Meaning |
|---|---|
| `texture` | `{data: Uint8Array, shape: [H, W, 4]}` RGBA, rows colatitude 0..π, columns azimuth 0..2π (inclusive) |
| `lines` | `{id: {data, shape: [n, 3]}}` in globe units (radius 1); back half drawn faint |
| `points` | `{id: {data, shape: [m, 3]}}`, optional |
| `colors` | `{id: css colour}` |
| `markerAxes` | `(id, view) → [ex, ey]` tangent axes of id's square (globe frame); default: screen axes |
| `markerSizeDeg` | half-width of a square in degrees (default 5.5) |

Model: reads/writes `camera` (rotate by dragging the background) and `views`
(`{id: [x, y, z]}`, drag a square). Calls `save_changes()` on pointer-up.
Pure kernel: `shade(camera, texture, size, out, step = 1)`.

## figkit/skypanel.js — `mount(el, model, opts)`

| Option | Meaning |
|---|---|
| `id` | key into `views`; the panel recomputes only when `views[id]` changes |
| `title`, `color` | header text and colour |
| `compute` | `(view) → {xy, points?, mask?, readout?}`: flat n×2 line, flat m×2 points, Uint8Array n mask of highlighted points, text |
| `highlight` | colour of masked segments (default `#FF7F7F`) |

Pure helper: `autoscale(xy, pad = 0.55) → {cx, cy, half}` (equal aspect, frames the line).

## figkit/model.js — `createModel(initial)`

`get(key)`, `set(key, value)` (fires `change:key` when the value is a different object),
`on("change:key", fn)`, `off(event?, fn?)`, `save_changes()`. Same API as anywidget's model.

## figkit/geom.js (pure)

`dot cross norm unit scale add`; `mat3.{identity,row,mul,apply,applyT,transpose,orthonormalize}`;
`rotationToZ(v)`; `trackball(camera, dx, dy, r)`; `project(camera, p, {cx, cy, r})` →
`[x, y, depth]`; `unproject(camera, x, y, geo)`; `facing(camera, v)`.

## figkit/stage.js

`createStage(el, {draw, onResize})` → `{canvas, ctx, width, height, dpr, requestDraw, dispose}`
(drawing in CSS pixels; one redraw per frame). `dragHelper(el, {hitTest, onStart, onMove, onEnd})`.

## figkit/figkit.js

Re-exports the above; `run(app, el, {data, base})` hosts an app on a web page; `showError(el, msg)`.
Styles: `figkit/figkit.css` (`.fk-app`, `.fk-toolbar`, `.fk-grid`, `.fk-panel`, `.fk-plot`, light/dark variables).

## Adding a component

Only when a real app needs it, inside figkit (a pull request with tests), never by editing a vendored copy.
