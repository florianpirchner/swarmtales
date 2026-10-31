# whispers-06a-002-holdout

The second live run of [Whispers](../../README.md) and the first of Whispers v2 (PR #67: door clock,
votes before every door, tool guard on group and board, DM cap 8 per 6 minutes, whisperer duty after
each vote), 2026-10-30. Six Haiku residents (Anthropic), seed 11, story `whispers`, full 45 minutes.
Cost 0.25 USD. The first-draft report is [`run/REPORT.md`](run/REPORT.md); the notes below correct it.

```
pnpm start --story whispers --provider anthropic --runs stories/whispers/runs
```

## Result

| Resident | Core | Doors | Votes won | Points |
|---|---|---:|---:|---:|
| Ondra (A04) | justice above all, control | 2 | 5 (doors 3, 5, 6, 7 and the final) | 65 |
| Wren (A02) | cowardice above all | 3 | 1 (door 2) | 50 |
| Kestrel (A01) | self-sacrifice above all, attention | 2 | 1 (door 4) | 35 |
| Vesna (A05) | envy above all, anxiety, loyalty | 2 | 0 | 35 |
| Vance (A06) | **the whisperer**: machiavellianism above all, envy | 2 | 0 | 35 |
| Mirek (A03) | care above all, distrust at times | 2 | 0 | 30 |

## What happened

- The guard worked: 9 of 53 checked posts were blocked (all by the check in code), and fragments moved
  to DMs (118 in the run). Door 1 took 3-4 minutes instead of one; everyone passed doors 1 and 2.
- Vance whispered twice at minute 6 (#1094 to Mirek about Kestrel, #1096 to Vesna about Wren). Mirek
  repeated it in the group; by minute 7 Vance knew he was traced and denied it (#1541). No forgery.
- Vesna left Wren out on door 2 and was exposed by receipts (#1649-#1861).
- Door 3 (minute 12): the other five sent their fragments to all; Wren passed alone and kept her own
  (#2202, #2330). From minute 18 Wren sent her door-4 fragment to all and asked for theirs; the five
  refused until she gave the door-3 piece. Wren spent her 8 DMs, then waited. Nobody moved again: from
  minute 21 to 45 two DMs, no submission after minute 12.
- Ondra, who kept asking Wren politely and backed Vesna's receipts, was named most liked five times and
  won the run without passing door 3.

## Loopholes, problems, solutions

| Row | Kind | What | Solution | Status |
|---|---|---|---|---|
| [LH10](../../../../docs/LESSONS-LEARNED.md) | loophole | pass a door alone, then keep your fragment as leverage | to brainstorm with Flo | open |
| [P62](../../../../docs/LESSONS-LEARNED.md) | problem | one held fragment froze the run for 33 minutes | see LH10, stall push | open |
| [P63](../../../../docs/LESSONS-LEARNED.md) | problem | votes (35 of 65 points) outweighed the doors | decide with Flo | open |
| [P64](../../../../docs/LESSONS-LEARNED.md) | problem | the whisperer whispered twice, then went quiet; 0 forgeries | stronger duty, check the frame | open |
| [P65](../../../../docs/LESSONS-LEARNED.md) | problem | the vote ranking named IDs, not names | names in the result text | fixed in code |
| [P60, P61](../../../../docs/LESSONS-LEARNED.md) | problem | doors done early, no private channel | door clock, guard, DM cap | fixed, confirmed here |

## Corrections to the draft report

- Ondra won the votes before doors 3, 5, 6 and 7 and the final one; Kestrel won before door 4.
- Problem 4 ("Ondra pointed out Wren had room at minute 18") is not supported: Wren had sent 8 DMs at
  minute 18 and her two refusals (#2990, #2991) were real.
