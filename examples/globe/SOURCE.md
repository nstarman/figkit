# Source of the globe example's data

`source.npz` comes from the convexities single-galaxy paper:

> Starkman et al. (2026), arXiv:2609.40057 —
> <https://ui.adsabs.harvard.edu/abs/2026arXiv260940057S/abstract>

Please cite that paper if you reuse these data. Licence: MIT, as in the paper's repository.

## What it contains

For each of the four streams of the paper's globe figure (two test orbits, a particle-spray stream
and an N-body stream): the 3-D ridge-line track at 500 points with its first two derivatives (in
the stream's own simulation frame), the matrix taking the common principal-axis frame to that
simulation frame, the paper's viewing direction, the colour, and the side-panel rotation. The
simulated streams also carry 3000 particles (every second particle of the paper's 6000-particle
subsample). Plus the convexity-region texture shown on the globe (181 × 361 RGBA, colatitude
0..π by azimuth 0..2π inclusive) and the figure's camera.

## How it was made

`make_source.py` reads the paper's built `globe_explorer.html` (written by the paper pipeline's
`data_streams_globe.py` with `GLOBE_EXPLORER=1`), which embeds every array, using numpy alone.
`prototype/` keeps that page's source for reference.
