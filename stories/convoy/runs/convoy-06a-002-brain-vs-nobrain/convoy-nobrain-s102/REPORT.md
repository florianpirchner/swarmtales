# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy-nobrain` |
| Seed | 102 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 31 (referee) |
| Counted | events #2 to #3440 (3102 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 31 minutes (to the end); A02 on level 1 from minute 0 for 31 minutes (to the end); A03 on level 1 from minute 0 for 31 minutes (to the end); A04 on level 1 from minute 0 for 31 minutes (to the end); A05 on level 1 from minute 0 for 31 minutes (to the end); A06 on level 1 from minute 0 for 31 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.185 USD for this run (competitors 0.185, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0058 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 32 of 32 minutes without a submission; longest without one: minutes 0-31 (32) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 4 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Six residents spend the whole run on level 1 and never make a submission.** A01–A06 all sit on level 1 from minute 0 to minute 31 and the run ends with 0 submissions, 0 correct and 0 wrong. Every minute 0–31 is quiet (#3440). (#3440)
- **The only city action recorded is a run of four TOOL_LOCKED refusals spread across all three games.** A01's speak is refused at #1517, A05's voteConfidence at #2008, A01's accuse at #2244 and A01's playCrewCard at #3231, each as 'not available to you at this level or in this phase'. These are the only RESOLVED facts the city itself records. (#1517, #2008, #2244, #3231)
- **The residents play three separate convoy games inside one 31-minute run while the scoreboard shows nothing.** A06 says 'Game 1 is over and the loyal seats won' at #1090, A02 says 'Game 2 is over and the loyal seats won' at #2201, and A02 says 'Game 3 has ended' at #3401, but the facts record no level-ups and 0 submissions. (#1090, #2201, #3401)
- **An audit turns a hidden saboteur into a public fact and the loyal side wins game 1.** A05 spends the audit on A01's stage 3 card; A04 states at #1522 that 'the audit shows A01 played damage on stage 3, so A01 is a saboteur', and every later crew excludes A01 and A02. A06 records the result at #1090 with one damaged stage of eight crossed. (#1090, #1522)
- **The same audit pattern repeats in game 2, where A05 exposes A02's stage 2 damage.** A03 states at #2560 that 'the audit shows A02 played damage in stage 2', and A02 privately accepts the exposure at #2570. A02 later concedes at #2201 that the saboteurs only reached three damaged stages. (#2201, #2560, #2570)
- **Several residents privately compute that the saboteurs are mathematically eliminated and then vote yes regardless.** A05 says at #837 'Saboteurs can't win anymore', A02 says at #3123 the count 'looks out of reach', and A05 says at #990 the loyal side is 'guaranteed to win'. A01, A02 and A06 then keep voting yes on crews they cannot stop (#3151, #3157, #3305). (#837, #990, #3123, #3151, #3157, #3305)

## Problems

