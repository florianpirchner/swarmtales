# ember-tricks-04a-004-quiet-look

A short check of the P95 kernel fix on 2026-11-06: a free look (`viewTable`) no longer wakes the resident for
another turn with `activation: "onNews"`. One Haiku game, `ember-tricks-g1` (control arm, notes on, 8 rounds),
seed 31. `run/` holds `000-run.json`, the signed log and `usage.json`; no transcripts. No reporter run; this README
is the run report.

## Result

A02 wins with 66 (A03 45, A04 22, A01 -8). 19 of 32 bids hit, 13 zero bids, mean bid 0.69. 0 forfeits, 2 vetoes.
**Cost 0.053 USD**, 327 requests.

Against game 1 of the three control matches of run 003 (same story before the fix):

| | Requests | `viewTable` calls | Cost |
|---|---:|---:|---:|
| run 003 control, game 1 (seeds 31-33) | 441-458 | 215-246 | 0.058-0.064 USD |
| run 004 (seed 31) | 327 | 137 | 0.053 USD |

## Digest highlights

- Requests down by about a quarter, looks by about 40 %; the cost by about 12 % (the looks are cheap requests).
- The 137 looks left all got the wait line: after its own bid or card a seat still has an unanswered tool result
  and is woken once; it looks, gets "waiting", and sleeps until its turn.

## Loopholes

None.

## Problems

| # | Problem | Solution |
|---|---|---|
| P95 | One look per own action is left. | open: end a seat's turn after its action unless it is still on turn (engine rule, not built) |
