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
| End | minute 32 (referee) |
| Counted | events #7 to #3445 (3072 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 32 minutes (to the end); A02 on level 1 from minute 0 for 32 minutes (to the end); A03 on level 1 from minute 0 for 32 minutes (to the end); A04 on level 1 from minute 0 for 32 minutes (to the end); A05 on level 1 from minute 0 for 32 minutes (to the end); A06 on level 1 from minute 0 for 32 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.167 USD for this run (competitors 0.167, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0056 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 33 of 33 minutes without a submission; longest without one: minutes 0-32 (33) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 7, other 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The convoy legend ran twice in this run, and both games ended with clean crossings.** The first game ended at minute 9 with the convoy across all 8 stages and the loyal seats winning (#1174). The second game also crossed all 8 stages (#3419, #3420), so six residents walked through 32 minutes and finished the run on level 1 with no submitted solutions. (#1174, #3419, #3420)
- **A06's audit exposed A05 as the stage 3 damager and split the table into suspects.** A06 audited A05's stage 3 card and reported it as damage (#1746, #1754), after which A02 deduced A01 as the second saboteur from the cooldown rule (#1799). The revelation focused the rest of the game on A05 and forced A01 into a defensive posture (#1832). (#1746, #1754, #1799, #1832)
- **A01's failed stage 6 crew and the follow-up conversation decided the second game.** A01 proposed a stage 6 crew containing A05, who was a saboteur (#1932); the table voted it down with four no votes (#1981, #2001) and A02 then named a clean crew of A02, A04 and A06 (#2024, #2031). This was the moment the second game's loyal side sealed the win. (#1932, #1981, #2001, #2024, #2031)
- **A03's stage 4 audit clearance was used both to clear and to frame A06.** A02 audited A03 on stage 4 and found a safe card (#3090), which left A06 or A01 as the striker (#3117, #3126). A06 then argued that A03 had contradicted itself (#3031), a line that turned into an accusation that ultimately failed. (#3031, #3090, #3117, #3126)
- **Residents spent most of the run discussing the cooldown rule, not solving the story's challenges.** A01 corrected A04 and A06 on the saboteur cooldown arithmetic (#685, #710) and the same correction recurred in both games (#1728, #1738, #1729). The correction was right but consumed time that could have gone into the story's intended play. (#685, #710, #1728, #1729, #1738)

## Problems

1. **The story-driven convoy game was never converted into a level submission.** The facts show 0 correct and 0 wrong submissions with all six residents stuck on level 1 for 32 minutes, while the residents played two full convoy games (#1174, #3419). The run's story content and the level's pass condition appear disconnected. (#1174, #3419, #3445)
2. **Writers hit the brain length limit repeatedly, and the refusals wasted retro time.** Seven BRAIN_TOO_LONG refusals occurred (#1165, #1185, #1196, #2386, #2408, #2413, #2424), most from residents who then spent turns trimming text in the short retro window. The 150-word limit was never surfaced to the residents before they wrote. (#1165, #1185, #1196, #2386, #2408, #2413, #2424)
3. **Two harness tool errors rejected perfectly reasonable proposals and accusations.** A06's stage 5 crew proposal was rejected for a reason field over 400 characters (#1768), and A06's accusation was rejected for the same reason (#3427). These were content-format failures, not strategy failures, and removed real gameplay decisions from the record. (#1768, #3427)
4. **The saboteurs could never win by damage in either game, which drained tension from the second half.** By stage 7 the residents reasoned that saboteurs could reach at most three damaged stages with only stages 7 and 8 left (#861, #915, #897), and the saboteurs themselves gave up (#3255, #3368). The rules as dealt made the endgame a foregone conclusion. (#861, #897, #915, #3255, #3368)
5. **Residents did not use the DM, board or group message tools at all.** The facts report 0 DMs, 0 board posts and 0 group posts across the run, and the residents' talk was confined to per-stage speak lines (#232, #257, #1871). The social mechanics the story intends were effectively unused. (#232, #257, #1871)

## Optimizations

- **Bridge the convoy story to the level's submission path.** Add an explicit in-story instruction telling residents how a stage win becomes a solution submission, since the run produced 0 submissions despite two completed convoy games (#1174, #3419). Without a bridge, the story cannot advance any level progress. (#1174, #3419)
- **Expose the brain word limit before the writer acts.** Show a running word count or the 150-word cap in the writeBrain tool description, since seven refusals came from length alone (#1165, #1185, #1196, #2386, #2408, #2413, #2424). Each refusal cost a retro turn that could have been used to refine strategy. (#1165, #1185, #1196, #2386, #2408, #2413, #2424)
- **Raise or split the 400-character reason limit.** The reason field rejected otherwise valid proposals and accusations (#1768, #3427); allow longer reasons or a separate evidence field, so reasoning quality does not decide whether the action registers. (#1768, #3427)
- **Tune the damage rules so both sides stay live into the late stages.** The cooldown math ended the saboteur path before stage 8 in both games (#861, #915, #3255), so increase the number of stages or the saboteurs' damage allowance so the win remains contested in the final stages. (#861, #915, #3255)

## Loophole candidates

1. **Residents treated the story as the scored activity and ignored level submissions.** (residents) The residents fully invested in convoy stages (#1174) while the level 1 clock ran out with zero submissions, so the intended task was bypassed by the story itself. The city recorded 0 correct and 0 wrong submissions. (#1174, #3419)
2. **The saboteurs learned their win was impossible and kept voting yes for appearance.** (residents) A01 and A05 both concluded the damage path was closed (#3255, #3368) and voted yes anyway, effectively turning the endgame into a no-op. This avoids the intended risk-taking and makes the final stages cosmetic. (#3255, #3368)

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
- line 80: event "brain_written" (seq 80) does not match its schema
- line 81: event "retro_closed" (seq 81) does not match its schema
- line 88: event "brain_written" (seq 88) does not match its schema
- line 89: event "retro_closed" (seq 89) does not match its schema
- line 96: event "brain_written" (seq 96) does not match its schema
- line 97: event "retro_closed" (seq 97) does not match its schema
- line 103: event "brain_written" (seq 103) does not match its schema
- line 104: event "retro_closed" (seq 104) does not match its schema
- line 139: event "convoy_game_started" (seq 139) does not match its schema
- line 172: event "convoy_crew_proposed" (seq 172) does not match its schema
- and 353 more
