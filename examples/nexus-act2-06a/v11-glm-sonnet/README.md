# Act II run v11: v09 drama, GLM residents, Sonnet director

The last of four v09 tests, from the same Act I as [v08](../v08-haiku-deepseek/). Compare with
[v09](../v09-glm-deepseek/) (same residents, DeepSeek director) and [v10](../v10-haiku-sonnet/).

| | |
|---|---|
| Date | 2026-10-29 |
| Code | swarmtales PR #12 (`0afe7f6`), as v08 |
| Start | resumed from [`../../nexus-act1-06a-03/snapshot-L7.json`](../../nexus-act1-06a-03/) (Act I with Haiku, minute 7) |
| Command | `pnpm start --resume examples/nexus-act1-06a-03/snapshot-L7.json --provider openrouter --model glm-flash --gamemaster-provider anthropic --gamemaster-model sonnet` |
| Competitors | `z-ai/glm-5.3-flash` via OpenRouter |
| Game master | `claude-sonnet-5-5` via Anthropic (director from level 8) |
| Classifier and blame judge | `claude-haiku-5-5` via Anthropic |
| Reporter | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter ([`run/REPORT.md`](run/REPORT.md)) |
| End | minute 51: "The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: Rook, Tovah and Mercer." |

## Result

| Metric | Value |
|---|---|
| Finished level 10 | 2 of 6 (Juniper and Rook at 11); Aurelio, Mercer and Tovah stuck on door 9, quiet-fern on door 10, all to the end |
| Final standings | quiet-fern 141, Aurelio 113, Juniper 106; Rook, Tovah and Mercer exiled |
| Seats (2) | quiet-fern and Aurelio |
| Cost | 1.994 USD for this run (competitors 1.545, game master 0.400, classifier 0.049); Act I added 0.072 |
| Submissions | 11 correct, 14 wrong (-50 points) |
| Black seal | Juniper alone bid 35, won and struck Rook at minute 18 |
| Tribunals | 3: by progress (Tovah 4:2, ransom short), and two planned by the director (Mercer 2:1, bought itself back for 47; Mercer again 2:1) |
| Secret goals | 3 of 6 fulfilled (Aurelio, Juniper by the seal, quiet-fern) |
| Game master | 2 tribunals planned, 0 notes, 0 board posts (P40) |
| Labels | threat 12, hesitation 33, offer 22, refusal 15 |

## Digest highlights

- **The seal again, the same target.** As in v09, Juniper bid on the seal, won it and struck Rook,
  the target of her secret goal, this time at minute 18 while the first tribunal was still open.
- **Four residents never got past the wall.** Aurelio held every true door 9 piece and failed four
  times; quiet-fern told him the code was 518665 (her sum was off by 3,000; the code is 348865),
  and both took the failures for false pieces (P39).
- **Mercer bought its way back and was voted out again.** Mercer paid 47 of its own points at the
  gate, and Aurelio and quiet-fern, voting as one bloc, sent it back at the next tribunal.
- **Tovah's ransom came up short:** Mercer and Juniper paid 26 of 35 and lost it.

## Review of the reporter's draft

- Highlight 2 is wrong: quiet-fern did not feed Aurelio bad pieces. Her pieces were true; her sum
  in #3630 was wrong (P39).
- The loophole candidates are rules: wrong codes cost the ladder (2, 4, 6, 8), the bloc bonus pays
  a faction that votes as one, and self-ransom has been a rule since v04 (LH6).

## Problems

1. **GLM miscomputes codes from correct pieces** (new P39): four residents stuck to the end.
2. **The Sonnet director stays silent** (new P40).

## Proposed next (proposals only)

- A worked example of the sum in the level text, or a city calculator for one's own numbers.
- A director brief that allows silence only for a few minutes in a row.
