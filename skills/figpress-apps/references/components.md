# Components and the model

Every component: `mount(el, model, opts) → dispose`. It renders into `el`, listens to model keys
and removes its listeners on dispose. Mount several components on one model to link them.

## figpress-apps/globe.js — `mount(el, model, opts)`

| Option | Meaning |
|---|---|
| `texture` | `{data: Uint8Array, shape: [H, W, 4]}` RGBA, rows colatitude 0..π, columns azimuth 0..2π (inclusive) |
| `lines` | `{id: {data, shape: [n, 3]}}` in globe units (radius 1); back half drawn faint |
| `points` | `{id: {data, shape: [m, 3]}}`, optional |
| `colors` | `{id: css colour}` |
| `markerAxes` | `(id, view) → [ex, ey]` tangent axes of id's square (globe frame); default: screen axes |
| `markerSizeDeg` | half-width of a square in degrees (default 5.5) |
| `mollweide` | `true`: a small Mollweide map of the whole sphere in the top-right corner of the globe's square, clear of the disc (default `false`). Longitude `atan2(y, x)` grows to the right, as matplotlib's `"mollweide"` axes; the half the globe hides is veiled; each view is a filled square, its antipode hollow (no antipode when `directed`); `+` is the globe's centre. Clicking or dragging on it turns the globe to face that direction (writes `camera`) |
| `directed` | `true`: each view is a direction with a sign, not an axis (default `false`). Its square sits at `views[id]` itself, faint with a dashed outline when that end is on the back of the globe, and is hit where it is drawn; a drag keeps it on the side (front or back) it started on. Use it when v and −v are different views, e.g. an observer on one end of a line of sight |

Model: reads/writes `camera` (rotate by dragging the background) and `views`
(`{id: [x, y, z]}`, drag a square). Calls `save_changes()` on pointer-up.
By default a view and its antipode are the same view, and the square is drawn on whichever end
faces the camera; a stored `views[id]` may point the other way. Read the direction a square shows
with `facing(camera, views[id])` (from `geom.js`), never `views[id]` alone, or it flips to the
antipode when the globe turns. With `directed: true` the square is always at `views[id]`.
Pure kernels: `shade(camera, texture, size, out, base = [255, 255, 255])` — `base` is an `[r, g, b]` array (0–255), e.g. `rgb(cssVar(el, "--fk-bg", "#fff"))`; `shadeMollweide(camera, texture, w, h, out, base)`, the inset's map.

## figpress-apps/skypanel.js — `mount(el, model, opts)` (the general 2-D panel)

Named for sky projections, but use it for any 2-D plot driven by model state.

| Option | Meaning |
|---|---|
| `id` | key into `views`; `views[id]` may be any value (a unit vector, an angle, `[θ, φ]`, …). The panel recomputes only when that entry changes (by identity) |
| `title`, `color` | header text and colour |
| `compute` | `(view) → {xy, points?, mask?, readout?}`: `xy` flat n×2 line; `points` flat m×2, drawn as faint 1-px dots in `color`; `mask` Uint8Array n, segments where two neighbours are set are drawn thick in `highlight`; `readout` text in the header |
| `highlight` | colour of masked segments (default `#FF7F7F`) |
| `limits` | fixed frame `{cx, cy, half}` (data units); default: re-frame to the line on every update — fix it when the motion itself is the point (e.g. a rotation) |

The black × marks the origin (0, 0) of the data coordinates (in sky panels, the projected centre).
Pure helper: `autoscale(xy, pad = 0.55) → {cx, cy, half}` (equal aspect, frames the line).

## figpress-apps/model.js — `createModel(initial)`

`get(key)`, `set(key, value)` (fires `change:key` when the value is a different object),
`on("change:key", fn)`, `off(event?, fn?)`, `save_changes()`. Same API as anywidget's model.

## figpress-apps/legend.js — `mount(el, model, { entries })` (a legend that is also the controls)

The figure's legend, in which clicking an entry shows or hides its curve and hovering an entry opens
a card of that curve's controls. Returns dispose.

| entry field | |
|---|---|
| `icon` | an `Element` the app draws: the figure's own line style or swatch (figpress-apps only lays it out) |
| `label` | text |
| `title` | optional tooltip |
| `toggle` | a top-level boolean model key: click flips it and calls `save_changes()`; missing counts as on; off is drawn faded and struck through |
| `card` | an `Element` of controls (slider, profile editor) shown in a hover card; the entry gets a dashed outline and ✎ |
| `busy` | with `card`: `() => boolean`, true while a drag inside the card is in progress, which holds it open |

An entry has `toggle` or `card` or neither (a plain key), never both. Draw the curve from the model
key (`model.get("mond") !== false`) and redraw on `change:mond`.

```js
import { mount as mountLegend } from "figpress-apps/legend.js";
const dispose = mountLegend(legendEl, model, { entries: [
  { icon: lineIcon(BLUE), label: "CDM" },
  { icon: lineIcon(RED), label: "MOND", toggle: "mond" },
  { icon: lineIcon("currentColor", "4 2"), label: "|sin 2Δ|", toggle: "guide" },
  { icon: bandIcon(BLUE), label: "ψ (band)", card: psiControls, busy: () => dragging },
] });
signal.addEventListener("abort", dispose);
```

A card opens while the mouse is over the entry or the card, or keyboard focus is in either; it
closes 250 ms after both are left. Leaving takes focus out of the card, so a slider dragged with
the mouse cannot hold it open. A click or tap on the entry toggles it, Escape closes it, at most
one card of a legend is open, and it is kept inside the window as it resizes or scrolls.
`hoverCard(trigger, card, { busy, group }) → dispose` gives the same behaviour to any trigger (a
disk drawn in a plot, a button); `group`, an object shared by several cards, keeps one open.

## figpress-apps/geom.js (pure)

`dot cross norm unit scale add`; `mat3.{identity,row,mul,apply,applyT,transpose,orthonormalize}`;
`rotationToZ(v)`; `trackball(camera, dx, dy, r)`; `project(camera, p, {cx, cy, r})` →
`[x, y, depth]`; `unproject(camera, x, y, geo)`; `facing(camera, v)`; `mollweide(d)` → `[x, y]` on the
ellipse x²/4 + y² ≤ 1 and `unmollweide(x, y)` → unit vector or `null`; `lookAt(camera, d)`, the camera
turned to face `d`.

## figpress-apps/stage.js

`createStage(el, {draw, onResize})` → `{canvas, ctx, width, height, dpr, requestDraw, dispose}`
(drawing in CSS pixels; one redraw per frame). `dragHelper(el, {hitTest, onStart, onMove, onEnd})`.

## figpress-apps/index.js

Re-exports the above; `run(app, el, {data, base})` hosts an app on a web page; `showError(el, msg)`.
Styles: `figpress-apps/index.css` — `.fk-app`, `.fk-toolbar`, `.fk-panel`, `.fk-plot`, `.fk-grid`, and
the responsive `.fk-split` (side by side, stacked below 760 px) and `.fk-grid-2` (two columns, one
below 320 px). Their breakpoints are container queries on `.fk-app`, so they follow the app's width
(a notebook cell, a phone). Light/dark variables (`--fk-bg`, `--fk-fg`, `--fk-muted`, …) follow the
system theme, or the one the page pins with `<html data-theme="light">` (or `"dark"`); canvas
code reads them with `cssVar(el, "--fk-fg", fallback)` at draw time, and `createStage` redraws
when the theme changes. Use layout classes, not inline grid styles, so apps
work on phones.

## Adding a component

Only when a real app needs it, inside figpress-apps (a pull request with tests), never by editing a vendored copy.
