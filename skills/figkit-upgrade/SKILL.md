---
name: figkit-upgrade
description: Upgrade a figkit webapp (or a paper repository's webapps) to a newer figkit version, applying the changelog's migration notes in order, rebuilding and re-checking the app's numbers. Use when asked to upgrade, bump or update figkit, when a webapp was built against an older figkit tag, or when a figkit build or page fails after a version change.
---

# Upgrading a figkit webapp

figkit webapps are pinned to one figkit version (a git tag of `nstarman/figkit`). Every built page
records it, and every breaking change in figkit ships a **migration note** saying exactly how to
update an app. This skill applies those notes; it never guesses.

## 1. Find the current and target versions

- **Built against**: the page's `<meta name="figkit-version" content="X.Y.Z">` (in a built
  `index.html` or single-file page), or `"figkit"` in a dataset's `data/<name>/manifest.json`.
- **Pinned**: the `figkit @ git+https://github.com/nstarman/figkit@vX.Y.Z` line in the repo's
  `pyproject.toml` (or `environment.yml` / requirements file).
- **Target**: what the user asked for; otherwise the latest release
  (`gh release list -R nstarman/figkit --limit 1`).

If the versions are equal, report that and stop.

## 2. Read the migration notes

Install the target version, then read its changelog, which includes every earlier release:

```bash
uv add "figkit @ git+https://github.com/nstarman/figkit@vTARGET"   # or edit the pin and `uv sync`
uv run python -c "import figkit, pathlib; print((pathlib.Path(figkit.__file__).parent / 'CHANGELOG.md').read_text())"
```

Take every section **after** the current version up to and including the target, oldest first.
List each breaking change and its migration note: **What changed**, **Find**, **Edit**.

**Stop** if a section describes a breaking change (under "Changed" or "Removed", or anything that
renames or removes an API, option, model key, file or command) without a migration note. Report
the gap to the user; do not improvise an edit.

## 3. Apply the notes, oldest first

For each note:

1. Run its **Find** (e.g. `grep -rn "compute:" webapps/`) over the app code: `webapps/*/`
   (`index.html`, `*.js`) and the export scripts.
2. Make the **Edit** at every hit, exactly as written. Change nothing else.
3. Re-run **Find** to confirm no hits remain.

## 4. Rebuild and check

For each webapp:

```bash
uv run python webapps/<name>/export.py --out build/data          # re-export: the manifest records the version
uv run figkit build webapps/<name> --data build/data/<dataset> --out build/site/<name> --single-file build/<name>.html
node --test 'webapps/<name>/*.test.js'                             # the app's science tests, if any
```

The build must succeed (it rejects relative imports, `import.meta.url` and datasets of another
data-format version). Open the served build (`uv run figkit serve build/site`) and check that the
numbers the app reproduces from the paper are unchanged.

## 5. Report

Tell the user: old → new version, each migration note applied (with the files touched), the
build and test results, and anything that could not be done.