1. **The run produces no solvable output: every resident stalls on level 1 for the full 31 minutes.** The facts show 0 submissions, 0 correct and 0 wrong over 3102 events, and every resident stuck from minute 0 to 31. Nothing in the log changes that: residents only ever speak, vote and view the convoy. (#3440)
2. **The residents believe they are playing a convoy/among-us game, not the venue's puzzle levels.** The reasoning is entirely about crews, saboteurs, cooldowns and audits (#298, #510, #1507), and A02 explicitly narrates 'Game 1', 'Game 2', 'Game 3' (#1090, #2201, #3401). The story was designed as a competition for seats, but the residents never treat the levels as the task. (#298, #1090, #1507, #3401)
3. **Level-1 residents are locked out of the very tools their role needs.** A01's speak is refused at #1517, A05's voteConfidence at #2008, A01's accuse at #2244 and A01's playCrewCard at #3231. The refusals cite level and phase gates, which matches the fact that all six residents stay on level 1 all run. (#1517, #2008, #2244, #3231)
4. **The game can end with the saboteur side unable to win while turns keep being spent anyway.** From #837 and #3123 onward the residents know at most three damaged stages are reachable, yet they keep talking, voting and ending turns until minute 31 (#3379, #3440). This burns the run on a decided game. (#837, #3123, #3379, #3440)
5. **The accusation phase is deferred and never becomes usable inside the run.** A06 at #1044, A02 at #2188, A02 at #3400 and A06 at #3405 all find only viewConvoy open and accuse deferred. A01 is refused outright at #2244, so the post-game step the rules promise is effectively dead. (#1044, #2188, #2244, #3400, #3405)
6. **The gamemaker records no actions and no labels, so nothing tags the three hidden games.** The facts show 'no actions' for the gamemaker and no labels, while the residents themselves are the only source of segmentation (#1090, #2201, #3401). The designers get no per-game record beyond the raw log. (#1090, #2201, #3401)

## Optimizations

- **Give level 1 the tools the role needs, or start residents above the gate.** The four refusals (#1517, #2008, #2244, #3231) all say the tool is locked at this level or phase. If level 1 is meant to be played, its residents should be able to speak, vote and play cards; otherwise start them at the level where those tools unlock. (#1517, #2008, #2244, #3231)
- **Make the level the residents are scored on the explicit task in the prompt and the state shown to them.** Residents reason about crews and audits rather than the levels (#298, #510) and narrate their own game numbering (#1090). The harness should restate the level goal each turn and show level progress, not just the convoy view. (#298, #510, #1090)
- **End or re-roll a game as soon as the resident-winning side is mathematically decided.** A05 at #837 and A02 at #3123 compute that four damages are unreachable, and the game still runs to minute 31. The referee should cut a decided game and spend the remaining minutes on a fresh one. (#837, #3123, #3440)
- **Resolve the first TOOL_LOCKED in-loop so it cannot recur four times across three games.** The refusals at #1517 and #3231 are the same resident hitting the same kind of gate. The harness should tell the resident its current phase up front, or drop blocked tools from activeTools, rather than waiting for the attempt. (#1517, #3231)
- **Have the gamemaker label or mark game boundaries so the report and the players' history align.** The gamemaker takes no actions and applies no labels, so the three games exist only in private say-to-self lines (#1090, #2201, #3401). A gamemaker event at each convoy result would give the digest real beats and keep the facts consistent with the log. (#1090, #2201, #3401)

## Loophole candidates

1. **The accusation step is sealed and unscored, so residents treat it as free and some consider lying in it.** (residents) A05 weighs accusing loyal seats to mislead at #1063 because 'the accusation is sealed and unscored', and A01 considers the same at #2241. They are stopped only because the tool is locked (#2244), not by any rule. (#1063, #2241, #2244)
2. **Residents vote yes to keep trust even when they know the crew is harmless to their side.** (residents) A05 votes yes at #837 and #3151 purely to avoid looking odd once the saboteurs cannot win, and A02 does the same at #3151 and #3257. Voting becomes a cheap reputation move rather than a decision about the level. (#837, #3151, #3257)

## Log issues

- line 1: event "convoy_game_started" (seq 1) does not match its schema
- line 14: event "convoy_crew_proposed" (seq 14) does not match its schema
- line 22: event "convoy_spoken" (seq 22) does not match its schema
- line 31: event "convoy_spoken" (seq 31) does not match its schema
- line 40: event "convoy_spoken" (seq 40) does not match its schema
- line 49: event "convoy_spoken" (seq 49) does not match its schema
- line 58: event "convoy_spoken" (seq 58) does not match its schema
- line 67: event "convoy_spoken" (seq 67) does not match its schema
- line 74: event "convoy_spoken" (seq 74) does not match its schema
- line 93: event "convoy_spoken" (seq 93) does not match its schema
- line 126: event "convoy_spoken" (seq 126) does not match its schema
- line 133: event "convoy_spoken" (seq 133) does not match its schema
- line 135: event "convoy_votes_revealed" (seq 135) does not match its schema
- line 142: event "convoy_card_played" (seq 142) does not match its schema
- line 159: event "convoy_card_played" (seq 159) does not match its schema
- line 160: event "convoy_stage_revealed" (seq 160) does not match its schema
- line 185: event "convoy_crew_proposed" (seq 185) does not match its schema
- line 194: event "convoy_spoken" (seq 194) does not match its schema
- line 203: event "convoy_spoken" (seq 203) does not match its schema
- line 212: event "convoy_spoken" (seq 212) does not match its schema
- and 318 more
