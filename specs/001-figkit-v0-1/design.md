# figkit v0.1 — agreed design (input to /speckit-plan)

Agreed with the author in a design session on 2026-10-21, section by section, with independent
reviews of the data contract and of the module layout. Each decision lists its reason.

## Context and goal

figkit is a shared toolbox for webapps that are the interactive counterparts of the author's
papers. Webapps are hosted statically (GitHub Pages, from each paper's showyourwork repository),
linked from the author's website, and archived with DOIs. A research report on frameworks
(Streamlit, Dash, Panel/Bokeh, Shiny, marimo, Observable, D3, Plotly, plain canvas, …) concluded
that per-frame interactions like dragging need hand-written JS whatever the framework, and that the
pages still working years later are static, vendored, self-contained files. figkit generalises the
globe explorer prototype (≈330 lines of plain canvas JS + a Python exporter).

Reference app: `convexities-single-galaxy-paper`, files `src/scripts/globe_explorer.html`,
`src/scripts/globe_explorer.py`, and the `GLOBE_EXPLORER` hook at the end of
`src/scripts/data_streams_globe.py`.

## 1. Repository and versioning

```
nstarman/figkit/                      public, MIT
  pyproject.toml                      Python package "figkit"; installed from git tags, not PyPI
  src/figkit/
    __init__.py                       export(), load(), build()
    js/                               browser library, shipped as package data (section 3)
    anywidget.py                      notebook wrapper (optional extra: anywidget)
    cli.py                            `figkit build`, `figkit serve`
  examples/globe/                     the globe explorer rebuilt on figkit
  skills/figkit/SKILL.md (+ references/)
  skills/figkit-upgrade/SKILL.md
  CHANGELOG.md                        per release; migration notes for breaking changes
  AGENTS.md, CLAUDE.md (→ AGENTS.md), README.md, LICENSE
  tests/ (pytest)   js-tests/ (node --test)
  .github/workflows/                  tests; deploy examples to figkit's Pages as a live gallery
  .specify/, specs/                   Spec Kit (v1.1.3)
```

- One tag versions both halves. Semver `vX.Y.Z`; at 0.x a minor bump may break.
- A paper pins `figkit @ git+https://github.com/nstarman/figkit@vX.Y.Z`. Built sites vendor the JS
  into `vendor/figkit-X.Y.Z/` and stamp `<meta name="figkit-version">`; manifests carry it too.
- Reason for JS-in-Python-package: one pin governs the exporter and the reader of the data
  contract, so they cannot drift; vendoring needs no CDN (AAS requires local JS).

## 2. Data contract

```
data/<dataset>/
  manifest.json   {figkit_data: 1, figkit: "X.Y.Z", meta: {...}, licence?, doi?,
                   entries: {<name>: {kind: "array", file, dtype, shape, source_dtype,
                                      unit?, description?, sha256}}}
  <name>.npy      one per array
  README.md       generated: what each file is, how to np.load it
```

- `figkit.export(out_dir, name, arrays=..., meta=..., ...)` writes it; `figkit.load(dir)` reads it.
- dtypes: `<f4 <f8 <i1 <u1 <i2 <u2 <i4 <u4` and bool (stored as `|b1`/uint8); C-order,
  little-endian (converted automatically); int64, object, string, structured → error. Strings go
  in `meta`.
- No silent narrowing. Optional explicit float64 → float32 narrowing with a precision check
  (relative error threshold; fails loudly, e.g. for MJD times).
- JS: `loadData(name, {fetch}) → {meta, arrays: {<name>: {data: TypedArray, shape, dtype}}}`.
  The `.npy` parser is figkit's own (~40 lines; npyjs pulls in cross-fetch). NumPy pads headers to
  64 bytes, so typed arrays are zero-copy views.
- Same `{data, shape, dtype}` object on web, single-file and notebook (where bytes arrive as
  `DataView`; `asTyped()` converts, copying only when unaligned).
- Why `.npy`: same bytes as raw binaries plus a stable self-describing header (format stable since
  2007); readers reuse data with `np.load`; per-frame byte offsets are predictable, enabling HTTP
  range reads of single frames later.
- Kinds: v0.1 = `array`, `json`. Later, when a paper needs them: `media` (MP4/WebM; frame-by-range
  reads of `.npy` stacks), `table` (Parquet via hyparquet, written with snappy or no compression),
  `zarr` (via zarrita, written uncompressed or gzip — decoded by the browser's built-in
  `DecompressionStream`, never zstd/blosc wasm), FITS/ECSV export for AAS "data behind the figure".
  Not planned: HDF5/h5wasm (~1 MB gzipped, whole-file reads).

## 3. Browser library (v0.1, only what the globe explorer needs)

```
src/figkit/js/
  figkit.js     public re-exports; run(appModule, el, {data}); on-page error box
  model.js      createModel(initial): get / set / on("change:key", fn) / off / save_changes
  npy.js        parseNpy(buffer) → {data, shape, dtype}; asTyped(dataView, dtype)
  data.js       loadData(name, {fetch}) → {meta, arrays}
  geom.js       vec3/mat3 helpers; rotation taking a direction to +z (the paper's convention,
                incl. the antiparallel case); trackball update from drag deltas with
                re-orthonormalisation; orthographic project/unproject; antipode helper
  stage.js      HiDPI canvas drawn in CSS pixels (one setTransform; DPR re-read on resize and
                display change); requestAnimationFrame redraw scheduler; pointer-drag helper
                (pointer capture, deltas, hit-test hook)
  globe.js      mount(el, model, {texture, lines, points, markers, markerAxes}) → dispose
  skypanel.js   mount(el, model, {id, compute, title}) → dispose
  figkit.css    light/dark variables (prefers-color-scheme), layout helpers
examples/globe/
  export.py     writes data/globe/ (globe-ready lines already radially squashed)
  science.js    pure, DOM-free: project + classify (the paper's non-concavity criterion)
  widget.js     the app = an anywidget module that composes globe + 4 sky panels
  index.html    loads the app via the import map
```

Rules (from two independent audits):

- **Imports**: modules import each other only by bare specifiers (`figkit/model.js`,
  `app/science.js`) through an import map. No `./`/`../` imports between modules, no
  `import.meta.url` (inlined modules have no base URL). No DOM access at module top level.
- **Components** export `mount(el, model, opts) → dispose`. anywidget's `render({model, el})`
  cannot take options, so the paper's app module is the anywidget module: its default export is
  `{ render({ model, el, signal }) }`, it mounts the components with their options, and the same
  file runs on the web (via `figkit.run`) and in notebooks.
- **State keys**: `camera` (3×3 row-major array: page-right, page-up, toward-camera) and `views`
  (`{<id>: [x, y, z]}`, one dict, replaced as a whole). Ids match `[a-z][a-z0-9_]*`. Values are
  replaced, never mutated (anywidget dedupes with deep equality, the standalone model by identity).
- **Science step** is a callback, not model state: `skypanel` gets
  `compute(view) → {xy, points, mask, readout}`. Derived per-drag data never enters synced state.
- **Marker orientation** comes from the app: `markerAxes(id, view) → [ex, ey]` in the globe frame.
- **Cleanup**: listeners are removed on dispose and when anywidget's `signal` aborts (the model
  outlives views).
