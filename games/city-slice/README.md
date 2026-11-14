# The city slice

The smallest part of the City of Keys that needs every new piece of milestone M3. Six residents (`A01` to `A06`)
talk on a board and in direct messages and pay each other points. A court takes their votes and proposes to banish
the resident with the most; the verdict waits two ticks, in which the person at the run (the Human Hand) or the
Director `warden` may change it; then it is carried out. The mechanic `exile` only writes that the resident is gone:
the `ledger` burns its points and the `puzzles` burn its fragments because they listen to that one event.

It is not the City of Keys: no gate, no tribunal, no progression. It is new, not a port. The game of `game.ts` has
no briefing and is played by scripts, offline; the variant `briefed` (below) is the one for model residents. The
full recut of the City comes with milestone M5.

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

## The variant `briefed`

The game of `game.ts` tells a resident nothing: each activation holds the ledger's status line and no more, and
the court's session reaches nobody. Model residents then only read the board (P450 and P451 in
[`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md)). The option `briefed` of `sliceGame` (default off)
changes two things and nothing else:

- every resident gets the briefing of `briefing.ts`, the same text for all six. It states the rules: the place and
  its ticks, what points are and how they move, the board and the direct messages, the court's session with its
  ticks, the verdict, who may change it and what banishing means. It names every tool of the resident grant and
  tells nobody what to do. A model resident reads it in its system prompt;
- the court is loaded with `announce: true`: at the start of tick 4 every resident gets a notice of the city that
  the session is open and when it closes. It is an input line of the resident's activation in that tick.

Off, neither the briefing nor the option is in the game's data, so `game.ts` keeps its hash and the committed
timelines stay as they are. `game.ts` exports the one game; `family.ts` exports the same game as a game family
with the param `briefed`, which is what the command line takes:

```sh
node apps/cli/src/bin.ts run games/city-slice/family.ts --set briefed=true --fake --seed 3 \
  --snapshot-at 6 --hand games/city-slice/hands/amend.jsonl --out runs
```

A live run leaves `--fake` out and names its cost cap and the spend ledger:

```sh
node apps/cli/src/bin.ts run games/city-slice/family.ts --set briefed=true --seed 7 \
  --budget 0.40 --ledger games/m3-ledger.jsonl --snapshot-at 6 \
  --hand games/city-slice/hands/amend.jsonl --out <runs folder>
```

The manifest records `params: { briefed: true }`; `swt report` and `swt resume` read it from there, so they are
given `--game games/city-slice/family.ts`.

### The hand file

`hands/amend.jsonl` is the Human Hand of such a run, one JSON line per act; `at` is the number of finished ticks at
whose boundary the line is applied:

| Line | When | What it does |
|---|---|---|
| `{"at":7,"tool":"pause",...}` | between ticks 6 and 7, after the court proposed its verdict | pauses the run |
| `{"at":7,"command":"snapshot"}` | same boundary | writes `snapshots/t7.json`, which holds the open decision |
| `{"at":7,"tool":"resume",...}` | same boundary | lets the run go on |
| `{"at":8,"tool":"amendDecision","params":{"decision":"D1","proposal":{"exiled":"A02"},...}}` | between ticks 7 and 8, before the deadline | changes the verdict to `A02` |

`--snapshot-at 6` writes one more snapshot, `t6.json`, before the session closes. The file is written before the
run, so it cannot know the verdict: the amendment names `A02` whoever the court chose. It lands when a decision is
open and `A02` is not banished; it is refused with `DECISION_CLOSED` when the session ended in a tie or without a
vote (no decision `D1`), and that refusal ends nothing. To amend after reading the verdict, give `--hand -` and
write the lines on standard input while the run is paused.

## Files

| File | Holds |
|---|---|
| `game.ts` | the game (default export) and `sliceGame(options)` |
| `family.ts` | the game family with the param `briefed` (default export), for `--set briefed=true` |
| `briefing.ts` | the briefing of the variant `briefed` |
| `hands/amend.jsonl` | a Human Hand for a run of the variant: pause, snapshot, resume, one amendment |
| `src/warden.ts` | the Director `warden` |
| `src/scripts.ts` | the scripted residents, the scripted Human Hand, the answers of the warden's model |
| `test/support.ts` | `playSlice(seed, hand)`: the run in a real kernel, one tick at a time, the person's calls through `Kernel.submit` between the ticks |
| `test/city-slice.test.ts` | the run against its timeline, the seven moments by name, the load order without a cycle of services |
| `test/briefed.test.ts` | the variant `briefed`: off it is the game of the timelines; on, the briefing, the notice, the scripted run and its replay |
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

## Resuming with a Human Hand

`swt resume <run-folder> --game games/city-slice/game.ts --hand <file>` takes the hand file of the run it resumes,
whole, not a file with only the lines that are left. The resumed run drops the first N tool lines of the file, N
being the calls the person made before the snapshot, and every `snapshot` line at or before the snapshot's tick;
the rest is applied as in a straight run. A run that stopped paused with `SWT-X009` is resumed with the same file
plus one `resume` line at its end; a file that holds only that line is dropped whole and the run stops again.

A resumed log holds one more line than the straight one, the marker `run_resumed`. After a snapshot before tick 7
the warden is asked after the marker, and the two lines that tell it the log position of the proposal (the reply of
`take` and `asked`) are one higher than in the straight run (decision A27).
