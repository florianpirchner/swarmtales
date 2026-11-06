# Run report: run-004

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(skipped: the model's answer is not valid JSON) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `salt-market` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 28 (referee) |
| Counted | events #5 to #3124 (2484 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 28 minutes (to the end); A02 on level 1 from minute 0 for 28 minutes (to the end); A03 on level 1 from minute 0 for 28 minutes (to the end); A04 on level 1 from minute 0 for 28 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.186 USD for this run (competitors 0.186, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0109 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 29 of 29 minutes without a submission; longest without one: minutes 0-28 (29) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3, CANNOT_COVER 3, PROPOSER_CANNOT_COVER 3, TOO_MANY_OFFERS 2, OFFER_CLOSED 1, other 1, OWN_OFFER 1 |

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
- line 48: event "brain_written" (seq 48) does not match its schema
- line 49: event "retro_closed" (seq 49) does not match its schema
- line 56: event "brain_written" (seq 56) does not match its schema
- line 57: event "retro_closed" (seq 57) does not match its schema
- line 63: event "brain_written" (seq 63) does not match its schema
- line 64: event "retro_closed" (seq 64) does not match its schema
- line 70: event "brain_written" (seq 70) does not match its schema
- line 71: event "retro_closed" (seq 71) does not match its schema
- line 96: event "market_game_started" (seq 96) does not match its schema
- line 97: event "market_round_started" (seq 97) does not match its schema
- line 107: event "market_offer_made" (seq 107) does not match its schema
- line 109: event "market_offer_made" (seq 109) does not match its schema
- line 111: event "market_offer_made" (seq 111) does not match its schema
- line 119: event "market_offer_closed" (seq 119) does not match its schema
- line 121: event "market_offer_made" (seq 121) does not match its schema
- line 130: event "market_offer_closed" (seq 130) does not match its schema
- and 620 more
