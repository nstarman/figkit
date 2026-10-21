# Changelog

Every release has a section. Every breaking change has a migration note with three parts, so the
`figkit-upgrade` skill can apply it:

- **What changed**: one sentence.
- **Find**: how to locate affected code, e.g. `grep -rn "compute:" webapps/`.
- **Edit**: the exact change to make.

A release with a breaking change that has no migration note is not tagged.

## Unreleased

### Added

- First version: data export/load (`.npy` + manifest), served and single-file builds, local
  preview, notebook wrapper, globe and sky-panel components, the globe example, and the `figkit`
  and `figkit-upgrade` skills.
