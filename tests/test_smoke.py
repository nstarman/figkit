"""Browser smoke tests of the globe example (marker `smoke`; needs Playwright browsers)."""

import pytest

pytestmark = pytest.mark.smoke
PAPER = {"orbit1": "48.0", "orbit2": "16.2", "spray": "87.6", "nbody": "87.2"}
ALLOWED = ("http://127.0.0.1", "file:", "data:", "blob:")


def readouts(page):
    return {i: page.locator(f'[data-panel="{i}"] .fk-readout').inner_text() for i in PAPER}


def marker_xy(page, sid):
    # orthographic projection of the marker's camera-facing end (as figkit/geom.js project/facing)
    return page.evaluate("""(sid) => {
      const el = document.querySelector("[data-figkit-app]"), m = el.figkitModel;
      const cv = el.querySelector("canvas[data-r]"), box = cv.getBoundingClientRect();
      const C = m.get("camera"), w = m.get("views")[sid];
      const d = (i) => C[3 * i] * w[0] + C[3 * i + 1] * w[1] + C[3 * i + 2] * w[2];
      const s = d(2) >= 0 ? 1 : -1;
      return [box.left + +cv.dataset.cx + +cv.dataset.r * s * d(0), box.top + +cv.dataset.cy - +cv.dataset.r * s * d(1)];
    }""", sid)


def check_page(page, url):
    foreign = []
    page.on("request", lambda r: None if r.url.startswith(ALLOWED) else foreign.append(r.url))
    page.goto(url)
    page.wait_for_selector('[data-panel="nbody"] .fk-readout:has-text("%")')
    got = readouts(page)
    for i, want in PAPER.items():
        assert want in got[i], (i, got[i])

    # rotate: drag the globe background near its rim
    cv = page.locator("canvas[data-r]")
    box = cv.bounding_box()
    x0, y0 = box["x"] + box["width"] * 0.8, box["y"] + box["height"] * 0.25
    cam0 = page.evaluate("document.querySelector('[data-figkit-app]').figkitModel.get('camera')")
    page.mouse.move(x0, y0); page.mouse.down(); page.mouse.move(x0 + 60, y0 - 5, steps=6); page.mouse.up()
    cam1 = page.evaluate("document.querySelector('[data-figkit-app]').figkitModel.get('camera')")
    assert cam1 != cam0
    rows = [cam1[0:3], cam1[3:6], cam1[6:9]]
    for a in range(3):
        for b in range(3):
            assert abs(sum(x * y for x, y in zip(rows[a], rows[b])) - (a == b)) < 1e-9

    # drag the Orbit 1 marker: only its panel changes
    before = readouts(page)
    x, y = marker_xy(page, "orbit1")
    page.mouse.move(x, y); page.mouse.down(); page.mouse.move(x + 40, y + 30, steps=8); page.mouse.up()
    after = readouts(page)
    assert after["orbit1"] != before["orbit1"]
    assert all(after[i] == before[i] for i in PAPER if i != "orbit1")
    assert not foreign, foreign


def test_served(page, served):
    check_page(page, served)


def test_single_file(page, globe_site):
    # Block every request except file:, data: and blob: (Playwright's offline mode breaks file:// in WebKit).
    page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(("file:", "data:", "blob:"))
               else route.abort())
    check_page(page, globe_site.single_file.as_uri())
