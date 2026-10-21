"""Write the interactive globe explorer: one self-contained HTML page.

Called from the end of ``data_streams_globe.py`` when ``GLOBE_EXPLORER=1``, so it
reuses that script's frames, layout and convexity regions. Drag the globe to turn
it; drag a viewing-direction square to look at that stream from somewhere else.
The side panel re-projects the stream and re-classifies its points live with the
paper's criterion (``is_nonconcave``): a point is non-concave where its projected
curvature normal does not point toward the projected centre. That needs only the
3D track and its derivatives, which this module exports in each stream's own
simulation frame, so the panels match the paper's at the paper's directions.
"""

import base64
import json
from pathlib import Path

import numpy as np

TEMPLATE = Path(__file__).with_name("globe_explorer.html")


def _b64(arr: np.ndarray, dtype: str) -> str:
    return base64.b64encode(np.ascontiguousarray(arr, dtype=dtype).tobytes()).decode()


def write_explorer(path: Path, streams: list[dict], texture: np.ndarray, camera: np.ndarray,
                   r_globe: float, radial_power: float, cap_deg: float) -> None:
    """Write the page.

    Each entry of ``streams`` has ``name``, ``color``, ``view`` (unit, (a,b,c) frame), ``T``
    (3x3, maps (a,b,c) to the simulation frame), ``pos``, ``d1``, ``d2`` (track and its first
    two derivatives, simulation frame, kpc), ``points`` (particles, simulation frame, may be
    empty) and ``panel_rot_deg`` (rotation of the side panel, as in the paper's figure).
    ``texture`` is the RGBA convexity-region map, rows colatitude 0..pi, columns azimuth
    0..2pi, in the (a,b,c) frame. ``camera`` has rows (page-right, page-up, toward-camera).
    """
    data = {
        "rGlobe": r_globe,
        "radialPower": radial_power,
        "capDeg": cap_deg,
        "camera": np.asarray(camera, float).ravel().tolist(),
        "texture": {"h": texture.shape[0], "w": texture.shape[1],
                    "rgba": _b64(np.round(255 * np.clip(texture, 0, 1)), "uint8")},
        "streams": [
            {
                "name": s["name"],
                "color": s["color"],
                "view": np.asarray(s["view"], float).tolist(),
                "T": np.asarray(s["T"], float).ravel().tolist(),
                "panelRotDeg": s.get("panel_rot_deg", 0.0),
                **{k: _b64(s[k], "float32") for k in ("pos", "d1", "d2")},
                "points": _b64(s.get("points", np.zeros((0, 3))), "float32"),
            }
            for s in streams
        ],
    }
    html = TEMPLATE.read_text().replace("__DATA__", json.dumps(data))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html)
    print(f"Saved {path}")
