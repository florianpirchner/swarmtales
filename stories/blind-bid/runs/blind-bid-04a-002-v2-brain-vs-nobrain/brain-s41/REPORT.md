# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-07 |
| Story | `blind-bid-s41` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #5 to #1004 (811 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.030 USD for this run (competitors 0.030, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0023 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 10 of 10 minutes without a submission; longest without one: minutes 0-9 (10) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents spent minute 0 on a brain file and never saw a lot open** A01-A04 all read the brain file, wrote a first strategy version and noted the game had not started, so minute 0 produced no bidding at all (#36, #52, #60, #68, #106, #114). The writeBrain lock then closed the only creative tool before any lot was visible (#77, #83). (#36, #52, #60, #68, #77, #83, #106, #114)
- **Residents reverse-engineered the auction format and switched strategies between lots** Within minute 1 they moved from pay-your-bid reasoning (#123, #130) to a third-price reading (#154, #161, #168) and then to a shared-value reading (#185, #192, #199), and later to everyone-pays with pass as the answer (#230, #352). By minute 2 they were citing prior results to each other's reasoning, e.g. A02 recalling that the last winner bid 70 on a lot worth 77 (#293). (#123, #154, #185, #230, #293, #352)
- **Game 1 ended with a wide point spread that residents then reviewed out loud** A02 reported finishing game 1 on 63.75 against A01's 35.75, A03's 21.25 and A04's 14 (#407, #415, #419, #411). Each resident named the same lesson - bidding too low or too high - and rewrote the brain, which is the main visible narrative beat of the run. (#407, #411, #415, #419)
- **Two brain rewrites were rejected for exceeding the word limit** After game 2, A02 was refused at 153 words (#700) and A03 at 169 words (#714), both against a 150-word cap. A03 had earlier written to a self-imposed ~120-word target (#52, #60), so the cap only bit once experiences piled up. (#52, #60, #700, #714)
- **The run ended mid-game with no submission and no verified outcome** The referee stopped the run at minute 9 (#1004) while residents were still reasoning over the last lots, e.g. A02 was costing out the everyone-pays final lot (#995). The facts record zero submissions, zero transfers and no final standings. (#995, #1004)

## Problems

1. **No submission was ever counted, so the story's scoring loop never produced a result** The computed facts show 0 correct and 0 wrong submissions and no level solved, with every minute quiet from 0 to 9. Residents spent their turns reasoning and talking rather than filing bids that the harness counted, so the story's core loop is unobservable in the record. (#106, #114, #1004)
2. **The opening phase wasted the only open writing turn on an empty auction** All four wrote a brain at minute 0 before any lot existed (#52, #60, #68), and by then writeBrain was locked (#77, #83), so the first brain versions were pure guesswork. The lock then removed the residents' only creative action for the rest of minute 0. (#52, #60, #68, #77, #83)
3. **Residents disagreed about the auction rules and each played a different game** In the same lot window A01 priced pay-your-bid (#130), A02 priced third-price (#154), A03 priced third-price (#168) and A04 priced pay-your-bid (#175); minutes later all four reasoned again about everyone-pays (#230, #352). If the rule is fixed, at least three of them were solving the wrong problem before any scoring feedback arrived. (#130, #154, #168, #175, #230, #352)
4. **BRAIN_TOO_LONG errors gave no visible path to a compliant edit** A02 (#700) and A03 (#714) were refused for length after game 2, but the log shows no retry, so those two finished the run on their game-1 brain content. The refusal records only a word count, not which lines to cut. (#700, #714)
5. **The gamemaker took no actions and the run had no story file** The facts record no gamemaker actions, unknown gamemaker and classifier, and no story in 000-run.json. The residents were therefore competing inside an auction whose narration or constraints never appeared in the log. (#1004)

## Optimizations

- **Open the first lot before or with the first brain write** The minute-0 brain writes were blind (#52, #60, #68) because no lot existed yet. Let residents see one lot's rules and values before writeBrain locks, so the first brain reflects the actual mechanic. (#52, #60, #68, #83)
- **Show the auction rule per lot in the same message as the values** Residents split into pay-your-bid, third-price and everyone-pays interpretations within one lot window (#130, #154, #168, #175). Print the rule name explicitly with each lot so reasoning tests strategy, not rule guessing. (#130, #154, #168, #175)
- **Return a diff-suggestion on BRAIN_TOO_LONG** Two refusals ended brain updates for the run (#700, #714). Have the refusal say which lines to drop or auto-trim to the cap so the resident keeps its lessons. (#700, #714)
- **Make every minute have at least one counted submission or an explicit pass** The facts show 10 of 10 minutes quiet and zero submissions (#1004). Force a bid-or-pass record per lot so the log shows a decision instead of only private reasoning. (#1004)
- **Give the gamemaker at least one scripted beat** No gamemaker actions are recorded for a 9-minute run. A scheduled narration or a mid-run rule change would give the digest something to anchor on and give residents a reason to adapt. (#1004)

## Loophole candidates

1. **Passing on everyone-pays lots as a free opt-out** (residents) Residents repeatedly concluded that in an everyone-pays lot the only safe move is to bid nothing (#230, #352, #673, #854, #868). That removes the auction's tension for one lot type: everyone can sit out at no cost, so that lot carries no competition. (#230, #352, #673, #854, #868)

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
- line 116: event "game_started" (seq 116) does not match its schema
- line 117: event "lots_dealt" (seq 117) does not match its schema
- line 118: event "lot_opened" (seq 118) does not match its schema
- line 126: event "bid_placed" (seq 126) does not match its schema
- line 133: event "bid_placed" (seq 133) does not match its schema
- line 140: event "bid_placed" (seq 140) does not match its schema
- line 147: event "bid_placed" (seq 147) does not match its schema
- line 148: event "lot_resolved" (seq 148) does not match its schema
- and 173 more
