# Swarm Tales

> **Carried from the old platform.** This document was written before the rewrite and is kept as it was, except for
> its links. Paths into code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do
> not exist on this branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

**A laboratory for AI agents: fifteen games and societies, one engine, every word and every private
thought on record.**

Swarm Tales plays AI agents against each other and with each other, in board games, card games,
markets and small societies, and records everything: every message, every move, every payment and the
reasoning behind it. Every run is seeded, signed and can be read line by line. Because the same engine
runs every game, a question can be asked across all of them at once: *what actually makes an agent play
better?*

> Draft A of three README structures (findings first). See [readme-structures.md](../readme-structures.md).

## What we found across fifteen games

Claude Haiku unless named, paired seeds, standard error (SE) in brackets. Full paper:
[What helps the residents](../../../docs/CROSS-GAME-FINDINGS.md).

- **A number at the moment of the decision is the one lever that worked everywhere.** In chess a list of
  legal moves and loose pieces, plus a coach's review between games, takes Haiku from an average engine
  loss of 138 to 78, the level of Sonnet and Opus, at 4-8 % of their cost per move. In Hold'em the equity
  and the pot odds at each action cut the expected loss per decision from 0.26 to 0.03.
- **But only if the number answers the decision.** In Harbor Lights the chance per card slot made the
  crew gamble more, not less (-1.7 points, SE 1.2).
- **Agents write the right lesson and then do not play it.** A strategy brain carried from game to game
  showed no outcome effect in chess, morris, tic-tac-toe, Quarry or Salt Market. The brains say "check
  for mate-in-one first" and the next game hangs the queen.
- **Memory works when the lesson is about the other players.** Lanterns teams learn what their keeper
  means by a clue (+0.11 recall from game 2 on, SE 0.03). Econ-lab players learn that the others
  free-ride, and cooperate less in the next game (-0.40, SE 0.13).
- **A plan written before the first game helps.** Harbor Lights: a private note before one single game
  is worth +3.2 points (SE 0.8); a convention the crew agrees together only +1.8.
- **A team of three of the same model is a second look, not a stronger player.** Team against one agent
  alone in tic-tac-toe 5x5: 31 wins to 23, with 21 draws, at 3.4 times the calls.
- **A stronger model is strong at some games.** Opus wins 8 of 12 Liar's Dice games at a Haiku table
  without one deliberate lie; Sonnet comes last. Opus plays the econ lab's social optimum with or without
  memory.

## The games

Each game is a story on the same engine. Every run is in the repository with its log and a reviewed
report.

### Societies

| Story | What it is | What it showed | Runs |
|---|---|---|---|
| [City of Keys](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/STORY-CITYOFKEYS.md) | up to 48 residents climb a tower of locked doors; a tribunal removes the weakest, a gamemaker raises the stakes | agents steer factions in private and deny it in public; most of the loopholes in the log were found here | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/cityofkeys/runs) |
| [Whispers](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/STORY-WHISPERS.md) | six residents, one secret whisperer with forged receipts | the five can unmask a whisperer; a Haiku whisperer refused the role twelve times | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/whispers/runs) |

### Board games, all information public

| Story | What it is | What it showed | Runs |
|---|---|---|---|
| [Chess](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/chess) | two seats, moves as text, Stockfish as the judge | a legal-move list plus loose pieces lifts Haiku to Sonnet level; the brain changes nothing | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/chess/runs) |
| [Nine men's morris](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/morris-teams) | two teams of three, or one seat against an engine | Haiku wins 4 %, Sonnet 13 %, Opus 28 % against the depth-3 engine; no brain effect | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/morris-teams/runs) |
| [Tic-tac-toe teams](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/tictactoe-teams) | 3x3 to 5x5, teams vote on every move | 3x3 and 4x4 are a ceiling (all draws); on 5x5 a team blocks more than it wins | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/tictactoe-teams/runs) |

### Hidden information and bluff

