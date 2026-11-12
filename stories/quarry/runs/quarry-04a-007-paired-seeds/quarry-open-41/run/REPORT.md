# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry-open` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #5 to #1392 (1166 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.045 USD for this run (competitors 0.045, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0025 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 6, TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Nobody ever submitted a pick, so the whole run was 14 quiet minutes.** All four residents stayed on level 1 from minute 0 to minute 13 and no submission was recorded; the referee ended the run at #1392. The picks residents debated in their heads, such as #122 and #162, never became submissions. (#122, #162, #1392)
- **Residents spent the first minute writing a brain blind, without rules.** A01, A02, A03 and A04 all reasoned they had no rules yet and wrote generic brains (#44, #52, #60, #68). Then the brain window closed: #77 and #89 note writeBrain is locked and only viewTable/readBrain remain. (#44, #52, #60, #68, #77, #89)
- **writeBrain stayed locked for most of the run and refused two attempts.** A03 was refused at #169 and again at #1061 with TOOL_LOCKED, while A02 at #95 and A01 at #89 concluded the tool was closed until a retro window. This blocked the stated retro loop for minutes on end. (#89, #95, #169, #1061)
- **When the retro window did open, three residents burned it on over-long brains.** A04 (#509, #933), A01 (#515, #945, #966) and A02 (#939) were all refused with BRAIN_TOO_LONG at 151 to 175 words against a 150 limit. Only later writes, like A02's 137-word version reported at #990, went through. (#509, #515, #933, #939, #945, #966, #990)
- **The hidden draft game still ran and produced scores, showing the engines worked.** Even with zero recorded submissions, residents report game results: A01 117, A04 100, A02 77 (game 1, #562, #566, #570) and 77/77/65/63 in game 2 (#969, #990, #994, #1002). A01's lesson was deep single-colour hoarding (#512), A03's was picking the colour with most copies (#969). (#562, #566, #570, #969, #990, #994, #1002)
- **Residents repeatedly reasoned about picks for a game whose picks never registered.** From minute 1 to minute 11 every resident debated card colours and lodestones (#122, #201, #320, #371, #1011, #1298). The mismatch between their detailed play and the empty submission count is the central anomaly of the run. (#122, #201, #320, #371, #1011, #1298)

## Problems

1. **No submission path existed, so the level never progressed.** All four were stuck on level 1 for 13 minutes with 0 correct and 0 wrong submissions. Residents reasoned about picks (#122, #1011) but the city recorded no submissions, so the stall began at minute 0 and never lifted. (#122, #1011, #1392)
2. **The writeBrain lock fired exactly when residents needed it.** A03's #169 and #1061 refusals and the reasoning at #77, #89, #95 show writeBrain was locked in phases where residents expected to write. The retro captain mechanic (A04 at #994) left others with no tool and nothing to do. (#77, #89, #95, #169, #994, #1061)
3. **The 150-word brain limit is too tight for the lessons residents accumulate.** Six BRAIN_TOO_LONG refusals occurred, at 151 to 175 words: #509, #515, #933, #939, #945, #966. Residents spent their whole retro window trimming text instead of improving strategy, and A01 was refused three times in one window. (#509, #515, #933, #939, #945, #966)
4. **Residents reasoned without seeing real rules and invented scoring details.** A02 at #122 and A04 at #320 reasoned about squares, majority bonuses and lodestones as if known, but the log shows no rules being given before the first game (#44, #52, #60). This produced confidence in numbers the city may not have used. (#44, #52, #60, #122, #320)
5. **Phase transitions were invisible, so residents kept calling locked tools.** A03 at #83 and #527 and A04 at #1040 note pick or writeBrain is locked with only viewTable/readBrain open, and A02 at #1145 guesses the pack phase ended. Without an explicit phase signal, minutes were lost guessing. (#83, #527, #1040, #1145)

## Optimizations

- **Make submissions reachable before or independent of the brain step.** Problem: nobody ever submitted. Ensure the first level offers a submission tool immediately, and log each attempted pick, so residents' #122 and #162 reasoning would register as submissions. (#122, #162, #1392)
- **Raise or trim the brain word limit automatically.** Problem: six BRAIN_TOO_LONG refusals at 151 to 175 words (#509, #945, #966). Either raise the limit to about 200 words or have the harness truncate boilerplate so the retro window is not spent on trimming. (#509, #933, #939, #945, #966)
- **Show the phase and active tools in every turn prompt.** Problem: residents guessed locks at #83, #527, #1040 and #1145. Announce the current phase (brain window, draft pick, retro) and the open tool list explicitly, so no resident wastes a call on writeBrain when it is locked. (#83, #527, #1040, #1145)
- **Give every resident a retro action so no one idles.** Problem: the retro captain mechanic left non-captains with only viewTable/readBrain (#994, #989). Let all residents write or at least log a lesson each retro, so the minute spent acknowledging is spent improving. (#989, #994)
- **Publish the rules before game one starts.** Problem: A02 and A04 wrote and reasoned about generic principles because rules were unknown (#44, #60). Send a rules line with the first table view so the first game is played on the intended mechanics rather than invented ones (#122, #320). (#44, #60, #122, #320)

## Loophole candidates

1. **Residents satisfied the retro loop by self-talk instead of real brain edits.** (residents) Residents repeatedly said to themselves that their brain was saved (#102, #110, #114, #562) even when writes were later refused, giving a cheap appearance of progress with no effective update. (#102, #110, #114, #562)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 55: event "brain_written" (seq 55) does not match its schema
- line 56: event "retro_closed" (seq 56) does not match its schema
- line 63: event "brain_written" (seq 63) does not match its schema
- line 64: event "retro_closed" (seq 64) does not match its schema
- line 71: event "brain_written" (seq 71) does not match its schema
- line 72: event "retro_closed" (seq 72) does not match its schema
- line 116: event "draft_game_started" (seq 116) does not match its schema
- line 117: event "draft_pick_opened" (seq 117) does not match its schema
- line 125: event "draft_card_picked" (seq 125) does not match its schema
- line 132: event "draft_card_picked" (seq 132) does not match its schema
- line 144: event "draft_card_picked" (seq 144) does not match its schema
- line 166: event "draft_card_picked" (seq 166) does not match its schema
- line 167: event "draft_pick_opened" (seq 167) does not match its schema
- line 174: event "draft_card_picked" (seq 174) does not match its schema
- and 206 more
