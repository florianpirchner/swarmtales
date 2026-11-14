# Garbochess-JS (vendored, do not edit)

The chess reference engine of the lab (`lab/chess-engine.ts`). It is not a dependency, it is in no `package.json`,
no mechanic and no published package imports it, and it is never part of a live run.

| Field | Value |
|---|---|
| File | `garbochess.js`, an unmodified copy of `js/garbochess.js` (81,772 bytes) |
| Source | <https://github.com/glinscott/Garbochess-JS> |
| Commit | `4ff0f9e49a0041545b645e25d3d2da7af3b36a90` (2012-12-25, the last commit of the repository) |
| Download | <https://raw.githubusercontent.com/glinscott/Garbochess-JS/4ff0f9e49a0041545b645e25d3d2da7af3b36a90/js/garbochess.js> |
| SHA-256 | `b0ebcf80e7bc7c5c9dd08e57f96a07af0a655f6138590243028d6b98717c938c` |
| Licence | `BSD-3-Clause`, Copyright (c) 2011 Gary Linscott; the text is in `LICENSE` (same commit) |
| Copied | 2026-11-14 |
| Weights, books, data | none; the evaluation is hand-written |

**Do not edit `garbochess.js`.** `test/stories/chess-engine.test.ts` hashes it and fails on any difference. The engine is
a measuring instrument: a changed file is a changed ruler, needs a new hash here and in `lab/chess-engine.ts`, and
forces a new analysis of every recorded chess run. The choice of the engine is explained in
[`docs/refactoring-before-release/06-chess-engine.md`](../../docs/refactoring-before-release/06-chess-engine.md).
