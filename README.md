# Swarm Tales

**A laboratory for AI agents: games and societies on one engine, every word and every private thought on record.**

Swarm Tales lets AI agents play with and against each other, in board games, card games, markets and small
societies. It records everything they do: every message, every move, every payment and the reasoning behind it. A
run has a seeded world and a signed, hash-chained log, so it can be cited line by line. It is an instrument with a
complete record, not a benchmark.

> **Status: rewrite in progress, before 1.0.** This branch is the new platform, built issue by issue. Two games
> play on it so far, with a scripted player in place of a model: the Hello Game and tic-tac-toe teams. The old platform, with its fifteen games and all recorded runs, is on the branch `legacy` (tag
> [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final)), under its old licence, and will be
> removed after 1.0. The plan is in [`docs/refactoring-before-release/`](docs/refactoring-before-release/README.md).

## Hello Game

Tic-tac-toe between two residents. This is the whole game, [`games/hello/game.ts`](games/hello/game.ts):

```ts
import { gridGame } from "@swarmtales/mechanic-grid-game";
import { defineGame } from "@swarmtales/sdk";

export default defineGame({
	id: "hello-game",
	residents: ["ada", "bob"],
	mechanics: [gridGame({ teams: { X: ["ada"], O: ["bob"] }, games: 1 })],
	scheduler: { id: "turns", options: { activation: "toAct" } },
	end: { ticks: 12 },
	win: { fact: "grid-game.tally" },
	model: "anthropic/haiku",
});
```

Play it offline, then check the record of the run:

```bash
node --conditions development apps/cli/src/bin.ts run games/hello/game.ts --fake
node --conditions development apps/cli/src/bin.ts log verify runs/hello-game-001
```

`--fake` plays seeded random legal moves in place of a model: nothing leaves the machine and nothing is paid. It prints

```
hello-game seed 1: ended after 6 ticks (limit grid-game.match: the match is over)
result grid-game.tally: {"X":1,"O":0,"draw":0}
```

and writes the run folder with the signed, hash-chained log. The same game on a live model arrives with milestone M2.

## The building blocks

| Block | What it is |
|---|---|
| Game | the definition of what is played: residents, mechanics, Directors, models. Plain data, one format |
| Resident | an AI agent that plays. It has a role, private memory and the tools the game grants |
| Mechanic | one rule of a game, shipped as code: state, tools, events. A game lists the mechanics it uses |
| Director | a model that is not a resident. It observes and acts only through granted tools and decisions |
| Human Hand | a person's interventions in a running game (instruct, amend, pause), each one logged |
| The log | the append-only, numbered, hash-chained record of a run; `#212` cites one event |

A seed fixes everything random in the world, a snapshot saves a run at a tick so it can be resumed, and a dial (an
integer from 0 to 10) sets how strongly a Director or a mechanic acts.

## What we found

The findings of the old platform are being measured again on this one. Until an effect is reproduced here, this
section stays empty; the old results are in [`docs/CROSS-GAME-FINDINGS.md`](docs/CROSS-GAME-FINDINGS.md) and their
runs at the tag `v0-final`.

## One recorded moment

A quote with its event number follows with the first run on the new platform (milestone M2).

## Choose your path

- **Build a game** from shipped mechanics: the first-hour tutorial arrives with milestone M1.
- **Write a mechanic:** the tutorial arrives with milestone M3.
- **Write a Director:** the tutorial arrives with milestone M3.
- **Reproduce a finding:** the rerun plan and the data repository arrive with milestone M2.

Until then, [`CLAUDE.md`](CLAUDE.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md) say how work is done here.

## The games

Fifteen games in five families (societies, public board games, hidden information and bluff, cooperation under
hidden information, markets and bids) are ported from the old platform. The catalogue is [`GAMES.md`](GAMES.md).

## Requirements and keys

Node 26.13 or newer (the one source is [`.node-version`](.node-version)) and pnpm. `pnpm install`, then
`pnpm check`. Nothing here calls a model yet. Key names will start with `SWT_`; keys never reach a log.

## Honest limits

- **Model answers are not seeded.** A seed fixes the world, never what a model says. Two runs of one seed differ.
- **Small samples.** Most series have 8 to 12 seeds; effects are reported with their standard error.
- **Mostly one model.** Almost every run so far used one small model; little is known about others.
- **Plugins are trusted code.** Mechanics and Directors run in the same process as the engine, with no sandbox.
- **Before 1.0 the API changes** without notice, and at this stage of the rewrite most of it does not exist yet.

## Docs

- [Docs index](docs/README.md)
- [Glossary](docs/GLOSSARY.md)
- [Game catalogue](GAMES.md)
- [Lessons learned](docs/LESSONS-LEARNED.md): problems, loopholes and the design checklist
- [Related work](docs/RELATED-WORK.md)
- [Contributing](CONTRIBUTING.md)

## Licence and citation

Apache License 2.0, see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE); third-party software is listed in
[`THIRD-PARTY-LICENSES.md`](THIRD-PARTY-LICENSES.md). The name "Swarm Tales" is not licensed (section 6 of the
licence). A `CITATION.cff` follows with the 1.0 release.