- **Notebooks**: `save_changes()` at the end of an interaction (pointerup), not per move.
- **Performance**: redraws coalesced to one per animation frame; globe shading precomputes
  per-pixel unit vectors, reuses buffers, renders at reduced resolution while dragging and full
  resolution on release, and is cached by (camera, size). `putImageData` ignores transforms —
  draw the shade via an offscreen canvas.
- **Safety**: user-visible names via `textContent`, never `innerHTML`.
- **Texture**: equirectangular RGBA, rows colatitude 0..π, columns azimuth 0..2π inclusive at both
  ends (recorded in the manifest).

Function map from the prototype (for the plan):
`f32/u8/b64 decoding` → npy.js/data.js; `dot/norm/unit/rows/mul/mulT/triples` → geom.js;
`skyRotation` → geom.js; `squash` → export.py; `skyAxes/project` (re-project + classify) →
examples/globe/science.js; `buildShade/drawGlobe/squareCorners/inside` → globe.js;
`resize`, DPR handling, pointer handling → stage.js; `drawPanel` → skypanel.js (drawing) +
science.js (numbers); reset buttons → examples/globe/widget.js.

## 4. Build and publish

A paper repository holds `webapps/<name>/` (index.html, widget.js, science.js, export.py).

- `figkit build webapps/globe --data <dataset dir> --out site/globe [--single-file site/globe.html]`
  - served: copy app files; vendor installed figkit JS into `vendor/figkit-X.Y.Z/`; write the
    import map (`figkit/` → vendor path, `app/` → app files); copy data; stamp the version.
  - single file: `inline_modules()` rewrites each module's bare imports into nested
    `data:text/javascript;base64` URLs (dependencies first; requires string-literal imports and no
    cycles), so no import map is needed — verified in research.md R1; it also turns
    data files into data URLs so `loadData` keeps one fetch path, boots from one inline module
    script, warns above 50 MB.
  - checks: reject relative imports / `import.meta.url`; reject incompatible `figkit_data` majors.
