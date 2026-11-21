# Swarm Tales

**A laboratory for AI agents: games and societies on one engine, every word and every private thought on record.**

Swarm Tales lets AI agents play with and against each other, in board games, card games, markets and small
societies. It records everything they do: every message, every move, every payment and the reasoning behind it. A
run has a seeded world and a signed, hash-chained log, so it can be cited line by line. It is an instrument with a
complete record, not a benchmark.

> **Status: 1.0 is being prepared; nothing is published yet,** so until the release a clone is the way in. The plan
> is in [`docs/refactoring-before-release/`](docs/refactoring-before-release/README.md). The old platform, with all its recorded runs, is on the
> branch `legacy` (tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final)), under its old licence, until after 1.0.

## Hello Game

Tic-tac-toe between two residents. This is the whole game, [`games/hello/game.ts`](games/hello/game.ts):

```ts
import { gridGame } from "@swarmtales/mechanic-grid";
import { defineGame } from "swarmtales";

export default defineGame({
	id: "hello-game",
	residents: ["ada", "bob"],
	mechanics: [gridGame({ teams: { X: ["ada"], O: ["bob"] }, games: 1 })],
	scheduler: { id: "turns", options: { activation: "toAct" } },
	end: { ticks: 12 },
	win: { fact: "grid.tally" },
	model: "anthropic/haiku",
});
```

Play it offline in a clone, then check the record of the run:

```bash
git clone https://github.com/florianpirchner/swarmtales.git && cd swarmtales && pnpm install
node --conditions development apps/cli/src/bin.ts run games/hello/game.ts --fake
node --conditions development apps/cli/src/bin.ts log verify runs/hello-game-001
```

`--fake` plays seeded random legal moves in place of a model: nothing leaves the machine and nothing is paid. It prints

```
hello-game seed 1: ended after 6 ticks (limit grid.match: the match is over)
result grid.tally: {"X":1,"O":0,"draw":0}
```

and writes the run folder with the signed, hash-chained log. With `--budget 0.01` in place of `--fake` Haiku plays it
live (key in `SWT_ANTHROPIC_API_KEY`); its recorded runs cost about 0.002 USD ([runs](games/hello/RUNS.md)). From
the release, in a project of `"type": "module"`, install `swarmtales` alone (it brings `swt`) and the mechanics:

```bash
pnpm add swarmtales @swarmtales/mechanic-grid
pnpm exec swt run game.ts --fake
```

## The building blocks

| Block | What it is |
|---|---|
| Game | the definition of what is played: residents, mechanics, Directors, models. Plain data, one format |
| Resident | an AI agent that plays. It has a role, private memory and the tools the game grants |
| Mechanic | one rule of a game, shipped as code: state, tools, events. A game lists the mechanics it uses |
| Director | a model that is not a resident. It observes and acts only through granted tools and decisions |
| Human Hand | a person's interventions in a running game (instruct, amend, pause), each one logged |
| The log | the append-only, numbered, hash-chained record of a run; `#212` cites one event |

A seed fixes everything random in the world, a snapshot saves a run at a tick so it can be resumed, and a dial (an integer
from 0 to 10) sets how strongly a Director or a mechanic acts.

## What we found (2026-11-15)

Four effects of the old platform were measured again on this one, 12 seeds each ([`docs/M2-GATE.md`](docs/M2-GATE.md), [`docs/M4-GATE.md`](docs/M4-GATE.md)); every other result is still an "old platform" row of [`docs/FINDINGS.md`](docs/FINDINGS.md).

