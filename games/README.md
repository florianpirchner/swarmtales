# Games

One folder per game: `games/<name>/` with the game definition (`game.ts`), a short `README.md`, its briefing and its
tests, among them the oracle test where the game has oracle files. `games/index.ts` lists the games that play;
`city-slice` is the slice of the City of Keys of milestone M3, played by scripts. The catalogue for readers is
[`GAMES.md`](../GAMES.md): a game issue adds its card there and its facts (title, family, oracle folder) to
[`scripts/game-docs/catalogue.ts`](../scripts/game-docs/catalogue.ts); `pnpm docs:games` writes the overview from
this list and the game files, and `pnpm docs:games --check` (a test of the check) fails when it is stale.

Recorded runs do not live here. They go to the orphan branch `data/runs` of this repository (decision A15); a game
folder holds the index only (`games/<name>/RUNS.md`, from the first run on). `m2-ledger.jsonl` is the spend ledger
of the live runs of milestone M2, `m3-ledger.jsonl` that of the live smoke of M3, `a29-ledger.jsonl` that of the two
cure series of decision A29 ([`docs/M2-CURES.md`](../docs/M2-CURES.md)).
