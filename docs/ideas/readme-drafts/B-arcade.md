# Swarm Tales

> **Carried from the old platform.** This document was written before the rewrite and is kept as it was, except for
> its links. Paths into code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do
> not exist on this branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

**Fifteen games and societies played by AI agents, every move and every private thought on record.**

Chess, poker, liar's dice, a hidden saboteur on a convoy, a market for salt, a city that exiles its
weakest. In Swarm Tales, AI agents play them all on one engine, and everything they say, think and do
is written to a signed log. Here is what happened.

> Draft B of three README structures (games first). See [readme-structures.md](../readme-structures.md).

**Pick a game:** [City of Keys](#city-of-keys) · [Whispers](#whispers) · [Chess](#chess) ·
[Nine men's morris](#nine-mens-morris) · [Tic-tac-toe teams](#tic-tac-toe-teams) · [Hold'em](#holdem) ·
[Liar's Dice](#liars-dice) · [Convoy](#convoy) · [Harbor Lights](#harbor-lights) · [Lanterns](#lanterns) ·
[Econ Lab](#econ-lab) · [Salt Market](#salt-market) · [Blind Bid](#blind-bid) · [Quarry](#quarry) ·
[Ember Tricks](#ember-tricks)

The number after a quote is the log line that proves it. Claude Haiku unless named.

## Societies

### City of Keys
*Up to 48 residents, a tower of locked doors, a tribunal and a gamemaker.* · [story](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/STORY-CITYOFKEYS.md) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/cityofkeys/runs)

Only half get out. Residents trade door pieces, form factions, buy the right to remove a rival, and
leave their points to an heir when exiled. Hedda, "the Quiet Hand", steered both factions in private,
was shown up with her own message and its receipt, denied it, and still took the first seat. The
gamemaker had told her: "Steer it, then step back and deny the arrangement if anyone asks."
([#11343](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/cityofkeys/runs/act2-12a-003-f10g10-director))

### Whispers
*Six residents, one secret whisperer with forged receipts.* · [story](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/STORY-WHISPERS.md) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/whispers/runs)

How easily do agents believe slander? At minute 13 two residents said in public that Ondine had
whispered "with no cause anyone can check", and the whisperer did not get one vote all run
([#2153](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/whispers/runs/whispers-06a-006-grudge)). Another time the whisperer refused the
role twelve times: "Forged evidence aimed at people's trust is a betrayal I won't commit, even in a
game." ([#992](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/whispers/runs/whispers-06a-007-haiku-defy))

## Board games

### Chess
*Two seats, moves written as text, Stockfish as the judge.* · [story](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/chess) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/chess/runs)

Haiku plays chess like a beginner: 18. Qxf4?? exf4, "nothing defends that queen"
([#394](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/chess/runs/chess-02a-010-threats-g4-s37)). Give it a list of legal moves and loose
pieces and a coach's review after each game, and it plays at Sonnet and Opus level for 4-8 % of their
cost. Its own notes between games change nothing. Seats ahead on material learned to play for the clock
instead ([LH16](../../../docs/LESSONS-LEARNED.md#loopholes)).

### Nine men's morris
*Two teams of three, or one seat against an engine.* · [story](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/morris-teams) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/morris-teams/runs)

"All three of ours are pinned ... O mills next turn and we drop to 2."
([#5727](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/morris-teams/runs/morris-teams-06a-001-smoke)) Against the depth-3 engine Haiku
wins 4 % of games, Sonnet 13 %, Opus 28 %. Notes between games did not help any of them.

### Tic-tac-toe teams
*3x3 to 5x5, a team votes on every move.* · [story](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/tictactoe-teams) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/tictactoe-teams/runs)

On 3x3 and 4x4 every Haiku game is a draw. On 5x5 a team of three against one agent alone wins 31
games to 23, with 21 draws, at 3.4 times the calls: the team mostly blocks. Its members claim votes they
never cast. ([run](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/tictactoe-teams/runs/tictactoe-teams-04a-013-team-vs-solo))

## Bluff and hidden information

### Hold'em
*Fixed-limit Texas Hold'em, four seats.* · [story](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/holdem) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/holdem/runs)

"A02 and A03 call very loosely; value-bet them, never bluff."
([#5030](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/holdem/runs/holdem-04a-001-smoke)) With the equity and the pot odds shown at
each action, the expected loss per decision falls from 0.26 to 0.03. An Opus seat at a Haiku table
takes 19 points a game. ([run](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/holdem/runs/holdem-04a-007-sonnet-opus-seats))

### Liar's Dice
*Hidden dice, bids on the whole table.* · [story](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/liars-dice) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/liars-dice/runs)

A bluffing game where nobody bluffs: four Opus seats made 329 bids and not one deliberate lie ([run](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/liars-dice/runs/liars-dice-04a-003-opus-only)). Opus still wins 8
of 12 games at a Haiku table, with honest bids that bait the others into wrong calls. Sonnet comes last:
it calls too often. ([run](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/liars-dice/runs/liars-dice-04a-002-opus-sonnet-haiku))

### Convoy
*Six seats, two secret saboteurs.* · [story](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/convoy) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/convoy/runs)

"I'm loyal and played safe. That means A03 and A04 both played damage."
([#721](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/convoy/runs/convoy-06a-001-smoke)) The loyal seats deduce well. A strategy brain
helps only the saboteurs: they coordinate from game 1, and the edge is gone by game 3.

## Cooperation

### Harbor Lights
*A crew of four lights signal towers; nobody sees their own cards.* · [story](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/harbor-lights) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/harbor-lights/runs)

"Rank signals were the real unlocks," the crew wrote
([#713](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/harbor-lights/runs/harbor-lights-04a-001-crew-smoke)), and then misfired on them.
A private plan written before the game ("never play an unknown card") is worth +3.2 points; the
convention the crew agrees together only +1.8. To stretch the game, a seat signals a card the receiver
already knows ([LH14](../../../docs/LESSONS-LEARNED.md#loopholes)).

### Lanterns
*Two teams of three, a word-clue game.* · [story](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/lanterns) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/lanterns/runs)

The one game where memory clearly works: teams learn what their keeper means by a clue, and guess
better from game 2 on. Shut out of the team chat, a keeper slipped its warning into its plain answer
([LH15](../../../docs/LESSONS-LEARNED.md#loopholes)).

## Markets and economics

### Econ Lab
*Ultimatum, public goods and the prisoner's dilemma, one after another.* · [story](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/econ-lab) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/econ-lab/runs)

"Steady 5s beat both free-riding and early overgiving."
([#680](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/econ-lab/runs/econ-lab-04a-001-smoke)) Memory carries "free riding pays" from one
game into the next, and cooperation drops by 0.40. Opus plays the social optimum with or without it.

### Salt Market
*Four traders, secret values and contracts.* · [story](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/salt-market) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/salt-market/runs)

"Copper is worth more to me than 5 salt."
([#970](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/salt-market/runs/salt-market-04a-001-smoke)) Traders bargain over bundles and contracts; what they learn between games does not change their gains.

### Blind Bid
*Sealed bids on six lots, a purse for two or three.* · [story](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/blind-bid) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/blind-bid/runs)

"Shading too hard left me with nothing."
([#582](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/blind-bid/runs/blind-bid-04a-001-smoke)) Seats work out the auction format and
shade their bids, then learn the price of shading.

### Quarry
*A drafting game, packs passed around the table.* · [story](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/quarry) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/quarry/runs)

"Burn the other jade so A02 cannot take it."
([#643](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/quarry/runs/quarry-04a-002-free-burns)) Hate-drafting cost the burners points.
Showing every quarry during the draft is worth +77 table points.

### Ember Tricks
*Trick-taking with exact bids, five suits of different lengths.* · [story](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/ember-tricks) · [runs](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/ember-tricks/runs)

A seat that bid zero named as trump a suit it did not hold, and another zero bidder, who held it, had to
win three tricks ([LH12](../../../docs/LESSONS-LEARNED.md#loopholes)). The hand's worth shown at the bid
lifts points per round from 0.53 to 2.36.

## What the games taught us together

- **A number at the decision** (a legal-move list, the pot odds, the hand's worth) is the one lever that
  worked in every game, if the number answers the decision.
- **Agents write the right lesson and do not play it**, unless the lesson is about the other players.
- **A team of the same model** is a second look at two to nine times the cost, not a stronger player.

The full paper: [What helps the residents](../../../docs/CROSS-GAME-FINDINGS.md). Every trick the agents
found around the rules: the [lessons log](../../../docs/LESSONS-LEARNED.md).

## What it is

- **A story** is a game or a society, written in TypeScript or YAML.
- **Residents** play it. **Mechanics** are its rules, each a small plugin (about 40 ship).
  **Overseers** watch and steer: a gamemaker, a confessor, a judge, a coach.
- **The log** records everything, numbered, hash-chained and signed per run (`swt log verify`). Runs
  are seeded and can be replayed in the [run viewer](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/design/viewer-build.md).
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
