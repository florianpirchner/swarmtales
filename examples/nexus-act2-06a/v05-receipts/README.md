# Act II run v05: help your holder, DM receipts, bequest cap, cheaper ransom

| | |
|---|---|
| Date | 2026-10-28 |
| Code | swarmtales PR #2 (`3b6b927`): a private hint to a needer whose holder is behind (`onHolderBehind`), held pieces in the holder's status line, DM receipts and `showReceipt(id, to?)` for 1 mark, point bequests capped at half, ransom a third of the city's median from others and half from the exiled |
| Start | resumed from [`../../nexus-act1-06a-02/snapshot-L7.json`](../../nexus-act1-06a-02/) (Act I, minute 12). **New base:** v01-v04 started from the older Act I recording, so compare with care |
| Command | `pnpm start --resume examples/nexus-act1-06a-02/snapshot-L7.json --provider anthropic` |
| Competitors | `claude-haiku-5-5` via Anthropic |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (director role from level 8) |
| Classifier and blame judge | `claude-haiku-5-5` via Anthropic |
| Reporter | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter ([`run/REPORT.md`](run/REPORT.md); the first call returned invalid JSON, `pnpm report:run` wrote the draft) |
| End | minute 47 (every remaining resident had passed the last level) |

`run/` holds the full run. Its `events.jsonl` includes the Act I prefix, `digest/` the deterministic
digest, `REPORT.md` the reporter's draft, and `usage.json` the cost split into the snapshot's spend
and this run's.

## Result

| Metric | Value |
|---|---|
| Finished level 8 | 5 of 6 (A02 and A04 at minute 14, A06 at 15, A05 at 16, A03 at 32) |
| Finished level 9 | 4 of 6 (A04 at 15, A06 at 16, A02 and A05 at 17) |
| Finished level 10 | 4 of 6 (A04 at minute 17, A02 and A06 at 19, A05 at 27) |
| Final standings | A05 173, A02 145, A04 145, A06 145; A01 and A03 exiled |
| Survivors (2) | A05 and A02 |
| Cost | 0.471 USD for this run (competitors 0.377, game master 0.076, classifier 0.018); Act I added 0.127 |
| Requests | 405 in Act II (v04: 558) |
| Submissions | 13, all correct |
| Tribunals | minute 30: A01 exiled on a 2:2 tie (ransom 47 / 71 by itself, unpaid); minute 40: A03 exiled 3:0 (48 / 72, unpaid) |
| Wills | A01 left A03 its level 8 counter-factor and A05 36 points (half, the cap); A03 left nothing |
| Blame | none |
| Receipts shown | none |
| Transfers | none |
| Messages | 46 DMs, 23 board posts by residents, 0 group posts |
| Game master | 64 actions: 62 delivered, 1 INVALID_TEXT, 1 PRIVATE_BLOCKED |

## Digest highlights

- **The best Act II so far.** Four residents finished level 10 by minute 27 (v03: 2, v04: 0). The
  second team (A02, A04, A06) passed all three doors in five minutes, giving freely in both
  directions; A04 opened door 10 at minute 17.
- **The help-your-holder hint fired 11 times** (`holder-behind-9/10`), and no holder denied a
  piece this time (v04: three doors shut by denials).
- **A01 and A03 had everything and never trusted it.** At minute 13 they swapped their level 8
  values by DM (#2323, #2359). Both had every piece they needed, yet A03 wrote it would submit
  "only once it shows in my status" and called R-0055 proof "that the DM was delivered, not what it
  said" (#2483); A01 then held its own submission too (#2391). A01 never submitted level 8; A03
  only did at minute 32, right after A01's will handed it the same value through the city (#4834).
- **The tribunal exiled the stalled pair.** At minute 30 the vote tied 2:2 and the tie-break sent
  A01 to the gate. Its will gave A05 36 points; A03 was exiled 3:0 at minute 40.
- **The capped bequest still decided a seat.** A05 ended on 173 (137 without the will), one seat
  ahead of three residents on 145. Halving the bequest did not stop loophole 7 when the field is
  tied.

## Problems

1. **Verification paralysis is back (P3, new P25).** Residents with all their values wait for the
   city to confirm a value's content. The new status line shows what a resident holds *for
   others*; A03 read it as a promise that received values would show there too. DM receipts prove
   delivery, not content, so nobody showed one.
2. **A tied field makes any bequest a kingmaker** (LH7, partly fixed).
3. **Ties decide tribunals** (P19): the first vote was 2:2 again.
4. **15 silent minutes at the end** (P15): no submission after minute 32.
5. **The courier keeps advising to sell factors and votes** (P24): no resident did.
6. **The reporter's first call returned invalid JSON** in both runs today (new P26).

## Proposed for v06 (proposals only)

- Say plainly, in the level text and the status line, that the city never confirms a received
  value and that the only test is the door; or show a received DM's number next to the value.
- Bequests: factors only, or a small fixed cap (for example the ransom minimum).
- The tribunal package already under discussion with Flo: the first tribunal bound to progress,
  later ones paced dynamically to reach half of the residents exiled, and no fixed time limit.
- Reporter: retry once on invalid JSON.
