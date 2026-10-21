"""figkit.build (served output) and the CLI (contracts/python-api.md, contracts/cli.md)."""

import json
import shutil
import subprocess
import sys

import numpy as np
import pytest

import figkit
from figkit import BuildError

JS = __import__("pathlib").Path(figkit.__file__).parent / "js"
V = figkit.__version__


def make_app(tmp_path, widget='import { createModel } from "figkit/model.js";\nexport default { render() {} };\n'):
    app = tmp_path / "app"
    app.mkdir()
    (app / "index.html").write_text(
        '<!doctype html><html><head><title>t</title>'
        '<link rel="stylesheet" href="figkit/figkit.css"></head><body><div id="el"></div>'
        '<script type="module">import { run } from "figkit/figkit.js"; import app from "app/widget.js";'
        ' run(app, document.getElementById("el"));</script></body></html>')
    (app / "widget.js").write_text(widget)
    (app / "notes.md").write_text("not copied")
    (app / "widget.test.js").write_text("not copied")
    return app


def test_served_layout(tmp_path):
    data = figkit.export(tmp_path / "d", "ds", {"a": np.zeros(2)})
    res = figkit.build(make_app(tmp_path), data=[data], out=tmp_path / "site")
    site = res.out
    html = (site / "index.html").read_text()
    assert f'<meta name="figkit-version" content="{V}">' in html
    imap = json.loads(html.split('<script type="importmap">')[1].split("</script>")[0])
    assert imap == {"imports": {"figkit/": f"./vendor/figkit-{V}/", "app/": "./"}}
    assert html.index("importmap") < html.index('<script type="module">')
    assert f'href="./vendor/figkit-{V}/figkit.css"' in html
    for f in JS.iterdir():
        assert (site / f"vendor/figkit-{V}" / f.name).read_bytes() == f.read_bytes()
    assert (site / "data/ds/a.npy").exists() and (site / "widget.js").exists()
    assert not (site / "notes.md").exists() and not (site / "widget.test.js").exists()


@pytest.mark.parametrize(
    ("widget", "msg"),
    [('import { x } from "./science.js";\n', r"widget\.js:1: relative import"),
     ('\nconst u = new URL("a", import.meta.url);\n', r"widget\.js:2: import\.meta\.url"),
     ('const m = "figkit/model.js";\nawait import(m);\n', r"widget\.js:2: non-literal"),
     ('import { x } from "figkit/nope.js";\n', r"widget\.js:1: cannot resolve"),
     ('import x from "https://cdn.example.com/x.js";\n', r"widget\.js:1: .*third-party|relative"),
     ('import x from "lodash";\n', r"widget\.js:1: cannot resolve")],
)
def test_import_checks(tmp_path, widget, msg):
    with pytest.raises(BuildError, match=msg):
        figkit.build(make_app(tmp_path, widget), out=tmp_path / "site")


def test_rejects_other_data_format(tmp_path):
    data = figkit.export(tmp_path / "d", "ds", {"a": np.zeros(2)})
    m = json.loads((data / "manifest.json").read_text())
    (data / "manifest.json").write_text(json.dumps({**m, "figkit_data": 2}))
    with pytest.raises(BuildError, match="figkit_data 2"):
        figkit.build(make_app(tmp_path), data=[data], out=tmp_path / "site")


def test_figkit_js_passes_its_own_checks(tmp_path):
    figkit.build(make_app(tmp_path), out=tmp_path / "site")  # vendored modules are checked too


def test_cli(tmp_path):
    app = make_app(tmp_path)
    run = lambda *a: subprocess.run([sys.executable, "-m", "figkit.cli", *a], capture_output=True, text=True)  # noqa: E731
    assert run("build", str(app), "--out", str(tmp_path / "s")).returncode == 0
    assert run("build", str(app)).returncode == 2
    (app / "widget.js").write_text('import "./x.js";\n')
    r = run("build", str(app), "--out", str(tmp_path / "s2"))
    assert r.returncode == 1 and "widget.js:1" in r.stderr
    assert run("--version").stdout.strip().endswith(V)


# ── single file and inline_modules (User Story 2) ────────────────────────────

def test_inline_modules(tmp_path):
    app = make_app(tmp_path, 'import { a } from "app/a.js";\nexport default { render() { return a; } };\n')
    (app / "a.js").write_text('import { createModel } from "figkit/model.js";\nexport const a = createModel;\n')
    src = figkit.inline_modules("app/widget.js", roots={"figkit/": JS, "app/": app})
    assert '"figkit/' not in src and '"app/' not in src and "importmap" not in src
    assert src.count("data:text/javascript;base64,") == 1  # a.js, with model.js nested inside it


def test_inline_cycle(tmp_path):
    app = make_app(tmp_path, 'import "app/a.js";\nexport default {};\n')
    (app / "a.js").write_text('import "app/widget.js";\n')
    with pytest.raises(BuildError, match="cycle"):
        figkit.inline_modules("app/widget.js", roots={"figkit/": JS, "app/": app})


def test_single_file(tmp_path):
    data = figkit.export(tmp_path / "d", "ds", {"a": np.zeros(2)})
    res = figkit.build(make_app(tmp_path), data=[data], single_file=tmp_path / "x.html",
                       size_warning_mb=1e-6)
    html = res.single_file.read_text()
    assert f'<meta name="figkit-version" content="{V}">' in html
    assert "importmap" not in html and '"figkit/' not in html and '"app/' not in html
    assert "globalThis.FIGKIT_DATA" in html and "--fk-bg" in html  # data and figkit.css inlined
    assert res.warnings and "MB" in res.warnings[0]


def test_figkit_test_command(tmp_path):
    app = make_app(tmp_path)
    (app / "widget.test.js").unlink()  # placeholder text, not a test
    (app / "science.js").write_text('import { dot } from "figkit/geom.js";\nexport const f = () => dot([1, 2, 3], [1, 1, 1]);\n')
    (app / "science.test.js").write_text(
        'import { test } from "node:test";\nimport assert from "node:assert/strict";\n'
        'import { f } from "app/science.js";\ntest("f", () => assert.equal(f(), 6));\n')
    run = lambda: subprocess.run([sys.executable, "-m", "figkit.cli", "test", str(app)], capture_output=True, text=True)  # noqa: E731
    assert run().returncode == 0
    (app / "science.test.js").write_text((app / "science.test.js").read_text().replace("6)", "7)"))
    assert run().returncode != 0
