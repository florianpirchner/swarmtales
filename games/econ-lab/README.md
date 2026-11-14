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
| `experiments/`, `noise-floor.legacy.json` | the experiment specifications and the noise floor of the old platform |

## Variants

The id is always `econ-lab`; a variant is a set of options of `econLabGame`, not a name.

| Option | Default | Meaning | Old name |
|---|---|---|---|
| `blocks` | split offer 6, shared fund 7, A-or-B 5 | the games of the match in order, with their rounds | one game for twelve rounds: `econ-lab-ultimatum`, `econ-lab-public-goods`, `econ-lab-dilemma` |
| `brain` | true | false is the control arm: the same briefings without the brain paragraph, no brain, no retro | `econ-lab-nobrain` |
| `showHorizon` | false | the seats are told how many rounds a game has | |
| `maxWords` | 150 | the size of a brain | |
| `seed` | 23 | the seed of the run | |
| `ticks` | 60 | the length of the run: an upper bound from the rounds; the match ends the run earlier | |

## Runs

The runs of the old platform are readable at the tag
[`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/econ-lab/runs) under
`stories/econ-lab/runs/`.
