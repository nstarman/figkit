# figkit

A toolbox for webapps that are the interactive counterparts of scientific papers: data, plots and
movies that readers can explore next to the static PDF, built to keep working for years.

- **Python** exports a paper's arrays as plain `.npy` files with a manifest, and builds sites.
- **Browser** code is plain ES modules and CSS — no build step, no framework, no CDN. Each site
  vendors the exact figkit version it was built with.
- **Two outputs** from one source: a site for GitHub Pages, and a single HTML file that opens from
  disk for archives.
- **Same app in notebooks** through anywidget.

Status: pre-v0.1. The design is in [`specs/001-figkit-v0-1/`](specs/001-figkit-v0-1/).

License: MIT.
