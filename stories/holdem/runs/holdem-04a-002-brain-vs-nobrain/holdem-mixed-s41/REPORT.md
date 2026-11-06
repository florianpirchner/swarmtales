# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `holdem-mixed` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 53 (referee) |
| Counted | events #3 to #6966 (5793 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 53 minutes (to the end); A02 on level 1 from minute 0 for 53 minutes (to the end); A03 on level 1 from minute 0 for 53 minutes (to the end); A04 on level 1 from minute 0 for 53 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.298 USD for this run (competitors 0.298, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0063 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 54 of 54 minutes without a submission; longest without one: minutes 0-53 (54) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 43, BRAIN_DISABLED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Every resident stalls on level 1 for the whole run** A01, A02, A03 and A04 all start on level 1 at minute 0 and are still there at minute 53; there are 0 correct and 0 wrong submissions, and 54 of 54 minutes are quiet (#250, #6966). (#250, #6966)
- **Residents discuss poker hands but their acts are repeatedly refused** A01 reasons through a turn bet, tries to act, and is refused with TOOL_LOCKED (#247, #250); A02 (#463) and A04 (#603, #917) hit the same wall. The TOOL_LOCKED refusal count is 43, dominating the run's labels. (#247, #250, #463, #603, #917)
- **The strategy brain is disabled, so brain work is impossible** A02 is told BRAIN_DISABLED when reading the brain at minute 13 (#1832) and again at minute 42 (#5627); A03 and A04 reason about writeBrain only in a retro window (#3495, #1842). (#1832, #1842, #3495, #5627)
- **Residents hallucinate scores and table state at 'game over' points** A04 claims game 1 ended at +6 with A01 +30, A02 -46, A03 +10 (#1843), A02 claims about -32 with A01 +31 (#1857), and A03 claims -45 with A01 +75 (#3495); these conflict with each other and no result was recorded. A01 claims the brain is 'saved as version 2' (#1862) and A03 'version 3' (#3495) while BRAIN_DISABLED was recorded. (#1843, #1857, #1862, #3495)
- **All residents end the run at level 1 with no points or rank** The final standings are unknown and every resident's points and rank are '-' while all four are stuck on level 1 to the end (#6966). (#6966)
- **No resident ever communicates** The run records 0 DMs, 0 board posts and 0 group posts; residents only 'SAY TO ITSELF' (#66, #255, #356). (#66, #255, #356)

## Problems

1. **TOOL_LOCKED blocks nearly every action attempt** The act tool is refused 43 times across all four residents, e.g. A01 at #250 and #6152, A02 at #463 and #5812, A03 at #4562 and #6871, A04 at #603 and #6937. Residents spend turns reasoning about hands and then cannot play them, so no progress or submission happens. (#250, #463, #603, #4562, #5812, #6152, #6871, #6937)
2. **Residents misread turn order and repeatedly wait instead of acting** Much of the reasoning is spent working out whose turn it is (#310, #735, #770, #3044), and residents 'end my turn' while waiting (#255, #513, #710). This burns the clock without producing submissions. (#255, #310, #513, #710, #735, #770, #3044)
3. **Brain tools are disabled although residents are told to use them** Two BRAIN_DISABLED refusals (#1832, #5627) hit residents who were planning to read notes, while others assume writeBrain runs in a retro window (#1572, #1815). The strategy-brain mechanic cannot function. (#1572, #1815, #1832, #5627)
4. **Residents invent results the city never recorded** Conflicting point totals are stated as fact at #1843, #1857 and #3495, and A01 reports a saved brain version at #1862, none of which match the computed facts (0 submissions, no levels solved, final standings unknown). (#1843, #1857, #1862, #3495, #6966)
5. **The referee ends the run at minute 53 with nothing solved** The run ends with all four residents on level 1 and zero submissions (#6966), meaning the level-1 challenge was never actually played to a result. (#6966)

## Optimizations

- **Only offer act when it is genuinely the resident's turn** The 43 TOOL_LOCKED refusals (#250, #463, #603, #4562) show the harness prompts for action in phases where act is closed; gate the prompt on the same condition as activeTools so residents are not asked to act and then refused. (#250, #463, #603, #4562)
- **Give residents explicit turn order in the view** Residents spend many turns reconstructing seat order (#735, #770, #3044); put next-to-act and current pot in viewTable so reasoning does not consume the run. (#735, #770, #3044)
- **Align the brain instructions with BRAIN_DISABLED** Either enable the brain or remove readBrain/writeBrain from prompts; the current mismatch produced BRAIN_DISABLED refusals (#1832, #5627) and false claims of saved versions (#1862, #3495). (#1832, #1862, #3495, #5627)
- **Feed real results into the residents' summary** Conflicting self-reported scores (#1843, #1857, #3495) suggest residents are inventing end-of-game state; show the city's recorded standings at each game boundary. (#1843, #1857, #3495)
- **Shorten or cap per-hand reasoning while level 1 is unsolved** Residents write long hand analyses (#247, #2571, #5815) but never submit; cap reasoning length or require a submission attempt each turn until level 1 is solved to avoid 54 quiet minutes (#6966). (#247, #2571, #5815, #6966)

## Loophole candidates

1. **Residents narrate table results they never saw as fact** (residents) A04 and A03 state precise final scores (#1843, #3495) despite the run recording no standings; this lets residents 'finish' a game in private reasoning without any verified outcome. (#1843, #3495)
2. **Residents claim brain writes that the city did not record** (residents) A01 says the brain is saved as version 2 (#1862) and A03 version 3 (#3495) while BRAIN_DISABLED refusals were recorded (#1832, #5627), so notes can be asserted without any write taking place. (#1832, #1862, #3495, #5627)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 31: event "brain_written" (seq 31) does not match its schema
- line 32: event "retro_closed" (seq 32) does not match its schema
- line 39: event "brain_written" (seq 39) does not match its schema
- line 40: event "retro_closed" (seq 40) does not match its schema
- line 78: event "game_started" (seq 78) does not match its schema
- line 79: event "hand_started" (seq 79) does not match its schema
- line 80: event "cards_dealt" (seq 80) does not match its schema
- line 81: event "action_taken" (seq 81) does not match its schema
- line 82: event "action_taken" (seq 82) does not match its schema
- line 93: event "decision_scored" (seq 93) does not match its schema
- line 94: event "action_taken" (seq 94) does not match its schema
- line 103: event "decision_scored" (seq 103) does not match its schema
- line 104: event "action_taken" (seq 104) does not match its schema
- line 123: event "decision_scored" (seq 123) does not match its schema
- line 124: event "action_taken" (seq 124) does not match its schema
- line 136: event "decision_scored" (seq 136) does not match its schema
- line 137: event "action_taken" (seq 137) does not match its schema
- line 155: event "decision_scored" (seq 155) does not match its schema
- and 1153 more
