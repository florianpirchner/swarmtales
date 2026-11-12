# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #5 to #755 (601 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.235 USD for this run (competitors 0.235, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 10 of 10 minutes without a submission; longest without one: minutes 0-9 (10) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 4 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Residents opened by saving strategy brains and idling** In minute 0 every resident saved a first strategy brain and declared there was nothing to decide, e.g. A03 at #42, A04 at #46, A02 at #50 and A01 at #54. So the whole run started with bookkeeping instead of play. (#42, #46, #50, #54)
- **Split-game offers were exchanged but never counted** A01 offered A04 4 points and A04 accepted (#92, #96); A02 offered A03 5 points (#100); A04 offered A03 4 points (#131) and A02 accepted A04's round-3 offer of 4 (#178). Despite these acceptances the run recorded 0 transfers that went through, so the split game produced no points. (#92, #96, #100, #131, #178)
- **A02 and A04 wrote a shared split-game rule independently** A02's brain version 2 sets a proposer offer of 4 of 10 and acceptance of anything 3 or more (#316), and A04's version 2 sets acceptance of 3 or more with proposer offers of 4, maybe trying 3 (#333). Both converged on the same threshold without a board post or DM. (#316, #333)
- **All four writeBrain calls were refused as too long** In minute 5 the city refused A01 (153 words, #540), A02 (162, #545), A04 (174, #550) and A03 (175, #555) with BRAIN_TOO_LONG against a 150-word limit. This was the run's only recorded mechanic error. (#540, #545, #550, #555)
- **A02 switched the framework to a prisoner's dilemma** At minute 7 A02 reasoned about a prisoner's dilemma with changing partners and chose B because it dominates (#625). That is the last substantive decision recorded before the referee ended the run at minute 9 (#755). (#625, #755)
- **Nobody submitted a solution in ten minutes** The run ended with 0 correct and 0 wrong submissions, 0 transfers and 0 messages, and no submission in minutes 0-9 (#755). All four residents stayed at level 1, so the level ladder never moved. (#755)

## Problems

1. **The run produced no points at all** All reported offers were accepted (#92, #96, #100, #131, #178), yet the ledger shows 0 transfers went through and 0 points. The split game consumed most of the run without moving the standings (#755). (#92, #96, #131, #178, #755)
2. **No resident ever solved a level** Levels solved: none, and every resident stayed at level 1 with no submissions in minutes 0-9 (#755). The economy and the level ladder never connected. (#755)
3. **Brain writes failed for everyone at once** Four consecutive writeBrain refusals at minute 5 (#540, #545, #550, #555) show the 150-word limit was tighter than the brains the residents were producing, and all four had to be rewritten before play continued. (#540, #545, #550, #555)
4. **Residents spent turns waiting on each other** Many reasoning lines are just waiting states: A03 waiting for A04's offer (#120), A03 waiting for A01 (#161), A01 waiting as responder (#196), A04 waiting for A02 (#254). The alternating turn order left residents idle rather than making choices. (#120, #161, #196, #254)
5. **Almost no communication between residents** The run recorded 0 DMs and 0 board posts, and the only evidence of shared strategy is coincidental matching rules (#316, #333). Nothing shows residents discussing offers before accepting them. (#316, #333)
6. **The game changed framework partway through** After several rounds of split-game offers, A02 at minute 7 reasons about a prisoner's dilemma with changing partners (#625). The residents had been playing one game and then pondered another, so the run's rules were unclear to them. (#625)

## Optimizations

- **Make split-game transfers settle in the ledger** Fix the settlement so an accepted offer is actually paid out and counted; currently accepted offers (#96, #178) still yield 0 transfers (#755). Add a check that every accepted offer appears as a transfer. (#96, #178, #755)
- **Give residents a decision on every turn** Replace the responder-waits pattern with simultaneous choices or a fallback action, since turns were burned on waiting (#120, #161, #196, #254) and the run produced no submissions (#755). (#120, #161, #196, #254, #755)
- **Raise or pre-check the brain word limit** All four brains were refused at minute 5 for exceeding 150 words (#540, #545, #550, #555). Either raise the limit or return the word count to the resident before submission so a write is not wasted. (#540, #545, #550, #555)
- **Connect the economy to the level ladder** The split game gave points in principle but the run ended with 0 levels solved (#755). Tie the winnings to progress, or require a level submission before further split rounds, so residents have a reason to solve levels. (#755)
- **Seed a board so residents coordinate openly** With 0 DMs and 0 board posts, identical rules appeared only by coincidence (#316, #333). Prompt residents to post intentions on the board before offering, so alliances are visible in the log. (#316, #333)
- **State one rule set for the whole run** The residents played split-game rounds and then reasoned about a prisoner's dilemma (#131, #625). Put the framework in the persona or a standing instruction so the residents do not drift between games. (#131, #625)

## Loophole candidates

1. **Saving a brain counted as a full turn** (residents) At minute 0 residents ended their turns after only saving a strategy brain (#42, #46, #50, #54), using the brain write as an action instead of playing. This let them avoid a real decision while still taking a turn. (#42, #46, #50, #54)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 15: event "brain_written" (seq 15) does not match its schema
- line 16: event "retro_closed" (seq 16) does not match its schema
- line 22: event "brain_written" (seq 22) does not match its schema
- line 23: event "retro_closed" (seq 23) does not match its schema
- line 29: event "brain_written" (seq 29) does not match its schema
- line 30: event "retro_closed" (seq 30) does not match its schema
- line 36: event "brain_written" (seq 36) does not match its schema
- line 37: event "retro_closed" (seq 37) does not match its schema
- line 66: event "block_started" (seq 66) does not match its schema
- line 67: event "round_opened" (seq 67) does not match its schema
- line 74: event "decision_made" (seq 74) does not match its schema
- line 81: event "decision_made" (seq 81) does not match its schema
- line 87: event "decision_made" (seq 87) does not match its schema
- line 106: event "decision_made" (seq 106) does not match its schema
- line 107: event "round_resolved" (seq 107) does not match its schema
- line 108: event "round_opened" (seq 108) does not match its schema
- and 134 more
