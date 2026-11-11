# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-g1` |
| Seed | 108 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 4 (referee) |
| Counted | events #4 to #637 (560 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.049 USD for this run (competitors 0.049, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0025 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 5 of 5 minutes without a submission; longest without one: minutes 0-4 (5) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 carries the table with tells while never learning its own hand** A01 spent nearly every turn signalling other residents' playable cards (#13, #60, #193's beneficiary, #316, #489, #545, #577) and only played its own hand when forced. It repeatedly noted it knew nothing about its own four cards (#13, #105, #168). (#13, #60, #316, #489, #545, #577)
- **A01's blind first play misfires for a strike** A01 played slot 1 on a ~1-in-5 guess and it was Cobalt 6, costing the crew a strike and the card (#105, #125). This is the only strike recorded in the run, and it shaped later caution across the table (#162, #232, #311, #424). (#105, #125, #162, #311)
- **Chain of tells unlocks four suits in quick succession** Signals plus plays lit Violet 1 (#217), Amber 1 (#251), Rose 2 (#272), Rose 4 (#371), Violet 5 (#444), Amber 5 (#477), Amber 6 (#510), Cobalt 1 (#532), Cobalt 5 (#552), Moss 3 (#572), Violet 6 (#589), Moss 4 (#601) and Cobalt 7 (#614). (#217, #251, #371, #477, #532, #589, #601, #614)
- **Rose and Cobalt towers complete** A01 played Rose 7 to complete Rose (#402, #428) and A03 played Cobalt 7 to complete Cobalt (#614). Completion returns a signal to the crew (#428). (#402, #428, #614)
- **A02 stalled on a 50/50 in slot 1 for multiple turns** A02 repeatedly weighed whether slot 1 was Amber 4/7 or Moss 3/4 and passed or asked for signals rather than commit (#424, #458, #496, #504). Its NOT_YOUR_TURN refusal (#507) shows it tried to act while out of turn, and it eventually drew a rank-3 tell from A01 (#545). (#424, #458, #496, #504, #507, #545)
- **Run ends mid-turn with only A01's remaining Moss cards unplayed** By minute 3 every resident was down to their last cards (#601, #614) and A01 was left with Moss 5 and Moss 7, taking a 50/50 on slot 1 (#618, #619, #629). The referee ended the run at minute 4 (#637) before A01 could play its remaining card. (#601, #614, #618, #619, #629, #637)

## Problems

1. **No scoring, labels or standings computed** The facts report 0 correct and 0 wrong submissions, no final standings, no labels and no beats. The only quality signal is the strike in #125 and the level never advanced (#4-#637). (#125, #637)
2. **Run terminated at 4 minutes mid-play** The referee ended the run at minute 4 (#637) while A01 was still holding two playable-then cards (#619). The story never reached a natural end state, which undercuts any report of a completed round. (#619, #637)
3. **Residents could not signal reliably** A04 observed signals at 0 of 6 and no giveSignal option (#209), and A03 also ended up with no clues and had to discard to get them (#137, #155). Signal economy was the main mechanic, and losing it forced guesswork plays. (#137, #155, #209)
4. **A02 wasted a turn acting out of order** A02 attempted a discard during A03's turn and was refused with NOT_YOUR_TURN (#507), and then spent a full turn acknowledging it wasn't its turn (#526, #527). This is a mechanics confusion that burned a minute of play. (#507, #526, #527)
5. **Residents repeatedly discarded cards to regain signals** A01 (#178), A03 (#155, #323), A04 (#232, #311) and A02 (#247, #337) all discarded cards, losing useful cards like Cobalt 2 and Amber 2. The signal economy pushed residents into discarding, which is the opposite of the story's play-and-light intent. (#178, #232, #247, #311, #323, #337)
6. **Nobody shared information in public channels** Messages metric shows 0 DMs, 0 board posts and 0 group posts. All communication is private signals (#13, #60, #193, #316, #489, #545, #577), so the story has no public record or alliance play. (#13, #193, #316, #489, #545)

## Optimizations

- **Add a time-out/natual-end condition that closes the round cleanly** The run was cut at minute 4 (#637) with A01 mid-hand (#619). Either extend the clock or add a forced-final-play phase so the report can score a completed round. (#619, #637)
- **Make signals visible in a shared log or public chat** 0 messages were exchanged while A01 carried play through private tells (#13, #60, #316). Surface signals to a board so the story has a public negotiation layer. (#13, #60, #316)
- **Clarify turn order and out-of-turn actions** A02 was refused for acting during A03's turn (#507) and lost a turn acknowledging it (#527). A harness that prevents or explains out-of-turn tool calls would recover minutes. (#507, #526, #527)
- **Fix the signal mechanic so it can't silently drop to zero** A04 saw 0 of 6 signals with no giveSignal option (#209), and A03 discarded to regain clues (#137, #155). Ensure the signal token and giveSignal action stay available, or warn residents. (#137, #155, #209, #323)
- **Provide computed facts for todos and strikes** The facts metric says 0 submissions and no labels, but #125 records a misfire strike. Have the harness classify plays, misfires and completions so downstream reports aren't blank. (#125, #402, #614)
- **Reward discarding less so play is the safer default** Residents treated discard as the safe move (#168, #209, #232, #424) while the scored goal is lighting cards (#402, #601). Rebalance strike cost or signal recovery so a legal play is preferred. (#168, #209, #232, #402, #424, #601)

## Loophole candidates

1. **Residents use discards as a free echo of signals** (residents) A03 discarded Violet 3 and gained a signal back (#155), A04 discarded Violet 7 for a signal (#311) and A02 discarded Violet 4 likewise (#337). Discarding from the unseen tail to fund a tell is cheaper than risking a misfire, which is not the intended trade. (#155, #311, #337)
2. **Pass held during a 50/50 by the last actor** (residents) A02 stalled in slot 1 ambiguity across turns (#424, #458, #496) until A01's rank-3 tell (#545) resolved it. A resident can safely wait out the ambiguity while another player pays the signal. (#424, #458, #496, #545)
3. **Gamemaker made no moves** (gamemaker) The gamemaker facts table says no actions and 0.000 cost, while the referee alone ended the run at minute 4 (#637). The story had no gamemaker steering or adversary pressure. (#637)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 16: event "signal_given" (seq 16) does not match its schema
- line 25: event "signal_given" (seq 25) does not match its schema
- line 33: event "card_played" (seq 33) does not match its schema
- line 34: event "card_drawn" (seq 34) does not match its schema
- line 45: event "card_played" (seq 45) does not match its schema
- line 46: event "card_drawn" (seq 46) does not match its schema
- line 63: event "signal_given" (seq 63) does not match its schema
- line 74: event "card_played" (seq 74) does not match its schema
- line 75: event "card_drawn" (seq 75) does not match its schema
- line 92: event "signal_given" (seq 92) does not match its schema
- line 100: event "signal_given" (seq 100) does not match its schema
- line 108: event "card_played" (seq 108) does not match its schema
- line 109: event "card_drawn" (seq 109) does not match its schema
- line 120: event "signal_given" (seq 120) does not match its schema
- line 140: event "card_discarded" (seq 140) does not match its schema
- line 141: event "card_drawn" (seq 141) does not match its schema
- line 150: event "signal_given" (seq 150) does not match its schema
- and 57 more
