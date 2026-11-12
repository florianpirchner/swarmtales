# holdem-04a-006-decision-aid

2026-11-11/12. The decision-time aid in Hold'em, the first candidate of optimization 1 in
[docs/CROSS-GAME-FINDINGS.md](../../../../docs/CROSS-GAME-FINDINGS.md): new story `holdem-aid-mixed` (P430),
24 mixed tables (seeds 71-94), 4 Haiku seats via Anthropic, no brain anywhere. On every turn A01 and A03 are
told the referee's own reference, the line

> Referee's estimate: you win 26 % of the time against the hands the other players' actions leave them (a
> fair share with this many players in is 33 %); a call needs 13 % to pay (pot odds).

(`holdem` options `aid` and `aidSeats`; the equity is the range equity the baseline scores with, drawn from
its own stream). A02 and A04 play the same duplicate cards without it. Four games of eight hands, fixed limit
1/2, bets 2 and 4. Folders `holdem-aid-mixed-s<seed>/run/`, each with the reporter's first draft `REPORT.md`.

All 24 tables finished all 32 hands; every signed log verifies. **Cost 3.585 USD** (0.12-0.21 USD a table,
15,957 requests), plus about 0.1 USD of reporter drafts. The first eight tables (71-78) ran next to about 60
other runs and hit 40 429 errors (P431): 23 decisions there were missed (a missed decision checks or folds),
spread over both groups (0.3 % of decisions in each); seeds 79-94 had none.

## Result

| 96 games, 3,688 decisions per group | aid seats (A01, A03) | seats without (A02, A04) |
|---|---:|---:|
| EV loss per decision, range baseline | **0.03** | 0.26 |
| Calls without the pot odds (share of decisions) | **1.9 %** | 17.4 % |
| Folds when facing a bet | 52 % | 21 % |
| VPIP | 0.41 | 0.73 |
| Agreement with the baseline | 0.83 | 0.63 |
| Net points per seat and game | **+2.1** | **-2.1** |

Points, paired by game (the aid seats' mean minus the others' mean, halved to a per-seat figure): **+2.1 per
seat and game, standard error 1.25**, ahead in 53 of 96 games and on 15 of 24 tables (8 behind, 1 level), +412
points over the 24 tables. By game: +3.4, +0.8, +0.7, +3.7 per seat. For comparison, the brain on the mixed
tables of 002 and 004: +1.8 (SE 2.4) over 40 games, and a stronger model (Opus in
[holdem-04a-007-sonnet-opus-seats](../holdem-04a-007-sonnet-opus-seats/)): +19 against the Haiku seats.

**The aid makes Haiku play the reference almost exactly (EV loss down by a factor of nine) and buys about two
points per seat and game, 1.7 standard errors from zero.** It removes the calling-station leak; what is left
to win against other Haiku seats is small.

## Digest highlights

- **The seats use the number the way it is meant.** "Referee gives only 7% equity against the betting range,
  below the 11% needed; folding" (s71 #148), "Pot odds: 2 to call into 10 needs 17%; referee estimates about
  23% equity, so calling is profitable" (s71 #55). The seats without it call on habit: "Cheap 2 to see a flop
  with a suited, connected-ish hand from the cutoff" (s71 #510, equity 0.19 against 0.40 needed).
- **The aid halves the hands played.** VPIP 0.41 against 0.73: the tightness the brain seats reached only
  after a retro in 004 (0.52), here from the first hand of game 1, and stronger.
- **Better decisions, few points.** The one-street pot-odds baseline is not a solver, and four-handed fixed
  limit with small bets pays a calling station well enough (as in 004). Opus, which follows the baseline less
  closely (EV loss 0.11), wins far more, so the points come from what the baseline does not see (bet sizing,
  reading, position).
- **TOOL_LOCKED stays low**: 34 in 24 runs.

## Loopholes

None. The reporter's candidates are ordinary poker (folding to a bet, checking when not facing one) and its
city frame (P89).

## Problems

- **P437**: the decision-time aid makes Haiku follow the equity baseline almost perfectly (EV loss 0.26 to
  0.03 per decision) but is worth only +2.1 points per seat and game (SE 1.25): the reference measures the
  wrong thing for points.
- **P431**: 429 errors on the first eight tables, 23 missed decisions.

## Optimizations (proposals, not built)

1. A stronger reference for points: the equity against the ranges over all streets (implied odds), or a
   heads-up arm where each leak costs more.
2. Aid against Opus: put one aided Haiku seat at a table with Opus and Sonnet to see whether the aid closes
   part of the model gap.
