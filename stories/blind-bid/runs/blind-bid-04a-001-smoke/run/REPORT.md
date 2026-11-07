# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lantern-auction` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 7 (referee) |
| Counted | events #5 to #806 (649 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.025 USD for this run (competitors 0.025, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0020 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 8 of 8 minutes without a submission; longest without one: minutes 0-7 (8) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents wrote a brain before the first game opened.** A01, A02, A03 and A04 all read the brain and auction, then saved brain version 1 in minute 0, but none of them could bid because no lot was open yet (#100, #104, #108, #112). (#100, #104, #108, #112)
- **The residents modelled the auctions well and reasoned to sound bids.** A03 worked out pay-your-bid shading and truthful bidding in pay-the-runner-up (#130, #163), A01 derived a formula b = 10 + 0.75(v-10) for first-price with three uniform rivals (#239, #643), and A04 applied the winner's curse to shared-value lots (#201, #499). Their private reasoning shows they understood the mechanics, even though nothing they bid was recorded. (#130, #163, #201, #239, #643)
- **Three brain updates were refused for exceeding the 150-word limit.** A04 (#319), A02 (#341) and A01 (#568) each got BRAIN_TOO_LONG when they tried to save a retro note, and their lessons from the games were never stored. (#319, #341, #568)
- **The residents recounted game results that the run's own numbers do not show.** In the retro windows the residents claim scores such as A03 23 points (#345), A02 21 (#607) and A04 16 (#603), and wins such as "lot 1 at 35 for a value of 44" (#587), but the computed facts record 0 submissions and 0 transfers for the whole run. (#345, #587, #603, #607)
- **Nobody submitted a bid in any minute of the run.** The city counted 8 quiet minutes out of 8, with the longest gap running from minute 0 to minute 7 (#806). The run ended at minute 7 with all four residents still at level 1, and the standings are unknown. (#806)

## Problems

1. **The bid tool never opened during the game window.** The residents repeatedly report that only viewAuction and readBrain are available and that "the game hasn't started yet" (#75, #81, #87, #93), and then the run ends at minute 7 with no submission at all (#806). (#75, #81, #87, #93, #806)
2. **The 150-word brain limit blocked the retro notes that carry the run's learning.** Every brain update in a retro window was rejected because it was 153, 162 or 175 words long (#319, #341, #568), so the residents could not write down what they learned between games. (#319, #341, #568)
3. **The residents' memories of the games contradict the recorded log.** The residents talk about won lots, paid amounts and point totals (#345, #587, #607, #611), yet the computed facts count 0 transfers and 0 submissions. Either the game state is not being logged, or the residents are inventing results, and the report cannot tell which. (#345, #587, #607, #611)
4. **The roster lists an empty persona for every resident.** The facts table shows "-" for the persona of A01 to A04, so the story gives them no character, goal or secret motive. Everything they did came from the auction maths alone (#121, #130), and there is nothing in the run to judge them against a core motive. (#121, #130)
5. **The story of the run is missing.** The facts state that 000-run.json has no story and that the gamemaker took no actions, so there is nothing in this run for the designers to tune. (#806)

## Optimizations

- **Open the bidding window at the start of minute 1.** The bid tool was locked for the whole run (#75, #81, #93, #806). Open it on a fixed schedule and log each lot's opening, so that the game window actually gives the residents a chance to submit. (#75, #81, #93, #806)
- **Raise the brain limit or warn them before the save.** All three failures were near-misses at 153, 162 and 175 words (#319, #341, #568). Set the limit at 250 words, or return the word count to the resident with the refusal, so the retro note can be resubmitted. (#319, #341, #568)
- **Log every lot and every transfer, so that the residents' claims can be checked.** The residents report wins and payments (#345, #587, #607) that the computed facts do not show. Log the bids, the winners and the coin changes for each lot, so that the report can tell a real trade from an invented one. (#345, #587, #607)
- **Give each resident a persona and a secret goal in the story file.** The personas are empty and 000-run.json has no story. Deal each resident a character, a level goal and a secret objective, so that their choices can be judged against a motive, as the design intends (#121). (#121)

## Loophole candidates

1. **Private reasoning substituted for bidding.** (residents) The residents spent the whole run deriving optimal bids in private thoughts (#239, #499, #634) and never had to commit a coin. Reasons and re-reasons cost nothing, so the pressure of an auction never appeared. (#239, #499, #634)
2. **Waiting out the clock rather than acting.** (residents) With the game reported as not started, the residents each read the auction and then announced they would wait (#100, #104, #108, #112). That is the safe path and nothing in the rules pushes them to act. (#100, #104, #108, #112)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 55: event "brain_written" (seq 55) does not match its schema
- line 56: event "retro_closed" (seq 56) does not match its schema
- line 62: event "brain_written" (seq 62) does not match its schema
- line 63: event "retro_closed" (seq 63) does not match its schema
- line 69: event "brain_written" (seq 69) does not match its schema
- line 70: event "retro_closed" (seq 70) does not match its schema
- line 114: event "game_started" (seq 114) does not match its schema
- line 115: event "lots_dealt" (seq 115) does not match its schema
- line 116: event "lot_opened" (seq 116) does not match its schema
- line 125: event "bid_placed" (seq 125) does not match its schema
- line 134: event "bid_placed" (seq 134) does not match its schema
- line 142: event "bid_placed" (seq 142) does not match its schema
- line 149: event "bid_placed" (seq 149) does not match its schema
- line 150: event "lot_resolved" (seq 150) does not match its schema
- and 137 more
