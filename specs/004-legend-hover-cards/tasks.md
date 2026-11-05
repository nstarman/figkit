# Tasks: legend toggles and hover cards

**Input**: [spec.md](spec.md), [plan.md](plan.md). Tests are written first (the plan's Tests
section); each story's smoke tests fail before its code lands.

Format: `- [ ] T### [P?] [Story?] what, in which file`. [P] = can run in parallel (different files,
no pending dependency). US1 = toggles, US2 = hover cards, US3 = the developer-facing legend.

## Phase 1: Setup

- [X] T001 Create the module `src/figpress_apps/js/legend.js` with its header comment and empty
  exports `mount`, `hoverCard`, `placeCard`, and export `mountLegend` and `hoverCard` from
  `src/figpress_apps/js/index.js`
- [X] T002 [P] Test app `tests/apps/legend/` (`index.html`, `widget.js`): a legend of one plain
  entry, two toggles (model keys `a`, `b`, each hiding a coloured line in a small SVG plot), and two
  card entries (one holding a range slider, one holding a 120 × 60 px area that sets `busy` while
  a pointer drag is in progress); a "set a from outside" button and a "dispose" button
- [X] T003 [P] Fixture in `tests/conftest.py` building the test app (served site and single file)
  and serving it, as `globe_site`/`served` do

## Phase 2: Foundational

- [X] T004 [P] `js-tests/legend-place.test.js`: `placeCard` above when it fits with an 8 px margin,
  below when not, clamped at the left and right edges, pinned to the left margin when wider than
  the viewport
- [X] T005 `placeCard(triggerRect, cardSize, viewport, margin = 8) → {left, top}` in
  `src/figpress_apps/js/legend.js` (plan decision 7); T004 passes
- [X] T006 [P] Legend and card styles in `src/figpress_apps/js/index.css`: `.fk-legend`,
  `.fk-legend-entry`, `.fk-legend-card`, `.fk-legend-toggle[aria-pressed="false"]`, `.fk-card`
  (plan decision 10), on theme variables

**Checkpoint**: placement tested; the test app builds and loads with an empty legend.

## Phase 3: User Story 1 — toggles (P1)

**Goal**: clicking an entry shows or hides its curve; the legend shows which are on.
**Independent test**: the toggle smoke tests below, on the test app.

- [X] T007 [P] [US1] Smoke tests in `tests/test_smoke.py`, both outputs: click hides (model `a`
  false, `aria-pressed="false"`, line hidden); click restores; "set a from outside" updates the
  button; Space on the focused button toggles; one `save_changes` per click
- [X] T008 [US1] Plain and toggle entries in `mount` in `src/figpress_apps/js/legend.js`: a span or
  a `<button type="button" aria-pressed>` with the app's icon and label; click does
  `model.set(key, !on)` then `model.save_changes()`; `model.on("change:<key>")` keeps
  `aria-pressed` in step; a missing value is on; an entry with both `toggle` and `card` throws;
  `dispose` removes the elements and model listeners (plan decisions 2, 3). T007 passes

**Checkpoint**: toggles work on their own in both outputs.

## Phase 4: User Story 2 — hover cards (P1)

**Goal**: hovering an entry opens a card of controls that closes when the pointer leaves, even
after a slider drag.
**Independent test**: the card smoke tests below, on the test app.

- [X] T009 [P] [US2] Smoke tests in `tests/test_smoke.py`, both outputs: hover opens the card inside
  the viewport; entry → card keeps it open; leaving both closes it within 0.5 s; **drag the slider,
  leave: closed within 0.5 s (SC-001)**; busy drag left mid-drag stays open, closes after the drag
  ends outside; Tab to the entry opens, Tab into the card keeps it open, Tab out closes, Escape
  closes and refocuses the entry; touch context (`has_touch`): tap opens, tap again closes;
  hovering the second card entry closes the first
- [X] T010 [US2] `hoverCard(trigger, card, {busy, group}) → {release, dispose}` in
  `src/figpress_apps/js/legend.js`: `popover="manual"`; open on mouse/pen `pointerenter` and on
  `focusin`; close 250 ms after leaving both unless busy; blur focus inside on pointer leave when
  not busy (plan decision 5); click toggles; pointer events ignored for touch (decision 6); Escape
  closes and refocuses the trigger (decision 8); re-place on open, `resize`, `scroll` (capture) and
  `ResizeObserver`; `group` keeps one card open; `dispose` removes listeners, observer, timers
- [X] T011 [US2] Card entries in `mount` in `src/figpress_apps/js/legend.js`: a button with `.fk-legend-card`,
  a trailing ✎, `aria-haspopup="dialog"` and `aria-expanded` in step; the card element gets
  `.fk-card` and is appended to the legend's element; one `group` per legend; `dispose` also
  disposes its cards and removes them. T009 passes

**Checkpoint**: cards work in both outputs and every CI browser, including the slider case.

## Phase 5: User Story 3 — a legend from a few lines (P2)

**Goal**: a developer declares entries and gets a themed legend that wraps on a phone.
**Independent test**: the layout and dispose smoke tests, and the docs example.

- [X] T012 [P] [US3] Smoke tests in `tests/test_smoke.py`: at 375 px the page has no horizontal
  scroll and an open card fits (SC-005); with `data-theme="dark"` pinned, the card's background is
  the dark `--fk-bg`; after "dispose", no `.fk-card` or `.fk-legend` remains
- [X] T013 [US3] Fix anything T012 finds in `src/figpress_apps/js/legend.js` or
  `src/figpress_apps/js/index.css`; T012 passes
- [X] T014 [P] [US3] A `legend.js` section in `skills/figpress-apps/references/components.md`
  (entry fields, `mount`, `hoverCard` and `release`, the four-entry example, which must stay within
  about 20 lines: SC-003) and a pointer to it in `skills/figpress-apps/SKILL.md` step 4

## Phase 6: Polish

- [X] T015 [P] `CHANGELOG.md`: Unreleased → Added, `figpress-apps/legend.js` (#16)
- [X] T016 Run the full suite: `uv run pytest`,
  `uv run python tests/make_fixtures.py && node --test js-tests/*.test.js`,
  `uv run pytest -m smoke --browser chromium --browser webkit` (Firefox in CI)
- [ ] T017 Open the pull request (closes #16); after release, open the CP2 port as a separate change
  in the paper repository (SC-002)

## Dependencies

- Setup (T001–T003) → Foundational (T004–T006) → US1 and US2.
- US1 (T007–T008) and US2 (T009–T011) both edit `legend.js`'s `mount`; do US1 first, then US2.
  Their test tasks (T007, T009) can be written in parallel.
- US3 (T012–T014) after US1 and US2.
- Polish last.

## Parallel examples

- T002, T003 together; T004, T006 together.
- T007 and T009 (both in `tests/test_smoke.py`, so in one editing pass) while T005 runs.
- T014 and T015 together.

## Implementation strategy

MVP: Setup, Foundational and US1 (toggles), then US2 (cards, and the bug that motivated #16), then
US3 and polish. Ship as one pull request; the stories are separate checkpoints within it, not
separate releases.
