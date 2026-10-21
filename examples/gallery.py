"""Write the gallery's index.html into a built site folder:  python examples/gallery.py site"""

import sys
from pathlib import Path

import figkit

EXAMPLES = [
    ("globe", "Stream convexities in a common principal-axis frame",
     "A rotatable globe of viewing directions with four linked sky panels that re-project stellar "
     "streams and recompute the paper's non-concavity criterion live.",
     "Starkman et al. (2026)", "https://ui.adsabs.harvard.edu/abs/2026arXiv260940057S/abstract"),
]

PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>figkit gallery</title>
<style>
  body {{ margin: 0; font: 15px/1.5 system-ui, sans-serif; color: #222; background: #fff; }}
  main {{ max-width: 760px; margin: 0 auto; padding: 24px 16px; }}
  @media (prefers-color-scheme: dark) {{ body {{ color: #e3e6ea; background: #15181d; }} a {{ color: #8ab4e8; }} }}
  .ex {{ border-top: 1px solid #8884; padding: 12px 0; }} .meta {{ color: #888; font-size: 13px; }}
</style></head>
<body><main>
<h1>figkit gallery</h1>
<p>Interactive counterparts of paper figures, built with
<a href="https://github.com/nstarman/figkit">figkit</a> {version}.</p>
{items}
</main></body></html>
"""
ITEM = """<div class="ex"><h2><a href="{slug}/">{title}</a></h2><p>{text}</p>
<p class="meta">Data: <a href="{url}">{cite}</a> · <a href="{slug}.html">single file</a> (opens offline)</p></div>"""


def main(site: Path) -> None:
    items = "\n".join(ITEM.format(slug=s, title=t, text=x, cite=c, url=u) for s, t, x, c, u in EXAMPLES)
    (site / "index.html").write_text(PAGE.format(version=figkit.__version__, items=items))


if __name__ == "__main__":
    main(Path(sys.argv[1]))
