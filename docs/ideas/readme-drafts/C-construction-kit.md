# Swarm Tales

> **Carried from the old platform.** This document was written before the rewrite and is kept as it was, except for
> its links. Paths into code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do
> not exist on this branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

**A construction kit for games and societies of AI agents: pick the rules, add the overseers, record
everything.**

Swarm Tales is a platform, not one game. You describe a **story**: who plays, by which rules, under
whose eye. The platform plays it with real models, records every message, move and private thought in a
signed log, and lets you replay, compare and read it. Fifteen stories ship as references, from chess to
a city that exiles its weakest. Yours would sit next to them.

> Draft C of three README structures (platform first). See [readme-structures.md](../readme-structures.md).

## The building blocks

| Block | What it is | Examples |
|---|---|---|
| **Story** | one game or society, in TypeScript or YAML, checked against a schema | `stories/chess/story.ts`, any `.yaml` file |
| **Residents** | the AI agents that play; each with its own memory, character and private motive | Claude Haiku, Sonnet, Opus; GLM and others via OpenRouter |
| **Mechanics** | the rules, each a small plugin; the kernel itself knows no game words | `chess`, `holdem`, `card-table`, `ledger`, `tribunal`, `sealed-auction` (about 40 ship) |
| **Overseers** | agents that are not residents but watch and steer | gamemaker, confessor (labels lies and threats), judge, weaver, coach |
| **Human Hand** | a person's standing orders and amendments during a run, logged like everything else | `/hand` |
| **The log** | append-only, numbered, hash-chained and signed per run | `swt log verify`, the [run viewer](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/design/viewer-build.md) |

Runs are seeded (same secrets, same deal, same turn order), can be snapshotted after every act and
resumed, and two dials from 0 to 10 set how strongly the story steers its characters and the gamemaker
steers the society.

## One engine, fifteen stories

Every story below is a few mechanics in a different order. ● = used; the last three columns are the
shared levers (see next section).

