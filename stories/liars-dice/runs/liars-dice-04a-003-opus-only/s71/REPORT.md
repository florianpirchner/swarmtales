# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-12 |
| Story | `liars-dice` |
| Seed | 71 |
| Start | fresh, level 1 |
| Competitors | `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 27 (referee) |
| Counted | events #5 to #3107 (2530 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 27 minutes (to the end); A02 on level 1 from minute 0 for 27 minutes (to the end); A03 on level 1 from minute 0 for 27 minutes (to the end); A04 on level 1 from minute 0 for 27 minutes (to the end) |
| Final standings | unknown |
| Cost | 3.282 USD for this run (competitors 3.282, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0112 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 28 of 28 minutes without a submission; longest without one: minutes 0-27 (28) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 8 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents played a full multi-round liar's dice match in their heads but never submitted anything.** The log records complete rounds, bids, liar calls and dice losses for A01-A04 through three games (#118-#3107), yet the computed facts show 0 submissions, 0 transfers, 0 messages and no level-ups. Everything that mattered happened inside private reasoning and self-talk. (#118, #283, #404, #568, #3107)
- **A04's honest bidding wrecked A01 in game 2.** A01 called A04's bids three times (8 x 3, 6 x 4, 5 x 2) and lost each call (#1055 mentions A03 winning, #1181, #1253, #1652), dropping A01 from 4 dice to 1 and out in 4th place (#1741). This is exactly the 'call less against repeated backers' lesson A01 later wrote into brain v2 and v3 (#1068, #2118). (#1068, #1181, #1253, #1652, #1741)
- **A03 twice won with a bid that was arithmetically impossible for the opponent to beat.** A03 opened 3 x 2 while holding a 2 and two wild 1s (#987, #997) and later 1 x 6 with a 6 in hand (#2007, #3082), forcing A02 in the endgame to call a bid that its own reasoning showed was true (#1018 vicinity, #3097). These 'certain bid' openings are the clearest strategic turn in the run. (#987, #997, #2007, #3082, #3097)
- **The residents learned across games and rewrote their brains.** After game 1 A04 added 'each other player who has bid that face adds about one' to its counting (#1045), and A01 added a rule not to raise with 1-2 dice when it needs 2+ matches (#1068). These revisions track failures the log actually shows (#855, #972). (#855, #972, #1045, #1068)
- **The referee ended the run at minute 27 mid-game 3.** The last recorded event is the runner ending the run (#3107) while A01 and A03 were still playing a 1-dice-versus-3-dice finish in game 3 (#3056, #3082, #3097), so final standings are unknown. (#3056, #3082, #3097, #3107)

## Problems

1. **No submission ever reached the city, so the whole run is one long stall.** The facts show A01-A04 each stuck on level 1 for all 27 minutes with zero submissions, zero correct and zero wrong, and minute 0-27 quiet. Whatever the residents were doing in their reasoning never turned into an in-game action. (#118, #3107)
2. **writeBrain repeatedly failed on the 150-word cap, costing whole turns.** There were 8 BRAIN_TOO_LONG refusals, at 151-171 words (#51, #63, #1018, #1051, #2055, #2060, #2065, #2070). A01 even notes it was refused for being one word over and had to retry (#1068). (#51, #63, #1018, #1051, #1068, #2055, #2060, #2065, #2070)
3. **Residents spent their turns on long private math instead of acting.** Most events are A0x REASONING lines doing probability arithmetic, e.g. #169, #181, #343, #541, and self-talk summaries e.g. #260, #550, #766. The computed 28 quiet minutes and 0 submissions match this pattern. (#169, #181, #343, #541, #760)
4. **Residents repeatedly announced 'ending my turn / waiting' with nothing done.** A01 says 'Nothing left to do here, so I'm ending the turn' (#90) and residents like A03 and A02 say 'I'll wait for my turn' with no action (#1077, #1312, #1754). This burns minutes without progress, contributing to the 27-minute stall. (#90, #1077, #1312, #1754)
5. **The game rules were only inferred, and residents sometimes contradicted themselves on wilds.** A01 says 'With ones wild' (#118) and A04 says 'with one ace and twelve unknown cards split three ways' (#156), mixing card and dice language, and A03 wonders whether a bid of 1x is even allowed (#1992). The story seems to be conveyed loosely enough that residents guessed at basic rules. (#118, #156, #1992)

## Optimizations

- **Make the brain cap enforceable before the attempt or raise it.** To stop the 8 BRAIN_TOO_LONG refusals (#51, #63, #2055-#2070), have writeBrain report the word count and trim, or raise the limit to 200 words so residents do not lose turns on one-word overruns (see A01's retry at #1068). (#51, #63, #1018, #1051, #2055, #2060, #2065, #2070)
- **Shorten or auto-summarize reasoning so residents act within the minute.** The long probability essays (#169, #343, #541, #2577) correlate with 28 quiet minutes and no submissions; cap reasoning length or have the harness nudge a bid/call after a fixed reasoning budget. (#169, #343, #541, #2577)
- **State the dice rules explicitly at run start.** Residents guessed at wilds and whether 1-bids are legal (#118, #156, #1992); the story file is empty per the facts, so an explicit rules block would remove the ambiguity and wasted reasoning. (#118, #156, #1992)
- **Convert self-talk 'waiting' turns into a forced minimal action.** Turns spent saying 'I'll wait for my turn' (#90, #1077, #1312, #1754) should be replaced by a default cheap bid, as A01 eventually did with 1x6/2x5 (#860, #3018). This keeps the game moving and produces measurable events. (#90, #860, #1077, #1312, #1754, #3018)
- **Give the run a fixed game count and publish end-of-run standings.** The referee cut the run mid-game-3 (#3107) with A01 and A03 still alive (#3056, #3082), so final standings are unknown; schedule N games or stop only between games and record points (as residents tracked them in #2104, #2109, #2113). (#2104, #2109, #2113, #3056, #3082, #3107)

## Loophole candidates

1. **Residents found a certain-bid squeeze: open on a face they hold, making the bid literally true.** (residents) A03 opened 3 x 2 holding a 2 and two wild 1s (#987, #997) and later 1 x 6 holding a 6 (#3082), and A04 opened 1 x 6 on a wild 1 (#2002, #2981). The minimum legal bid becomes unbeatable truth, forcing the opponent to overbid or call. This is a valid but near-cheap path to winning endgames. (#987, #997, #2002, #2981, #3082)

## Dropped from the model's answer

- Loophole candidates item 2: cites unknown events #70

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 44: event "brain_written" (seq 44) does not match its schema
- line 45: event "retro_closed" (seq 45) does not match its schema
- line 56: event "brain_written" (seq 56) does not match its schema
- line 57: event "retro_closed" (seq 57) does not match its schema
- line 69: event "brain_written" (seq 69) does not match its schema
- line 70: event "retro_closed" (seq 70) does not match its schema
- line 84: event "brain_written" (seq 84) does not match its schema
- line 85: event "retro_closed" (seq 85) does not match its schema
- line 109: event "dice_game_started" (seq 109) does not match its schema
- line 110: event "dice_rolled" (seq 110) does not match its schema
- line 111: event "dice_round_started" (seq 111) does not match its schema
- line 121: event "dice_decision_scored" (seq 121) does not match its schema
- line 122: event "dice_bid" (seq 122) does not match its schema
- line 137: event "dice_decision_scored" (seq 137) does not match its schema
- line 138: event "dice_bid" (seq 138) does not match its schema
- line 146: event "dice_decision_scored" (seq 146) does not match its schema
- and 557 more
