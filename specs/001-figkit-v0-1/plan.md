# Implementation Plan: figkit v0.1 — toolbox for interactive paper figures

**Branch**: `001-figkit-v0-1` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-figkit-v0-1/spec.md`; agreed design in
[design.md](design.md).

## Summary

Build figkit v0.1: a Python package (export/load a `.npy` + manifest data contract, build served
and single-file sites, local preview, notebook wrapper) that ships a small no-build browser library
(model, npy/data loading, geometry, HiDPI stage, globe and sky-panel components). The proof is the
convexities paper's globe explorer rebuilt as `examples/globe/`, reproducing the paper's four
non-concave fractions on the web, from `file://` and in a notebook. Research ([research.md](research.md))
confirmed that one Python `inline_modules()` — rewriting bare imports into nested `data:` URLs —
serves both the single-file build and the notebook wrapper in Chromium and WebKit; Firefox is
covered by CI.

## Technical Context

**Language/Version**: Python ≥ 3.11 (package, CLI, tests); JavaScript ES2022 modules for current
evergreen browsers; Node ≥ 20 for JS tests only.

**Primary Dependencies**: numpy ≥ 1.24 (runtime); anywidget ≥ 0.11,< 0.12 (optional
`notebook` extra); hatchling (build); dev: pytest, pytest-playwright 0.10, playwright browsers.
No JS dependencies.

**Storage**: files — dataset folders (`manifest.json` + `.npy`), built site folders, single HTML.

**Testing**: pytest (Python, build checks, round trips); `node --test` (pure JS modules + acceptance
numbers); pytest-playwright smoke tests (served + `file://`, chromium/firefox/webkit in CI).

**Target Platform**: static hosting (GitHub Pages) and local `file://`; JupyterLab/marimo for the
notebook path; development on macOS, CI on ubuntu-latest.

**Project Type**: library + CLI (Python package carrying a browser library).

**Performance Goals**: interactive within 2 s of load; ≥ 30 fps while dragging at 2× DPR (SC-002/003).

**Constraints**: no build step; no third-party hosts at runtime; bare-specifier imports only;
single file warns above 50 MB; offline-capable single file.

**Scale/Scope**: v0.1 = 9 browser modules + 1 CSS file, ~5 Python modules, 1 example, 2 skills.
Globe example data ≈ a few MB (4 tracks × 500 points, ≤ 12k particles, 181×361 RGBA texture).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Web-native, no build step | Browser code is hand-written ESM + CSS; Node used only for `node --test` | ✅ |
| II. Vendored and pinned | Build vendors `vendor/figkit-X.Y.Z/`, stamps version; no third-party JS in v0.1 | ✅ |
| III. One source, two outputs | `figkit build` emits both; build rejects relative imports and `import.meta.url`; mechanism verified (R1) | ✅ (Firefox via CI) |
| IV. Open data contract | `.npy` + manifest; dtype rules and checked, opt-in narrowing (R5); `np.load` reuse tested | ✅ |
| V. Notebook parity | Standalone model mirrors AFM model API; app module is the anywidget module; `signal` cleanup (R2) | ✅ |
| VI. Small, generic, earned | Only modules the globe explorer needs; science in `examples/globe/science.js` | ✅ |
| VII. Verified against Python | node tests + acceptance numbers; pytest round trip; smoke tests for both outputs | ✅ |
| Releases | CHANGELOG + migration-note gate; skills updated with API; gallery from releases | ✅ |

Post-design re-check (after Phase 1): unchanged — all ✅. The only deviation from design.md is a
simplification (R1: the single file needs no import map), which strengthens Principle III.

## Project Structure

### Documentation (this feature)

```text
specs/001-figkit-v0-1/
├── spec.md  design.md  plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── data-format.md      dataset folder + manifest schema
│   ├── python-api.md       export / load / build / inline_modules / Widget
│   ├── cli.md              figkit build / serve
│   └── js-api.md           browser modules, component options, model keys
├── checklists/requirements.md
└── tasks.md                (Phase 2, /speckit-tasks)
```

### Source Code (repository root)

```text
pyproject.toml
src/figkit/
├── __init__.py            __version__, export, load, build re-exports
├── data.py                export(), load(), dtype rules, narrowing check, manifest, README
├── build.py               build(), inline_modules(), import checks, import map, vendoring
├── serve.py               serve()
├── cli.py                 `figkit build | serve`
├── anywidget.py           Widget (optional extra)
└── js/
    ├── figkit.js  model.js  npy.js  data.js  geom.js  stage.js  globe.js  skypanel.js
    └── figkit.css
examples/globe/
├── source.npz  SOURCE.md   compact fixture from the paper (R8)
├── export.py               source.npz → data/globe/
├── science.js              pure: project + classify
├── widget.js               the app (anywidget module)
└── index.html
skills/
├── figkit/SKILL.md  references/{components.md, data-contract.md, conventions.md, worked-example.md}
│                    assets/template/{index.html, widget.js, science.js, export.py, science.test.js}
└── figkit-upgrade/SKILL.md
tests/                      pytest: test_data.py, test_build.py, test_serve.py, test_smoke.py
js-tests/                   node --test: model, npy, data, geom, globe-kernel, skypanel-scale, globe-acceptance
.github/workflows/          tests.yml (pytest + node + smoke matrix), gallery.yml (Pages on release)
CHANGELOG.md  AGENTS.md  CLAUDE.md  README.md  LICENSE
```

**Structure Decision**: single Python package with the browser library as package data
(src layout), one example folder that doubles as gallery entry and acceptance test, and skills
versioned in-repo. Pure JS logic is split from DOM code so it is testable with Node: `npy.js`,
`data.js`, `model.js` and `geom.js` are DOM-free; `globe.js` and `skypanel.js` export their pure
kernels (shading, autoscale) separately from `mount`.

## Complexity Tracking

No constitution violations to justify.