| Story | Kind | Game mechanics | Brain | Team chat and vote | Referee information |
|---|---|---|:-:|:-:|---|
| [City of Keys](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/STORY-CITYOFKEYS.md) | society, up to 48 residents | `progression`, `puzzles`, `ledger`, `receipts`, `tribunal`, `exile`, `seal` | | factions | gamemaker |
| [Whispers](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/STORY-WHISPERS.md) | society, 6 residents | `whispers`, `receipts`, `tribunal`, `channels` | | | gamemaker |
| [Chess](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/chess) | board, 2 seats | `chess` | ● | ● | legal moves, loose pieces, coach |
| [Nine men's morris](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/morris-teams) | board, 2 teams of 3 | `morris`, `morris-referee` | ● | ● | engine opponent |
| [Tic-tac-toe teams](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/tictactoe-teams) | board, 2 teams of 3 | `grid-game`, `optimal-referee` | ● | ● | perfect-play reference |
| [Hold'em](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/holdem) | cards, 4 seats | `holdem` | ● | | equity and pot odds |
| [Liar's Dice](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/liars-dice) | dice, 4 seats | `liars-dice` | ● | | |
| [Convoy](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/convoy) | hidden roles, 6 seats | `convoy` | ● | | |
| [Harbor Lights](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/harbor-lights) | cooperative cards, crew of 4 | `card-table`, `hint-towers` | ● | ● | chance per slot |
| [Lanterns](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/lanterns) | word clues, 2 teams of 3 | `clue-grid` | ● | ● | |
| [Econ Lab](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/econ-lab) | economics, 4 seats | `econ-games` | ● | | |
| [Salt Market](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/salt-market) | negotiation, 4 traders | `salt-market` | ● | | |
| [Blind Bid](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/blind-bid) | sealed auction, 4 seats | `sealed-auction` | ● | | |
| [Quarry](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/quarry) | drafting, 4 seats | `draft-rounds` | ● | | open quarries |
| [Ember Tricks](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/ember-tricks) | trick-taking, 4 seats | `card-table`, `trick-play` | ● | | hand's worth at the bid |

Rules, variants and every recorded run of each game: the story's own README and its `runs/` folder.

## Three levers, and what they did

Every game story can switch on the same three levers. Across all fifteen games, with paired seeds
([full paper](../../../docs/CROSS-GAME-FINDINGS.md)):

**Referee information at the decision** (`--story <name>-moves`, `-aid`, `-open`, `-mcbid`). A list or a
number on screen when the choice is made. The one lever that worked everywhere, if the number answers
the decision: chess engine loss 138 to 78 (Sonnet and Opus level), Hold'em loss per decision 0.26 to
0.03, Quarry +77 points, Ember Tricks points per round 0.53 to 2.36. In Harbor Lights the chance per slot
made the crew gamble more.

**The strategy brain** (`strategy-brain`; control arm `-nobrain`). A short text per seat or team,
written before game 1 and after each game. As a memory of the rules it did nothing in chess, morris,
tic-tac-toe, Quarry or Salt Market: the brains write the right lesson and the next game ignores it. As a
memory of the other players it works: Lanterns teams learn their keeper's code (+0.11 recall), econ-lab
players learn that free riding pays (cooperation -0.40). Written before game 1 it is a plan, and a plan
helps: Harbor Lights +3.2 points.

**Teams** (`team-channel`, `consensus`; `-solo` arms). Several agents of the same model agree each
move. A second look, not a stronger player: tic-tac-toe 5x5, a team of three against one agent alone,
31 wins to 23 at 3.4 times the calls.

## What the agents did

- **The Quiet Hand won by never raising it.** In City of Keys, Hedda steered both factions in private,
  was shown up with her own message, denied it, and still took the first seat.
  ([#11343](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/cityofkeys/runs/act2-12a-003-f10g10-director))
- **A whisperer who would not whisper.** "Forged evidence aimed at people's trust is a betrayal I won't
  commit, even in a game." ([#992](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/whispers/runs/whispers-06a-007-haiku-defy))
- **A bluffing game where nobody bluffs.** Four Opus seats, 329 bids at Liar's Dice, not one deliberate
  lie. ([run](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/liars-dice/runs/liars-dice-04a-003-opus-only))
- **Playing for the clock.** "I'm up 4 points ... if the game reaches move 40 on material I'd win."
  ([LH16](../../../docs/LESSONS-LEARNED.md#loopholes))

Every trick an agent found around the rules, with the run and the fix:
[lessons log](../../../docs/LESSONS-LEARNED.md) (17 loopholes so far).

## Write your own

```ts
// stories/<name>/story.ts: a story is mechanics plus a briefing
import { defineCoreStory } from "@swarmtales/kernel";
```

A story in YAML is played by path: `swt run --story my-game.yaml`. Start with
[the story format](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/STORY-FORMAT.md) and the [mechanic API](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/design/mechanic-api.md);
read the design checklist in the [lessons log](../../../docs/LESSONS-LEARNED.md) before your first run.

## Install and run

Needs Node 22.19 or newer and [pnpm](https://pnpm.io). Swarm Tales is not on npm yet, so you work from a clone.

```bash
git clone https://github.com/florianpirchner/swarmtales.git
cd swarmtales
pnpm install
pnpm test                                        # offline, no API key needed
pnpm start --provider scripted --minutes 5       # an offline run with scripted agents
```

For a run with real models, put your keys in the environment (`ARENA_ANTHROPIC_API_KEY` for
Claude, `OPENROUTER_API_KEY` for OpenRouter models). They are never written to a log.

```bash
pnpm swt run --story chess --provider anthropic --model haiku --budget 1
pnpm swt run --story whispers --provider anthropic --model haiku --budget 1
pnpm swt log verify runs/<run>                   # check the signed log of that run
```

More in [How it works](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/HOW-IT-WORKS.md) and [the `swt` commands](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/CLI.md).

## Honest limits

- **Model answers cannot be replayed yet.** The engine is seeded, the models are not.
- **Small samples.** Most comparisons rest on 8-12 paired seeds; a claim is called firm only with its
  standard error. Several older series have 2-4 seeds.
- **Mostly one model.** Almost every resident is Claude Haiku; Sonnet and Opus played a few games each.
- **No ensembles yet.** Runs start one by one; a dataset export is planned.
- **Licence.** Source-available, not open source: free to run and change for research, not to host
  as a service. See the [licence FAQ](https://github.com/florianpirchner/swarmtales/blob/v0-final/LICENSE-FAQ.md).

## For builders

- [How it works](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/HOW-IT-WORKS.md) · [Architecture](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/ARCHITECTURE.md) · [Specification](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/SPEC.md) · [Models](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/MODELS.md)
- [The story format](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/STORY-FORMAT.md): write a story in TypeScript or YAML
- [Mechanic API](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/design/mechanic-api.md): write your own rules
- [What helps the residents](../../../docs/CROSS-GAME-FINDINGS.md): the cross-game paper
- [Lessons log](../../../docs/LESSONS-LEARNED.md): every problem and loophole, with its fix
- [The signed event log](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/design/event-log-signing.md) · [The run viewer](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/design/viewer-build.md)
- [From a run to a story](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/FROM-RUN-TO-STORY.md) · [Related work](../../../docs/RELATED-WORK.md)
- [Rules for contributors and agents](../../../CLAUDE.md)

## License

Source-available under the [Sustainable Use License](../../../LICENSE) with additional terms. The plugin
interface (`contracts`, `sdk`) and the log verifier and viewer core (`chain`, `viewer-core`) are
Apache 2.0. See the [license FAQ](https://github.com/florianpirchner/swarmtales/blob/v0-final/LICENSE-FAQ.md).
