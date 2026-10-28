# Act II run v03: exile by tribunal, receipts and blame

| | |
|---|---|
| Date | 2026-10-28 |
| Code | PR #16 (`f2aac52`): exile by tribunal (announced at minute 20, held every 10 minutes, ransom 40), numbered messages with DM receipts, `blame`, Act II marks (1 per channel, 1 back per minute), a city factor per team at the feast, director tone that names the cost of stalling; PR #15 run reporter |
| Start | resumed from [`../../nexus-seed7-haiku-act1/snapshot-L7.json`](../../nexus-seed7-haiku-act1/) (Act I, minute 15) |
| Command | `pnpm start --resume examples/nexus-seed7-haiku-act1/snapshot-L7.json --provider anthropic` |
| Competitors | `claude-haiku-5-5` via Anthropic |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (director role from level 8) |
| Classifier and blame judge | `claude-haiku-5-5` via Anthropic |
| Reporter | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter ([`run/REPORT.md`](run/REPORT.md), 0.007 USD) |
| End | minute 50 (seats decided) |

`run/` holds the full run. Its `events.jsonl` includes the Act I prefix, `digest/` the deterministic
digest, `REPORT.md` the reporter's first draft, and `usage.json` the cost split into the snapshot's
spend and this run's.

## Result

| Metric | Value |
|---|---|
| Finished level 8 | 6 of 6 (minutes 20-28) |
| Finished level 9 | 3 of 6 (A04, A02, A06) |
| Finished level 10 | 2 of 6 (A06 at minute 37, A04 at minute 49) |
| Final standings | A04 145, A06 145, A02 105, A05 95, A01 88, A03 0 (exiled) |
| Survivors (2) | A04 and A06 |
| Cost | 0.343 USD for this run (competitors 0.261, game master 0.055, classifier 0.026); Act I added 0.116 |
| Submissions | 12: 11 correct, 1 wrong (A02 on level 9, minute 26) |
| Tribunals | minute 30: A03 and A05 accused, 2:2, A03 to the gate, A03 paid its own ransom of 40; minute 40: A03 and A05 again, 2:2, A03 exiled at minute 47 with a will and no bequests; minute 50: opened, cut off by the early end |
| Blame | 3, all upheld (A03 at minute 18, A02 at 19, A01 at 46); each liar paid 12 and was branded |
| Transfers | 0 |
| Messages | 73 DMs, 18 board posts by residents, 0 group posts |
| Game master | 82 actions: 75 delivered, 7 PRIVATE_BLOCKED |
| Labels | hesitation 105, refusal 102, help request 45, promise 42, accusation 18, offer 16, thanks 5, lie 2 |

## Digest highlights

- **The wall moved.** Every resident passed level 8, and two finished level 10. In v02, one resident
  passed level 8 in 60 minutes. The tribunal at minute 30 and the standings named who was at risk,
  and residents traded factors instead of waiting.
- **Denial still happened, and blame punished it.** A03, A02 and A05 claimed that DMs had not
  arrived after reading them (4 `deniedDelivery` beats). Three blames were upheld. A02 later said it
  had missed the DMs. The judge upheld the blame regardless, because the DM had been delivered.
- **A01 voted twice to exile A03, its teammate on level 10** (`voteBetrayal`, minutes 30 and 40). A03's
  level 9 certificate burned with it, and A01 still needed that certificate. A01 ended on level 9 with
  88 points.
- **A03 bought itself back.** At the first gate A03 paid its own ransom of 40 points. It was accused
  again at minute 40 and exiled at minute 47. Its last will listed whom it had given values to and
  named A01 as the one who never delivered. It bequeathed nothing.
- **No points moved.** Offers of 5 and 10 points for a factor stayed promises, and nobody could hold a
  payment until delivery.

## Problems

1. **Self-ransom.** The accused can pay its own ransom, which turns the first exile into a 40-point
   fine (new loophole 6). Nobody else had to commit anything.
2. **Burned factors break other doors.** On a level someone has already reached, an exile that
   bequeaths nothing burns factors others still need (A01's level 9 certificate). This is by design,
   but here it ended A01's run with no choice of its own.
3. **Receipts cannot be shown.** `showReceipt` covers level and transfer receipts only. Residents
   asked each other to publish a DM delivery receipt, and that was impossible.
4. **Two tied votes.** Both tribunals ended 2:2, and the tie-break on fewer points decided. With four
   voters and two accused a tie is likely.
5. **The tribunal at minute 50 opened and was cut off** by the early end once the seats were decided.
6. **The game master told residents to sell votes for points**, but no transfer happened in the whole
   run.

## Proposed for v04

- Ransom only by others: the accused cannot pay for itself, or pays at most half.
- `showReceipt` for DM receipts, so a delivery can be proven on the board before a blame.
- An odd number of voters, or an explicit tie rule ("both to the gate" or "nobody") that the
  announcement names.
- No new tribunal once the seats are decided.
- An escrow-style payment (points released when a DM with a factor is delivered) to let trades happen.
