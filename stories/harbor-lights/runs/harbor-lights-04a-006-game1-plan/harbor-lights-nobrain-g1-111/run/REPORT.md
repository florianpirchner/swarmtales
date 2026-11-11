# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-g1` |
| Seed | 111 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 4 (referee) |
| Counted | events #4 to #619 (544 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.046 USD for this run (competitors 0.046, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 5 of 5 minutes without a submission; longest without one: minutes 0-4 (5) |
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

- **A01 and A04 open the run by lighting cards in minute 0.** A04 played the signalled Amber 1 from slot 4 (#77) and A01 played Rose 1 from slot 1 (#81), giving the crew its first two lit towers before minute 1. (#68, #77, #81)
- **A03's blind probe in minute 0 misfires and sets the crew's first strike.** A03 played slot 1 as a probe and it was Cobalt 6, a misfire costing the first strike (#44, #63). That strike raised the price of every later blind play for all four residents. (#43, #44, #63)
- **Signals drove most of the progress, not blind plays.** From minute 0 onward residents repeatedly spent signals to point playable cards at each other, e.g. A02's "1" to A03's Moss 1 (#110) and A01's "2" to A03's Violet 2 (#267), and those targets were then played and lit (#114, #156, #317). (#110, #114, #156, #267, #317)
- **A03 discards a known Moss 5 and skips the Moss tower forward.** At minute 3 A03 discarded slot 1, which was Moss 5, to regain a signal (#579); A03 noted Moss 5 and 6 were then both lost and Moss 7 became the playable card (#578). A02 had been holding Moss 5 and Moss 7 as a coin flip at 3 points a misfire (#559). (#559, #578, #579)
- **A04 burns a second strike on a one-in-three guess.** A04 played slot 1 knowing only that it held Amber 7, Cobalt 7 or Rose 5, and it was Amber 7, a misfire and strike 2 (#438, #451). A04 had already reasoned that only Rose 5 was playable among its three candidates. (#438, #451)
- **The crew ends minute 3 with several towers completed and play still not judged.** A01 completed Violet with Violet 5 (#555) and Rose with Rose 7 (#608), and A04 completed Cobalt with Cobalt 7 (#597). No submissions were recorded and the referee ended the run at minute 4 (#619). (#555, #597, #608, #619)

## Problems

1. **No resident made a submission for the whole five minutes.** The facts record 0 correct and 0 wrong submissions and a quiet stretch of minutes 0-4 (#619). Residents spent the time reasoning, signalling and playing cards but never reached the submission step the story presumably wants. (#13, #619)
2. **Long, speculative private reasoning dominates the log.** Several reasoning lines run into exhaustive card-counting and probability estimates (e.g. #119, #412, #464, #531), and each is followed by a separate SAYS TO ITSELF line. This left little room for board or DM interaction, of which the facts record zero. (#119, #412, #464, #531)
3. **The gamemaker took no actions and no beats were found.** The facts report no gamemaker actions and the deterministic digest found no beats, and there are no messages, posts or transfers anywhere in the run. The resident behaviour was entirely self-driven with no narrative pressure from the city. (#13, #619)
4. **The rules about strikes and the 'first strike is free' reading were inferred, not enforced by visible feedback.** A03 reasoned that a misfire costs 3 points and the first strike is free (#63), and A02 later assumed every misfire from then on costs 3 (#464). Neither line cites a rule shown by the city, so the residents may have been playing a cost model the city never gave them. (#63, #464)
5. **No resident level-ups at all; the run never left level 1.** The facts table shows every resident starting and finishing at level 1 with no level-ups, and no levels were solved this run. The story's progression mechanic never engaged. (#619)

## Optimizations

- **Add a visible, bounded submission prompt so the run can produce submissions.** Problem: 0 submissions in 5 minutes (#619). Give each resident an explicit 'submit now or pass' beat with a short countdown so the story cannot end on a quiet stretch with nothing to grade. (#619)
- **Cap or compress private reasoning lines.** Problem: reasoning entries like #412 and #464 consume whole turns with card-counting. Limit reasoning to a short length or a single line per turn so turns can be spent on plays, signals and messages, where the facts show zero interaction (#619). (#412, #464)
- **Make the misfire cost and strike rules explicit in the visible status.** Problem: residents reasoned about a 3-point misfire cost that was never confirmed by the city (#63, #464). Show the strike count and the exact penalty of the next misfire in the status line each turn so decisions are grounded in the real rules. (#63, #464, #559)
- **Have the gamemaker inject at least one event per run.** Problem: no gamemaker actions and no beats (#619). Give the gamemaker a small scripted set of nudges (a hint, a deadline, a twist) so the narrative layer exists and residents have something to react to beyond their own hand. (#619)
- **Give residents a play-now reason when a card is certain and a deadline is near.** Problem: A04 guessed at one-in-three (#438) while A02 sat on a coin flip it never played (#559), and the clock ran out. Add a visible 'turns remaining' pressure that raises the value of a play over a discard or a shuffle. (#438, #559, #578)

## Loophole candidates

1. **Discarding to farm signals replaced scoring plays.** (residents) Residents repeatedly discarded playable-looking cards mainly to regain signals — A04 discarded Violet 4 and Cobalt 4 in minute 1 (#152, #222), A03 discarded Violet 7 and Cobalt 5 (#262, #353). This is a cheaper, safer path than risking a 3-point misfire, and the run ended with no submissions. (#152, #222, #262, #353)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 16: event "signal_given" (seq 16) does not match its schema
- line 32: event "signal_given" (seq 32) does not match its schema
- line 47: event "card_played" (seq 47) does not match its schema
- line 48: event "card_drawn" (seq 48) does not match its schema
- line 57: event "card_played" (seq 57) does not match its schema
- line 58: event "card_drawn" (seq 58) does not match its schema
- line 71: event "card_played" (seq 71) does not match its schema
- line 72: event "card_drawn" (seq 72) does not match its schema
- line 88: event "signal_given" (seq 88) does not match its schema
- line 96: event "card_played" (seq 96) does not match its schema
- line 97: event "card_drawn" (seq 97) does not match its schema
- line 106: event "signal_given" (seq 106) does not match its schema
- line 122: event "signal_given" (seq 122) does not match its schema
- line 129: event "card_played" (seq 129) does not match its schema
- line 130: event "card_drawn" (seq 130) does not match its schema
- line 138: event "card_played" (seq 138) does not match its schema
- line 139: event "card_drawn" (seq 139) does not match its schema
- and 55 more
