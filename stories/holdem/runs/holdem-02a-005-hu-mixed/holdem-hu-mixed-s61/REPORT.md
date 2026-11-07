# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-07 |
| Story | `holdem-hu-mixed` |
| Seed | 61 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 19 (referee) |
| Counted | events #2 to #1795 (1320 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 19 minutes (to the end); A02 on level 1 from minute 0 for 19 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.057 USD for this run (competitors 0.057, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0027 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 20 of 20 minutes without a submission; longest without one: minutes 0-19 (20) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The whole run was one long heads-up poker session with no submissions and no level progress.** Both residents stayed on level 1 for the full 19 minutes (#1795), and the facts record 0 correct and 0 wrong submissions with no quiet minutes ever broken. All 1320 events are poker hands and private reasoning, so the only visible activity is cards. (#9, #52, #1795)
- **A01 wrote the first strategy brain before play but was then locked out of writeBrain.** A01 reported saving brain version 1 at 125 words before game 1 started (#34) and later reasoned it could not write again because the tool was restricted to the retro window and it was not retro captain (#904). This left the brain frozen from minute 0 onward. (#26, #34, #904)
- **A02 won the first game decisively on the hand results it tracked itself.** A02 said it finished game 1 at +20 points while A01 finished at -20 (#1037), crediting two-pair hands and a 7-8 straight on 2-6-9-T. These numbers are A02's own claims, not city-recorded facts, but they set the tone for the rest of the run. (#729, #858, #1037)
- **A01 hit a TOOL_LOCKED refusal while trying to act in a hand.** At minute 8 A01's act was refused with TOOL_LOCKED, a message saying the tool was not available at this level or phase (#772). This is the only recorded tool error in the run. (#772)
- **The session ended mid-hand during game 2, hand 12 preflop.** A02 said it was waiting on A01's response to its preflop raise in hand 12 (#1782), and the run then ended at minute 19 (#1795). The final standings are recorded as unknown. (#1782, #1795)

## Problems

1. **Neither resident ever solved level 1 or submitted anything.** The facts show A01 and A02 stuck on level 1 from minute 0 to minute 19, with 0 correct and 0 wrong submissions across 1320 events (#1795). The residents only played poker hands and never progressed. (#1795)
2. **The run had no story beats at all.** The deterministic digest found no beats, and the story field in the computed facts is only the game name with no design intent recorded. With no beats, the report cannot tie any turning point to story design. (#1795)
3. **writeBrain was locked early, cutting off the strategy loop.** A01 saved one brain version before game 1 (#34) and a few minutes later found writeBrain gone from its tool list because it was restricted to the retro window (#904). The locked-out moment is not explained by any staff message in the log, so residents had to infer the rule. (#34, #904)
4. **Reasoning shows residents repeatedly misreading whose turn it is.** A02 said the turn notice did not fit it being its turn (#158), and A02 later noted a message claimed A01 checked when A01 should not yet act (#1521). A01's own turns were ended with 'not my turn' notes (#362, #1102, #1125), burning time on turn confusion. (#158, #362, #1102, #1125, #1521)
5. **A refusal undercut a live action without an obvious cause.** A01's act at minute 8 was refused with TOOL_LOCKED (#772), but no staff line in the log explains which phase or level caused it. An unexplained lock is a harness fault the resident could not act around. (#772)

## Optimizations

- **Define an explicit submission loop and reward it, not just hands.** The run shows 20 of 20 minutes without a submission and both residents stuck on level 1 to the end (#1795). The next version should surface a visible level target and a submit tool that stays unlocked, so residents have something to progress on between hands. (#772, #1795)
- **Document writeBrain's window up front.** A01 speculated that writeBrain belonged to the retro window and was not its tool anymore (#904), after having already used it at minute 0 (#34). A plain rules line stating when writeBrain is available would remove the guesswork. (#34, #904)
- **Make turn ownership explicit in each table message.** Residents lost time on turn confusion, e.g. A02 doubting a flop notice (#158) and A02 noting a check reported for A01 before its turn (#1521). Put 'acting now: A0x' in every table state so no resident ends a turn unnecessarily. (#158, #1125, #1521)
- **Log and explain tool locks to the residents.** A01's only refusal was a bare TOOL_LOCKED with no phase named (#772), and A01 then spent time testing tools instead of playing (#904). Return the reason and the active tool list on any lock, so the resident can adjust. (#772, #904)
- **Record game scores as city facts, not resident claims.** The only record of game 1's result is A02's self-report of +20 vs -20 (#1037), and the final standings are unknown. The harness should record each hand's pot result in the log so scores can be reported as facts. (#1037, #1795)

## Loophole candidates

1. **Residents spent the run in safe poker play rather than chasing the level target.** (residents) A01 and A02 generated over a thousand valid play events (#1795) while never submitting anything, treating the table as the whole game. The headsup format let them keep cycling hands with no cost, which is a cheaper path than trying to solve level 1. (#52, #1048, #1795)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 19: event "brain_written" (seq 19) does not match its schema
- line 20: event "retro_closed" (seq 20) does not match its schema
- line 42: event "game_started" (seq 42) does not match its schema
- line 43: event "hand_started" (seq 43) does not match its schema
- line 44: event "cards_dealt" (seq 44) does not match its schema
- line 45: event "action_taken" (seq 45) does not match its schema
- line 46: event "action_taken" (seq 46) does not match its schema
- line 55: event "decision_scored" (seq 55) does not match its schema
- line 56: event "action_taken" (seq 56) does not match its schema
- line 63: event "decision_scored" (seq 63) does not match its schema
- line 64: event "action_taken" (seq 64) does not match its schema
- line 65: event "board_dealt" (seq 65) does not match its schema
- line 79: event "decision_scored" (seq 79) does not match its schema
- line 80: event "action_taken" (seq 80) does not match its schema
- line 88: event "decision_scored" (seq 88) does not match its schema
- line 89: event "action_taken" (seq 89) does not match its schema
- line 90: event "board_dealt" (seq 90) does not match its schema
- line 96: event "decision_scored" (seq 96) does not match its schema
- line 97: event "action_taken" (seq 97) does not match its schema
- and 455 more
