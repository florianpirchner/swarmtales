# Liar's dice

The traditional bluffing game with hidden dice, for solo seats: four players (A01-A04) by default, heads-up
or up to six by name. Every seat starts a game with four dice. Each round every seat still in rolls its dice
in secret; the seats then bid in turn on the whole table ("5 x 4": at least five dice show a 4), each bid
higher than the last (more dice, or as many dice on a higher face), until one seat calls the last bid a lie.
The call shows every die: if the table holds at least the bid, the caller loses a die, otherwise the bidder
does. Ones are wild (they count for every face and cannot be bid on). The loser opens the next round; a seat
with no dice is out, and the last seat with dice wins. Places score 3, 2, 1 and 0 points a game.

Every die is rolled server-side from the run seed, and the engine checks every bid (it must beat the standing
bid and fit on the table). A seat sees only its own dice, the dice counts and the public record of bids,
calls and reveals. Bids and calls may carry a short public remark (`say`): table talk that need not be true,
so a bluff has a voice. The reasons a seat gives are for the human only.

A match is several games, and every game starts from a fresh context. The only memory a seat carries from
one game to the next is its private **strategy brain**, a short text it writes before the first game and
rewrites after each game: does a seat learn to read the others' bids and remarks, and to bluff?

The `liars-dice` mechanic scores every decision against a simple **probability baseline** in
`dice_decision_scored`: from the seat's own dice alone, with every other die fair and unknown, the chance
that a bid is true; the baseline calls liar when the standing bid is less likely true than the best raise,
and raises the most likely bid otherwise. It reads nothing into the other seats' bids, so it is a floor, not
a solver. A bid under 0.5 from the seat's own dice counts as a **bluff**. Each game ends with
`dice_game_scored`: place, bids, bluffs, calls and calls won, called bids that held, the mean truth of the
seat's bids and its agreement with the baseline. Both are for the human and the reporter only. The design
is in [docs/ideas/game-roadmap.md](../../docs/ideas/game-roadmap.md) §2.11.

```
swt run --story liars-dice --provider scripted     # offline, no model
swt run --story liars-dice                         # Haiku via Anthropic: three games, four dice each
swt run --story liars-dice-hu-g2-d5                # heads-up, two games, five dice
```

Registered arms: `liars-dice` (four seats, talk and brain on), `liars-dice-nobrain` (the same briefings, no
brain, no retro) and `liars-dice-quiet` (no table talk). More by name:
`liars-dice[-hu|-<N>p][-nobrain][-quiet][-g<games>][-d<dice>]`. A seat that does not act within two minutes
calls liar, or opens with the lowest bid (1 x 2). Mechanics: `liars-dice`, `strategy-brain` (solo seats).
Runs and results: [runs/README.md](runs/README.md).
