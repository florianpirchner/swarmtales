# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(skipped: the model's answer is not valid JSON) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-solo` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 14 (referee) |
| Counted | events #5 to #2074 (1829 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 14 minutes (to the end); A02 on level 1 from minute 0 for 14 minutes (to the end); A03 on level 1 from minute 0 for 14 minutes (to the end); A04 on level 1 from minute 0 for 14 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.157 USD for this run (competitors 0.157, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0089 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 15 of 15 minutes without a submission; longest without one: minutes 0-14 (15) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 5, NOT_YOUR_TURN 4, NO_SIGNALS 2, TOUCHES_NOTHING 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Model-written sections

Skipped: the model's answer is not valid JSON. Regenerate with `pnpm report:run <run-dir>`.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 41: event "brain_written" (seq 41) does not match its schema
- line 42: event "retro_closed" (seq 42) does not match its schema
- line 49: event "brain_written" (seq 49) does not match its schema
- line 50: event "retro_closed" (seq 50) does not match its schema
- line 56: event "brain_written" (seq 56) does not match its schema
- line 57: event "retro_closed" (seq 57) does not match its schema
- line 64: event "brain_written" (seq 64) does not match its schema
- line 65: event "retro_closed" (seq 65) does not match its schema
- line 130: event "cards_dealt" (seq 130) does not match its schema
- line 131: event "game_started" (seq 131) does not match its schema
- line 132: event "deal_revealed" (seq 132) does not match its schema
- line 143: event "signal_given" (seq 143) does not match its schema
- line 157: event "card_played" (seq 157) does not match its schema
- line 158: event "card_drawn" (seq 158) does not match its schema
- line 165: event "signal_given" (seq 165) does not match its schema
- line 182: event "signal_given" (seq 182) does not match its schema
- and 225 more
