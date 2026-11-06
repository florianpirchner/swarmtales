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
| Counted | events #2 to #2289 (2032 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.183 USD for this run (competitors 0.183, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0056 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3, NOT_YOUR_TURN 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Every resident stalled on level 1 for the entire 16-minute run with zero submissions.** All four residents spent minutes 0-16 on level 1 and never submitted a card, so no tower advanced past the opening hands in the story's terms. #2/#10 through #2289 show only reasoning and turn actions, with the facts table recording 0 correct and 0 wrong submissions. (#10, #18, #26, #34)
- **A01 as retro captain wrote brain v1 at minute 0 and the crew converged on a signal convention.** A01 wrote brain v1 (145 words) merging the team's proposals about rank signals meaning play-now and suit signals meaning keep, and A02, A03 and A04 posted short agreements. This was the only coordination artifact produced before the first game. (#63, #90, #97, #101)
- **The agreed brain rule that a single-card suit signal means play-now caused A02's Rose 5 misfire.** A04 signalled "Rose" on A02's slot 4, which held Rose 5, and A02 read the single-card suit signal as play-now and played it. The misfire cost a strike and A02 itself later noted Rose 2 through 4 were not yet playable. (#1713, #1722, #1726, #1727)
- **Discards repeatedly threw away playable or needed cards because residents discarded without checking the unseen list.** A01 discarded Violet 5 (#740), Amber 1 (#1325) and Moss 4 (#476); A04 discarded Cobalt 2 (#1303) and A03 discarded Cobalt 7 then Violet 4 (#570, #1010). A04 explicitly named checking the unseen list before discarding as a lesson (#1548), the third such retro point. (#740, #1303, #1325, #1548)
- **A03 failed the brain-write three times on word count before succeeding at 146 words.** A03's entries were refused with BRAIN_TOO_LONG at 159, 159 and 153 words (#1545, #1574, #1584) before it saved 146 words (#1597). This shows the 150-word limit was actively binding and the agent was not estimating length before calling. (#1545, #1574, #1584, #1597)
- **A01 tried to play out of turn and was refused by the referee.** A01 issued playSlot in minute 14 and was refused with NOT_YOUR_TURN because it was A03's turn (#2168), then reasoned it had to wait for its next turn (#2180). This is the only turn-order violation in the run. (#2168, #2180)

## Problems

1. **All four residents stalled on level 1 for the whole run with no submissions.** The facts table records A01-A04 each stuck on level 1 from minute 0 for 16 minutes and no submission in any minute 0-16. The residents spent every turn on signals, discards and private analysis but the story never advanced. (#10, #2289)
2. **Residents burned most turns on signalling and discarding instead of playing, and discards lost cards.** A04 discarded at #253, #461, #1035 and #1303, A01 at #415, #740, #1325 and #1877, and A02 and A03 repeatedly too, with several discards revealed as playable cards. The heavy signal/discard loop kept the towers from progressing in the minutes tracked. (#415, #740, #1010, #1303, #1325)
3. **Missing BRAIN_TOO_LONG feedback wasted three full brain-write attempts.** A03 called writeBrain four times and was refused three times for exceeding 150 words (#1545, #1574, #1584) before saving 146 words (#1597). The tool gave an exact count only after the call, so the agent could not self-correct before spending a turn. (#1545, #1574, #1584, #1597)
4. **The agreed brain rule for single-card suit signals was ambiguous and misled A02.** The brain equated a single-card suit signal with a play-now signal, but A04's Rose signal on Rose 5 (#1713) led A02 to play a card that was not playable (#1727). The design intended suit signals to mean keep, so the rule defeated its own purpose. (#97, #1713, #1727)
5. **A04's postTeam was refused because the tool was locked at the current level.** A04 tried to post in minute 8 and got TOOL_LOCKED (#1306), so the retro channel was not uniformly available to all residents at all times. A01, A02 and A03 did post later, so the lock was asymmetric. (#1306)

## Optimizations

- **Give a visible pre-call word count or auto-trim for writeBrain.** The BRAIN_TOO_LONG refusals (#1545, #1574, #1584) each cost a full step before A03 succeeded at 146 words (#1597). The harness should return the exact count before the write is submitted, or cap the text server-side. (#1545, #1574, #1584, #1597)
- **Rewrite the brain rule so a single-card suit signal cannot mean play-now.** A04's Rose signal on Rose 5 (#1713) was read as play-now under the v1 brain rule (#97) and caused a misfire (#1727). Separate play-now signalling from suit keep signalling explicitly in the brain template. (#97, #1713, #1727)
- **Surface the unseen-card list before every discard action.** Residents repeatedly discarded useful cards, including A01's Violet 5 (#740) and Amber 1 (#1325) and A04's Cobalt 2 (#1303). A prompt line listing dead versus unseen cards before a discard would let the agent avoid these losses. (#740, #1303, #1325, #1548)
- **Unlock postTeam and writeBrain for all residents from the start.** A04's postTeam was refused with TOOL_LOCKED (#1306) while other residents posted freely, which unevenly distributes the retro contribution. The story should document which tools are available per level or per phase and expose them consistently. (#1306)
- **Reduce the mandatory signal/discard loop that stalls the first game.** The residents spent nearly every turn between minutes 1 and 16 in signals, discards and reads rather than playing, and never advanced a tower past the tracked slots. Shorten free-signal costs or make the play option more attractive so the story's opening does not lock into an analysis loop. (#143, #148, #340, #611)

## Loophole candidates

1. **Residents treated private reasoning as coordination, but other residents never see it.** (residents) A02 and A01 reasoned extensively about partner state (#244, #354) and in doing so inferred card contents largely from the visible boards rather than from agreed signals. This makes the signal economy less necessary, letting residents skip actual messaging while still converging. (#244, #354, #516)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 45: event "team_post" (seq 45) does not match its schema
- line 52: event "team_post" (seq 52) does not match its schema
- line 59: event "team_post" (seq 59) does not match its schema
- line 66: event "brain_written" (seq 66) does not match its schema
- line 67: event "retro_closed" (seq 67) does not match its schema
- line 75: event "team_post" (seq 75) does not match its schema
- line 86: event "team_post" (seq 86) does not match its schema
- line 123: event "cards_dealt" (seq 123) does not match its schema
- line 124: event "game_started" (seq 124) does not match its schema
- line 125: event "deal_revealed" (seq 125) does not match its schema
- line 136: event "signal_given" (seq 136) does not match its schema
- line 151: event "card_played" (seq 151) does not match its schema
- line 152: event "card_drawn" (seq 152) does not match its schema
- line 164: event "card_played" (seq 164) does not match its schema
- line 165: event "card_drawn" (seq 165) does not match its schema
- line 173: event "card_discarded" (seq 173) does not match its schema
- line 174: event "card_drawn" (seq 174) does not match its schema
- line 181: event "signal_given" (seq 181) does not match its schema
- line 198: event "card_discarded" (seq 198) does not match its schema
- and 237 more
