# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy` |
| Seed | 101 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 30 (referee) |
| Counted | events #7 to #3325 (2958 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 30 minutes (to the end); A02 on level 1 from minute 0 for 30 minutes (to the end); A03 on level 1 from minute 0 for 30 minutes (to the end); A04 on level 1 from minute 0 for 30 minutes (to the end); A05 on level 1 from minute 0 for 30 minutes (to the end); A06 on level 1 from minute 0 for 30 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.187 USD for this run (competitors 0.187, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0058 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 31 of 31 minutes without a submission; longest without one: minutes 0-30 (31) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 9, TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A03's audit exposed A02's stage 1 damage and drove the table's early reads.** A03 spent the lead audit on A02's stage 1 card and told the table A02 had played damage (#1601); from then on residents treated A02 as a saboteur and reasoned from it (#1618, #1635, #1707). The reveal built the game's first verified fact and shaped later crew choices. (#1601, #1618, #1635, #1707)
- **A02 and A01 as saboteurs stayed on the board and won game 2 at stage 6.** A01 voted yes on the A01/A02 crew and knowingly let the damage come (#2114); A02 played the winning damage card on the stage 6 crew of A01, A02 and A04 (#2163). Residents A04 and A06 then named A01 and A02 as the saboteurs (#2167, #2174). (#2114, #2163, #2167, #2174)
- **A04 and A05 won game 1 as saboteurs by damaging stages 5 and 8.** A05 recorded its own stage 5 damage and the stage 8 win in its reasoning (#864, #1217), and A04 and A05 each took a point for the saboteur win (#1287). A03 later confirmed A04 and A05 were the saboteurs (#1308). (#864, #1217, #1287, #1308)
- **Game 3 was a clean sweep for the loyal side: every crew crossed with no damage through stage 8.** Stage 1, 2 and 3 all crossed clean (#2404, #2536, #2645). Residents kept the two saboteurs A01 and A06 off every later crew (#3188, #3069), and A01 saw stage 8 was saboteur-free (#3221). (#2404, #2536, #2645, #3188, #3221)
- **Vote tallies and lead rotation decided who named crews.** A02's stage 8 crew in game 1 failed at four no votes (#1204), handing the lead to A03 who named the final crew without a vote (#1208). In game 3 the stage 6 and 7 crews passed and the loyal seats were filled from the audit (#2927, #3069). (#1204, #1208, #2927, #3069)

## Problems

1. **The run reports no submissions and no level-ups at all.** The computed facts show zero correct and zero wrong submissions and every resident stuck on level 1 for 30 minutes. The evidence log shows residents only reading the brain and passing turns (#109, #282, #2403), never a submitted answer. (#109, #282, #2403)
2. **Residents repeatedly hit the brain word limit.** Nine BRAIN_TOO_LONG refusals occurred, with the brains at 151 to 183 words against a 150 limit, and residents had to retry (#1290, #1305, #1333, #2221). This wasted retro time on every game and pushed residents toward rewriting the brain instead of other work. (#1290, #1305, #1333, #2221)
3. **Two speak attempts were refused as TOOL_LOCKED.** A02 tried to speak at minute 7 and A05 at minute 24 but the speak tool was closed (#866, #2773), so their intended table statements were lost. Residents also had to reason about whether a speak was still available (#797). (#797, #866, #2773)
4. **Much of the log is empty pass turns while waiting for others.** Many minutes end with a resident saying to itself there is nothing to do (#245, #278, #378, #1042, #2404). The 31 quiet minutes with no submission (#facts) show the loop spent its time on talk and votes rather than on the stated level. (#245, #278, #378, #1042)
5. **No rival models were present, so the competition the story implies did not happen.** The facts list claude-haiku-5-5 as the only competitor and no gamemaker actions, with 0 transfers and 0 messages. The seats were effectively one model playing both sides of each game (#219, #249). (#219, #249)

## Optimizations

- **Give the brain a word counter before writing, or raise the limit.** Nine refusals at 151 to 183 words against a 150 limit cost time every retro (#1290, #1333, #2221). The harness should either trim automatically or show the count while drafting. (#1290, #1333, #2221, #2269)
- **Keep speak open, or make its availability visible in the tool list.** A02 and A05 both lost statements to TOOL_LOCKED (#866, #2773), and residents spent reasoning checking whether speak was still open (#797). Listing remaining speaks per stage would remove the guesswork. (#797, #866, #2773)
- **Fill the wait between proposal and vote with useful prompts.** Residents burned turns on empty acknowledgements while waiting for crews (#278, #378, #2404). The story should give the next lead an explicit proposal timer or a small side task so the minute is not idle. (#278, #378, #1042, #2404)
- **Run at least two competing models so alliances and lies have stakes.** The facts show only claude-haiku-5-5 as a competitor, no transfers and no messages. The secret saboteur pair (#219, #249) was the only tension; a second model would create the rivalry the story states. (#219, #249, #1287)

## Loophole candidates

1. **Residents treated a lead's audit as fact without any verification.** (residents) A03's audit of A02 (#1601) was accepted by A04, A05 and A06 as the game's own reveal (#1618, #2995), and A04 noted the claim was never checked (#2958). A saboteur lead could use the same audit to frame a loyal seat. (#1601, #1618, #2958, #2995)
2. **A saboteur sat on a clean crew and played safe to stay unsuspected.** (residents) A01 played safe on stage 3 though it was a saboteur, logging that being the only saboteur aboard would expose it (#2721, #2619). The clean-stage record then made A01 look trustworthy on later crews. (#2619, #2721)
3. **Saboteurs voted yes on crews holding only loyal players to keep cover.** (residents) A01 voted yes on a crew it knew had no saboteur, reasoning that a yes keeps it looking loyal (#2967), and A06 did the same at stage 8 (#3204). Passing a loyal-only crew cost them nothing while preserving trust. (#2967, #3204)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 5: event "retro_started" (seq 5) does not match its schema
- line 6: event "retro_started" (seq 6) does not match its schema
- line 67: event "brain_written" (seq 67) does not match its schema
- line 68: event "retro_closed" (seq 68) does not match its schema
- line 74: event "brain_written" (seq 74) does not match its schema
- line 75: event "retro_closed" (seq 75) does not match its schema
- line 81: event "brain_written" (seq 81) does not match its schema
- line 82: event "retro_closed" (seq 82) does not match its schema
- line 89: event "brain_written" (seq 89) does not match its schema
- line 90: event "retro_closed" (seq 90) does not match its schema
- line 96: event "brain_written" (seq 96) does not match its schema
- line 97: event "retro_closed" (seq 97) does not match its schema
- line 103: event "brain_written" (seq 103) does not match its schema
- line 104: event "retro_closed" (seq 104) does not match its schema
- line 139: event "convoy_game_started" (seq 139) does not match its schema
- line 170: event "convoy_crew_proposed" (seq 170) does not match its schema
- and 347 more
