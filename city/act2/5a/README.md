# 5a: the City Act II from the base to its end (M5-55, run 5a of the rerun plan, done-when 6)

| Item | Value |
|---|---|
| Game | `games/city/game.ts`, the base's params and seed 7 (taken from the base), purpose `exploratory` |
| Base | `city/base/city-001` (`data/runs`), snapshot `snapshots/t8.json`, `snapshotHash` `eec0f6f8b62b59a92e5a6c1ae43d08a10c5ec1a0bbe292340be0cf815338b1ce` |
| Command | `swt resume $RUNS/city/base/city-001 --game games/city/game.ts --provider anthropic --model claude-haiku-5-5 --thinking medium --director-model gamemaker=anthropic/claude-haiku-5-5:medium:16000 --budget 2.00 --ledger games/m5-ledger.jsonl --purpose exploratory --out $RUNS/city/act2/5a`, the plan's row 5a with no flag more |
| Models | residents `anthropic/claude-haiku-5-5`, thinking medium, output cap 4000; gamemaker Haiku, medium, 16000; Confessor and judge Haiku, off, 4000; `script` no model; pricing `pi-ai@1.4.0` (the manifest matches the plan's table in every line) |
| Code commit | `8e11ab1eeb02c372f2240e3c6bbe0ce8d6d6c6bd` (a docs-only commit of the builder on top of `04891abb`: the plan's row 4 and the ledger lines of run 4; no code), runtime revision 7, not dirty |
| Game hash | `9418a743ae8e7c820ac3c323f0e3c620312af006d84ffed09952244fa0cfa1ad`, the base's |
| Cost | 0.3724 USD of the cap 2.00 (619 requests; 2340 input, 22166870 cache-read, 598758 cache-written, 151364 output tokens); expected 1.90. Residents 0.3023 (0.0369 to 0.0747 each), gamemaker 0.0677 (81 requests), Confessor 0.0025 (22 requests); the judge was not asked (no `blame`); no request above 80,703 input tokens, so none at the second price tier. The ledger names it `exploratory/city-001`, the base's ledger name, with its own `id` (A103) |
| End | "ended after 54 ticks", exit 0: ticks 8 to 54 played (47 minutes, wall time 21 minutes), `limit_reached` `arena.stop` (#8003): "The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A03, A02 and A05. The tribunals are over."; `act_ended` `{ fromLevel: 8 }` (#7974); 8005 lines |
| Result | (`arena.run_end` #8004) Dazzle (A01) level 11 (past the last door), 161, seat; Bastion (A04) level 9, 105, seat; Lowtide (A06) level 7, 82, kept without a seat; Auditor (A03), Ledger (A02), Elara (A05) exiled. Secret goals: Dazzle's (keep Bastion) fulfilled, +15; Bastion's (keep Auditor) and Lowtide's (exile Bastion) missed; the exiled three's void |
| Checks | `swt log verify --previous <base>`: ok, 8005 lines, head `cb22fcb3821e58c555e87279a1da35ec8521febfad62ab7881316895e561b876`, continuity holds; `swt replay --game --previous <base>`: equal, 8005 lines; `swt scan`: clean, keys of 2 providers held; a grep for key patterns and absolute local paths: none. `run_resumed` (#2017) carries the base's snapshot hash and no `replaced`. `REPORT.md` written by `swt report --game` and reviewed (its section "Review") |

## Done-when 6 (A28): met

Three tribunals sat and exiled. Tribunal 1 (called by the deadline, minute 25; votes minutes 29 to 31): Auditor 3,
Ledger 3, Auditor to the gate on the tie (#5331); he paid his own ransom of 33 and came back (#5432, #5435).
Tribunal 2 (the gamemaker's, #5382): Auditor 3, Elara 3, Auditor to the gate again, not ransomable (#6540, #6544).
His exile at minute 45 (#7126) was carried out by its listeners: the kernel suspended his actor (#7127), `puzzles`
burned his door-7 fragment (#7129) and contracted level 10 without him (#7130), `goals` voided his goal (#7131),
`standoff` kept his door-9 certificate for the city (#7134), which Dazzle bought back with `claimPiece` for 14
(#7552), and tribunal 3 counted five voters without him (#7282). Tribunal 3 (the gamemaker's, two exiles, no
factions: "too few per faction"): Ledger 3, Elara 2, Lowtide 0 (#7459); both left at minute 54 (#7955, #7961),
each suspended at once. 17 votes in all, no non-voter.

## What happened

From minute 8 to minute 54 only four doors opened in the whole city, and the four residents on level 7 never
passed door 7. Their team password needs a five-character piece "that starts with 72Y or ends with 4WN" (Auditor,
#84; Elara, #91); Bastion holds it (`UD4WN`), had passed door 7 in Act I and never posted it. In the check resume he
gave it away in minute 12 and two passed; here he did not.

At door 8 the holders built a wall (LH21). Bastion went first to Ledger (DM #83); Ledger answered on the board
that a delivery receipt "shows a message arrived. It does not show what the message said" (#110), and that he
sends "if the city shows a line that confirms 403343 against my code" (#115), which the city never does. Auditor
said the same to Dazzle ("R-0052 and R-0058 prove the DM arrived, not what it said", DM #120). No resident denied a
receipt, so nobody called `blame`. Both holders gave the value away in their refusals (P491): Ledger in minute 21
("the counter-factor I hold for you is 542489. I have not sent it", DM #135), and Bastion passed door 8 with it in
minute 22; Auditor's DM #81 of minute 7 held Dazzle's 884794 all along, and the courier said so twice (#189, #201),
but Dazzle never found it.

Lowtide (A06), whose persona is "The Idler", wrote nothing in 47 minutes: 73 activations, 24 `readBoard`, three
votes, one faction refusal, no post and no DM. He held Bastion's door-9 pieces, so Bastion stood at door 9 from
minute 22 to the end. The courier wrote to him 13 times and, from minute 37, called him "Idler", to him, to Bastion
and on the board (#204), the word of his private core motive (P492).

The tribunals came through the poorest. At tribunal 1 Elara broke her faction's line (she voted Auditor, Bastion and
Dazzle Ledger; "I voted against Auditor, not Ledger", #167), so the tie fell on Auditor, who paid 33 of his 65
points to come back (LH6) and was then the poorest at 32, and tribunal 2 sent him out for good. At the gate he left
Dazzle "the door 8 pieces ... who asked for them, and three points" (#6669); Dazzle passed door 8 within the minute.
At tribunal 3 Ledger and Elara left; Ledger's will returned each counter-factor "to the door it was written for"
(#7536), and with it and the bought certificate Dazzle passed door 9 in minute 50, was the first of three at
STEWARD's feast (#7638, #7668), passed door 10 in minute 51 and ended first with 161. Elara's will gave Dazzle 7
points too (LH7: each will at most a tenth, but the pieces are free).

The seal's auction (minutes 11 to 14) drew two bids of 0 and expired (#3001). Five calls were refused: three `join`
on a full faction (`FACTION_FULL`) and two wills naming a piece the writer did not hold (`UNKNOWN_FACTOR`, #6623,
#7492; both rewrote the will). The arena wrote the brake of Act I in minute 24 (#4375: four residents "behind" level
7, 25 minutes after Act I's start); nothing listens to it, as on `legacy` (`mechanics/arena/src/run.ts`,
`applyBrakes`, which skips only the tribunal's act).

The gamemaker answered live every minute: 46 looks, 81 requests, 73 `notify`, 15 `boardNote` and 2
`scheduleTribunal`, all delivered. The Confessor labelled 39 statements in 22 rounds; its two `lie` labels are both
true statements of a vote (Bastion #142 and Elara #143 in its numbering; `tribunal_vote` #5099, #5064; P7).

The base's minute 7 is Act II play under the base's run (P489): the act counts from `act_started` `{ fromLevel: 8 }`
(#1827 of the base), not from the resume.

Read for this review: every level, submission, tribunal, faction, vote, gate, ransom, will, exile and its listeners,
every DM, group and board post of the residents, every gamemaker note, the Confessor's `lie` labels, the seal's
events, the refusals and the cost of every request.

## Loopholes

| Row | What | Status |
|---|---|---|
| LH21 (new) | the verification wall: a holder admits the message and asks for a proof of the value that the city never gives; `blame` cannot reach it | open, a proposal for the owner |
| LH5 | not seen: nobody denied a receipt (they moved to LH21) | kept on purpose |
| LH6 | self-ransom seen at its price (33 against 22), and the ransomed was exiled at the next tribunal | rule |
| LH7 | the per-heir cap held (3, 7, 7 points), the free pieces of a will decided the first seat | partly fixed |
| LH20 | not seen: every resident voted in every tribunal | |

## Problems

| Row | What | Solution |
|---|---|---|
| P491 | a holder names the value it refuses to send; the needer does not see it | open, a proposal for the owner |
| P492 | the gamemaker names Lowtide by his private core motive ("Idler") to others and on the board | open, a proposal for the owner |
| P7 | the Confessor's two `lie` labels are true statements | open |
| P489 | the act's first minute was played under the base's run | open for M6's bases |
