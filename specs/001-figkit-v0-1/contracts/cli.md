# Contract: command line

Installed as the `figkit` console script. Exit code 0 on success, 1 on a `BuildError`/`DataError`
(message on stderr, naming file and line where applicable), 2 on bad arguments.

```
figkit build APP_DIR [--data DATASET_DIR ...] [--out DIR] [--single-file FILE] [--size-warning-mb 50]
figkit serve DIR [--port 8000] [--no-open]
figkit --version
```

- `build` with neither `--out` nor `--single-file` is an error.
- Warnings (e.g. single file above the size threshold) go to stderr and do not change the exit code.
- `serve` binds 127.0.0.1 only, sends `Cache-Control: no-store`, maps `.npy` to
  `application/octet-stream`.
