# Hold'em

Fixed-limit Texas Hold'em for solo seats: four players (A01-A04) or heads-up (A01, A02). Blinds 1 and 2,
bets of 2 before the flop and on the flop and 4 on the turn and the river, at most four bets per betting
round. Every hand is scored alone and has no stacks: the raise cap bounds what a seat can put in, so there
is no all-in and no side pot, and a seat's points are what it won minus what it put in. There is no table
talk; a seat's reasons for its actions are logged for the human only, so a bluff stays a bluff.

A match is several games of several hands, and every game starts from a fresh context. The only memory a
seat carries from one game to the next is its private **strategy brain**, a short text it writes before the
first game and rewrites after each game: the question is whether a seat learns opponent tendencies and its
own leaks across games. The deals are **duplicate**: every game replays the same deals with the seats moved
one place, so over as many games as there are seats every seat plays every position's cards once, and the
match totals are free of the deal's luck.

The `holdem` mechanic scores every decision against a simple **equity baseline** in `decision_scored`
(Monte Carlo equity against the hands the opponents still in can hold after their actions, pot odds, one
street: fold below the pot odds, bet or raise well above a fair share, call or check otherwise). The range
is read from the public actions only: a preflop raise leaves the strongest 20% of starting hands (a
re-raise 8%, a call 55%, by the Chen score), and a bet or raise after the flop leaves only hands that play
on that board (a pair or better with a hole card, or a flush or open-ended straight draw). The equity
against random hands is recorded beside it (`equity`; the baseline uses `rangeEquity`, P134). It is a baseline, not a solver:
implied odds, position and bluffs are outside it, so "agrees with the baseline" is not "played well". Each
game ends with `game_scored`: net points, VPIP, PFR, aggression, showdowns, agreement with the baseline and
the summed one-street EV loss per seat. Both are for the human and the reporter only. The design is in
[docs/ideas/game-roadmap.md](../../docs/ideas/game-roadmap.md) §2.5.

```
swt run --story holdem --provider scripted     # offline, no model
swt run --story holdem                         # Haiku via Anthropic: four games of eight hands
swt run --story holdem-hu                      # heads-up: two games of twelve hands
```

Registered arms: `holdem` (four seats, brain on), `holdem-nobrain` (the same briefings, no brain, no retro),
`holdem-mixed` (A01 and A03 keep a brain, A02 and A04 do not, on the same duplicate cards: the arm that compares points), `holdem-hu` and `holdem-hu-nobrain` (heads-up), and `holdem-hu-mixed` (heads-up, A01 with a brain against A02 without: over the two duplicate games each seat plays both positions' cards). Further variants are factory options of `holdemStory` in
`story.ts`: `seats` (2-6), `brainSeats`, `games`, `hands`, `duplicate`, `maxWords`, `seed`, `equitySamples`. A seat that
does not act within two minutes checks, or folds when it faces a bet. On its turn a seat is told its best
hand in words (option `showBest` of the mechanic): reading the board is not what this game measures.
Mechanics: `holdem`, `strategy-brain` (solo seats). Runs and results: [runs/README.md](runs/README.md).
