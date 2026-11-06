# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `holdem-mixed` |
| Seed | 42 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 46 (referee) |
| Counted | events #3 to #6228 (5083 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 46 minutes (to the end); A02 on level 1 from minute 0 for 46 minutes (to the end); A03 on level 1 from minute 0 for 46 minutes (to the end); A04 on level 1 from minute 0 for 46 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.232 USD for this run (competitors 0.232, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0063 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 47 of 47 minutes without a submission; longest without one: minutes 0-46 (47) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 27, BRAIN_DISABLED 5, BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents stalled on level 1 for the whole run.** A01, A02, A03 and A04 each sat on level 1 from minute 0 to minute 46 with no submission, and the run ended at the referee stop with zero levels solved and zero submissions. (#53, #62, #168, #6228)
- **Residents repeatedly hit the locked act tool mid-hand.** The city refused act with TOOL_LOCKED at #168, #630, #1471 and many other points, often right when a resident had reasoned out a bet or call; A04 was cut off while facing a bet with an open-ended draw (#165, #168) and A03 was cut off after deciding to call (#630). (#165, #168, #630, #1471)
- **The strategy brain was disabled for part of the run despite residents saving versions.** Residents announced saved brains (#62, #66, #3108) but readBrain later returned BRAIN_DISABLED at #1652 and #4894, and two writeBrain attempts were refused for being over 150 words (#3104, #4807). (#62, #1652, #3104, #4807, #4894)
- **Residents played many hands of poker but never produced a scoring submission.** Residents reasoned through hand after hand (#99, #157, #946, #5029) and several reported point swings between games (#3108, #4820, #5394), yet the run recorded no correct or wrong submissions and no board or DM activity. (#99, #3108, #4820, #5029, #5394)
- **Private per-hand reasoning was the only channel residents used.** Every substantive decision in the log is a REASONING line or a SAYS TO ITSELF line; there were zero DMs, board posts and group posts, so no resident ever communicated with another or the gamemaker. (#122, #320, #527, #811)
- **A03 lost the most across reported games and A01 led.** A01 self-reported +19 then +54 in consecutive games (#3108, #4820), while A03 self-reported +31 after game 2 then -41 in game 3, and lost a 40-chip pot at #5123, showing the seat order of strength that the design may want to disrupt. (#3108, #3131, #4820, #4840)

## Problems

1. **The run produced no submissions, so the scoring core never triggered.** Zero correct and zero wrong submissions over 47 minutes, with all four residents stuck on level 1 until the referee stopped the run at minute 46. (#6228)
2. **TOOL_LOCKED fired 27 times, interrupting residents mid-decision.** Residents decided on a play and then found act unavailable (#165, #168, #1911, #1914), which wastes the reasoning they just did and breaks the hand flow. (#165, #168, #1911, #1914)
3. **The brain was promised and then disabled, contradicting resident notes.** A03 and A01 described saving brain versions 1 and 4 (#62, #4820), while readBrain returned BRAIN_DISABLED (#1652, #4894), so residents reasoned from rules that did not hold. (#62, #1652, #4820, #4894)
4. **The 150-word brain limit was not visible before writing.** Two writeBrain attempts were refused as BRAIN_TOO_LONG at 172 and 159 words (#3104, #4807), meaning residents only learned the limit after being rejected. (#3104, #4807)
5. **Residents had no lane to the story because no posts or messages were ever sent.** The digest shows 0 DMs, 0 board posts and 0 group posts, and every log line is private reasoning or self-talk (#122, #320, #527). (#122, #320, #527)
6. **Play centered on poker hands while the story's level-solving goal went untouched.** Residents spent the run sizing bets and counting outs (#946, #5029) and reported per-game point totals (#3108, #4820) instead of working toward any level objective. (#946, #3108, #4820, #5029)

## Optimizations

- **Unlock act for every seat before the hand begins.** Problem: TOOL_LOCKED interrupts decisions. Make act available whenever a resident is to act so that a chosen play at #165 or #1911 is not discarded. (#165, #168, #1911, #1914)
- **Show the brain word limit in the writeBrain tool description.** Problem: BRAIN_TOO_LONG rejections at #3104 and #4807. Publish the 150-word cap up front so residents trim before submitting. (#3104, #4807)
- **Make brain availability consistent for the whole run.** Problem: BRAIN_DISABLED contradicts earlier saved versions (#62, #4820 vs #1652, #4894). Either keep one brain per match and say so at start, or state clearly that this match keeps no brain before residents plan around it. (#62, #1652, #4820, #4894)
- **Give the story a level-1 objective tied to the poker table.** Problem: no submissions and everyone stuck on level 1 for 46 minutes while only playing hands (#99, #5029). Define an explicit submission action so poker results feed the scoring loop. (#99, #5029)
- **Require at least one public message or board post per game.** Problem: zero DMs, board posts and group posts. Add a story beat that forces each resident to state a read or a deal publicly so other residents can react. (#122, #320, #527)
- **End the run on hand completion rather than a referee cutoff.** Problem: residents were still mid-hand reasoning at the end (#6158, #6205, #6218) when the referee stopped at minute 46. Let the running hand finish and submit before ending. (#6158, #6205, #6218)

## Loophole candidates

1. **Paired residents dumped their strategy notes into self-talk instead of the intended channel.** (residents) Residents used SAYS TO ITSELF for game summaries and brain-change notes (#3108, #3131, #4820) that read like intended brain writes, letting them record lessons without passing the writeBrain check. (#3108, #3131, #4820)
2. **Residents avoided the brain check by skipping readBrain.** (residents) After BRAIN_DISABLED or BRAIN_TOO_LONG, A02 and A03 chose not to retry readBrain and went on reasoning from memory (#3192, #4853), sidestepping the tool the city set up. (#3192, #4853, #4894)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 30: event "brain_written" (seq 30) does not match its schema
- line 31: event "retro_closed" (seq 31) does not match its schema
- line 37: event "brain_written" (seq 37) does not match its schema
- line 38: event "retro_closed" (seq 38) does not match its schema
- line 78: event "game_started" (seq 78) does not match its schema
- line 79: event "hand_started" (seq 79) does not match its schema
- line 80: event "cards_dealt" (seq 80) does not match its schema
- line 81: event "action_taken" (seq 81) does not match its schema
- line 82: event "action_taken" (seq 82) does not match its schema
- line 93: event "decision_scored" (seq 93) does not match its schema
- line 94: event "action_taken" (seq 94) does not match its schema
- line 102: event "decision_scored" (seq 102) does not match its schema
- line 103: event "action_taken" (seq 103) does not match its schema
- line 116: event "decision_scored" (seq 116) does not match its schema
- line 117: event "action_taken" (seq 117) does not match its schema
- line 128: event "decision_scored" (seq 128) does not match its schema
- line 129: event "action_taken" (seq 129) does not match its schema
- line 130: event "board_dealt" (seq 130) does not match its schema
- and 1125 more
