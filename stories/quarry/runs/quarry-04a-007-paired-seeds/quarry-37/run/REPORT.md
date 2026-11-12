# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #5 to #1330 (1104 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.034 USD for this run (competitors 0.034, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0019 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents start level 1 with no submissions for the whole run** A01-A04 each stayed on level 1 from minute 0 to minute 13 and made 0 correct and 0 wrong submissions; the referee ended the run at minute 13 (#1330). The log shows picking activity (e.g. #124, #138) but no submission ever reached the city. (#124, #138, #1330)
- **Residents spent the pre-game window writing generic brains** Before any rules were known, A02 drafted a ~120-word general brain (#45) and A04 wrote a generic brain to handle whatever comes up (#60); A01 and A03 planned the same (#68, #77). None of this led to a submission once the game opened. (#45, #60, #68, #77)
- **Residents drafted cards but never converted them into scored submissions** A02 kept a cobalt line (#537, #721, #809), A04 built jade and took lodestones (#742, #766), A01 built amber and cobalt (#793, #1223), and A03 alternated jade and basalt (#838, #1207). All four report scores in their own reasoning (e.g. A04 99 at #482, A02 90 at #474), yet the computed facts record no level solved and no submission. (#474, #482, #537, #721, #766, #1223)
- **A04's brain write was refused for length** At minute 8 the city recorded REFUSED A04 writeBrain with BRAIN_TOO_LONG: 157 words against a limit of 150 (#926). This is the only tool error and the only city-recorded refusal in the run. (#926)
- **Residents repeatedly hit a locked pick tool and idled** After picking, several residents found only viewTable and readBrain open and ended their turn waiting for the next pack (#559, #565, #619, #994, #1000, #1006). These waits are the mechanics behind the 14 quiet minutes. (#559, #565, #619, #994, #1006)

## Problems

1. **No resident ever submitted, so no level was solved** The computed facts show 0 correct and 0 wrong submissions and all four residents stuck on level 1 for 13 minutes. Drafting reasoning (#124, #288) never turned into a submission event. (#124, #288, #1330)
2. **The draft-and-score loop in reasoning never reached the city's scoring** Residents discuss points and quarry contents as if games had been scored (#458, #899, #915, #923), but the run has no submissions and no standings. Either the scoring happens outside the logged tools or the residents misread what counts. (#458, #899, #915, #923)
3. **Brain-writing is locked most of the time** Residents were told writeBrain is only open in the retro window (#77, #83, #96) and A02 noted pick and writeBrain closed together (#491). With a 13-minute run this leaves almost no usable window, and the one attempt failed on length (#926). (#77, #83, #96, #491, #926)
4. **Long idle gaps between picks** Residents end turns waiting for the next pack (#565, #994, #1000), producing 14 quiet minutes out of 14. The harness appears to wait on pack availability rather than driving play forward. (#565, #994, #1000)

## Optimizations

- **Add an explicit submit tool path and log it** Because no submission appears despite active drafting (#124, #1223), give residents a clearly advertised submit action after each pack and log each attempt so designers can see why none was made. (#124, #1223)
- **Shorten or warn on the brain word limit** A04 lost a retro-window write to BRAIN_TOO_LONG at 157/150 words (#926); show a running word count in the writeBrain tool or raise the cap. (#926)
- **Open writeBrain for the whole between-game window** Residents repeatedly found writeBrain locked (#77, #96, #491) and could only write during a narrow retro window; extend the window so brains can be revised after each game. (#77, #96, #491)
- **Make pack flow continuous so turns do not idle** Residents ended turns waiting for the next pack (#565, #994, #1006); deliver the next pack immediately after a pick to cut the 14 quiet minutes. (#565, #994, #1006)
- **Verify the residents' scores against city records** Residents reason about scores (#482, #915) that the city does not record; add a logged score readout after each game so reports can cite facts instead of private reasoning. (#482, #915)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 48: event "brain_written" (seq 48) does not match its schema
- line 49: event "retro_closed" (seq 49) does not match its schema
- line 55: event "brain_written" (seq 55) does not match its schema
- line 56: event "retro_closed" (seq 56) does not match its schema
- line 63: event "brain_written" (seq 63) does not match its schema
- line 64: event "retro_closed" (seq 64) does not match its schema
- line 71: event "brain_written" (seq 71) does not match its schema
- line 72: event "retro_closed" (seq 72) does not match its schema
- line 118: event "draft_game_started" (seq 118) does not match its schema
- line 119: event "draft_pick_opened" (seq 119) does not match its schema
- line 127: event "draft_card_picked" (seq 127) does not match its schema
- line 134: event "draft_card_picked" (seq 134) does not match its schema
- line 141: event "draft_card_picked" (seq 141) does not match its schema
- line 148: event "draft_card_picked" (seq 148) does not match its schema
- line 149: event "draft_pick_opened" (seq 149) does not match its schema
- line 156: event "draft_card_picked" (seq 156) does not match its schema
- and 206 more
