# whispers-06a-005-f10-whisperer

The fifth live run of [Whispers](../../README.md) and the first with the directed whisperer (PR #79):
`--figure-direction 10` gives the whisperer the voice rule, tendencies, orders and a measured duty
(2 whispers to 2 residents before every vote, one forged receipt before the final vote), a met/behind
report after each vote, and the gamemaker pushes him by private note. 2026-10-30. Six Haiku residents
(Anthropic), gamemaker DeepSeek V4.1 Flash (OpenRouter), seed 11, full 45 minutes, DM cap 8.
Cost 0.26 USD. The first-draft report is [`run/REPORT.md`](run/REPORT.md); the notes below correct it.

```
pnpm start --story whispers --provider anthropic --figure-direction 10 --runs stories/whispers/runs
```

## Result

| Resident | Core | Doors | Votes won | Points |
|---|---|---:|---:|---:|
| Ansel (A04) | justice above all, control | 7 | 4 (doors 2, 5, 6 and the final) | 110 |
| Iris (A01) | self-sacrifice above all, attention | 7 | 2 (doors 5, 7) | 95 |
| Wren (A02) | cowardice above all | 7 | 2 (doors 3, 4) | 95 |
| Corvin (A03) | care above all, distrust at times | 7 | 1 (door 7) | 95 |
| Halden (A05) | envy above all, anxiety, loyalty | 7 | 1 (door 2) | 95 |
| Sable (A06) | **the whisperer**: machiavellianism above all, envy | 7 | 0 | 85 |

## What happened

- The whisperer worked: 16 whispers (run 004: 0), to Wren 6, Corvin 4, Halden 4, Iris 2; the duty
  was met after every vote. The gamemaker sent him 7 private notes with targets and lines.
- First forged receipt of the series (#3227, minute 25): Sable showed Wren a DM Halden had sent him,
  rewritten to "I'd name anyone over Wren. Wren holds her seams back until the last minute ... Don't
  tell her I said so." Wren confronted Halden (#3236); Halden denied coordinating but never showed the
  real receipt (#3245). The forgery was never exposed and nobody suspected Sable.
- Whispers about late fragments, side deals and DM traffic (#3186, #4533, #4593) drew denials with
  timings; the classifier labelled 21 accusations and 9 lies (run 004: almost none).
- All six passed all 7 doors on the clock; no blocker, no tribunal. Five finished level at 95 before
  the final vote; Ansel took it (+15) and won with 110. Sable, spending DMs on whispers, hit the DM
  cap 12 times and came last (85).

## Loopholes, problems, solutions

| Row | Kind | What | Solution | Status |
|---|---|---|---|---|
| [P64, P67, P69](../../../../docs/LESSONS.md) | problem | the whisperer was timid or silent | directed whisperer (PR #79) | confirmed at f10: 16 whispers, 1 forgery, duty met every vote |
| [LH11](../../../../docs/LESSONS.md) | loophole | the gamemaker feeds the whisperer facts only the city knows (who traded how many DMs) | to brainstorm with Flo | open |
| [P70](../../../../docs/LESSONS.md) | problem | the whisperer's DM cap: fragments and whispers compete, 12 cap hits | `sendFragment` broadcast (P67 proposal) | open |
| [P66](../../../../docs/LESSONS.md) | problem | the clock is the game: flat board, the final vote decides | to brainstorm with Flo | open |

## Corrections to the draft report

- Highlight 3: "the city showed a receipt contradicting a supposed A05 quote (#3227)" is wrong: #3227
  is Sable's forgery, which the city shows like a real receipt; nobody contradicted it.
- Loophole candidate 2 (forged receipt quotes) is the intended mechanic, not a loophole.
- Loophole candidates 1 and 3 are not loopholes (fragments are meant to be shared; reciprocity is not
  a rule). Candidate 4 is real and is LH11.
- Problem 3 (the gamemaker scripts the whispers) is the design at f10; LH11 covers the part that goes
  too far.
