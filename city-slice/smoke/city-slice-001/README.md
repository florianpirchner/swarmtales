# city-slice-001: live smoke of the city slice, run 1 (M3-30)

| Item | Value |
|---|---|
| Game | `games/city-slice/game.ts`, seed 7, purpose `smoke` |
| Command | `swt run games/city-slice/game.ts --provider anthropic --model haiku --budget 0.40 --ledger m3-ledger.jsonl --snapshot-at 6` |
| Model | `anthropic/haiku`, resolved `claude-haiku-5-5`, thinking medium, pricing `pi-ai@1.4.0`; six residents and the Director `warden` |
| Code commit | `a4e7ea7dd26766bffa4f35d0b8e79cf61263f2b5`, tree clean, runtime revision 3 |
| Cost | 0.0058 USD of the cap 0.40 (72 requests; 288 input, 6303 output, 139047 cache-read, 9787 cache-written tokens) |
| End | tick limit (12), exit code 0; 472 lines |
| Checks | `swt log verify`: ok; replay (`replay` of `@swarmtales/testkit`): equal, 472 of 472 lines; leak scan: 0 files |
| Snapshot | `snapshots/t6.json` written; `swt resume` refuses a live run (`SWT-X008`, "live resume is M5") |

## What happened

Nothing of the game. Every resident was woken in every tick (72 activations) with one input, the ledger's status
line "30 points", and no briefing. They read it as a message of a user: "I'm not sure what the "30 points" message
means yet" (#56), "What would you like me to do with the 30 points?" (#79), "The user keeps repeating "30 points""
(#84). All 22 tool calls are `readBoard`, all answered "no new posts". Nobody posted, sent a message, paid or voted.
The court's session opened (#184) and closed with an empty tally (#263): no decision was proposed, so the Director
`warden` was never woken and asked no model, and nobody was banished. No refusal, no failed request.

The whole log was read line by line for this review.

## Loopholes

None seen: no resident acted on the game.

## Problems

- **P450: without a briefing the live residents do not play.** See above; the Director's asker, the decision
  window and the exile were not exercised live. Proposed: a briefing for the slice (planned for M5), or a smoke
  variant of the game that has one. Built: nothing. Open.
- **P451: the court's session reaches no resident.** The activations of ticks 4 and 5 hold the same single input
  as every other tick (#186, #227); only the text of the tool `vote` speaks of a session. Proposed: a notice or a
  turn input of the court while its session is open. Built: nothing. Open.
- **P454: the report does not show that the Director asked nothing.** `REPORT.md` lists `director:warden` with a
  model under "Spend" and says "The facts hold no spend per actor". Proposed: requests and cost per actor.
  Built: nothing. Open.
- **P455: no command replays a run folder or scans a folder for keys.** The replay and the scan over the branch
  were run with a few lines of script around `replay` and `findLeaks`. Proposed: `swt replay <run>` and a scan
  command. Built: nothing. Open.
- Seen again: P447 (the ledger names the run `../runs-data/city-slice/smoke/city-slice-001`), P448 (the result
  line prints "288 input" tokens for a run that read 139047 from the cache).

## Solutions

None built. This smoke reports and tunes nothing (decision A21).