- `figkit serve <dir>`: local static server for preview (single file just opens).
- `figkit.anywidget.Widget(app="webapps/globe/widget.js", data="data/globe")`: same
  `inline_modules()` → `_esm`; arrays as bytes traits; `camera`/`views` synced.
- In a showyourwork pipeline: a Snakemake rule runs export then build; a GitHub Actions workflow
  deploys to Pages; release tags attach the single file + data to Zenodo. (Hosting inside the
  paper's docs is sub-project C.)
- AAS: submit the served folder as the zip (vendored JS + separate data files), not the single file.

## 5. Skills and releases

- `skills/figkit/SKILL.md`: triggered by requests for interactive figures/webapps or work in a
  `webapps/` folder. Steps: scaffold from a template; write export.py (dtype rules, no silent
  narrowing); put science in DOM-free `science.js` with a `node --test` check against numbers from
  the paper's Python; compose components in `widget.js` (state rules); build, view, test both
  outputs; try in a notebook. `references/`: component API (options, model keys), data contract,
  conventions (imports, frames, angle conventions), worked example (examples/globe).
- `skills/figkit-upgrade/SKILL.md`: read the built-against version (meta tag / manifest); read
  CHANGELOG from that version to the target; apply each migration note in order; bump the pin;
  rebuild; rerun tests and acceptance numbers; report. Never crosses an undocumented break.
- Releases: every release has a CHANGELOG section; every breaking change has a migration note
  (what changed / how to find it, e.g. grep pattern / exact edit). Public-API changes update both
  skills in the same PR. Gallery deploy from release; a broken example blocks the release.

## Testing

- `node --test`: model, npy (fixtures written by Python, incl. zero-length and 1-element arrays),
  data (injected fetch), geom (rotation incl. poles, trackball orthonormality, project/unproject,
  antipode), globe shading kernel, panel autoscale, and the globe acceptance numbers via
  `examples/globe/science.js` (48.0 / 16.2 / 87.6 / 87.2 %).
- pytest: export/load round trip, dtype rules, narrowing check, build checks (relative import
  rejection), inline_modules output.
- One Playwright smoke test per example for both outputs (served via `figkit serve`, single file
  via `file://` with network blocked).

## Open risk to verify first

The single-file mechanism (import map of `data:` module URLs + inline boot script, opened from
`file://`) is believed to work in current Chrome, Firefox and Safari (MDN importmap; Node data
imports). Verify it in all three browsers as the first implementation task; fallback is a Python
concatenation step made possible by the import rules above.
