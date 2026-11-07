# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy` |
| Seed | 102 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 35 (referee) |
| Counted | events #7 to #3626 (3247 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 35 minutes (to the end); A02 on level 1 from minute 0 for 35 minutes (to the end); A03 on level 1 from minute 0 for 35 minutes (to the end); A04 on level 1 from minute 0 for 35 minutes (to the end); A05 on level 1 from minute 0 for 35 minutes (to the end); A06 on level 1 from minute 0 for 35 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.189 USD for this run (competitors 0.189, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0062 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 36 of 36 minutes without a submission; longest without one: minutes 0-35 (36) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 16, other 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Two damaged stages in game 1 flagged A05 and A06 as saboteurs, but no accusation was legal before the game ended.** A05 played the stage 7 damage and A06 the stage 3 damage, giving two of the three saboteur-wins; the loyal side still crossed stages 1-8. A04 and A03 both tried to accuse and the city refused the call as malformed. (#1059, #1089, #2392, #2418)
- **In game 2 the saboteurs A01 and A02 split their damage across stages 4, 7 and 8 and won.** A02 damaged stage 4 and A01 damaged stage 8 while A03 led a four-seat crew, so the convoy stopped at stage 8 with three damaged stages. A01 said so itself at the end: it played the decisive stage 8 card. (#1799, #2344, #2396, #2397)
- **In game 3 the loyal side won by locking A02 and A06 off every crew after the stage 3 double damage.** Stage 3 took two damage cards from the three-seat crew A05/A02/A06 (#2911), and after that A03, A04 and A05 built crews without either suspect. Stages 4-8 all crossed clean and A03 led the final clean four-seat crew (#3493). (#2911, #3018, #3307, #3493)
- **The audit became the loyal side's main tool and twice cleared the right seat.** A06 audited A05 on stage 4 and found it safe (#1860, #1861); on stage 3 the lead's audit cleared A05 again, which pinned both damage cards on A02 and A06 (#2922, #3071). Loyal seats treated the audit as proof, and the deduction held. (#1861, #2922, #3071)
- **Every crew vote in all three games passed almost unanimously before suspicion ever mattered.** Stage 1 and 2 votes went 6-0 and early stage votes were all yes (#1578, #1687, #1817); the first real no-vote fight came only on A04's stage 4 crew in game 1 and A06's stage 6 crew in game 2. Residents repeatedly voted yes with no information and said so in private. (#663, #1578, #1687, #1817)

## Problems

1. **Thirteen of sixteen writeBrain calls were refused for exceeding the 150-word limit.** Both the initial brains and almost every post-game revision came back BRAIN_TOO_LONG, with six residents refused and several retried down 151-178 words. The limit is not being met, so the learning loop mostly fails. (#105, #1260, #1266, #1296, #2490, #2509, #2537)
2. **The accusation tool rejected the two accusations that were actually attempted.** A04 and A03 both built long card-chain reasons and were refused for reasons over 400 characters, and no accusation ever landed. The only accusation window is the endgame, and it is easy to lose to a length rule. (#2392, #2418)
3. **The run's whole first game produced no checkable outcome at the harness level.** The computed facts report 0 submissions, 0 transfers, 0 messages and no level solved, while the log shows three full games played with damage, votes and reveals. The harness is not recording the convoy game's actions, so the report's metrics contradict the players' record. (#1089, #2397, #2911)
4. **Residents misread the damage cooldown and argued about it for stages.** A03 and A04 ran long private chains on whether 'at most once in 3 stages' blocks stages 4 and 5 or 4-6, and A05 had to correct A03 on the same point. The rule's wording is being used as a deduction tool without ever being settled. (#2903, #2949, #2975, #3017)
5. **Loyal seats voted yes on crews with no information and then had nothing to do.** Private notes show residents ending turns because a stage was blind and their yes was sealed, and the report counts 36 of 36 quiet minutes with no submission. Early stages generate talk but no decisions. (#173, #304, #318, #1636)
6. **The gamemaker took no actions at all across the run.** The facts record 0 gamemaker actions and 0.000 USD gamemaker cost, yet the story is 'convoy' and the residents played three games. The narrative pressure the designers wanted never came from the gamemaker. (#17, #2525, #3626)

## Optimizations

- **Give writeBrain a word counter and a hard cap in the prompt.** Before accepting the call, show the resident the current word count and the 150 limit, or allow a short auto-trim; thirteen refusals at #105 and #2490 show the cap alone is not enough. (#105, #2490, #2509)
- **Shorten or split the accuse reason field instead of refusing the whole call.** Cap the free-text reason at 400 characters up front and let the seats list carry the deduction; both #2392 and #2418 were lost to an overlong reason after correct seat lists. (#2392, #2418)
- **Record convoy actions in the harness facts.** The report claims no submissions, no transfers and no messages while the log shows damage, votes and reveals (#1089, #2911); the metrics should count these or the designers cannot judge the run. (#1089, #2911, #3493)
- **Publish the cooldown rule in plain wording.** Residents burned turns on 'once in 3 stages' semantics (#2903, #2949, #3017); a single worked example in the rules block would remove that dispute. (#2903, #2949, #3017)
- **Make early stages cost something.** Stage 1 and 2 votes are blind 6-0 affairs (#1578, #1687) and residents end turns early; a forced rotation or a two-seat audit choice would give the early talk weight. (#1448, #1578, #1687)
- **Give the gamemaker an event or two per game.** The gamemaker made no actions in the whole run while residents filled the time with talk; a scripted pressure event (a forced early audit, a public cooldown reveal) would restore its role. (#1312, #3626)

## Loophole candidates

1. **Saboteurs win by stacking the last two stages while the loyal side keeps trusting clean records.** (residents) A05 stayed clean through stages 2, 4 and 5 before damaging stage 7 (#1089), and A01 held its damage until the final stage 8 (#2344). A clean record is being read as clearance even though saboteurs can simply wait. (#1089, #1308, #2344)
2. **Both saboteurs can damage the same crew in one stage and still win the deducing game.** (residents) A02 and A06 put two damage cards on one three-seat stage (#2911), which did narrow it to two suspects, but the paired double damage is a cheap way to rush the three-stage threshold. (#2813, #2911)
3. **Loyal seats accumulate only on clean-record crews, so excluded loyal seats stop participating.** (residents) After stage 3 in game 3 the crews were built only from A01/A03/A04/A05 (#3493), and A02 and A06 had nothing to do for three stages (#3155, #3410); the deduction ends the game as a contest. (#3155, #3410, #3493)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 5: event "retro_started" (seq 5) does not match its schema
- line 6: event "retro_started" (seq 6) does not match its schema
- line 66: event "brain_written" (seq 66) does not match its schema
- line 67: event "retro_closed" (seq 67) does not match its schema
- line 73: event "brain_written" (seq 73) does not match its schema
- line 74: event "retro_closed" (seq 74) does not match its schema
- line 81: event "brain_written" (seq 81) does not match its schema
- line 82: event "retro_closed" (seq 82) does not match its schema
- line 89: event "brain_written" (seq 89) does not match its schema
- line 90: event "retro_closed" (seq 90) does not match its schema
- line 97: event "brain_written" (seq 97) does not match its schema
- line 98: event "retro_closed" (seq 98) does not match its schema
- line 139: event "brain_written" (seq 139) does not match its schema
- line 140: event "retro_closed" (seq 140) does not match its schema
- line 142: event "convoy_game_started" (seq 142) does not match its schema
- line 151: event "convoy_crew_proposed" (seq 151) does not match its schema
- and 359 more
