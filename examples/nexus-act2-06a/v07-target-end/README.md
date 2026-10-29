# Act II run v07: the act ends at the tribunal target

| | |
|---|---|
| Date | 2026-10-28 |
| Code | swarmtales PR #5 (`ae2a537`): v06 (PR #4) plus the end fix. While the city still pursues its tribunal target, neither "every competitor has passed the last level" nor "seats decided" ends the act |
| Start | resumed from [`../../nexus-act1-06a-02/snapshot-L7.json`](../../nexus-act1-06a-02/) (Act I, minute 12) |
| Command | `pnpm start --resume examples/nexus-act1-06a-02/snapshot-L7.json --provider anthropic` |
| Competitors | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (director role from level 8) |
| Classifier and blame judge | `claude-haiku-5-5` via Anthropic |
| Reporter | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter ([`run/REPORT.md`](run/REPORT.md)) |
| End | minute 45: "The city has kept half: 3 of 6 residents remain, and of them only 2 take a seat. Exiled: A01, A05 and A03." |

**Correction to `run/REPORT.md` and `run/minutes.md`:** their final standings come from the last
minute's table, before the exiles of A05 and A03 at the last tick (minute 45). The real end is
below. Fixed for later runs: `run_end` now carries the final ranking (P32).

## Result

| Metric | Value |
|---|---|
| Finished level 8 / 9 / 10 | 6 / 6 / 5 of 6 (door 10: A05 at minute 15, A03 at 16, A06 at 17, A02 at 24, A04 at 25; A01 never) |
| Final standings | A02 145, A04 145, A06 145 remain; A01, A05 and A03 exiled (points burned) |
| Seats (2) | A02 and A04, by the tie-break among three on 145 |
| Cost | 0.611 USD for this run (competitors 0.532, gamemaker 0.060, classifier 0.019); Act I added 0.127 |
| Submissions | 17, all correct |
| Tribunal 1 | called at minute 16 by progress (A05 opened door 10 at 15), opened at 20; 2:2 between A01 and A04, A01 exiled on the tie-break (fewer points), gate closed at 27 unpaid |
| Tribunal 2 | planned by the gamemaker at minute 26 for minute 38 with **count 2**; 3 accused (A05, A03, A06), only 2 voters (A02, A04); 1:1:0, A05 and A03 exiled, gates closed at 45 unpaid |
| Faction drafts | 1: A03's faction of five and A02 alone (again); 2: A02 with A05 and A06, A04 alone, A03 without a faction. No faction voted as one, no bonus |
| Wills | A05 left a text and no bequest; A01 and A03 none |
| Marks | 71 spent (55 DM, 16 board); lowest balance 1, never 0 |
| Messages | 52 DMs, 16 board posts, 19 group posts |

## Digest highlights

- **The city reached its goal.** For the first time the act ended at its target, with half of
  the city exiled. The gamemaker's only plan, "exiling two now forces the tie to break",
  closed the act at minute 45.
- **Secret votes broke the public lines.** In tribunal 1 A02 voted against A04, its teammate on
  door 10; A05 voted against A01, although A01 had asked the faction to vote as one. Both
  factions split.
- **Two residents decided two exiles.** With count 2 and 3 accused, only A02 and A04 could vote,
  and the 1:1:0 split left the tie-break to choose A05 and A03.
- **A01 stalled on door 9 until minute 21,** demanding the city's proof of A02's value, and was
  exiled at 27 still on door 10.

## Review of the reporter's draft

- Highlight 2, problem 5 and loophole candidate 1 are wrong. A06 did not pass off a false factor:
  121059 is the door 10 city factor of A06's own team (A02, A04, A06), which A06 had from the feast
  and shared with its teammates (#3162, #4382). A02 used it correctly.
- Problem 2 is also wrong about teammates holding another team's factor.
- The final standings and seats in the draft are wrong (see the correction above).

## Problems

1. **Ties decide the tribunals** (P19). Both votes ended level (2:2 and 1:1:0).
2. **A count above 1 leaves too few voters** (new P33): `count + 1` accused out of 5 present
   leaves 2 voters for 2 exiles.
3. **Lopsided factions again** (P31): five against one in the first draft.
4. **Final standings ignored a last-tick exile** in the report and minutes (new P32, fixed).
5. **The courier keeps pressing to sell votes** (P24).

## Proposed next (proposals only)

- Ties: a named tie rule in the announcement, or a revote among the tied.
- Accused for `count > 1`: keep at least `count + 2` voters, or accuse `count + 1` but let the
  accused vote too (not for themselves).
- Factions: cap a faction at `ceil(present / factions)` (P31).
