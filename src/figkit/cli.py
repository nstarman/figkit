"""The `figkit` command: build and serve webapps (contracts/cli.md)."""

from __future__ import annotations

import argparse
import sys

from figkit.build import BuildError
from figkit.data import DataError


def main(argv: list[str] | None = None) -> int:
    from figkit import __version__, build
    from figkit.serve import serve

    p = argparse.ArgumentParser(prog="figkit", description="Build and serve figkit webapps.")
    p.add_argument("--version", action="version", version=f"figkit {__version__}")
    sub = p.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build", help="build a webapp into a site and/or a single HTML file")
    b.add_argument("app_dir")
    b.add_argument("--data", action="append", default=[], metavar="DATASET_DIR")
    b.add_argument("--out", metavar="DIR")
    b.add_argument("--single-file", metavar="FILE")
    b.add_argument("--size-warning-mb", type=float, default=50.0)
    s = sub.add_parser("serve", help="preview a built site locally")
    s.add_argument("dir")
    s.add_argument("--port", type=int, default=8000)
    s.add_argument("--no-open", action="store_true")
    args = p.parse_args(argv)

    if args.cmd == "serve":
        serve(args.dir, port=args.port, open_browser=not args.no_open)
        return 0
    if not args.out and not args.single_file:
        b.error("give --out and/or --single-file")
    try:
        res = build(args.app_dir, data=args.data, out=args.out, single_file=args.single_file, size_warning_mb=args.size_warning_mb)
    except (BuildError, DataError) as e:
        print(f"figkit: {e}", file=sys.stderr)
        return 1
    for w in res.warnings:
        print(f"figkit: warning: {w}", file=sys.stderr)
    for path in (res.out, res.single_file):
        if path:
            print(path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
