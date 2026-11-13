# Swarm Tales

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
| [City of Keys](../../../docs/STORY-CITYOFKEYS.md) | up to 48 residents climb a tower of locked doors; a tribunal removes the weakest, a gamemaker raises the stakes | agents steer factions in private and deny it in public; most of the loopholes in the log were found here | [runs](../../../stories/cityofkeys/runs/) |
| [Whispers](../../../docs/STORY-WHISPERS.md) | six residents, one secret whisperer with forged receipts | the five can unmask a whisperer; a Haiku whisperer refused the role twelve times | [runs](../../../stories/whispers/runs/) |

### Board games, all information public

| Story | What it is | What it showed | Runs |
|---|---|---|---|
| [Chess](../../../stories/chess/) | two seats, moves as text, Stockfish as the judge | a legal-move list plus loose pieces lifts Haiku to Sonnet level; the brain changes nothing | [runs](../../../stories/chess/runs/) |
| [Nine men's morris](../../../stories/morris-teams/) | two teams of three, or one seat against an engine | Haiku wins 4 %, Sonnet 13 %, Opus 28 % against the depth-3 engine; no brain effect | [runs](../../../stories/morris-teams/runs/) |
| [Tic-tac-toe teams](../../../stories/tictactoe-teams/) | 3x3 to 5x5, teams vote on every move | 3x3 and 4x4 are a ceiling (all draws); on 5x5 a team blocks more than it wins | [runs](../../../stories/tictactoe-teams/runs/) |

### Hidden information and bluff

| Story | What it is | What it showed | Runs |
|---|---|---|---|
| [Hold'em](../../../stories/holdem/) | fixed-limit Texas Hold'em, four seats | equity and pot odds at the action: +2.1 points a game; Opus takes 19 a game from Haiku | [runs](../../../stories/holdem/runs/) |
| [Liar's Dice](../../../stories/liars-dice/) | hidden dice, bids on the whole table | nobody lies on purpose; Opus wins with honest bids that bait wrong calls | [runs](../../../stories/liars-dice/runs/) |
| [Convoy](../../../stories/convoy/) | six seats, two secret saboteurs | a brain helps the saboteurs coordinate, not the loyal seats detect | [runs](../../../stories/convoy/runs/) |

### Cooperation under hidden information

| Story | What it is | What it showed | Runs |
|---|---|---|---|
| [Harbor Lights](../../../stories/harbor-lights/) | a crew of four lights signal towers; nobody sees their own cards | a private plan beats a shared convention; the odds per slot make it worse | [runs](../../../stories/harbor-lights/runs/) |
| [Lanterns](../../../stories/lanterns/) | two teams of three, a word-clue game | the one game where memory clearly works: teams learn their keeper's code | [runs](../../../stories/lanterns/runs/) |

### Markets, bids and economics

| Story | What it is | What it showed | Runs |
|---|---|---|---|
| [Econ Lab](../../../stories/econ-lab/) | ultimatum, public goods, prisoner's dilemma in a row | memory carries "free riding pays" into the next game; Opus cooperates fully | [runs](../../../stories/econ-lab/runs/) |
| [Salt Market](../../../stories/salt-market/) | four traders, secret values and contracts | trades happen, but the brain adds nothing (+0.005, SE 0.025) | [runs](../../../stories/salt-market/runs/) |
| [Blind Bid](../../../stories/blind-bid/) | sealed bids on six lots, a tight purse | seats shade bids, learn that shading too hard leaves them empty-handed | [runs](../../../stories/blind-bid/runs/) |
| [Quarry](../../../stories/quarry/) | a drafting game, packs passed around the table | showing every quarry during the draft: +77 table points (SE 22) | [runs](../../../stories/quarry/runs/) |
| [Ember Tricks](../../../stories/ember-tricks/) | trick-taking with exact bids | the hand's worth shown at the bid: points per round 0.53 to 2.36 | [runs](../../../stories/ember-tricks/runs/) |

## What the agents did

The number after each moment is the log line that proves it.

- **The Quiet Hand won by never raising it.** In City of Keys, Hedda steered both factions in private,
  was shown up with her own message and its receipt, denied it, and still took the first seat.
  ([#11343](../../../stories/cityofkeys/runs/act2-12a-003-f10g10-director/))
- **A whisperer who would not whisper.** Cast as the secret slanderer, a Haiku resident refused twelve
  times: "Forged evidence aimed at people's trust is a betrayal I won't commit, even in a game."
  ([#992](../../../stories/whispers/runs/whispers-06a-007-haiku-defy/))
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
  [run viewer](../../../docs/design/viewer-build.md).
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

More in [How it works](../../../docs/HOW-IT-WORKS.md) and [the `swt` commands](../../../docs/CLI.md).

## Honest limits

- **Model answers cannot be replayed yet.** The engine is seeded, the models are not.
- **Small samples.** Most comparisons rest on 8-12 paired seeds; a claim is called firm only with its
  standard error. Several older series have 2-4 seeds.
- **Mostly one model.** Almost every resident is Claude Haiku; Sonnet and Opus played a few games each.
- **No ensembles yet.** Runs start one by one; a dataset export is planned.
- **Licence.** Source-available, not open source: free to run and change for research, not to host
  as a service. See the [licence FAQ](../../../LICENSE-FAQ.md).

## For builders

- [How it works](../../../docs/HOW-IT-WORKS.md) · [Architecture](../../../docs/ARCHITECTURE.md) · [Specification](../../../docs/SPEC.md) · [Models](../../../docs/MODELS.md)
- [The story format](../../../docs/STORY-FORMAT.md): write a story in TypeScript or YAML
- [Mechanic API](../../../docs/design/mechanic-api.md): write your own rules
- [What helps the residents](../../../docs/CROSS-GAME-FINDINGS.md): the cross-game paper
- [Lessons log](../../../docs/LESSONS-LEARNED.md): every problem and loophole, with its fix
- [The signed event log](../../../docs/design/event-log-signing.md) · [The run viewer](../../../docs/design/viewer-build.md)
- [From a run to a story](../../../docs/FROM-RUN-TO-STORY.md) · [Related work](../../../docs/RELATED-WORK.md)
- [Rules for contributors and agents](../../../CLAUDE.md)

## License

Source-available under the [Sustainable Use License](../../../LICENSE) with additional terms. The plugin
interface (`contracts`, `sdk`) and the log verifier and viewer core (`chain`, `viewer-core`) are
Apache 2.0. See the [license FAQ](../../../LICENSE-FAQ.md).
