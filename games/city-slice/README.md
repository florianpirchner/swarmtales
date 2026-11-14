# The city slice

The smallest part of the City of Keys that needs every new piece of milestone M3. Six residents (`A01` to `A06`)
talk on a board and in direct messages and pay each other points. A court takes their votes and proposes to banish
the resident with the most; the verdict waits two ticks, in which the person at the run (the Human Hand) or the
Director `warden` may change it; then it is carried out. The mechanic `exile` only writes that the resident is gone:
the `ledger` burns its points and the `puzzles` burn its fragments because they listen to that one event.

It is not the City of Keys: no gate, no tribunal, no progression. It is new, not a port, and it has no briefing; it
is played by scripts, offline. The full recut of the City comes with milestone M5.

## The game

| Part | Value |
|---|---|
| Residents | six, `A01` to `A06` |
| Scheduler | `turns`: one pass, blocks of one, every resident every tick, seeded order, Directors after each block |
| Ticks | 12, numbered 0 to 11 |
| Mechanics, in this order | `ledger` (30 start points), `channels`, `exile`, `decisions`, `humanHand`, `puzzles` (three fragment levels, everyone before door 2), `court` (opens at tick 4, closes at tick 6, window 2) |
| Director | `warden` (`src/warden.ts`): woken by `decisions.decision_proposed`, posts one line on the board |
| Grants | `resident`: `transferPoints`, `readBoard`, `postBoard`, `sendDM`, `vote`; `warden`: `postBoard`, `amendDecision`; `human`: `pause`, `resume`, `amendDecision` |
| Holders of a decision | `human`, `director:warden` |

## The scripted run

`src/scripts.ts` holds the run as data: what each resident calls in each tick (`SCRIPT`), what the person does
between the ticks (`HAND`, and `AMENDED_HAND` for the variant `amended`) and what the warden's model answers
(`WARDEN_ANSWERS`). The tick numbers are the kernel's; a line of the Human Hand with `at: 7` is applied after seven
finished ticks, which is between tick 6 and tick 7.

| # | When | What happens |
|---|---|---|
| 1 | ticks 0 to 3 | every resident posts once; two direct messages are sent and delivered; two transfers |
| 2 | ticks 4 and 5 | the court's session opens at tick 4; five votes, three of them against `A04` |
| 3 | tick 6 | the session closes; the court proposes the decision `court.verdict` with `{ exiled: "A04" }` and a window of 2 ticks; the warden is woken by the proposal and posts one line |
| 4 | between ticks 6 and 7 | the person pauses the run, a snapshot is taken, the person lets the run go on |
| 5 | tick 7 | nothing changes the verdict. In the variant `amended` the person changes it to `{ exiled: "A02" }` between ticks 7 and 8 |
| 6 | tick 8 | the deadline settles the decision; the court posts the city's line and banishes the resident; `exile` writes `exiled` and suspends it; `ledger` burns its balance; `puzzles` burns its fragment of door 2 and contracts door 3 |
| 7 | ticks 9 to 11 | the five residents left go on; a transfer and a direct message to the banished resident are refused with `EXILED`; its script is no longer called |

## Files

| File | Holds |
|---|---|
| `game.ts` | the game (default export) |
| `src/warden.ts` | the Director `warden` |
| `src/scripts.ts` | the scripted residents, the scripted Human Hand, the answers of the warden's model |
| `test/support.ts` | `playSlice(seed, hand)`: the run in a real kernel, one tick at a time, the person's calls through `Kernel.submit` between the ticks |
| `test/city-slice.test.ts` | the run against its timeline, the seven moments by name, the load order without a cycle of services |
| `test/timelines/` | the committed logs: `seed-7.jsonl`, `seed-11.jsonl` and `amended.jsonl` (seed 7 with `AMENDED_HAND`), one event per line as the kernel wrote it |

After a change that is meant to change the run, `pnpm vitest --run games/city-slice -u` rewrites the timelines; read
the diff before you commit it.

## Limits

- The residents of the timelines are scripts. `swt run games/city-slice/game.ts --fake` plays another run of the
  same game with sampled calls: the residents vote, a verdict falls (seed 7) or the vote ties (seed 4), and the
  warden takes its fallback line.
- A pause holds no tick back by itself: the run loop reads the fact `humanHand.paused`. The test applies the three
  lines at one boundary, so the pause shows as two events and a snapshot between them.
- The warden's scripted model keeps its place in memory, not in the snapshot: a resumed offline run needs the
  answers that are left (none here, the warden is asked at tick 6, before the snapshot).
