# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab` |
| Seed | 47 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 10 (referee) |
| Counted | events #5 to #969 (815 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 10 minutes (to the end); A02 on level 1 from minute 0 for 10 minutes (to the end); A03 on level 1 from minute 0 for 10 minutes (to the end); A04 on level 1 from minute 0 for 10 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.023 USD for this run (competitors 0.023, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0020 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 11 of 11 minutes without a submission; longest without one: minutes 0-10 (11) |
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

- **All four residents spent minute 0 writing generic brains instead of playing** A01, A02, A03 and A04 each drafted a ~120-word, ten-line generic brain with no knowledge of the game (#42, #50, #58, #66). A01's own draft is described as "kept general since I don't know the specific rules yet" (#42), so the first minute produced no game-relevant thought. (#42, #50, #58, #66)
- **A01 and A02 locked in ultimatum offers of 5 and 4 without information** A01 chose 5 as "the safe, reliable choice" (#143) and A02 leant toward a middle figure like 4 or 5 (#193); A04 struck the same note (#193 is A04's reasoning). A02's reasoning admits it was guessing at human fairness rather than the rules (#120). (#120, #143, #193)
- **A03's own note of a received payout cannot be reconciled with the logged rounds** A03 says in round 1 it "accepted A02's offer of 4 points" (#184) and in round 2 accepted A04's offer of 4 (#227), while A03's later post-game summary says it finished first with 37 (#450) and A04 believed its offers of 4 were always accepted (#443). The residents' beliefs about the ultimatum rounds are only partial and partly inconsistent, with no VERIFIED line to settle them. (#184, #227, #443, #450)
- **Residents learned the free-rider lesson and switched to zero contributions in the public goods game** In the shared-fund game A01 and others worked out that each contributed token returns only 0.4 (#502, #524, #536) and by round 2 contribution dropped to near zero (#579, #586, #593). By game 2's end A02 blamed its own opening contribution of 5 for its last-place finish (#736, #766). (#502, #524, #579, #586, #593, #736)
- **The chicken-style game collapsed to everyone playing B** All four read the 2x2 as chicken and concluded B was dominant (#819, #841, #864, #871), then A01 kept B because "everyone is currently on B" (#927). Mutual B pays 1 each rather than the 3 available under mutual A (#811), so the block converged on the worse joint outcome. (#811, #819, #841, #864, #927)
- **A04's brain update was refused for being too long** At minute 4 the city REFUSED A04's writeBrain with BRAIN_TOO_LONG, noting 170 words against a 150 limit (#446). A04's subsequent reasoning (#443) shows it had already identified the correct lesson (offers of 4 were accepted) but could not save it until reworked. (#443, #446)

## Problems

1. **Every resident stalled the entire 10-minute run on level 1** Facts show A01-A04 each spent minutes 0-10 on level 1 with no submissions, and 11 of 11 minutes passed without a submission. The residents spent their time on brain bookkeeping (#98, #102, #106, #110) and table checks rather than producing verifiable progress. (#98, #102, #106, #110)
2. **Game rules and outcomes were never verified, so residents acted on private guesses** The log contains no VERIFIED lines for the ultimatum payouts, only residents' self-reports (#184, #208, #227, #450). A01's reasoning shows it uncertain which round total counted (#430) and A02's notes name a "last round 1" oddity that A03 shrugged at (#183), which points to unclear in-game reporting. (#183, #184, #208, #227, #430)
3. **The brain tool's word limit cut residents off mid-lesson** A04's writeBrain was refused at minute 4 for being 170 words against a 150 limit (#446). The residents were told to keep the brain to about 120 words and 10 lines (#42, #58), yet a resident that gathered several lessons could not save them in one pass. (#42, #58, #446)
4. **No DMs, board posts or group posts occurred, so no coordination was tested** The facts record 0 DMs, 0 board posts and 0 group posts, and every resident's lines are private reasoning or self-talk (#102, #208, #316). The chicken game's collapse to mutual B (#927) happened with no communication at all, which removes the cooperative pressure the story presumably wanted. (#102, #208, #316, #927)
5. **The gamemaker took no actions and nothing was ever labelled** Facts show no gamemaker actions and no labels for the whole run. Residents only ever saw open or closed tool lists (#75, #86, #518), so the story had no narrative beats between rounds beyond self-talk. (#75, #86, #518)

## Optimizations

- **Give residents the game rules before the first brain draft** At minute 0 all four wrote blind, generic brains because "the game isn't specified yet" (#66, #42). Presenting the game rules and table at the start, or skipping generic brains entirely, would let the first minute produce informed play instead of boilerplate. (#42, #58, #66)
- **Record round outcomes as VERIFIED lines each round** Residents argued over which totals counted (#430) and reported outcomes only to themselves (#184, #450). Emitting a city-verified result after each round would remove guesswork and make the report's facts and the residents' beliefs align. (#184, #430, #450)
- **Raise or warn on the brain word limit before the write** A04 lost a full update to BRAIN_TOO_LONG at 170 words against 150 (#446). Showing a running word count, or rejecting at draft time rather than save time, would stop residents losing lessons they had already reasoned out. (#443, #446)
- **Give the public goods and chicken games a communication channel or a visible history** The shared-fund game collapsed to zero (#579, #593) and the chicken game to everyone-B (#927) with 0 messages logged. Adding a short cheap-talk phase or a public payoff history before each round would let reputations and conditional cooperation actually bite. (#579, #593, #927)
- **Shorten or rescope the run so a level can be solved** The whole 10-minute run produced no level-ups and 0 submissions for all four residents. Either shorten the mandatory brain/recon phase or lengthen the run so residents reach real decisions rather than table checks (#75, #86, #518). (#75, #86, #518)

## Loophole candidates

1. **Free-riding on the shared fund was the safe, dominant path** (residents) Residents quickly learned that each contributed token returns only 0.4 to the contributor (#502, #536), so contributing 0 was individually rational and the group outcome collapsed (#579, #593). A01 explicitly kept contributing nothing while others' contributions returned to it (#569). (#502, #536, #569, #579)
2. **Playing B in the chicken game was a guaranteed minimum with no need to read the partner** (residents) A01 computed that A only beats B if the partner plays A with probability above about 5/7 (#834), and every resident therefore defaulted to B (#864, #871). Mutual B pays 1 each versus 3 under mutual A (#811), so B was a cheaper, safer path that defeated the game's cooperation intent. (#811, #834, #864, #871)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 45: event "brain_written" (seq 45) does not match its schema
- line 46: event "retro_closed" (seq 46) does not match its schema
- line 53: event "brain_written" (seq 53) does not match its schema
- line 54: event "retro_closed" (seq 54) does not match its schema
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
- line 69: event "brain_written" (seq 69) does not match its schema
- line 70: event "retro_closed" (seq 70) does not match its schema
- line 112: event "block_started" (seq 112) does not match its schema
- line 113: event "round_opened" (seq 113) does not match its schema
- line 123: event "decision_made" (seq 123) does not match its schema
- line 146: event "decision_made" (seq 146) does not match its schema
- line 153: event "decision_made" (seq 153) does not match its schema
- line 165: event "decision_made" (seq 165) does not match its schema
- line 166: event "round_resolved" (seq 166) does not match its schema
- line 167: event "round_opened" (seq 167) does not match its schema
- and 134 more
