"""figkit.export / figkit.load: the data contract (contracts/data-format.md)."""

import json

import numpy as np
import pytest

import figkit
from figkit import DataError

ALLOWED = ["<f4", "<f8", "|i1", "|u1", "<i2", "<u2", "<i4", "<u4", "|b1"]


def _arr(dtype, shape=(3, 2)):
    n = int(np.prod(shape))
    if dtype == "|b1":
        return (np.arange(n) % 2 == 0).reshape(shape)
    return np.arange(n).reshape(shape).astype(np.dtype(dtype))


@pytest.mark.parametrize("dtype", ALLOWED)
@pytest.mark.parametrize("shape", [(3, 2), (0,), (1,), (2, 3, 4)])
def test_round_trip(tmp_path, dtype, shape):
    a = _arr(dtype, shape)
    path = figkit.export(tmp_path, "ds", {"a": a})
    ds = figkit.load(path)
    assert ds.arrays["a"].dtype.str == dtype
    assert ds.arrays["a"].shape == shape
    np.testing.assert_array_equal(ds.arrays["a"], a)
    # readers need numpy alone
    np.testing.assert_array_equal(np.load(path / "a.npy"), a)


@pytest.mark.parametrize(
    "bad",
    [np.arange(3, dtype=np.int64), np.arange(3, dtype=np.uint64), np.zeros(3, np.float16),
     np.zeros(3, np.complex128), np.array(["a", "b"]), np.array([object(), 1], dtype=object),
     np.zeros(2, dtype=[("x", "f8")]), np.array(["2026-01-01"], dtype="datetime64[D]")],
)
def test_rejects_dtypes(tmp_path, bad):
    with pytest.raises(DataError, match="'bad'"):
        figkit.export(tmp_path, "ds", {"bad": bad})


def test_converts_big_endian_and_noncontiguous(tmp_path):
    big = np.arange(6, dtype=">f8").reshape(2, 3)
    strided = np.arange(12, dtype="<f4").reshape(3, 4)[:, ::2]
    ds = figkit.load(figkit.export(tmp_path, "ds", {"big": big, "strided": strided}))
    assert ds.arrays["big"].dtype.str == "<f8"
    np.testing.assert_array_equal(ds.arrays["big"], big)
    np.testing.assert_array_equal(ds.arrays["strided"], strided)


def test_float64_kept_unless_narrowed(tmp_path):
    x = np.linspace(0, 1, 50)
    ds = figkit.load(figkit.export(tmp_path, "ds", {"x": x}))
    assert ds.arrays["x"].dtype.str == "<f8"
    ds = figkit.load(figkit.export(tmp_path, "ds2", {"x": x}, narrow=["x"]))
    assert ds.arrays["x"].dtype.str == "<f4"
    assert ds.manifest["entries"]["x"]["source_dtype"] == "float64"


def test_narrowing_check_catches_offset_data(tmp_path):
    mjd = 60000 + np.linspace(0, 3, 1000)  # float32 spacing near 6e4 is ~4e-3 days
    with pytest.raises(DataError, match=r"'mjd'.*max error.*threshold"):
        figkit.export(tmp_path, "ds", {"mjd": mjd}, narrow=True)
    figkit.export(tmp_path, "ok", {"mjd": mjd - 60000}, narrow=True)


def test_narrowing_check_nonfinite(tmp_path):
    x = np.array([0.0, np.nan, np.inf, 1.0])
    figkit.export(tmp_path, "ok", {"x": x}, narrow=True)
    with pytest.raises(DataError, match="'y'"):
        figkit.export(tmp_path, "bad", {"y": np.array([0.0, 1e300])}, narrow=True)


@pytest.mark.parametrize("name", ["Bad", "1x", "a b", ""])
def test_bad_entry_names(tmp_path, name):
    with pytest.raises(DataError):
        figkit.export(tmp_path, "ds", {name: np.zeros(2)})


@pytest.mark.parametrize("name", ["Bad", "_x", "a/b", ""])
def test_bad_dataset_names(tmp_path, name):
    with pytest.raises(DataError):
        figkit.export(tmp_path, name, {"a": np.zeros(2)})


def test_overwrite(tmp_path):
    figkit.export(tmp_path, "ds", {"a": np.zeros(2)})
    with pytest.raises(DataError, match="exists"):
        figkit.export(tmp_path, "ds", {"a": np.zeros(2)})
    figkit.export(tmp_path, "ds", {"b": np.ones(2)}, overwrite=True)
    assert set(figkit.load(tmp_path / "ds").arrays) == {"b"}


def test_manifest_contents_and_readme(tmp_path):
    path = figkit.export(
        tmp_path, "globe", {"track": np.zeros((5, 3), np.float32)},
        meta={"streams": ["a"]}, json={"style": {"c": "#fff"}}, units={"track": "kpc"},
        descriptions={"track": "A track"}, licence="MIT", doi="10.1/x",
    )
    m = json.loads((path / "manifest.json").read_text())
    assert m["figkit_data"] == 1 and m["figkit"] == figkit.__version__ and m["name"] == "globe"
    e = m["entries"]["track"]
    assert e == {"kind": "array", "file": "track.npy", "dtype": "<f4", "shape": [5, 3],
                 "source_dtype": "float32", "sha256": e["sha256"], "unit": "kpc",
                 "description": "A track"}
    assert m["entries"]["style"]["kind"] == "json"
    ds = figkit.load(path)
    assert ds.json["style"] == {"c": "#fff"} and ds.meta == {"streams": ["a"]}
    readme = (path / "README.md").read_text()
    assert "track.npy" in readme and "np.load" in readme and "kpc" in readme


def test_load_verifies(tmp_path):
    path = figkit.export(tmp_path, "ds", {"a": np.arange(4, dtype=np.int32)})
    m = json.loads((path / "manifest.json").read_text())

    raw = (path / "a.npy").read_bytes()
    (path / "a.npy").write_bytes(raw[:-1] + bytes([raw[-1] ^ 1]))
    with pytest.raises(DataError, match="sha256"):
        figkit.load(path)
    (path / "a.npy").write_bytes(raw)

    for patch, msg in [({"figkit_data": 2}, "figkit_data"), ({"extra": 1}, "extra")]:
        (path / "manifest.json").write_text(json.dumps({**m, **patch}))
        with pytest.raises(DataError, match=msg):
            figkit.load(path)


def test_name_collision(tmp_path):
    with pytest.raises(DataError, match="'a'"):
        figkit.export(tmp_path, "ds", {"a": np.zeros(2)}, json={"a": {}})
