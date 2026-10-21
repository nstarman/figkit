# Quickstart validation: figkit v0.1

Runnable scenarios that prove the feature end to end. API details: [contracts/](contracts/).

## Prerequisites

- `uv`, Node ≥ 20, a checkout of `nstarman/figkit` on branch `001-figkit-v0-1`.
- Playwright browsers: `uv run playwright install chromium firefox webkit`.

## 1. Tests pass

```bash
uv run pytest
node --test 'js-tests/*.test.js'
```

Expected: all pass, including `js-tests/globe-acceptance.test.js` printing
`orbit1 48.0 orbit2 16.2 spray 87.6 nbody 87.2`.

## 2. Export the globe dataset (Story 1, FR-001–005)

```bash
uv run python examples/globe/export.py --out build/data
uv run python -c "import numpy as np; print(np.load('build/data/globe/track_orbit1.npy').shape)"
```

Expected: `build/data/globe/` holds `manifest.json`, one `.npy` per entry and `README.md`; the second
command prints `(500, 3)` using numpy alone.

## 3. Build and view the served site (Story 1, FR-012/015/017)

```bash
uv run figkit build examples/globe --data build/data/globe --out build/site/globe
uv run figkit serve build/site
```

Expected: the browser opens the globe; dragging the background rotates it; dragging a marker
updates only its panel; the panels read 48.0 %, 16.2 %, 87.6 %, 87.2 % at load; the network panel
shows no request to another host; `build/site/globe/vendor/figkit-0.1.0/` exists.

## 4. Single file from disk (Story 2, FR-013)

```bash
uv run figkit build examples/globe --data build/data/globe --single-file build/globe.html
open build/globe.html          # with Wi-Fi off
```

Expected: identical behaviour and numbers offline.

## 5. Build checks (FR-014)

Add `import { x } from "./science.js";` to a copy of `widget.js` and rebuild.
Expected: exit code 1 and an error naming the file and line.

## 6. Notebook (Story 3, FR-016)

```bash
uv run --extra notebook jupyter lab
```

```python
from figkit.anywidget import Widget
w = Widget(app="examples/globe/widget.js", data="build/data/globe"); w
# drag the Orbit 1 marker, then:
w.views["orbit1"]
```

Expected: the widget renders as on the web; `w.views["orbit1"]` changed after the drag.

## 7. Smoke tests, all engines (SC-001–003)

```bash
uv run pytest tests/test_smoke.py --browser chromium --browser firefox --browser webkit
```

Expected: pass for served and `file://` outputs; the drag test reports ≥ 30 fps on Chromium.
