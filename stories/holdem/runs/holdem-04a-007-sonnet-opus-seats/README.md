# holdem-04a-007-sonnet-opus-seats

2026-11-11/12. Stronger models at a Haiku table, with the equity baseline as the objective reference:
`holdem-nobrain` (no brain, no aid) on seeds 71-74, the same duplicate deals as the first four tables of
[holdem-04a-006-decision-aid](../holdem-04a-006-decision-aid/). A01 is Claude Sonnet, A03 Claude Opus, A02
and A04 Claude Haiku, all via Anthropic (`--resident-model A01=anthropic/claude-sonnet-5-5 --resident-model
A03=anthropic/claude-opus-5-5`). Over the four duplicate games every seat plays every position's cards, so
the match totals are free of the deal's luck. Folders `holdem-nobrain-s<seed>/run/`, each with the
reporter's first draft `REPORT.md`.

All four tables finished all 32 hands (640-854 requests a table); one 429 error and one missed decision (s71,
P431). Every signed log verifies. **Cost 6.165 USD** (Sonnet 2.823, Opus 2.923, Haiku 0.419), plus about
0.02 USD of reporter drafts.

## Result

| Seat (4 tables, 16 games) | Net points per game | EV loss per decision | Calls without the odds | Folds facing a bet | VPIP | Agreement with the baseline |
|---|---:|---:|---:|---:|---:|---:|
| Opus (A03) | **+11.0** | 0.11 | 5.9 % | 39 % | 0.58 | 0.72 |
| Sonnet (A01) | +4.9 | 0.14 | 11.8 % | 32 % | 0.56 | 0.70 |
| Haiku (A02, A04) | -8.0 | 0.28 | 19.0 % | 22 % | 0.73 | 0.65 |
| Haiku with the aid (006, 96 games) | +2.1 against Haiku | **0.03** | 1.9 % | 52 % | 0.41 | 0.83 |

Final points: s71 Opus +45, Sonnet +23, Haiku -15 / -53; s72 Sonnet +23, Haiku +23 / -36, Opus -10; s73 Opus
+99, Haiku -2 / -76, Sonnet -21; s74 Sonnet +54, Opus +42, Haiku -46 / -50. Paired by game against the mean
of the two Haiku seats: **Opus +19.0 per game (SE 8.1, ahead in 12 of 16), Sonnet +12.9 (SE 8.1, ahead in
11 of 16).**

**Stronger models win the points; the aid wins the reference.** Opus and Sonnet lose half as much EV per
decision as Haiku and take about 10-19 points a game from it. Haiku with the aid follows the baseline four
times more closely than Opus does, and still gains only about 2 points a game.

## Digest highlights

- **Opus bets where the baseline would check.** "Button steal: only the blinds are left, and suited cards keep
  some playability" (s71 #342, equity 0.24), "C-bet on a dry ace-high board after both checked. It costs 2 to
  win 12, and the ace fits the preflop raiser's range" (s71 #899, equity 0.19): the one-street baseline
  counts these as losses, and they are where Opus's points come from (fold equity, which the baseline does not
  model).
- **Sonnet sits between Haiku and Opus** in every column, as in chess (P326) and unlike liar's dice, where it
  was worse than Haiku (P421).
- **The cost per point**: Opus and Sonnet cost about 0.7 USD per seat and match here, Haiku 0.05.

## Loopholes

None.

## Problems

- **P438**: in Hold'em the equity baseline ranks Haiku with the aid above Opus, while Opus wins far more
  points: the baseline is a decision-quality reference for calls and folds, not a strength reference (it has
  no fold equity).

## Optimizations (proposals, not built)

1. Score bets and raises with fold equity (the chance the opponents' ranges fold to a bet), so the reference
   ranks bluffs and steals.
2. An aided Haiku seat at an Opus table, to see whether the aid closes part of the gap.
