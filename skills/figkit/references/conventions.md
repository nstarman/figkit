# Conventions (enforced or relied on by figkit)

## Imports

- Modules import each other **only by bare specifiers**: `figkit/<module>.js` for the library and
  `app/<file>.js` for the app's own files. Never `./x.js`, `../x.js`, `/x.js` or a URL.
- No `import.meta.url`, and dynamic `import()` only with a string literal.
- Why: the single-file build and the notebook wrapper inline modules as `data:` URLs, which have no
  base URL. `figkit build` rejects violations with file:line.
- App files are the top-level files of `webapps/<name>/` (no subfolders). `*.test.js` files are not
  copied into builds.

## Modules

- No DOM access at module top level; do work inside functions.
- `science.js` imports only `figkit/geom.js` (or nothing) and never touches the DOM, so
  `figkit test` can run it in Node.
- Set user-visible text with `textContent`, never `innerHTML`.

## State

- Model values are replaced, never mutated: `model.set("views", { ...views, [id]: v })`.
- Change callbacks receive no arguments; read with `model.get(key)`.
- Notebooks: `model.save_changes()` once per interaction.

## Frames and angles

- A camera is a row-major 3×3 matrix (flat array of 9): rows are page-right, page-up and
  toward-the-viewer, in the data frame.
- `rotationToZ(v)` is the paper convention: the rotation about v × z taking unit v to +z; its rows
  are sky-x, sky-y, v. Antiparallel: diag(1, −1, −1).
- A viewing direction and its antipode give the same projected shape mirrored; the globe draws a
  marker on the camera-facing end and keeps a dragged view on its own end.
- Globe coordinates are in units of the globe radius (radius 1).

## Versions

- Pin figkit to a release tag. Built pages carry `<meta name="figkit-version">`; datasets carry
  `"figkit"` in their manifest. To move to a newer figkit, use the `figkit-upgrade` skill.
