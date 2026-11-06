# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `holdem-mixed` |
| Seed | 54 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 43 (referee) |
| Counted | events #3 to #5498 (4481 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 43 minutes (to the end); A02 on level 1 from minute 0 for 43 minutes (to the end); A03 on level 1 from minute 0 for 43 minutes (to the end); A04 on level 1 from minute 0 for 43 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.184 USD for this run (competitors 0.184, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0064 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 44 of 44 minutes without a submission; longest without one: minutes 0-43 (44) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 5, BRAIN_TOO_LONG 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents stalled on level 1 for the whole run** A01, A02, A03 and A04 all stayed on level 1 from minute 0 to the referee end at minute 43 with no submission ever recorded. The city logged 4481 events of poker play but 0 correct and 0 wrong submissions. (#46, #55, #5498)
- **Residents played poker while writeBrain was locked at the start** At minute 0 A01 and A03 both reasoned that writeBrain was locked and only viewTable and readBrain were available (#55, #46). Their saved brains (version 1) existed but could not be updated until later retro windows. (#46, #55, #62, #66)
- **Three BRAIN_TOO_LONG refusals blocked brain updates** A01 (#1682) and A03 (#1690) were refused writeBrain for exceeding 150 words (182 and 158 words), and A01 was refused again at #3009 with 156 words. Only later attempts inside the word limit saved (version 2 at #1708, version 3 at #3033). (#1682, #1690, #1708, #3009, #3033)
- **TOOL_LOCKED refusals show residents acting out of turn or phase** A03 was refused act at #2025, #2236 and #3413; A01 was refused act at #3252 and #3461. These residents tried to act when the tool was not available to them in that phase. (#2025, #2236, #3252, #3413, #3461)
- **Four games of poker completed with standings told only in private thoughts** Residents announced game results only in SAYS TO ITSELF lines: Game 1 ended A01 +12, A02 -34, A03 +4, A04 +18 (#1712, #1733), Game 3 ended A02 -46, A03 +45, A04 +6, A01 -5 (#4128, #4139, #4143). No public board post or DM carried these results. (#1712, #1733, #4128, #4139, #4143)
- **Residents often misread hands and positions but still folded or called** There are repeated private corrections of hand reading, e.g. A04 discovering the board played rather than its hole cards (#420), A01 correcting its flush draw math (#268), and A04 re-checking whether it held a straight (#4387). Play continued correctly at the table despite these confusions, but they consumed reasoning. (#268, #420, #4387)

## Problems

1. **No resident ever made a submission, so no level was solved** The run recorded 0 correct and 0 wrong submissions and 44 of 44 quiet minutes. A01-A04 each stalled on level 1 for the full 43 minutes. (#46, #5498)
2. **Residents spent the run on a poker table instead of the story's task** Nearly all activity is REASONING and SAYS TO ITSELF about poker hands and pot odds (#100, #108, #191). No resident posted to a board or sent a DM, and no gamemaker action occurred. (#100, #108, #191, #5498)
3. **Brain writing was blocked by word limit and tool locks, killing strategy memory** BRAIN_TOO_LONG refusals at #1682, #1690 and #3009 and TOOL_LOCKED refusals show residents could not reliably save their lessons. Their only durable strategy memory was repeatedly refused at game boundaries. (#1682, #1690, #2025, #3009)
4. **Out-of-turn act attempts wasted turns** A03 and A01 repeatedly tried to act when it was not their phase and were refused (#2025, #2236, #3413, #3252, #3461). Residents then had to waste a turn re-stating that it was not their turn (#2034, #2569). (#2025, #2236, #3252, #3413, #3461)
5. **The story had no designed beats and no public channel used** The digest found no beats and the facts show 0 DMs, 0 board posts and 0 group posts. Residents only narrated to themselves, so no rivalries, alliances or lies ever became visible. (#126, #364, #5498)

## Optimizations

- **Add an explicit numbered objective and submission tool at level 1** Residents never submitted because none of them reasoned about a puzzle answer; they only played poker. Addressing the 0-submission stall (#5498, #46), give a concrete task with a visible submit path and a first-hand tutorial. (#46, #5498)
- **Raise the brain word limit or auto-trim brain writes** Three BRAIN_TOO_LONG refusals (#1682, #1690, #3009) blocked strategy saving. Raise the 150-word cap or auto-summarize so lessons persist across games. (#1682, #1690, #3009)
- **Make turn and phase clear in every tool response** TOOL_LOCKED refusals at #2025, #2236, #3413, #3252 and #3461 came from residents acting out of phase. Show the active tools and whose turn it is in each prompt so residents stop guessing. (#2025, #2236, #3252, #3413, #3461)
- **Give results a public channel so the story has stakes** Standings appeared only in private SAYS TO ITSELF lines (#1712, #4128). Add a scoreboard or forced board post at game end so residents and designers see the competition. (#1712, #4128, #4139)
- **Trim poker-table time or gate it behind progress** The whole 43 minutes went to poker hands with no other objective (#100, #5498). Cap table time or interleave story tasks so the run advances the intended levels. (#100, #5498)
- **Fix the unknown gamemaker and missing story config** The run had gamemaker unknown with no actions and no story defined. Add a gamemaker agent and a story file so events and beats are produced. (#5498)

## Loophole candidates

1. **Residents used SAYS TO ITSELF to narrate results instead of public channels** (residents) Game standings and reads were recorded only in self-directed lines (#1712, #3012, #3025, #4139) rather than DMs or board posts, so the intended social competition never happened. This is a cheap private path around the public story. (#1712, #3012, #3025, #4139)
2. **Residents repeatedly attempted locked tools instead of adapting** (residents) A03 and A01 kept calling act when it was unavailable (#2025, #2236, #3413, #3252, #3461), retrying a refused path rather than checking the table rules. The harness rejected them but the residents lost turns to retries. (#2025, #2236, #3252, #3413, #3461)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 32: event "brain_written" (seq 32) does not match its schema
- line 33: event "retro_closed" (seq 33) does not match its schema
- line 39: event "brain_written" (seq 39) does not match its schema
- line 40: event "retro_closed" (seq 40) does not match its schema
- line 80: event "game_started" (seq 80) does not match its schema
- line 81: event "hand_started" (seq 81) does not match its schema
- line 82: event "cards_dealt" (seq 82) does not match its schema
- line 83: event "action_taken" (seq 83) does not match its schema
- line 84: event "action_taken" (seq 84) does not match its schema
- line 94: event "decision_scored" (seq 94) does not match its schema
- line 95: event "action_taken" (seq 95) does not match its schema
- line 103: event "decision_scored" (seq 103) does not match its schema
- line 104: event "action_taken" (seq 104) does not match its schema
- line 111: event "decision_scored" (seq 111) does not match its schema
- line 112: event "action_taken" (seq 112) does not match its schema
- line 119: event "decision_scored" (seq 119) does not match its schema
- line 120: event "action_taken" (seq 120) does not match its schema
- line 121: event "board_dealt" (seq 121) does not match its schema
- and 997 more
