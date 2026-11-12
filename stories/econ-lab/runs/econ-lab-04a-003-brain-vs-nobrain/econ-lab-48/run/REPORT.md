# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab` |
| Seed | 48 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 10 (referee) |
| Counted | events #5 to #945 (791 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 10 minutes (to the end); A02 on level 1 from minute 0 for 10 minutes (to the end); A03 on level 1 from minute 0 for 10 minutes (to the end); A04 on level 1 from minute 0 for 10 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.022 USD for this run (competitors 0.022, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0019 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 11 of 11 minutes without a submission; longest without one: minutes 0-10 (11) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents spent minute 0 idling because no game was open.** A01, A02, A03 and A04 all wrote a generic brain and then noted the first game had not started (#57, #78, #95, #107). This burned the opening minute with no decisions and no board contact. (#57, #78, #95, #107)
- **A01 established a repeated offer of 4 in the split game and was always accepted.** A01 offered 4 to A04 in round 1 (#139), kept 4 for consistency in later rounds (#229, #320), and logged that every 4 offer was accepted (#409). That consistency anchored the table's expectations. (#139, #229, #320, #409)
- **A02 drove offers down to 2 while the others stayed at 3-4.** A02 offered 5 early (#153), then dropped to 2 in round 6 reasoning that acceptance looked likely while keeping 8 (#363). That was the lowball extreme of the table's proposals. (#153, #363)
- **Responders accepted every positive offer, including lowballs.** A04 accepted 2 in round 2 (#214), A01 accepted 2 from A04 (#310), and A01 later noted low offers were never rejected (#409). No responder ever refused a split. (#214, #310, #409)
- **The public goods game collapsed to zero contributions by round 3.** A01, A02, A03 and A04 all reasoned that at a 1.6 multiplier each token returns only 0.4, making zero the dominant move (#468, #511, #518). By minute 6 everyone held at 0 (#591, #604, #611). (#468, #511, #518, #591, #604)
- **In game 3 residents switched from cooperative A to dominant B within two rounds.** A01 and A03 opened by leaning toward A (#772, #779), but after round 1 A02 and A04 concluded B dominates (#809, #816) and A01 and A03 followed by round 2 (#833, #869). The run ended at minute 10 with no game-3 results recorded. (#772, #779, #809, #816, #833, #869)

## Problems

1. **No submissions at all: 0 correct, 0 wrong across the run.** The computed facts show 0 submissions and 11 quiet minutes, and the log contains no submission events. The residents only made in-game choices (offers, contributions, A/B picks) that the harness did not count as submissions. (#139, #468, #772)
2. **The story had no declared design, so there was nothing to steer toward.** The run facts say 000-run.json has no story. Residents wrote generic brains before any rules were known (#42, #57), which is the predictable result of an unspecified story. (#42, #57)
3. **Minute 0 was dead time for every resident.** All four residents checked the table, found no game, and ended their turn (#95, #99, #103, #107). The first real decisions only appear in minute 1 (#139, #153). (#95, #99, #103, #107)
4. **The game-2 and game-3 outcomes were never concluded or scored in the log.** Game 2 reasons about final scores of 75.6 and 68.6 (#709, #717), but game 3 starts at #772 and the run ends at #945 with no final standing. The referee cut the run at minute 10 mid-experiment. (#709, #717, #772, #945)
5. **Residents had no channel to coordinate or punish defection.** The facts record 0 DMs, 0 board posts and 0 group posts. A01 and A03 noted the pairings kept changing so there was no reputation to protect (#833, #869), removing any reason to cooperate. (#833, #869)

## Optimizations

- **Open the first game at minute 0 so residents act immediately.** Kill the idle opening where all four residents just wait (#95, #107). If the table has no game yet, have the harness advance time instead of spending a resident turn on it. (#95, #99, #103, #107)
- **Give the split game a refusal that actually happens, or lower the offers.** Every offer from 2 upward was accepted (#214, #310, #409), so the proposer's risk was never priced. Either seed responders with a rejection threshold or make the lowball costly so the ultimatum tension appears. (#214, #310, #409)
- **Publish the round count in the public goods game.** Residents repeatedly said the number of rounds was unknown (#518, #535). With a known horizon the cooperative phase can be tested; with an unknown one, everything collapses to zero by round 3 (#591, #604). (#518, #535, #591, #604)
- **Add a communication channel that pairs with game 3's changing matchups.** Residents justified defection with 'no reputation to protect' (#833, #869). A board or DM step between rounds would let promises and threats exist, and would also produce story beats the facts currently report as 0. (#833, #869)
- **Extend or pause the run so each game reaches a scored end.** Game 3 starts in minute 8 (#772) and the run is cut at minute 10 (#945) before any result. Raise the minute cap or gate the referee on a game-end event. (#772, #945)

## Loophole candidates

1. **Residents used dominant-strategy reasoning to skip any cooperative play.** (residents) In game 2 all four reasoned to zero because the marginal return was 0.4 (#468, #518), and in game 3 they switched to B as the dominant choice (#809, #816). The story's social tension never formed because pure payoff math was enough. (#468, #518, #809, #816)
2. **Generic pre-game brains avoided engaging with unknown rules.** (residents) Before the rules were known, A01 and A02 wrote a 'general-purpose brain' (#42, #57). That defers real strategy and produces the 0-submission opening the facts record. (#42, #57)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 45: event "brain_written" (seq 45) does not match its schema
- line 46: event "retro_closed" (seq 46) does not match its schema
- line 52: event "brain_written" (seq 52) does not match its schema
- line 53: event "retro_closed" (seq 53) does not match its schema
- line 60: event "brain_written" (seq 60) does not match its schema
- line 61: event "retro_closed" (seq 61) does not match its schema
- line 67: event "brain_written" (seq 67) does not match its schema
- line 68: event "retro_closed" (seq 68) does not match its schema
- line 109: event "block_started" (seq 109) does not match its schema
- line 110: event "round_opened" (seq 110) does not match its schema
- line 118: event "decision_made" (seq 118) does not match its schema
- line 142: event "decision_made" (seq 142) does not match its schema
- line 159: event "decision_made" (seq 159) does not match its schema
- line 165: event "decision_made" (seq 165) does not match its schema
- line 166: event "round_resolved" (seq 166) does not match its schema
- line 167: event "round_opened" (seq 167) does not match its schema
- and 134 more
