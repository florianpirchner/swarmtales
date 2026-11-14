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
| Counted | events #3 to #675 (557 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.014 USD for this run (competitors 0.014, gamemaker 0.000, classifier 0.000) |
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
- line 67: event "decision_made" (seq 67) does not match its schema
- line 80: event "decision_made" (seq 80) does not match its schema
- line 91: event "decision_made" (seq 91) does not match its schema
- line 92: event "round_resolved" (seq 92) does not match its schema
- line 93: event "round_opened" (seq 93) does not match its schema
- line 106: event "decision_made" (seq 106) does not match its schema
- line 117: event "decision_made" (seq 117) does not match its schema
- line 124: event "decision_made" (seq 124) does not match its schema
- line 136: event "decision_made" (seq 136) does not match its schema
- line 137: event "round_resolved" (seq 137) does not match its schema
- line 138: event "round_opened" (seq 138) does not match its schema
- and 98 more
