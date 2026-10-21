# Feature Specification: figkit v0.1 — toolbox for interactive paper figures

**Feature Branch**: `001-figkit-v0-1`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Build a shared toolbox of reusable code for HTML + JS + data webapps
that present and let people work with my science (data, plots, movies), especially as the
interactive counterparts of the static figures in specific papers. It is versioned by tags so a
webapp is built against a specific version, and it packages two Claude skills: one for using it
and one for upgrading existing webapps. Start with the globe explorer of the convexities
single-galaxy paper only."

The agreed technical design (repository layout, data contract, module list, build and skills)
is recorded in [design.md](design.md) as input to `/speckit-plan`. This spec states what v0.1
must do and how it is accepted.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publish a paper's interactive figure on the web (Priority: P1)

The author has a paper whose pipeline produces numpy arrays. They export the arrays with
figkit, write a small app that composes figkit's globe and sky-panel components with the paper's
own science step, build it, and get a static site that works on GitHub Pages: a rotatable globe
with draggable viewing-direction markers and four linked sky panels that update live.

**Why this priority**: This is the reason figkit exists; every other story depends on it. The
globe explorer, rebuilt on figkit, is the proof.

**Independent Test**: Rebuild the globe explorer as `examples/globe/`, build it, serve it locally,
and check that it behaves like the original explorer and reproduces the paper's numbers.

**Acceptance Scenarios**:

1. **Given** the exported globe data and the example app, **When** the author runs the build and
   opens the served page, **Then** the globe, its shading, the four streams, the four markers
   and the four sky panels appear with no console errors and no network requests to other hosts.
2. **Given** the page at the paper's viewing directions, **When** the panels render, **Then** the
   non-concave fractions read 48.0 %, 16.2 %, 87.6 % and 87.2 % for Orbit 1, Orbit 2, Particle
   spray and N-body.
3. **Given** the page, **When** the reader drags the globe background, **Then** the globe and
   markers rotate together smoothly; **When** the reader drags a marker, **Then** only that
   stream's panel re-projects and its fraction updates while dragging.
4. **Given** a marker dragged across the limb, **When** its view passes to the far side, **Then**
   the panel does not mirror mid-drag (the view keeps its own end of the line).
5. **Given** the reset controls, **When** used, **Then** the camera and/or views return to the
   paper's values.

---

### User Story 2 - Archive the figure as one file that opens from disk (Priority: P2)

The author builds the same webapp as a single self-contained HTML file to deposit on Zenodo or
attach to a submission. Anyone can download it and open it by double-clicking, offline.

**Why this priority**: Longevity is a core goal; websites move, files with DOIs stay.

**Independent Test**: Build the single-file output of the globe example, open it from `file://`
with networking disabled, and repeat Story 1's scenarios.

**Acceptance Scenarios**:

1. **Given** the single-file build, **When** opened from disk with no network, **Then** it behaves
   exactly like the served page, including the four fractions.
2. **Given** a webapp whose data would make the single file very large, **When** it is built,
   **Then** the build warns about the size.

---

### User Story 3 - Explore the same app in a notebook (Priority: P3)

During research the author opens the same app in Jupyter or marimo, drags the globe, and reads
the resulting state (camera, views) back into Python.

**Why this priority**: One codebase for exploring and publishing avoids maintaining two tools.

**Independent Test**: In a notebook, wrap the globe example app as a widget with its data, drag a
marker, and read the new view direction from the widget in Python.

**Acceptance Scenarios**:

1. **Given** the example app and its data, **When** wrapped as a notebook widget, **Then** it
   renders and behaves as on the web page.
2. **Given** a completed drag, **When** the author reads the widget's state in Python, **Then**
   the camera and view directions reflect the drag.

---

### User Story 4 - Upgrade an existing webapp to a newer figkit version (Priority: P4)

A webapp built against an older figkit tag is moved to a newer one by an agent following the
upgrade skill, guided by the changelog's migration notes.

