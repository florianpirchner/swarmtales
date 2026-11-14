# Smoke runs of the M2 gate (step 1)

Three single live runs on `anthropic/haiku` (resolved `claude-haiku-5-5`, thinking medium), code commit
`b7de6505cb6cfd55c699db639f425e3d5e26fc06`, runtime revision 3. Each folder verifies with `swt log verify`; each
`REPORT.md` was written by `swt report <run> --game <game file>`.

| Run | Game | Seed | Purpose | Cap (USD) | Cost (USD) | End | Requests per decision | Result |
|---|---|---|---|---:|---:|---|---:|---|
| `hello-game-001` | `games/hello/game.ts` | 1 | smoke | 0.05 | 0.0015 | tick limit (12) | - | no game finished: tally 0, 0, 0 |
| `quarry-001` | `games/quarry/game.ts`, control | 31 | pilot | 0.10 | 0.0337 | `draft-rounds.match` | 1.278 (184 / 144) | 1071 table points |
| `econ-lab-001` | `games/econ-lab/game.ts`, `brain=false` | 41 | pilot | 0.05 | 0.0125 | `econ-games.match` | 1.306 (94 / 72) | dilemma cooperation 1.00 (a locked table) |

No leak, no `error` end, no cost cap reached, no failed request.

## Loopholes

None seen in these three runs when they were written up. The milestone review of M2 later found LH19 in the
series ("Results so far" is a second memory, also without a brain; carried from the old platform, open); the two
pilots here start their later games with the same line. See the root `README.md`.

## Problems

- **The Hello Game does not finish under a live model.** Each resident spends one activation on `viewBoard` and
  the next on `playMove`, so the 12 ticks hold 8 of the 9 moves and the tally stays 0, 0, 0
  (`hello-game-001`, run end at #183). Proposed: more ticks, or the board in the turn input. Built: nothing. Open.
- **`swt report` without `--game` leaves the game's metrics out.** The facts table then holds only the `run.*`
  and `models.*` keys and says nothing about the missing ones. Proposed: resolve the mechanics from the manifest,
  or refuse. Built: nothing; every report here was written with `--game`. Open.
