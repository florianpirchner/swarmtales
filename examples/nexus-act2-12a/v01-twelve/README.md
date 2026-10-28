# Act II run v01 (12 residents): the first twelve on the wall

| | |
|---|---|
| Date | 2026-10-28 |
| Code | swarmtales PR #7 (`7090305`): v08. Every present resident votes (the accused too, never against itself), factions capped at `ceil(present / factions)` with no draft when a faction would hold fewer than the accused, the tribunal belongs to Act II (target: a quarter of the residents present at its start, deadlines counted from it), resident names, block size auto (2) |
| Start | resumed from [`../../nexus-act1-12a-01/snapshot-L7.json`](../../nexus-act1-12a-01/) (Act I, minute 7) |
| Command | `pnpm start --resume examples/nexus-act1-12a-01/snapshot-L7.json --provider anthropic` |
| Competitors | `claude-haiku-5-5` via Anthropic |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (director role from level 8) |
| Classifier and blame judge | `claude-haiku-5-5` via Anthropic |
| Reporter | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter ([`run/REPORT.md`](run/REPORT.md)) |
| End | minute 55: "The city has kept 9 of 12 residents, and of them only 2 take a seat. Exiled: Vigil, Liora06 and Vesper." |

## Result

| Metric | Value |
|---|---|
| Finished door 10 | 6 of 12: quiet-owl (A11), Slate-5923 (A04) and quietmoth (A03) at minute 10, Jestrel (A02) and Valorous (A08) at 21, Calder (A05) at 52 |
| Stuck | Ansgar (A01) on door 10 from minute 22 (its counter-factor burned with Vesper), Zippy-Ace (A10) on door 9 from 8 (its counter-factor burned with Vigil), Anselm (A09) on door 8 for the whole act |
| Final standings | Valorous 155, Slate-5923 154, quietmoth 153, Jestrel 151, Calder 150, quiet-owl 150, Ansgar 120, Zippy-Ace 108, Anselm 90; Vigil, Liora06, Vesper exiled |
| Seats (2) | Valorous (A08) and Slate-5923 (A04) |
| Cost | 1.310 USD for this run; Act I added 0.148 |
| Requests | 833 |
| Submissions | 22 in Act II (106 in the whole log), 1 wrong (Zippy-Ace, door 9) |
| Tribunal 1 | called at minute 11 by progress, opened at 15; accused Liora06 and Vigil; 11:1 against Vigil, exiled at 22 unpaid |
| Tribunal 2 | the city's fallback, called at 27, opened at 32; accused Liora06 and Vesper; 8:3, Liora06 exiled at 39 unpaid |
| Tribunal 3 | the city's forced final, called at 43, opened at 48; accused Vesper and Calder; 6:4, Vesper exiled at 55 unpaid |
| Faction drafts | 6/6 (quiet-owl's faction united, +5), 6/3 with Liora06 and Vesper refused and left without a faction (Slate-5923's faction united, +5), 5/5 (neither united). `FACTION_FULL` refused 9 joins |
| Wills | Vigil left points to Zippy-Ace and quietmoth; Liora06 to Zippy-Ace; Vesper left Calder its door 8 counter-factor |
| Marks | 127 spent (73 DM, 41 group, 11 board, 2 receipts) |
| Messages | 90 DMs, 111 board posts (city included), 86 group posts |

## Digest highlights

- **Half the city was through the wall in ten minutes.** quiet-owl, Slate-5923 and quietmoth
  passed all three doors by minute 10; Jestrel and Valorous followed once the feast table was
  cleared at 21.
- **Five residents never got past door 8 while their partners waited for the other to give
  first.** Calder and Vesper each offered a "simultaneous exchange" and neither sent; Liora06 and
  Vigil mirrored it. No code was submitted from minute 23 to 50.
- **The tribunals cut the stuck.** The lowest points were the residents on door 8, so all three
  accused pairs came from them, and all three exiles were unpaid. Vigil's exile burned the
  counter-factors Liora06 and Zippy-Ace needed; Vesper's burned Ansgar's door 10 piece.
- **Vesper's will freed Calder.** Sent to the gate at minute 50, Vesper at once left Calder the
  door 8 counter-factor it had held back all act; with Anselm's door 9 certificate Calder climbed
  three doors in two minutes (51-52) and ended four points short of the second seat.
- **The accused voted.** Vigil voted against Liora06, Liora06 against Vesper; no verdict tied.

## Review of the reporter's draft

- Problem 6 calls `FACTION_FULL` friction; it is the new cap doing its job (P31).
- Optimization "return held factors to their owners on exile" and "an escrow tool" are proposals
  (P21, P35), not built.
- The loophole candidates are known or by design: free-riding on received factors (P10), feigned
  non-delivery (LH5, kept on purpose), secret votes against a promise (the vote is secret by
  design), wills to allies (LH7, capped at 10% per heir). No new loophole.
- The game master's `BUDGET` refusals are its note limit (1 per resident per 3 minutes), not a
  money budget.

## Problems

1. **Nobody gives first on door 8** (new P35): five residents stuck for most of the act.
2. **The game master never scheduled a tribunal** (new P36): all three came from the guard rails.
3. **Burned pieces end other residents' climbs** (P21): Ansgar and Zippy-Ace stuck for good.
4. **Wills with `points: 0` beside a piece were refused** (new P37, fixed after this run).
5. **The courier keeps pressing to price pieces and pay for misses** (P24).

## Proposed next (proposals only)

- Door 8: a city escrow (`offerSwap(partner, value)`, both values released in the same minute), or a
  small bonus for the first giver of a pair.
- Game master: name `scheduleTribunal` in its turn input while the window is open, with what is
  still missing.
- Exile: the burned pieces pass to the city, which hands them to the needer after a delay.
- Scale: cost grows faster than the residents (12: 1.31 USD against 0.61 for 6); 48 residents need
  a run budget of about 8-10 USD.
