# Skill rehearsal (T053, User Story 5) — 2026-10-21

**Run**: a fresh agent given only `skills/figkit/` (SKILL.md, references, template) built a new
webapp in a scratch repository: exported 2-D points (half an ellipse, float64), a slider that
rotates them by θ, one panel and a readout of the rotated points' mean x, plus a science test
against numpy values.

**Result: pass.** `figkit test` passed (2 tests vs numpy); served and single-file builds succeeded;
in Chromium the readout went from `mean x = 0.000` (θ = 0) to `mean x = -0.317` (θ = 30°; numpy
−0.3172459346); the single file from `file://` rendered the same; no page errors. The agent did not
need figkit's source.

**Fixes from the agent's feedback** (applied):
- Bug: `skypanel` ignored a view equal to `0` (falsy check), leaving the panel blank with no error;
  now only `undefined` means "no view".
- New `skypanel` option `limits` (fixed frame) so motion such as a rotation stays visible.
- Docs: `skypanel` is the general 2-D panel and `views[id]` may be any value; what the origin ×,
  `points` and `mask` draw; adapting the template's `meta.view`; a headless page-check recipe
  (`references/check-page.md`); loading a dataset inside `figkit test`.
