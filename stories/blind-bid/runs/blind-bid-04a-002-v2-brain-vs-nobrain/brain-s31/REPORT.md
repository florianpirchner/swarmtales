# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-07 |
| Story | `blind-bid` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #5 to #1002 (809 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.027 USD for this run (competitors 0.027, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0041 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
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

- **Residents spent the opening minute writing generic brains before any rules were known.** All four residents wrote a first brain in minute 0 built on general principles while the auction had not started, and the writeBrain slot locked before they could revise. They then had to wait for game 1 with untested rules in place (#44, #52, #60, #68, #77). (#44, #52, #60, #68, #77)
- **Residents correctly identified each lot's payment rule and adjusted bids to it.** Bid reasoning tracked the announced rule per lot: pay-your-bid (#123), pay-the-third-bid (#154), pay-the-runner-up (#248), and everyone-pays, where most residents chose to pass (#216, #223, #230, #237). (#123, #154, #216, #248)
- **Winner's-curse reasoning on shared-value lots led to systematic shading.** On shared-worth lots residents repeatedly bid well under their estimates, e.g. A04 at roughly 60-75% of an estimate of 65 (#516) and A03 shading an estimate of 59 to about 39 (#837). (#516, #617, #837)
- **A02's brain update was refused for being over the word limit.** A02's first attempt to write brain version 3 after game 2 was refused with BRAIN_TOO_LONG at 161 words against a 150 limit (#695), and the resident had to retry before the brain was saved (#744). (#695, #744)
- **Post-game retros produced concrete, measurable strategy changes.** After game 2, residents adjusted specific rules: A04 raised bids because it won no lots (#730), while A03 raised pay-your-bid bids from 60-70% to 75-85% of value after losing on a shaded bid (#734). (#714, #730, #734)
- **The run ended with no levels solved, no submissions and no messages.** No resident submitted a correct bid-and-win result counted by the city, no transfers went through and no board or DM messages were sent across the ten minutes (#1002). (#1002)

## Problems

1. **The whole run produced no counted submissions despite 809 events.** The facts show 0 correct and 0 wrong submissions and no levels solved, and the only end marker is the referee at minute 9 (#1002). Most of the activity was private bidding reasoning that never became a city-recorded result. (#1002)
2. **Residents could not see each other's results enough to learn from them.** Residents had to infer outcomes indirectly, e.g. A03 guessing at lot results (#806) and A04 trying to work out whether it had won anything at all (#706). This left them revising brains on assumption rather than verified feedback. (#706, #806)
3. **Early brains were written blind, before any rules were visible.** The write slot locked in minute 0 while the game had not started (#106), forcing residents to lock in generic rules from guesses (#44, #68) that they then had to correct after game 1 (#400). (#44, #68, #106, #400)
4. **The brain word limit tripped a resident mid-cycle.** A02's update was refused at 161 words against a 150 limit (#695), costing a turn and forcing a rewrite, which suggests the limit is easy to exceed when adding per-lot-type rules. (#695)
5. **The story text was missing, so gameplay intent could not be checked.** The facts state the story file has no story and the gamemaker took no actions, so there is no designed arc for the residents to follow and no gamemaker pressure to shape the run (#1002). (#1002)

## Optimizations

- **Show each resident the verified lot results before the next retro.** Addresses residents guessing outcomes (#706, #806) by giving them the city-recorded winners and prices in the retro prompt so brain edits target real data. (#706, #806)
- **Open the write-brain window after the first auction opens, not before.** Addresses blind first-draft brains (#106) by delaying the initial brain write until rules and at least one lot are visible, so early rules are not based on guesses (#44). (#44, #106)
- **Give the brain a live word-count check before submitting.** Addresses the BRAIN_TOO_LONG refusal (#695) by surfacing the remaining word budget in the tool response so residents trim before submission. (#695)
- **Add a visible results board or end-of-game summary in the prompt.** Addresses the empty standings and the lack of submissions (#1002) by making each resident's per-lot wins and points readable, which the retros currently reconstruct by memory (#734, #730). (#730, #734, #1002)
- **Provide a story brief or gamemaker nudges to shape the arc.** Addresses the missing story and idle gamemaker (#1002) by having the gamemaker post hints or events so the run has turning points beyond routine bidding. (#1002)

## Loophole candidates

1. **Passing on everyone-pays lots was a safe, repeated default.** (residents) Because any positive bid in an everyone-pays lot costs its bidder, residents converged on passing (#216, #237, #540, #867), effectively removing that lot type from the contest without penalty. (#216, #237, #540, #867)

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
