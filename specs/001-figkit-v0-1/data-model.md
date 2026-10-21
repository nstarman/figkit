# Data Model: figkit v0.1

Entities from the spec, with fields, validation rules and relationships. On-disk and API shapes
are in [contracts/](contracts/).

## Dataset

A named folder of arrays and metadata — the unit a webapp loads and a reader reuses.

| Field | Type | Rules |
|---|---|---|
| name | str | `[a-z][a-z0-9_-]*`; folder name under `data/` |
| figkit_data | int | data-format major version; `1` in v0.1 |
| figkit | str | figkit version that wrote it (`X.Y.Z`) |
| meta | JSON object | free-form; strings, numbers, lists, dicts only |
| licence | str? | SPDX id, e.g. `CC-BY-4.0` |
| doi | str? | DOI of the paper or deposit |
| entries | map name → Entry | ≥ 1 entry; names `[a-z][a-z0-9_]*`, unique |

Relationships: a Dataset has many Entries; a Built site contains one or more Datasets.

## Entry (kind `array`)

| Field | Type | Rules |
|---|---|---|
| kind | `"array"` | v0.1 also accepts `"json"` (file is a `.json`) |
| file | str | `<name>.npy`, relative to the dataset folder |
| dtype | str | one of `<f4 <f8 <i1 <u1 <i2 <u2 <i4 <u4 |b1` |
| shape | int[] | matches the `.npy` header; zero-length axes allowed |
| source_dtype | str | numpy dtype string of the array passed to export |
| sha256 | str | hex digest of the `.npy` file bytes |
| unit | str? | free text, e.g. `kpc` |
| description | str? | one sentence |

Validation (export): reject int64/uint64, float16, complex, object, string, structured and datetime
dtypes with an error naming the entry; convert big-endian and non-C-contiguous input; narrowing
`<f8 → <f4` only when requested and the range-relative check passes (research R5). Validation
(load, Python and JS): file exists, header dtype/shape match the manifest, sha256 matches (Python
only; JS skips hashing for speed), `figkit_data` major equals the reader's.

## Model (runtime state of one webapp instance)

| Key | Value | Written by | Read by |
|---|---|---|---|
| camera | number[9], row-major 3×3 rotation: rows page-right, page-up, toward-camera, in the dataset's frame | globe (on drag) / app (reset) | globe |
| views | `{<id>: [x, y, z]}` unit vectors in the dataset's frame | globe (marker drag) / app (reset) | globe, sky panels (via app) |

Rules: values are replaced, never mutated; `camera` is re-orthonormalised by the writer; `views`
entries keep the sign of their own end of the line during a drag (antipode rule); notebooks receive
`save_changes()` on pointer-up only. Data arrays are passed to components as options, not model keys,
on the web; in notebooks they arrive as bytes traits and are converted with `asTyped`.

State transitions: `idle → rotating (pointerdown on background) → idle (pointerup)`;
`idle → dragging marker <id> (pointerdown on marker) → idle (pointerup)`. Shading resolution is low
in `rotating`, full in `idle`.

## Component

`{ mount(el, model, opts) → dispose }`. Owns its DOM inside `el`, subscribes to model keys, removes
listeners on dispose. v0.1: `globe`, `skypanel`.

## App

A paper-specific anywidget module: default export `{ render({ model, el, signal }) }` that reads
its data (web: `loadData`; notebook: traits), owns the science callback, and mounts components.
Relationships: an App uses one Model, several Components and one or more Datasets.

## Built site / single file

| Field | Rules |
|---|---|
| figkit version | `<meta name="figkit-version" content="X.Y.Z">` in every page |
| served layout | `index.html`, app modules, `vendor/figkit-X.Y.Z/…`, `data/<dataset>/…`, import map in `index.html` |
| single file | one HTML; modules and data as `data:` URLs; size warning above 50 MB |

## Release

| Field | Rules |
|---|---|
| tag | `vX.Y.Z`, equals `figkit.__version__` |
| changelog | `CHANGELOG.md` section `## X.Y.Z — YYYY-MM-DD` with Added/Changed/Fixed |
| migration notes | per breaking change: **What changed**, **Find** (grep pattern), **Edit** (exact change) |
