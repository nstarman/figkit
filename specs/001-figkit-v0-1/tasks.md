---

description: "Task list for figkit v0.1"
---

# Tasks: figkit v0.1 — toolbox for interactive paper figures

**Input**: Design documents from `/specs/001-figkit-v0-1/`

**Prerequisites**: plan.md, spec.md, design.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by the constitution (Principle VII). Within each phase, test tasks come first
and must fail before the implementation tasks that make them pass.

**Organization**: Tasks are grouped by user story (spec.md) so each story is an independently
testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5 from spec.md
- Paths are relative to the repository root (`nstarman/figkit`)

## Reference material for every task

- API shapes: `specs/001-figkit-v0-1/contracts/` (data-format.md, python-api.md, cli.md, js-api.md)
- Entities and validation rules: `specs/001-figkit-v0-1/data-model.md`
- Decisions: `specs/001-figkit-v0-1/research.md` (R1 single file, R2 anywidget, R5 narrowing, R8 data)
- Prototype being generalised (read-only): in the convexities paper repo worktree
  `/Users/nmrs/Documents Local/Projects/Stream Convexities/convexities-single-galaxy-paper/.claude/worktrees/hungry-volhard-c65394/`,
  files `src/scripts/globe_explorer.html`, `src/scripts/globe_explorer.py`, and the
  `GLOBE_EXPLORER` block at the end of `src/scripts/data_streams_globe.py`
- Import rule for every JS file: bare specifiers only (`figkit/x.js`, `app/x.js`), no `./` or `../`
  imports, no `import.meta.url`, no DOM access at module top level

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Package skeleton, tooling and CI

