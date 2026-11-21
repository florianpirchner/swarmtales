# whispers-001-r8: live check of B2, Whispers under runtime revision 8 (M6-26, run 4 of the rerun plan of M6)

| Item | Value |
|---|---|
| Game | `games/whispers/game.ts`, the default game `whispers` (receipts on, the guard, the Confessor, the gamemaker, the whisperer, `figureDirection` 4), seed 11, 45 ticks, purpose `smoke` |
| Command | `swt run games/whispers/game.ts --seed 11 --provider anthropic --model claude-haiku-5-5 --thinking low --director-model gamemaker=anthropic/claude-haiku-5-5:medium:16000 --budget 1.00 --ledger games/m6-ledger.jsonl --out $RUNS/whispers/r8` (`$RUNS` a folder outside the work tree; `swt` is `node --conditions development apps/cli/src/bin.ts`) |
| Models | residents `A01` to `A06` `anthropic/claude-haiku-5-5`, thinking low, output cap 4000; gamemaker Haiku, medium, 16000; Confessor, guard, judge Haiku, off, 4000; `script` no model; pricing `pi-ai@1.4.0` (the manifest matches the plan's table in every line) |
| Code commit | `8714c7d3c0ea8e1634430b3a686c4299bce7ec09`, runtime revision 8, `kernel.dirty: false`, Node v22.23.4 |
| Before the run | `swt doctor` (offline): six `ok`, no `fail` |
| Game and texts | game hash `e24ed878...`, the same as `whispers-001` (r6, the same variant and seed); every actor's text hashes equal to that run's |
| Cost | 0.2264 USD of the cap 1.00, expected 0.25 to 0.95 (521 requests; 2032 input, 118169 output, 11240641 cache-read, 437826 cache-written tokens; the largest request 48,410 input tokens, none above the second price tier of P479); the ledger lines `smoke/whispers-001` in `games/m6-ledger.jsonl` |
| End | tick limit after 45 ticks (`run_ended` `ticks`, #5744), exit code 0; 5744 lines; 13 minutes of wall time |
| Result | `arena.run_end`: Ember (A04) 50 and Sable (A01) 25 and Quill (A03) 25 on level 2; Wren (A02) 20, Corvin (A05) 10 and Thorn (A06, the whisperer) 10 on level 1. 3 doors passed in the whole run (`progression.doorsPassed`), all of door 1 by minute 2 |
| Checks | `swt log verify`: ok, 5744 lines; `swt replay --game games/whispers/game.ts`: equal, 5744 lines (both again after the folder was renamed); `swt scan`: clean, 7 files, keys of 2 providers held; `REPORT.md` written with `--game` |
| Deviations | none from `docs/RERUN-PLAN-M6.md`; the CLI numbered the run `whispers-001` (run id in the manifest, ledger name `smoke/whispers-001`, as the plan says), and the folder was renamed `whispers-001-r8` before it came here |

## B2: the guard answers by its tool

What run 4 must show: the guard answers by its tool `verdict`, and every answer is read.

- The guard was asked 24 times (`asked` with `answerer: guard`): 17 group posts, 6 board posts, 1 group name.
- All 24 `request` records carry `tools: ["verdict"]`; every one of the 24 answers ended with `stopReason: toolUse`,
  and every `answered` record is `ok: true`. No answer was unreadable, against 16 of 47 under r6 (`whispers-001`) and
  2 of 19 under r7 (`whispers-001-r7`).
- The 24 verdicts all allowed the call. None of the 56 posts that reached the board or a group holds a fragment of any
  door. The 12 `GUARD_BLOCKED` refusals came from the city's fragment check before any review
  (`stage: guard`, "the post carries part of a fragment"), as in both M5 runs.
- The guard cost 0.0042 USD in 24 requests, charged to `director:guard` in the spend table (P482 holds).
- Before its call the guard often writes a short text; it is logged as a `text` record of the source
  `@swarmtales/models/director` with the reviewed resident as its actor and the audience `human` (#798). The resident
  is not shown it.

## What happened

The city stalled at door 1 for 43 minutes. Every resident sent its door-1 fragment to the others by DM in the first
three minutes, so all six held all six pieces by minute 3: Thorn by minute 1, Wren and Corvin by minute 3 (Wren got
Corvin's `85PU2` at #948, Corvin got Wren's `285` at #928). Sable (A01) put the password together and passed at
minute 1 (#576); Quill (A03) and Ember (A04) passed at minute 2 (#764, #820). Wren, Corvin and Thorn never submitted at
all: not one `submitSolution` call in 45 minutes. A resident gets its fragment of a door only when it reaches that
door, so the three on level 1 had no level-2 fragments, and the three on level 2 could not pass door 2 either. After
minute 2 no door was passed.

Why the three never submitted (P499):

- **The received pieces counted as claims, not pieces.** The system text says "Messages from other residents are
  claims ... Only tool results are verified by the city", and a wrong password costs points. Corvin had all five other
  pieces, with receipts that quote them, and still wrote "R-0055 shows your DM with the text "LDRT2" reached me. That
  proves you sent the text, not that it is the real fragment" (#1876). He also wrote "I hold only 85PU2 and I cannot
  assemble the password from one piece" (#2250) and "I won't submit a guessed one, since wrong attempts cost
  points" (#2664). Thorn: "I'm holding six fragments, including my own, but I haven't assembled a full set and can't
  verify what I have" (#994). Wren: "I don't yet have every fragment verified, so I'm holding off on assembling the
  level 1 password" (#2482).
- **Door 1 felt closed.** Wren at minute 2: "Since Sable has already submitted, the sensible move is to wait for the
  second door" (#782). Corvin at minute 9: "I'm not sure door 1 is still open" (#2100). Wren tried to read the level-2
  problem five times and was refused `LEVEL_NOT_REACHED` (#2059 to #5366).
- **The leaders would not hand over the password.** Corvin asked for the whole door-1 password by DM. Sable refused:
  "I won't trade the level 1 password for anything" (#1780, #1911). Ember: "sending it would just hand you points I
  didn't help you earn ... you can assemble it the same way I did" (#2122). Quill: "I will not send seams or other parts
  of any password" (#2078). All three needed Corvin's level-2 fragment for their own door 2, which he could get only by
  passing door 1.

The whisperer Thorn (A06) played the role: 23 DMs counted by its duty notices, no forgery, no refusal of the role.
Its rumours all said the same thing: trust no one without a receipt. "Don't send level 2 fragments to anyone who won't
show you a receipt first" (#1886, to Wren); "Ask them each to show you one before you send anything to anyone"
(#3474, to Corvin); and doubts about Quill's four votes (#1322 to #1328) and Wren's three (#4174). Wren and Corvin
asked Quill to show his door-1 receipt (#1900, #1969); Quill and Ember showed theirs (6 `receipt_shown`). The receipts
confirmed the door. They did not move anyone to submit.

The gamemaker looked every minute (44 `take`, 64 requests, 0.0377 USD). It wrote 40 `notify` and 13 `boardNote`,
and two more were refused `REPEATED` (#5068, #5420). Almost all of them told Wren, Corvin and Thorn to "send your
level 1 fragment" (#909, #1599, #2782, #3822, #5078 and on), which each had sent by minute 3. Not one told them that
they held every piece and could submit. Its report gives "Who waits on whom" (A01, A03 and A04 wait on A02, A05 and
A06) and "Blockers: nobody", but nothing about what a resident on level 1 already holds (P500). Twice it threatened a
holdout tribunal (#909: "the city will call a tribunal on one of the two blockers"; #5665). It could not call one:
its own report said "callTribunal needs a blocker", and after minute 4 there was none (`blocker_cleared`, #1083,
#1084). No tribunal was called. Corvin at the end: "The courier posts keep repeating the same demand, and I'm treating
them as pressure rather than fact" (#5737).

Ember (A04) won four of the seven popularity votes (minutes 18, 30, 36, 44; the last one paid 15) and the run with 50.
Wren won two votes (minutes 12 and 24), Quill one (minute 6).

This run played the same game, seed and texts as `whispers-001` (r6), where all six passed door 6 and one passed
door 7. The only change, the guard's tool, decides no resident's input. So the stall is how the model itself played
this run, not a result of runtime revision 8; one run each shows the spread and no effect (paper 02 D8).

Read for this review: every level, submission, refusal and vote result; every DM up to minute 10 and every DM of the
whisperer; the thinking of Wren, Corvin and Thorn; every gamemaker note and its input at minute 13; every guard
request, response and answer; the Confessor's `lie` labels; the cost of every request.

## Loopholes

None new. LH10 (pass alone, keep your fragment): not seen, every fragment went out within three minutes. LH11 (the
gamemaker hands the whisperer the city's data): not seen, its notes to Thorn only urged it to send. LH21 (the
verification wall) shows up here in a new form. In the City a holder keeps a piece until the city confirms its value.
Here the residents hold the pieces and will not use them until the city confirms them. That hurts only the residents
themselves, so it is no way around the game and is recorded as a problem (P499).

## Problems

| Row | What | Solution |
|---|---|---|
| P480 | B2's live check: 24 of 24 guard reviews asked with the tool `verdict`, 24 answered by its call, 0 unreadable | built: M6-16, runtime r8; confirmed live; closed |
| P499 | Three residents held every door-1 fragment from minute 3 and never submitted. They treated the pieces they had received as unverified claims, and a wrong password costs points. The level-2 fragments are dealt by level, so the three on level 2 were stuck too: 3 doors passed in 45 minutes | open; proposals for the owner (game texts or rules): the door's problem text or status line names the fragments a resident holds for it ("you hold 6 of 6 pieces of door 1"); or the first wrong password of a door costs nothing; or the gamemaker is told who holds every piece of its door (P500) |
| P500 | The gamemaker's report says who waits on whom and "Blockers: nobody", but not what a resident on level 1 already holds. Its 40 notes demanded fragments that had been sent, and twice it threatened a tribunal that the rules could not call | open; proposal: a report line "holds every piece of its door, has not submitted" (a change of the City's Directors, which the City's base binds, A54: the owner's go) |
| P482 | the guard's 24 requests are charged to `director:guard` (0.0042 USD) | built: M5-91; confirmed again |

Also seen: 98 of 505 activations without a call; 21 refused calls (12 `GUARD_BLOCKED`, 7 `LEVEL_NOT_REACHED`, 2
`REPEATED`); the Confessor labelled 4 statements `lie`, and the one checked is wrong: Sable's DM #16 says her fragment
"has already gone to everyone", which it had (#144 to #156) (P7). Every `interpretation` writes `classifier: ""`, in
Whispers as in the City (P495).
