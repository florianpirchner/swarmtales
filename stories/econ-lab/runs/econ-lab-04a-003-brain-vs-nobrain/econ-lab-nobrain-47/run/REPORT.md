# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab-nobrain` |
| Seed | 47 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 7 (referee) |
| Counted | events #3 to #665 (547 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.013 USD for this run (competitors 0.013, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0016 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

- **A01 free-rode through the whole public-goods phase while the other three cooperated.** A01 contributed 0 in the 1.6x public-goods game while A02, A03 and A04 each put in 5, and A01 itself computed the advantage: pot 24 split four ways gave 16 to A01 versus 11 to the others (#325). The others noticed and named A01 a free-rider but kept contributing 5 out of conditional-cooperation logic (#332, #339, #362, #375, #449). (#315, #325, #332, #362, #449)
- **The whole run produced no submissions at all.** Across all 8 minutes no resident submitted anything, no level was solved, and no transfer went through. The last logged resident activity is A02 weighing a stag-hunt choice at minute 5 (#568), after which nothing happens until the referee ends the run at minute 7 (#665). (#568, #665)
- **Ultimatum offers settled into a stable lowball of 3, always accepted.** A04 and A02 repeatedly offered 3 out of 10 (#71, #105, #237) and A03 and A01 accepted on the reasoning that any positive amount beats zero (#94, #158, #170). A02 considered dropping the offer to 4 but kept 5 for reliability (#46), and A01 tallied points from repeated 7/5/7/3 rounds (#285). (#46, #94, #158, #237, #285)
- **Residents recognized the stag hunt but the run ended before the choice resolved.** A03 and A04 correctly derived the payoffs (mutual A = 3 each, mutual B = 1 each, mismatch gives B 5 and A 0) (#532, #545). A01 locked in A against A02 (#555) while A02 was still deciding whether to trust A or defect to B (#568), then the referee stopped the run (#665). (#532, #545, #555, #568, #665)
- **Several residents spent turns idling for offers that were already locked or absent.** A01 ended turns waiting on offers that did not need a decision (#54, #55, #146), and A02, A03 and A04 also idled on viewTable because the respond/offer tools were locked (#59, #65, #180, #223, #233). This burned minutes without advancing play. (#55, #59, #65, #180, #223)
- **A02 finished the first game last and read its own result off the table.** A02 reported finishing Game 1 with 26 points behind A01 (32), A03 (32) and A04 (30) (#276), and A01 independently reconstructed the same totals from rounds (#285, #286). This is the only explicit scoring feedback in the log. (#276, #285, #286)

## Problems

1. **No resident ever submitted, so no level was solved or scored.** The facts show 0 correct and 0 wrong submissions and nobody stuck, with quiet minutes 0-7. The main gameplay loop never engaged, and the gamemaker took no actions either (#665). (#665)
2. **The offer game stalled in sealed or pending states that produced idle turns.** Residents repeatedly saw the offer/respond tool locked and could only call viewTable, then ended their turn waiting (#59, #65, #180, #233). A01 and A04 also waited for offers that the log shows were sealed but invisible to them (#55, #146). (#55, #59, #65, #146, #233)
3. **The public-goods game was exploited by one free-rider without consequence.** A01 contributed 0 every round while others gave 5, reaping 16 against 11 (#325, #332, #449). The conditional cooperators never punished A01, so the cooperative norm was undermined and A01's defect was strictly profitable. (#325, #332, #362, #449)
4. **The run ended mid-decision with the payoff of the final choice never recorded.** A02 was still reasoning about the stag-hunt choice against A01 (#568) when the referee ended the run at minute 7 (#665), so that round's outcome is unlogged and A02's choice is unresolved. (#568, #665)
5. **Residents spun on game-theory reasoning instead of acting, consuming the available time.** Long REASONING entries weigh dominant-move theory across many turns (#294, #301, #308, #420, #433) without producing submissions, and the run has 0 messages and 0 transfers. The deliberation replaced play rather than supporting it. (#294, #301, #420, #433)

## Optimizations

- **Make the target game's submit path obvious and available.** Since no submissions occurred at all (#665), the next version should surface the submission tool and the level objective early and prominently so residents do not spend the whole run in side-games. (#665)
- **Unlock or hide the offer/respond tools so turns cannot dead-end.** Residents idled when the offer tool was locked and only viewTable remained (#59, #65, #180). The harness should either keep the responding tool available while an offer is pending or tell the resident explicitly that it must wait. (#59, #65, #180, #233)
- **Add a punishment or conditional-defection option to the public-goods game.** A01 free-rode for every round and other players just kept contributing 5 (#325, #362, #449). Giving cooperators a way to sanction or cut contributions when someone defects would restore the story's intended incentive tension. (#325, #362, #449)
- **Ensure a decisive round completes before the referee ends the run.** The final stag-hunt choice was still undecided when the run ended at minute 7 (#568, #665). The harness should either allow the pending round to resolve or start such choices earlier so the outcome is observable. (#568, #665)
- **Cap or gate pure deliberation to force concrete actions.** Long theory-only reasoning lines (#294, #301, #433) preceded idle turns and no submissions. Limiting reasoning or requiring an action after each reasoning phase would push residents toward play. (#294, #301, #433)

## Loophole candidates

1. **A01 used the one-shot dominant strategy to free-ride profitably with no penalty.** (residents) A01 contributed 0 each round, noting that others contributing 5 still left it ahead (#449), and the group payoff gave it 16 against 11 for contributors (#325). The public-goods rule let a single resident defect indefinitely without cost. (#325, #449)
2. **Responders accepted minimal offers, letting proposers keep almost everything.** (residents) A03 and A04 offered only 3 of 10 and responders accepted on the 'any positive beats zero' logic (#94, #158, #170). This let proposers lock in 7 points repeatedly without needing to offer fairly. (#94, #158, #170)

## Log issues

- line 1: event "block_started" (seq 1) does not match its schema
- line 2: event "round_opened" (seq 2) does not match its schema
- line 15: event "decision_made" (seq 15) does not match its schema
- line 21: event "decision_made" (seq 21) does not match its schema
- line 34: event "decision_made" (seq 34) does not match its schema
- line 40: event "decision_made" (seq 40) does not match its schema
- line 41: event "round_resolved" (seq 41) does not match its schema
- line 42: event "round_opened" (seq 42) does not match its schema
- line 49: event "decision_made" (seq 49) does not match its schema
- line 74: event "decision_made" (seq 74) does not match its schema
- line 90: event "decision_made" (seq 90) does not match its schema
- line 97: event "decision_made" (seq 97) does not match its schema
- line 98: event "round_resolved" (seq 98) does not match its schema
- line 99: event "round_opened" (seq 99) does not match its schema
- line 108: event "decision_made" (seq 108) does not match its schema
- line 120: event "decision_made" (seq 120) does not match its schema
- line 128: event "decision_made" (seq 128) does not match its schema
- line 134: event "decision_made" (seq 134) does not match its schema
- line 135: event "round_resolved" (seq 135) does not match its schema
- line 136: event "round_opened" (seq 136) does not match its schema
- and 98 more
