# Games

One folder per game: `games/<name>/` with the game definition (`game.ts`), a short `README.md`, its briefing and its
tests, among them the oracle test where the game has oracle files. Four games are here: `hello`, `tictactoe-teams`,
`quarry` and `econ-lab`. The catalogue for readers is [`GAMES.md`](../GAMES.md).

Recorded runs do not live here. They go to the orphan branch `data/runs` of this repository (decision A15); a game
folder holds the index only (`games/<name>/RUNS.md`, from the first run on). `m2-ledger.jsonl` is the spend ledger
of the live runs of milestone M2, `m3-ledger.jsonl` that of the live smoke of M3.
