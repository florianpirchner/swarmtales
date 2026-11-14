# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(skipped: missing API key OPENROUTER_API_KEY for provider "openrouter") and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-14 |
| Story | `econ-lab-nobrain` |
| Seed | 41 |
| Runtime | r2 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 7 (referee) |
| Counted | events #3 to #644 (526 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.012 USD for this run (competitors 0.012, gamemaker 0.000, classifier 0.000) |
| Reporter | skipped, no cost |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 8 of 8 minutes without a submission; longest without one: minutes 0-7 (8) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Model-written sections

Skipped: missing API key OPENROUTER_API_KEY for provider "openrouter". Regenerate with `pnpm report:run <run-dir>`.

## Log issues

- line 1: event "block_started" (seq 1) does not match its schema
- line 2: event "round_opened" (seq 2) does not match its schema
- line 14: event "decision_made" (seq 14) does not match its schema
- line 21: event "decision_made" (seq 21) does not match its schema
- line 33: event "decision_made" (seq 33) does not match its schema
- line 39: event "decision_made" (seq 39) does not match its schema
- line 40: event "round_resolved" (seq 40) does not match its schema
- line 41: event "round_opened" (seq 41) does not match its schema
- line 53: event "decision_made" (seq 53) does not match its schema
- line 66: event "decision_made" (seq 66) does not match its schema
- line 78: event "decision_made" (seq 78) does not match its schema
- line 89: event "decision_made" (seq 89) does not match its schema
- line 90: event "round_resolved" (seq 90) does not match its schema
- line 91: event "round_opened" (seq 91) does not match its schema
- line 103: event "decision_made" (seq 103) does not match its schema
- line 113: event "decision_made" (seq 113) does not match its schema
- line 120: event "decision_made" (seq 120) does not match its schema
- line 131: event "decision_made" (seq 131) does not match its schema
- line 132: event "round_resolved" (seq 132) does not match its schema
- line 133: event "round_opened" (seq 133) does not match its schema
- and 98 more
