# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-g1` |
| Seed | 109 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #5 to #765 (672 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.047 USD for this run (competitors 0.047, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0024 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Residents coordinated almost entirely through hint tokens and shared board reasoning, with zero messages.** Across minutes 1-4 the four residents played only lit cards by reacting to giveSignal hints and the visible towers, e.g. A01 signals A03 a rank 1 (#154) and A03 plays Amber 1 (#182). No DM, board or group post was ever sent, so all cooperation ran through mechanics. (#154, #182, #294, #391)
- **A01 drove the table with accurate playable-card signals.** A01 repeatedly signalled exactly the playable card: rank 2 to A04's Rose 2 (#294), rank 1 to A04's Violet 1 (#344), rank 4 to A03's Moss 4 (#391), rank 5 to A02's Moss 5 (#430), rank 3 to A02's Violet 3/Rose 3 (#540), rank 5 to its own slot 1 Violet 5 (#623). Those signals triggered six of the crew's lit cards. (#294, #344, #391, #430, #540, #623)
- **A02 misplayed on an ambiguous rank hint and took the crew's only strike.** A02 played slot 3 as Cobalt 3 off a "3" hint and misfired (#311), after reasoning the hint could be Cobalt 3 or Moss (#310). The Cobalt tower then waited on Cobalt 2 until A04 lit it at #589. (#310, #311, #589)
- **A03's own signalling mistake was punished by the same ambiguity.** A03 admitted it signalled a Cobalt 3 that was not yet playable and called the misfire its fault (#286). A02's later misfire on that hint (#311) shows the cost of signalling cards that are rank-correct but not yet playable. (#286, #311)
- **The crew lit 18 cards without a single level solved or submission.** Play reached 18 of 35 lit by minute 4 (Cobalt tower completed at #705, Violet completed at #747), yet the facts show zero submissions and zero level-ups. Effort was spent on the board and none on the level goal. (#705, #747)
- **A01 hit the same NOT_YOUR_TURN wall twice while trying to help.** A01 attempted giveSignal out of turn at #498 and again at #724, both refused as NOT_YOUR_TURN. The two tool errors in the facts come from these attempts to signal teammates. (#498, #724)

## Problems

1. **Nobody submitted anything for the whole run.** The facts record 0 submissions and 0 level-ups across 672 events, with a 6-minute stall from minute 0 to 5. Every resident spent its turns on towers and hints, never on the level task. (#182, #311, #413, #716)
2. **The start-of-run brain writing ate minute 0 and confused the residents.** All four residents first went to read or write the brain file (#13, #19, #25, #31), then found writeBrain locked (#75, #81) and reported there was nothing to play (#93, #97, #102, #106). The intended pre-game window produced only wasted turns. (#13, #31, #75, #93, #106)
3. **Rank hints are ambiguous and pushed residents into blind plays.** A02's "3" hint matched both Cobalt 3 and Moss (#310) and it misfired (#311); A04 called its slot 4 a coin flip at 50% and discarded instead of playing (#464, #465). The hint mechanic gives rank but not suit, so playable-vs-lost cards look identical. (#286, #310, #311, #464)
4. **Out-of-turn actions were offered then rejected.** A01 was allowed to attempt giveSignal when it was not its turn (#498, #724), producing two NOT_YOUR_TURN tool errors. The harness let the action start and refused it afterwards. (#498, #724)
5. **Residents repeatedly guessed at their own hands and gambled on slots.** A04 weighed a 50% Violet 2/6 play and discarded instead (#464, #465); A01 considered blind plays into the Violet 4 at 1-in-4 odds (#578). Because residents cannot see their own cards, several turns ended with no productive action. (#464, #578, #596, #645)

## Optimizations

- **Give hints suit plus rank, or make rank hints unambiguous.** The ambiguous "3" hint caused the run's only strike (#310, #311) and forced coin-flip risk assessments (#464). A suit+rank signal or a preview of playability would let residents act on hints safely. (#310, #311, #464)
- **Make the level task visible from minute 0.** With zero submissions across the run (#182, #716), the story should surface a clear level prompt or objective so towers don't swallow the entire clock. (#182, #716)
- **Fix the pre-game brain window.** Residents burned minute 0 on save/lock confusion (#75, #93, #106). Either grant the brain write earlier or remove the pre-game read step so the first turn is playable. (#75, #93, #106)
- **Check turn ownership before offering giveSignal.** A01 hit NOT_YOUR_TURN twice (#498, #724). The harness should only expose actions on the resident's own turn, or return a benign no-op rather than an error. (#498, #724)
- **Discourage blind plays with a safe, informative discard path.** Residents chose discards purely to regain signals when their hands were unknown (#465, #596). A cheap way to reveal one own card would convert stalls into productive plays. (#465, #578, #596)

## Loophole candidates

1. **Discarding became the default safe move while signals ran out.** (residents) A02 discarded repeatedly to regain signals (#195, #387, #501) and A04 discarded when blind play was risky (#465, #629). Spending turns discarding instead of solving keeps the crew safe but advances nothing toward a level. (#195, #387, #465, #629)
2. **A01 self-signalled its own playable card.** (residents) A01 signalled "5" to point at its own slot 1 Violet 5 (#623) and then played it (#653). Using a hint on oneself sidesteps the need for teammate coordination and makes self-play cheaper than mutual signalling. (#623, #653)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 41: event "brain_written" (seq 41) does not match its schema
- line 42: event "retro_closed" (seq 42) does not match its schema
- line 49: event "brain_written" (seq 49) does not match its schema
- line 50: event "retro_closed" (seq 50) does not match its schema
- line 56: event "brain_written" (seq 56) does not match its schema
- line 57: event "retro_closed" (seq 57) does not match its schema
- line 63: event "brain_written" (seq 63) does not match its schema
- line 64: event "retro_closed" (seq 64) does not match its schema
- line 128: event "cards_dealt" (seq 128) does not match its schema
- line 129: event "game_started" (seq 129) does not match its schema
- line 130: event "deal_revealed" (seq 130) does not match its schema
- line 141: event "signal_given" (seq 141) does not match its schema
- line 149: event "signal_given" (seq 149) does not match its schema
- line 161: event "card_played" (seq 161) does not match its schema
- line 162: event "card_drawn" (seq 162) does not match its schema
- line 170: event "signal_given" (seq 170) does not match its schema
- and 73 more
