# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry` |
| Seed | 47 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #5 to #1338 (1112 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.036 USD for this run (competitors 0.036, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 6, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents started with a generic brain because the rules were not visible yet.** A01, A02, A03 and A04 all said they would write a short generic strategy brain before game 1 opened, since no rules were shown (#43, #51, #59, #67). Each then recorded brain version 1 saved and waited for the game to open (#101, #105, #109, #113). (#43, #51, #59, #67, #101, #105, #109, #113)
- **A03 won game 1 by concentrating on amber and every resident concluded that concentration wins.** A03's own retro put its game-1 score at 137 from ten amber plus a lodestone, against A04 at 90, A01 at 84 and A02 at 52 (#467, #475, #483, #527). A01, A02 and A04 each drew the same lesson and rewrote their brains to commit to one deep colour (#497, #501, #520). (#467, #475, #483, #497, #501, #520, #527)
- **Every brain rewrite after game 1 was refused for being over the 150-word limit.** A03 was refused twice on game-1 retro and once on game-2 retro (151, 151 and 152 words) (#464, #494, #901, #934). A01 (157 words) and A04 (172 words) were also refused after game 2 (#907, #913), so the typed-in lessons from games 1 and 2 mostly did not reach the brains. (#464, #494, #901, #907, #913, #934)
- **A03 stayed the strongest by scoring 105 on game 2 with amber again.** A03's own tally for game 2 was amber 8 and basalt 3 plus a lodestone, for 105 (#898). A02 was second with 90 (basalt 7, jade 3, two lodestones) and A04 had about 71 with cobalt 6 and jade 4 (#916, #910). (#898, #910, #916)
- **Residents treated fall-back picks as irrelevant and picked by colour alone.** A04 said the card number 'doesn't really matter here' before taking C8 (#969), and A01 dismissed the choice between two cobalt cards as barely mattering (#142). Several picks were hedges toward a second colour rather than the main line (#826, #857, #1058). (#142, #826, #857, #969, #1058)
- **No resident submitted a move that advanced the story, and the referee ended at minute 13.** The run recorded 0 submissions, 0 messages and 0 transfers, and the referee ended it at minute 13 (#1338). Three games of picks happened only in private reasoning and self-talk (#101, #527, #954). (#101, #527, #954, #1338)

## Problems

1. **Zero submissions and zero level-ups for the whole run.** The run ended with no correct or wrong submissions, no points and every resident stuck on level 1 from minute 0 to 13 (#1338). The intended graded game never produced a single answer, so there is nothing for the designers to tune. (#1338)
2. **The brain word limit blocked residents exactly when they had lessons to save.** Six BRAIN_TOO_LONG refusals landed on every retro after game 1, and each failed by only 1-22 words (#464, #494, #901, #934, #907, #913). A04's 172-word attempt (#913) shows residents did not know how close they were to the limit. (#464, #494, #901, #907, #913, #934)
3. **Residents could not see the table during the first minutes and guessed rules instead.** Before game 1 opened, residents found no pack or rules to view and guessed scoring, e.g. A04 assuming squared counts and taking jade as the most abundant (#101, #121). Guessed scoring rules then drove all the early picks (#135, #142). (#101, #121, #135, #142)
4. **Tool locking confused residents and made them end turns with nothing done.** Several turns were spent noticing pick or writeBrain was locked and then just ending (#593, #599, #1006, #1018). A03 hit TOOL_LOCKED on writeBrain mid-game (#1018) and A04 abandoned a retry on assumption (#998). (#593, #599, #998, #1006, #1018)
5. **The story produced no public interaction at all.** There were 0 DMs, 0 board posts and 0 group posts, and 0 transfers (#1338 counts). All reasoning about other seats stayed private, e.g. A02 speculating about who held cobalt (#916), so no alliances or lies could form. (#916, #1338)

## Optimizations

- **Warn or auto-trim before the brain hits the word limit.** Show the current word count in every writeBrain response and return the trimmed text on refusal, addressing the six BRAIN_TOO_LONG refusals (#464, #494, #901, #934, #907, #913). A04's 172-word try (#913) would have been caught before failing. (#464, #494, #901, #907, #913, #934)
- **Publish the rules and a sample table before game 1 opens.** Residents guessed scoring in minute 1 (A04 assuming squared counts at #121, A02 assuming per-colour squares at #135). Giving the scoring rule up front would stop the first pack from being played blind. (#101, #121, #135, #142)
- **State what a locked pick phase expects instead of just hiding the tool.** Residents ended turns without acting when pick disappeared (#593, #599, #1006, #998). A one-line 'wait for pack N' or an auto-advance would keep turns productive and reduce idle minutes (0 submissions across 14 quiet minutes). (#593, #599, #998, #1006)
- **Give residents a cheap way to identify a card's colour from its number.** Residents picked by colour memory and called numbers irrelevant (#969) or guessed colours of options they could not read (#558). A short key in the pack listing would make those picks deliberate rather than guesswork. (#142, #558, #969)
- **Make the graded path start immediately so the run can produce submissions.** The entire run produced no submission and ended at minute 13 (#1338). Starting the puzzle at minute 0 or shortening the pre-game wait would let the designers see at least one graded attempt. (#1338)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 46: event "brain_written" (seq 46) does not match its schema
- line 47: event "retro_closed" (seq 47) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 62: event "brain_written" (seq 62) does not match its schema
- line 63: event "retro_closed" (seq 63) does not match its schema
- line 70: event "brain_written" (seq 70) does not match its schema
- line 71: event "retro_closed" (seq 71) does not match its schema
- line 115: event "draft_game_started" (seq 115) does not match its schema
- line 116: event "draft_pick_opened" (seq 116) does not match its schema
- line 124: event "draft_card_picked" (seq 124) does not match its schema
- line 131: event "draft_card_picked" (seq 131) does not match its schema
- line 138: event "draft_card_picked" (seq 138) does not match its schema
- line 145: event "draft_card_picked" (seq 145) does not match its schema
- line 146: event "draft_pick_opened" (seq 146) does not match its schema
- line 153: event "draft_card_picked" (seq 153) does not match its schema
- and 206 more
