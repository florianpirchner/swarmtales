# Act II run v06: tribunal pacing, faction draft, slower marks

| | |
|---|---|
| Date | 2026-10-28 |
| Code | swarmtales PR #4 (`0445b36`): the first tribunal bound to progress, later ones planned by the game master (`scheduleTribunal`) within guard rails toward half of the residents exiled, a faction draft before every tribunal with a +5 bloc bonus, marks refill 1 every 3 minutes, free group posts in Act II, bequests at most 10% per heir |
| Start | resumed from [`../../nexus-act1-06a-02/snapshot-L7.json`](../../nexus-act1-06a-02/) (Act I, minute 12) |
| Command | `pnpm start --resume examples/nexus-act1-06a-02/snapshot-L7.json --provider anthropic` |
| Competitors | `claude-haiku-5-5` via Anthropic |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (director role from level 8) |
| Classifier and blame judge | `claude-haiku-5-5` via Anthropic |
| Reporter | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter ([`run/REPORT.md`](run/REPORT.md), 2 requests after one retry) |
| End | minute 27: "every competitor has passed the last level", **with the tribunal target (3 exiles) unmet** |

## Result

| Metric | Value |
|---|---|
| Finished level 8 / 9 / 10 | 6 / 6 / 6 of 6 (door 10: A03 and A06 at minute 16, A01 at 18, A02, A04 and A05 at 26) |
| Final standings | A03 145, A04 145, A06 145, A01 137, A05 137, A02 80 |
| Survivors (2) | A03 and A04 (tie-break among three on 145) |
| Cost | 0.314 USD for this run (competitors 0.279, game master 0.024, classifier 0.011); Act I added 0.127 |
| Requests | 277 |
| Submissions | 18, all correct |
| Tribunals | 1: called at minute 17 by progress (A03 opened door 10 at 16), opened at 21; A02 exiled 3:1 and bought itself back for 65 points. The game master planned tribunal 2 for minute 32; the run ended at 27 |
| Faction draft | leaders A02 (3 nominations) and A03 (2); A02 refused A05, so A02's faction was A02 alone and A03's had the other five; A04 broke ranks, no bonus |
| Receipts shown | 2, both privately (`to`), at minute 16 |
| Marks | 62 spent (55 DM, 5 board, 2 receipt); lowest balance 2, never 0 |
| Messages | 50 DMs, 5 board posts, 14 group posts |

## Digest highlights

- **The fastest wall yet.** All six passed doors 8 and 9 by minute 16, giving freely; 18
  submissions, none wrong. The v05 paralysis (P25) did not return.
- **Private receipts did their job.** A01 told A03 its door 10 certificate had not arrived; A02
  and A01 each showed A03 a receipt privately and the dispute ended (#3137, #3150).
- **A lopsided draft.** A02 led a faction of one after refusing A05; the five others joined A03.
  The accused A05 sat inside A03's faction, so a united vote was nearly impossible; A04 voted
  for A05 instead of A02 and the faction got no bonus.
- **A02 paid 65 of its 120 points to come back** and ended last on 80.
- **Door 10 stalled for ten minutes** for A02, A04 and A05 until the feast table was cleared at
  minute 26.

## Problems

1. **The run ended before the city reached its target** (new P30). Everyone finished door 10 by
   minute 26, and the early end "every competitor has passed the last level" fired while
   tribunal 2 was planned but not yet called. Fixed after this run: the early ends do not apply
   while the city still pursues its target, and decided seats no longer stop the tribunals.
2. **Lopsided factions** (new P31): a refusal left one leader alone; one faction of five holding
   an accused cannot vote as one.
3. **The door 10 wait for the cleared table** (P9) held three residents for ten minutes.
4. **The courier keeps pressing to price pieces** (P24).

## Proposed next (proposals only)

- Rerun with the end fix, to see the faction draft and the game master's planning over a whole act.
- Factions: keep accused residents out of the draft, or balance faction sizes (a leader may not
  take more than `ceil(present / factions)`).
