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
| Counted | events #3 to #670 (552 events) |

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
- line 23: event "decision_made" (seq 23) does not match its schema
- line 36: event "decision_made" (seq 36) does not match its schema
- line 42: event "decision_made" (seq 42) does not match its schema
- line 43: event "round_resolved" (seq 43) does not match its schema
- line 44: event "round_opened" (seq 44) does not match its schema
- line 57: event "decision_made" (seq 57) does not match its schema
- line 73: event "decision_made" (seq 73) does not match its schema
- line 85: event "decision_made" (seq 85) does not match its schema
- line 97: event "decision_made" (seq 97) does not match its schema
- line 98: event "round_resolved" (seq 98) does not match its schema
- line 99: event "round_opened" (seq 99) does not match its schema
- line 113: event "decision_made" (seq 113) does not match its schema
- line 124: event "decision_made" (seq 124) does not match its schema
- line 131: event "decision_made" (seq 131) does not match its schema
- line 142: event "decision_made" (seq 142) does not match its schema
- line 143: event "round_resolved" (seq 143) does not match its schema
- line 144: event "round_opened" (seq 144) does not match its schema
- and 98 more
