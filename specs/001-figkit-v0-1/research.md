# Phase 0 Research: figkit v0.1

All Technical Context unknowns are resolved below. Experiments were run on 2026-10-21 with
throwaway pages (not kept) under Playwright 1.58.0.

## R1. Single-file output that opens from `file://`

- **Decision**: `inline_modules()` rewrites every bare import specifier in a module into a
  `data:text/javascript;base64,…` URL of the dependency, which has itself been rewritten (dependencies
  first, topological order; string-literal specifiers only; cycles are an error). The single-file page
  boots from one inline `<script type="module">` that imports the rewritten app. No import map is
  needed in the single file. Data files are inlined as `data:application/octet-stream;base64,…` URLs,
  so `loadData` keeps one `fetch` code path.
- **Evidence**: from `file://`, both (a) an import map of `data:` module URLs whose modules import
  each other by bare specifier and (b) nested-`data:`-URL modules imported from a `blob:` URL
  module worked, and `fetch()` of a `data:` URL returned the right bytes, in Chromium 145 and
  WebKit 26 (Safari engine). A relative `./b.js` import inside a `data:` module failed in both, as
  expected, confirming the import rule.
- **Firefox**: Playwright's Firefox (build 1509) could not start on the development Mac (graphics
  compositor crash under the sandbox), so it was not tested locally. Firefox has supported import
  maps since 108 and `data:` module imports. **Mitigation**: the browser smoke tests run in CI on
  `ubuntu-latest` for chromium, firefox and webkit; a Firefox failure blocks v0.1.
- **Gotcha**: WebKit refuses `file://` navigation inside a Playwright context created with
  `offline=True`. Smoke tests block networking with request routing instead (abort every request
  whose URL is not `file:`, `data:` or `blob:`).
- **Alternatives considered**: import map of `data:` URLs (works, but needs a second code path for
  notebooks, which have no import map); `blob:` URLs created by a classic script (more moving parts);
  concatenating modules in Python (fragile export renaming); a JS bundler (violates Principle I).

## R2. Notebook wrapper (anywidget)

- **Decision**: optional extra `figkit[notebook]` requiring `anywidget>=0.11,<0.12`. `_esm` is the
  `inline_modules()` output for the app module (same function as R1). Arrays are passed as
  `traitlets.Bytes` (one per array, raw `.npy` file bytes) plus a JSON trait for the manifest;
  `camera` and `views` are synced traits.
- **Facts (anywidget AFM spec, anywidget.dev/en/afm, version 0.11.0 of 2026-04-27)**: default
  export is `{initialize?, render?}` or a factory returning it; `render({ model, el, signal, host })`;
  `signal` is preferred over a returned cleanup; `change:<key>` callbacks get no arguments (read with
  `model.get`); `save_changes()` commits; binary values arrive in JS as `DataView`. The widget module
  is loaded from a `blob:` URL with no import map — hence the nested-`data:` rewrite (verified in R1).
- **Risk**: notebook front ends with a strict Content-Security-Policy could block `data:` module
  imports (e.g. VS Code webviews). JupyterLab and marimo are the v0.1 targets; the notebook smoke
  test covers JupyterLab. VS Code is out of scope for v0.1.

## R3. Python packaging and versions

- **Decision**: `requires-python >= 3.11`; runtime dependency `numpy >= 1.24` only (figkit uses
  `numpy.lib.format` / `np.save`, stable across these versions; numpy 2.5 itself needs 3.12, which is
  fine for users on newer Pythons). Build backend hatchling (1.32), with `src/figkit/js/**` included as
  package data. Installed from git tags: `uv add "figkit @ git+https://github.com/nstarman/figkit@vX.Y.Z"`.
- **Version source**: a single `__version__` in `src/figkit/__init__.py`, read by hatchling
  (`[tool.hatch.version] path = …`), checked in CI against the tag on release.

## R4. Local preview server

- **Decision**: `figkit serve` uses the standard library (`http.server.ThreadingHTTPServer` with a
  `SimpleHTTPRequestHandler` subclass, bound to 127.0.0.1). Python already maps `.js` and `.mjs` to
  `text/javascript`; the handler adds `.npy` → `application/octet-stream` and sends
  `Cache-Control: no-store` so rebuilt files are always reloaded.
- **Alternatives**: depending on a third-party server (unnecessary).

## R5. Precision check for explicit float64 → float32 narrowing

- **Decision**: narrowing is allowed only when requested, and only if
  `max|x32 − x| ≤ rtol · max(ptp(x), tiny)` with default `rtol = 1e-6`, where `ptp` is the
  array's range (per array; NaN/inf positions must match exactly). Otherwise export raises, naming
  the array and the observed error.
- **Rationale**: a plain relative check passes everything (float32 always rounds to ~6e-8 relative)
  and so misses the real hazard: large offsets with small spreads, e.g. MJD times (~60000 days
  spanning a few days lose minutes). Measuring error against the data's range catches that.
- **Alternatives**: per-element relative error (misses MJD); requiring a user `atol` (burdens every
  call).

## R6. Testing toolchain

- **Decision**: JS unit tests with Node's built-in runner (`node --test`, Node ≥ 20; dev machine has
  24); fixtures for `.npy` parsing written by a pytest fixture with numpy. Python tests with pytest.
  Browser smoke tests with `pytest-playwright` (0.10) so the whole toolchain stays Python-driven; CI
  matrix over chromium, firefox, webkit on `ubuntu-latest`.
- **Acceptance numbers** (48.0 / 16.2 / 87.6 / 87.2 %) are checked twice: in Node against
  `examples/globe/science.js`, and in the browser smoke test by reading the panels' readouts.
- **Frame-rate check (SC-003)**: measured in the smoke test by dragging a marker programmatically
  for 2 s in Chromium and counting `requestAnimationFrame` redraws; reported, and asserted ≥ 30 fps.

## R7. Gallery deployment

- **Decision**: a GitHub Actions workflow on `release: published` (and manual dispatch) builds
  `examples/*` with the released package (served output plus single file) and deploys with
  `actions/upload-pages-artifact` + `actions/deploy-pages`. The globe example's data is produced in
  CI from a small committed fixture extract (see R8), so the gallery never depends on the paper repo.

## R8. Example data provenance

- **Decision**: `examples/globe/export.py` reads the paper's existing exported arrays (the inputs the
  current `globe_explorer.py` writes: tracks, derivatives, particles, texture, camera, views) from a
  committed, compressed fixture `examples/globe/source.npz` (a few MB, subsampled particles, MIT/CC-BY
  with a pointer to the paper), produced once by a script in the paper repo. figkit therefore has no
  dependency on JAX, galax or the paper's pipeline.
- **Licence note**: the fixture carries a README naming the paper and its licence.