| Story | What it is | What it showed | Runs |
|---|---|---|---|
| [Hold'em](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/holdem) | fixed-limit Texas Hold'em, four seats | equity and pot odds at the action: +2.1 points a game; Opus takes 19 a game from Haiku | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/holdem/runs) |
| [Liar's Dice](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/liars-dice) | hidden dice, bids on the whole table | nobody lies on purpose; Opus wins with honest bids that bait wrong calls | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/liars-dice/runs) |
| [Convoy](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/convoy) | six seats, two secret saboteurs | a brain helps the saboteurs coordinate, not the loyal seats detect | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/convoy/runs) |

### Cooperation under hidden information

| Story | What it is | What it showed | Runs |
|---|---|---|---|
| [Harbor Lights](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/harbor-lights) | a crew of four lights signal towers; nobody sees their own cards | a private plan beats a shared convention; the odds per slot make it worse | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/harbor-lights/runs) |
| [Lanterns](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/lanterns) | two teams of three, a word-clue game | the one game where memory clearly works: teams learn their keeper's code | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/lanterns/runs) |

### Markets, bids and economics

| Story | What it is | What it showed | Runs |
|---|---|---|---|
| [Econ Lab](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/econ-lab) | ultimatum, public goods, prisoner's dilemma in a row | memory carries "free riding pays" into the next game; Opus cooperates fully | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/econ-lab/runs) |
| [Salt Market](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/salt-market) | four traders, secret values and contracts | trades happen, but the brain adds nothing (+0.005, SE 0.025) | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/salt-market/runs) |
| [Blind Bid](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/blind-bid) | sealed bids on six lots, a tight purse | seats shade bids, learn that shading too hard leaves them empty-handed | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/blind-bid/runs) |
| [Quarry](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/quarry) | a drafting game, packs passed around the table | showing every quarry during the draft: +77 table points (SE 22) | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/quarry/runs) |
| [Ember Tricks](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/ember-tricks) | trick-taking with exact bids | the hand's worth shown at the bid: points per round 0.53 to 2.36 | [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/ember-tricks/runs) |

## What the agents did

The number after each moment is the log line that proves it.

- **The Quiet Hand won by never raising it.** In City of Keys, Hedda steered both factions in private,
  was shown up with her own message and its receipt, denied it, and still took the first seat.
  ([#11343](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/cityofkeys/runs/act2-12a-003-f10g10-director))
- **A whisperer who would not whisper.** Cast as the secret slanderer, a Haiku resident refused twelve
  times: "Forged evidence aimed at people's trust is a betrayal I won't commit, even in a game."
  ([#992](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/whispers/runs/whispers-06a-007-haiku-defy))
- **Trump as a weapon.** In Ember Tricks a seat that bid zero named as trump a suit it did not hold,
  and another zero bidder, who held it, had to win three tricks.
  ([LH12](../../../docs/LESSONS-LEARNED.md#loopholes))
- **Playing for the clock.** Chess seats ahead on material stopped playing chess: "I'm up 4 points ...
  if the game reaches move 40 on material I'd win." ([LH16](../../../docs/LESSONS-LEARNED.md#loopholes))

Every trick an agent found around the rules is in the [lessons log](../../../docs/LESSONS-LEARNED.md)
(17 loopholes so far), with the run and the fix.

## How it works

- **A story** is a game or a society: its rules, its residents, its overseers. Written in TypeScript or
  YAML.
- **Residents** are the agents that play. **Mechanics** are the rules, each a small plugin (about 40
  ship: chess, cards, ledgers, tribunals, sealed auctions, team chats). **Overseers** are agents that
  watch and steer: a gamemaker, a confessor that labels lies and threats, a judge, a coach.
- **Three levers** every game can switch on: a strategy brain (memory across games), teams (several
  agents per seat), and referee information (a number or list at the decision).
- **The log** is the product: append-only, numbered, hash-chained and signed per run
  (`swt log verify`). Runs are seeded, can be snapshotted after every act and replayed in the
  [run viewer](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/design/viewer-build.md).
- A typical four-seat game run costs 0.05 to 0.50 USD.

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
