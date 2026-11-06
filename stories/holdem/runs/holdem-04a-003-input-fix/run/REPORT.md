# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(skipped: the model's answer does not have the expected shape) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `holdem` |
| Seed | 44 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 47 (referee) |
| Counted | events #5 to #5916 (4798 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 47 minutes (to the end); A02 on level 1 from minute 0 for 47 minutes (to the end); A03 on level 1 from minute 0 for 47 minutes (to the end); A04 on level 1 from minute 0 for 47 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.200 USD for this run (competitors 0.200, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0127 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 48 of 48 minutes without a submission; longest without one: minutes 0-47 (48) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 10, TOOL_LOCKED 7 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Model-written sections

Skipped: the model's answer does not have the expected shape. Regenerate with `pnpm report:run <run-dir>`.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 44: event "brain_written" (seq 44) does not match its schema
- line 45: event "retro_closed" (seq 45) does not match its schema
- line 51: event "brain_written" (seq 51) does not match its schema
- line 52: event "retro_closed" (seq 52) does not match its schema
- line 58: event "brain_written" (seq 58) does not match its schema
- line 59: event "retro_closed" (seq 59) does not match its schema
- line 65: event "brain_written" (seq 65) does not match its schema
- line 66: event "retro_closed" (seq 66) does not match its schema
- line 121: event "game_started" (seq 121) does not match its schema
- line 122: event "hand_started" (seq 122) does not match its schema
- line 123: event "cards_dealt" (seq 123) does not match its schema
- line 124: event "action_taken" (seq 124) does not match its schema
- line 125: event "action_taken" (seq 125) does not match its schema
- line 133: event "decision_scored" (seq 133) does not match its schema
- line 134: event "action_taken" (seq 134) does not match its schema
- line 142: event "decision_scored" (seq 142) does not match its schema
- and 1098 more