- **Open quarries raise the table's points:** +84.5 (n 12 pairs, standard error 22.0, 95 % interval 36 to 133). The size agrees with the old +77. Caveat: a seat also sees picks of the same step (LH18 in [`docs/LESSONS-LEARNED.md`](docs/LESSONS-LEARNED.md)). [Series](https://github.com/florianpirchner/swarmtales/tree/data/runs/quarry/quarry-open-quarries)
- **A strategy brain lowers cooperation in the dilemma:** -0.771 (n 12 runs per arm, standard error 0.084, 95 % interval -0.954 to -0.588). Sign kept, larger than the old estimate of -0.40. [Series](https://github.com/florianpirchner/swarmtales/tree/data/runs/econ-lab/econ-lab-brain)
- **A team brain raises recall in Lanterns:** +0.058 (n 12 pairs, standard error 0.022, 95 % interval +0.010 to +0.106). The size agrees with the old +0.08; more of it is in game 1 than before. [Series](https://github.com/florianpirchner/swarmtales/tree/data/runs/lanterns/lanterns-team-brain)
- **Private notes before a Harbor Lights game:** +1.58 points (n 12 pairs, standard error 1.37, 95 % interval -1.44 to +4.61). Sign kept, size not reproduced: the old +3.2 was twice as large. [Series](https://github.com/florianpirchner/swarmtales/tree/data/runs/harbor-lights/harbor-lights-private-notes)

## One recorded moment

After the shared-fund game, seat A02 wrote into its strategy brain: "Free-riding is dominant regardless of others;
revisit only if rules change" (`#992`). In the next game it chose B against every partner: "B strictly dominates
A here" (`#1038`). The table cooperated in 1 of 20 choices. Run [`econ-lab-brain/econ-lab-007`](https://github.com/florianpirchner/swarmtales/tree/data/runs/econ-lab/econ-lab-brain/econ-lab-007).

## Choose your path

- **Build a game** from shipped mechanics: [the tutorial](docs/tutorials/game.md), checked by samples 1 to 4 ([`samples/`](samples/README.md)).
- **Write a mechanic:** [the tutorial](docs/tutorials/mechanic.md), checked by sample 5 ([`samples/own-mechanic/`](samples/own-mechanic/README.md)).
- **Write a Director:** [the tutorial](docs/tutorials/director.md), checked by sample 6 ([`samples/own-director/`](samples/own-director/README.md)).
- **Reproduce a finding:** each finding links its series; its spec in `games/<name>/experiments/` plays with `swt experiment run` ([reference](docs/reference/cli.md)).

## The games

Fifteen games in five families (societies, open board games, bluff, hidden cooperation, markets and bids) are ported
from the old platform, beside the Hello Game and a slice of the City. The catalogue is [`GAMES.md`](GAMES.md).

## Requirements and keys

Node 22.19 or newer (`engines`; the checks run on [`.node-version`](.node-version)) and pnpm; `pnpm check` runs every gate offline.
Keys: `SWT_ANTHROPIC_API_KEY`, `SWT_OPENROUTER_API_KEY` (every name starts with `SWT_`); `swt doctor` names those set, never a value. Keys never reach a log.

## Honest limits

- **Model answers are not seeded.** A seed fixes the world, never what a model says. Two runs of one seed differ.
- **Small samples.** Most series have 8 to 12 seeds; effects are reported with their standard error.
- **Mostly one model.** Almost every run so far used one small model; little is known about others.
- **Plugins are trusted code.** Mechanics and Directors run in the same process as the engine, with no sandbox.
- **Versions.** From 1.0 the platform follows semantic versions; the game mechanics stay `0.x` ([stability](docs/reference/stability.md)).

## Docs

[Docs index](docs/README.md) · [Glossary](docs/GLOSSARY.md) · [Game catalogue](GAMES.md) · [Lessons learned](docs/LESSONS-LEARNED.md) ·
[Related work](docs/RELATED-WORK.md) · [Contributing](CONTRIBUTING.md) and [`CLAUDE.md`](CLAUDE.md): how work is done here

## Licence and citation

Sustainable Use License 1.0 with Additional Terms (source-available), see [`LICENSE`](LICENSE), [`LICENSE-FAQ.md`](LICENSE-FAQ.md),
[`NOTICE`](NOTICE) and [`THIRD-PARTY-LICENSES.md`](THIRD-PARTY-LICENSES.md). It is not viral: what you build with Swarm Tales
outside this repository is yours, under any licence you choose. Cite the release by [`CITATION.cff`](CITATION.cff).
