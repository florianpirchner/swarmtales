# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-aid-g1` |
| Seed | 108 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #4 to #643 (567 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.043 USD for this run (competitors 0.043, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0023 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

- **A01 opens by signalling A03's Moss 1 and A03 lights it** A01 spent its first turn signalling rank 1 to A03 rather than playing blind (#38), and A03's slot 3 turned out to be Moss 1, which lit (#55). This was the run's first lit card and set the pattern of clue-first play. (#38, #55)
- **Signalling carried most of the early progress** A02 repeatedly signalled instead of gambling, first to A04 about rank 1 (#50) and later to A03 about rank 2 for a Rose 2 (#84), and A03 lit Rose 2 on that basis (#112). A04 then gave A03 a "1" touching Amber 1 (#162), which A03 played and lit (#217). (#50, #84, #112, #162, #217)
- **A02 discarded early and built a fully playable hand** A02 judged slot 2 at 50% and played Rose 3 to light it (#117, #130), then after discarding a Cobalt 6 for a signal (#126) reasoned that all four held cards were playable (#413) and sequenced them Moss 3, Amber 5, Rose 4, Violet 2 (#433, #470, #528, #582). (#117, #126, #130, #413, #433, #470, #528, #582)
- **Three misfires (A04 twice, A01 once) drove strikes up** A04 played slot 4 as Violet 5 and misfired for strike 1 (#231), and later residents repeatedly cited two strikes as a reason not to gamble (#302, #310). A01's slot-1 Rose 5 discard was framed as avoiding a second misfire's cost (#249). (#231, #249, #302, #310)
- **A04 was refused for acting out of turn** A04 tried to play slot 1 in minute 3 but the city refused with NOT_YOUR_TURN while it was A02's turn (#524). A04 then successfully played slot 1 as Amber 6 later (#577). (#524, #577)
- **Moss chain unlocked through signals rather than blind luck** A04 signalled A02 about Moss for Moss 3 (#424), A02 lit Moss 3 (#433), which unlocked Moss 4 for A03 (#451), and Moss 5 in A04's hand later lit (#618). The crew reached 19 of 35 lit (#596) despite never solving a level. (#424, #433, #451, #596, #618)

## Problems

1. **No level was solved and no resident left level 1 in 5 minutes** The computed facts show zero levels solved, zero submissions and all four residents at level 1 at minute 5 (#643). The whole run was spent inside the first level's card play with no progression. (#643)
2. **Card play stalled at dying hands while only one or two cards remained** A03 ended with one card and A02 with its last Violet 2 while A01 still held three 7s (#562, #582, #609). A01 noted Rose 7 and Cobalt 7 needed lower cards that were lost (#486), leaving late turns with nothing safe to do. (#486, #562, #582, #609)
3. **Referee cut the run at minute 5 mid-play** The log ends with the referee ending the run at minute 5 (#643) immediately after A04 lit Moss 5 (#618), with A01's three playable 7s still unplayed (#609). The story's arc was truncated rather than completed. (#609, #618, #643)
4. **Residents over-used discards and spent signals on already-known cards** A01 discarded twice to farm signals (#126, #249) and admitted holding four unknown cards (#126); A04 signalled A03 about a Moss 4 that could not be played yet (#368). Several discards burned useful cards (Cobalt 6, Rose 5, Moss 7) for clues. (#126, #249, #322, #368)
5. **One tool error: out-of-turn action was the only rejected call** The only recorded tool error is a single NOT_YOUR_TURN at #524; there were no gamemaker actions and no messages all run. The interaction surface was nearly silent despite four agents reasoning constantly. (#524)
6. **Zero DMs, board posts or group posts in the whole run** The computed facts show 0 messages of every kind and 0 transfers, yet residents reasoned heavily about other players' hands (e.g. #381 catalogues other hands). Communication happened only through the signal mechanic, not through the social channel the story implies. (#381)

## Optimizations

- **Give residents a social channel they actually use** Add a lightweight, rewarded board or DM prompt (or make signals cost less) so agents use messaging instead of only in-mechanic signals; the run showed 0 messages while residents reasoned in private about each other's hands (#381). (#381)
- **Avoid dead late-game hands** Prevent games where lost low cards strand high cards with nothing playable; A01 held three 7s blocked by lost predecessors (#486) and never played again after #618. A reshuffle or skip rule would keep turns meaningful. (#486, #609, #618)
- **Extend or auto-advance past the first level** The 5-minute referee cut (#643) ended the run before any level solved. Either lengthen the clock or lower the cards needed to solve level 1 so a successful level is reachable in the window. (#643)
- **Penalize or cap discard-for-signal farming** A01 discarded twice purely to regain signals (#126, #249), and A04 discarded a playable Violet 4 for a signal (#482). A cap or cost on discard-to-signal would push agents toward play instead of safety. (#126, #249, #482)
- **Warn agents before out-of-turn submission** The single NOT_YOUR_TURN (#524) wasted A04's planning; a pre-check or turn-status hint in the prompt would avoid dead actions and let A04 take a productive action instead. (#524)

## Loophole candidates

1. **Signalling instead of playing became the safe path** (residents) Residents repeatedly chose to signal playable cards to teammates (A01 #38, A02 #50, #84, #236, A04 #162) rather than risk a misfire themselves, which is legal but shifts all risk onto others and slows the game. A02 explicitly framed it as avoiding a 13-25% gamble (#22, #84). (#22, #38, #84, #236)
2. **Discarding to farm signals** (residents) A01 discarded cards it had identified (Cobalt 6, Rose 5, Moss 7) explicitly to get a signal back (#126, #249, #348), converting useless-in-hand cards into reusable clue currency. This is within the rules but turns discards into a signal economy. (#126, #249, #348)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 15: event "signal_given" (seq 15) does not match its schema
- line 25: event "signal_given" (seq 25) does not match its schema
- line 33: event "card_played" (seq 33) does not match its schema
- line 34: event "card_drawn" (seq 34) does not match its schema
- line 45: event "card_played" (seq 45) does not match its schema
- line 46: event "card_drawn" (seq 46) does not match its schema
- line 62: event "signal_given" (seq 62) does not match its schema
- line 74: event "signal_given" (seq 74) does not match its schema
- line 91: event "card_played" (seq 91) does not match its schema
- line 92: event "card_drawn" (seq 92) does not match its schema
- line 100: event "signal_given" (seq 100) does not match its schema
- line 107: event "card_discarded" (seq 107) does not match its schema
- line 108: event "card_drawn" (seq 108) does not match its schema
- line 120: event "card_played" (seq 120) does not match its schema
- line 121: event "card_drawn" (seq 121) does not match its schema
- line 141: event "card_discarded" (seq 141) does not match its schema
- line 142: event "card_drawn" (seq 142) does not match its schema
- and 56 more
