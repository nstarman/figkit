# Feature Specification: Legend toggles and hover cards

**Feature Branch**: `004-legend-hover-cards`

**Created**: 2026-11-05

**Status**: Draft

**Input**: Issue #16: "Two apps built the same controls by hand and share them through symlinks:
click-to-toggle legend entries, and hover cards opened from a legend entry that close when the
pointer leaves. The hover card needed a fix: after a slider drag inside the card, `:focus-visible`
kept it open, so leaving the card now blurs it. These look like library components, with that fix
built in."

## Context

Two webapps in one paper repository (an interactive figure and an explorer, both on figpress-apps
2026.11.01) put their controls in the figure's legend instead of in checkboxes and sliders around
it:

- **Toggle entries.** Clicking a legend entry shows or hides the curve it names. A hidden entry
  stays in the legend, faded and struck through, so it can be turned back on.
- **Card entries.** Hovering a legend entry opens a small card next to it holding that curve's
  controls (a slider, a checkbox, an editable profile). The card stays open while the pointer is on
  the entry or the card, and closes shortly after it leaves both.
- **Plain entries.** A key with no control.

Both apps carry their own copy of this code (one shared by symlink). The hover card had a bug found
only in use: after the reader dragged a slider inside the card, the slider kept keyboard-style focus
and the card would not close. The fix (a pointer leaving takes the focus with it) lives only in the
app. This feature moves both controls into figpress-apps so every app gets them, fix included.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A reader turns curves on and off from the legend (Priority: P1)

A reader looking at a figure clicks a legend entry to hide the curve it names, and clicks it again
to bring the curve back. Which entries are on is visible in the legend itself.

**Why this priority**: It is the simpler of the two controls and both apps use it; it replaces
checkboxes beside the figure with the figure's own key.

**Independent Test**: Build an app with a legend of one toggle entry bound to a curve; click the
entry and check the curve disappears, the entry fades and is struck through, and the model's state
for that curve changes; click again and check all three revert.

**Acceptance Scenarios**:

1. **Given** a toggle entry whose curve is shown, **When** the reader clicks it, **Then** the curve
   is hidden, the entry is shown faded and struck through, and the app's state records it as hidden.
2. **Given** a hidden toggle entry, **When** the reader clicks it, **Then** the curve and the entry
   return to normal.
3. **Given** a toggle entry, **When** the app's state is changed from elsewhere (a reset button, a
   notebook), **Then** the entry's look follows the new state without a click.
4. **Given** a keyboard user, **When** they tab to a toggle entry and press Enter or Space, **Then**
   it toggles as a click does, and assistive technology announces it as pressed or not pressed.

---

### User Story 2 - A reader adjusts a curve from a card on its legend entry (Priority: P1)

A reader hovers a legend entry and a card opens beside it with that curve's controls. They drag a
slider in the card; the figure updates. When the pointer leaves the entry and the card, the card
closes.

**Why this priority**: It is the control both apps rely on most, and the one with the bug.

**Independent Test**: Build an app with one card entry holding a slider; hover, drag the slider,
move the pointer away, and check the card closes within a short delay.

**Acceptance Scenarios**:

1. **Given** a card entry, **When** the pointer rests on it, **Then** its card opens next to it,
   above if there is room and below otherwise, fully inside the window.
2. **Given** an open card, **When** the pointer moves from the entry onto the card, **Then** the card
   stays open (crossing the gap between them does not close it).
3. **Given** an open card, **When** the pointer leaves both entry and card, **Then** the card closes
   after a short delay (about a quarter of a second).
