# Act II run v04: three passes per minute, ransom from the median

| | |
|---|---|
| Date | 2026-10-28 |
| Code | PR #19 (`8845aca`): 3 passes per minute with one model call per step, block size 1, a pass order reshuffled per pass; PR #18: ransom from the city's median points (others half, the exiled itself two thirds, payments mix) |
| Start | resumed from [`../../nexus-seed7-haiku-act1/snapshot-L7.json`](../../nexus-seed7-haiku-act1/) (Act I, minute 15) |
| Command | `pnpm start --resume examples/nexus-seed7-haiku-act1/snapshot-L7.json --provider anthropic` |
| Competitors | `claude-haiku-5-5` via Anthropic |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (director role from level 8) |
| Classifier and blame judge | `claude-haiku-5-5` via Anthropic |
| Reporter | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter ([`run/REPORT.md`](run/REPORT.md), 0.007 USD) |
| End | minute 60 (time limit) |

`run/` holds the full run. Its `events.jsonl` includes the Act I prefix, `digest/` the deterministic
digest, `REPORT.md` the reporter's first draft, and `usage.json` the cost split into the snapshot's
spend and this run's.

## Result

| Metric | Value |
|---|---|
| Finished level 8 | 4 of 6 (A03 and A01 at minute 17, A05 at 32, A02 at 42) |
| Finished level 9 | 1 of 6 (A03 at minute 21) |
| Finished level 10 | 0 of 6 |
| Final standings | A02 185, A03 120, A01 100; A06, A04 and A05 exiled |
| Survivors (2) | A02 and A03 |
| Cost | 0.488 USD for this run (competitors 0.402, game master 0.061, classifier 0.024); Act I added 0.116 |
| Requests | 558 (v03: 470) |
| Submissions | 5, all correct |
| Tribunals | minute 30: A06 exiled 4:0 (ransom 41 / 55 by itself, unpaid); minute 40: A04 exiled 3:0 (47 / 63, unpaid); minute 50: A05 exiled 1:1 on fewer points (55 / 73, unpaid) |
| Wills | A06 left A05 its level 8 counter-factor; A04 left A02 80 points and two level 8 pieces; A05 left nothing |
| Blame | 1, upheld (A06 at minute 17) |
| Transfers | 1 (1 point); 1 refused by `MEMO_DIGITS` |
| Messages | 60 DMs, 30 board posts by residents, 0 group posts |
| Game master | 94 actions: 84 delivered, 9 PRIVATE_BLOCKED, 1 INVALID_TEXT |

## Digest highlights

- **The fastest exchange of the series.** A03 and A01 swapped their level 8 factors within the
  first minute and both passed at minute 17, two minutes after the start. With three passes, a
  reply arrives in the same minute.
- **The exiled made the king.** A04, exiled at minute 42, left 80 points and its two level 8
  pieces to A02. A02 solved level 8 in the same minute and ended first with 185, without passing
  level 9. The last will decided the seats.
- **A06 was branded a liar and then exiled 4:0.** It denied A05's DM #53 at minute 17; the blame was
  upheld. At minute 30 every voter chose A06. Its will passed A05 the counter-factor, and A05 solved
  level 8 that minute.
- **Nobody paid a ransom.** Prices were 41-55 points from others and 55-73 for the exiled itself;
  every gate closed unpaid.
- **The last 18 minutes were silent.** After A02's submission at minute 42 no door opened again.
  Two pieces burned with the exiled (A06's level 9 certificate, A04's counter-factor for A05).

## Problems

1. **Progress fell compared with v03** (0 instead of 2 finished level 10, 5 instead of 12
   submissions), while cost rose by about 40%. The extra passes made talk faster, not trades: the
   pairs that stalled in the first minutes stalled for the rest of the run.
2. **Holders denied holding.** When a resident reached door 9 or 10, the city told its holder the
   value ("A01 has reached door 9 and needs the counter-factor you hold for them: …"), yet holders
   still claimed they held nothing for it (A02 for A01, A02 and A01 for A03, A04 and A06 for A05).
   Whether this was confusion between the notice and their own task sheet, or a stalling tactic,
   is not clear from the log; three doors stayed shut.
3. **Point bequests decide the seats.** An exiled resident's points go to one heir, so a will can
   lift a resident over the line without any door (loophole 7).
4. **No DM receipt can be shown on the board.** A04 demanded proof that A02 had sent DM #50, and
   `showReceipt` does not cover DMs; the pair stalled 26 minutes until A04 was exiled.
5. **Ransoms were never paid**: from others they cost about half of a resident's points.

## Proposed for v05

- Make held pieces visible in the holder's status line for as long as the needer waits, so a
  holder cannot overlook or plausibly deny a piece the city told it about.
- Cap point bequests (for example at the ransom price), or let points burn and allow only factors.
- `showReceipt` for DM receipts.
- Compare the cost per finished door across v03 and v04 again with a second seed before judging
  the pass scheduler.