**Why this priority**: Pinning makes webapps durable; upgrades must stay cheap so pinned apps are
not stranded.

**Independent Test**: Tag a pre-release with a deliberate, documented breaking change, build the
example against the older tag, then apply the upgrade skill and confirm the example builds and
passes its tests at the new tag.

**Acceptance Scenarios**:

1. **Given** a built webapp, **When** the upgrade skill starts, **Then** it identifies the figkit
   version the webapp was built against from the webapp itself.
2. **Given** a breaking change with a migration note, **When** the skill runs, **Then** it applies
   the documented edit, rebuilds, reruns the app's tests and reports what changed.
3. **Given** a breaking change without a migration note, **When** the skill runs, **Then** it stops
   and reports the gap instead of guessing.

---

### User Story 5 - An agent builds a new webapp with the figkit skill (Priority: P5)

The author asks an agent for an interactive figure; the agent, using the figkit skill, scaffolds
the app, writes the export, keeps science in a separate testable module, and builds both
outputs following figkit's conventions.

**Why this priority**: Most future webapps will be written with agent help; the skill is what makes
figkit reusable rather than a one-off.

**Independent Test**: Give an agent the skill and a small new task (e.g. a 2D panel of exported
points with a slider) and check that the result follows the conventions and passes the checks.

**Acceptance Scenarios**:

1. **Given** the skill and a request, **When** the agent builds a webapp, **Then** the result has
   the standard layout, passes the build's checks, and includes a test of its science module.

---

### Edge Cases

- Data files are missing or a manifest is malformed: the page shows a plain on-page message naming
  the command to rerun; the console has details.
- Data was exported by an incompatible figkit major version: the page and the build both say so.
- Export receives int64, object, string or non-contiguous arrays: export fails with a clear error
  (contiguity and byte order are fixed automatically).
- Export receives float64 data: it is kept as float64 unless narrowing is explicitly requested,
  in which case a precision check runs first.
- A module uses a relative import or `import.meta.url`: the build fails and names the file and line.
- A marker's view direction is exactly along the frame's pole (degenerate sky rotation): the panel
  still renders with a defined orientation.
- Window resizes or moves between displays of different pixel density: canvases stay sharp and
  correctly sized.
- Very long drags: the camera stays a proper rotation (no drift or skew).
- Zero-length arrays and single-element arrays load correctly.

## Requirements *(mandatory)*

### Functional Requirements

**Data**

- **FR-001**: Python MUST export named arrays and metadata into a dataset folder with a manifest
  and one numpy `.npy` file per array.
- **FR-002**: Export MUST accept only float32/64, int8–32, uint8–32 and bool arrays, store them
  little-endian and C-ordered, and reject other dtypes with an error naming the array.
- **FR-003**: Export MUST NOT narrow dtypes unless asked; requested narrowing MUST check precision.
- **FR-004**: The manifest MUST record the data-format version, the figkit version, and per array
  its file, dtype, shape, original dtype and checksum, plus optional units, description, licence
  and DOI. A generated README MUST explain how to load each file with numpy.
- **FR-005**: Python MUST load a dataset folder back to the same arrays and metadata (round trip).
- **FR-006**: The browser library MUST load a dataset into typed arrays with shapes and dtypes,
  identically for served pages, single-file builds and notebook-delivered binary data.

**Components and state**

- **FR-007**: A shared state model MUST offer the notebook-widget model interface (get, set,
  change events, removal of listeners, save) so components run unchanged on the web and in
  notebooks.
- **FR-008**: A globe component MUST render an orthographic globe with a shaded region texture,
  lines and points (back side faint), and one draggable marker per stream with antipode handling;
  it MUST rotate by dragging and report camera and view changes through the model.
