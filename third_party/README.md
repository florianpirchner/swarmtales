# Third-party files

A file copied from another project lives in `third_party/<name>/` together with the licence text of its source
(`LICENSE`) and one row in [`manifest.json`](manifest.json): name, source, commit and SPDX licence id. The licence
gate (`pnpm check:licences`) treats a row like a package: the licence must be on the allowlist, and a folder without
a row fails the check. See [`CONTRIBUTING.md`](../CONTRIBUTING.md).

Vendored today: `garbochess/` (Garbochess-JS, the chess reference engine of the lab).
