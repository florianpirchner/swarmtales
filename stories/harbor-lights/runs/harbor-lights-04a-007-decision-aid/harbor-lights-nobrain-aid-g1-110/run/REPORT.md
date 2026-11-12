# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-aid-g1` |
| Seed | 110 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 4 (referee) |
| Counted | events #4 to #604 (528 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.045 USD for this run (competitors 0.045, gamemaker 0.000, classifier 0.000) |
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

- **A01 turned almost every turn into a signal for someone else.** A01 repeatedly spent its turn signalling teammates instead of playing: #33 (Rose 1 to A03), #92 (Amber 1 to A03), #137 (Amber 2 to A04), #174 (Cobalt 1 to A02), #226 (Moss 1 to A03). Its signals set up the first lit cards of Amber, Cobalt, Moss and Rose within minutes 0-1. (#33, #92, #137, #174, #226)
- **A03 and A04 carried the lighting while others signalled.** A03 lit Rose 1 (#67), Rose 2 (#149), Moss 1 (#265), Rose 3 (#304) and Moss 5 (#559); A04 lit Amber 2 (#207), Moss 3 (#318), Cobalt 5 (#496), Cobalt 6 (#543) and Moss 7 (#593). This split — one signal-feeder, two executors — drove the card count from 0 to 19. (#67, #149, #207, #265, #304, #318, #496, #543, #559, #593)
- **Residents deliberately avoided blind plays because of the 3-point misfire penalty.** A02 discarded rather than play blind at ~14% odds (#88, #231), A04 discarded Cobalt 4 for a signal (#357), and A03 discarded Rose 7 for the same reason (#369). The soft-strike penalty was cited as the deciding factor each time. (#88, #231, #357, #369)
- **A01's mistaken read cost the crew a playable Rose 5.** A01 believed slot 1 was Cobalt 6 but it was Rose 5, and discarded it (#511, #512), leaving Cobalt 7 (held until Cobalt 6 landed) as its only card; it then lit Cobalt 7 in #554. (#511, #512, #554)
- **The run ended mid-stride with towers nearly complete.** By minute 3 the crew had lit 19 of 35 cards (#563) and A04 finished the Moss tower (#593), with only A03's Amber 7 expected to remain (#576, #593). The referee stopped the run at minute 4 (#604) before a level was solved. (#563, #576, #593, #604)

## Problems

1. **No level was solved and no resident submitted a solution.** The facts show 0 correct and 0 wrong submissions and no level-ups; the run ended at minute 4 (#604) with the board only partly lit. (#604)
2. **Every minute was quiet because no resident ever submitted.** There were 5 of 5 minutes without a submission (#604 facts), so the referee ended the run on time rather than on success or failure. (#604)
3. **The misfire penalty steered residents toward discards and signals instead of playing.** Residents repeatedly chose discards to regain signals rather than risk a blind misfire: #88, #231, #357, #369. Even when slots were known-playable, A02 held its hand back because 'a misfire would cost 3 points' (#382). (#88, #231, #357, #369, #382)
4. **Several signals were redundant because the receiver had already deduced the card.** A04 signalled A01 'Moss' for a card A01 had just been told about, and A01 still treated it as a coin flip (#252, #257); A02 signalled A01 a '2' for Cobalt 2 after A01 had just played Violet 1 (#382, #432). Signal tokens were spent without changing play. (#252, #257, #382, #432)
5. **No communication, transfers or gamemaker actions ever occurred.** The facts record 0 messages, 0 transfers and no gamemaker actions; the only 'communication' was private self-talk and reasoning, so no social dynamic was exercised. (#33, #116, #252, #604)

## Optimizations

- **Reward played cards, not just signals, so residents don't hoard turns.** Residents spent turns on signals that duplicated known info (#252, #382) while the card count stalled; a progress-based incentive would push play over talk. (#252, #382)
- **Make signals cheaper or shareable so the signal economy doesn't run dry.** The signal pool dropped to 1 of 6 by #444, forcing discards (#357, #369) and limiting signals to one target; a shared pool or cheaper signals would keep information flowing. (#357, #369, #444)
- **Give residents a visible, per-slot confidence so they stop treating known cards as coin flips.** A01 misread its own slot (#511) and A04 weighed a 50% Moss 3/Moss 7 coin flip (#296); a tracker of what each has deduced would reduce misplays. (#296, #511)
- **Set a longer run or earlier end condition so near-complete boards aren't cut off.** At minute 4 the crew had 19 of 35 lit and only A03's Amber 7 left (#593); the run ended (#604) before the payoff and before any level could be submitted. (#563, #593, #604)
- **Reconsider the 3-point misfire penalty since it suppresses blind play.** Residents cited the 3-point cost as the reason not to play blind in #88, #231 and #357; a softer penalty or a small reward for safe plays would get cards on the table. (#88, #231, #357)

## Loophole candidates

1. **Feeding signals to teammates is a cheaper path to lit cards than playing blind.** (residents) A01 alone used its turn to signal A03, A02 and A04 (#33, #174, #226) while never risking a misfire itself, letting others absorb the play risk. (#33, #174, #226)
2. **Discarding is a safe way to refresh signals and skip risky slots.** (residents) A02 discarded Violet 7 to regain a signal (#88) and A02 again in #231; A03 in #369; A04 in #357. Discarding avoided the 3-point penalty while still feeding the signal economy. (#88, #231, #357, #369)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 17: event "signal_given" (seq 17) does not match its schema
- line 28: event "card_played" (seq 28) does not match its schema
- line 29: event "card_drawn" (seq 29) does not match its schema
- line 47: event "card_played" (seq 47) does not match its schema
- line 48: event "card_drawn" (seq 48) does not match its schema
- line 56: event "signal_given" (seq 56) does not match its schema
- line 63: event "signal_given" (seq 63) does not match its schema
- line 74: event "card_discarded" (seq 74) does not match its schema
- line 75: event "card_drawn" (seq 75) does not match its schema
- line 83: event "card_played" (seq 83) does not match its schema
- line 84: event "card_drawn" (seq 84) does not match its schema
- line 99: event "signal_given" (seq 99) does not match its schema
- line 112: event "signal_given" (seq 112) does not match its schema
- line 124: event "card_discarded" (seq 124) does not match its schema
- line 125: event "card_drawn" (seq 125) does not match its schema
- line 132: event "card_played" (seq 132) does not match its schema
- line 133: event "card_drawn" (seq 133) does not match its schema
- and 56 more
