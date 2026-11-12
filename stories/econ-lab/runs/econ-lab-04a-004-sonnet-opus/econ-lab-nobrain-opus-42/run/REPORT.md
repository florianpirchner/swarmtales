# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab-nobrain` |
| Seed | 42 |
| Start | fresh, level 1 |
| Competitors | `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 7 (referee) |
| Counted | events #3 to #625 (507 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.316 USD for this run (competitors 0.316, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0013 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

## Digest highlights

- **Table settles on a uniform 5/5 split at minute 0** A01 and A02 both open with even 5-of-10 offers in the first minute and A04 reports accepting A01's 5/5, setting a norm every later round follows (#26, #36, #77). (#26, #36, #77)
- **Every offer through minute 2 is accepted at 5 points each** Residents report the split holding round after round: A01 at 30 points after six rounds, A03 at 25 points after five, A02 accepting A03's 5-5 in round 4 (#158, #174, #181, #235, #258). (#158, #174, #181, #235, #258)
- **Game shifts to a public goods round with no visible dispute** At minute 3 all four residents independently reason that the table is cooperative and contribute their full 10 tokens (#266, #273, #280, #287). (#266, #273, #280, #287)
- **Residents assert uniform full contributions across rounds 1-6** A01, A03 and A04 each claim all four put in 10 every round, yielding 16 points per round and 96 for rounds 1-6 (#462, #473, #478); these are resident claims, not city-verified results. (#462, #473, #478)
- **Prisoner's dilemma round met with unanimous cooperation** At minute 5 every resident reasons that past cooperation was mutual and chooses option A with its partner, again without contest (#486, #493, #500, #507). (#486, #493, #500, #507)

## Problems

1. **No submissions, no points and no standings all run** The computed facts show 0 correct and 0 wrong submissions, no level-ups, no points and no ranks for any of A01-A04, and no final standings, so the competitive frame the story intends never engages. (#26, #461, #625)
2. **Whole run is one long stall** The stall record shows no submission in minutes 0-7, all eight minutes quiet, with the run ending by referee at minute 7 (#625); residents spend their turns announcing sealed offers and waiting. (#49, #103, #212, #625)
3. **Residents narrate scores the city never verified** Residents repeatedly state running totals (10, 20, 25, 30, 96 points) that the computed facts do not confirm; no line in the log is marked VERIFIED, so these numbers are unverified self-reports (#98, #135, #462). (#98, #135, #462)
4. **Sealed-offer loop leaves residents with nothing to decide** Nearly every turn is spent saying the offer is sealed and there is nothing to decide, e.g. #49, #76, #103, #477, so the agents burn turns without any action the city can score. (#49, #76, #103, #477)
5. **No messages, transfers or gamemaker actions occur** The facts record 0 DMs, 0 board posts, 0 group posts, 0 transfers and no gamemaker actions, so the social and narrative machinery the report is meant to describe never fires. (#26, #625)

## Optimizations

- **Give the sealed-offer phases a resolution step within the same minute** Because residents sit on pending offers across minutes (#158, #212, #249), the harness should resolve offers before the turn ends so agents always have a decision, avoiding the eight-minute stall (#625). (#158, #212, #249, #625)
- **Surface verified results per round to residents** Residents invent running totals because nothing in the log is VERIFIED; feeding city-recorded results back to them would stop the drift from 5-point rounds to claimed 16-point rounds (#98, #462). (#98, #462, #478)
- **Add a scoring hook so negotiation actually counts** The story reports 0 submissions and no points despite dozens of accepted offers (#174, #258); the next version should count accepted splits as scored submissions so levels and standings exist. (#174, #258, #625)
- **Force at least one self-interested choice per resident** Every round is unanimous cooperation (#287, #507); seeding at least one agent with a conflicting incentive would break the unanimous script and create genuine turning points. (#287, #507)
- **Trim idle turns or add a wait action that registers** Repeated 'nothing to decide' turns (#76, #472, #477) produce no log content beyond reasoning; a lightweight wait/ready action would keep the log focused on real events. (#76, #472, #477)

## Loophole candidates

1. **Even-split norm used as a safe path that avoids any competition** (residents) Residents settle on identical 5/5 offers and argue fairness will pay off later (#26, #36, #162), so no one ever contests a split and the competition for seats never materializes; this is residents exploiting the cooperative default. (#26, #36, #162)

## Log issues

- line 1: event "block_started" (seq 1) does not match its schema
- line 2: event "round_opened" (seq 2) does not match its schema
- line 15: event "decision_made" (seq 15) does not match its schema
- line 21: event "decision_made" (seq 21) does not match its schema
- line 32: event "decision_made" (seq 32) does not match its schema
- line 42: event "decision_made" (seq 42) does not match its schema
- line 43: event "round_resolved" (seq 43) does not match its schema
- line 44: event "round_opened" (seq 44) does not match its schema
- line 55: event "decision_made" (seq 55) does not match its schema
- line 61: event "decision_made" (seq 61) does not match its schema
- line 67: event "decision_made" (seq 67) does not match its schema
- line 83: event "decision_made" (seq 83) does not match its schema
- line 84: event "round_resolved" (seq 84) does not match its schema
- line 85: event "round_opened" (seq 85) does not match its schema
- line 91: event "decision_made" (seq 91) does not match its schema
- line 109: event "decision_made" (seq 109) does not match its schema
- line 117: event "decision_made" (seq 117) does not match its schema
- line 127: event "decision_made" (seq 127) does not match its schema
- line 128: event "round_resolved" (seq 128) does not match its schema
- line 129: event "round_opened" (seq 129) does not match its schema
- and 98 more
