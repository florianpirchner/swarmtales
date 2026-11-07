# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-07 |
| Story | `blind-bid-nobrain` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 6 (referee) |
| Counted | events #4 to #762 (605 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.026 USD for this run (competitors 0.026, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0020 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 7 of 7 minutes without a submission; longest without one: minutes 0-6 (7) |
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

- **The whole run produced no submissions and no points.** Across all 605 events from #4 to #762, no resident ever submitted a bid: 0 correct, 0 wrong, and quiet in every minute from 0 to 6. The run ended at minute 6 with A01-A04 all still at level 1. (#4, #762)
- **All four residents passed or reasoned to bid zero on every everyone-pays lot.** On the all-pay lots the residents uniformly concluded bidding was a certain cost. A01 passed at #105, A04 at #112, A02 at #119, A03 at #126, and again A01 at #364 and A02 at #495/#624, A04 at #617 and A03 at #734. (#105, #112, #119, #126, #364, #495, #617, #734)
- **Residents reasoned correctly about second-price and third-price dominance but still never submitted.** On the second-price lots A04 (#137), A03 (#144), A02 (#151) and A01 (#158) all derived truthful bidding, and on the third-price lots A04 (#57), A03 (#302), A01 (#309) and A02 (#316) did the same. Those conclusions never turned into a logged submission. (#137, #144, #151, #158, #302, #309, #316)
- **Winner's curse reasoning repeatedly pushed bids down without any bid being placed.** On shared-value lots A01 (#95, #333), A03 (#340), A02 (#347) and A04 (#326, #593) all recognised the winner's curse and moved to shade or pass. A02's estimate of 9 against the 30-90 range led it to pass at #680. (#95, #326, #333, #340, #347, #593, #680)
- **A01 recalled a prior result that suggests bids existed but were never logged.** A01 at #182 says its last estimate of 55 was off, the real value was 43 and the winner paid 50, and at #673 refers to a past bid of 46 against an estimate of 56. No submission, transfer or level-up appears in the computed facts for this run. (#182, #673)

## Problems

1. **The harness recorded no submissions at all despite extensive bidding reasoning.** Every resident spent minutes reasoning about concrete bids (e.g. #206, #213, #451, #464, #717) but the run counts 0 submissions, 0 correct, 0 wrong. Either the submit action was never exposed or every bid failed silently. (#206, #213, #451, #464, #717)
2. **Residents were stuck on level 1 for the entire 7 minutes.** No level was solved and quiet minutes run 0-6 with no gap under 7 minutes, so the first level was never cleared by anyone. The stall covers the whole game window before the referee ended it at #762. (#762)
3. **The all-pay mechanic reliably produced a mass pass, stalling the game.** Four separate all-pay lots saw every resident reason to bid zero because the bid is a certain cost (#105, #112, #119, #126) and later repeats (#364, #495, #617). This mechanic predictably killed the action in each round. (#105, #112, #119, #126, #364, #617)
4. **Residents had no persona or story context, only auction math.** The facts table shows persona '-' for A01-A04 and the run has no story, and every log line is pure expected-value arithmetic with no reference to a city, rivals or goals. The competitive narrative the designers wanted never appears. (#12, #19, #26, #33)
5. **No resident ever communicated or competed openly.** There were 0 DMs, 0 board posts and 0 group posts, and no transfers attempted or refused. The social competition between residents never materialised, leaving only private reasoning. (#12, #19, #26, #33)

## Optimizations

- **Log and expose a submission outcome for every bid attempt.** Make each bid produce a VERIFIED or REFUSED line so the digest can attribute the 0 submissions seen in the facts. Today reasoning like #206 and #451 leads nowhere visible. (#206, #451)
- **Rework or drop the everyone-pays lot to avoid guaranteed passes.** The all-pay rule made every resident conclude passing is optimal (#105, #112, #119, #126), removing the tense decisions the game needs. Either lower the cost or cap bidders so a positive bid can be worth it, as A03 tried to compute at #236. (#105, #112, #119, #126, #236)
- **Give residents a short story and a core motive.** The facts list all personas as '-' and there is no story, so residents only optimise arithmetic (#19, #33). Assign a goal and a rival so they care about beating A02 or A03, not just expected value. (#19, #33)
- **Add a per-minute nudge or referee hint when no submission is logged.** Seven straight quiet minutes (#4 to #762) went uncorrected. A hint after one quiet minute, e.g. directing residents to the submit control, would stop a silent stall from lasting the whole run. (#4, #762)
- **Reconcile remembered results with logged events.** A01's memories at #182 and #673 refer to previous winning bids that do not appear as submissions in the facts. Ensure prior-lot outcomes are logged so residents' recall and the report agree. (#182, #673)

## Loophole candidates

1. **Passing avoided all risk but also any chance of scoring.** (residents) Residents treated bidding zero as the safest play in every auction form (#105, #119, #481, #610), so nobody ever had to commit coins. The no-bid path sidestepped the competitive pressure the lots were designed to create. (#105, #119, #481, #610)
2. **Residents reasoned with strangers' revealed values rather than real rivals.** (residents) Several residents assumed rivals' values were uniform on 10-60 and maximised against that invented distribution (#26, #278, #517), treating the game as a textbook problem rather than a contest with A01-A04. That let them skip reading or bargaining with opponents. (#26, #278, #517)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 2: event "lots_dealt" (seq 2) does not match its schema
- line 3: event "lot_opened" (seq 3) does not match its schema
- line 15: event "bid_placed" (seq 15) does not match its schema
- line 22: event "bid_placed" (seq 22) does not match its schema
- line 29: event "bid_placed" (seq 29) does not match its schema
- line 36: event "bid_placed" (seq 36) does not match its schema
- line 37: event "lot_resolved" (seq 37) does not match its schema
- line 38: event "lot_opened" (seq 38) does not match its schema
- line 46: event "bid_placed" (seq 46) does not match its schema
- line 53: event "bid_placed" (seq 53) does not match its schema
- line 60: event "bid_placed" (seq 60) does not match its schema
- line 67: event "bid_placed" (seq 67) does not match its schema
- line 68: event "lot_resolved" (seq 68) does not match its schema
- line 69: event "lot_opened" (seq 69) does not match its schema
- line 77: event "bid_placed" (seq 77) does not match its schema
- line 84: event "bid_placed" (seq 84) does not match its schema
- line 91: event "bid_placed" (seq 91) does not match its schema
- line 98: event "bid_placed" (seq 98) does not match its schema
- line 99: event "lot_resolved" (seq 99) does not match its schema
- and 137 more
