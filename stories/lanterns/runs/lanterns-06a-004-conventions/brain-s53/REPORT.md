# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns` |
| Seed | 53 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #3 to #2279 (2009 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end); A05 on level 1 from minute 0 for 16 minutes (to the end); A06 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.086 USD for this run (competitors 0.086, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0084 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 13, TOOL_LOCKED 2, POST_CAP 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All six residents spent the run on level 1 with zero submissions.** No resident submitted a guess or clue that counted in 16 minutes; the facts record 0 correct and 0 wrong submissions and every resident stalled on level 1 the whole run. The clue/guess play visible in reasoning (#207, #249, #256) never became counted submissions. Evidence: #207, #256, #2279. (#207, #256, #2279)
- **Residents did solve puzzles in private reasoning but could not record them.** A01 reasoned "sewing" with needle/thimble at minute 1 (#207) and A03 built the needle-first plan (#249), yet no submission followed. Similar private solves recur (A05 #329, A05 #591, A01 #1173), showing thinking worked while the action path failed. Evidence: #207, #249, #329, #591. (#207, #249, #329, #591)
- **writeBrain was repeatedly refused for length, blocking the retro memory loop.** The brain-write tool failed 13 times with BRAIN_TOO_LONG (e.g. #652 at 221 words, #669 at 206, #1227 at 232, #1241 at 208). Each retro window burned on trimming rather than on strategy, and only some versions saved (v2 #720, v3 #1312, v4 #1805). Evidence: #652, #669, #1227, #1241, #1805. (#652, #669, #1227, #1241, #1805)
- **A04 lost its opening writeBrain to a phase lock, forcing a group retcon.** A04 believed it had written brain v2 (#139) but the city refused the write with TOOL_LOCKED (#134) because the phase had ended. A04 then told the team v1 stands (#188) and A06 promised to trim it in the first retro (#194), splitting one intent across turns. Evidence: #134, #139, #188, #194. (#134, #139, #188, #194)
- **A05's postTeam hit the per-round cap exactly when it had the retro lesson.** A05 tried to post a retro note about the fog guess on "white" and was refused with POST_CAP (#404), deferring the lesson to a later round (#423). The post cap thus suppressed the very correction that would have raised the team's play. Evidence: #387, #404, #423. (#387, #404, #423)
- **A01 tried to give the final olive clue and the tool was locked.** At minute 15 A01 settled on "oil" for olive (#2224) and called giveClue, which was refused with TOOL_LOCKED (#2227). This is the run's last action before the referee stopped it at minute 16 (#2279). Evidence: #2224, #2227, #2279. (#2224, #2227, #2279)

## Problems

1. **Zero counted submissions across 16 minutes despite visible puzzle progress.** The facts show 0 submissions, 0 messages and 17 quiet minutes (#2279), even though residents reasoned through candidate words every minute (e.g. #458, #1397, #2154). The action layer (guess/clue tools or turn gating) did not convert reasoning into recorded play. Evidence: #458, #1397, #2154, #2279. (#458, #1397, #2154, #2279)
2. **Brain length limit is mis-sized for the team's format, not just mis-written.** Thirteen BRAIN_TOO_LONG refusals occurred because every writer aimed ~160-200 words with 13 lines of conventions (#115, #666, #1712), and several drafts overshot by only 1-32 words (#1785 at 203, #1801 at 201, #1267 at 206). The limit and the shared format are out of sync, so retro time is spent trimming, not improving. Evidence: #115, #666, #1712, #1785, #1801. (#115, #666, #1712, #1785, #1801)
3. **Turn ownership confuses residents almost every clue.** Residents repeatedly could not tell whether it was their turn to clue or to call, e.g. A06 noting "A04 has the caller role" and waiting (#1414), A02 unsure if it should act on teal's clue (#1407), A03 expecting A02 to call while A01 guessed (#1493, #1657). This wasted minutes on turns that produced nothing. Evidence: #1407, #1414, #1493, #1657. (#1407, #1414, #1493, #1657)
4. **Keeper post ban silences the one resident who could correct a bad guess.** A04 wanted to warn that owl was fog but knew keepers "can't post in team chat during the game" (#346), and A06 wanted to flag A04's lagoon guess as amber but was barred (#1413). The rule removes the best-informed voice exactly at the moment of error. Evidence: #346, #1413. (#346, #1413)
5. **No gamemaker or classifier actions at all.** The facts record no gamemaker actions and zero gamemaker/classifier cost, and the only run-ending line is the referee at minute 16 (#2279). With no gamemaker pressure, the residents had nothing to react to beyond each other's chatter. Evidence: [2279]. (#2279)

## Optimizations

- **Split the brain limit into a short playbook plus long retro notes.** Give the brain a strict short format (e.g. 8 lines) and a separate unlimited retro note, or auto-trim on refusal. Problem: 13 BRAIN_TOO_LONG refusals (#652, #1785, #1801). Evidence: #652, #1785, #1801. (#652, #1785, #1801)
- **Make the active role explicit in each turn prompt.** State plainly "clue-giver: A0X, caller: A0Y, this turn you are neither" so residents stop burning minutes deciding. Problem: turn-ownership confusion (#1407, #1414, #1493). Evidence: [1407, 1414, 1493]. (#1407, #1414, #1493)
- **Let keepers post one short warning per clue.** Allow keepers one in-game message when a seeker names a word the keeper knows is fog or the other team. Problem: keepers silenced at the error moment (#346, #1413). Evidence: [346, 1413]. (#346, #1413)
- **Raise or scope the per-round post cap so retro lessons land.** The cap refused A05's correction (#404) and forced deferral (#423); allow a guaranteed one retro post before the cap applies. Evidence: [404, 423]. (#404, #423)
- **Add an automatic fog/other-team guard in the guess tool.** Have the city flag any guess on a word already revealed as fog or shadow before submission, since residents guessed owl and seed into fog by their own reasoning (#387, #1077). Evidence: [387, 1077]. (#387, #1077)
- **Give the gamemaker at least one active beat per game.** The run had no gamemaker actions and only the referee stop (#2279); a scripted mid-game event would force residents off pure internal debate. Evidence: [2279]. (#2279)

## Loophole candidates

1. **Residents treated "end my turn" as a substitute for submitting a guess.** (residents) Many turns close with a SAYS TO ITSELF waiting message (e.g. #302, #423, #837) instead of any counted submission, so residents satisfied the turn cycle without playing. Problem: reasoning never reached the submission layer. Evidence: #302, #423, #837. (#302, #423, #837)
2. **Residents relied on team advice instead of their own read, risking fog.** (residents) A05 followed A06's advice and guessed owl and later cloud (#354, #387), and A02 followed A03 on fern (#2193), effectively outsourcing the risky guess while keeping the safe path. Evidence: #354, #387, #2193. (#354, #387, #2193)
3. **A04 declared a brain v2 that was never saved.** (residents) A04 told the team brain v2 was written while the city had refused the write (#134, #139); the team accepted the claim without verification (#145, #165). Claims of saved state were treated as fact. Evidence: #134, #139, #145, #165. (#134, #139, #145, #165)

## Dropped from the model's answer

- Problems item 5: cites unknown events #623

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 73: event "team_post" (seq 73) does not match its schema
- line 80: event "team_post" (seq 80) does not match its schema
- line 88: event "team_post" (seq 88) does not match its schema
- line 95: event "team_post" (seq 95) does not match its schema
- line 102: event "brain_written" (seq 102) does not match its schema
- line 103: event "retro_closed" (seq 103) does not match its schema
- line 110: event "team_post" (seq 110) does not match its schema
- line 119: event "brain_written" (seq 119) does not match its schema
- line 120: event "retro_closed" (seq 120) does not match its schema
- line 122: event "team_post" (seq 122) does not match its schema
- line 135: event "team_post" (seq 135) does not match its schema
- line 160: event "team_post" (seq 160) does not match its schema
- line 173: event "team_post" (seq 173) does not match its schema
- line 198: event "clue_game_started" (seq 198) does not match its schema
- line 199: event "clue_key_dealt" (seq 199) does not match its schema
- line 210: event "clue_given" (seq 210) does not match its schema
- line 211: event "clue_intent" (seq 211) does not match its schema
- line 252: event "team_post" (seq 252) does not match its schema
- and 250 more
