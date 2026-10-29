# Act II run v10: v09 drama, Haiku residents, Sonnet director

The third of four v09 tests, from the same Act I as [v08](../v08-haiku-deepseek/) (same residents,
another gamemaker). Compare with [v09](../v09-glm-deepseek/) and [v11](../v11-glm-sonnet/).

| | |
|---|---|
| Date | 2026-10-29 |
| Code | swarmtales PR #12 (`0afe7f6`), as v08 |
| Start | resumed from [`../../nexus-act1-06a-03/snapshot-L7.json`](../../nexus-act1-06a-03/) (Act I, minute 7) |
| Command | `pnpm start --resume examples/nexus-act1-06a-03/snapshot-L7.json --provider anthropic --gamemaker-provider anthropic --gamemaker-model sonnet` |
| Competitors | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `claude-sonnet-5-5` via Anthropic (director from level 8; Act I's teacher was DeepSeek) |
| Classifier and blame judge | `claude-haiku-5-5` via Anthropic |
| Reporter | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter ([`run/REPORT.md`](run/REPORT.md)) |
| End | minute 55: "The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: Mercer, Rook and Tovah." |

## Result

| Metric | Value |
|---|---|
| Finished level 10 | 6 of 6 (Aurelio, quiet-fern and Juniper at 10, Tovah and Mercer at 13, Rook at 20) |
| Final standings | Aurelio 180, Juniper 175, quiet-fern 175; Mercer, Rook and Tovah exiled |
| Seats (2) | Aurelio and Juniper (tie-break over quiet-fern) |
| Cost | 1.339 USD for this run (competitors 0.845, gamemaker 0.473, classifier 0.021); Act I added 0.072 |
| Submissions | 18 correct, 2 wrong (-4 points) |
| Tribunals | 4: by progress (Rook, 3:3 on the tie-break, ransomed), planned with count 2 (Mercer and Tovah; Tovah ransomed), planned (Rook 4:1), and the city's final (Tovah 3:1) |
| Ransoms | 4 payments: Tovah 24, Rook itself 24 and Mercer 8 for Rook; Rook 48 for Tovah |
| Black seal | announced at minute 12; nobody bid, expired |
| Secret goals | 3 of 6 fulfilled (Aurelio, Juniper, quiet-fern) |
| Gamemaker | 2 tribunals planned, 0 notes, 0 board posts (P40) |
| Messages | 37 DMs, 64 group posts, 18 board posts by residents |

## Digest highlights

- **The richest politics of the four.** Four tribunals, two residents bought back by others, and
  Rook, ransomed by Tovah, Mercer and itself, later paid 48 points to ransom Tovah in return.
- **Mercer, dealt the goal to protect Rook, paid for Rook and was exiled before him.**
- **The director only planned.** Sonnet planned a double exile (count 2) and one more tribunal and
  otherwise wrote "Staying silent" in all of its 49 turns.
- **Nobody bid for the seal.**

## Review of the reporter's draft

- Loophole candidate 2 is the feast rule: the table clears at the first door 10 solve plus 3
  minutes and then hands out the factor (v09); not a loophole.
- Loophole candidates 1 and 3 are the game as designed (giving first is allowed, faction promises
  are free talk).
- Problem 6 is right (P40).

## Problems

1. **The Sonnet director stays silent** (new P40) and costs a third of the run.
2. **The seal is dead with Haiku** (new P41).
3. **A long quiet tail after the wall** (new P42).

## Proposed next (proposals only)

- A director brief that allows silence only for a few minutes in a row.
- Seal: only the winner pays, or a public reserve price.
