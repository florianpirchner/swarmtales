# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-07 |
| Story | `holdem-hu-mixed` |
| Seed | 64 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 18 (referee) |
| Counted | events #2 to #1720 (1271 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 18 minutes (to the end); A02 on level 1 from minute 0 for 18 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.058 USD for this run (competitors 0.058, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0023 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 19 of 19 minutes without a submission; longest without one: minutes 0-18 (19) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 won the first game by a wide margin** A01 recorded +51 while A02 recorded -51 in game 1, as both residents state in their own summaries at #991 and #995. A02 attributed the loss to early marginal calls against A01's frequent raises and bets. (#991, #995)
- **A02's pocket kings re-raise backfired only partially** A02 re-raised to 6 with pocket kings at #811, an unusual line for its passive profile, and A01 recognized the re-raise as a strong hand but called with pocket tens at #825. The hand continued through a 5-6-7 flop with A02 betting for value at #835. (#811, #825, #835)
- **A01 built and reused a strategy brain across games** A01 saved its brain as version 2 after game 1 and explicitly said it would keep the same plan: value-bet strong hands, raise limpers, and respect A02's late-street bets (#995). It had earlier refined notes on A02's limping and check-then-bet patterns at #977. (#977, #995)
- **Both residents converged on a check-then-bet tell** A01 repeatedly folded to A02's river bets after A02 had checked earlier streets, citing notes that this pattern means strength (#1131, #1665). A02's own reasoning confirms it was value-betting those spots with strong hands (#399, #667). (#399, #667, #1131, #1665)
- **No game was solved and no points were submitted** Both residents stayed on level 1 for the full 18 minutes with zero submissions, and the run ended by referee at minute 18 (#1720). The play was a long series of poker hands rather than one solved puzzle. (#1720)

## Problems

1. **Players played poker for 18 minutes without ever solving the level** Neither A01 nor A02 submitted anything; they stayed on level 1 from minute 0 to minute 18, and the referee ended the run (#1720). The log shows dozens of poker hands (#66, #188, #237) but no attempt at a puzzle answer. (#66, #188, #237, #1720)
2. **The game loop is opaque so residents spend turns re-checking the table** A02 says at #1033 that it is not its turn and considers calling viewTable to confirm state, and at #1519 it waits for its turn instead of acting. A01 similarly reasons that writeBrain is closed and it can only viewTable and readBrain (#26), and at #1679 it notes the retro window won't let it write a brain note. (#26, #1033, #1519, #1679)
3. **Residents misread their own hands and postflop action order** A01 spends reasoning at #160 and #463 trying to infer straight draws from board cards, and A02 at #447 contradicts itself on its own hole cards, saying both 3h8h and a pair of eights with a gutshot. A02 also re-derives who acts first on the river at #1109 and #1255, showing the rules were not clear to it. (#160, #447, #463, #1109, #1255)
4. **Residents cannot save strategy notes at the end of the run** A01 explicitly notes that writeBrain is locked to the retro captain and it is no longer on that list, so it cannot write a post-game brain note (#1679). This blocks the intended learning-across-runs mechanic that #995 shows A01 was relying on. (#995, #1679)

## Optimizations

- **Give a visible, scored objective that is not just playing hands** Add an explicit puzzle task with a submission field and a visible score, so residents stop looping poker hands for 18 minutes without a submission (#66-#1679, zero submissions, no levels solved per #1720). (#1720)
- **Clarify action order and hand state in the tool response** Put whose turn it is and both players' hole cards plus board directly in the viewTable output, so A02 does not have to re-derive the river action order (#1109, #1255) and does not misstate its own hole cards (#447). (#447, #1109, #1255)
- **Reopen writeBrain for all residents during the retro window** Let every resident write a brain note at game end rather than locking it to a retro captain, since A01 says it was excluded and could not record its post-game lessons (#1679) even though it was actively building a strategy brain (#995). (#995, #1679)
- **Add a turn timeout or nudge when a resident only calls viewTable** When a resident reasons about confirming state instead of acting (#1033), the harness should send the turn state or auto-advance so the game does not stall for minutes with no submission. (#1033, #1519)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 20: event "brain_written" (seq 20) does not match its schema
- line 21: event "retro_closed" (seq 21) does not match its schema
- line 43: event "game_started" (seq 43) does not match its schema
- line 44: event "hand_started" (seq 44) does not match its schema
- line 45: event "cards_dealt" (seq 45) does not match its schema
- line 46: event "action_taken" (seq 46) does not match its schema
- line 47: event "action_taken" (seq 47) does not match its schema
- line 55: event "decision_scored" (seq 55) does not match its schema
- line 56: event "action_taken" (seq 56) does not match its schema
- line 69: event "decision_scored" (seq 69) does not match its schema
- line 70: event "action_taken" (seq 70) does not match its schema
- line 71: event "board_dealt" (seq 71) does not match its schema
- line 79: event "decision_scored" (seq 79) does not match its schema
- line 80: event "action_taken" (seq 80) does not match its schema
- line 87: event "decision_scored" (seq 87) does not match its schema
- line 88: event "action_taken" (seq 88) does not match its schema
- line 96: event "decision_scored" (seq 96) does not match its schema
- line 97: event "action_taken" (seq 97) does not match its schema
- line 98: event "board_dealt" (seq 98) does not match its schema
- and 429 more
