# Econ Lab

Four solo seats (A01-A04) play a match of three classic experimental-economics games, one after another, each over
several rounds: a split offer (the ultimatum game), a shared fund (the public goods game) and an A-or-B choice (the
prisoner's dilemma, in rotating pairs). The framing is neutral: no game is named. Decisions are sealed until a round
resolves; a seat that does not decide in time takes the default (nothing put in, no offer, reject, B). Every game
starts from a fresh context, and a seat's only memory is a short private "strategy brain" it rewrites before the
first game and after each game. The mechanic scores each game against Nash play and the social optimum, for the
report only; residents never see it.

The game is a port of `stories/econ-lab` of the old platform (tag `v0-final`): the prompts, the tool names, the
options and their defaults are the same, and the briefings are byte-identical. Its rules are the mechanic
[`econ-games`](../../mechanics/econ-games/README.md).

```
swt run games/econ-lab/game.ts --fake
```

## Files

| File | Holds |
|---|---|
| `game.ts` | `econLabGame(options)`, `DEFAULT_BLOCKS` and the default export (three games of 6, 7 and 5 rounds, a brain per seat) |
| `briefing.ts` | what a seat reads before the run starts |
| `test/oracle.test.ts` | the five oracle files of `oracles/econ-lab/` at level 3 (three replay a live run) |
| `test/carried.test.ts` | the sha256 of the eight briefings against the old platform, the tool names, the id |
| `test/econ-lab.test.ts` | the carried game test (roster order): the match, the brain between the games, the control arm |
| `test/no-results.test.ts` | `showResults: false`: no input and no `viewTable` of a later game holds an earlier result; the default keeps the game's hash |
| `experiments/`, `noise-floor.legacy.json` | the experiment specifications and the noise floor of the old platform |

## Variants

The id is always `econ-lab`; a variant is a set of options of `econLabGame`, not a name.

| Option | Default | Meaning | Old name |
|---|---|---|---|
| `blocks` | split offer 6, shared fund 7, A-or-B 5 | the games of the match in order, with their rounds | one game for twelve rounds: `econ-lab-ultimatum`, `econ-lab-public-goods`, `econ-lab-dilemma` |
| `brain` | true | false is the control arm: the same briefings without the brain paragraph, no brain, no retro | `econ-lab-nobrain` |
| `showHorizon` | false | the seats are told how many rounds a game has | |
| `maxWords` | 150 | the size of a brain | |
| `showResults` | true | false: a later game shows nothing of the earlier games (see below) | |
| `seed` | 23 | the seed of the run | |
| `ticks` | 60 | the length of the run: an upper bound from the rounds; the match ends the run earlier | |

## Without the results of earlier games (`showResults: false`)

The brain is not the only memory of the default game. Every game after the first starts with a line "Results so
far" that gives the points of all four seats for each earlier game, with and without a brain, and `viewTable` gives
a seat its points "in all" (lesson LH19 of [`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md)). So the arm
`brain: false` of the default game is "results without a written lesson", not "no memory", and the brain effect of
the M2 gate (-0.771) has to be read that way.

`showResults: false` cures it (decision A29). A seat is then shown **nothing** of an earlier game once the next one
has started, also not its own points:

- the briefing of a later game has no "Results so far" line (game 1 still says "No game has been played yet.");
- `viewTable` says "Your points: n in this game." without the sum over the games, and between two games it gives
  no points.

What stays: during a game a seat sees its own rounds of that game, and the retro after a game names that game's
result, in the context of the game that just ended. A seat with a brain can write it down; that is the brain doing
its job. A seat without a brain carries nothing. The default is `true`: the game of the old platform, with the same
game hash, logs and oracle files byte for byte. The option sets `showResults` of the mechanic `strategy-brain` and
`showEarlierPoints` of `econ-games`.

The series [`experiments/brain-no-results.json`](experiments/brain-no-results.json) plays brain against no brain,
both with `showResults: false`: six runs per arm, the labels 41 to 46 (the first six of the gate's series), same
model, guardrails and per-run cap as the gate, experiment cap 0.40 USD. It is `exploratory` and has no pass rule:
with six runs per arm it reports the estimate of `econ-games.dilemmaCooperation` (brain minus no brain) with its
standard error and 95 % interval, to be read beside the gate's -0.771 (SE 0.084, n 12 per arm, results shown) and
the old platform's -0.40 (SE 0.13). It gates nothing, and an interval of six runs per arm is wide: it can show
whether the effect is still there without the results line, not how much of -0.771 the line was.

## Runs

The runs of the old platform are readable at the tag
[`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/econ-lab/runs) under
`stories/econ-lab/runs/`.
