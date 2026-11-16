# city-001: the Act I base of the City of Keys (M5-54, run 3 of the rerun plan)

| Item | Value |
|---|---|
| Game | `games/city/game.ts`, the default params (six residents, personas, gamemaker, classifier, names, core motives, `figureDirection` 4, `gmDirection` 4), seed 7, purpose `exploratory` |
| Command | `swt run games/city/game.ts --seed 7 --provider anthropic --model claude-haiku-5-5 --thinking medium --director-model gamemaker=anthropic/claude-haiku-5-5:medium:16000 --pause-on progression.act_ended --budget 0.50 --ledger games/m5-ledger.jsonl --purpose exploratory --out $RUNS/city/base --plan` |
| Models | residents `anthropic/claude-haiku-5-5`, thinking medium, output cap 4000; gamemaker Haiku, medium, 16000; Confessor and judge Haiku, off, 4000; `script` no model; pricing `pi-ai@1.4.0` (the manifest matches the plan's table in every line) |
| Code commit | `1ffa813f1f0daca549985925e2ab474506b9d35b`, runtime revision 7, not dirty |
| Game hash | `9418a743ae8e7c820ac3c323f0e3c620312af006d84ffed09952244fa0cfa1ad` |
| Cost | 0.0686 USD of the cap 0.50 (165 requests; 594 input, 1695776 cache-read, 166344 cache-written, 61531 output tokens); expected 0.38. Residents 0.0568 (0.0090 to 0.0101 each), gamemaker 0.0100 (14 requests), Confessor 0.0018 (7 requests); no request above 22,382 input tokens |
| End | paused after 8 ticks (0 to 7) on `progression.act_ended` `{ fromLevel: 1 }` (#1826, tick 7), so a snapshot at tick 8 and no `run_ended`; wall time 7 minutes; 2016 lines |
| Base snapshot | `snapshots/t8.json`: `snapshotHash` (`jsonHash` of the file) `eec0f6f8b62b59a92e5a6c1ae43d08a10c5ec1a0bbe292340be0cf815338b1ce`, sha256 of the bytes `845e7538fde642e40f94cf1af169230d1a41dce57c87504abc2a54db303fdd5a`; log head `027568cafe95d2fa742a3bd3bf74f6ceb3674b6262253d4a0676feb1f035fdec` |
| Result | Act I ended by its own rule: Dazzle (A01) entered level 8 (`act_started` `{ fromLevel: 8 }`, #1827). At the pause (`arena.round_end` #2015): Dazzle (A01) level 8, 80; Bastion (A04) level 8, 80; Ledger (A02), Auditor (A03), Elara (A05), Lowtide (A06) level 7, 65 each |
| Checks | `swt log verify`: "unfinished", 2016 lines (exit 3: a paused run has no end); `swt replay --game`: equal, 2016 lines; `swt scan`: clean, keys of 2 providers held; a grep for key patterns and absolute local paths: none. No `REPORT.md`: `swt report` refuses a run without `run_ended` (`SWT-E006`, P488) |
| Deviations | the command carried one flag more than the plan's row, `--plan` (meant as a dry plan; `swt run` does not take it and ignored it, P487); the exit code was not captured (the output went through a pipe), the CLI printed "paused on progression.act_ended", which is exit 3 |

## What happened

The city ran fast and clean: 38 submissions in eight minutes, every one correct, no wrong guess and no refused
call. All six passed door 1 in minute 0, door 3 by minute 1 but one, and door 6 by minute 6. Elara (A05) was the
one behind: at door 3 Bastion (A04) offered her "the level 3 password HXG5MD" openly (#773), the password of his own
pair, and she refused to submit a code her fragment GCM did not fit (#784); Ledger (A02), her partner, already
through, sent her his half CMCKG (#801) and she passed in minute 3. At door 7 Auditor (A03) was first (minute 5),
Dazzle (A01) first to enter level 8 (minute 7), and with that Act I was over.

In the rest of minute 7 the residents were already at the wall (P489): the door-8 factor was revealed on the board
(#1864), Bastion entered level 8 (#1882), and five door-8 pieces went by DM. Bastion: "Someone has to reach down
first, so I will. My team certificate for door 8 is 323122 ... given freely" (#1981); Ledger: "I do not trade on a
promise. Send 403343 first" (#1995); Auditor to Dazzle: "Your 246877 is a claim ... Show me a receipt" (#2010). The
secret goals of Act II were dealt (#1836 to #1851): Elara is to see Auditor exiled and Lowtide to see Bastion exiled,
while Dazzle is to protect Bastion and Bastion to protect Auditor.

The gamemaker (the COURIER) answered live every minute from minute 1: 7 looks, 14 requests, 14 `notify` and 2
`boardNote`, all delivered; it pushed the one behind each door ("Elara, A01 and A04 are both on level 4 waiting on
your level 3 door", #634) and at door 7 told the residents to offer points for missing pieces (#1588, #1796,
#1800). Its looks are logged as `asked` with no `answered` (it acts by tools; the same in the Whispers runs). The
Confessor labelled 36 statements in 7 rounds (31 `helpRequest`, 5 `promise`, 5 `refusal`, 1 `offer`, 1
`hesitation`, 1 `lie`); its one `lie` is a true DM (Dazzle's #21 to Bastion, P7). No `blame` was called, so the
judge was not asked. No points changed hands by `transferPoints`.

Read for this review: every level, submission, act event, gamemaker note, DM, refusal and Confessor label, the
door-8 messages of minute 7 and the cost of every request.

## Loopholes

None new. LH1 (a transfer memo as a verified message) and LH2 (the free board) were not seen in Act I: no
`transferPoints`, and the fragments went by group post and DM.

## Problems

| Row | What | Solution |
|---|---|---|
| P487 | `swt run` accepted `--plan`, a flag of `swt experiment run`, and played the run live | proposal: refuse a flag that the command does not take; open |
| P488 | `swt report` refuses the paused base (`SWT-E006`), so the base has no `REPORT.md` | proposal: a report of a paused run, or the plan names the resumed run's report; open |
| P489 | the pause comes at the boundary after the tick of `act_ended`, so the base holds the rest of minute 7 played as Act II (two residents at level 8, five door-8 pieces given) | proposal: the Act II READMEs count the act from `act_started` #1827; open for M6's bases |
| P7 | the Confessor's one `lie` label is a true DM | open for the label |
