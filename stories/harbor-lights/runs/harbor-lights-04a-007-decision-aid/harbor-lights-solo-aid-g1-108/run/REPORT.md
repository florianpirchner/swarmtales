# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-aid-g1` |
| Seed | 108 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #5 to #737 (642 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.051 USD for this run (competitors 0.051, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0046 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
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

- **The crew lit 18 cards through cooperative signalling before the referee ended the run at minute 5.** Residents alternated signal-give and play turns, with A02 confirming Moss 4 lit at #581 and A04 reporting the crew at 18 lit after playing Violet 2 at #688. A03's Cobalt 1 play at #500 and A04's Rose 4 play at #474 show the co-op loop working as intended early. (#474, #500, #581, #688)
- **A01's only rejected action was a signal attempted out of turn.** At minute 3 A01 tried giveSignal and the city refused it with NOT_YOUR_TURN because it was A04's turn (#497). A01 then acknowledged the turn order and ended its turn (#559). (#497, #559)
- **A04 cost the crew a strike by blind-playing Violet 5 when Moss 5 and Violet 2 were also playable.** A04 knew each of its three slots had about a 2/3 playable chance (#602) and played slot 1 anyway; it was Violet 5 and misfired as strike 2, -3 points (#626). A04 then recovered by lighting Violet 2 at #688. (#602, #626, #688)
- **Three residents discarded playable cards by mistake, showing weak deduction about their own hands.** A02 discarded Amber 5, a playable card, and called it a costly miss (#469, #470). A04 discarded Amber 6, also playable (#575, #576), and A03 discarded Rose 6, the one card it could have played (#595, #596). (#469, #470, #575, #576, #595, #596)
- **No resident submitted a level solution or sent any message all run.** The computed facts show 0 correct and 0 wrong submissions, 0 DMs, 0 board posts and 0 group posts across minutes 0-5. Residents spent the whole run in the card game loop instead (#13-#737). (#13, #737)
- **Before the game opened, all four residents obeyed the brain-writing instruction and then idled.** A01 (#13), A04 (#19), A03 (#25) and A02 (#31) each planned to read the brain first. A02 (#97) and A03 (#101) then reported the game had not started and waited. (#13, #19, #25, #31, #97, #101)

## Problems

1. **The run produced no competitive result: no levels, no submissions, no standings.** Facts show no levels solved, 0 submissions and final standings unknown, ending at minute 5 by referee (#737). The story's competition for seats never manifested. (#737)
2. **The design intent was invisible because the run config had no story.** The facts state 000-run.json has no story, so the harbor-lights-solo-aid-g1 premise and any secret goals could not be checked against behavior. Residents had no persona or motive listed, and their reasoning stays inside the card game (#130, #445). (#130, #445)
3. **Six minutes of silence: no submission in minutes 0-5.** The facts record 6 of 6 quiet minutes with the longest gap spanning the whole run. The only game activity was card plays and signals, not the level-solving the harness is meant to measure. (#737)
4. **Residents misjudged their own hands and discarded playable cards repeatedly.** A02 discarded Amber 5 calling it costly (#470), A04 discarded Amber 6 (#576) and A03 discarded Rose 6 (#596). The reasoning at #602 shows they were estimating odds rather than deducing from signals, which degraded crew score. (#470, #576, #596, #602)
5. **One resident hit an out-of-turn tool error.** A01's giveSignal at #497 was refused with NOT_YOUR_TURN, the only tool error in the run. The harness allowed the call to be attempted rather than gating it client-side. (#497)
6. **The brain-writing instructions consumed turns before the game opened.** A04 and A02 wrote or referenced brain version 1 and then reported nothing to do (#92, #97), and A03 waited similarly (#101). Early minutes went to setup chatter instead of play. (#92, #97, #101)

## Optimizations

- **Give the run a story file so residents have motives and secret goals.** Because 000-run.json has no story, no resident persona or goal was dealt and behavior could not be judged against intent (#13, #130). Ship a story with the run config. (#13, #130)
- **Gate out-of-turn tool calls before they reach the city.** The NOT_YOUR_TURN refusal at #497 shows A01 attempted a signal during A04's turn. Have the harness expose turn state so agents can check before calling. (#497)
- **Add a hint or auto-deduction aid for residents' own hands.** Three separate discards of playable cards (#470, #576, #596) came from probability guessing (#602). A per-slot playability summary would cut these self-inflicted losses. (#470, #576, #596, #602)
- **Shorten or defer the brain-writing phase until after game start.** Residents spent early turns on brain reads and version-1 writes before the game opened (#92, #97, #101). Move brain setup outside the timed run. (#92, #97, #101)
- **Track and surface the score and strikes to residents during play.** A04 only learned of strike 2 after its misfire (#626), and A02's costly miss was noticed after the fact (#469). Live score feedback would let residents weigh risk against penalty. (#469, #626)
- **Ensure the run reaches the level-clear loop, not just the card game.** The whole run stayed in the card game with 0 submissions and no levels solved (#737). Confirm the card game is the intended path or add a transition to levels. (#737)

## Loophole candidates

1. **Residents avoided all risk by discarding rather than playing uncertain cards.** (residents) A02 discarded Cobalt 7 rather than risk a misfire (#692) and A02 held a 40% read rather than play (#470). Discarding for signals became a safe default that stalled scoring even when playable cards existed. (#470, #692)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 40: event "brain_written" (seq 40) does not match its schema
- line 41: event "retro_closed" (seq 41) does not match its schema
- line 48: event "brain_written" (seq 48) does not match its schema
- line 49: event "retro_closed" (seq 49) does not match its schema
- line 56: event "brain_written" (seq 56) does not match its schema
- line 57: event "retro_closed" (seq 57) does not match its schema
- line 63: event "brain_written" (seq 63) does not match its schema
- line 64: event "retro_closed" (seq 64) does not match its schema
- line 123: event "cards_dealt" (seq 123) does not match its schema
- line 124: event "game_started" (seq 124) does not match its schema
- line 125: event "deal_revealed" (seq 125) does not match its schema
- line 133: event "signal_given" (seq 133) does not match its schema
- line 142: event "signal_given" (seq 142) does not match its schema
- line 159: event "card_played" (seq 159) does not match its schema
- line 160: event "card_drawn" (seq 160) does not match its schema
- line 170: event "card_played" (seq 170) does not match its schema
- and 75 more
