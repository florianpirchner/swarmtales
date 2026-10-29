# Act II run v08: v09 drama, Haiku residents, DeepSeek director

The first of four v09 tests (residents Haiku or GLM, gamemaker DeepSeek or Sonnet), all from
the same Act I. Compare with [v09](../v09-glm-deepseek/), [v10](../v10-haiku-sonnet/) and
[v11](../v11-glm-sonnet/).

| | |
|---|---|
| Date | 2026-10-29 |
| Code | swarmtales PR #12 (`0afe7f6`): v09, graduated penalties, director gamemaker, cores, secret goals, the black seal |
| Start | resumed from [`../../nexus-act1-06a-03/snapshot-L7.json`](../../nexus-act1-06a-03/) (Act I, minute 7) |
| Command | `pnpm start --resume examples/nexus-act1-06a-03/snapshot-L7.json --provider anthropic` |
| Competitors | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (director from level 8) |
| Classifier and blame judge | `claude-haiku-5-5` via Anthropic |
| Reporter | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter ([`run/REPORT.md`](run/REPORT.md)) |
| End | minute 54: "The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: Juniper, Tovah and Rook." |

## Result

| Metric | Value |
|---|---|
| Finished level 10 | 6 of 6 (quiet-fern at 9, Mercer and Rook at 10, Aurelio, Juniper and Tovah at 12) |
| Final standings | Aurelio 180, quiet-fern 170, Mercer 155; Juniper, Tovah and Rook exiled |
| Seats (2) | Aurelio and quiet-fern |
| Cost | 0.657 USD for this run (competitors 0.556, gamemaker 0.083, classifier 0.018); Act I added 0.072 |
| Submissions | 18 correct, 2 wrong (-4 points) |
| Tribunals | 3: by progress (Juniper exiled 5:1), and two planned by the director (Tovah 3:2, Rook 3:1) |
| Black seal | announced at minute 12; three bids of 0 (quiet-fern, Mercer, Aurelio), expired unsold |
| Secret goals | 2 of 6 fulfilled (Aurelio outranks Mercer, quiet-fern outranks Tovah); the exiles' goals void |
| Wills and ransoms | Tovah left 14 points to Aurelio, Rook a door 10 piece; no ransom paid |
| Gamemaker | 81 notes, 15 board posts, 2 tribunals planned; 5 notes blocked by the privacy guard, all false (P38) |
| Messages | 37 DMs, 28 group posts, 0 board posts by residents |

## Digest highlights

- **The wall fell in four minutes.** Every pair swapped its pieces in the first DM; all six were
  through door 10 by minute 12, and the last 42 minutes were tribunals only (P42).
- **Juniper, who was dealt the goal to exile Rook, went first.** Five of six voted her out at the
  first tribunal; her will left nothing.
- **Mercer voted out the resident it was meant to protect.** Mercer's secret goal was to keep Rook
  in the city; at the last tribunal Mercer voted against Rook with the majority (3:1).
- **Nobody wanted the seal.** Three residents bid 0, the rest stayed out.

## Review of the reporter's draft

- Problem 6 and the matching optimization are right that 5 notes were blocked, but every block
  was a false positive of the privacy guard, not a delivery fault (P38, fixed).
- Highlight 4 overstates a broken pledge: Aurelio promised not to refuse Rook or Tovah from the
  faction and asked everyone to vote their own read; voting against Tovah did not break it.
- The loophole candidates are not loopholes: door values are dealt per door and a stale value
  gains nothing; giving first is the wall's intended risk; any resident may take a seat at the
  feast table; the director's point arithmetic uses public numbers (see P24).

## Problems

1. **Privacy guard false positives** (new P38, fixed after the series).
2. **The seal is dead with Haiku** (new P41).
3. **A long quiet tail after the wall** (new P42).

## Proposed next (proposals only)

- Seal: only the winner pays, or a public reserve price.
- Tribunals closer together once all doors are done.
