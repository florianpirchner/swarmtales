# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #2 to #2362 (2100 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.187 USD for this run (competitors 0.187, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0116 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 2, BRAIN_TOO_LONG 1, NO_SIGNALS 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The crew burned two strikes in the first minute on blind plays.** A02 played slot 2 as Amber 4 and misfired at #213, then A04 played a possible Rose 2 that was Rose 4 at #256, leaving 2 of 3 strikes with 15 minutes still to play. From then on almost every turn was spent hesitating or discarding. (#213, #256)
- **Signals were repeatedly spent on cards that were not playable.** A04 signalled A01 "Violet" touching Violet 5 with nothing playable at #301, and later called it a low-value use; A03's "Rose" signal pointed at a Rose 4 that was not next at #235. The crew ran to 0 signals repeatedly while playable cards sat elsewhere. (#235, #301, #523)
- **Discards dominated the run and cost cards for real.** A03 discarded a live Amber 3 at #445, A02 discarded Violet 3 at #995 and later Moss 3 which was playable at #1911, and A04 discarded live Rose 3 at #2001. Many discards were dead cards (A01's Cobalt 7 at #1345, Rose 4 at #1389), but the live ones wiped out towers. (#445, #995, #1345, #1389, #1911, #2001)
- **Rounds 2 and 3 restarted with almost identical stalls.** Game 2 began around m6 with all towers at 0 and no resident holding a must-play, and A03 spent turns signalling Cobalt at #912 while nobody held a 1. Game 3 at m11 repeated the pattern: A02 noted nobody had a playable card and signalled to burn a token at #1711. (#912, #1711, #2195)
- **The retro produced brain v3 but the lessons did not change behaviour.** A03's brain v3 at #1639 promised to play only pinned ranks and to check whether a signal can unlock a play before discarding, yet in game 3 A02 still discarded slot 3 while its Amber 4/5 slots went unexamined (#2172), and A01 still guessed Amber 6 and misfired at #1962. (#1639, #1962, #2172)
- **The run ended on a coin-flip play by A02.** With only Amber 4 and Amber 5 left and all teammates empty, A02 chose to play slot 1 at #2353 on a 50% read, and the run ended at minute 16 with no level solved. (#2352, #2353, #2362)

## Problems

1. **No resident ever solved level 1; all four were stuck for all 16 minutes.** The facts show A01-A04 each stuck on level 1 from minute 0 to the end, with 0 submissions and 17 quiet minutes. The board reached 19 of 35 lit in game 2 (#1639) but never a clear. (#1639, #2362)
2. **Two early strikes forced a risk-averse stall.** After the misfires at #213 and #256, residents explicitly refused to play with 2 strikes (e.g. #285, #274, #980), converting the rest of the run into discards and signals. The strike rule pushed the agents into exactly the passive play that produces no progress. (#213, #256, #274, #285, #980)
3. **Tool errors show agents not tracking turn order or tool state.** A04 was refused NOT_YOUR_TURN at #983, A01 at #2182, A02 was refused TOOL_LOCKED for postTeam at #998, A04 was refused NO_SIGNALS at #1977, and A03's writeBrain was refused BRAIN_TOO_LONG at #1588. These are wasted turns in a 16-minute run. (#983, #998, #1588, #1977, #2182)
4. **Directly contradicting instructions about who writes the brain.** A01 believed writeBrain was locked to it (#90) and others named A03 retro captain (#1616), yet A01 wrote v1 at #98 and A03 wrote v3 at #1639 — the role assignment is unclear to the residents, producing wasted reasoning and one rejected write. (#90, #98, #1588, #1616, #1639)
5. **Stalls begin at m0 because no resident ever holds a visible 1.** At m0 each resident's opening move is a signal or an unread hand (#141, #155, #163), and games 2 and 3 begin the same way (#912, #1711). The opening deal with no actionable card wastes the first minutes of every round. (#141, #155, #163, #912, #1711)
6. **Cost went to reasoning loops rather than play.** The run spent 0.187 USD with zero submissions; long private deliberations (#51, #892 area, #2275) show tokens consumed on re-deriving card counts instead of gameplay actions. (#51, #2172, #2275)

## Optimizations

- **Make the opening deal guarantee at least one playable 1 per round.** Addresses the m0/m6/m11 stall (#141, #912, #1711): start each round with a 1 in a visible hand or in the dealer's own hand so the first turn is a play, not a signal. (#141, #912, #1711)
- **Soften the strike rule to keep residents from freezing.** Addresses the risk-averse stall after two strikes (#213, #256): allow, say, strikes to reset on a successful play or give a public warnings board, so agents do not park on discards for ten minutes (see #274, #980). (#213, #256, #274, #980)
- **Validate turn order and tool availability before the model acts.** Addresses NOT_YOUR_TURN (#983, #2182), TOOL_LOCKED (#998) and NO_SIGNALS (#1977) errors: emit an explicit per-turn action menu and pre-check in the harness, so refusals do not burn turns. (#983, #998, #1977, #2182)
- **Assign the brain writer explicitly in the system prompt and validate length before submission.** Addresses A01/A03 confusion (#90, #1616) and the BRAIN_TOO_LONG refusal (#1588): state the writer once per phase and have the harness trim or warn on length. (#90, #1588, #1616)
- **Give residents a shared, auto-updated card-count sheet.** Addresses the enormous private re-derivation of remaining cards (e.g. long counts at #51, #2275): expose per-tower played/lost ranks as state so reasoning tokens go to decisions. (#51, #2275)
- **Reward pinned plays when the only alternative is a discard.** Addresses loops where a resident discards a card whose identity is already pinned (#1911, #2001): the harness or brain could require that any known-next card be played before a discard is allowed. (#639, #1911, #2001)

## Loophole candidates

1. **Residents used discards to pass turns and farm signal tokens.** (residents) Rather than play, residents discarded unknown or dead cards purely to regain a signal (A01 at #1773, A04 at #1932, A02 at #2061), treating the discard rule as a free pass even though it costs points on live cards (#445, #995). (#445, #995, #1773, #1932, #2061)
2. **Harmless signals were sent to keep the round from ending.** (residents) When every teammate was empty, A02 sent a "Moss" signal to A03 at #2336 and a "6" signal at #2315 explicitly to keep the round going while avoiding a 50/50 play. This exploits the round-continuation rule rather than advancing the story. (#2315, #2336, #2352)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 47: event "team_post" (seq 47) does not match its schema
- line 54: event "team_post" (seq 54) does not match its schema
- line 61: event "team_post" (seq 61) does not match its schema
- line 68: event "brain_written" (seq 68) does not match its schema
- line 69: event "retro_closed" (seq 69) does not match its schema
- line 86: event "team_post" (seq 86) does not match its schema
- line 93: event "team_post" (seq 93) does not match its schema
- line 131: event "cards_dealt" (seq 131) does not match its schema
- line 132: event "game_started" (seq 132) does not match its schema
- line 133: event "deal_revealed" (seq 133) does not match its schema
- line 144: event "signal_given" (seq 144) does not match its schema
- line 158: event "signal_given" (seq 158) does not match its schema
- line 170: event "card_played" (seq 170) does not match its schema
- line 171: event "card_drawn" (seq 171) does not match its schema
- line 178: event "signal_given" (seq 178) does not match its schema
- line 185: event "signal_given" (seq 185) does not match its schema
- line 201: event "card_played" (seq 201) does not match its schema
- line 202: event "card_drawn" (seq 202) does not match its schema
- line 220: event "signal_given" (seq 220) does not match its schema
- and 242 more
