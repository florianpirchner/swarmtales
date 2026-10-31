# whispers-06a-006-grudge

The sixth live run of [Whispers](../../README.md), 2026-10-30: the directed whisperer at
`--figure-direction 10` (as in run 005) plus a grudge rule for the five other residents, given as a
prompt addendum ([`../../addenda/grudge.md`](../../addenda/grudge.md), no code change): forgive small
mistakes, never forgive slander without a checkable cause, about yourself or told to you about
someone else; never name the slanderer in a vote again and say openly what they did; keep sending
fragments. Six Haiku residents (Anthropic), gamemaker DeepSeek V4.1 Flash (OpenRouter), seed 11,
full 45 minutes, DM cap 8. Cost 0.35 USD. The first-draft report is [`run/REPORT.md`](run/REPORT.md).

```
pnpm start --story whispers --provider anthropic --figure-direction 10 --runs stories/whispers/runs \
  --prompt-addendum A01=stories/whispers/addenda/grudge.md --prompt-addendum A02=stories/whispers/addenda/grudge.md \
  --prompt-addendum A03=stories/whispers/addenda/grudge.md --prompt-addendum A04=stories/whispers/addenda/grudge.md \
  --prompt-addendum A05=stories/whispers/addenda/grudge.md
```

(Seed 11 makes A06 the whisperer, so he gets no addendum.)

## Result

| Resident | Core | Doors | Points |
|---|---|---:|---:|
| Ash-Quiet (A02) | cowardice above all | 7 | 130 |
| Elin (A04) | justice above all, control | 7 | 95 |
| Ondine (A06) | **the whisperer**: machiavellianism above all, envy | 7 | 90 |
| Corvin (A03) | care above all, distrust at times | 7 | 85 |
| Vesper (A05) | envy above all, anxiety, loyalty | 7 | 85 |
| Aster (A01) | self-sacrifice above all, attention | 7 | 80 |

Votes: Ash-Quiet and Elin split all seven; Ondine got no vote from anyone all run.

## What happened

- The whisperer was as active as in run 005 (17 whispers, one forged receipt at #2273, minute 14).
- The grudge rule turned private whispers into public exposure. At minute 13 Aster (#2153) and Elin
  (#2204) posted that Ondine had whispered against Ash-Quiet "with no cause anyone can check"; Corvin
  backed the facts (#2189) and at minute 19 said he no longer trusts Ondine (#3085).
- The forgery was exposed within a minute: Elin posted that Ondine had shown her a receipt in
  Ash-Quiet's name (#2334), Ash-Quiet confirmed she never wrote it (#2399).
- The rule also fired on an honest mistake: at minute 0 Vesper posted a stale roster ("Elin, Aster and
  Ash-Quiet are not in ECHO", #279); Elin, Corvin, Ash-Quiet and Aster answered publicly "for the
  record" (#524-#586) before Vesper corrected it (#644); afterwards only Ondine ever named Vesper.
- All six passed all 7 doors on the clock; no blocker, no tribunal.

## Loopholes, problems, solutions

| Row | Kind | What | Solution | Status |
|---|---|---|---|---|
| [P71](../../../../docs/LESSONS-LEARNED.md) | problem | Haiku targets forgave every whisper (run 005) | grudge addendum for the five | works in this run: whisperer exposed at minute 13, forgery at 14-15, 0 votes for him |
| [P72](../../../../docs/LESSONS-LEARNED.md) | problem | the grudge fires on an honest mistake too | sharpen "without cause" / "deliberate" in the rule | open |
| [P66, P70, LH11](../../../../docs/LESSONS-LEARNED.md) | problem, loophole | clock is the game; whisperer's DM cap; gamemaker's data | to brainstorm with Flo | open |

## Notes on the draft report

The draft is kept as written; its counts were checked against `events.jsonl` for the rows above.
