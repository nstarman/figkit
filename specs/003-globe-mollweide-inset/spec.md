# Feature Specification: a Mollweide inset on the globe

**Feature Branch**: `003-globe-mollweide-inset`

**Created**: 2026-11-01

**Status**: Implemented

**Input**: User description: "A small Mollweide map of the whole sky, linked to the globe, in the
globe's corner with a small separation from it" (CP1's Explore globe; the paper's maps are Mollweide).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the whole sky next to the globe (Priority: P1)

A reader turning the globe sees, in its corner, the whole sphere as the paper draws it (Mollweide):
which half the globe is showing, where every view is, and the regions' true areas.

**Independent Test**: build the globe example; the map is in the top-right corner of the globe's
square, does not touch the disc, and its veil and squares follow the globe as it turns.

**Acceptance Scenarios**:

1. **Given** `mollweide: true`, **When** the globe renders, **Then** the map sits in the top-right corner
   of the globe's square, at least 2% of the square's size away from the disc.
2. **Given** the globe is turned or a square dragged, **Then** the map's veil (the hidden half), its
   `+` (the globe's centre) and its squares move with it.
3. **Given** no `mollweide` option, **Then** the globe is unchanged.

### User Story 2 - Turn the globe from the map (Priority: P1)

**Acceptance Scenarios**:

1. **Given** the map, **When** the reader clicks a point on it, **Then** the globe turns to face that
   direction, keeping its up direction as near as possible; dragging on the map keeps turning it.
2. **Given** a click outside the map's ellipse, **Then** it acts on the globe as before.

## Requirements *(mandatory)*

- **FR-001**: Mollweide longitude `atan2(y, x)` grows to the right and latitude `asin(z)` up, as
  matplotlib's `"mollweide"` axes, so the map matches figures made with it in the globe's frame.
- **FR-002**: The map is shaded from the globe's own texture; no new data is needed.
- **FR-003**: Projection, inverse and shading are pure functions with `node --test` tests (constitution VII).
- **FR-004**: The globe example enables it, and its smoke test clicks it (constitution VII).

## Success Criteria

- **SC-001**: JS tests: inverse round trip to 1e-9, equal-area within 0.5%, `lookAt` orthonormal.
- **SC-002**: Smoke tests pass in Chromium and WebKit with the map enabled.
