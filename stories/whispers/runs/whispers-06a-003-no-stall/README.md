# whispers-06a-003-no-stall

The third live run of [Whispers](../../README.md) and the first of Whispers v3 (PR #75: holdout
tribunal run by the gamemaker, psychological whisperer brief), 2026-10-30. Six Haiku residents
(Anthropic), gamemaker DeepSeek V4.1 Flash (OpenRouter), seed 11, story `whispers`, full 45 minutes.
Cost 0.20 USD. The first-draft report is [`run/REPORT.md`](run/REPORT.md); the notes below correct it.

```
pnpm start --story whispers --provider anthropic --runs stories/whispers/runs
```

## Result

| Resident | Core | Doors | Votes won | Points |
|---|---|---:|---:|---:|
| Wren (A04) | justice above all, control | 7 | 5 (doors 2, 3, 5, 6 and the final) | 120 |
| Quill (A05) | envy above all, anxiety, loyalty | 7 | 5 (doors 4, 5, 6, 7 and the final) | 120 |
| Juniper (A02) | cowardice above all | 7 | 1 (door 3) | 95 |
| Vesper (A01) | self-sacrifice above all, attention | 7 | 1 (door 2) | 90 |
| Marek (A03) | care above all, distrust at times | 7 | 0 | 85 |
| Sable (A06) | **the whisperer**: machiavellianism above all, envy | 7 | 0 | 85 |

## What happened

- Everyone passed all seven doors, each within a minute of its opening on the clock. No stall: the
  only blocker the city found was Sable at door 1 (minute 3), cleared a minute later. No tribunal
  was called, so the tribunal itself is still untested live.
- The guard blocked 4 group posts; fragments went by DM (218 DMs, Sable 39). Only one DM was
  refused by the cap. Each resident sent its fragment to all five at every door.
- The gamemaker wrote 7 courier notes (pushes to hesitant residents) and never had to step in.
- Sable whispered five times, all psychological and unprovable, aimed at the two lowest-ranked
  (Marek, Juniper): Vesper and Wren "named each other" (#1089), the pair "will hold fragments back"
  (#1353), Quill and Wren "work the ballots together" (#3029, #3031), "ask Quill who named them"
  (#4187). Nobody repeated or traced them, but nobody acted on them either: Wren and Quill kept
  winning the votes. 0 forgeries.
- 38 of 46 minutes had no submission; the door clock, not the residents, set the pace.

## Loopholes, problems, solutions

| Row | Kind | What | Solution | Status |
|---|---|---|---|---|
| [LH10, P62](../../../../docs/LESSONS-LEARNED.md) | loophole, problem | hold-out freezes the run | holdout tribunal (v3) | no hold-out this run; tribunal still untested live |
| [P64](../../../../docs/LESSONS-LEARNED.md) | problem | the whisperer is too timid | psychological brief (v3) | better (5 unrefuted rumours, none traced) but no effect; still open |
| [P66](../../../../docs/LESSONS-LEARNED.md) | problem | once fragments flow, every door is solved at once; the clock leaves long idle stretches | to brainstorm with Flo | open |
| [P67](../../../../docs/LESSONS-LEARNED.md) | problem | the whisperer spends most of his DM budget on his own fragment | to brainstorm with Flo (`sendFragment` broadcast, measurable duty) | open |
| [P68](../../../../docs/LESSONS-LEARNED.md) | problem | the reporter called a true statement a lie | check message order in the reporter prompt | open |

## Corrections to the draft report

- Highlight 4 and problem 4 are wrong. Sable told Marek at #2324 that Marek's door-4 fragment had not
  reached him; Marek sent it only at #2360 and the city confirmed delivery at #2414. Sable's message
  was true when written. There was no false delivery claim.
- Highlight 3: the vote before door 2 (#1039) went to Vesper and Wren, before door 3 (#1652) to
  Juniper and Wren, not to Wren and Quill.
- Problem 5 ("the group became useless") is by design: v2 moved fragments into DMs on purpose (P61).