- [X] T001 Create `pyproject.toml`: project `figkit`, `requires-python = ">=3.11"`, dependency `numpy>=1.24`, optional extra `notebook = ["anywidget>=0.11,<0.12"]`, dev group `pytest`, `pytest-playwright>=0.10`, hatchling build backend with `[tool.hatch.version] path = "src/figkit/__init__.py"`, package data `src/figkit/js/**`, console script `figkit = "figkit.cli:main"`
- [X] T002 Create the package skeleton per plan.md: `src/figkit/__init__.py` (with `__version__ = "0.1.0.dev0"`, re-exports to be filled later), empty modules `src/figkit/{data,build,serve,cli,anywidget}.py`, folders `src/figkit/js/`, `examples/globe/`, `skills/figkit/references/`, `skills/figkit/assets/template/`, `skills/figkit-upgrade/`, `tests/`, `js-tests/fixtures/`
- [X] T003 [P] Add `.github/workflows/tests.yml`: on push/PR, jobs (a) `uv run pytest -m "not smoke"` on Python 3.11 and 3.13, (b) `uv run python tests/make_fixtures.py && node --test 'js-tests/*.test.js'` on Node 20 and 22, (c) smoke matrix `uv run pytest -m smoke --browser {chromium,firefox,webkit}` on ubuntu-latest after `uv run playwright install --with-deps`
- [X] T004 [P] Create `CHANGELOG.md` with the release format from data-model.md (Release entity): sections `## X.Y.Z — YYYY-MM-DD` with Added/Changed/Fixed, and a "Migration notes" subsection template with **What changed**, **Find** (grep pattern), **Edit** (exact change); add an `## Unreleased` section
- [X] T005 [P] Register the pytest marker `smoke` and test paths in `pyproject.toml` (`[tool.pytest.ini_options]`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The data contract (Python and JS), the model and geometry — needed by every story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests (write first, must fail)

- [X] T006 [P] Write `tests/test_data.py` for `figkit.export`/`figkit.load` per contracts/python-api.md: round trip of every allowed dtype (`<f4 <f8 <i1 <u1 <i2 <u2 <i4 <u4 |b1`) incl. zero-length and 1-element arrays; "reject int64/uint64, float16, complex, object, string, structured and datetime dtypes with an error naming the entry"; big-endian and non-C-contiguous input converted; float64 kept unless `narrow` requested; narrowing passes for ordinary data and fails for an MJD-like array (`60000 + linspace(0, 3, 1000)`) with a message giving the entry, max error and threshold (research R5: `max|x32 − x| ≤ rtol · max(ptp(x), tiny)`, `rtol = 1e-6`, NaN/inf positions must match); entry names must match `[a-z][a-z0-9_]*`, dataset names `[a-z][a-z0-9_-]*`; existing folder without `overwrite` raises; sha256 mismatch and wrong `figkit_data` major raise `figkit.DataError`; unknown manifest keys rejected; generated `README.md` lists every entry; each `.npy` loads with plain `numpy.load`
- [X] T007 [P] Write `tests/make_fixtures.py`: writes `.npy` fixtures (every allowed dtype, zero-length, 1-element, 3-D shape, a deliberately misaligned buffer case) and a small dataset folder via `figkit.export` into `js-tests/fixtures/`, plus `js-tests/fixtures/expected.json` with the values; add `js-tests/fixtures/` to `.gitignore`
- [X] T008 [P] Write `js-tests/npy.test.js`: `parseNpy` returns the right TypedArray class, shape and values for every fixture; data is a zero-copy view; `asTyped` on a `DataView` and on an unaligned view; errors for big-endian, Fortran order and unsupported dtypes (contracts/js-api.md, npy section)
- [X] T009 [P] Write `js-tests/model.test.js`: get/set; `change:<key>` fires on a new object, not on the same object; callbacks receive no arguments; `off(event, fn)`, `off(event)`, `off()`; `save_changes` is a no-op that does not throw
- [X] T010 [P] Write `js-tests/geom.test.js`: `rotationToZ` maps v to +z and matches the paper's convention (compare with `rotation_matrix_from_viewing_angles` values exported by `tests/make_fixtures.py` for 20 directions incl. both poles; antiparallel → `diag(1,-1,-1)`); `trackball` output stays orthonormal to 1e-12 after 10,000 random steps; `project`/`unproject` round trip; `facing` returns the camera-facing end; `mat3.orthonormalize`
- [X] T011 [P] Write `js-tests/data.test.js`: `loadData` with an injected `fetch` over the fixture dataset (by name and from a `data:`-URL map) returns `{name, meta, arrays, json}`; a missing file and a `figkit_data` major mismatch throw `FigkitDataError` with messages naming the file / both versions

### Implementation

- [X] T012 Implement `src/figkit/data.py`: `export`, `load`, `Dataset`, `DataError`, manifest writing (`figkit_data: 1`, `figkit`, `name`, `meta`, `licence`, `doi`, `entries` with `kind`, `file`, `dtype`, `shape`, `source_dtype`, `sha256`, `unit?`, `description?`), kind `json` entries, R5 narrowing check, generated `README.md` (contracts/data-format.md); re-export from `src/figkit/__init__.py`; make T006 pass
- [X] T013 [P] Implement `src/figkit/js/npy.js` (`parseNpy`, `asTyped`; header parsing for format 1.0/2.0; dtype map from contracts/js-api.md); make T008 pass
- [X] T014 [P] Implement `src/figkit/js/model.js` (`createModel`; identity-based change detection; AFM-compatible `on/off/save_changes`); make T009 pass
- [X] T015 [P] Implement `src/figkit/js/geom.js` (vector helpers, `mat3.*`, `rotationToZ`, `trackball` with re-orthonormalisation, `project`, `unproject` clamped to the limb, `facing`); port `skyRotation`, `dot/norm/unit/mul/mulT` from the prototype; make T010 pass
- [X] T016 Implement `src/figkit/js/data.js` (`loadData` from a name, a `data:`-URL map, or a model with `manifest` + `npy_<entry>` traits; `FigkitDataError`); depends on T013; make T011 pass
- [X] T017 Implement `src/figkit/js/figkit.js`: re-export the public API of model/npy/data/geom (stage/globe/skypanel added in US1), `showError(el, message)` using `textContent` in a `.fk-error` box, and `run(app, el, {data, base})` — creates a model, awaits a factory default export, `initialize` and `render({model, el, signal})`, returns a dispose that aborts the signal

**Checkpoint**: `uv run pytest tests/test_data.py` and `node --test 'js-tests/*.test.js'` pass

---

## Phase 3: User Story 1 — Publish a paper's interactive figure on the web (Priority: P1) 🎯 MVP

**Goal**: The globe explorer rebuilt as `examples/globe/` on figkit, built as a served site.

**Independent Test**: quickstart.md steps 1–3: build, serve, check behaviour and the four fractions
(48.0 / 16.2 / 87.6 / 87.2 %), no third-party requests.

### Tests for User Story 1 (write first, must fail)

- [X] T018 [P] [US1] Write `js-tests/globe-acceptance.test.js`: loads the exported `globe` dataset from disk, runs `examples/globe/science.js` at each stream's paper view, asserts the non-concave fractions 48.0 / 16.2 / 87.6 / 87.2 % to 0.1 % (orbit1, orbit2, spray, nbody) and prints them
- [X] T019 [P] [US1] Write `js-tests/globe-kernel.test.js` for the pure `shade(camera, texture, size, out)` exported by `globe.js`: pixels outside the disc untouched; centre pixel samples the texture at the camera's toward-direction; reduced-resolution mode fills the full output
- [X] T020 [P] [US1] Write `js-tests/skypanel-scale.test.js` for the pure `autoscale(xy, points, pad)`: equal aspect, contains all points, centred on the data's mid-range, handles a single point
- [X] T021 [P] [US1] Write `tests/test_build.py` (served): output has `index.html` with `<meta name="figkit-version" content="<version>">` and an import map mapping `figkit/` → `vendor/figkit-<version>/` and `app/` → `./`; vendored files equal `src/figkit/js/*`; datasets copied to `data/`; `BuildError` naming file and line for a relative import, for `import.meta.url`, for a non-literal dynamic import and for a dataset with `figkit_data: 2`; CLI exit codes per contracts/cli.md
- [X] T022 [P] [US1] Write `tests/test_smoke.py::test_served` (marker `smoke`): serve the built site with `figkit.serve` on a free port; load the page; fail on any request to a host other than 127.0.0.1; read the four panel readouts (48.0 / 16.2 / 87.6 / 87.2 %); drag the background and assert `camera` changed and stays orthonormal; drag the Orbit 1 marker and assert only that panel's readout changed

### Implementation for User Story 1

- [X] T023 [US1] Write `examples/globe/make_source.py` (runs inside the paper repo's environment, from the prototype worktree listed above, reusing the `GLOBE_EXPLORER` block's computations) that saves `examples/globe/source.npz`: per stream (`orbit1`, `orbit2`, `spray`, `nbody`) `pos`, `d1`, `d2` (simulation frame, float32), particles subsampled to ≤ 3000 (`points`), `T` (3×3, globe frame → simulation frame), paper `view` (globe frame), `color`, `panel_rot_deg`; plus `texture` (181×361×4 uint8), `camera` (3×3), `r_globe`, `radial_power`, `cap_deg`; run it once and commit `source.npz`
- [X] T024 [P] [US1] Write `examples/globe/SOURCE.md`: provenance and attribution to the paper, https://ui.adsabs.harvard.edu/abs/2026arXiv260940057S/abstract, the licence (MIT, as in the paper repository), how `source.npz` was made (T023) and what is subsampled
- [X] T025 [US1] Write `examples/globe/export.py` (`--out DIR`): reads `source.npz`, squashes globe lines radially (prototype `squash`: `r → R (r/R)^p`, unit-globe coordinates), and calls `figkit.export(out, "globe", arrays=…, meta=…, licence="MIT", doi=None)` with meta: stream ids, colours, `T` matrices, paper views, `panel_rot_deg`, initial camera, `cap_deg`, texture layout note; entries per contracts/data-format.md
- [X] T026 [P] [US1] Implement `src/figkit/js/stage.js` (`createStage` drawing in CSS pixels via one `setTransform`, DPR re-read on resize and resolution change, `requestDraw` coalesced to one rAF; `dragHelper` with pointer capture, hit test, start/move/end) per contracts/js-api.md
- [X] T027 [P] [US1] Write `src/figkit/js/figkit.css`: light/dark custom properties via `prefers-color-scheme`, `.fk-panel`, `.fk-grid`, `.fk-error`
- [X] T028 [US1] Implement `src/figkit/js/globe.js`: `mount(el, model, {texture, lines, points, colors, markerAxes, markerSizeDeg})` and the pure `shade` kernel; per-pixel unit vectors precomputed per size; shading cached by (camera, size), reduced resolution while rotating and full on release, drawn through an offscreen canvas; great circles and a, b, c axes; lines/points with back half faint; one square marker per view at its camera-facing end with edges from `markerAxes`; hit-testing markers; marker drag keeps the view's own end (antipode rule); writes `camera`/`views` by replacement and calls `save_changes()` on pointerup; removes listeners on dispose; port `buildShade/drawGlobe/squareCorners/inside` from the prototype; make T019 pass; depends on T015, T026
- [X] T029 [US1] Implement `src/figkit/js/skypanel.js`: `mount(el, model, {id, title, color, compute})` and pure `autoscale`; recomputes only when `views[id]` changed; draws points, highlighted segments (mask), the line, the origin cross and the readout; title via `textContent`; port `drawPanel` drawing from the prototype; make T020 pass; depends on T026
- [X] T030 [P] [US1] Implement `examples/globe/science.js` (pure): for a stream and a globe-frame view, map the view to the simulation frame with `T`, build the sky basis with `rotationToZ` and `panel_rot_deg`, project `pos/d1/d2/points`, and classify each point as non-concave when the projected curvature normal has no component toward the projected centre; return `{xy, points, mask, readout}` with the percentage; port `skyAxes/project` from the prototype; make T018 pass
- [X] T031 [US1] Implement `examples/globe/widget.js` (the app; default export `{ render({ model, el, signal }) }`): loads data with `loadData`, initialises `camera`/`views`, builds the layout (globe + 2×2 panels + Reset camera / Reset all views buttons), mounts `globe` (with `markerAxes` from science.js) and four `skypanel`s (with `compute` from science.js); cleans up on `signal`
- [X] T032 [US1] Write `examples/globe/index.html`: title, link to `figkit/figkit.css`, a container, a citation line linking the paper's ADS page, and a module script `import { run } from "figkit/figkit.js"; import app from "app/widget.js"; run(app, el)`; import map is inserted by the build
- [X] T033 [US1] Implement the served build in `src/figkit/build.py` (`build(app_dir, data=…, out=…)`, `BuildResult`, `BuildError`): copy app files, vendor `figkit/js/` to `vendor/figkit-<version>/`, insert the import map and version meta into `index.html`, copy datasets, and run the import checks (relative imports, `import.meta.url`, non-literal specifiers, unresolvable specifiers) with file:line errors and the `figkit_data` major check; re-export from `__init__.py`; make T021 pass
- [X] T034 [P] [US1] Implement `src/figkit/serve.py` (`ThreadingHTTPServer` on 127.0.0.1, `.npy` → `application/octet-stream`, `Cache-Control: no-store`, optional browser open) per research R4
- [X] T035 [US1] Implement `src/figkit/cli.py` (`figkit build`, `figkit serve`, `--version`; exit codes 0/1/2 per contracts/cli.md); depends on T033, T034
- [X] T036 [US1] Run quickstart.md steps 1–3, make T022 pass, and compare the page side by side with the prototype (`src/data/derived/globe_explorer.html` in the paper worktree); record any behavioural difference as a fix

**Checkpoint**: User Story 1 is complete and demonstrable — the MVP

---

## Phase 4: User Story 2 — Archive the figure as one file (Priority: P2)

**Goal**: A single self-contained HTML file that works from `file://` offline.

**Independent Test**: quickstart.md step 4; smoke test against `file://` with network blocked.

### Tests for User Story 2 (write first, must fail)

- [X] T037 [P] [US2] Extend `tests/test_build.py`: `inline_modules` output has no bare `figkit/`/`app/` specifiers left and no import map; dependencies are inlined before dependants; a cycle raises `BuildError`; `--single-file` output contains the version meta and the boot script; a size above `size_warning_mb` adds a warning and still succeeds
- [X] T038 [P] [US2] Add `tests/test_smoke.py::test_single_file` (marker `smoke`): open the single file via `file://` with every request aborted unless its URL starts with `file:`, `data:` or `blob:` (research R1: do not use Playwright `offline=True`, which breaks `file://` in WebKit); assert the four readouts and a marker drag as in T022

### Implementation for User Story 2

- [X] T039 [US2] Implement `inline_modules(entry, roots)` in `src/figkit/build.py` (research R1): resolve bare specifiers via `roots`, topologically order, rewrite each import/export-from/dynamic-import string literal into a nested `data:text/javascript;base64,…` URL, detect cycles; export from `__init__.py`; depends on T033
- [X] T040 [US2] Implement the single-file build in `src/figkit/build.py` (`single_file=…`, `entry=…`, `size_warning_mb=50`): inline the app via `inline_modules`, inline CSS, embed each dataset as a `data:`-URL map passed to `loadData`, append the boot script, insert the version meta, warn above the threshold; wire `--single-file`, `--entry`, `--size-warning-mb` into `src/figkit/cli.py`; make T037 and T038 pass
- [X] T041 [US2] Run quickstart.md step 4 by hand in Chrome and Safari with Wi-Fi off; record the result in `specs/001-figkit-v0-1/quickstart.md` notes

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 — Explore the same app in a notebook (Priority: P3)

**Goal**: `figkit.anywidget.Widget` runs the example app in JupyterLab with state readable in Python.

**Independent Test**: quickstart.md step 6.

### Tests for User Story 3 (write first, must fail)

- [X] T042 [P] [US3] Write `tests/test_anywidget.py` (skipped when `anywidget` is missing): `Widget(app=…, data=…)` has `_esm` with no bare specifiers, a `manifest` Dict trait, one `npy_<entry>` Bytes trait per array whose bytes equal the `.npy` file, and synced `camera` (9 floats) and `views` (dict) traits
- [X] T043 [P] [US3] Extend `js-tests/data.test.js`: `loadData(model)` with a fake model holding `manifest` and `npy_<entry>` values as `DataView`s returns the same arrays as the file path (via `asTyped`)

### Implementation for User Story 3

- [X] T044 [US3] Implement `src/figkit/anywidget.py` (`Widget(app, data)`: `_esm = inline_modules(app, roots=…)`, `manifest` and `npy_<entry>` traits, `camera`/`views` synced) per contracts/python-api.md and research R2; make T042 pass
- [X] T045 [US3] Extend `src/figkit/js/data.js` for the model source (read `manifest`, convert `npy_<entry>` `DataView`s with `asTyped`); make T043 pass
- [X] T046 [US3] Run quickstart.md step 6 in JupyterLab (`uv run --extra notebook --with jupyterlab jupyter lab`): render, drag the Orbit 1 marker, read `w.views["orbit1"]`; also confirm it renders in marimo; record results in `specs/001-figkit-v0-1/quickstart.md` notes

**Checkpoint**: Stories 1–3 work independently

---

## Phase 6: User Story 4 — Upgrade a webapp to a newer figkit (Priority: P4)

**Goal**: The `figkit-upgrade` skill moves a webapp across a documented breaking change.

**Independent Test**: the rehearsal in T049.

- [X] T047 [US4] Write `skills/figkit-upgrade/SKILL.md` (frontmatter `name: figkit-upgrade`, a `description` that triggers on upgrading/bumping figkit in a webapp or paper repo): find the built-against version (`<meta name="figkit-version">` or a manifest's `figkit`), read `CHANGELOG.md` from that version to the target, apply each migration note in order (**Find** then **Edit**), bump the pin in `pyproject.toml`, rebuild, rerun the app's tests and acceptance numbers, report what changed; stop and report if a breaking change has no migration note
- [X] T048 [P] [US4] Add `skills/figkit-upgrade/card.json` (`name`, `description`: one or two plain sentences) in the format used by `nstarman/skills` (see that repo's AGENTS.md)
- [X] T049 [US4] Rehearse the upgrade: on a throwaway branch tag `v0.1.0-rc.1`; make a deliberate breaking rename (e.g. `skypanel` option `compute` → `project`) with a migration note, tag `v0.1.0-rc.2`; copy `examples/globe` to a scratch paper-like repo pinned to rc.1; have a fresh subagent apply the skill to upgrade it to rc.2; confirm it builds and passes T018/T022 at rc.2; write the outcome to `specs/001-figkit-v0-1/upgrade-rehearsal.md`; delete the throwaway tags and branch

---

## Phase 7: User Story 5 — An agent builds a new webapp with the figkit skill (Priority: P5)

**Goal**: The `figkit` skill lets an agent produce a conforming webapp.

**Independent Test**: the rehearsal in T053.

- [X] T050 [US5] Write `skills/figkit/SKILL.md` (frontmatter `name: figkit`, a `description` that triggers on requests for interactive figures/webapps for a paper or work in a `webapps/` folder): steps scaffold → export (dtype rules, no silent narrowing) → science.js with a `node --test` check against numbers from the paper's Python → widget.js (state rules: replace don't mutate, derived data in callbacks, `views` dict) → build both outputs → view → notebook
- [X] T051 [P] [US5] Write `skills/figkit/references/components.md` (globe and skypanel options, model keys, `run`), `data-contract.md`, `conventions.md` (import rule, no top-level DOM, frames, `camera` row order, angle conventions, antipode rule) and `worked-example.md` (walkthrough of `examples/globe`), consistent with contracts/js-api.md
- [X] T052 [P] [US5] Create `skills/figkit/assets/template/` (`index.html`, `widget.js`, `science.js`, `science.test.js`, `export.py`) — a minimal app with one skypanel and a reset button that builds and passes its test; add `skills/figkit/card.json`
- [X] T053 [US5] Rehearse the skill: a fresh subagent with only the skill builds a small new webapp in a scratch folder (exported 2-D points; a slider that rotates them; a readout) and both outputs; check it passes `figkit build`'s checks and has a passing science test; write the outcome and any skill fixes to `specs/001-figkit-v0-1/skill-rehearsal.md`

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T054 [P] Add `.github/workflows/gallery.yml`: on `release: published` and manual dispatch, install the package, run `examples/globe/export.py`, build served + single file into `site/`, add a small `site/index.html` gallery page (citation, link to the single file), deploy with `actions/upload-pages-artifact` + `actions/deploy-pages`; enable Pages (source: GitHub Actions) on the repo
- [X] T055 [P] Add a CI step in `.github/workflows/tests.yml` that, on tags, fails if the tag differs from `v` + `figkit.__version__`
- [X] T056 Extend `tests/test_smoke.py` with SC-002 (time to first panel readout < 2 s, served and single file) and SC-003 (programmatic 2 s marker drag on Chromium at `deviceScaleFactor: 2`, count rAF redraws, assert ≥ 30 fps, print the value)
- [X] T057 [P] Measure SC-007: line counts of `examples/globe/{widget.js,index.html}` versus the prototype `globe_explorer.html`; record in `specs/001-figkit-v0-1/quickstart.md` notes
- [X] T058 [P] Finalise `README.md` (install from tag, 10-line usage, gallery link) and `AGENTS.md` (drop the *(v0.1)* markers; layout, conventions, testing and releasing as built)
- [ ] T059 Run the whole of quickstart.md; confirm the CI smoke matrix is green on chromium, firefox and webkit (Firefox is the R1 gate)
- [ ] T060 Set `__version__ = "0.1.0"`, write the `## 0.1.0 — <date>` section in `CHANGELOG.md`, merge `001-figkit-v0-1` to `main`, tag `v0.1.0`, publish the release, and confirm the gallery deploys

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: after Setup; blocks all stories
- **US1 (Phase 3)**: after Foundational — the MVP
- **US2 (Phase 4)**: after US1's served build (T033); otherwise independent
- **US3 (Phase 5)**: after US2's `inline_modules` (T039) and US1's example app (T031)
- **US4 (Phase 6)**: after US1 (needs a working example to upgrade); independent of US2/US3
- **US5 (Phase 7)**: after US1–US3 (the skill documents all of them)
- **Polish (Phase 8)**: after the stories it touches; T060 last

### Within each story

Tests first (must fail) → pure modules → components → app → build → manual check.

### Parallel opportunities

- Phase 1: T003, T004, T005 together after T001–T002
- Phase 2: all six test tasks T006–T011 together; then T013, T014, T015 together (T012 in parallel
  with them, being Python)
- US1: T018–T022 together; T024, T026, T027, T030, T034 together once T023/T025 exist
- US4 can run alongside US2/US3 once US1 is done
- Phase 8: T054, T055, T057, T058 together

## Parallel Example: User Story 1

```text
Tests:  T018 globe-acceptance.test.js | T019 globe-kernel.test.js | T020 skypanel-scale.test.js
        T021 tests/test_build.py      | T022 tests/test_smoke.py::test_served
Build:  T026 stage.js | T027 figkit.css | T030 science.js | T034 serve.py | T024 SOURCE.md
```

## Implementation Strategy

### MVP first (User Story 1)

1. Phase 1 → Phase 2 → Phase 3
2. **Stop and validate**: quickstart steps 1–3, the four fractions, no third-party requests
3. Demo the served globe example

### Incremental delivery

1. US1 → MVP served site
2. US2 → single-file archive
3. US3 → notebook
4. US4 → upgrade skill rehearsed
5. US5 → build skill rehearsed
6. Polish → gallery, CI gates, v0.1.0 release
