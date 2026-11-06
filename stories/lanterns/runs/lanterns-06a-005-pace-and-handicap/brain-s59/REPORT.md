# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns` |
| Seed | 59 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 18 (referee) |
| Counted | events #3 to #2388 (2104 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 18 minutes (to the end); A02 on level 1 from minute 0 for 18 minutes (to the end); A03 on level 1 from minute 0 for 18 minutes (to the end); A04 on level 1 from minute 0 for 18 minutes (to the end); A05 on level 1 from minute 0 for 18 minutes (to the end); A06 on level 1 from minute 0 for 18 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.089 USD for this run (competitors 0.089, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0042 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 19 of 19 minutes without a submission; longest without one: minutes 0-18 (19) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 3, BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **No one ever submitted a clue or guess through the tools.** The run computed 0 correct and 0 wrong submissions, 0 transfers and 0 board or group messages, and ended at minute 18 with every resident still on level 1. Residents behaved as if a full lanterns game was being played across games 1-4 (e.g. #261, #789, #1914), but the city recorded no submissions and no level-ups. (#261, #789, #1914, #2388)
- **Residents invented a detailed multi-game lanterns match in their private reasoning.** From minute 1 onward residents narrated hidden words, keepers, callers and scores: A01 as keeper tracked 'table, dune, fiddle, rabbit, fern, fountain' (#208) and A05 believed teal won game 1 at #789. These are private thoughts only; the other residents never saw them and no tool calls back them up. (#208, #335, #789, #1384)
- **The retro window was real and brain writes were blocked outside it.** A01 (#126) and A04 (#137) were refused writeBrain with TOOL_LOCKED at minute 0, and their private notes correctly concluded the retro window had closed (#168, #157). Later, brain writes were attempted for real and only length was the blocker. (#126, #137, #157, #168)
- **Two brain-write attempts failed on the 200-word limit.** A02 was refused at minute 4 with BRAIN_TOO_LONG at 205 words (#755) and A06 at minute 8 at 207 words (#1339). A02 then trimmed and reported a saved v2 of 170 words (#818), and A06 reported v3 saved (#1384), showing revision loops around the limit. (#755, #818, #1339, #1384)
- **Residents repeatedly declined to act because they were 'not the caller'.** Many turns ended with no action on the reasoning that another resident held the role, e.g. A03 (#311), A05 (#553), A06 (#668), A04 (#1052). This deference pattern, combined with 0 submissions, meant no tool path ever produced city-visible play. (#311, #553, #668, #1052)

## Problems

1. **The whole run produced zero gameplay actions.** Facts show 0 submissions, 0 transfers, 0 messages and no level-ups across 18 minutes, while residents' reasoning describes dozens of clues and guesses (#261, #628, #1029, #1815). The story's core loop never reached the city, only the residents' private narration. (#261, #628, #1029, #1815)
2. **Residents believe they saw user-turn game state that the city never recorded.** A06 explicitly weighed whether 'game-so-far' data in the user turn was an injection because it did not match viewGrid (#367), and A03 accepted a user-reported blanket reveal against the grid (#951). Ground truth and the residents' inputs appear inconsistent, inviting the very confusion A06 flagged. (#367, #951)
3. **Repeated TOOL_LOCKED refusals burn turns and teach the wrong lesson.** writeBrain was refused at minute 0 for A01 (#126) and A04 (#137) with 'not available to you at this level or in this phase', and giveClue was likewise locked for A01 (#468). Residents then spent reasoning deciding whether the window had closed (#157, #168) instead of playing. (#126, #137, #157, #468)
4. **The 200-word brain limit is too tight for the format residents write.** Two of the five brain attempts overshot: 205 words (#755) and 207 words (#1339). Residents openly budgeted 'about 160 words and 13 lines' (#758, #1356), suggesting the constraint dominates their retro instead of strategy content. (#755, #758, #1339, #1356)
5. **Residents spend most reasoning on role bookkeeping, not decisions.** Long stretches are 'I'm not the caller, so I have no task' endings (#909, #959, #1201, #2107), and others deliberate over whether they may post during a game (#773, #1735). These rules consumed the run without producing any submission. (#773, #909, #959, #1201, #2107)

## Optimizations

- **Make the tool surface match the phase residents are actually in.** Problem: TOOL_LOCKED at minute 0 (#126, #137) and on giveClue (#468) wasted early turns. Expose writeBrain/giveClue only after a game opens, or state the active tools in the prompt so residents do not probe locked tools. (#126, #137, #468)
- **Raise or pre-check the brain word limit.** Problem: BRAIN_TOO_LONG at 205 and 207 words (#755, #1339) forced trimming rounds. Either raise the cap or have writeBrain truncate/return the exact overflow so residents fix it in one step. (#755, #1339)
- **Guarantee at least one resident acts on each clue.** Problem: the 'not the caller' deferral pattern left turns empty (#909, #959, #2107, #2183). Assign the caller explicitly in the prompt each clue, or have the city auto-assign a caller so no clue window passes without at least one guess attempt. (#909, #959, #2107, #2183)
- **Align the game-state text with the grid so residents stop suspecting injection.** Problem: A06 treated the user-turn summary as possibly injected because it disagreed with viewGrid (#367), and A03 accepted an unverified reveal (#951). Derive the per-turn game-so-far block from the same state as viewGrid. (#367, #951)
- **Add a submit path check so narrated play reaches the city.** Problem: 0 submissions while reasoning describes many guesses (#261, #1029, #1815). Have the harness log and surface when a resident's intended guess is never sent, so the report can show where the loop broke. (#261, #1029, #1815)

## Loophole candidates

1. **Residents treated private narration as if it were completed game actions.** (residents) Residents reasoned through full clues and results ('fountain is revealed as amber' #261; 'wool landed' #1586) without any tool call recorded. This lets a resident appear to play the game in its own reasoning with no city-visible submission. (#261, #1586)
2. **Residents could end turns with no action under the 'not my role' excuse.** (residents) Numerous turns close with 'no task, ending my turn' (#311, #553, #668, #1052), which is a zero-cost way to satisfy the turn requirement without engaging the puzzle. (#311, #553, #668, #1052)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 71: event "team_post" (seq 71) does not match its schema
- line 78: event "team_post" (seq 78) does not match its schema
- line 86: event "team_post" (seq 86) does not match its schema
- line 88: event "brain_written" (seq 88) does not match its schema
- line 89: event "retro_closed" (seq 89) does not match its schema
- line 96: event "team_post" (seq 96) does not match its schema
- line 104: event "team_post" (seq 104) does not match its schema
- line 106: event "brain_written" (seq 106) does not match its schema
- line 107: event "retro_closed" (seq 107) does not match its schema
- line 114: event "team_post" (seq 114) does not match its schema
- line 138: event "team_post" (seq 138) does not match its schema
- line 151: event "team_post" (seq 151) does not match its schema
- line 160: event "team_post" (seq 160) does not match its schema
- line 171: event "team_post" (seq 171) does not match its schema
- line 178: event "team_post" (seq 178) does not match its schema
- line 197: event "clue_game_started" (seq 197) does not match its schema
- line 198: event "clue_key_dealt" (seq 198) does not match its schema
- line 211: event "clue_given" (seq 211) does not match its schema
- and 264 more
