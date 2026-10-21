# Contract: browser library (v0.1)

All modules are imported by bare specifier, e.g. `import { createModel } from "figkit/model.js"`.
`figkit/figkit.js` re-exports the public API. No module touches the DOM at top level.

## figkit/model.js

```js
createModel(initial = {}) → Model
// Model: get(key), set(key, value), on("change:<key>", fn), off(event?, fn?), save_changes()
// fires change:<key> only when the value is a different object/primitive (identity);
// callbacks receive no arguments (AFM).
```

## figkit/npy.js

```js
parseNpy(buffer: ArrayBuffer) → { data: TypedArray, shape: number[], dtype: string }
asTyped(view: DataView | ArrayBuffer, dtype: string) → TypedArray   // copies only if unaligned
```

Dtype map: `<f4` Float32Array, `<f8` Float64Array, `<i1` Int8Array, `|u1`/`<u1` Uint8Array,
`<i2` Int16Array, `<u2` Uint16Array, `<i4` Int32Array, `<u4` Uint32Array, `|b1` Uint8Array.
Throws on other dtypes, big-endian or Fortran order.

## figkit/data.js

```js
loadData(source, { fetch = globalThis.fetch, base = "data/" } = {})
  → Promise<{ name, meta, arrays: { [entry]: { data, shape, dtype } }, json: { [entry]: any } }>
// source: dataset name (fetched from `${base}${name}/`), a URL map produced by the single-file
// build, or a model holding `manifest` and `npy_<entry>` traits (notebook).
// Throws FigkitDataError with a message naming the missing file or version mismatch.
```

## figkit/geom.js  (pure)

```js
dot(a, b), cross(a, b), norm(a), unit(a), scale(a, s), add(a, b)
mat3.mul(A, B), mat3.apply(A, v), mat3.applyT(A, v), mat3.transpose(A), mat3.orthonormalize(A)
rotationToZ(v) → Mat3            // rows: sky x, sky y, v; antiparallel case = diag(1, -1, -1)
trackball(camera, dxPx, dyPx, radiusPx) → Mat3   // new camera, orthonormalised
project(camera, p, { cx, cy, r }) → [x, y, depth]
unproject(camera, x, y, { cx, cy, r }) → unit vector on the front hemisphere (clamped to limb)
facing(camera, v) → v or −v      // the end of the line facing the camera
```

Mat3 is a flat row-major array of 9 numbers.

## figkit/stage.js

```js
createStage(el, { onResize, draw }) → Stage
// Stage: canvas, ctx (scaled so drawing is in CSS pixels), width, height (CSS px), dpr,
//        requestDraw() (coalesced to one per animation frame), dispose()
dragHelper(el, { hitTest(x, y) → target | null, onStart(target, x, y), onMove(target, dx, dy, x, y),
                 onEnd(target) }) → dispose
```

DPR is re-read on resize and on `matchMedia("(resolution: …)")` change.

## figkit/globe.js

```js
mount(el, model, {
  texture: { data: Uint8Array, shape: [H, W, 4] },          // equirectangular, see data-format
  lines:   { [id]: { data: Float32Array, shape: [n, 3] } }, // globe-ready (already squashed), frame units of R
  points:  { [id]: { data: Float32Array, shape: [m, 3] } }, // optional
  colors:  { [id]: "#rrggbb" },
  markerAxes: (id, view) → [ex, ey],                         // tangent axes of marker id's square
  markerSizeDeg = 5.5,
}) → dispose
// reads: camera, views; writes: camera (on rotate), views (on marker drag); save_changes on pointerup
export function shade(camera, texture, size, out) // pure kernel, tested in node
```

## figkit/skypanel.js

```js
mount(el, model, {
  id,                                   // key into views
  title,                                // set via textContent
  color,
  compute: (view) → { xy: Float32Array /* n×2 */, points?: Float32Array /* m×2 */,
                      mask?: Uint8Array /* n, highlighted segments */, readout?: string },
}) → dispose
// reads: views[id]; recomputes on change:views when views[id] changed
export function autoscale(xy, points, pad = 0.55) → { cx, cy, half }   // pure, tested in node
```

## figkit/figkit.js

```js
export * from the modules above;
run(app, el, { data, base }) → Promise<dispose>  // standalone host: creates a model, awaits
                                                  // initialize/render, passes an AbortSignal
showError(el, message)                            // plain on-page error box (textContent)
```

## figkit/figkit.css

CSS custom properties for light/dark (`prefers-color-scheme`), `.fk-panel`, `.fk-grid`,
`.fk-error`. Apps may override variables.
