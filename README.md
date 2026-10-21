# figkit

A toolbox for webapps that are the interactive counterparts of scientific papers: data, plots and
movies that readers can explore next to the static PDF, built to keep working for years.

- **Python** exports a paper's arrays as plain `.npy` files with a manifest (readers can `np.load`
  them without figkit), builds sites, serves previews and runs the app's JS tests.
- **Browser** code is plain ES modules and CSS — no build step, no framework, no CDN. Each site
  vendors the exact figkit version it was built with.
- **Two outputs** from one source: a site for GitHub Pages, and a single HTML file that opens from
  disk, offline, for archives.
- **Same app in notebooks** (Jupyter, marimo) through anywidget, with state synced back to Python.

Gallery: <https://nstarman.github.io/figkit/> (published from releases).

## Install

Pin a release tag (figkit is not on PyPI):

```bash
uv add "figkit @ git+https://github.com/nstarman/figkit@v0.1.0"
uv add "figkit[notebook] @ git+https://github.com/nstarman/figkit@v0.1.0"   # notebooks
```

## Use

```python
import figkit
figkit.export("build/data", "points", {"xyz": xyz}, meta={"title": "…"})
```

```bash
uv run figkit build webapps/points --data build/data/points --out build/site/points --single-file build/points.html
uv run figkit serve build/site
uv run figkit test webapps/points
```

```python
from figkit.anywidget import Widget
Widget(app="webapps/points/widget.js", data="build/data/points")
```

An app is an `index.html`, a `widget.js` (an anywidget module composing figkit components) and a
DOM-free `science.js`. See [`examples/globe/`](examples/globe/) and the agent skills in
[`skills/`](skills/): `figkit` (building a webapp) and `figkit-upgrade` (moving one to a newer tag).

## Development

```bash
uv sync --all-extras
uv run pytest                                   # Python
uv run python tests/make_fixtures.py && node --test js-tests/*.test.js   # JS
uv run playwright install chromium webkit && uv run pytest -m smoke --browser chromium --browser webkit
```

Design and requirements: [`specs/001-figkit-v0-1/`](specs/001-figkit-v0-1/). Rules:
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).

License: MIT. The globe example's data: see [`examples/globe/SOURCE.md`](examples/globe/SOURCE.md).
