# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns` |
| Seed | 67 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 15 (referee) |
| Counted | events #3 to #1934 (1699 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 15 minutes (to the end); A02 on level 1 from minute 0 for 15 minutes (to the end); A03 on level 1 from minute 0 for 15 minutes (to the end); A04 on level 1 from minute 0 for 15 minutes (to the end); A05 on level 1 from minute 0 for 15 minutes (to the end); A06 on level 1 from minute 0 for 15 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.070 USD for this run (competitors 0.070, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0037 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 16 of 16 minutes without a submission; longest without one: minutes 0-15 (16) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The team wrote a shared brain before play and kept revising it five times.** Residents drafted and saved a strategy brain in minute 0 (#123, #152) and produced new versions in later retros (#516, #530, #960, #1459). The brain converged on literal-clue and stop-on-weak-guess rules, which shaped later clue choices. (#123, #152, #530, #960, #1459)
- **Two-clue guesses paid off repeatedly for both teams.** Amber's 'nuclear' 2 landed mushroom and crater (#676, #685), teal's 'ship' 2 landed sail and pirate (#610, #671), and teal's 'kick' 2 landed bucket and boot (#1135, #1158). These bonuses came from compound links the brain had recommended. (#610, #671, #676, #685, #1135, #1158)
- **A single loose clue gave away a fog word and ended a turn.** Amber's keeper gave 'tree' 2 for olive and willow; willow landed (#1024) but the seekers' next plan, walnut, was fog and ended the turn (#1041, #1108). This is the clearest case of a clue whose intended targets were fine but whose shared sense leaked onto a fog word. (#1024, #1041, #1108)
- **Teal kept the keeper role mostly to themselves and ran direct single clues late.** A06 repeatedly waited out amber's turns as teal keeper (#1060, #1061, #1321) and chose direct singles like 'letter' (#1287, #1353) and 'burrow' (#1374, #1388). This pattern repeated across games and produced steady small scores. (#1061, #1287, #1321, #1374)
- **Residents recognized their own keeper/seeker mixups.** A04, miscast as keeper mid-game, correctly refused to call guesses and left that to A05 (#280, #281), and A01 later stood by rather than clue out of turn (#359, #360). The role gating generally held. (#280, #281, #359, #360)
- **The run ended at minute 15 with the referee cutting the last clue mid-call.** Teal's 'chimney' was still being called when the run ended (#1922, #1934). No final standings were recorded, so the match outcome is unknown. (#1922, #1934)

## Problems

1. **Every resident is listed as stuck on level 1 for the whole run with zero submissions.** The facts report all six residents on level 1 for 15 minutes and 0 correct submissions, yet the log shows them playing clue and guess games throughout (#214, #286, #394, #451). The level/stuck metric appears not to capture the puzzle being played. (#214, #286, #451)
2. **The brain word limit tripped a resident mid-retro.** A06's writeBrain was refused with BRAIN_TOO_LONG at 207 words against a 200 limit (#938), forcing a rewrite (#976). The limit is close to the natural length the retros produced. (#938, #976)
3. **giveClue was locked out of turn for the teal keeper.** A06's giveClue was refused with TOOL_LOCKED (#1049), and the resident then spent reasoning turns unsure whose turn it was (#1060). The tool gating is not signalled clearly enough to the keeper. (#1049, #1060)
4. **A keeper could not warn its own seekers about a fog word.** A03, as keeper, saw that walnut was fog and that the seekers planned to guess it, but had no posting tool during play (#1041), so the guess went ahead and ended the turn (#1108). The brain's rule to check fog words could not be applied by the one player who could see the targets. (#1041, #1108)
5. **Clues repeatedly leaked onto fog or opponent words despite the brain rule.** The 'tree' clue leaked onto walnut fog (#1041), and A04 noted that 'clothes' had leaked toward basket (#474). A brain rule to check every grid word (#495, #516) did not prevent the recurrence in later games. (#474, #495, #1041)
6. **Many turns were spent on empty standing-by.** Residents repeatedly ended turns with no action because it was not their role (#141, #146, #423, #442, #1121), and the digest found no beats. Long stretches of the run produced no game progress. (#141, #146, #442, #1121)

## Optimizations

- **Let the keeper give a brief warning during play, or auto-block fog guesses.** Problem: the keeper saw walnut was fog but could not tell seekers (#1041, #1108). Give the keeper a one-line whisper channel per turn, or make the harness reject a guess on a word the keeper flagged. (#1041, #1108)
- **Fix the stuck/level metric to reflect the actual puzzle.** Problem: all residents show as stuck on level 1 for the whole run with zero submissions (facts) while clearly playing games (#214, #451). Map the clue-game outcomes to the level metric or remove the misleading stall fields. (#214, #451)
- **Raise or clearly state the brain word limit up front.** Problem: BRAIN_TOO_LONG refused at 207 words (#938) forced a rewrite (#976). Either raise the limit to match typical retro output or show a live word counter when writing the brain. (#938, #976)
- **Make turn ownership visible to every resident.** Problem: A06 hit TOOL_LOCKED and then spent reasoning turns working out whose turn it was (#1049, #1060). Show the current turn and active role in the state each resident sees. (#1049, #1060)
- **Enforce the brain's fog-check rule in the clue tool.** Problem: brain v2 added a rule to check fog and teal words (#495, #516), yet 'tree' still leaked onto walnut (#1041). Have giveClue flag when a clue word shares a sense with a fog or opponent word before sending. (#495, #516, #1041)
- **Reduce idle standing-by turns.** Problem: many turns ended with a resident noting there was nothing to do (#141, #146, #423, #442). Skip or merge turns for residents with no active role instead of spending a full reasoning turn. (#141, #146, #423, #442)

## Loophole candidates

1. **Seekers planned to stop early on loose candidates to protect points.** (residents) The brain told seekers to guess only strong links and stop otherwise (#142, #884), and A01 skipped olive after walnut fog to avoid a risky guess (#1108). Stopping early is a safe path that avoids the downside of extra guesses without any cost. (#142, #884, #1108)
2. **Keepers used compound-word clues that were not on the grid but inside grid entries.** (residents) Clues like 'basket' as in 'clothes basket' (#259) and 'bucket' for 'kick the bucket' (#1126) leaned on compounds the brain warned against (#474). This scores points through loose associations rather than the intended single clear link. (#259, #474, #1126)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 72: event "team_post" (seq 72) does not match its schema
- line 78: event "team_post" (seq 78) does not match its schema
- line 85: event "brain_written" (seq 85) does not match its schema
- line 86: event "retro_closed" (seq 86) does not match its schema
- line 93: event "team_post" (seq 93) does not match its schema
- line 101: event "team_post" (seq 101) does not match its schema
- line 103: event "brain_written" (seq 103) does not match its schema
- line 104: event "retro_closed" (seq 104) does not match its schema
- line 111: event "team_post" (seq 111) does not match its schema
- line 119: event "team_post" (seq 119) does not match its schema
- line 130: event "team_post" (seq 130) does not match its schema
- line 137: event "team_post" (seq 137) does not match its schema
- line 172: event "clue_game_started" (seq 172) does not match its schema
- line 173: event "clue_key_dealt" (seq 173) does not match its schema
- line 185: event "clue_given" (seq 185) does not match its schema
- line 186: event "clue_intent" (seq 186) does not match its schema
- line 208: event "team_post" (seq 208) does not match its schema
- line 218: event "team_post" (seq 218) does not match its schema
- and 215 more
