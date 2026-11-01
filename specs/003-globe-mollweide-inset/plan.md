# Implementation Plan: a Mollweide inset on the globe

**Branch**: `003-globe-mollweide-inset` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

## Summary

`geom.js` gains `mollweide`, `unmollweide` and `lookAt`; `globe.js` gains `shadeMollweide` and a
`mollweide` option that draws the map on the globe's own canvas (no second canvas in the DOM) and adds
it as a drag target. Width 0.25 of the globe's square: with the disc at radius 0.46, that leaves a gap
of 0.02 of the square.

## Constitution Check

- I–III: plain ES modules, nothing new vendored, bare specifiers only. Pass.
- IV: no data change; the map uses the existing texture. Pass.
- V: talks only through `camera` and `views`; `save_changes` on pointer-up. Pass.
- VI: generic (any globe of directions); needed by CP1's Explore globe. Pass.
- VII: pure kernels tested with `node --test`; the example's smoke test clicks the map. Pass.
- Skills: `figpress-apps` (components reference) updated. `figpress-apps-upgrade` needs no change:
  the option is additive, with no migration note to apply.
