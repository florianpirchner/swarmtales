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
| End | minute 15 (referee) |
| Counted | events #2 to #2269 (2011 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 15 minutes (to the end); A02 on level 1 from minute 0 for 15 minutes (to the end); A03 on level 1 from minute 0 for 15 minutes (to the end); A04 on level 1 from minute 0 for 15 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.179 USD for this run (competitors 0.179, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0053 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 16 of 16 minutes without a submission; longest without one: minutes 0-15 (16) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3, NO_SIGNALS 1, NOT_YOUR_TURN 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 writes the shared brain at minute 0 and the team converges on a "signal = play now" convention.** Before any game starts, A01 writes brain v1 (103 words) and A02, A03 and A04 all post agreement rather than competing over the file (#72, #108, #122). This pre-game alignment is the clearest cooperative moment in the run. (#72, #108, #122)
- **Game 1 opens with a burst of clean signals and lights.** In minute 1 the crew signals playable cards to each other and converts them: A02 lights Amber 1 and Amber 2 (#178, #217), A03 lights Cobalt 1 (#260), and A04 directs A03 to Cobalt and Amber (#241, #319). This shows the convention working when cards are visible. (#178, #217, #260, #319)
- **Blind plays and discards of live cards burn strikes and points.** A02 plays slot 1 blind in game 1 (#162) and A03 misfires on Violet 2 (#412). In game 2 A04 discards Cobalt 5, a playable card (#668), and later a lucky blind play on Cobalt 4 must have been a misfire per the reasoning at #1328 (strikes 2 of 3); A02 discards Moss 3 while it was playable (#2117). (#162, #412, #668, #1328, #2117)
- **A04 is nearly silent in the mid-game and stalls on unknown slots.** From minute 7 to minute 11 A04 repeatedly discards unknown slots rather than play (#1155, #1254, #1945, #2005, #2022, #2039), often because a blind play is judged under 60% odds. This slows the crew while other players hold known playable cards. (#1155, #1254, #1945, #2005, #2022, #2039)
- **The retro produces a second and third brain, but the write is refused twice for length.** A02's writeBrain is refused for 164 words (#767), and A03 is refused twice for 164 and 153 words (#1528, #1534) before a 147-word v3 is saved (#1570). The rule that only the captain writes the brain repeatedly blocks the team's stated agreement. (#767, #1528, #1534, #1570)
- **The run ends at minute 15 with no level solved by any resident.** All four residents remain stuck on level 1 for the full 15 minutes and the referee ends the run at #2269. Despite many lit cards and a working signal convention, no resident ever submitted a correct level. (#2269)

## Problems

1. **No resident ever solved or submitted a level, so the run ends in a total stall.** The facts show no levels solved and zero submissions for the whole run. The 16 quiet minutes (#2269) confirm the game never transitioned from card play to a level submission. (#2269)
2. **Residents repeatedly discard cards without knowing what they are, often discarding playable cards.** A04 discards slot 3 (Cobalt 5, playable) at #668, A02 discards Moss 3 while it is playable at #2117, and A01 discards Amber 4 at #1850. These discards cost points and remove cards the crew needed. (#668, #1850, #2117)
3. **Residents avoid blind plays at 50/50 or lower odds, so no one plays when all cards are unknown.** A03 refuses to play a 50/50 slot at #1917 and A04 refuses at #2022, both citing a strike limit. With two strikes used this is rational, but it stalls the game until the referee stops it. (#1917, #2022)
4. **The brain-write rule and word limit block the agreed retro output.** A02 and A03 are both refused with BRAIN_TOO_LONG at #767, #1528 and #1534. The 150-word limit is tighter than what the agreed conventions need, causing repeated retries. (#767, #1528, #1534)
5. **Residents try to act out of turn and are refused.** A03 tries giveSignal on A04's turn and is refused with NOT_YOUR_TURN (#1175). This shows the turn order is not being respected by residents planning multi-step moves. (#1175)
6. **Signals are spent to confirm information the receiver already knows.** A02 sends a Cobalt signal to A04 at #1694 that only confirms a Cobalt 2 already known to be playable. A03 also spends a signal on A04's Cobalt 2 at #1603, repeating known information. (#1603, #1694)

## Optimizations

- **Give residents a way to see their own hand so blind-play decisions are not coin flips.** The run is dominated by residents guessing their own slots (#1917, #2022). Exposing own-hand identity at a cost, or dropping the strike penalty for early-game blind plays, would let the crew move. (#1917, #2022)
- **Raise the brain word limit or auto-trim to the limit.** Three writeBrain refusals at #767, #1528 and #1534 show the 150-word cap is the bottleneck. A limit of 250 words or an automatic summarizer would let the retro save what the team agreed. (#767, #1528, #1534)
- **Give a signal token back on a successful play to stop the token drought.** Residents repeatedly cannot signal while other players hold playable cards, e.g. NO_SIGNALS at #1847 and A02 refusing to play at #1912. Returning a token on a lit card would keep signals flowing. (#1847, #1912)
- **Make a zero-action turn impossible so the crew cannot stall indefinitely.** A03 says "I'm ending the turn" without playing or discarding at #830 and #1660. Requiring one action per turn would force progress and shorten the quiet stretch. (#830, #1660)
- **Make the turn order and available actions visible in the tool response.** A03 attempts giveSignal out of turn at #1175 despite having played several turns already. Adding the active player and their available actions to each response would stop this error. (#1175)

## Loophole candidates

1. **Residents can repeatedly discard unknown cards to farm signal tokens without playing.** (residents) A04 discards unknown slots in minutes 7 to 13 (#1254, #1945, #2005, #2022, #2039) and receives signals back each time (#1901, #2038). This lets them act without ever risking a play. (#1254, #1945, #2005, #2022, #2039)
2. **Residents can end a turn with no action, which the game accepts as a valid turn.** (residents) A03 says "I'm ending the turn" at #830, #1660 and #2104 without playing or discarding. The tool accepts this, letting the crew pass indefinitely while the referee clock runs. (#830, #1660, #2104)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 46: event "team_post" (seq 46) does not match its schema
- line 53: event "team_post" (seq 53) does not match its schema
- line 60: event "team_post" (seq 60) does not match its schema
- line 66: event "brain_written" (seq 66) does not match its schema
- line 67: event "retro_closed" (seq 67) does not match its schema
- line 91: event "team_post" (seq 91) does not match its schema
- line 99: event "team_post" (seq 99) does not match its schema
- line 111: event "team_post" (seq 111) does not match its schema
- line 139: event "cards_dealt" (seq 139) does not match its schema
- line 140: event "game_started" (seq 140) does not match its schema
- line 141: event "deal_revealed" (seq 141) does not match its schema
- line 151: event "signal_given" (seq 151) does not match its schema
- line 165: event "card_played" (seq 165) does not match its schema
- line 166: event "card_drawn" (seq 166) does not match its schema
- line 173: event "signal_given" (seq 173) does not match its schema
- line 190: event "signal_given" (seq 190) does not match its schema
- line 202: event "card_discarded" (seq 202) does not match its schema
- line 203: event "card_drawn" (seq 203) does not match its schema
- line 211: event "card_played" (seq 211) does not match its schema
- and 238 more
