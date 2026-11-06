# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-solo` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #5 to #2206 (1943 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.180 USD for this run (competitors 0.180, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0051 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 12, BRAIN_TOO_LONG 6, NO_SIGNALS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents spent the opening minutes on brain-writing instead of play.** A01, A02, A03 and A04 all opened by reading and writing a strategy brain before game 1 (#13, #19, #25, #31), and A01's first write was refused for length (#61). The game only opened after that retro window closed (#65, #90). (#13, #19, #25, #31, #61, #65)
- **The crew played a competent first game and reached 20 of 35 lit before the third strike.** A04 lit Moss 1 (#183), A02 lit Violet 1 (#204), A01 lit Violet 2 (#254) and Amber 1 (#409), and the crew climbed to 20 of 35 lit by the end of game 1 (#857). The run ended on strikes, not on a solved level. (#183, #204, #254, #409, #857)
- **Discarding unknown cards destroyed needed cards repeatedly.** A03 discarded Violet 6 by mistake (#404), A01 discarded the playable Rose 3 (#556), A03 discarded Moss 5 which could still have lit (#1298), and A03 discarded Rose 4 which was still live (#1847). A02's own retro counted about ten cards lost to discards (#815). (#404, #556, #815, #1298, #1847)
- **Blind plays produced the strikes that ended games.** A04 played Cobalt 7 blind for strike 2 (#669), A02 played Cobalt 3 blind for strike 1 (#1028), A03 misfired Moss 2 for strike 2 (#1089), and A02 misfired Amber 3 (#1698). The residents then became very cautious, repeatedly refusing to play blind at two strikes (#1126, #1190, #1820). (#669, #1028, #1089, #1126, #1190, #1698, #1820)
- **Signals were the main coordination tool and were spent almost every turn.** Residents used rank and suit signals to point teammates at playable cards, e.g. A01 signalling A04 rank 1 (#148), A03 signalling A02 "3" (#245), and A04 signalling A02 "1" for Rose 1 (#467). Signals ran out and produced NO_SIGNALS refusals (#516). (#148, #245, #467, #516)
- **The run ended at minute 13 with no level solved and no submissions.** The referee ended the run at minute 13 (#2206) with all four residents still on level 1 and zero submissions. The last actions were signals and passes around Rose 6/Rose 7 (#2149, #2179). (#2149, #2179, #2206)

## Problems

1. **No resident ever submitted, so no level was solved in 13 minutes.** The facts show 0 correct and 0 wrong submissions and all four stuck on level 1 for the whole run. The log shows only card-play actions and signals, never a submission (#2206). (#2206)
2. **The brain-writing retro window consumed the opening and repeatedly failed on length.** Six BRAIN_TOO_LONG refusals occurred (#61, #798, #804, #1452, #1458, #1485), and residents spent early minutes on readBrain/writeBrain instead of play (#13, #19, #25, #31). (#13, #19, #25, #31, #61, #798, #804, #1452, #1458, #1485)
3. **NOT_YOUR_TURN errors show residents acting out of turn order.** There were 12 NOT_YOUR_TURN refusals, e.g. A01 giveSignal (#305), A04 playSlot (#584), A03 playSlot (#684), A03 giveSignal (#770), A02 playSlot (#1908), A01 playSlot (#2069). Residents repeatedly misread whose turn it was. (#305, #584, #684, #770, #1908, #2069)
4. **Residents burned signals and cards on guesses rather than confirmed plays.** A03 discarded slot 2 blind and lost Violet 6 (#404), A01 discarded the playable Rose 3 (#556), and A04 played Cobalt 7 blind for a strike (#669). The residents' own retros name discards and blind plays as the main cost (#815, #1482). (#404, #556, #669, #815, #1482)
5. **The gamemaker took no actions and the classifier produced no labels.** The facts record no gamemaker actions and no labels, and the log contains no gamemaker events. The story had no narrative beats from the gamemaker to react to. (#2206)

## Optimizations

- **Give the brain a hard word budget in the tool description and a pre-check.** Six BRAIN_TOO_LONG refusals (#61, #798, #804, #1452, #1458, #1485) show residents cannot estimate 150 words. Add a word counter in the tool response and reject before the model writes, or raise the limit. (#61, #798, #804, #1452, #1458, #1485)
- **Show the current turn owner prominently in every tool result.** Twelve NOT_YOUR_TURN refusals (#305, #584, #684, #770, #1908, #2069) show residents lose track of whose turn it is. Include "it is A0X's turn" in every response and in the status line. (#305, #584, #684, #770, #1908, #2069)
- **Make the retro window short and separate from play time.** Residents spent the opening minutes on brain work (#13, #19, #25, #31) and the run had 14 quiet minutes with no submission. Cap the retro window to a fixed short duration or move it outside the timed run. (#13, #19, #25, #31)
- **Add a discard warning that names the card's remaining usefulness.** A03 discarded Violet 6 (#404), A01 discarded Rose 3 (#556), A03 discarded Moss 5 (#1298) and Rose 4 (#1847), all still live. Warn when a discard would remove a card whose rank is still reachable. (#404, #556, #1298, #1847)
- **Give the gamemaker a role so the story has beats.** The facts record no gamemaker actions and no labels, and the digest found no beats. Add at least one gamemaker event per game (a hint, a twist, a message) so the story has narrative content. (#2206)

## Loophole candidates

1. **Residents used the pre-game retro window to write brains instead of playing.** (residents) All four residents opened with readBrain/writeBrain before game 1 (#13, #19, #25, #31), using the retro window as a free planning phase. This is a cheaper, safer path than playing the timed game. (#13, #19, #25, #31)
2. **Residents passed turns by giving signals rather than risking a play.** (residents) At two strikes, residents repeatedly chose a signal or pass over a play, e.g. A02 passing with a signal (#1126), A03 passing (#1190), A04 passing (#1820). This avoids the third strike but also avoids progress. (#1126, #1190, #1820)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 40: event "brain_written" (seq 40) does not match its schema
- line 41: event "retro_closed" (seq 41) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 84: event "brain_written" (seq 84) does not match its schema
- line 85: event "retro_closed" (seq 85) does not match its schema
- line 130: event "cards_dealt" (seq 130) does not match its schema
- line 131: event "game_started" (seq 131) does not match its schema
- line 132: event "deal_revealed" (seq 132) does not match its schema
- line 142: event "signal_given" (seq 142) does not match its schema
- line 155: event "signal_given" (seq 155) does not match its schema
- line 163: event "signal_given" (seq 163) does not match its schema
- line 170: event "card_played" (seq 170) does not match its schema
- line 171: event "card_drawn" (seq 171) does not match its schema
- and 243 more
