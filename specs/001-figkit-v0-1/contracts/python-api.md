# Contract: Python API

```python
import figkit
figkit.__version__                      # "0.1.0"
```

## figkit.export

```python
figkit.export(
    out_dir: str | Path,                # parent folder; dataset written to out_dir / name
    name: str,
    arrays: Mapping[str, ArrayLike],
    *,
    meta: Mapping[str, Any] | None = None,
    json: Mapping[str, Any] | None = None,        # extra kind-"json" entries
    units: Mapping[str, str] | None = None,
    descriptions: Mapping[str, str] | None = None,
    narrow: Iterable[str] | bool = False,         # names (or True for all) to narrow f8 → f4
    rtol: float = 1e-6,                           # range-relative tolerance for narrowing
    licence: str | None = None,
    doi: str | None = None,
    overwrite: bool = False,
) -> Path                                         # the dataset folder
```

Raises `figkit.DataError` (subclass of `ValueError`) for disallowed dtypes, failed narrowing (message
gives the entry, max error and threshold), bad names, or an existing folder without `overwrite`.

## figkit.load

```python
figkit.load(path: str | Path) -> figkit.Dataset
# Dataset: .name, .meta, .arrays (dict[str, np.ndarray]), .json (dict), .manifest (dict)
```

Verifies `figkit_data`, header/manifest agreement and sha256; raises `figkit.DataError`.

## figkit.build

```python
figkit.build(
    app_dir: str | Path,                 # folder with index.html and app modules
    *,
    data: Iterable[str | Path] = (),     # dataset folders to include
    out: str | Path | None = None,       # served site folder
    single_file: str | Path | None = None,
    entry: str = "widget.js",            # app module booted by the single file / notebook
    size_warning_mb: float = 50.0,
) -> figkit.BuildResult                  # .out, .single_file, .warnings
```

- Served: copies app files; vendors `figkit/js/` to `vendor/figkit-<version>/`; writes the import
  map (`"figkit/"` → vendor path, `"app/"` → `./`) into `index.html`; copies datasets to `data/`;
  inserts `<meta name="figkit-version">`.
- Single file: `index.html` with modules and data inlined (see `inline_modules`), boot script
  appended, version meta inserted.
- Raises `figkit.BuildError` naming file and line for relative imports, `import.meta.url`,
  non-literal or unresolvable specifiers, import cycles, or a dataset with another `figkit_data`
  major.

## figkit.inline_modules

```python
figkit.inline_modules(entry: str, *, roots: Mapping[str, Path]) -> str
# roots: {"figkit/": <figkit js dir>, "app/": <app dir>}
# returns the entry module's source with every import rewritten to nested data: URLs
```

## figkit.anywidget.Widget  (extra: `figkit[notebook]`)

```python
from figkit.anywidget import Widget
w = Widget(app="webapps/globe/widget.js", data="data/globe")   # or data=[...]
w.camera     # list[float], 9 values, synced
w.views      # dict[str, list[float]], synced
```

`_esm` = `inline_modules(app, roots=…)`; arrays → `traitlets.Bytes` traits named `npy_<entry>`;
the manifest → a `Dict` trait `manifest`. The app reads them through `figkit/data.js`
(`loadData` accepts a model as its source).

## figkit.serve

```python
figkit.serve(directory: str | Path, *, port: int = 8000, open_browser: bool = True) -> None
```
