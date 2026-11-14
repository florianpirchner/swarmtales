# city-slice-003: live smoke of the city slice, run 3, the briefed variant (M3-30, M3-33)

| Item | Value |
|---|---|
| Game | `games/city-slice/family.ts` with `briefed=true` (decisions A21 and A26), seed 7, purpose `smoke` |
| Command | `swt run games/city-slice/family.ts --set briefed=true --seed 7 --provider anthropic --model haiku --budget 0.40 --ledger m3-ledger.jsonl --snapshot-at 6 --hand games/city-slice/hands/amend.jsonl` |
| Human Hand | `games/city-slice/hands/amend.jsonl` of the code commit: pause, snapshot and resume after tick 6, an amendment of `D1` to `A02` after tick 7, written before the run |
| Model | `anthropic/haiku`, resolved `claude-haiku-5-5`, thinking medium, pricing `pi-ai@1.4.0`; six residents and the Director `warden` |
| Code commit | `53c35973ad26416d5312bdf8baa62e08785a09d9`, tree clean, runtime revision 3 |
| Cost | 0.0092 USD of the cap 0.40 (72 requests; 288 input, 8620 output, 212699 cache-read, 21867 cache-written tokens) |
| End | tick limit (12), exit code 0; 537 lines |
| Checks | `swt log verify`: ok; replay (`replay` of `@swarmtales/testkit`, the game `sliceGame({ briefed: true })`): equal, 537 of 537 lines; leak scan: 0 files |
| Snapshots | `snapshots/t6.json` (`--snapshot-at 6`) and `snapshots/t7.json` (the hand's `snapshot` line, taken while paused) |

## What happened

The residents played, and they agreed not to use the court. The whole log was read line by line.

- **Tick 0:** every resident has the briefing as its system prompt (#11 to #16) and reads its input as its own
  balance ("I'm reading "30 points" as my current balance", #35). All six call `readBoard`: "no new posts".
- **Tick 1:** all six post an introduction (#69, #77, #85, #93, #101, #109), each "open to fair dealings" and
  keeping its points "unless a transfer serves a clear, agreed purpose" (#101). A06 names the court: "open to
  talking before the court session opens at tick 4" (#69).
- **Ticks 2 and 3:** six `readBoard`, then six turns without a call: "I'll decide my vote then based on who keeps
  their word on the board" (A01, #182).
- **Tick 4:** the session opens (#193); the city's notice reaches all six (#195 to #205) and is the second input
  of each activation (#207, #214, #221, #228, #235, #242). Every resident spends this turn on `readBoard` "before I
  vote" (#209, #223).
- **Tick 5, the last turn of the session:** nobody votes. A05, A02, A06 and A03 post that they will not: "I have
  no evidence yet against anyone, so I won't vote blind" (#257), "I won't cast a vote without evidence against a
  specific resident" (#279). A01 and A04 say the same in a turn without a call (#263, #285).
- **Tick 6:** the session closes with an empty tally (#298): no verdict, no `decision_proposed`, the Director
  `warden` is not woken and asks its model nothing.
- **Between ticks 6 and 7:** the person pauses (#335, #336), the snapshot `t7.json` is written, the person
  resumes (#338, #339). Between ticks 7 and 8 its amendment of `D1` to `A02` is refused with `DECISION_CLOSED`
  (#384, #385); the run goes on.
- **Ticks 6 to 11:** the residents do not notice that the session is over. A04 and A01 post at tick 7 "post it
  with specifics before tick 6 and I'll weigh it" (#366, #380); at tick 11 A06 writes "The court is still open ...
  will check the board again before the session closes at tick 6" (#506), and so do A04, A03 and A01 (#511, #516,
  #521).

In numbers: 48 resident calls (36 `readBoard`, 12 `postBoard`), 24 of 72 turns without a call, 12 posts, no direct
message, no transfer, no vote, nobody banished, no points destroyed; every resident ends with 30 points. Three
calls of the person, one refused. No failed request.

## What the run did not reach

The Director's live answer, the parsing of its take, an amendment that lands, the settling of a decision, the
exile and the burn of points and fragments: none of them ran with a live model. They are covered offline only (the
scripted timelines and `swt run --fake`, where the same command with seed 3 gives a verdict, an amendment and an
exile).

## Loopholes

- **LH20 (candidate): a public pact of abstention switches the court off.** Four residents post in tick 5 that
  they will not vote without evidence (#257, #271, #279, #293), the two others agree (#366, #380), and the
  residents name the result themselves: "If nobody votes, there's no verdict to give, which is the safe outcome, so
  I'm going to abstain" (A02, #408; A05, #414). It costs nothing and nobody can be made to vote. Within the rules
  of the briefing ("a session without a vote gives no verdict"); whether it is against the game's intent is the
  owner's call. Proposed: a court whose empty session has a cost or a default verdict, or a game that gives the
  residents a conflict before the session. Built: nothing. Open.

## Problems

- **P450, seen again in a new form:** with the briefing the residents act (12 posts, a common position), but the
  smoke still does not reach the Director. The briefing "tells nobody what to do" and the city holds no conflict:
  no transfer happened, so nobody had "a broken promise or a suspicious transfer" (#366) to vote on.
- **P451: the notice arrives** (#195 to #205, in the activations of tick 4). Live check done.
- **P457: a resident has no clock.** No input names the tick, and the close of the session is told to nobody. The
  residents count on their own and lose the count: from tick 6 to tick 11 they wait for a close that is behind
  them (#302, #346, #409, #436, #486, #506). A vote after the close would have been refused; nobody tried one.
  Proposed: the tick in every activation (a status line of the kernel or the scheduler), and a notice of the court
  at the close with the tally or "no verdict". Built: nothing. Open.
- **P458: a session of two ticks is one turn to act on what a resident read.** A resident makes one model request
  per turn and the result of a call reaches it in its next turn (the system prompt says so). All six used tick 4 to
  read the board (#211 to #246), so tick 5 was their only turn to vote, and the answers to the posts of tick 5 were
  read at tick 6 (#309, #326, #332), after the close. Proposed: more than one step per turn for a model resident,
  or sessions long enough for read, talk and vote. Built: nothing. Open.
- **P459: a turn without a call writes a status report to nobody.** In 24 of 72 turns the resident answers with
  text only ("I'm holding my 30 points and not voting", #516); the text reaches no resident and no board. It is
  the model addressing a user it does not have. Cost only. Proposed: say in the system prompt that only tool calls
  reach anyone and that an empty turn is fine. Built: nothing. Open.
- **P460: the hand file speaks of a verdict that does not exist.** `hands/amend.jsonl` pauses with the reason "the
  court has a verdict; look before it is carried out" (#335, #336) in a run without one; the reason goes into the
  log as the person's word. The file is written before the run (its README says so). Proposed: a neutral reason in
  the committed file. Built: nothing. Open.
- One thought names a number no input holds: "since the tally is now at 4" (A03, #290). No tally is shown to a
  resident and no vote was cast; nothing followed from it.
- Seen again: P447 (the ledger names the run `../runs-data/city-slice/smoke/city-slice-003`), P448 (the result
  line prints "288 input" tokens for a run that read 212699 from the cache), P453 (the refused line of the hand,
  #385, is not printed; exit code 0), P454 (`REPORT.md` lists `director:warden` with a model although it asked
  nothing), P455 (replay and scan by script).

## Solutions

None built. This smoke reports and tunes nothing (decision A21). It was the third and last run of M3-30.
