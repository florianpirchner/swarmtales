# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-nobrain` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 14 (referee) |
| Counted | events #4 to #1975 (1753 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 14 minutes (to the end); A02 on level 1 from minute 0 for 14 minutes (to the end); A03 on level 1 from minute 0 for 14 minutes (to the end); A04 on level 1 from minute 0 for 14 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.155 USD for this run (competitors 0.155, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0103 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 15 of 15 minutes without a submission; longest without one: minutes 0-14 (15) |
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

- **The crew opened with fast correct plays that immediately went to waste.** A03 lit Cobalt 1 at #62 and A02 lit Amber 1 and Amber 2 at #157 and #203, but A03 had already discarded Amber 3 (#164-#165) and A01 discarded Amber 5 (#88), so Amber's tower was crippled from the first minute. (#62, #88, #157, #164, #203)
- **A mate's signal about the rank-1 tripped a misfire.** A02 signalled A04 "rank 1" at #121, but A04 played slot 4 at #269 and it was Violet 6, not a 1, the first strike of the game. (#121, #269)
- **A01's blind play late in game two cost the second strike.** A01 played slot 4 at #1042 believing it might be Moss 1 and it was Moss 2, a misfire, taking the crew to 2 of 3 strikes. (#1041, #1042)
- **The game ground to a stall while signal tokens ran down.** Residents repeatedly gave hints or discarded rather than play, e.g. A04 at #985, #1091 and #1135, and A02 refused a coin-flip play at #372 because the third strike would end the game, so the score stayed low at 7 lit after minute 3 (#1030). (#372, #985, #1030, #1091, #1135)
- **The run ended without any level solved, although cards lit and strikes remained.** Over 14 minutes the residents lit cards (up to about 15 by #1915) and used 2 strikes, but the referee ended at #1975 with no submission, no level-up and a stall on level 1 from minute 0 for all four residents. (#1915, #1975)
- **Signals led to plays that were wrong half the time.** A02 pointed A01 at slot 4 as a rank-1 at #1780; A01 played Moss 1 successfully at #1802, but at #1872 A02 itself played its slot 1, Cobalt 7, which misfired. (#1780, #1802, #1872)

## Problems

1. **No resident ever submitted or advanced a level.** The facts show every resident on level 1 from minute 0 to the end, 0 correct submissions and a quiet window of 15 minutes (#1975); the residents spent the whole run on blind plays and hints instead of any level-solving action. (#14, #27, #1975)
2. **Residents read the rules and math incorrectly.** A04 treated the Violet tower as starting at 0 and refused safe plays (#789, #917), and A02 counted a Violet 50/50 as a third strike at #372; both misfired later (#1872, #269), so a misread of the game state drove bad choices. (#269, #372, #789, #917, #1872)
3. **Discards destroyed key tower cards early.** A03's Amber 3 at #164, A01's Amber 6 at #247 and A02's Rose 3 at #1008 removed cards, leaving towers unreachable and forcing the residents into more guessing. (#164, #247, #1008)
4. **Hints often failed to save plays and burned the signal budget.** A04 burned its last signal at #985, A02 at #1731 and A03 at #1735 with plays that did not translate into safe cards, and only one signal was left by #1815. (#985, #1731, #1735, #1815)
5. **The harness rejected a resident action out of turn.** A03's giveSignal at #1889 was refused with NOT_YOUR_TURN, showing that the turn order was not enforced or communicated to the model before it acted. (#1889)
6. **Silent play: no messages, DMs or board posts at all.** The facts show 0 DMs, 0 board posts and 0 group posts, and all signals were tool hints; there was no story-level conversation between residents to test alliances or lies. (#35, #42, #76)
7. **The end summary contradicted the residents' own count.** A04 disputed the 21-lit figure at #681 and #1285 and A03 noted the 21 signals could not be verified at #696, so the reported result was unreliable. (#681, #696, #1285)

## Optimizations

- **Give residents a first-turn orientation step before play.** The residents misread the starting state (#789, #917) and then acted on the mistake; add a mandatory read of the tower state and rules before the first action, with evidence #789, #917. (#789, #917)
- **Protect playable cards from early discards.** Early discards removed Amber 3 (#164), Amber 6 (#247) and Rose 3 (#1008); make the discard action refuse cards that are currently in a tower's line, with evidence #164, #247, #1008. (#164, #247, #1008)
- **Enforce turn order on the tool side.** A03's signal at #1889 was refused for NOT_YOUR_TURN; queue actions or tell the model the active seat before it acts, with evidence #1889. (#1889)
- **Tie hints to safe plays, not just suits.** Hints at #121, #985 and #1731 mixed with misfires (#269, #1872); make hint accuracy visible, so residents know a hint is a safe play, with evidence #269, #1872. (#269, #1872)
- **Make the end summary come from the computed facts.** Residents argued over the lit count at #681, #696 and #1285; the summary should use the code's numbers, with evidence #681, #1285. (#681, #1285)
- **Stop quiet minutes from ending the run.** The run had 15 quiet minutes and no start signal at #14; treat quiet minutes as normal play and only end on the referee, with evidence #14, #1975. (#14, #1975)

## Loophole candidates

1. **Residents used hints to stall instead of solving levels.** (residents) Rather than risk a strike, residents passed with signals or discards repeatedly (#348, #985, #1091, #1735), which kept them from ever attempting a level and still counted as actions. (#348, #985, #1091, #1735)
2. **Hint tokens were used to reset the idle timer.** (residents) A02 noted that a discard resets the four-turn count (#1860), so discards for signals became a way to avoid the idle rule rather than a real play. (#1860)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 18: event "signal_given" (seq 18) does not match its schema
- line 30: event "signal_given" (seq 30) does not match its schema
- line 49: event "card_played" (seq 49) does not match its schema
- line 50: event "card_drawn" (seq 50) does not match its schema
- line 58: event "signal_given" (seq 58) does not match its schema
- line 70: event "card_discarded" (seq 70) does not match its schema
- line 71: event "card_drawn" (seq 71) does not match its schema
- line 84: event "signal_given" (seq 84) does not match its schema
- line 100: event "signal_given" (seq 100) does not match its schema
- line 108: event "signal_given" (seq 108) does not match its schema
- line 116: event "card_discarded" (seq 116) does not match its schema
- line 117: event "card_drawn" (seq 117) does not match its schema
- line 132: event "card_played" (seq 132) does not match its schema
- line 133: event "card_drawn" (seq 133) does not match its schema
- line 145: event "card_discarded" (seq 145) does not match its schema
- line 146: event "card_drawn" (seq 146) does not match its schema
- line 153: event "signal_given" (seq 153) does not match its schema
- and 202 more
