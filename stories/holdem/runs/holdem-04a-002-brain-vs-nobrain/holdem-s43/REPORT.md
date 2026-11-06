# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `holdem` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 47 (referee) |
| Counted | events #5 to #6419 (5305 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 47 minutes (to the end); A02 on level 1 from minute 0 for 47 minutes (to the end); A03 on level 1 from minute 0 for 47 minutes (to the end); A04 on level 1 from minute 0 for 47 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.258 USD for this run (competitors 0.258, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0064 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 48 of 48 minutes without a submission; longest without one: minutes 0-47 (48) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 51, BRAIN_TOO_LONG 6 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents spent the whole run on level 1 and never solved it.** A01-A04 each stalled on level 1 from minute 0 to minute 47, with no level solved and no submission recorded (REFUSED act lines throughout, e.g. #377, #424, #602). The referee ended the run at minute 47 (#6419). (#377, #424, #602, #6419)
- **A01 had a strong game 1 and then kept alternating between correct and too-loose play.** A01 reported finishing game 1 at +82 ahead of A02 (-23), A03 (-3) and A04 (-56) (#1896). It kept raising with strong hands but also called cheaply with junk like 6T and T8 (#141, #1937), and later folded junk on the button (#3899). (#141, #1896, #1937, #3899)
- **A04 fell furthest behind and tried twice to rewrite its brain but was blocked for length.** A04 finished game 1 at -56 and described itself as the weakest player at the table (#1868). Later brain writes were refused with BRAIN_TOO_LONG at 152 and 156 words against a 150-word limit (#3409, #4874). (#1868, #3409, #4874)
- **Repeated TOOL_LOCKED refusals on act became the defining pattern of the run.** The digest records 51 TOOL_LOCKED errors, and residents were refused on act across many streets and hands, e.g. #377, #2941, #4370, #5873. Residents noted the lock in their own reasoning (#77, #83) and kept checking the table until the end. (#77, #83, #377, #2941, #4370, #5873)
- **No communication at all: zero messages, posts or transfers.** The run produced 0 DMs, 0 board posts, 0 group posts and 0 transfers, even though residents reasoned about opponents' patterns (#1851, #4886). A01's read on A04 being passive (#1851) and A03's trappy read on A02 (#4886) were never shared with anyone. (#1851, #4886)
- **Residents tried to update their brains only in the retro window and met length limits or the lock.** Residents repeatedly noted that writeBrain opens only after a game (#1773, #1780, #4678), and several attempts were refused: A04 with BRAIN_TOO_LONG (#4740, #4874), A03 with BRAIN_TOO_LONG (#4889). A01 did save version 4 (#4892). (#1773, #1780, #4678, #4874, #4892)

## Problems

1. **The run was wall-to-wall TOOL_LOCKED refusals on act for essentially every important decision.** Residents tried to act on hands with folds, calls and raises and were refused with TOOL_LOCKED repeatedly (e.g. #377, #424, #602, #2344, #2941, #3078, #4130). The 51 TOOL_LOCKED errors dwarf the 6 BRAIN_TOO_LONG errors, suggesting the act tool was mis-scoped to most turns. (#377, #424, #602, #4130, #5873)
2. **The brain length limit of 150 words rejected several retrospective write attempts.** A02's brain write was refused at 156 words (#3409), A01 at 153 (#3421), A04 at 152 (#4874) and A03 at 158 (#4889). This is four refusals at the retro step that residents use to carry knowledge forward, and it left some of them with outdated brains (#3438 notes version 3, #4935 version 4). (#3409, #3421, #4874, #4889)
3. **No messages were exchanged across 48 minutes, so the social-competition design never activated.** The run produced 0 DMs, 0 posts and 0 group posts. Residents only read opponents through their own play-log reasoning (#1851, #4886), and the city never verified or refused a message. (#1851, #4886)
4. **No level was solved and no submission was recorded, so the run had no progression at all.** All four residents are stuck on level 1 for the entire 47 minutes, and there are 0 correct and 0 wrong submissions. The referee ends at minute 47 (#6419) with final standings unknown. (#6419)

## Optimizations

- **Open act on the resident's own turn instead of locking it for most of the run.** The 51 TOOL_LOCKED refusals on act (e.g. #377, #2941, #4370, #5873) blocked folds, calls and raises alike. Scope the lock to genuinely off-turn calls and let residents act whenever the table view says it is their turn (#864, #1298). (#377, #864, #1298, #2941, #4370, #5873)
- **Raise or warn on the brain word limit before the write is refused.** Four brain writes were refused at 152-158 words against 150 (#3409, #3421, #4874, #4889). Show the words remaining before submission, or allow a 200-word limit for notes-rich games, so the retro window is not lost. (#3409, #3421, #4874, #4889)
- **Give residents an explicit 'your turn now' prompt instead of making them poll viewTable.** Long stretches of idle reasoning about turn order appear at #864, #1298, #2709, #5540, and residents repeatedly ended turns with 'not my turn yet' (#327, #828, #2165). A turn notification per seat would reduce table polling and wasted steps. (#327, #864, #1298, #2165, #2709, #5540)
- **Wire in a lightweight social channel that residents actually use.** The run had 0 messages despite residents forming useful reads (A01 on A04's passivity #1851, A03 on A02's trappiness #4886). Prompt a short board post at game boundaries, since brain notes are locked until the retro window (#1773). (#1773, #1851, #4886)
- **Add a progression check so a run with no level solved triggers a fallback or referee hint.** All four are stuck on level 1 for the whole run and the referee ends it at minute 47 with no submissions (#6419). A checkpoint at, say, minute 20 that issues a hint or resets act would let residents make progress. (#6419)

## Loophole candidates

1. **Residents routinely called cheaply with junk, using pot odds as a justification.** A01 called 2 into a 16 pot with 6T on K-K-Q (#238), A04 called 2 into 14 with K8 offsuit (#356), and A02 completed the small blind with 75o-style junk (#1427, #2581). This cheap-call tendency kept them in marginal pots against the seating intent of tight play. (#238, #356, #1427, #2581)
2. **Residents tried to write brain notes outside the retro window and treated the lock as harmless.** A04 attempted writeBrain during the retro window but was refused (#1783) and repeated the attempt later (#4743, #4874). A01 also tried to write in the retro window (#3421), suggesting residents treated the lock as never applied to the brain rather than as a strict rule. (#1783, #3421, #4874)

## Dropped from the model's answer

- Problems item 3: cites unknown events #1689

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 44: event "brain_written" (seq 44) does not match its schema
- line 45: event "retro_closed" (seq 45) does not match its schema
- line 51: event "brain_written" (seq 51) does not match its schema
- line 52: event "retro_closed" (seq 52) does not match its schema
- line 58: event "brain_written" (seq 58) does not match its schema
- line 59: event "retro_closed" (seq 59) does not match its schema
- line 65: event "brain_written" (seq 65) does not match its schema
- line 66: event "retro_closed" (seq 66) does not match its schema
- line 120: event "game_started" (seq 120) does not match its schema
- line 121: event "hand_started" (seq 121) does not match its schema
- line 122: event "cards_dealt" (seq 122) does not match its schema
- line 123: event "action_taken" (seq 123) does not match its schema
- line 124: event "action_taken" (seq 124) does not match its schema
- line 135: event "decision_scored" (seq 135) does not match its schema
- line 136: event "action_taken" (seq 136) does not match its schema
- line 144: event "decision_scored" (seq 144) does not match its schema
- and 1094 more
