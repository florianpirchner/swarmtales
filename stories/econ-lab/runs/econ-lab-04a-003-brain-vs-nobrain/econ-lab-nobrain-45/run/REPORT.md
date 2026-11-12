# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab-nobrain` |
| Seed | 45 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 7 (referee) |
| Counted | events #3 to #680 (562 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.014 USD for this run (competitors 0.014, gamemaker 0.000, classifier 0.000) |
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

- **Early ultimatum rounds resolved quickly and peacefully.** The first three ultimatum rounds closed without a rejection: A01 kept 7 by offering 3 to A04 (#63), A01 again kept 7 by offering 3 to A03 (#165), and A04's minimal offers of 2 were accepted (#81, #194). Responders accepted any positive amount, so proposers captured most of the surplus. (#63, #81, #165, #194)
- **A03 shifted to a fairer split as proposer.** A03 reasoned that responders had accepted everything so far but chose a middle offer of 4 rather than a minimal one (#169), the only proposer to move toward fairness. (#169)
- **Public goods stage collapsed into universal free-riding.** From minute 3 all four residents reasoned that a token returns only 0.4 to its contributor and contributed 0 (#307, #314, #321), repeated across rounds (#352, #381, #439). A04's lone earlier contribution of 5 (#338) was not reciprocated. (#307, #314, #321, #338, #352, #439)
- **Stag hunt opened cooperatively, then defection cascaded.** A04 and A02 started with A on cooperative reasoning (#531, #538), but once a partner defected, A02 switched to B (#575), then A01 (#610) and A04 (#603) computed that B dominates for any partner probability, and by minute 6 most players defaulted to B (#652, #665). (#531, #538, #575, #603, #610, #652, #665)
- **A01 tried to rebuild cooperation against the dominant move.** A01 wavered toward playing A against A04 to test reciprocity even though it knew B dominates (#634), but then joined the B bandwagon (#652). (#634, #652)

## Problems

1. **No levels solved and no points scored all run.** The run ended at minute 7 with zero correct submissions, every resident at level 1 and no standings (#680), so the competitive framing produced no progress. (#680)
2. **Residents explored only the payoff math, never the actual tasks.** Almost every reasoning line is arithmetic on the stated multipliers (#300, #314, #545, #603); nobody analyzed a puzzle structure or made a submission. (#300, #314, #545, #603)
3. **Payoff-dominant reasoning drove every stage to the antisocial equilibrium.** In public goods every resident computed defection as individually dominant and contributed 0 (#307, #352, #397); in the stag hunt most reasoned that B weakly dominates and picked it (#545, #627, #665). The mechanics pushed residents away from cooperation, so mutual-benefit outcomes were never reached. (#307, #352, #397, #545, #627, #665)
4. **Residents spent turns idling while waiting on others.** Several turns were spent explicitly doing nothing because the partner had not moved yet (#56, #218, #255), which is consistent with the 8 quiet minutes and zero submissions. (#56, #218, #255)

## Optimizations

- **Add a submission deadline or auto-resolve when there are no moves.** The harness recorded 8 quiet minutes with no submission (#680) and silent waiting turns (#218, #255); a per-minute task prompt or forced action would prevent idle minutes. (#218, #255, #680)
- **Make the cooperative outcome payoff-dominant in public goods.** Residents repeatedly computed a 0.4 return per token and defected (#307, #352); raising the multiplier above the number of players, or adding a punishment/reputation term, would give cooperation a reason. (#307, #352)
- **Give the stag hunt a known horizon or communication.** Residents justified defection with 'unknown number of rounds' and 'no reputation to build' (#641, #665); a fixed round count or a cheap talk channel would let reciprocity emerge. (#641, #665)
- **Explicitly point residents at the level tasks.** All four residents spent the run on game-theory arithmetic with no mention of a puzzle or submission (#300, #314); a first-turn instruction naming the actual task would fix this. (#300, #314)

## Loophole candidates

1. **Responders accepted any positive offer, letting proposers keep 7 of 10.** A01 offered only 3 in two rounds and both were accepted (#63, #165); the 'accept anything above zero' logic (#194) made the ultimatum a safe extraction path rather than a bargaining contest. (#63, #165, #194)

## Log issues

- line 1: event "block_started" (seq 1) does not match its schema
- line 2: event "round_opened" (seq 2) does not match its schema
- line 15: event "decision_made" (seq 15) does not match its schema
- line 23: event "decision_made" (seq 23) does not match its schema
- line 30: event "decision_made" (seq 30) does not match its schema
- line 42: event "decision_made" (seq 42) does not match its schema
- line 43: event "round_resolved" (seq 43) does not match its schema
- line 44: event "round_opened" (seq 44) does not match its schema
- line 51: event "decision_made" (seq 51) does not match its schema
- line 70: event "decision_made" (seq 70) does not match its schema
- line 84: event "decision_made" (seq 84) does not match its schema
- line 100: event "decision_made" (seq 100) does not match its schema
- line 101: event "round_resolved" (seq 101) does not match its schema
- line 102: event "round_opened" (seq 102) does not match its schema
- line 117: event "decision_made" (seq 117) does not match its schema
- line 123: event "decision_made" (seq 123) does not match its schema
- line 141: event "decision_made" (seq 141) does not match its schema
- line 147: event "decision_made" (seq 147) does not match its schema
- line 148: event "round_resolved" (seq 148) does not match its schema
- line 149: event "round_opened" (seq 149) does not match its schema
- and 98 more
