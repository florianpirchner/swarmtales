# 06 Chess reference engine: what replaces Stockfish

Role: research and decision, delegated by the owner. Written 2026-11-14. Analysis only: nothing in the repository was
changed besides this file, nothing was installed, and **no engine was executed** (downloads were read as text only).
Every licence below was read from the primary source named in the evidence column on 2026-11-14. Claims that could not
be checked are marked **unverified** and collected in section 7.

## 1. The rule and what the metric needs

- **Rule (owner, absolute):** no GPL and no other copyleft licence anywhere: code, tools, bundled data, neural-net
  weights. Allowed: MIT, BSD, Apache-2.0, ISC, Zlib, Unlicense, CC0. Rejected: GPL, LGPL, AGPL, MPL, EPL, CC-BY-SA and
  anything unclear. Nets trained on Stockfish or Lc0 data are a grey zone and are avoided too.
- **Today:** `lab/chess-engine.ts` drives `stockfish.js` 10.0.2 (GPL-3.0, a root dev dependency, WASM, UCI).
  `lab/chess-analyse.ts` asks it for a score and a best move per position at a fixed depth (14) and turns that into
  centipawn loss, move classes (50+, 100+, 300+) and missed mates. `test/stories/chess.test.ts` calls the same code
  at depth 6, so the engine is **inside `pnpm check`** today and must work offline on every machine and in CI.
- **What the metric needs:** score and best move for a FEN at a fixed depth; mate scores; the same numbers on every
  machine. Strength is secondary: the players are LLMs with a match ACPL of 78 to 138.
- **What follows for the choice:** no native build step and no per-platform binary (so: JavaScript, TypeScript or a
  permissive WASM build), no net (so no data question at all), single-threaded, no clock in the result.

## 2. Candidates

Strength figures are the authors' own statements unless noted. "Node" says how it would run from the monorepo.

