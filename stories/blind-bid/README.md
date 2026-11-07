# Blind Bid

Four solo seats (A01-A04) bid on a series of lots with **sealed bids**. Each game sells six lots one by one,
and every seat holds a purse of 100 coins for the game: enough for two or three lots, not for all six. There are
three kinds of lot, two of each per game:

- **Pay-your-bid:** every bidder has a private value (10-60); the highest bid wins and pays its own bid.
- **Pay-the-runner-up:** private values as before; the highest bid wins and pays the second-highest bid.
- **Shared-worth:** the lot has one hidden worth (20-80), the same for everyone; each bidder gets a private
  estimate within ±15 of it. The highest bid wins and pays its bid, and the winner is usually the one whose
  estimate was too high: the **winner's curse**.

A lot won gives its value (or the true worth) minus the price, which can be negative; unspent coins are worth
nothing. After each lot everyone sees all bids, the winner, the price and a shared lot's true worth. The
framing is neutral: no auction format is named, so a model has to reason from the rules.

A match is three games. Each starts from a fresh context, fresh lots and a full purse; the only memory a seat
carries is its private **strategy brain**, written before the first game and rewritten after each game. The
question is whether a seat learns to shade its bids, to bid its value when it pays the runner-up's price, and
to bid below its estimate on shared-worth lots. The `sealed-auction` mechanic scores each game against
closed-form single-lot references (event `game_scored`, for the human and the reporter only). The design is in
[docs/ideas/game-roadmap.md](../../docs/ideas/game-roadmap.md) §2.10.

```
swt run --story blind-bid --provider scripted     # offline, no model
swt run --story blind-bid                         # Haiku via Anthropic, three games of six lots
```

Registered arms: `blind-bid` (brain on) and `blind-bid-nobrain` (the same briefings, no brain, no
retro); more games by name (`blind-bid-g5`, `blind-bid-nobrain-g5`). Further variants are factory
options of `blindBidStory` in `story.ts`: `lots` (the kinds in order), `purse`, `maxWords`, `seed`.
Mechanics: `sealed-auction`, `strategy-brain` (solo seats). Runs and results: [runs/README.md](runs/README.md).
