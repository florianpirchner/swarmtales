# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #2 to #2267 (2016 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.169 USD for this run (competitors 0.169, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0056 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 3, NO_SIGNALS 2, TOOL_LOCKED 2, BRAIN_TOO_LONG 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The team spent the whole first minute agreeing on a strategy brain before any card was played.** A01 wrote brain version 1 and A02/A03/A04 all posted agreement in minute 0, including a rule that a rank-1 signal always means "play every 1 you hold now" (#78, #82, #86, #99). No card play or signal happened until minute 1, so the opening minute was pure setup. (#69, #78, #82, #86, #99)
- **A01 and A03 repeatedly signalled teammates to playable cards instead of playing blind.** A01 signalled A02 rank 1 to play Amber 1 (#132, #146), and signalled A02 rank 3 to play Moss 3 (#424, #441). A03 signalled A04 rank 2 for Moss 2 (#337, #344) and A01 rank 1 for Rose 1 (#1101, #1117), showing a working division of labour: information flowed through signals to owners of known playable cards. (#132, #146, #337, #344, #441, #1101, #1117)
- **The crew nearly threw away game 1 on two blind-misfire discards and strikes.** A02 played slot 2 blind and hit Rose 5 as a misfire, strike 1 (#393); A04 played Violet 4 blind, strike 2 (#469, #470). After that, everyone refused to play blind and fell back on discards, losing 11 cards to discards within the first game (#808, #224). (#393, #469, #470, #808)
- **A02 misfired Moss 3 in game 3 after A01's rank-3 signal was misread, because the Moss tower was still at 0.** A01 signalled A02 "3" (#1710), A02 played Moss 3 as a misfire (#1723), and A03 explicitly diagnosed it as A01's "playable" call being wrong (#1703). It shows the brain's rule that "a rank signal means the card is playable" broke down once towers were at different heights. (#1703, #1710, #1723)
- **The crew broke its own no-discard rule again in the third game.** The brain version 3 banned discarding unknown cards (#1545, #1583), yet A03 discarded Amber 7 (#2003), A03 discarded Rose 5 (#2040), and A04 discarded Violet 7 while admitting it wasn't provably dead (#1737). The rule was written and immediately violated, which is a clear behaviour drift between rules and play. (#1545, #1583, #1737, #2003, #2040)
- **Game 3 ended with 20 of 35 lit and no third strike, so the iterations improved outcomes despite persistent discards.** The last lit cards came from A04 (Moss 7, #2243) and A02 (Violet 5, #2255), with the crew at 20 lit and 2 strikes, better than game 1's 22/35 with 2 strikes and 13 lost. Improvement came mostly from paired signals to the card owner, not from the brain's prohibition rules. (#808, #2228, #2243, #2255)

## Problems

1. **The brain tool kept being called by the wrong seat, and once exceeded the word limit.** The retro window names A03 as writer in one round (#1548, #1551), while other residents assumed the retro captain writes (#1559), and A03's attempt was refused for length: "154 words; the limit is 150" (#1548). This wasted retro turns on role confusion. (#1548, #1551, #1559)
2. **Tools locked during play forced residents to spend turns re-reading and guessing.** postTeam was refused TOOL_LOCKED for A01 (#370) and for A02 (#1726), and giveSignal was refused NOT_YOUR_TURN twice (#317, #1859). The residents' notes show them working around the lock rather than acting on the board (#389, #1737). (#317, #370, #1726, #1859)
3. **Blind-play mechanics with a fatal third strike pushed residents into a discard spiral.** A02 discarded repeatedly after refusing a 50/50 blind play ("would risk a third strike", #605, #1316, #2126), and A01 said the same (#981). The brain's 1-in-2 threshold (#797) still left many turns with no legal safe action, so the equilibrium was discard-to-refill rather than play. (#393, #469, #605, #981, #1316, #2126)
4. **Signals were misinterpreted as card-identity or playable flags, and signals were wasted on already-known cards.** A01 signalled A02 rank 3, which A02 read as a playable call, causing a Moss 3 misfire while Moss was at 0 (#1710, #1723). A02 also gave A03 a Violet signal for a card that was already known (#1010, #1105), and A03 signalled A04 "Violet" for Violet 1 (#1835) on a card A04 could already infer (#1809). (#1010, #1105, #1710, #1723, #1809, #1835)
5. **Concise, brief messages show no DMs, board posts, or group posts happened across the entire run.** The facts list zero DMs, zero board posts, and zero group posts. All team coordination was through tool-channel posts in retro windows (#757, #764, #1531, #1563), so the intended messaging channel is effectively dead in this run. (#757, #764, #1531, #1563)

## Optimizations

- **Grant postTeam and giveSignal broadly within play windows, or explicitly document that they are retro-only.** TOOL_LOCKED (#370, #1726) and NOT_YOUR_TURN (#317, #1859) blocked residents from communicating and signalling, and several reasoning traces show residents reverting to guessing instead (#389, #1737). If messaging is intended for play, allow it during play; if not, say so in the persona so residents don't plan around it. (#317, #370, #1726, #1859)
- **Require each signal to name the tower rank and the recipient's slot so a rank hint cannot be read as "playable now".** The Moss 3 misfire (#1703, #1723) came from a rank-3 signal that meant "this is rank 3" but was read as "play this now". Adding a cheap follow-up ("signalled slot not playable yet") or enforcing that signals only touch cards whose tower is at the previous rank would prevent this class of error. (#1703, #1710, #1723)
- **Loosen the third-strike rule or make blind plays cheaper so the no-blind equilibrium stops blockasting early games.** A02 and A01 explicitly refused blind plays because one misfire would end the game (#605, #981, #1316), then discarded away the deck. A two-strike buffer, or a discard that reveals the card rather than losing it, would let crews choose safe actions without gutting card knowledge. (#393, #469, #605, #981, #1316)
- **Fix the brain writer role and raise or clearly expose the word limit.** A03's writeBrain was refused for 154 > 150 words (#1548), and in later retro windows different residents argued over who should write (#1551, #1559). Naming one writer per window in the system prompt, plus a visible character counter, would remove the waste. (#1548, #1551, #1559)
- **Make the retro brain versioned and enforced at the next game's start; otherwise the crew writes rules it violates immediately.** Brain v3 banned discarding unknowns (#1583), yet A03 discarded Amber 7 (#2003) and Rose 5 (#2040), and A04 discarded Violet 7 while admitting it wasn't provably dead (#1737). A short enforcement reminder or a visible "does this discard violate v3?" check would close the loop. (#1583, #1737, #2003, #2040)
- **Add a turn-0 rule so the team must play or signal at least once before opening the brain debate.** The first full minute (0–0) was spent only on drafting and agreeing to brain v1 (#69, #78, #82, #86, #99), pushing the first card play to minute 1 (#146, #162). A one-play opener forces residents to learn the board before writing strategy. (#69, #78, #146, #162)

## Loophole candidates

1. **Residents turned "signal to a playable card" into a safe, idle path: signal a known playable card to a teammate and hold your own four unknown cards.** (residents) In game 2, A04 held its own cards repeatedly and spent signals each turn (#917, #937, #976), while A01 held and signalled (#1101, #1150). This avoids strikes but the holder never sponsors a play of its own hand, slowing the deck. (#917, #937, #976, #1101, #1150)
2. **Discard-to-refill was used as the safe default even when the brain later banned it.** (residents) A03 discarded Moss 4, Amber 7, and Rose 5 across three separate turns (#1905, #2003, #2040), each time using the "card might not be provably dead" framing as cover. The discard returns a signal token (#1545, #1583), making it a cheap way to reset without risking a strike. (#1545, #1583, #1905, #2003, #2040)
3. **The brain's rule "discard only when provably dead" was used by nobody to gate discards; in practice no discard was ever checked against it.** (residents) A04 discarded Violet 7 and immediately admitted it wasn't provably dead (#1737), and A03's discards of Amber 7 and Rose 5 had no such proof (#2003, #2040). The rule was phrased as a norm, not a mechanic, so it did not constrain action. (#1737, #2003, #2040)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 50: event "team_post" (seq 50) does not match its schema
- line 58: event "team_post" (seq 58) does not match its schema
- line 65: event "team_post" (seq 65) does not match its schema
- line 72: event "brain_written" (seq 72) does not match its schema
- line 73: event "retro_closed" (seq 73) does not match its schema
- line 93: event "team_post" (seq 93) does not match its schema
- line 123: event "cards_dealt" (seq 123) does not match its schema
- line 124: event "game_started" (seq 124) does not match its schema
- line 125: event "deal_revealed" (seq 125) does not match its schema
- line 135: event "signal_given" (seq 135) does not match its schema
- line 149: event "card_played" (seq 149) does not match its schema
- line 150: event "card_drawn" (seq 150) does not match its schema
- line 157: event "signal_given" (seq 157) does not match its schema
- line 174: event "signal_given" (seq 174) does not match its schema
- line 186: event "signal_given" (seq 186) does not match its schema
- line 194: event "signal_given" (seq 194) does not match its schema
- line 210: event "card_played" (seq 210) does not match its schema
- line 211: event "card_drawn" (seq 211) does not match its schema
- line 218: event "card_discarded" (seq 218) does not match its schema
- and 231 more