| Engine | Licence (SPDX) and evidence | Weights or data | Language, how it runs in Node | UCI | Fixed depth, determinism | Strength | Maintenance, size | Verdict |
|---|---|---|---|---|---|---|---|---|
| **Garbochess-JS** | `BSD-3-Clause`, (c) 2011 Gary Linscott: [LICENSE](https://raw.githubusercontent.com/glinscott/Garbochess-JS/master/LICENSE) | none; hand-written evaluation (material, piece-square tables, mobility, bishop pair) | one plain JavaScript file, `js/garbochess.js`, 81,772 bytes; not on npm; loaded with `node:vm` | no; own worker messages (`position <fen>`, `search <ms>`, `analyze`) | `Search(cb, maxPly, cb)` takes a depth; the clock is one variable (`g_timeout`); Zobrist keys from a seeded Mersenne twister; no `Math.random` (read in source) | **unverified**, expected 2200 to 2500 (null move, LMR, SEE, hash, killers, check extension in quiescence) | frozen: last commit `4ff0f9e`, 2012-12-25 | **primary** |
| **js-chess-engine** 2.4.6 | `MIT`, (c) 2020 Josef Jadrny: [LICENSE](https://raw.githubusercontent.com/josefjadrny/js-chess-engine/master/LICENSE), [npm](https://registry.npmjs.org/js-chess-engine/2.4.6) | none; material plus small piece-square tables | TypeScript, npm package, zero dependencies, Node >= 24, 408 kB unpacked | no; API `new Game(fen).ai({ analysis: true })` returns `bestScore`, `depth`, root move scores | depth override `depth.base`; deterministic only with `randomness: 0` given explicitly (without it, move 1 is randomised) and one `Game` per position (the table lives in the instance) | **unverified**, expected 1500 to 1900: no null move, no LMR, bishop = knight = 320, no draw rules in search, under-promotions skipped at the root | active (2.4.6 on 2026-02-22, eight releases in four days) | **fallback** |
| Caissa 1.26 | `MIT`: [LICENSE](https://raw.githubusercontent.com/Witek902/Caissa/master/LICENSE) | nets `MIT` with their own statement: [Caissa-Nets README](https://raw.githubusercontent.com/Witek902/Caissa-Nets/main/README.md), [LICENSE](https://raw.githubusercontent.com/Witek902/Caissa-Nets/main/LICENSE). **Data: self-play "with one exception: the `Fishtest1` dataset, which comes from Stockfish LTC games played on Fishtest (around 1% of total dataset)"**. Version 0.6 used a Stockfish net | C++20, CMake or Makefile, net downloaded at build time; native binary over UCI per platform and CPU level | yes | `go depth`; binaries differ by CPU level (SSE2 to AVX-512); equality across them **unverified** | 3600+ (CCRL, per README) | active | **rejected**: Stockfish data in the net (the grey zone), native build |
| 4ku | `MIT`, (c) 2021 kz04px: [LICENSE](https://raw.githubusercontent.com/kz04px/4ku/master/LICENSE) | no net; origin of the tuned evaluation constants **unverified** (README is silent) | C++, CMake; `4ku-mini` builds only on Linux; no releases | partly: full build has `position fen` and `setoption`; **`go depth` is not documented** (README names only `wtime`/`btime` for mini) | **unverified** | **unverified** (README gives none) | hobby size project, 4096-byte target | **rejected**: native build, no documented fixed depth |
| Lozza 11.0 | **no SPDX id**. `LICENCE` is three lines: "Feel free to use as you like but I always appreciate an email telling me about your project and how you use Lozza." [LICENCE](https://raw.githubusercontent.com/op12no2/lozza/master/LICENCE) | net embedded in the release file; 3.0 "was booted from `lichess-big3-resolved` and `quiet-labeled` then a few rounds of datagen"; 2.4 retuned "with SF evals and WDL" ([releases](https://github.com/op12no2/lozza/releases)) | pure JavaScript, `node lozza.js`, UCI | yes | `go depth`; bench node count equal across its three builds | about 3200 (author) | active | **rejected**: licence unclear (no grant to modify or redistribute), data lineage grey. Technically the best fit |
| tomitankChess 7.0 | `GPL-3.0`: [repository](https://github.com/tomitank/tomitankChess) | small net, 768x16x1 | pure JavaScript, UCI, Node | yes | not checked | about 3050 (author) | active | **rejected**: GPL |
| Viridithas | `AGPL-3.0-only` (MIT only up to 20.0.0); nets `CC0-1.0`: [repository](https://github.com/cosmobobak/viridithas) | self-play, plus Lichess Elite positions rescored by itself | Rust, native | yes | not checked | very strong | active | **rejected**: AGPL |
| Leorik 3.2 | `MIT`, (c) 2023 Thomas Jahn: [LICENSE](https://raw.githubusercontent.com/lithander/Leorik/master/LICENSE) | net "trained from zero" on self-play with bullet ([README](https://github.com/lithander/Leorik)) | C#, .NET 10; prebuilt binaries for Mac, Linux, Windows; native over UCI | yes | not checked | 3400 CCRL 40/15 (README) | active | **not chosen**: needs a binary or .NET per machine. The clean option if a strong engine is ever wanted |
| p4wn | "CC0 or public domain" (README): [repository](https://github.com/douglasbagnall/p4wn) | none | JavaScript, `state.findmove(depth)` returns `[from, to, score]` | no | fixed depth; adaptive mode must be off | weak, **unverified** | old | **rejected**: too weak, no advantage over the fallback |
| tonnetto 1.0.2 | `MIT` ([npm](https://registry.npmjs.org/tonnetto)) | PeSTO tables | TypeScript, npm, 11 kB | yes | yes | about 1600 at depth 3; "depth>5 ... too slow" (README) | last release 2025-02 | **rejected**: too weak and slow |
| wukongJS | no licence statement found on the [repository page](https://github.com/maksimKorzh/wukongJS) | none | JavaScript | yes | not checked | 1876 CCRL (README) | unknown | **rejected**: unclear |
| Sunfish | GPL ([LICENSE.md](https://raw.githubusercontent.com/thomasahle/sunfish/master/LICENSE.md) starts "GNU GENERAL PUBLIC LICENSE") | none | Python | partly | n/a | weak | n/a | **rejected**: GPL |
| npm WASM builds | `stockfish` 19.0.1, `stockfish.js`, `fairy-stockfish-nnue.wasm` 1.1.12, `@chessle/chess.js-extended`: all `GPL-3.0` (npm registry) | Stockfish nets | WASM | yes | yes | very strong | active | **rejected**: GPL |
| `chess-ai` 0.0.2 | `MIT` (npm registry) | none | JavaScript, 9.5 kB | no | not checked | toy | 2022 | **rejected**: toy |

Not engines, noted because they turn up in searches: `chessops` is `GPL-3.0-or-later` and `kokopu` is
`LGPL-3.0-or-later` (npm registry); neither may be added as a rules helper. `node-uci` is `MIT` but only a wrapper.
A search for a permissive, non-Stockfish WASM engine on npm with UCI found none.

**Chess dependencies of the repository today** (`package.json`, `mechanics/chess/package.json`, `pnpm-lock.yaml`):

| Package | Licence | Evidence | Stays |
|---|---|---|---|
| `chess.js` 1.4.0 | `BSD-2-Clause`, (c) Jeff Hlywa | npm registry field and [LICENSE](https://raw.githubusercontent.com/jhlywa/chess.js/master/LICENSE); no dependencies | yes |
| `stockfish.js` 10.0.2 | `GPL-3.0` | npm registry field | **no**, removed |

There is no other chess-related dependency in the lockfile.

## 3. Decision

**Primary: Garbochess-JS** at commit `4ff0f9e49a0041545b645e25d3d2da7af3b36a90`, vendored as one unmodified file.
**Fallback: `js-chess-engine` 2.4.6** from npm, exact pin.

Reasons, in the order the brief weighs them:

1. **Licence.** Both are standard permissive licences with a clear copyright holder, and neither has a net, a book in
   the engine file or tuning data. That removes the weights-and-data question entirely, which no strong modern engine
   does: Caissa's own net README states Stockfish data, Lozza's notes state Stockfish evaluations and Lichess-derived
   sets, and the strong JavaScript engines are GPL (tomitank) or without a real licence (Lozza).
2. **No build step.** Both are plain JavaScript. Nothing is compiled, nothing is downloaded per platform, CI needs no
   toolchain. Caissa, 4ku and Leorik all fail here.
3. **Determinism.** Both are single-threaded integer code. Garbochess is frozen since 2012, so the reference can never
   move under the baseline; `js-chess-engine` released eight versions in four days in February 2026.
4. **Strength.** Garbochess is a real engine (null move, late move reductions, SEE, hash table, mobility). The
   fallback is a five-ply tactical checker with a material evaluation. For players with an ACPL around 100 both see
   the blunders that carry the metric, but only Garbochess can stand for "the engine's best move" in the README.
5. **Why not the owner's two names.** Caissa: MIT code and MIT nets, but about 1% Stockfish game data in the training
   set, version 0.6 on a Stockfish net, and a native binary per CPU level. 4ku: MIT and no net, but C++ with CMake,
   no release binaries and no documented `go depth`.

Garbochess is the primary although it is not on npm and is twelve years old, because being frozen is an advantage for a
measuring instrument, and vendoring one 82 kB file is a smaller liability than a dependency that changes weekly.

## 4. Integration

**Where it lives.** An optional lab tool, outside every published package, exactly as decision D12 in
[`REWRITE.md`](REWRITE.md) demanded for Stockfish:

```
lab/vendor/garbochess/garbochess.js   unmodified copy of js/garbochess.js at 4ff0f9e
lab/vendor/garbochess/LICENSE         the BSD-3-Clause text with the copyright line (the licence requires it)
lab/vendor/garbochess/README.md       source URL, commit, SHA-256, date of the copy, "do not edit"
```

- **Pin and hash.** Commit `4ff0f9e49a0041545b645e25d3d2da7af3b36a90`; SHA-256 of `js/garbochess.js` as downloaded
  on 2026-11-14: `b0ebcf80e7bc7c5c9dd08e57f96a07af0a655f6138590243028d6b98717c938c` (81,772 bytes). A test in
  `pnpm check` hashes the vendored file and fails on any difference.
- **Not a dependency.** It is in no `package.json`. `stockfish.js` leaves the root `devDependencies` and the lockfile.
  The vendored folder is excluded from eslint, the typecheck, knip and the formatter, and named in the third-party
  notices (`NOTICE`, decision D12). `mechanics/chess` keeps `chess.js` as its only chess dependency.
- **Loader (`lab/chess-engine.ts`, same exports as today: `analyse`, `centipawns`, `Score`, `Analysis`).** The file
  is a classic worker script, so it is evaluated once in a `node:vm` context that provides `self` and a no-op
  `postMessage`; its top-level functions are then called directly, without the message layer and without a patch:
  `ResetGame()`, `InitializeFromFen(fen)`, `g_timeout = Number.MAX_SAFE_INTEGER`, `Search(done, depth, null)`. The
  search is synchronous; `done` receives the best move, the value and the depth reached.
- **Units.** A pawn is 800 engine units (`materialTable`), so centipawns are `Math.round(value / 8)`. Values beyond
  `maxEval - 2000` (`maxEval` = 2,000,000) are mates; the distance in plies is `maxEval - value`. The exact
  mate-in-N convention is fixed by fixtures (mate in 1, 2, 3 for both colours) before the first real analysis.
  `FormatMove` gives `e2e4` and `e7e8q`, which `chess-analyse.ts` already maps to SAN through `chess.js`.
- **`analysis.json` header** becomes `{ engine: "garbochess-js", commit, sha256, depth }` instead of the bare string
  `"stockfish 10"`, so a file always says which ruler measured it.

**How determinism is guaranteed.**

1. One engine state per position: `ResetGame()` clears hash table, killers and history before every search (today's
   code does the same with `ucinewgame`), so the result does not depend on the order of positions or games.
2. No clock in the result: the only time check compares against `g_timeout`, which is set beyond reach; the depth
   loop is the only stop condition.
3. No randomness: Zobrist keys come from a Mersenne twister seeded with a constant; `Math.random` is not used.
4. Integer arithmetic only, one thread, no SIMD, no WASM: the same on x64 and arm64 by the language specification.
5. A golden file in `pnpm check`: about 24 positions (openings, middlegames, endgames, promotions, castling, en
   passant, mates, stalemate) with the expected score, best move and **node count** at depth 6. A node count that
   matches proves the same search tree, not only the same answer.
6. Once, before the baseline is rewritten: the full re-analysis is run on two machines (Linux x64, macOS arm64) and
   the `analysis.json` files are compared byte for byte.

**Depth.** Default **10** for `pnpm lab:chess` (the tests keep depth 6). Garbochess reduces late moves and prunes
with null moves, and adds a quiescence search with checks, so nominal depth 10 sees the one-to-four-move tactics that
make up the LLM blunders (P113: hanging queens). Depth 14 was a Stockfish number and does not transfer. One
calibration is allowed before the baseline is frozen: if the median time per position on the 13,933 baseline
positions is above 1 s, the default goes to 9; it is never raised after the baseline is written.

**Acceptance gate (before the baseline is replaced).** The old Stockfish files make this cheap, without running
Stockfish again:

1. All 13,933 positions analyse without an error, and every best move is legal by `chess.js`.
2. Per side and game, the rank correlation (Spearman) between old and new ACPL is at least 0.9, and the order of the
   arms in the five-seed table (default, lists, lists + coach) is unchanged.
3. At least 85% of the old blunders (300+) are still mistakes or blunders (100+) with the new engine.

If the gate fails at depth 10, the fallback is tried under the same gate before any other engine is considered.

**Fallback integration.** `js-chess-engine` exactly `2.4.6` as a root dev dependency, integrity
`sha512-OKvWKICifXLjUilGzT5RstUv9iGpk04PjGpTyVT0lMlxX2HptoXZ2Q9hNicidnYjFcR7FHpnXFVwreDSF6a5Ng==` in the lockfile.
Call: `new Game(fen).ai({ play: false, analysis: true, randomness: 0, depth: { base: 5, extended: 0, check: true,
quiescence: 4 } })`, a new `Game` per position. `randomness: 0` must be written out, because the default injects a
random choice on move 1. Known limits to state in the README if it is used: no draw rules in the search, queen
promotions only at the root, material evaluation.

## 5. Migration of the old analyses

**A re-analysis is needed.** Centipawn loss is a distance on one engine's scale at one depth. The baseline in
[`02-experiment-science.md`](02-experiment-science.md) (row 5: match ACPL 138, 92, 78; "default 115-160; lists at
least 23 lower") was measured with Stockfish 10 at depth 14. A new run measured with another engine cannot be held
against those numbers, and keeping Stockfish for the baseline only would keep GPL in the workflow.

- **Scope.** All 57 run folders under `stories/chess/runs/` that have an `analysis.json`: 211 games, 13,722
  half-moves, 13,933 positions. Input is `events.jsonl` only.
- **Cost.** No model calls, no money. Stockfish needed about 1 s per position at depth 14 (story README), about 3.9
  CPU-hours for the set. The budget for the new engine is the same: at most 1 s median per position, about 4
  CPU-hours on one core, about 30 to 40 minutes with one process per run on 8 cores. **Unverified until measured**;
  the calibration rule in section 4 bounds it.
- **Files.** The old `analysis.json` and `ANALYSIS.md` are renamed `analysis.stockfish10.json` and
  `ANALYSIS.stockfish10.md` and stay as frozen data until the gate has passed and the tables are restated; they are
  numbers produced by this project, not GPL material. After that they go with the old runs wherever decision D12
  sends run data. The new files take the old names.
- **Numbers to restate in the same change:** the ACPL columns and the confidence intervals in
  `stories/chess/runs/README.md`; row 5 and its tolerance band in 02 (band and "at least 23 lower" recomputed from
  the re-analysis, not copied); the engine paragraph in `stories/chess/README.md`; the two Stockfish sentences in
  `REWRITE.md` (D12 and section 6) and in `05-challenge.md`; the depth-6 expectations in
  `test/stories/chess.test.ts`; the header text in `lab/chess-analyse.ts` (`markdown()`).
- **What stays comparable.** Counts that do not depend on the engine (refused moves, requests per half-move, results)
  are untouched. Old and new ACPL are never mixed in one table.

## 6. Open risks

1. **Strength and speed of Garbochess in Node are unmeasured.** Nothing was run. Remedy: the acceptance gate and the
   one calibration of the depth; the fallback under the same gate.
2. **Provenance of ideas.** The Garbochess `README` thanks Fruit and Stockfish (both GPL) for mobility evaluation,
   null-move and LMR ideas. The file carries no foreign copyright notice, the board representation (16x16 mailbox)
   is unlike either engine, and the author publishes it under BSD-3-Clause; techniques are not code. This is judged
   low risk, but it is the one point where the owner may want a stricter reading; `js-chess-engine` has no such note.
3. **Old code, no maintainer.** Bugs in FEN parsing or rare positions will not be fixed upstream. Remedy: gate 1
   (every best move legal on 13,933 real positions) and the golden file; a fix would be a documented local patch
   with a new hash, which also changes the reference and forces a re-analysis.
4. **No under-promotion or draw-rule guarantees were checked** in Garbochess beyond reading that repetition
   detection and a fifty-move counter exist in the source.
5. **Loading through `node:vm` unmodified is read from the source, not tried.** If a global is missing, the fallback
   is a three-line wrapper file next to the vendored copy, never an edit of the copy.
6. **The fallback is weak.** If it has to be used, "engine's best move" in the documentation becomes "a five-ply
   reference", and missed mates beyond three moves are no longer found.
7. **If a strong engine is ever required** (for example stronger models), Leorik (MIT, self-play from zero) as an
   optional native UCI tool outside `pnpm check` is the clean route; Lozza becomes an option only with a written
   MIT or BSD grant from its author and a net trained without Stockfish labels.

## 7. Unverified claims and failed sources

- **Network.** `api.github.com` was refused for all candidate repositories (no licence metadata, no commit dates from
  the API); `www.chessprogramming.org` did not resolve in this session. Licences were read from the raw `LICENSE`
  files and repository pages instead.
- Garbochess-JS: no rating found; the 2200 to 2500 range, the time per position and the depth-10 choice are estimates.
- `js-chess-engine`: strength and speed are estimates from reading `dist/ai/*.js`; the package gives no rating.
- 4ku: strength, `go depth` support and the origin of its evaluation constants (README silent; source not read).
- Caissa: bit-equal results across its CPU-level binaries; date of release 1.26 and of the last commit.
- Lozza: how `lichess-big3-resolved` and `quiet-labeled` were labelled (the names and the "SF evals" note are from
  its release notes; the datasets themselves were not inspected).
- Leorik: release date of 3.2; that no data other than self-play was ever used (the README says "trained from zero"
  and does not list exclusions).
- wukongJS: whether a licence file exists below the first page of its file list; treated as unclear.
- p4wn, tonnetto: strength beyond their READMEs; last commit dates.
- Two npm packages seen only in a search result (`tiny-chess-wasm`, CheckAI; both said to be MIT, neither with UCI or
  fixed depth in the snippet) were not opened and are not candidates.
