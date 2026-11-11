# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `liars-dice` |
| Seed | 71 |
| Start | fresh, level 1 |
| Competitors | `claude-opus-5-5` via anthropic, `claude-sonnet-5-5` via anthropic, `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 20 (referee) |
| Counted | events #5 to #2481 (2034 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 20 minutes (to the end); A02 on level 1 from minute 0 for 20 minutes (to the end); A03 on level 1 from minute 0 for 20 minutes (to the end); A04 on level 1 from minute 0 for 20 minutes (to the end) |
| Final standings | unknown |
| Cost | 1.071 USD for this run (competitors 1.071, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0045 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 21 of 21 minutes without a submission; longest without one: minutes 0-20 (21) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 5, TOOL_LOCKED 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 dominated by betting bids it could prove from its own dice** A01 repeatedly bid counts already satisfied by its hand plus wild 1s, e.g. 3 x 5 claimed as certain from 1,1,5 (#1453, #1466), and won game 1 without losing a die (#790). It won game 2 the same way (#1627) and built a large lead in game 3 (#2003, #2243). (#790, #1453, #1466, #1627, #2003, #2243)
- **A02 and A03 repeatedly called true bids and lost dice** A02 called liar on A01's 6 x 4 and 5 x 6 and lost dice both times (#231, #305), and A03's notes record that six of seven bids it called held (#785). A04 also lost die after die calling A03's held bids (#1003, #1086, #1169). (#231, #305, #785, #1003, #1086, #1169)
- **A01 made the one decisive successful liar call of game 3** A01 called A03's 3 x 6 after reasoning a 3 x 6 needed A03 to hold both 6s and a 1 (#2424); the table had only two sixes, so A03 lost a die (#2435). This left A01 with 3 dice against A03's 1 (#2435). (#2424, #2435)
- **Residents diagnosed the wild-1 rule mid-run and corrected themselves** A04 noted its match probability was 1/3 not 1/6 because ones are wild (#766), and A03 wrote in its retro that it had left out the wild ones in its early estimates (#750). A04's later note (#1566) separates its calls on near-50% bids from calls on held bids. (#750, #766, #1566)
- **Brain updates failed repeatedly at the word limit or when tools were locked** writeBrain was refused BRAIN_TOO_LONG five times (#1577, #1587, #1592, #1598, #1623) and TOOL_LOCKED three times (#714, #1522, #2257). A01 only saved version 3 after a first 154-word attempt was rejected (#1627). (#714, #1522, #1577, #1587, #1592, #1598, #1623, #1627, #2257)
- **A01 won all three games of the run** A01 reported winning game 1 with 3 points (#790) and game 2 without losing a die (#1627), and led game 3 into the final heads-up with 3 dice against A03's 1 (#2435). No other resident ended a game ahead of A01 in the logged reports. (#790, #1627, #2435)

## Problems

1. **Residents spent the whole run on level 1 and made no level submissions** All four residents were stuck on level 1 from minute 0 to the end (facts), and there were zero submissions with 21 quiet minutes. The dice games ran inside the level but nothing advanced, so no resident gained rank or points on the ladder. (#2481)
2. **Probability estimates were the main failure mode, not bluffing** Much reasoning is long binomial arithmetic, e.g. A03 summing tail probabilities for a 4 x 6 bid (#2139) and A04 computing 8-dice tails (#2024). Residents often called true bids because their estimate was close to even (#231, #305, #1003). (#231, #305, #1003, #2024, #2139)
3. **The brain word limit blocked retro learning** Five BRAIN_TOO_LONG refusals at 150 words (#1577, #1587, #1592, #1598, #1623) meant residents had to rewrite lessons mid-retro rather than record them. A02 finished game 3 unable to update its brain at all because writeBrain was locked (#2257, #2273). (#1577, #1587, #1592, #1598, #1623, #2257, #2273)
4. **Some residents misread the bidding state** A03 noted a standing bid of '1 x 2' as odd and questioned whether ones may be bid (#1445), and A04 thought A01's 5 x 2 had been 'overtaken' when it had actually held (#1998). A03 also treated a reveal line as something to set aside rather than read (#1837). (#1445, #1837, #1998)
5. **Idle turns produced filler reasoning** Many turns are 'not my turn, ending' with no action, e.g. #167, #393, #859, #1851. This burned tokens without changing the game, contributing to 1.071 USD cost for a run with no level progress. (#167, #393, #859, #1851)

## Optimizations

- **Make level 1 solvable within the run clock** All four residents never left level 1 over 20 minutes. Shorten the dice match format (fewer rounds, fewer games) or raise the time budget so at least one resident can clear the level and trigger level-ups. (#2481)
- **Cap reasoning length or supply a bid table** Residents lost turns to long binomial sums (#2139, #2024). Give a precomputed table of P(at least N matches | unseen dice, wild ones) or a short reasoning budget so they can decide in one step. (#2024, #2139)
- **Allow brain edits up to a larger limit or auto-trim** Five BRAIN_TOO_LONG refusals (#1577, #1587, #1592, #1598, #1623) interrupted retro learning. Raise the limit or have the harness summarize over-limit brains automatically, and open the retro window before the next game starts. (#1577, #1587, #1592, #1598, #1623)
- **Show the current standing bid prominently in the turn prompt** A03 misread the standing bid as '1 x 2' (#1445) and A04 misread whether A01's bid had held (#1998). Include an explicit bid-history line and reveal summary in every turn prompt. (#1445, #1998)
- **Suppress turns where the resident has no legal action** Many turns were spent saying 'not my turn' (#167, #393, #859, #1851). Skip the model call when the resident has no move, cutting cost and noisy reasoning. (#167, #393, #859, #1851)

## Loophole candidates

1. **Guaranteed self-supported bids are a safe, dominant path** (residents) A01 repeatedly opened or raised at a count its own dice plus wild 1s already satisfied, e.g. 2 x 6 from its 6 and 1 (#1184, #1203) and 3 x 5 from 1,1,5 (#1466). This forces opponents to raise above a certain bid, and A01 won every game this way (#790, #1627). (#790, #1184, #1203, #1466, #1627)
2. **A04 used certain one-die openings to force raises while holding one die** (residents) With a single die A04 opened at 1 x 3 or 2 x 4 knowing it was certainly true (#1161, #1179, #1755, #1765). That makes opponents answer a guaranteed bid and risks their dice rather than A04's, though A04 still lost these rounds (#1086, #1169). (#1086, #1161, #1169, #1179, #1755, #1765)

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
- line 108: event "dice_game_started" (seq 108) does not match its schema
- line 109: event "dice_rolled" (seq 109) does not match its schema
- line 110: event "dice_round_started" (seq 110) does not match its schema
- line 120: event "dice_decision_scored" (seq 120) does not match its schema
- line 121: event "dice_bid" (seq 121) does not match its schema
- line 136: event "dice_decision_scored" (seq 136) does not match its schema
- line 137: event "dice_bid" (seq 137) does not match its schema
- line 145: event "dice_decision_scored" (seq 145) does not match its schema
- and 427 more
