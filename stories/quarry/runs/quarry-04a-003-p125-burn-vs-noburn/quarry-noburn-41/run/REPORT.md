# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `quarry-noburn` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1304 (1078 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.035 USD for this run (competitors 0.035, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0020 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
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

- **All four residents stall on level 1 for the whole run without a single submission** A01, A02, A03 and A04 each sit on level 1 from minute 0 to minute 12 and the run ends at minute 12 with zero submissions (#1304). The residents do reason, pick and score internally (#121, #128, #135, #142), so the play happens but never becomes a submission. (#121, #135, #1304)
- **Every resident's first brain write is refused for exceeding 150 words** After game 1 all four residents get BRAIN_TOO_LONG on their retro write: #460 (A01, 170 words), #466 (A02, 165), #472 (A03, 163), #478 (A04, 153). The same error repeats at minute 8 (#891, #897, #911, #917) even though the residents are explicitly trimming to the limit. (#460, #466, #472, #478)
- **A04 wins game 1 with a deep basalt set plus lodestones** A04 reports 105 points from 8 basalt and 2 lodestones (#534), ahead of A01 at 96 (#538) and A03 at 85 (#511). A04's pacing shows in its early picks of B1 (#169) and the lodestones (#293, #721). (#169, #511, #534, #538)
- **A02 wins game 2 by committing to amber, after finishing last in game 1** A02 says it finished first with 89 points, 8 amber plus the quarry bonus (#944), while A04 finished last with 67 (#956). A02's early amber pick (#565) and its willingness to take a lodestone in the biggest set (#390) set up the turnaround. (#390, #565, #944, #956)
- **Residents treat lodestone as wild and read passed picks as signals about rivals** A02 takes L3 reasoning that it joins the biggest set (#390), and A04 grabs L1 as scarce early (#721). Several residents read what packs leave for others, e.g. A03 notes cobalt isn't in play and switches to jade (#196), and A03 later takes B2 to deny basalt (#1231). (#196, #390, #721, #1231)
- **The run ends mid-thought in the third game** After game 2 the residents start a third draft (#967, #982, #989) and are still picking at minute 11 (#1195, #1202, #1215, #1252) when the referee ends the run at minute 12 (#1304). No result of game 3 is recorded. (#967, #1195, #1252, #1304)

## Problems

1. **No resident ever submits, so the scoring loop never closes** Quiet minutes cover all 13 minutes and submissions are 0 correct, 0 wrong, with the run ending at #1304. The residents' games are played only in reasoning, so the harness's submission path is unused by everyone. (#34, #43, #51, #1304)
2. **Brain length limit is a wall, not a nudge** 8 BRAIN_TOO_LONG errors occur and all four first attempts fail (#460, #466, #472, #478). Even after one round of revision, three of four fail again on the second retro (#891, #911, #917), and A01 only gets through at #920. (#460, #466, #472, #478, #891)
3. **Picks are made but never registered as city actions** The residents describe concrete picks such as C10 (#121), A8 (#128), C2 (#135) and B1 (#169), but the facts record 0 submissions, 0 transfers and 0 picks in the city log. The draft resolution lives only in the models' private reasoning. (#121, #128, #135, #169)
4. **The run ends before the second draft is scored** The residents are in the middle of following the game-2 retro when the referee stops the run at minute 12 (#1304), while A02 is still weighing amber cards (#1215). There is no final standings entry, so the second draft's result cannot be seen. (#1195, #1215, #1304)
5. **Brain-write windows open only after a game, so early setup is rushed** At minute 0 the residents record that writeBrain is already locked (#80, #86, #92) before any game starts, so the brain is saved once in a hurry and the first real revision happens after a game. The rush overlaps with the BRAIN_TOO_LONG failures. (#43, #80, #86, #92)

## Optimizations

- **Add a hard 150-word linter before the brain write** The city should preview the word count and refuse inline with a shorter draft to cut the 8 BRAIN_TOO_LONG errors (#460, #478, #891, #917). A simple word-count tool or a hard trim would let residents spend their words on strategy. (#460, #478, #891, #917)
- **Make picks visibly register in the city log** The residents describe picks like #121 and #135, but no pick appears in the facts. Record each pick as a city event so the digest and the final standings can report it. (#121, #135, #169)
- **Extend the run to finish the third draft** The referee ends the run at minute 12 (#1304) while the second draft is in progress (#1252). Add minutes or close the draft cleanly so at least the game-2 result and standings are known. (#1252, #1304)
- **Open the first brain window before the first pick, not after a game** The writeBrain lock at minute 0 (#80, #86) forces a rushed first brain. Allow a full brain window before game 1 so residents can plan without the lock message. (#80, #86, #92)

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
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
- line 68: event "brain_written" (seq 68) does not match its schema
- line 69: event "retro_closed" (seq 69) does not match its schema
- line 115: event "draft_game_started" (seq 115) does not match its schema
- line 116: event "draft_pick_opened" (seq 116) does not match its schema
- line 124: event "draft_card_picked" (seq 124) does not match its schema
- line 131: event "draft_card_picked" (seq 131) does not match its schema
- line 138: event "draft_card_picked" (seq 138) does not match its schema
- line 145: event "draft_card_picked" (seq 145) does not match its schema
- line 146: event "draft_pick_opened" (seq 146) does not match its schema
- line 153: event "draft_card_picked" (seq 153) does not match its schema
- and 206 more
