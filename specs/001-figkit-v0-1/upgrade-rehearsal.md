# Upgrade rehearsal (T049, User Story 4) — 2026-10-21

**Setup**: local-only tags `v0.1.0rc1` and `v0.1.0rc2` on a throwaway branch. rc2 renamed the sky
panel option `compute` → `project`, with a migration note in `CHANGELOG.md`. A scratch
"paper" repository pinned `figkit @ git+file://…@v0.1.0rc1` with the globe app in `webapps/globe/`,
built at rc1.

**Run**: a fresh agent given only `skills/figkit-upgrade/SKILL.md` and the task "upgrade to
v0.1.0rc2".

**Result: pass.**
- It identified rc1 from the page meta, the manifest and the pin; installed rc2; read the migration
  note from the installed `figkit/CHANGELOG.md`.
- It applied exactly the documented edit (one hit, `widget.js`), with no other source changes.
- Export, served and single-file builds succeeded; both pages carry `figkit-version 0.1.0rc2`.
- Readouts after the upgrade: 48.0 / 16.2 / 87.6 / 87.2 % — unchanged.

**Skill fixes from the agent's feedback** (applied): record a baseline before upgrading (tests and
page readouts) and a headless readout recipe (`references/check-page.md`); read each Find hit in
context and search syntax variants; the note's Find scope wins; the pin is authoritative when
version sources disagree; keep the pin's URL form; tracked build output is committed with the edit.

The throwaway tags and branch were deleted afterwards.