- **FR-009**: A sky-panel component MUST draw, for one stream, points, a line, highlighted segments
  and a readout supplied by the app's science step, with equal-aspect autoscaling and an origin
  mark, updating whenever that stream's view changes.
- **FR-010**: Interaction MUST stay smooth while dragging (redraws coalesced to the display frame
  rate; heavy shading reduced during drags and refined on release).
- **FR-011**: The paper's science step MUST live in the paper's app, separate from page code, so
  it can be tested without a browser.

**Build and outputs**

- **FR-012**: A build command MUST produce a served site with figkit's browser code vendored at the
  installed version, an import map, the data, and the figkit version stamped in the page.
- **FR-013**: The build MUST also produce, on request, a single HTML file with all code and data
  inlined that works from `file://` offline, and MUST warn above a size threshold (default 50 MB).
- **FR-014**: The build MUST reject modules with relative imports or `import.meta.url`, and data
  with an incompatible data-format major version.
- **FR-015**: A local preview command MUST serve a built site.
- **FR-016**: A notebook wrapper MUST run an app module with a dataset as a notebook widget, using
  the same inlining as the single-file build, and expose its state to Python.
- **FR-017**: Built pages MUST NOT request anything from third-party hosts.

**Skills, releases, repository**

- **FR-018**: The repository MUST ship a "figkit" skill (building a webapp) and a "figkit-upgrade"
  skill (moving a webapp to a newer tag), versioned with the code.
- **FR-019**: Every release MUST have a changelog section; every breaking change MUST have a
  migration note (what changed, how to find it, the exact edit).
- **FR-020**: The repository MUST have an `AGENTS.md` (with `CLAUDE.md` pointing to it) describing
  layout, conventions, adding code, releasing and testing.
- **FR-021**: The example gallery MUST be published on the repository's GitHub Pages from releases.
- **FR-022**: The project MUST be installable from a git tag without a package index.

### Key Entities

- **Dataset**: a named folder of arrays plus metadata, described by a manifest; the unit of data a
  webapp loads and a reader can reuse.
- **Array entry**: one array in a dataset with dtype, shape, units, description and checksum.
- **Model**: the shared state of one webapp instance (camera, views), observed by components.
- **Component**: a reusable visual piece (globe, sky panel) mounted into an element with options.
- **App**: a paper-specific module that loads data, holds the science step and composes components;
  it is also the notebook widget.
- **Built site / single file**: the two publishable outputs of an app at one figkit version.
- **Release**: a tagged figkit version with changelog and migration notes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The globe example reproduces the paper's four non-concave fractions to 0.1 %,
  in the browser and in a browser-free test.
- **SC-002**: The served page and the single-file build both load and become interactive in under
  2 s on a recent laptop, with zero requests to other hosts.
- **SC-003**: While dragging, the globe example sustains at least 30 frames per second on a recent
  laptop at a 2× pixel-density display.
- **SC-004**: A reader can load every published array with numpy alone, with values identical to
  the exported ones.
- **SC-005**: The example app runs in a notebook and its state is readable in Python after a drag.
- **SC-006**: An upgrade across a documented breaking change is completed by the upgrade skill
  without manual edits beyond those in the migration note.
- **SC-007**: The globe example's app code (excluding its science step) is substantially smaller
  than the original explorer, because generic parts moved into figkit.

## Assumptions

- Only the globe explorer drives v0.1; other webapps (e.g. the annotation explorer) are out of
  scope until a later version.
- Later data kinds (tables via Parquet, chunked arrays via Zarr, media) and journal formats
  (FITS/ECSV) are out of scope for v0.1 but must fit the manifest without breaking it.
- Readers use current evergreen desktop browsers; touch support is welcome but not required.
- Hosting is static (GitHub Pages); no server-side code.
- Hosting paper docs (sub-project C), website integration (D) and skills aggregation (B) are
  separate features; v0.1 only provides the commands they will call.
- The globe example's data comes from the convexities single-galaxy paper's existing exporter.
