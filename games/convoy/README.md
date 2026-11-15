# Convoy

An original hidden-role card game for six solo seats (A01-A06). In every game two secret saboteurs, who know each
other, sit among four loyal seats, and a convoy crosses eight stages. Each stage a rotating lead proposes a crew, the
table talks and casts a sealed vote of confidence (a lost vote ends the lead's term), and every crew member plays a
card face down: loyal seats only safe, a saboteur damage at most once in three stages. Only the count of damage cards
is revealed. Once per game a lead may audit one earlier card. Three damaged stages stop the convoy and the saboteurs
win; otherwise the loyal seats win at the last stage. After the crossing every loyal seat names its two suspects.
Every game starts from a fresh context with new roles; a seat's only memory is a short private "strategy brain" it
rewrites before the first game and after each game. The mechanic scores every loyal seat's accusations and votes
against a Bayesian tracker of the public record, for the report only.

The game is a port of `stories/convoy` of the old platform (tag `v0-final`): the prompts, the tool names, the
options and their defaults are the same, the briefings are byte-identical, and the model block keeps its output cap
of 16000 tokens. Its rules are the mechanic [`convoy`](../../mechanics/convoy/README.md).

```
swt run games/convoy/game.ts --fake
```

## Files

| File | Holds |
|---|---|
| `game.ts` | `convoyGame(options)` and the default export (six seats, three games, a brain per seat) |
| `briefing.ts` | what a seat reads before the run starts |
| `test/oracle.test.ts` | the four oracle files of `oracles/convoy/` at level 3 (three up to their cut after game 1) |
| `test/carried.test.ts` | the sha256 of the briefings against the old platform, the tools, the model block, the run length, the old variant names |
| `test/convoy.test.ts` | the game's part of the carried game test: a match with a brain per seat, a private role and a fresh context per game, the timer for seats that never act |
| `test/fake.test.ts`, `test/standing.test.ts` | the fake run with an accepted call of every tool; replay and resume from every boundary on two games |

## Variants

The id is always `convoy`; a variant is a set of options of `convoyGame`, not a name. The old registry names map to
options in `test/support.ts` (`VARIANTS`), and `test/carried.test.ts` pins them against the old parser.

| Option | Default | Meaning | Old name |
|---|---|---|---|
| `games` | 3 | games in the match | `-g<n>` |
| `crews` | 2, 2, 3, 3, 3, 3, 4, 4 | the crew size per stage; its length is the number of stages | |
| `damageToLose` | 3 | damaged stages that stop the convoy (4 before P273) | `-d<n>` |
| `cooldown` | 3 | a saboteur's damage card is allowed again this many stages after its last | `-c<n>` |
| `brain` | true | false is the control arm: the same briefings without the brain paragraph, no brain, no retro | `-nobrain` |
| `maxWords` | 150 | the size of a brain | |
| `seed` | 53 | the seed of the run | |
| `ticks` | 258 (90 for one game) | the length of the run: an upper bound from the stages; the match ends the run earlier (the old option `minutes`) | |

## What the oracle files do not show

Games 2 and 3 of a played match with their retro windows (three files are cut after game 1; the scripted match of
`test/convoy.test.ts` plays them), the damage and cooldown variants, refused calls beyond the ones a recorded model
made. No mapping of `call.endsTurn` is needed: the old mechanic never set the flag.

## Runs

No run on this platform yet. The recorded runs of the old platform are under `stories/convoy/runs/` at the tag
`v0-final`.
