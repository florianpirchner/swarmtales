# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy` |
| Seed | 104 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 35 (referee) |
| Counted | events #7 to #3730 (3337 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 35 minutes (to the end); A02 on level 1 from minute 0 for 35 minutes (to the end); A03 on level 1 from minute 0 for 35 minutes (to the end); A04 on level 1 from minute 0 for 35 minutes (to the end); A05 on level 1 from minute 0 for 35 minutes (to the end); A06 on level 1 from minute 0 for 35 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.195 USD for this run (competitors 0.195, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0062 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 36 of 36 minutes without a submission; longest without one: minutes 0-35 (36) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 9, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **No resident ever got past level 1 or made a submission.** All six residents sat on level 1 from minute 0 to the referee stop at minute 35, with 0 submissions and 0 correct or wrong answers. The only activity in the log is reasoning, self-talk and tool churn, never a level attempt. (#17, #25, #3730)
- **Residents burned their opening minutes on brain-writing and locked tools.** Several residents (A01 #25, A02 #64, A04 #55, A06 #33) opened by planning to viewConvoy and readBrain and to draft a short brain. writeBrain then locked (#108, #113, #118, #124), leaving them to say they were merely waiting for a game. (#25, #64, #108, #113, #124)
- **Residents reasoned about a hidden-role bluff game that the run never put in play.** Residents repeatedly reasoned as 'saboteur' or 'loyal' and weighed crews, votes and audits (e.g. A03 #197, A05 #206, A02 #188). None of that produced a submission, so the deduction work never touched the level. (#188, #197, #206)
- **Tool listing errors hit the strategy-brain path hard.** The BRAIN_TOO_LONG refusal recurs across residents (A01 #1284, #1317; A05 #1278; A06 #1297; A04 #2546; later A01 #2576, #2598, #2624, #2632) and TOOL_LOCKED appears at #1905 when A05 tried to speak. These errors consumed turns that could have gone to the level. (#1278, #1284, #1297, #1317, #1905)
- **Suspicion chains formed and dissolved entirely inside private reasoning.** A06 deduced A03 and A05 as saboteurs from the stage-3 damage count (#545, #546), A04 reached A05 via an audit (#572), and A01 later concluded A03's admission confirmed the pair (#686, #687). These are coherent deductions, but they were private thoughts the other residents never saw, so the game state never changed. (#545, #546, #572, #686)
- **Residents talked about the game being over and a second game starting.** At minute 10-11 residents declared the convoy had crossed all 8 stages and that game 2 would start (A02 #1309, A03 #1326, A04 #1338, A05 #1357, A01 #1366). The run's computed facts record no levels solved and no submissions, so this in-fiction result never happened in the harness. (#1309, #1326, #1338, #1357, #1366)

## Problems

1. **The run stalls completely: no submission in any of the 36 minutes.** Every resident is stuck on level 1 for the whole run, with 0 correct and 0 wrong submissions and quiet minutes 0-35. Nothing in the log shows an attempt at the level, only conversation about it. (#17, #64, #3730)
2. **The brain tool locks new residents out before they can use it.** writeBrain is closed almost immediately (#108, #113, #118, #124), so residents' stated plan to 'check the convoy first, then write the brain' (#25, #55) is defeated within the first minute. They then spend turns saying they are waiting for a game (#131, #136). (#108, #113, #118, #131)
3. **The brain word limit is misjudged repeatedly, producing nine refusals.** BRAIN_TOO_LONG fires at #1278, #1284, #1297, #1317, #2546, #2576, #2598, #2624 and #2632, each a whole wasted turn. Residents were told a 150-word cap but drafted 151-181 words. (#1278, #1284, #1297, #1317, #2546)
4. **A resident was refused a speak action it thought was open.** A05 tried to speak at #1905 and got TOOL_LOCKED, yet elsewhere residents were told the talk phase was open (#1917). The active-tools notice is inconsistent with the phase, so residents waste turns probing it. (#1905, #1917)
5. **Residents confuse the social bluff frame with the actual level task.** Residents spend the run on crews, votes, audits and saboteur hunts (#197, #206, #409, #502) and never address the 'convoy' level itself. The design intent of solving levels is lost under the role-play. (#197, #206, #409, #502)
6. **Residents believe the game ended and they won or lost when no level was solved.** Multiple residents state the convoy crossed all 8 stages and game 2 begins (#1309, #1326, #1357, #1366), while the facts show zero levels solved. The harness and the residents' world model are out of sync. (#1309, #1326, #1357, #1366)

## Optimizations

- **Make the level itself the allowed action in the first minutes.** Because no resident ever submitted a move (#17 through #3730), expose the level action as the primary tool alongside viewConvoy and gate the social layer behind a first submission. This addresses the stall on level 1. (#17, #3730)
- **Do not lock writeBrain before the resident has read the level.** writeBrain locked within minute 0 (#108, #113, #124) after residents planned to read then write (#25, #55). Open the brain tool for at least one full turn after the convoy view, or preload a fitting brain. (#25, #55, #108, #124)
- **Enforce the word limit in the editor, not by refusal.** Nine BRAIN_TOO_LONG refusals (#1278, #1284, #1297, #1317, #2546, #2576, #2598, #2624, #2632) each cost a full turn. Reject only content over 150 words with a live counter, or truncate, instead of a hard refusal. (#1278, #1284, #1317, #2576)
- **Sync the active-tools notice with the current phase.** A05's speak was refused as TOOL_LOCKED (#1905) while the talk phase was open (#1917). Have the harness emit one authoritative tool list per phase and never advertise a tool that is locked. (#1905, #1917)
- **Ground residents in the real run state, not an imagined endgame.** Residents declared the convoy crossed all 8 stages and game 2 starting (#1309, #1326, #1357, #1366) while zero levels were solved. Inject a factual end-of-run note so private wrap-ups match the harness's count. (#1309, #1326, #1357, #1366)
- **Prompt residents to convert deduction into a level action.** Residents produce coherent saboteur deductions (#545, #572, #686) but never spend them on a submission. Add a rule that each talk turn must be followed by a level move or an explicit pass. (#545, #572, #686)

## Loophole candidates

1. **Residents treat self-talk and end-turn replies as productive play while the level goes untouched.** (residents) Residents repeatedly end their turn with SAYS TO ITSELF notes instead of acting (#131, #136, #231, #236, #290, #362), which satisfies the turn without advancing the level. (#131, #136, #231, #236, #290)
2. **Residents stay silent to avoid looking suspicious rather than solving anything.** (residents) Several residents deliberately hold their last speaking line and skip it to keep a low profile (A04 #662, #663; A06 #361, #362; A05 #1976, #1977), turning the social layer into a harmless stalling mechanism. (#662, #663, #1976, #1977)
3. **Declaring the game over lets residents stop working without penalty.** (residents) Residents conclude the convoy has crossed all 8 stages and settle into waiting for game 2 (#1309, #1326, #1349, #1357), which ends their effort for the remaining minutes. (#1309, #1326, #1349, #1357)

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
- line 88: event "brain_written" (seq 88) does not match its schema
- line 89: event "retro_closed" (seq 89) does not match its schema
- line 95: event "brain_written" (seq 95) does not match its schema
- line 96: event "retro_closed" (seq 96) does not match its schema
- line 102: event "brain_written" (seq 102) does not match its schema
- line 103: event "retro_closed" (seq 103) does not match its schema
- line 138: event "convoy_game_started" (seq 138) does not match its schema
- line 166: event "convoy_crew_proposed" (seq 166) does not match its schema
- and 373 more
