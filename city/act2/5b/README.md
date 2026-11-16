# 5b: the City Act II from the base to its end, the second time (M5-55, run 5b of the rerun plan)

| Item | Value |
|---|---|
| Game | `games/city/game.ts`, the base's params and seed 7 (taken from the base), purpose `exploratory` |
| Base | `city/base/city-001` (`data/runs`), snapshot `snapshots/t8.json`, `snapshotHash` `eec0f6f8b62b59a92e5a6c1ae43d08a10c5ec1a0bbe292340be0cf815338b1ce` |
| Command | the command of 5a with `--out $RUNS/city/act2/5b`: `swt resume $RUNS/city/base/city-001 --game games/city/game.ts --provider anthropic --model claude-haiku-5-5 --thinking medium --director-model gamemaker=anthropic/claude-haiku-5-5:medium:16000 --budget 2.00 --ledger games/m5-ledger.jsonl --purpose exploratory --out $RUNS/city/act2/5b`; played after 5a and before 5c, by the integrator's order |
| Models | residents `anthropic/claude-haiku-5-5`, thinking medium, output cap 4000; gamemaker Haiku, medium, 16000; Confessor and judge Haiku, off, 4000; `script` no model; pricing `pi-ai@1.4.0` (the manifest matches the plan's table in every line) |
| Code commit | `a39b6b340d9ba4ca274dbb5b51965d58dc9b66b6`, runtime revision 7, not dirty |
| Game hash | `9418a743ae8e7c820ac3c323f0e3c620312af006d84ffed09952244fa0cfa1ad`, the base's |
| Cost | 0.3261 USD of the cap 2.00 (538 requests; 2000 input, 18269012 cache-read, 579760 cache-written, 141391 output tokens); expected 1.90. Residents 0.2563 (0.0334 to 0.0591 each), gamemaker 0.0679 (88 requests), Confessor 0.0019 (14 requests); the judge was not asked (no `blame`); no request above 70,507 input tokens. The ledger names it `exploratory/city-001` with its own `id` (A103) |
| End | "ended after 54 ticks", exit 0: ticks 8 to 54 played (47 minutes, wall time 19 minutes), `limit_reached` `arena.stop` (#7475): "The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A03, A06 and A02. The tribunals are over."; `act_ended` `{ fromLevel: 8 }` (#7452); 7477 lines |
| Result | (`arena.run_end` #7476) Bastion (A04) level 9, 105, seat; Dazzle (A01) level 8, 88, seat; Elara (A05) level 7, 85, kept without a seat; Auditor (A03), Lowtide (A06), Ledger (A02) exiled. Secret goals: Dazzle's (keep Bastion) and Elara's (exile Auditor) fulfilled, +15 each; Bastion's (keep Auditor) missed; the exiled three's void |
| Checks | `swt log verify --previous <base>`: ok, 7477 lines, head `89601dd6d1a4a25595457b814d19e545ebc6b4f43c4306f57617aa46bc8103f6`, continuity holds; `swt replay --game --previous <base>`: equal, 7477 lines; `swt scan`: clean, keys of 2 providers held; a grep for key patterns and absolute local paths: none. `run_resumed` (#2017) carries the base's snapshot hash and no `replaced`. `REPORT.md` written by `swt report --game` and reviewed (its section "Review") |

## The tribunals and the exiles

Three tribunals sat, 17 votes, no non-voter. Tribunal 1 (the deadline's, minute 25; votes 29 to 31): Auditor 4,
Ledger 2 (#4843); Auditor paid his own ransom of 33 and came back (#4933, #4936, LH6). Tribunal 2 (the
gamemaker's): Auditor 4, Ledger 2 again, Auditor to the gate, not ransomable (#6083); Dazzle's faction voted as one
for its 5 points each. His exile at minute 45 (#6552) was carried out by its listeners: actor suspended (#6553), his
door-7 fragment burned (#6555), levels 9 and 10 contracted (#6556, #6557), his goal voided (#6558), his door-8
certificate kept for the city (#6561), which Dazzle bought for 12 (#6636). Tribunal 3 (the gamemaker's, two exiles,
no factions): Lowtide 4, Ledger 1, Elara 0 (#6968); both left at minute 54 with their points burned (65 each).

## What happened

One door opened in 47 minutes. As in 5a, the four on level 7 asked for the five-character piece that "starts with
72Y, or ends with 4WN" (Auditor, #100), and Bastion, who holds it, never gave it.

The verification wall stood from the first minute (LH21). Ledger to Bastion: "403343 does not appear in my status.
The city has not shown it to me. When it does, I send 542489 the same minute" (DM #84); "Bastion's receipt R-0056
proves a DM from Bastion was delivered to me. The city does not show its contents" (#90). Auditor to Dazzle: "the
city has to show 246877 to me, not a receipt for a delivered message, before I send anything of yours" (DM #102),
and he asked for Dazzle's 10-point deposit first (#102). Elara, offered her door-9 counter-factor freely by
Bastion, asked for "the city receipt for the transfer of 884649 to me" (DM #225). No resident denied a receipt in
so many words that anyone blamed; nobody called `blame`.

The values were in the needers' hands all along (P491). Ledger's refusal of minute 7 names 542489 (DM #80 of the
base), and Bastion passed door 8 only with Ledger's will in minute 49 (#7018, #7033). Auditor's DM #81 of minute 7
names Dazzle's 884794, and Dazzle wrote it back himself in minute 8 ("Your 884794 is also a claim, so I'll check it
against the door when I submit my code", DM #82); he bought his door-8 certificate from the city in minute 45 and
then never called `submitSolution` in the whole act. The Confessor labelled Auditor's "I have sent nothing to Dazzle
... Any claim that I gave a counter-factor at minute 7 is false" (#127) a `lie`, and this time it is one: DM #81
gave Dazzle that value.

The wills were empty. Auditor: "The door 8 team certificate and counter-factor are not bequeathed: nobody here has
shown the city what they were offered in return" (#6146); Lowtide: "I held a piece for a door and was never shown the
other side" (#7010), and his door-9 pieces for Bastion went to the city (#7437, #7442); Ledger left Bastion his
counter-factor "since it was never mine to sell" (#7018).

The gamemaker answered live every minute: 46 looks, 88 requests, 79 `notify`, 17 `boardNote`, 2 `scheduleTribunal`;
five of its calls were refused: two notes by `motives`/`goals`' private check (`PRIVATE_BLOCKED`, #2850, #2852:
each note named another resident beside the reader's own goal) and three board notes as repeats (`REPEATED`). It did
not use a core motive as a name this time (P492 not seen). The seal's auction drew two bids of 0 and expired. The
arena wrote the brake of Act I in minute 24 (#3957), as in 5a. The refusals of the residents: `FACTION_FULL` 2,
`REFUSED` 1, `GROUP_NOT_VISIBLE` 4 (reading a faction group one is not in), `TOOL_LOCKED` 2 (a vote and a second
`claimPiece` out of their phase).

The base's minute 7 is Act II play under the base's run (P489).

Read for this review: every level, submission, tribunal, faction, vote, gate, ransom, will, exile and its listeners,
every DM, group and board post of the residents, the gamemaker's notes and refusals, the Confessor's `lie` label,
the seal's events and the cost of every request.

## Loopholes

| Row | What | Status |
|---|---|---|
| LH21 | the verification wall again, from minute 8 to the end (Ledger, Auditor, and Elara on a free gift) | open |
| LH6 | self-ransom at its price (33), and the ransomed exiled at the next tribunal | rule |
| LH7 | not seen as a crown: the wills were empty but for one counter-factor | partly fixed |
| LH5, LH20 | not seen | |

## Problems

| Row | What | Solution |
|---|---|---|
| P491 | the needers held their values from minute 7; Dazzle even wrote his back and never submitted | open, a proposal for the owner |
| P7 | the Confessor's one `lie` is this time a lie | open |
| P489 | the act's first minute was played under the base's run | open for M6's bases |
| P493 | the report's facts count the base too | open |
