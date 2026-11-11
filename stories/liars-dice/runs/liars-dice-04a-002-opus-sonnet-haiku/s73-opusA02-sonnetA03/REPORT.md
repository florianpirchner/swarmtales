# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `liars-dice` |
| Seed | 73 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic, `claude-opus-5-5` via anthropic, `claude-sonnet-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 24 (referee) |
| Counted | events #5 to #2939 (2414 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 24 minutes (to the end); A02 on level 1 from minute 0 for 24 minutes (to the end); A03 on level 1 from minute 0 for 24 minutes (to the end); A04 on level 1 from minute 0 for 24 minutes (to the end) |
| Final standings | unknown |
| Cost | 1.257 USD for this run (competitors 1.257, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0049 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 25 of 25 minutes without a submission; longest without one: minutes 0-24 (25) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 7, TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents opened by writing a brain before any game began, then found the tool locked.** A01, A02, A03 and A04 each wrote a version-1 strategy brain in minute 0 (#77, #81, #92, #96). Immediately afterwards writeBrain was no longer available, so the opening window was one-shot only (#71, #85). (#71, #77, #81, #85, #92, #96)
- **Game 1 was won by A02 while A01 burned three dice on failed liar calls on A04's sixes.** A04's 5x6 and 4x6 held against A01's calls, costing A01 dice (#243, #387). A02 knocked A01 out with a correct call on 3x5 (#700, #659), then won the game for 3 points (#1015). (#243, #387, #659, #700, #1015)
- **In game 2 A01 won heads-up by getting A02 to call true bids three times in a row.** A02 recorded that its last three calls on A01's 3x6, 2x2 and 1x6 all turned out to be true bids (#2050). A01 finished game 2 first with 3 points (#2035). (#2035, #2050)
- **The city counted the true dice each time and reported them, so every liar call was resolved by fact, not negotiation.** When A04 called on A03's 4x6, the tool reported a count of four sixes and A03 lost a die (#386). A01's call on A04's 4x5 produced a count of six fives with ones wild, and A01 lost (#1512). (#386, #1512)
- **Residents repeatedly miscounted the dice arithmetic in private, and those errors decided games.** A02 in game 1 estimated four sixes among twelve dice at roughly 0.607 probability (#1082), while other residents used a one-in-three wild rule (#1074, #1084). A01 in game 2 saw five sixes in its own hand and still put the chance of the bid holding at 0.9% (#1342), a misreading of the wild rule. (#1074, #1082, #1342)
- **A01 misread a bid quantity in game 3's endgame and lost the call outright.** A01 admitted it misread the bid as four fours when it was two, lost the call, and dropped a die (#2825). It conceded the 2x5 bid was true and that it should have counted A02's own dice (#2862). (#2825, #2862)

## Problems

1. **No resident ever leveled up and no level was ever solved.** All four residents stayed on level 1 for the full 24 minutes, and the computed facts record zero correct submissions (#2939). Levels, if any, played no part in the run. (#2939)
2. **The brain word limit produced a string of refusals that cost residents turns and minutes.** Seven BRAIN_TOO_LONG refusals hit A02, A03 and A04 across minutes 7 to 15 (#988, #995, #1992, #1998, #2011, #2025, #2042). A02 was one word over at 151 (#988), showing a limit that punishes near-misses with no feedback loop. (#988, #995, #1992, #1998, #2011, #2025, #2042)
3. **Two writeBrain attempts were refused as TOOL_LOCKED outside the retro window, wasting the residents' only tool call of the turn.** A03 tried to write its brain at minute 6 and was told the tool was locked (#833), and again at minute 18 (#2403). A04 and A01 both reasoned that writeBrain belongs to a 'retro captain' role that never applied to them (#1808, #2786). (#833, #1808, #2403, #2786)
4. **The city told residents nothing about the match structure, so they inferred rules and invented roles.** A02 invented a 'partner' and bridge-style suits in game 1 (#822, #1941). A01 and A02 debated whether bidding on ones is allowed and whether '1 x 2' means a quantity of one (#2591, #2707). (#822, #1941, #2591, #2707)
5. **The run had zero messages, zero transfers and no gamemaker actions, so there was no social layer at all.** The computed facts show 0 DMs, 0 board posts, 0 group posts and 0 transfers, and the gamemaker took no actions. Residents only spoke to themselves (e.g. #243, #1015), so the 'social game' had no observable social behaviour. (#243, #1015, #2035)
6. **Residents burned many turns on 'it's not my turn' endings between dice rounds.** Dozens of turns were spent simply waiting, e.g. #1095, #1157, #1169, #2128, #2330, #2707. This consumed model cost (1.257 USD) without producing any game progress. (#1095, #1157, #1169, #2128, #2330, #2707)

## Optimizations

- **Give the brain a live word counter or an automatic trim before the write, so near-misses do not eat a turn.** A02's write failed at 151 words against a 150 limit (#988) and A04's at 153 (#1998). A pre-write check that reports the count would turn these seven refusals (#988, #995, #1992, #1998, #2011, #2025, #2042) into successful writes. (#988, #995, #1992, #1998, #2011, #2025, #2042)
- **Expose the brain window explicitly in the turn text: open, close, or use now.** A03 tried writeBrain while it was locked and lost its action (#833, #2403). A short 'the brain window is closed until the game ends at minute X' would stop residents guessing and prevent the 'retro captain' invention (#1808, #2786). (#833, #1808, #2403, #2786)
- **Publish the reference count rule (ones wild, dice in play) in every turn, because residents kept recomputing it wrongly.** Residents used inconsistent probabilities for the same bid: A01 calculated a 0.9% chance for five sixes from nine unseen dice (#1342) while others treated each unseen die as one-in-three (#1074, #1082). A fixed reminder would remove whole-class arithmetic errors that decided games #1342, #2825. (#1074, #1082, #1342, #2825)
- **Add a real social channel between dice games, since the social layer is otherwise empty.** The facts show 0 messages and 0 transfers across the run, and residents only ever 'SAYS TO ITSELF' (#243, #1015). A short intermission board where residents can post a one-line takeaway would give the 'social game' something to observe. (#243, #1015)
- **Credit levels for dice-game wins or make a level a single dice game, since level 1 was never left.** All residents stayed at level 1 for 24 minutes with no submissions at all (#2939). If a level is one dice match, the run would have produced four level-ups; otherwise the level mechanic is dead weight in this story. (#2939)
- **Compress idle turns so a resident who is not up does not spend a full reasoning pass doing nothing.** Examples #1095, #1157, #2128 and #2707 are single-line wait turns. Batching the opponent's turns until the resident must act would cut cost (1.257 USD for 24 minutes) without changing play. (#1095, #1157, #2128, #2707)

## Loophole candidates

1. **Residents treated the private brain as a place to record opponents' tells and told themselves this was their edge.** A01 drafted brain notes recording that A04 bids heavily on sixes and those bids mostly held (#978). A04 planned notes on 'A01 bid many sixes and got called' and 'A03 called liar often and was right' (#1995), turning the brain into a collated scouting file that no other resident could read. (#978, #1995)
2. **Residents followed their own notes over the dice, calling on gut reads after the brain said the bid was true.** A03's brain-consistent reasoning still concluded with a call on a bid it rated about 45% (#2132, #2373). This uses the strategy note as cover for a coin-flip call rather than as evidence, which is exactly the habit the brain was supposed to prevent. (#2132, #2373)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 15: event "brain_written" (seq 15) does not match its schema
- line 16: event "retro_closed" (seq 16) does not match its schema
- line 46: event "brain_written" (seq 46) does not match its schema
- line 47: event "retro_closed" (seq 47) does not match its schema
- line 53: event "brain_written" (seq 53) does not match its schema
- line 54: event "retro_closed" (seq 54) does not match its schema
- line 65: event "brain_written" (seq 65) does not match its schema
- line 66: event "retro_closed" (seq 66) does not match its schema
- line 110: event "dice_game_started" (seq 110) does not match its schema
- line 111: event "dice_rolled" (seq 111) does not match its schema
- line 112: event "dice_round_started" (seq 112) does not match its schema
- line 121: event "dice_decision_scored" (seq 121) does not match its schema
- line 122: event "dice_bid" (seq 122) does not match its schema
- line 130: event "dice_decision_scored" (seq 130) does not match its schema
- line 131: event "dice_bid" (seq 131) does not match its schema
- line 140: event "dice_decision_scored" (seq 140) does not match its schema
- and 505 more
