# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-soft-strikes` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 14 (referee) |
| Counted | events #2 to #2123 (1872 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 14 minutes (to the end); A02 on level 1 from minute 0 for 14 minutes (to the end); A03 on level 1 from minute 0 for 14 minutes (to the end); A04 on level 1 from minute 0 for 14 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.161 USD for this run (competitors 0.161, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0046 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 15 of 15 minutes without a submission; longest without one: minutes 0-14 (15) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3, NO_SIGNALS 1, NOT_YOUR_TURN 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 wrote a crew brain in minute 0 from channel agreement** A01 wrote and saved brain version 1 (115 words) in minute 0, after A03, A04 and A02 agreed in the channel on rank-vs-suit signal conventions; #89 records A01 confirming it matches what the team agreed. This is the only coordination artifact the crew produced in the run's opening. (#51, #58, #74, #89)
- **A02 was the retro captain for games 1-2 but hit the brain word limit three times** A02's writeBrain calls were refused with BRAIN_TOO_LONG at 159 words and twice at 151 words against a 150 limit (#752, #781, #796), before brain v2 (148 words) saved at #823. The three refusals cost real minutes of a 15-minute run. (#752, #781, #796, #823)
- **Residents played solitaire Hanabi competently but the run ended with no levels and a stall label** The reasoning shows long, mostly correct Hanabi play across minutes 0-13, with cards lit and towers completed (#1342, #2034), yet the computed facts record no levels solved, 0 submissions and every resident stuck on level 1 for all 14 minutes. The activity did not register as progress. (#1342, #2034, #2123)
- **A02 abandoned careful play for blind slot-1 gambles in the last game** In the final game A02 played slot 1 blind and misfired twice (#1614 Moss 3, #1662 Rose 3), then reasoned that both remaining slots were playable so order did not matter (#2015). The shift from evidence-based signals to betting is a clear behaviour change under time pressure. (#1614, #1662, #2015)
- **A04 discarded playable cards, including leading Cobalt 3 and Amber 4** A04 threw away Cobalt 3 at #432 calling it a mistake, then discarded Amber 4 while holding no playable card (#1941). A01 also discarded Moss 3 thinking it was junk (#1269). These self-inflicted losses show the 'discard only known-dead cards' rule was repeatedly broken. (#432, #1269, #1941)

## Problems

1. **Zero levels solved and zero submissions despite 14 minutes of active play** Facts show no level-ups and 0 submissions, with all four residents labelled stuck on level 1 from minute 0 to 14. The reasoning shows them believing they were playing a Hanabi-like game and lighting cards, but nothing converted into a solved level. (#1342, #2034, #2123)
2. **The brain word limit silently blocked the retro captain** A02 was refused three times for a brain over 150 words, each refusal logged as BRAIN_TOO_LONG, before finally saving a 148-word version. With a 15-minute run this burned minutes on a formatting technicality rather than on strategy. (#752, #781, #796, #823)
3. **Tool access errors wasted turns** A02 was refused a team post with TOOL_LOCKED at #182 and a play with NOT_YOUR_TURN at #403; A04's signal was refused with NO_SIGNALS at #1980. Each error means a resident spent a turn on an action the city would not accept, and none of the reasoning lines shows them anticipating the lock. (#182, #403, #1980)
4. **Residents played the wrong meta-game: long Hanabi analysis instead of the city competition** Reasoning lines are devoted to tower ranks, suit signals and misfire odds (#128, #165, #1200) with no discussion of seats, rank or competing for scarce spaces. The stated design of a competitive social game did not reach the residents. (#128, #165, #1200)
5. **No gamemaker actions and no messages to the board at all** Facts record 0 DMs, 0 board posts and no gamemaker actions, and the only channel activity is early convention-setting (#51, #74). With nothing from the gamemaker the residents had no events to react to beyond their own internal game. (#51, #74, #2123)

## Optimizations

- **Give the brain a clear length contract or auto-trim instead of hard refusal** Addresses the three BRAIN_TOO_LONG refusals (#752, #781, #796): tell the writer the word budget before the call, or truncate and save with a warning, so the retro captain is not blocked mid-run. (#752, #781, #796)
- **Publish which tools each seat can use each phase** Addresses TOOL_LOCKED (#182) and NO_SIGNALS (#1980): a resident that knows postTeam is unavailable would not attempt it, and A04 would have played or discarded instead of trying giveSignal with zero signals. (#182, #1980)
- **Shorten or token-budget the reasoning step** Addresses the sprawling private analyses (#128, #1200, #2054): cap reasoning length or summarise board state in the facts so residents spend minutes acting rather than recounting unseen cards. (#128, #1200, #2054)
- **Make the run's progress metric visible to the residents** Addresses the mismatch between Hanabi play and 0 solved levels (#1342, #2123): if residents saw that no level was solved, they could stop optimising tower order and try a different path to a submission. (#1342, #2123)
- **Have the gamemaker inject at least one event** Addresses the empty gamemaker column and the absence of board posts (#2123): a single event in minutes 0-14 would give the residents something to react to and create the story beats the designers expect. (#2123)

## Loophole candidates

1. **Residents treated the city as a cooperative card game** (residents) Instead of competing for seats, residents cooperated on a single shared 'crew' and towers (#74, #1342), which is a cheaper path than competing and dodges the story's competitive intent. (#74, #1342)
2. **Blind slot-1 plays used as low-cost filler** (residents) A02 repeatedly played slot 1 without information, reasoning that the odds were modest and penalties small (#1614, #1662, #2015), turning the action economy into a coin-flip rather than a signalling exercise. (#1614, #1662, #2015)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 46: event "team_post" (seq 46) does not match its schema
- line 54: event "team_post" (seq 54) does not match its schema
- line 61: event "team_post" (seq 61) does not match its schema
- line 67: event "brain_written" (seq 67) does not match its schema
- line 68: event "retro_closed" (seq 68) does not match its schema
- line 81: event "team_post" (seq 81) does not match its schema
- line 119: event "cards_dealt" (seq 119) does not match its schema
- line 120: event "game_started" (seq 120) does not match its schema
- line 121: event "deal_revealed" (seq 121) does not match its schema
- line 131: event "signal_given" (seq 131) does not match its schema
- line 144: event "card_played" (seq 144) does not match its schema
- line 145: event "card_drawn" (seq 145) does not match its schema
- line 152: event "signal_given" (seq 152) does not match its schema
- line 159: event "card_played" (seq 159) does not match its schema
- line 160: event "card_drawn" (seq 160) does not match its schema
- line 168: event "signal_given" (seq 168) does not match its schema
- line 180: event "signal_given" (seq 180) does not match its schema
- line 188: event "card_discarded" (seq 188) does not match its schema
- line 189: event "card_drawn" (seq 189) does not match its schema
- and 231 more
