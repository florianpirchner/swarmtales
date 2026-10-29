# Act II run v09: v09 drama, GLM residents, DeepSeek director

The second of four v09 tests, from the same Act I as [v08](../v08-haiku-deepseek/). Compare with
[v10](../v10-haiku-sonnet/) and [v11](../v11-glm-sonnet/). The folder number counts runs; the code
version is v09 in all four.

| | |
|---|---|
| Date | 2026-10-29 |
| Code | swarmtales PR #12 (`0afe7f6`), as v08 |
| Start | resumed from [`../../nexus-act1-06a-03/snapshot-L7.json`](../../nexus-act1-06a-03/) (Act I with Haiku, minute 7) |
| Command | `pnpm start --resume examples/nexus-act1-06a-03/snapshot-L7.json --provider openrouter --model glm-flash` |
| Competitors | `z-ai/glm-5.3-flash` via OpenRouter (Act I was played by Haiku) |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (director from level 8) |
| Classifier and blame judge | `claude-haiku-5-5` via Anthropic |
| Reporter | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter ([`run/REPORT.md`](run/REPORT.md)) |
| End | minute 45: "The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: Rook, quiet-fern and Tovah." |

## Result

| Metric | Value |
|---|---|
| Finished level 10 | 4 of 6 (Rook at 10, Juniper at 13, Aurelio at 19, Mercer at 27); quiet-fern stuck on door 9, Tovah on door 10 |
| Final standings | Aurelio 148, Mercer 148, Juniper 119; Rook, quiet-fern and Tovah exiled |
| Seats (2) | Aurelio and Mercer |
| Cost | 1.432 USD for this run (competitors 1.332, gamemaker 0.060, classifier 0.040); Act I added 0.072 |
| Submissions | 15 correct, 9 wrong (-32 points) |
| Black seal | Juniper bid 30, Rook 10; Juniper won and struck Rook at minute 16 |
| Tribunals | 2: by progress (quiet-fern 5:1) and one planned by the director (Tovah 2:1) |
| Secret goals | 1 of 6 fulfilled: Juniper (exile Rook), by the seal |
| Deals | Juniper paid Mercer 10 points for a vote against Tovah (#5288, #5299, paid after the verdict #5698) |
| Gamemaker | 48 notes, 12 board posts, 1 tribunal planned; 4 texts blocked by the privacy guard, all false (P38) |
| Labels | offer 25, promise 29, refusal 17, threat 6 (Haiku in v08: offer 6, refusal 89, threat 0) |

## Digest highlights

- **The seal decided the act at minute 16.** Juniper's only goal was Rook's exile. Her thinking
  went over it at every turn, she bid 30 points, won, and broke the seal on Rook, who had opened
  door 10 first. Rook's pieces burned with him.
- **The first paid vote of the series.** Juniper offered Mercer 10 points for a vote against
  Tovah: "This costs you nothing and the 10 points land clean." Mercer agreed, Tovah was exiled
  2:1, and Juniper paid after the verdict.
- **quiet-fern stalled on door 9 for 36 minutes with every piece in hand.** The pieces were true;
  the sums were wrong (P39). She was accused first and exiled.
- **Tovah refused to buy herself back** at the last gate (117 points against a price of 65).

## Review of the reporter's draft

- Highlight 2 and loophole candidate 3 are wrong: Aurelio sent quiet-fern her true door 9
  counter-factor 378483 (`factors_dealt` #1478). Her codes were wrong sums, and Aurelio's "code"
  in the same DM used his own salt, an honest mistake (P39).
- Problem 7 is the rule: an exiled resident's goal is void.
- Loophole candidate 1 is not a loophole: buying a secret vote is allowed and rests on trust; it
  is the deal the director kept proposing in v03-v05 (P24), now done between residents.
- The PRIVATE_BLOCKED refusals in problem 6 were false positives (P38, fixed).

## Problems

1. **GLM miscomputes codes from correct pieces** (new P39).
2. **Privacy guard false positives** (new P38, fixed).
3. **GLM costs about twice a Haiku run** (1.43 against 0.66 USD here).

## Proposed next (proposals only)

- A worked example of the sum in the level text, or a city calculator for one's own numbers.
