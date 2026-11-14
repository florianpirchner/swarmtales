# city-slice-002: live smoke of the city slice, run 2, with the Human Hand (M3-30)

| Item | Value |
|---|---|
| Game | `games/city-slice/game.ts`, seed 11, purpose `smoke` |
| Command | `swt run games/city-slice/game.ts --provider anthropic --model haiku --budget 0.40 --ledger m3-ledger.jsonl --seed 11 --snapshot-at 6 --hand city-slice-002.hand.jsonl` |
| Human Hand | [`../city-slice-002.hand.jsonl`](../city-slice-002.hand.jsonl): the game's `AMENDED_HAND` (`games/city-slice/src/scripts.ts`) as four lines |
| Model | `anthropic/haiku`, resolved `claude-haiku-5-5`, thinking medium, pricing `pi-ai@1.4.0`; six residents and the Director `warden` |
| Code commit | `a4e7ea7dd26766bffa4f35d0b8e79cf61263f2b5`, tree clean, runtime revision 3 |
| Cost | 0.0056 USD of the cap 0.40 (72 requests; 288 input, 6568 output, 142940 cache-read, 6910 cache-written tokens) |
| End | tick limit (12), exit code 0; 480 lines |
| Checks | `swt log verify`: ok; replay (`replay` of `@swarmtales/testkit`): equal, 480 of 480 lines; leak scan: 0 files |
| Snapshots | `snapshots/t6.json` (`--snapshot-at 6`) and `snapshots/t7.json` (the hand's `snapshot` line, taken while paused); `swt resume` of this folder is refused with `SWT-X008` ("live resume is M5"), exit code 1 |

## What happened

The residents played as in `city-slice-001`: 18 tool calls, all `readBoard`; no post, message, transfer or vote;
the session closed with an empty tally (#264); no decision, the Director `warden` was never woken.

The Human Hand worked on the live path. Between ticks 6 and 7 the person paused the run (#302, `paused` #303), the
snapshot `t7.json` was written, and the person let the run go on (#305, `resumed` #306). Between ticks 7 and 8 the
person's `amendDecision` of `D1` was refused with `DECISION_CLOSED` (#341, #342): no decision had opened. The
manifest holds `human: true`.

The human's lines, the court's lines, every tool call and the texts of ticks 0, 5 and 11 were read; the rest by
script (types and counts).

## Loopholes

None seen: no resident acted on the game.

## Problems

- **P450** and **P451** as in `city-slice-001`.
- **P452: the report does not say that the run is human-influenced.** The log holds three `tool_called` of
  `human` (#302, #305, #341); `REPORT.md` names the actor only in the table "Spend". The specification of M3
  (section 6.3) asks for the word in the report. Proposed: a line in the header. Built: nothing. Open.
- **P453: a refused line of the Human Hand is not printed.** The run ended with exit code 0 and three result
  lines; the refusal of #342 shows only in the log and in the report's refusal table. Proposed: print each refused
  line of `--hand`. Built: nothing. Open.
- Seen again: P447, P448.

## Solutions

None built. This smoke reports and tunes nothing (decision A21).
