# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-07 |
| Story | `blind-bid-s37` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #5 to #998 (805 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.029 USD for this run (competitors 0.029, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0024 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 10 of 10 minutes without a submission; longest without one: minutes 0-9 (10) |
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

- **All four residents opened with the same generic first brain before any rules existed** A01–A04 each wrote a first brain based on general principles (bid up to value, avoid overpaying) before seeing any auction rules (#34, #51, #59, #67). They then found writeBrain locked (#76, #82) and idled until the first lot. (#34, #51, #59, #67, #76, #82)
- **A03 opened strongest in the first game after shading shared-worth bids** A03 scored 13.75 in game 1 but fixed its approach and posted 85.5 in game 2, the best in the session (#401, #705, #714). The retro loop (write after each game, locked during play) is what carried A03 from last to first. (#401, #705, #714)
- **Residents passed on almost every all-pay lot** On all-pay lots A01, A02, A03 and A04 repeatedly reasoned that paying on a loss made bidding negative-EV and passed (#225, #525, #538, #545, #660, #667, #851, #858, #865, #968, #975, #989). That whole mechanism produced little action across games 1–3. (#225, #525, #538, #545, #660, #667, #858, #968)
- **Shared-worth lots were the only ones producing losses, and retros kept revising the shade** A01 paid 52 for a lot worth 52 (no surplus, #722) and A04 noted its 65% shading won nothing (#718). A02 moved its shade from 8–10 below estimate to 5 below after worth ran above its estimate (#736). (#718, #722, #736)
- **One tool error: A02's retro exceeded the 150-word brain limit** A02 attempted a writeBrain at minute 6 and the city refused it with BRAIN_TOO_LONG at 161 words (#694). A02 later saved version 3 at 137 words (#736). (#694, #736)
- **Zero submissions and zero board messages for the entire run** Across minutes 0–9 no resident made a correct or wrong submission and no DMs, board posts or group posts occurred; every intervention was private reasoning or a self-directed say (#100, #104, #108). The run's social layer was never exercised. (#100, #104, #108)

## Problems

1. **The whole run produced no winning move** The referee ended at minute 9 with no levels solved, no correct submissions and no standings, so the outcome is unreadable for tuning. Ten quiet minutes with no submission (#34–#998) means the report cannot say who won or why. (#998)
2. **Residents spent the first minutes writing brains with no rules in hand** All four wrote a 100–124-word brain before the auction opened, using guesses about 'general principles' (#34, #43, #51, #59). Then writeBrain locked and they had nothing to do until the first lot (#76, #82, #93). (#34, #43, #51, #76, #82, #93)
3. **The all-pay mechanism collapsed to near-universal passing** Residents reasoned correctly that every bid is paid whether or not you win, and passed nearly every all-pay lot (#225, #538, #660, #989). The mechanism intended to create tension instead produced dead lots and idle time. (#225, #538, #660, #989)
4. **Shared-worth lots caused mispriced wins because residents shaded inconsistently** A01 paid 62 for a lot worth 84 but 52 for a lot worth 52 (#722), and A04's 65% shading failed while A02 moved its shading to only 5 below estimate (#736). The winner's-curse handling was ad hoc and untuned. (#718, #722, #736)
5. **The brain-length limit tripped a resident on its own retro** A02's minute-6 retro was refused at 161 words against a 150 limit (#694), forcing a rewrite and delaying its lesson capture (#736). The limit was not visible in time to prevent the miss. (#694, #736)
6. **No social or gamemaker layer was active** There were 0 DMs, 0 board posts and no gamemaker actions, and every resident line was private reasoning or a say-to-itself (#100, #104). With no interaction, competition between residents was pure simultaneous bidding. (#100, #104, #108)

## Optimizations

- **Show a short rules-and-format briefing before the first brain write** Residents guessed at mechanisms (#34, #43) because no rules were available at minute 0. Publish the lot list and payment rules first so the first brain targets the real game. (#34, #43, #51)
- **Keep a harmless action open while writeBrain is locked** After the first brain, residents were limited to viewAuction/readBrain and idled (#76, #82, #93). Allow previewing upcoming lots or drafting notes so the locked window is not dead time. (#76, #82, #93)
- **Redesign or drop the all-pay lot** Every resident reasoned that bidding loses coins and passed (#225, #538, #660, #989). Replace it with a mechanism that has an interior bidding incentive, or seed it with a high value so someone bids. (#225, #538, #660, #989)
- **Give a visible shared-worth reference for bias and shading** Residents shaded shared-worth bids with ad hoc discounts, producing a zero-surplus win for A01 (#722) and a failed 65% shade for A04 (#718). Provide a common prior or calibrated guidance so shading differences reflect strategy, not noise. (#718, #722)
- **Surface the brain word limit with a running count** A02's retro was refused at 161 words (#694) and only saved later at 137 (#736). Show the count live so retros are not lost to a silent limit. (#694, #736)
- **Add a sub-goal or level progress tied to auctions, not only points** No levels were solved and no submissions were made in 10 quiet minutes (#998). If progression requires a bid or a lot win, the run cannot end in a stall with zero submissions. (#998)

## Loophole candidates

1. **Passing every all-pay lot is a costless way to avoid risk** (residents) Residents avoided the all-pay mechanism by passing, keeping their coins instead of risking a paid loss (#225, #989). That sidesteps the intended pressure of the all-pay lot without penalty. (#225, #989)
2. **Retro window lets residents rewrite strategy rather than learn in-run** (residents) Because writeBrain is locked during play and open after, residents carried a full rewrite between games (#401, #409, #714). This lets them patch strategy from public results rather than adapt mid-auction, which the story's live bidding intent may not have wanted. (#401, #409, #714)

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
- line 111: event "game_started" (seq 111) does not match its schema
- line 112: event "lots_dealt" (seq 112) does not match its schema
- line 113: event "lot_opened" (seq 113) does not match its schema
- line 121: event "bid_placed" (seq 121) does not match its schema
- line 128: event "bid_placed" (seq 128) does not match its schema
- line 135: event "bid_placed" (seq 135) does not match its schema
- line 142: event "bid_placed" (seq 142) does not match its schema
- line 143: event "lot_resolved" (seq 143) does not match its schema
- and 173 more
