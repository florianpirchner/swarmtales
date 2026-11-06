# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-g2` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 10 (referee) |
| Counted | events #2 to #1447 (1291 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 10 minutes (to the end); A02 on level 1 from minute 0 for 10 minutes (to the end); A03 on level 1 from minute 0 for 10 minutes (to the end); A04 on level 1 from minute 0 for 10 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.098 USD for this run (competitors 0.098, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0083 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 11 of 11 minutes without a submission; longest without one: minutes 0-10 (11) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 7, TOOL_LOCKED 3, NOT_YOUR_TURN 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 wrote the first team brain before the game began.** A01's first writeBrain was refused for length (#70), then a 122-word version was saved and the tool closed to A01 afterwards (#113). That brain stayed in force for the rest of game 1. (#70, #113)
- **A03's suit-only signal caused the first misfire.** A01 signalled only "Amber" on A03's slot 4 (#269), and A03 read the suit as proof of Amber 1 and played Amber 5 (#316). A03 called it a strike of 3 and named the ambiguity as its own error (#316). (#269, #316)
- **A02 misfired on a one-in-three Rose guess.** A02 knew its slot 2 was Rose 2, 6 or 7 and played it anyway (#257), losing Rose 6 and taking a strike (#296). The two strikes early forced everyone into cautious discards. (#257, #296)
- **Discarding drained the deck before the towers could finish.** A01 alone discarded four cards by minute 3 (#215, #323, #435, #616), and the draw pile was empty by minute 3 (#570, #583). The crew lit only 11 of 35 in game 1 (#804) and the game ended with several playable cards still in hand (#1434). (#215, #323, #435, #583, #616, #804, #1434)
- **The retro produced brain v2 after five refusals.** A02 was refused five times for exceeding 150 words (#732, #743, #759, #765, #771, #777) before saving a 146-word brain (#804). The new brain moved rank signals ahead of suit signals and limited discards to dead slots. (#732, #743, #759, #765, #771, #777, #804)

## Problems

1. **No level was ever solved and no submission was made.** All four residents sat on level 1 from minute 0 to minute 10 with 0 correct and 0 wrong submissions. The story ran out of time before any result counted, whatever happened inside the game. (#113, #804, #1447)
2. **Residents spent their turns on retro and brain-writing instead of play.** Most of minute 0 and minute 4 went to channel discussion and brain edits, and the game only started around minute 0-1 and again at minute 6 of game 2. A02 burned five turns on rejected writeBrain calls (#732-#777) rather than playing. (#53, #60, #83, #729, #732, #743, #759, #765, #771, #777)
3. **The 150-word brain limit repeatedly blocked the designated writer.** writeBrain was refused for length seven times in total (#70, #732, #743, #759, #765, #771, #777). The writers had to trim repeatedly, which consumed turns and delayed the game. (#70, #732, #743, #759, #765, #771, #777)
4. **Residents tried to post to the team channel mid-game and were locked out.** A01, A03 and A02 each called postTeam during play and got TOOL_LOCKED (#156, #286, #825). A02's mid-game note about a misread never reached the team (#838). (#156, #286, #825, #838)
5. **Suit-only signals misled the receiver into a wrong play.** A01's "Amber" signal on A03's slot 4 made A03 play Amber 5 as if it were Amber 1 (#269, #316). The signal convention the team wrote in v1 allowed suit-without-rank hints, and both games show the resulting misfires or wasted signals (#367, #647, #718). (#269, #316, #367, #647, #718)
6. **Repeated discards of unknown cards threw away needed cards.** A03 discarded Violet 6 (#243), A02 discarded Amber 2 (#411) and A04 discarded Amber 2 (#998), all cards later needed by their towers. The deck emptied early and towers stalled at gaps. (#243, #411, #570, #583, #998)

## Optimizations

- **Give the residents a clear pre-game window and a hard play clock.** Most of minute 0 and minute 4 went to retro talk and tool refusals before or between games (#53, #729, #759), and the run ended at minute 10 with level 1 unsolved. A fixed, short prep window followed by a timed play phase would put minutes into the towers. (#53, #729, #759, #1447)
- **Expose the brain word count before submission.** Seven BRAIN_TOO_LONG refusals wasted turns (#70, #732, #743, #759, #765, #771, #777). Showing the writer a live word count or auto-truncating to 150 words would stop the loop. (#70, #732, #743, #759, #765, #771, #777)
- **Allow a rank alongside every suit signal, or forbid suit-only hints.** Suit-only signals caused A03's misfire on Amber 5 (#269, #316) and forced a second signal later (#367, #647). Requiring rank information, or letting a signal carry suit and rank together, would cut the misfires. (#269, #316, #367, #647)
- **Make postTeam available during play for short notes.** A01, A03 and A02 all tried postTeam in play and were locked out (#156, #286, #825), and A02's misread of Moss 4 never reached the team (#838). A short in-play channel or a signal-only fallback would let residents correct each other. (#156, #286, #825, #838)
- **Reward signal use over blind discards so the deck stops draining.** A03, A02 and A04 discarded needed cards (#243, #411, #998) and the deck emptied by minute 3 (#570, #583). A rule that returns a card to the bottom of the deck on discard, or limits discards per round, would keep the towers alive. (#243, #411, #570, #583, #998)

## Loophole candidates

1. **The crew treated the shared brain as a substitute for playing.** (residents) Residents repeatedly passed turns to write or discuss the brain (#74, #75, #83, #105) while the towers sat at 0, and A03 ended its turn after only one channel post (#74). Writing the brain counted as an action without advancing the game. (#74, #75, #83, #105)
2. **Blind-play gambles were justified by the low strike cost.** (residents) A02 played a one-in-three Rose guess (#257) and later a two-in-three 3 (#595), reasoning that a miss only cost a strike. With two strikes available, a guess was cheaper than another discard, which the rules did not intend as a safe option. (#257, #296, #595)

## Dropped from the model's answer

- Digest highlights item 6: cites unknown events #1

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 48: event "team_post" (seq 48) does not match its schema
- line 56: event "team_post" (seq 56) does not match its schema
- line 63: event "team_post" (seq 63) does not match its schema
- line 86: event "team_post" (seq 86) does not match its schema
- line 92: event "brain_written" (seq 92) does not match its schema
- line 93: event "retro_closed" (seq 93) does not match its schema
- line 131: event "cards_dealt" (seq 131) does not match its schema
- line 132: event "game_started" (seq 132) does not match its schema
- line 133: event "deal_revealed" (seq 133) does not match its schema
- line 145: event "signal_given" (seq 145) does not match its schema
- line 164: event "card_discarded" (seq 164) does not match its schema
- line 165: event "card_drawn" (seq 165) does not match its schema
- line 177: event "card_played" (seq 177) does not match its schema
- line 178: event "card_drawn" (seq 178) does not match its schema
- line 185: event "signal_given" (seq 185) does not match its schema
- line 193: event "card_discarded" (seq 193) does not match its schema
- line 194: event "card_drawn" (seq 194) does not match its schema
- line 211: event "signal_given" (seq 211) does not match its schema
- line 228: event "card_discarded" (seq 228) does not match its schema
- and 136 more
