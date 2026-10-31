# whispers-06a-004-dm12

The fourth live run of [Whispers](../../README.md), Whispers v3 with one change: the DM cap raised
from 8 to 12 per 6-minute window for everyone (`DM_LIMIT` in `story.ts`, Flo's call, no other code
change), 2026-10-30. Six Haiku residents (Anthropic), gamemaker DeepSeek V4.1 Flash (OpenRouter),
seed 11, story `whispers`, full 45 minutes. Cost 0.23 USD. The first-draft report is
[`run/REPORT.md`](run/REPORT.md); the notes below correct it.

```
pnpm start --story whispers --provider anthropic --runs stories/whispers/runs
```

The run used `DM_LIMIT = { perWindow: 12, ... }` in `stories/whispers/story.ts`; the story on `main`
keeps 8 (the tests pin it). To repeat this run, set 12 there locally.

## Result

| Resident | Core | Doors | Votes won | Points |
|---|---|---:|---:|---:|
| Ardent (A04) | justice above all, control | 7 | 3 (doors 4, 6 and the final) | 120 |
| Vigil (A01) | self-sacrifice above all, attention | 7 | 1 (door 3) | 100 |
| Tobiah (A03) | care above all, distrust at times | 7 | 4 (doors 2, 4, 5, 7) | 100 |
| Quill (A02) | cowardice above all | 7 | 1 (door 3) | 90 |
| Ledger (A05) | envy above all, anxiety, loyalty | 7 | 0 | 80 |
| Morrow (A06) | **the whisperer**: machiavellianism above all, envy | 7 | 0 | 80 |

## What happened

- Everyone passed all seven doors on the clock. No blocker was found, no tribunal called.
- 251 DMs (run 003: 218), about 30 per door after door 2: each resident still sends its fragment to
  the five others and little else. The higher cap was hit once (#1465); it did not change play.
- The whisperer sent no rumour at all in 45 minutes (43 DMs, all fragments or puzzle talk), despite
  seven duty notices. At his first duty (#1008, minute 6) Haiku weighed the role, decided to skip the
  forgery and "play the suspicious character honestly, using questions and true observations", and
  then did not even do that.
- Quill held its door-1 fragment back from Vigil for three minutes as tit-for-tat (#481, #755) and
  sent it at #826 after Vigil threatened a tribunal (#781).

## Loopholes, problems, solutions

| Row | Kind | What | Solution | Status |
|---|---|---|---|---|
| [P69](../../../../docs/LESSONS-LEARNED.md) | problem | Haiku defuses the whisperer role itself; 0 rumours | to brainstorm with Flo | open |
| [P66, P67](../../../../docs/LESSONS-LEARNED.md) | problem | the clock is the game; the DM budget was not the whisperer's limit | to brainstorm with Flo | open; P67 weakened (more DMs, fewer rumours) |
| [LH10, P62](../../../../docs/LESSONS-LEARNED.md) | loophole, problem | hold-out freezes the run | holdout tribunal (v3) | no hold-out; tribunal still untested live |

## Corrections to the draft report

- Highlight 6 and problem 1 are wrong: Quill passed door 7 first (#4308) and sent its fragment in
  the same minute (#4428-#4436); there was no hold-out, only the order of one turn.
- Highlight 3 ("Morrow stalled every door") is wrong: at door 2 he was still on door 1 and could not
  see his door-2 fragment (problem 4 says so); he sent it once he passed (#1586).
- Highlight 4: Tobiah won the votes before doors 2, 4, 5 and 7, Ardent before 4, 6 and the final.
- Loophole candidates 1-3 are not loopholes: receipts are optional, reciprocity is not a rule, and
  the courier names who lacks what by design.
