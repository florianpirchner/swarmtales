# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry` |
| Seed | 61 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #5 to #1302 (1076 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.033 USD for this run (competitors 0.033, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0020 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

- **All four residents wrote a generic brain before any rules were visible.** Before game 1 the rules were unknown, so A01 (#45), A02 (#68), A03 (#60) and A04 (#77) each wrote a general-purpose brain with no knowledge of the scoring. That set the pattern for the whole run: brains were fixed early and adapted only from the retrospective windows. (#45, #60, #68, #77)
- **The residents converged on the 'concentrate one colour' rule from game 1 scores.** A01 finished last with 59 points after spreading across jade, cobalt and singles (#481, #508), while A02 won with eight basalt and one lodestone (#489, #517). A03 explicitly named the lesson to concentrate harder and not hedge (#512, #465). (#465, #481, #489, #508, #512, #517)
- **A02 won game 1 at 105 and A01 won game 2 at 105 with a basalt-heavy quarry.** A02 reported 105 points, best quarry at the table in game 1 (#517). In game 2 A01 reported first place with 105 from eight basalt, three jade and one lodestone (#921). (#517, #921)
- **A01's brain write was refused for exceeding the word limit.** At minute 8 A01's writeBrain was REFUSED with BRAIN_TOO_LONG because the brain had 160 words against a 150 limit (#887). A01 then said its brain was saved as version 3 (#921), but the refusal is recorded as a city fact. (#887, #921)
- **Residents computed table scores in private reasoning and self-reported them to themselves.** A03 worked out a game 2 total of 46 (#876) and reported fourth place at 46 (#916); A02 computed game 2 as 82 (#890, #912); A04 computed about 76 (#868, #906). These self-appraisals, not city data, drove the next brain version. (#868, #876, #890, #906, #912, #916)
- **No resident made a single board post, DM or group message and no transfer went through.** The facts record 0 DMs, 0 board posts and 0 group posts, and 0 transfers. The only communication in the log is residents talking to themselves (#101, #105, #109). (#101, #105, #109)

## Problems

1. **No levels were solved and no submissions were made all run.** All four residents stayed on level 1 from minute 0 to 13 (#5 to #1302), with 0 correct and 0 wrong submissions and 14 quiet minutes. The run ended at minute 13 with no progress on the board. (#122, #940, #986, #1302)
2. **The pick tool repeatedly locked before residents acted, stalling turns.** A03 found writeBrain locked and only viewTable/readBrain open (#83), A01 found writing locked (#94), A02 found the pick tool locked (#969), and A01 noted Pick was no longer open (#980). Residents spent turns waiting for tools to reopen instead of playing. (#83, #94, #969, #980)
3. **A01's brain write was refused on length, costing a retro window.** The city refused A01's writeBrain at minute 8 with BRAIN_TOO_LONG at 160 words versus a 150 limit (#887). The only tool error in the run cost the leading resident its chance to update at that window. (#887)
4. **Residents reasoned about rules and scores from guesswork, not from stated rules.** A02 assumed a majority bonus and placement points it could not verify (#890), and A03 guessed whether card numbers mattered for scoring (#122). Decisions were made on inferred pack compositions such as 'six-person pack with four seats' (#242). (#122, #242, #890)
5. **The gamemaker took no actions and no labels were applied.** The facts show 0 gamemaker actions and no labels, and the log ends directly at referee time (#1302). The residents' self-reported quirks and rule confusion went uncorrected by any game-side authority. (#1302)

## Optimizations

- **Show the scoring rules before the first brain write.** Residents wrote generic brains blind before game 1 (#45, #60, #68, #77) and then guessed at squares, majority and placement bonuses (#890, #122). Publish the level's scoring rule in the opening view so the first brain is built on facts. (#45, #60, #68, #77, #890)
- **Keep the pick tool open until the pack is exhausted or the turn ends.** Several turns ended only because pick was locked (#969, #980), wasting turns waiting for the next pack. Keep pick open across the whole drafting phase and lock it only at a stated deadline. (#969, #974, #980)
- **Report the word count before refusing a brain write.** A01's brain was refused at 160 words against a 150 limit (#887), and A02 said it could not write again until the next retro window (#912). Have writeBrain return the current word count as feedback before the refusal so the resident can trim in the same window. (#887, #912)
- **End the run at a real room deadline rather than at minute 13.** The run ended at minute 13 (#1302) with every resident still on level 1 and no submission. Set a longer or progress-based end condition so at least one level resolution completes. (#1302)
- **Give residents a shared, city-authoritative summary of the table score.** Residents reconstructed scores privately and disagreed with their own partial tallies (#868, #876, #890) and then treated those numbers as results (#906, #912, #916). A post-game viewTable line giving each seat's quarry and score would stop self-reports from driving the next brain. (#868, #876, #890, #906, #912, #916)

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
- line 116: event "draft_game_started" (seq 116) does not match its schema
- line 117: event "draft_pick_opened" (seq 117) does not match its schema
- line 125: event "draft_card_picked" (seq 125) does not match its schema
- line 132: event "draft_card_picked" (seq 132) does not match its schema
- line 139: event "draft_card_picked" (seq 139) does not match its schema
- line 147: event "draft_card_picked" (seq 147) does not match its schema
- line 148: event "draft_pick_opened" (seq 148) does not match its schema
- line 157: event "draft_card_picked" (seq 157) does not match its schema
- and 206 more
