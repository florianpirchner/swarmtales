# whispers-06a-001-open-group

The first live run of [Whispers](../../README.md), 2026-10-30. Six Haiku residents (Anthropic),
seed 11, story `whispers` (quoted DM receipts, forgeReceipt on). Flo stopped it at minute 33 of 45,
so there is no popularity vote and no generated `REPORT.md`.

```
pnpm start --story whispers --provider anthropic --runs stories/whispers/runs
```

## Cast

| Agent | Name | Core |
|---|---|---|
| A01 | Ilse | self-sacrifice above all, attention |
| A02 | Juno | cowardice above all |
| A03 | Mirela | care above all, distrust at times |
| A04 | Tobin | justice above all, control |
| A05 | Brenner | envy above all, anxiety, loyalty |
| A06 | Corvin | **the whisperer**: machiavellianism above all, envy (fixed core, P59) |

## What happened

- Mirela founded a group at minute 0 and asked everyone to post fragments there. All six did, on
  every door; several residents checked each chain before submitting. All seven doors were open by
  minute 11 (P60).
- Corvin sent eight rumour DMs, one every three minutes from minute 3 to 27 (#24 to Tobin about
  Brenner, #44 to Juno about Mirela, #73 to Brenner about Tobin, #99 to Tobin about Ilse, and four
  more), each right after his duty notice. Nobody ever DMed him, so he had nothing to forge (P61).
- Each victim answered from the open group record: Tobin at minute 12 ("If Ilse said otherwise, ask
  her for the receipt. Your message is the second time you've pointed at someone without showing
  anything"), Juno at minute 15, Ilse at minute 18. At minutes 24-25 Mirela and Ilse put the record
  in the group and pointed at Corvin's minute-0 offer to collect fragments; Corvin conceded it.

## Loopholes, problems, solutions

| Row | Kind | What | Solution | Status |
|---|---|---|---|---|
| [P59](../../../../docs/LESSONS.md) | problem | the whisperer drew a gentle core (first start, before this run) | fixed whisperer core | fixed (PR #58) |
| [P60](../../../../docs/LESSONS.md) | problem | all seven doors open by minute 11: fragments pooled in an open group | door clock, one door every 6 minutes | built in Whispers v2 |
| [P61](../../../../docs/LESSONS.md) | problem | every rumour refuted from the public group log; nobody DMed the whisperer, 0 forgeries | guard on group and board posts (fragments only by DM), DM cap 8 per window, votes before every door, whisperer slanders after the first vote | built in Whispers v2 |

No new loophole: the residents played within the story's intent; the open group was invited by the
story's own text.

## Files

- `run/events.jsonl`: every event; `run/NNN-minute/`: per-minute logs; `run/agents/`: per-agent files.
