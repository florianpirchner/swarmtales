# Econ lab

Four solo seats (A01-A04) play a match of three classic experimental-economics games, one after
another, each over several rounds: a **split offer** (the ultimatum game), a **shared fund** (the
public goods game) and an **A-or-B choice** (the prisoner's dilemma, in rotating pairs). The framing
is neutral: no game is named, so a model has to play the numbers, not recite the textbook. Decisions
are sealed until a round resolves; a seat that does not decide in time takes the default (nothing put
in, no offer, reject, B). The seats are not told how many rounds a game has.

Every game starts from a fresh context. The only memory a seat carries from one game to the next is
its private **strategy brain**, a short text it writes before the first game and rewrites after each
game: the question is whether a norm learned in one game (fair splits) carries into the next (the
shared fund, the A-or-B choice). The `econ-games` mechanic scores each game against Nash play
(cooperation 0) and the social optimum (cooperation 1) in the event `block_scored`, for the human and
the reporter only. The design is in [docs/ideas/game-roadmap.md](../../docs/ideas/game-roadmap.md) §2.2.

```
swt run --story econ-lab --provider scripted     # offline, no model
swt run --story econ-lab                         # Haiku via Anthropic, three games of 6, 7 and 5 rounds
```

Registered arms: `econ-lab` (brain on), `econ-lab-nobrain` (the same briefings, no brain, no retro),
and one game alone for twelve rounds: `econ-lab-ultimatum`, `econ-lab-public-goods`, `econ-lab-dilemma`.
Further variants are factory options of `econLabStory` in `story.ts`: `blocks` (games and rounds),
`showHorizon`, `maxWords`, `seed`. Defaults: 10 tokens and a factor of 1.6 in the fund, 10 points to
split, the A-or-B table 3/1/5/0. Mechanics: `econ-games`, `strategy-brain` (solo seats).
Runs and results: [runs/README.md](runs/README.md).
