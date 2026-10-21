# AGENTS.md

figkit is a toolbox for webapps that are the interactive counterparts of scientific papers:
a Python package that exports data and builds sites, carrying a browser library of plain ES
modules. Read `.specify/memory/constitution.md` first; it overrides everything here.

## Status

Pre-v0.1. The design and requirements are in `specs/001-figkit-v0-1/` (`spec.md`, `design.md`).
Sections below marked *(v0.1)* describe the layout that spec creates; update them as it lands.

## How work is done here

This repo uses [Spec Kit](https://github.com/github/spec-kit) v1.1.3 (installed under `.specify/`,
commands as `.claude/skills/speckit-*`). A change goes:

1. `/speckit-specify` — what and why, in `specs/NNN-name/spec.md`
2. `/speckit-plan` — how, checked against the constitution
3. `/speckit-tasks` — ordered tasks
4. `/speckit-implement`

Small fixes that change no public API skip straight to a pull request.

## Layout *(v0.1)*

```
src/figkit/            Python: export(), load(), build(), CLI, notebook wrapper
src/figkit/js/         browser library (package data; vendored into built sites)
examples/<name>/       example webapps; also the live gallery and acceptance tests
skills/figkit/         skill: building a webapp with figkit
skills/figkit-upgrade/ skill: moving a webapp to a newer figkit tag
tests/  js-tests/      pytest; node --test
CHANGELOG.md           every release; migration notes for breaking changes
```

## Conventions that are easy to break *(v0.1)*

- JS modules import each other only by bare specifiers (`figkit/model.js`), never `./x.js`, and
  never use `import.meta.url`. `figkit build` rejects violations.
- No DOM access at module top level.
- Components export `mount(el, model, opts) → dispose`; model values are replaced, never mutated.
- Science-specific code stays in the paper's app (`science.js`), not in figkit.

## Testing *(v0.1)*

```bash
uv run pytest
node --test 'js-tests/*.test.js'
```

## Releasing *(v0.1)*

Tag `vX.Y.Z` after adding the `CHANGELOG.md` section. A breaking change needs a migration note
(what changed, how to find it, the exact edit). Public-API changes update both skills in the same
pull request.
