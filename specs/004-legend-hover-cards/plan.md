# Implementation Plan: legend toggles and hover cards

**Branch**: `004-legend-hover-cards` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

## Summary

A new module, `figpress-apps/legend.js`, exports two things: `mount(el, model, {entries})`, the
legend, and `hoverCard(trigger, card, opts)`, the hover-card behaviour on its own (FR-012). The
legend builds one button per toggle or card entry and a plain span otherwise; toggles read and
write top-level boolean model keys; card entries call `hoverCard`. The code starts from CP2's
`hoverCard` (in `webapps/direction-explorer/profile.js` of the paper repo), with the focus fix
built in and three bugs found while planning fixed (below). Styles go in `index.css`. The one pure
piece, card placement, is a kernel tested with `node --test`; the pointer and focus behaviour is
tested in the browser on a small test app.

## Technical Context

- **Language**: plain ES modules and CSS (constitution I), Python ≥ 3.11 for the build and tests.
- **Dependencies**: none new. The card uses the browser's popover API (`popover="manual"`,
  `showPopover`/`hidePopover`), so it renders in the top layer above the page and any canvas.
  Supported by the last two versions of Chrome, Firefox and Safari (the constitution's targets).
- **Testing**: `node --test` for the placement kernel; Playwright smoke tests (Chromium, WebKit,
  Firefox in CI) for hover, focus, touch and the slider bug.
- **Scope**: one module of about 150 lines, about 25 lines of CSS, one test app.

## Design decisions

1. **One module, two exports.** The legend and the hover card are used together, but a hover card
   is also wanted on things that are not legend entries (CP2 opens one from the disk in a plot).
   `hoverCard` is exported on its own, and the legend calls it.
2. **Entry shape.** `{ icon, label, title?, toggle?, card?, busy? }`, where `icon` is an `Element`
   the app draws (spec assumption: line styles are the figure's own). The kind follows from the
   fields: `toggle` (a model key) makes a toggle, `card` (an `Element`) makes a card entry, neither
   makes a plain entry. Both at once is an error thrown at mount.
3. **Toggles bind one top-level boolean model key** (spec assumption). Click flips it with
   `model.set(key, !on)` then `model.save_changes()`; a missing value counts as on (FR-004). The
   button carries `aria-pressed`, so keyboard and assistive technology come free with `<button>`.
4. **`hoverCard(trigger, card, { busy = () => false, group } = {})` returns
   `{ release, dispose }`.** `release()` is called by the app when a drag ends (FR-008) and closes
   the card if the pointer has left; `dispose()` removes listeners, observers and timers (FR-014).
   `group` is a shared object holding the currently open card; the legend passes one per legend so
   at most one of its cards is open (FR-011). Opening a card hides the group's other card.
5. **Focus fix (FR-007), as in CP2:** on `pointerleave` of trigger or card, if the card holds focus
   and nothing is busy, blur it, so a dragged slider cannot hold the card open. Keyboard focus is
   untouched because no pointer leaves.
6. **Touch (FR-009), a CP2 bug found while planning:** a tap fires `pointerenter` (opening the card)
   and then `click` (which toggled it shut again), so on touch the card flashed and closed. Fix:
   `pointerenter`/`pointerleave` act only for `pointerType` `mouse` or `pen`; touch goes through
   `click` alone.
7. **Placement (FR-010)** is a pure kernel,
   `placeCard(triggerRect, cardSize, viewport, margin = 8) → { left, top }`: centred over the
   trigger, above it if it fits with the margin, else below, then clamped into the viewport. It is
   re-run on open, on window `resize` and `scroll` (capture, so scrolling containers count) while
   open, and when the card's size changes (`ResizeObserver`), covering the edge cases. CP2 placed
   only on open.
8. **Escape closes the card** and returns focus to the trigger. The spec did not ask for it, but it
   is the expected keyboard behaviour for a popup (accessibility basics) and costs three lines.
9. **Card entries are marked** with a trailing ✎ and `aria-haspopup="dialog"` plus
   `aria-expanded` kept in step with the card (FR-005).
10. **Styles** in `index.css`, on theme variables (FR-013): `.fk-legend` (flex, wrap, centred),
    `.fk-legend-entry` (inline-flex with icon), `.fk-legend-card` (dashed outline),
    `.fk-legend-toggle[aria-pressed="false"]` (opacity 0.35, struck through), `.fk-card` (the
    popover: fixed, `width: min(92vw, 340px)`, border, radius, shadow). The look is CP2's.

## Constitution Check

- I. Web-native: plain ES modules and CSS, popover API is native. Pass.
- II. Vendored and pinned: nothing new to vendor. Pass.
- III. One source, two outputs: bare `figpress-apps/…` imports only, no DOM at module top level;
  the test app is checked in both built outputs. Pass.
- IV. Data contract: unchanged. Pass.
- V. Notebook parity: talks only through the model (`get`, `set`, `on`, `off`, `save_changes`);
  `mount(el, model, opts) → dispose`; values replaced, `save_changes` once per click. Pass.
- VI. Small, generic, earned: generic legend and popup behaviour; two real apps (CP2's interactive
  Fig. 3 and Explore) use it today. Nested model paths, canvas legends and several open cards are
  left out until an app needs them. Pass.
- VII. Verified: `placeCard` has `node --test` tests; the test app has smoke tests in every browser
  CI runs, both outputs. Pass.
- Skills: the `figpress-apps` skill's components reference gains a `legend.js` section and SKILL.md
  a pointer to it. `figpress-apps-upgrade` needs no change: the API is additive, so there is no
  migration note.

## Project Structure

```text
src/figpress_apps/js/legend.js        new: mount, hoverCard, placeCard
src/figpress_apps/js/index.js         export mountLegend, hoverCard
src/figpress_apps/js/index.css        legend and card styles
js-tests/legend-place.test.js         placeCard: above, below, clamped left/right, tiny viewport
tests/apps/legend/                    test app: index.html, widget.js (plain, 2 toggles, card with a
                                      slider and a draggable busy area)
tests/conftest.py                     fixture building the test app (served and single file)
tests/test_smoke.py                   legend tests (below)
skills/figpress-apps/references/components.md, skills/figpress-apps/SKILL.md
CHANGELOG.md                          Unreleased → Added
```

**Structure decision:** the test app lives under `tests/`, not `examples/`, so the gallery's globe
example (a paper reproduction) stays as it is.

## Tests

`node --test`:

- `placeCard` puts the card above when there is room, below when not, keeps the 8 px margin at
  both edges, and when the card is wider than the viewport pins it to the left margin.

Smoke (Playwright, both outputs, each CI browser):

- Toggle: click hides (model value false, `aria-pressed="false"`); click again restores; a
  `model.set` from outside updates the button; Space on the focused button toggles.
- Card: hover opens it inside the viewport; moving onto the card keeps it open; leaving both closes
  it within 0.5 s.
- The issue's bug (SC-001): hover, drag the slider in the card, move the pointer away: the card is
  closed within 0.5 s.
- Busy: start a drag in the card's busy area, leave the card mid-drag: still open; end the drag
  outside: closed.
- Keyboard: Tab to the entry opens the card, Tab into it keeps it open, Tab out closes it, Escape
  closes it and focus returns to the entry.
- Touch (a context with `has_touch`): tap opens, tap again closes.
- Two card entries: hovering the second closes the first.
- Phone width (375 px): no horizontal scroll, the open card fits (SC-005).
- Dispose: after the app is disposed, no card element remains in the document.

## After this feature

Release it in the next dated figpress-apps release (a feature, so no backport). Then, in the CP2
paper repository, port the two apps to it and delete their copies (SC-002); that is a change there,
not here.

## Complexity Tracking

No constitution violations.
