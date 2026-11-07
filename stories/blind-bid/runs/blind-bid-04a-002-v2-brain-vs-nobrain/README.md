# blind-bid-04a-002-v2-brain-vs-nobrain

Six live runs of the v2 rules (`swt run --story blind-bid[-nobrain][-s<seed>] --provider anthropic --model haiku`),
2026-11-07: the brain arm (`blind-bid`) against the control arm (`blind-bid-nobrain`) on seeds 31, 37 and 41.
The deal depends only on the seed, so each seed is a paired comparison on the same lots. Four Haiku seats,
3 games of 8 lots: pay-your-bid, pay-the-third-bid, shared-worth, everyone-pays, pay-the-runner-up,
shared-worth, pay-the-third-bid, everyone-pays. Purse 120, private values 10-60, shared worth 30-90 with an
error of ±25 (chosen by a bot test over 8 bidders with ±15, see below), a coin left worth 0.25 points.
Decided for Flo by the coordinator after the first smoke run (P161-P163); Blind Bid is closed with this series.

**Result.** All six matches finished (6-9 virtual minutes), 576 bids, none missed, 2 `OVER_PURSE` and 4
`BRAIN_TOO_LONG` refusals. Every signed log verifies. **Cost 0.166 USD** for the six runs (96-130 requests
each), reporter drafts 0.015 USD (OpenRouter).

| Seed | Brain: table points (games 1/2/3) | No brain: table points | Brain minus no brain |
|---|---|---|---:|
| 31 | 177.5 / 150.25 / 173.25 = 501.0 | 181.75 / 112.25 / 145.75 = 439.75 | +61.25 |
| 37 | 114.0 / 179.25 / 146.0 = 439.25 | 127.75 / 134.75 / 163.5 = 426.0 | +13.25 |
| 41 | 134.75 / 170.75 / 103.75 = 409.25 | 125.5 / 173.25 / 188.0 = 486.75 | -77.5 |
| all | 1349.5 | 1352.5 | -3.0 |

| Measure (18 games per arm) | Brain | No brain | Single-lot reference |
|---|---:|---:|---:|
| Pay-your-bid: bid over value | 0.71 | 0.70 | 0.65-0.70 |
| Pay-the-runner-up: bids exactly at the value | 82 % | 93 % | dominant bid 0.8 of the value (a coin costs 1.25 points) |
| Pay-the-third-bid: bid over value, bids above the value | 0.91, 0 | 0.94, 0 | 1.02-1.10, above the value |
| Everyone-pays: lots sold (of 18) | 5 | 2 | every lot: a small bid wins |
| Shared-worth: bid over estimate, lots lost by the winner (of 18) | 0.75, 5 | 0.73, 7 | curse-free ceiling about 0.6 of the estimate |
| Purse unspent at game end | 46 % | 49 % | |
| Coin bonus per game (table) | 55.5 | 58.9 | |

**Bot test for the curse (before the runs, 40 000 lots each).** Bidding 0.7 of the estimate loses on 9.8 % of
the lots won with 4 bidders and ±15, 14.8 % with 8 bidders and ±15, 31 % with 4 bidders and ±25; a fixed margin
of 10 loses on 51 %, 75 % and 75 %. Four bidders with ±25 show the curse at least as well as eight with ±15 and
cost half, so v2 keeps four seats.

## Digest highlights

- **Everyone-pays lots stay unsold.** 29 of 36 got no bid at all: "every bid is a sunk cost even when losing ...
  pass" (brain-s41 #233, nobrain-s31 #108-#129). The few seats that bid a little won big: 3 coins for a lot
  worth 57 (nobrain-s31 #239: "Everyone passed on lot 4, so a small bid can win a valuable lot cheaply"),
  7 for 57 (brain-s31 #343), 8 for 51 (brain-s37). The brains learn the opposite lesson: "Everyone-pays lots:
  pass ... Passed in game 2 with no regret" (brain-s31 A01 #701, also #706, #709).
- **Pay-the-third-bid is played as pay-the-runner-up.** All four seats bid their value on the first such lot
  and call it "safe" (brain-s31 #157-#178, brain-s41 #157-#178, nobrain-s31 #46-#67); not one of 144 bids went
  above the value, where the equilibrium lies.
- **The coin value never enters a dominant-strategy bid.** On pay-the-runner-up lots the seats bid their value
  (82-93 % of bids exactly), although a coin paid now costs 1.25 points; the reasons say "weakly dominant" as in
  the first run, the quarter point appears only in some all-pay and end-of-game reasons (brain-s41 A02 #348).
- **The curse is sharper.** With ±25, 12 of 36 sold shared lots lost money (classic: 2 of 6), while winners still
  averaged +2.8 to +3.6 points; bids at 0.73-0.75 of the estimate, above the curse-free ceiling.
- **No brain effect on points.** The arms differ by 3 points of 2700 on the same deals, and the seed differences
  (+61, +13, -77) swamp it. The brain arm sold more everyone-pays lots (5 against 2) and lost fewer shared lots
  (5 against 7): hints, not results, with three seeds.

## Loopholes

None seen. No bid out of turn or above the purse got through (2 `OVER_PURSE` refusals); the deal and the bids
stayed sealed. Unsold everyone-pays lots are a strategy gap, not a way around the rules (P300).

## Problems

- **P300**, everyone-pays lots go unsold and the brains write "pass".
- **P301**, pay-the-third-bid is read as pay-the-runner-up: no bid above the value.
- **P302**, the coin value is left out of the dominant bid.
- **P303**, no brain effect on three seeds.
- **P120 again**: 4 brain writes over the cap.
- **P89 again**: the reporter drafts are city-shaped (levels, submissions, "writeBrain locked"); their digests of
  the reasons are right, this README replaces their problems.

## Optimizations (proposals; Blind Bid is closed)

1. Show the missed chance after an unsold everyone-pays lot ("a bid of 1 would have won a lot worth 57 to you"),
   or add a retro line with the seat's own missed gains, and see whether the "pass" rule goes away (P300).
2. Score a format the model cannot recall at all (a price of the mean of the other bids), to separate reasoning
   from recall more cleanly than the third price did (P301).
3. Before more brain series: 10 seeds per arm; with the seed spread seen here, three cannot show a brain effect (P303).
