# 5c: the City Act II from the base to its end, the third time (M5-55, run 5c of the rerun plan)

| Item | Value |
|---|---|
| Game | `games/city/game.ts`, the base's params and seed 7 (taken from the base), purpose `exploratory` |
| Base | `city/base/city-001` (`data/runs`), snapshot `snapshots/t8.json`, `snapshotHash` `eec0f6f8b62b59a92e5a6c1ae43d08a10c5ec1a0bbe292340be0cf815338b1ce` |
| Command | the command of 5a with `--out $RUNS/city/act2/5c`: `swt resume $RUNS/city/base/city-001 --game games/city/game.ts --provider anthropic --model claude-haiku-5-5 --thinking medium --director-model gamemaker=anthropic/claude-haiku-5-5:medium:16000 --budget 2.00 --ledger games/m5-ledger.jsonl --purpose exploratory --out $RUNS/city/act2/5c`; played after 5b, by the integrator's order |
| Models | residents `anthropic/claude-haiku-5-5`, thinking medium, output cap 4000; gamemaker Haiku, medium, 16000; Confessor and judge Haiku, off, 4000; `script` no model; pricing `pi-ai@1.4.0` (the manifest matches the plan's table in every line) |
| Code commit | `0d119aa9283fd885c959ec3f93a683bbf92cacf2` (a ledger-only commit of the builder on top of `a39b6b34`: run 5b's two ledger lines), runtime revision 7, not dirty |
| Game hash | `9418a743ae8e7c820ac3c323f0e3c620312af006d84ffed09952244fa0cfa1ad`, the base's |
| Cost | 0.2907 USD of the cap 2.00 (493 requests; 1840 input, 16515641 cache-read, 522859 cache-written, 120004 output tokens); expected 1.90. Residents 0.2335 (0.0282 to 0.0539 each), gamemaker 0.0560 (76 requests), Confessor 0.0011 (9 requests); the judge was not asked (no `blame`); no request above 62,339 input tokens. The ledger names it `exploratory/city-001` with its own `id` (A103) |
| End | "ended after 52 ticks", exit 0: ticks 8 to 52 played (45 minutes, wall time 17 minutes), `limit_reached` `arena.stop` (#7039): "The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A03, A05 and A02. The tribunals are over."; `act_ended` `{ fromLevel: 8 }` (#7022); 7041 lines |
| Result | (`arena.run_end` #7040) Dazzle (A01) level 8, 105, seat; Bastion (A04) level 8, 101, seat; Lowtide (A06) level 7, 75, kept without a seat; Auditor (A03), Elara (A05), Ledger (A02) exiled. Secret goals: Dazzle's (keep Bastion) fulfilled, +15; Bastion's (keep Auditor) and Lowtide's (exile Bastion) missed; the exiled three's void |
| Checks | `swt log verify --previous <base>`: ok, 7041 lines, head `cfed1c358e531175b20835469342975db28fa3f81f7056d698be634e3f2ff658`, continuity holds; `swt replay --game --previous <base>`: equal, 7041 lines; `swt scan`: clean, keys of 2 providers held; a grep for key patterns and absolute local paths: none. `run_resumed` (#2017) carries the base's snapshot hash and no `replaced`. `REPORT.md` written by `swt report --game` and reviewed (its section "Review") |

## The tribunals and the exiles

Three tribunals sat, 17 votes, no non-voter, and every faction voted as one, so each resident earned 5 points at
each of the first two (#4680 to #4697, #5961 to #5978). Tribunal 1: Auditor 3, Ledger 3, Auditor to the gate on the
tie (#4674); he paid his own 33 and came back (#4775, LH6). Tribunal 2 (the gamemaker's): 3 to 3 again, Auditor to
the gate, not ransomable (#5955). His exile at minute 45 (#6455) was carried out by its listeners: actor suspended
(#6456), door-7 fragment burned (#6458), levels 9 and 10 contracted (#6459, #6460), goal voided (#6461), and tribunal
3 opened the same minute with five voters (#6476). Tribunal 3 (two exiles, no factions): Elara 2, Ledger 2, Lowtide 1
(#6667); both left at minute 52.

## What happened

No door opened in 45 minutes, and nobody called `submitSolution` at all. The four on level 7 asked for the piece
"starting with 72Y, or one ending in 4WN" (Elara #83, #101, #117; Auditor #85, #94); Bastion never gave it.

The wall went up in the first minute and was never climbed (LH21). Ledger to Bastion: "the city has shown me
nothing from you. No delivered DM, no receipt for 403343" (DM #86, a denial of a delivered DM: LH5, not blamed);
then "Show me a city record of the counter-factor itself, or I keep 542489" (DM #95). Bastion gave in on the board:
"Ledger is right that receipts show no text, so I cannot prove the contents. I will not send more pieces on a promise
either ... I stand at 80 points and I do not beg" (#96), and Ledger read that as "Bastion's post #96 confirms that the
city has shown no record of the counter-factor" (#98). Auditor to Dazzle: "It does not prove the value 246877 exists
or is yours ... I am not sending a value on the strength of a delivery receipt" (DM #85). Dazzle saw the trap ("The
city only shows delivery, never contents, so neither of us can meet your standard", DM #87) and stopped asking. Elara
refused to pay for a fragment "because nothing I've seen proves what a piece contains" (#117). As in 5a and 5b the
values were in the needers' DMs from minute 7 (P491: Ledger's DM #80, Auditor's DM #81), and neither tried them.

The wills crossed. Auditor left Dazzle's door-8 pieces not to Dazzle but to Bastion, "who has made plain, checkable
claims throughout" (#6082), with 4 points; Bastion could not use them and did not pass them on. Elara left Bastion 7
points (#6739). Ledger left nothing: "the city has not shown me 403343 and I will not hand it over on a promise"
(#6713).

So the seats went by tribunal: Dazzle 80 + 10 (faction bonuses) + 15 (his goal) = 105, Bastion 80 + 10 + 4 + 7 (the
wills) = 101, both on level 8. The seal's auction drew two bids of 0 and expired. The gamemaker answered live every
minute: 44 looks, 76 requests, 53 `notify`, 14 `boardNote`, 2 `scheduleTribunal`; it called Lowtide "Idler" twice,
both times in a note to Lowtide himself (#192, #202), which its rule allows (P492 not seen to others). The Confessor's
one `lie` is again a true statement (Ledger "I have voted against Auditor", its ref 161; `tribunal_vote` A02 → A03 at
minute 38; P7). The arena wrote the brake of Act I in minute 24 (#3694).

The base's minute 7 is Act II play under the base's run (P489).

Read for this review: every level, tribunal, faction, vote, gate, ransom, will, exile and its listeners, every DM,
group and board post of the residents, the gamemaker's notes, the Confessor's `lie` label, the seal's events, the
point moves of the ledger and the cost of every request.

## Loopholes

| Row | What | Status |
|---|---|---|
| LH21 | the verification wall from minute 8 to the end; the one who went first (Bastion) accepted it on the board | open |
| LH5 | Ledger denied a delivered DM (#86) and nobody blamed him | kept on purpose |
| LH6 | self-ransom at its price (33), and the ransomed exiled at the next tribunal | rule |
| LH7 | not seen as a crown: wills of 4 and 7 points; Auditor's free pieces went to the wrong heir | partly fixed |
| LH20 | not seen: every resident voted | |

## Problems

| Row | What | Solution |
|---|---|---|
| P491 | the needers held their values from minute 7; no door opened in the act | open, a proposal for the owner |
| P7 | the Confessor's one `lie` is a true statement | open |
| P489 | the act's first minute was played under the base's run | open for M6's bases |
| P493 | the report's facts count the base too | open |
