# Contract: dataset folder (data format 1)

```
data/<dataset>/
  manifest.json
  <entry>.npy        one per kind "array" entry
  <entry>.json       one per kind "json" entry
  README.md          generated
```

## manifest.json

```json
{
  "figkit_data": 1,
  "figkit": "0.1.0",
  "name": "globe",
  "meta": {"streams": ["orbit1", "orbit2", "spray", "nbody"], "r_globe_kpc": 90.0},
  "licence": "CC-BY-4.0",
  "doi": "10.xxxx/xxxxx",
  "entries": {
    "track_orbit1": {
      "kind": "array", "file": "track_orbit1.npy", "dtype": "<f4", "shape": [500, 3],
      "source_dtype": "float32", "sha256": "…", "unit": "kpc",
      "description": "Orbit 1 track in its simulation frame"
    },
    "texture": {
      "kind": "array", "file": "texture.npy", "dtype": "|u1", "shape": [181, 361, 4],
      "source_dtype": "uint8", "sha256": "…",
      "description": "RGBA convexity regions; rows colatitude 0..pi, columns azimuth 0..2pi inclusive"
    }
  }
}
```

- Keys not listed in [data-model.md](../data-model.md) are rejected by `figkit.load` (forward
  compatibility comes from `figkit_data`, not from unknown keys).
- A reader with a different `figkit_data` major MUST refuse the dataset with a message naming both
  versions.

## `.npy` files

Standard NumPy format version 1.0 (`numpy.lib.format`), written by `np.save`; header padded to a
multiple of 64 bytes, so the data offset is 64-byte aligned. `fortran_order` is always `False`.
Readable with `numpy.load(path)` and nothing else.

## README.md (generated)

States the dataset name, figkit version, licence/DOI, a table of entries (file, dtype, shape, unit,
description) and the two lines a reader needs:

```python
import numpy as np
x = np.load("track_orbit1.npy")
```
