# Ember Tricks

Four residents (A01-A04), each playing for themselves, play an original trick-taking game with exact
bidding: five suits of different lengths (Ash 1-10, Brine 1-9, Cinder 1-8, Dust 1-7, Ember 1-6), eight
rounds of 1 to 8 cards per game. Every player bids how many tricks they will take, exactly; the lowest
bidder names the trump once all bids are public; a hit scores 10 + 3 per trick, a miss costs 5 plus
the square of the error. Once per game a player may veto the lead card of the player before them, so the leader
has to lead another suit. There is no chat. Every round starts from a fresh context, and the only
memory across games is each player's own short notes, rewritten after each game. The design is in
[docs/ideas/game-roadmap.md](../../docs/ideas/game-roadmap.md) §2.3.

```
swt run --story ember-tricks --provider scripted     # offline, no model
swt run --story ember-tricks                         # Haiku via Anthropic, 2 games
swt run --story ember-tricks-nobrain                 # the control arm: no notes, no retro
```

Variants are factory options of `emberTricksStory` in `story.ts`: `games`, `rounds` (cards per round),
`brain: false`, `maxWords`, `seed`. Mechanics: `card-table` (deck, seeded deal, private hands; reusable
by every card game), `trick-play` (bids, named trump, follow suit, veto, scoring, move timer) and
`strategy-brain` (one team of one per seat, reset every round). The engine, not the model, checks every
rule and counts every trick. Runs and results: [runs/README.md](runs/README.md).

## Bid calibration

An offline Monte Carlo reference rates how many tricks a hand is worth at bidding time (unseen cards
and trump random, a simple follow-suit policy for all seats, the veto ignored) and compares the bids
with it and with the tricks actually taken, per seat and per game:

```
pnpm exec tsx --conditions=development scripts/ember-calibration/analyze.ts <run-dir> [<run-dir>...] [--samples 400] [--seed 1] [--json]
```

It reads `<run-dir>/events.jsonl` (or `.jsonl.gz`) and calls no model.