4. **Given** a reader who dragged a slider inside the card, **When** the pointer then leaves the
   card, **Then** the card closes (the issue's bug).
5. **Given** a drag in progress inside the card (e.g. a point on an editable profile), **When** the
   pointer leaves the card mid-drag, **Then** the card stays open until the drag ends, then closes if
   the pointer is outside.
6. **Given** a keyboard user, **When** they tab to the entry, **Then** the card opens; tabbing into the
   card keeps it open; tabbing out of both closes it.
7. **Given** a touch screen with no hover, **When** the reader taps the entry, **Then** the card
   opens; tapping the entry again closes it.

---

### User Story 3 - A developer builds a legend from a few lines (Priority: P2)

A developer writing a webapp declares a legend as a list of entries (a key icon, a label, and
either nothing, a model key to toggle, or the contents of a card) and gets a working legend, styled
to match figpress-apps, that follows light and dark themes and wraps on a phone.

**Why this priority**: The readers' value is in stories 1 and 2; this is what makes them cheap to
reuse, and it lets the two existing apps drop their copies.

**Independent Test**: Port the two apps that motivated this to the component and check their
legends behave as before, with their local copies deleted.

**Acceptance Scenarios**:

1. **Given** a list of entries, **When** the legend is mounted, **Then** the entries appear in order,
   wrapping onto further lines when narrow, and the legend is removed cleanly when the app is disposed.
2. **Given** an entry's key icon supplied by the app, **When** the legend renders, **Then** the icon
   is shown as given (figpress-apps does not draw the figure's line styles).
3. **Given** the page's theme changes, **When** the legend and an open card are on screen, **Then**
   both follow the theme.
4. **Given** a hover card is wanted on something that is not a legend entry (a disk drawn in a plot,
   a button), **When** the developer asks for one, **Then** the same hover-card behaviour is available
   on its own.

### Edge Cases

- Two card entries side by side: moving from one entry to the next closes the first card and opens
  the second; at most one card from a legend is open at a time.
- An entry near the window's edge: the card is shifted to stay inside the window, keeping an 8 px
  margin.
- The window is resized or scrolled while a card is open: the card is placed again or closed; it
  never floats away from its entry.
- A card's contents change size while open (a profile editor redraws): the card stays inside the
  window.
- The app is disposed while a card is open: the card is removed with it.
- A toggle bound to a model key the app never set: the entry treats missing as shown.
- The legend is embedded in a reveal.js slide (an iframe): hover, focus and click behave as on a
  page.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: figpress-apps MUST provide a legend component, mounted like other components, that
  renders an ordered list of entries, each with an app-supplied key icon and a text label.
- **FR-002**: An entry MUST be one of three kinds: plain (no control), toggle (bound to a boolean in
  the model), or card (opens a hover card holding app-supplied contents).
- **FR-003**: A toggle entry MUST flip its model boolean on click, Enter or Space, write it as a new
  value and save the model's changes once per click; it MUST show the off state faded and struck
  through, and expose its state to assistive technology as a pressed/not-pressed button.
- **FR-004**: A toggle entry MUST re-render when its model value changes from anywhere, and treat a
  missing value as on.
- **FR-005**: A card entry MUST mark itself as having controls (a visual cue, such as the ✎ the two
  apps use, and an accessible description) so readers know to hover it.
- **FR-006**: A hover card MUST open when the pointer enters, or keyboard focus reaches, its trigger;
  stay open while the pointer or focus is on the trigger or the card; and close about 250 ms after
  both are left.
- **FR-007**: When the pointer leaves the trigger or card, any focus inside the card MUST be released,
  so that a control focused by a pointer (a dragged slider) cannot hold the card open. Focus moved
  by the keyboard MUST NOT be released by this rule.
- **FR-008**: The app MUST be able to mark the card busy (a drag in progress) so it does not close
  until the app says the drag has ended.
- **FR-009**: Clicking or tapping the trigger MUST toggle its card, so it works without hover.
- **FR-010**: A card MUST be placed beside its trigger, above when there is room and below otherwise,
  inside the window with an 8 px margin, and drawn above the rest of the page.
- **FR-011**: At most one card opened from a given legend MUST be open at a time.
- **FR-012**: The hover-card behaviour MUST be usable on its own, with any trigger element and any
  card contents.
- **FR-013**: The legend and cards MUST use figpress-apps' theme variables, follow light and dark
  themes, and wrap at narrow widths without horizontal scrolling.
- **FR-014**: Mounting MUST return a dispose function that removes the legend, its cards, its model
  listeners and its timers.
- **FR-015**: The component MUST work in both built outputs (served site and single file) and in a
  notebook, like every figpress-apps component.

### Key Entities

- **Legend entry**: a key icon (an element the app draws), a label, and a kind: plain, toggle (with
  the model key it controls) or card (with the card's contents and an optional busy check).
- **Hover card**: a floating panel tied to one trigger, open or closed, with the open/close rules
  above.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After dragging a slider inside a card, moving the pointer off the card closes it within
  0.5 s in every browser the smoke tests run (Chromium, WebKit, Firefox).
- **SC-002**: The two apps that motivated this can replace their own legend and hover-card code with
  the component, deleting it, with no change a reader can see other than any fixed bugs.
- **SC-003**: A developer declares a legend of four entries (one plain, two toggles, one card) in at
  most about 20 lines of app code.
- **SC-004**: Every toggle and card entry can be reached and operated with the keyboard alone.
- **SC-005**: At 375 px wide the legend wraps without horizontal scrolling, and an open card fits in
  the window.

## Assumptions

- Key icons are drawn by the app (line styles, swatches and band glyphs are the figure's own,
  science-specific); figpress-apps only lays them out.
- A toggle is bound to one top-level boolean model key. Apps that keep flags inside a nested state
  object either move them to top-level keys or wrap the toggle in their own handler; supporting
  nested paths is out of scope until an app needs it (constitution VI).
- Card contents (sliders, checkboxes, a profile editor) are built by the app; the component hosts
  and shows them.
- The look follows the two existing apps: card entries with a dashed outline and ✎, toggles faded
  and struck through when off, cards as a bordered panel with a shadow.
- The browser's built-in top-layer popup support is available (all evergreen browsers the smoke
  tests run); no fallback for older browsers.
- Out of scope: legends drawn inside a canvas, drag-reordering of entries, and more than one card
  open at a time.
