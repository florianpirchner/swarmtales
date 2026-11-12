# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(skipped: the model's answer is not valid JSON) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `holdem-nobrain` |
| Seed | 72 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic, `claude-haiku-5-5` via anthropic, `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 45 (referee) |
| Counted | events #6 to #5535 (4461 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 45 minutes (to the end); A02 on level 1 from minute 0 for 45 minutes (to the end); A03 on level 1 from minute 0 for 45 minutes (to the end); A04 on level 1 from minute 0 for 45 minutes (to the end) |
| Final standings | unknown |
| Cost | 1.405 USD for this run (competitors 1.405, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0104 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 46 of 46 minutes without a submission; longest without one: minutes 0-45 (46) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Model-written sections

Skipped: the model's answer is not valid JSON. Regenerate with `pnpm report:run <run-dir>`.

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 2: event "hand_started" (seq 2) does not match its schema
- line 3: event "cards_dealt" (seq 3) does not match its schema
- line 4: event "action_taken" (seq 4) does not match its schema
- line 5: event "action_taken" (seq 5) does not match its schema
- line 18: event "decision_scored" (seq 18) does not match its schema
- line 19: event "action_taken" (seq 19) does not match its schema
- line 25: event "decision_scored" (seq 25) does not match its schema
- line 26: event "action_taken" (seq 26) does not match its schema
- line 43: event "decision_scored" (seq 43) does not match its schema
- line 44: event "action_taken" (seq 44) does not match its schema
- line 51: event "decision_scored" (seq 51) does not match its schema
- line 52: event "action_taken" (seq 52) does not match its schema
- line 53: event "board_dealt" (seq 53) does not match its schema
- line 61: event "decision_scored" (seq 61) does not match its schema
- line 62: event "action_taken" (seq 62) does not match its schema
- line 71: event "decision_scored" (seq 71) does not match its schema
- line 72: event "action_taken" (seq 72) does not match its schema
- line 83: event "decision_scored" (seq 83) does not match its schema
- line 84: event "action_taken" (seq 84) does not match its schema
- and 1054 more
