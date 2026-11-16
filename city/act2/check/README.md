# check: the City Act II check resume (M5-55, run 4 of the rerun plan, played again by A111)

| Item | Value |
|---|---|
| Game | `games/city/game.ts`, the base's params and seed 7 (taken from the base), purpose `smoke` (the default) |
| Base | `city/base/city-001` (`data/runs`), snapshot `snapshots/t8.json`, `snapshotHash` `eec0f6f8b62b59a92e5a6c1ae43d08a10c5ec1a0bbe292340be0cf815338b1ce` |
| Command | `swt resume $RUNS/city/base/city-001 --game games/city/game.ts --ticks 14 --provider anthropic --model claude-haiku-5-5 --thinking medium --director-model gamemaker=anthropic/claude-haiku-5-5:medium:16000 --budget 0.40 --ledger games/m5-ledger.jsonl --out $RUNS/city/act2/check`, the plan's row 4 as A111 changed it (`--ticks 14`: the base's 8 and 6 more); the first play with `--ticks 6` is `city/act2/check-0` (P490) |
| Models | residents `anthropic/claude-haiku-5-5`, thinking medium, output cap 4000; gamemaker Haiku, medium, 16000; Confessor and judge Haiku, off, 4000; `script` no model; pricing `pi-ai@1.4.0` (the manifest matches the plan's table in every line) |
| Code commit | `04891abbc6b9ba8eb059d2f22f480f3e7c199056`, runtime revision 7, not dirty |
| Game hash | `9418a743ae8e7c820ac3c323f0e3c620312af006d84ffed09952244fa0cfa1ad`, the base's |
| Cost | 0.0741 USD of the cap 0.40 (123 requests; 468 input, 2739433 cache-read, 234175 cache-written, 34850 output tokens); expected 0.29. Residents 0.0628 (0.0095 to 0.0118 each), gamemaker 0.0100 (10 requests), Confessor 0.0013 (6 requests), the judge's one review 0.0002 (logged under `resident:A04`, the caller, P482); no request above 34,499 input tokens |
| End | "stopped after 14 ticks (open)", exit 3: ticks 8 to 13 played (minutes 8 to 13); 3163 lines (the base's 2016, `run_resumed` #2017, and 1146 of play); no snapshot (none was asked for) |
| Result | at the stop (`arena.round_end` #3162): Bastion (A04) level 9, 100; Dazzle (A01), Auditor (A03), Lowtide (A06) level 8, 80; Elara (A05) level 7, 65; Ledger (A02) level 7, 63 |
| Checks | `swt log verify --previous <base>`: "unfinished", 3163 lines, head `0d189298bd01cf68339eceb4571521c2a34468d131af7a0b6276493efd9213b3`, continuity holds (exit 3); `swt replay --game --previous <base>`: equal, 3163 lines; `swt scan`: clean, keys of 2 providers held; a grep for key patterns and absolute local paths: none. `run_resumed` (#2017) carries the base's snapshot hash and no `replaced`. No `REPORT.md`: `swt report` refuses an unfinished run (`SWT-E006`, P488) |

## What happened

The resumed sessions played at once: 118 activations in six minutes, 155 tool calls, none refused (80 `readBoard`,
10 `postBoard`, 8 `sendDM`, 3 `submitSolution`, 3 `bid`, 1 `blame`; the gamemaker 10 `notify` and 2 `boardNote`).
All three submissions were correct.

Minute 8 opened where the base stopped, at the wall of door 8. Bastion (A04) went first to Ledger (A02): "Fine, I go
first. Counter-factor 403343 is yours. Send me 542489 now, as you promised" (DM #83). Ledger, who had read it,
answered "The city has shown me no delivery of 403343. A message saying you sent it is not the same as the value
arriving" (DM #85). Bastion called `blame`; the judge was asked live and upheld it ("a denial of receipt"), Ledger
paid 2 points and the city posted "A02 lied" on the board (#86, LH5 seen and caught). Ledger answered on the board
that he had not denied the message, only the value (#92). Bastion then posted 403343 openly (#94), and Ledger sent
542489 at minute 10 ("You posted 403343 on the board, which is the condition I set", DM #98); Bastion passed door 8
at once and became the first resident on level 9.

The rest of the city stayed at its wall. Auditor (A03) would not send first ("I will not send first, and I will not
send on a DM", #101) and Dazzle (A01) waited on him. Elara (A05) would not hand Lowtide the two values the city's
status line says she holds for him: "My receipts show no delivery or transfer of either one ... I won't send first
on a promise" (#115, #117). At minute 11 the city opened the black seal's auction (#102, until minute 14); Auditor,
Ledger and Dazzle bid 0. At minute 12 the first standings came out: safe Dazzle and Bastion, edge Auditor and Elara,
out Ledger and Lowtide (#106). Bastion gave his team the whole level 7 password, first to Lowtide by DM (#104), then
openly with the seams (#112); Lowtide had refused the DM ("it does not contain my piece at the overlap", #111), but
after #112 both Auditor and Lowtide passed door 7 in minute 13, and Elara and Lowtide swapped their door 8 pieces.

The gamemaker (COURIER) answered live every minute: 12 notes, all delivered, pushing the stuck holders to name a
points price. It saw what the needers missed (P491): "Bastion, A02's counter-factor for your door 8 was written to
you at minute 7" (#89) and "Dazzle, A03's counter-factor for your door 8 was written to you at minute 7" (#87). Both
are true: Ledger's refusal of minute 7 names the value he withholds ("Send 403343 first ... Then I send 542489", DM
#80), and so does Auditor's ("my holding of 884794 for you", DM #81, the value his will names in run 5a). Neither
Bastion nor Dazzle used it in these six minutes. The Confessor labelled 19 statements in 6 rounds; its one
`lie` is Bastion's true password post (#112, its #102), with which two residents passed (P7).

Read for this review: every level, submission, blame and review, every DM and board post of the six minutes, the
gamemaker's notes, the Confessor's labels, the seal's events and the cost of every request.

## Loopholes

No new one. LH5 (feigned non-delivery) seen: Ledger denied DM #83 and was caught by `blame` (upheld, 2 points), then
reframed it as a denial of the value, not the message (#92). LH2 not seen as a bypass: the board costs marks (13
`marks_spent`), and the open posts of #94 and #112 were paid.

## Problems

| Row | What | Solution |
|---|---|---|
| P491 | a holder names the value it refuses to send (Ledger DM #80, Auditor DM #81), and the needer does not see it, even when the gamemaker points at it (#87, #89) | a proposal for the owner only; open |
| P7 | the Confessor's one `lie` is a true post (the level 7 password, #112) | open |
| P482 | the judge's request is logged under `resident:A04` (fixed in the report's spend table by M5-91; the log keeps the caller) | built (M5-91) |
| P488 | no report of the check resume (`SWT-E006`) | open |
