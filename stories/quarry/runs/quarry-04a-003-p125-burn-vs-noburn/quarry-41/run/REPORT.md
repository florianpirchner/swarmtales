# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `quarry` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1300 (1087 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.037 USD for this run (competitors 0.037, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0024 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 10 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents burned the first twelve minutes inside drafting loops with no submission.** The run ended at minute 12 with zero correct submissions and every resident still on level 1; the quiet-minute tally is 13 of 13 minutes without one. Their whole visible activity is picking cards, scoring them in reasoning and re-reading the table, e.g. #119 and #126. (#119, #126, #1300)
- **Two residents misread the scoring as squared-count plus a +5 majority and built their whole plan on it.** A01 argued each resource scores as the square of its count and four cards are worth 16 (#126), A03 said the same about bunching one colour (#133). The computed facts show no levels solved, so nothing in the log verifies that rule model. (#126, #133)
- **A01 and A02 both talk about game 1 scores of 59, 79, 95 and 71 that never happen in this run.** A01 says it finished last with 59 while A03 scored 95 and A02 79 (#499); A02 says it scored 79 for second place while A03 reached 95 (#469). The computed facts record no levels solved and no standings, so these figures are residents' own accounting, not recorded results. (#469, #499)
- **The 150-word brain limit repeatedly refused strategy rewrites.** Ten BRAIN_TOO_LONG refusals were counted; A02 was refused for 176 words (#472) and again for 157 and 153 (#489, #524), A03 for 164 (#477), A04 for 164 (#483) and 169 (#879), and A03 again for 177 and 162 (#907, #921). These failures consumed the residents' early minutes before any picking. (#472, #477, #483, #489, #524, #879, #907, #921)
- **Residents spent long stretches planning burns of cards to deny rivals without ever doing it.** A01 weighed burning C3 to cut cobalt to A02 (#565), A03 weighed burning L2 to keep lodestone away (#789), and A01 weighed burning J1 to deny jade to A04 (#1145). The facts record zero transfers and no evidence a burn ever converted into a scored result. (#565, #789, #1145)
- **The city's own lockout message became the main driver of behaviour.** A02 reported that pick and writeBrain were locked until a game opens (#99), A04 said writeBrain was no longer open (#75), and by minute 11 A04 expected only viewTable and readBrain to be available (#1203). Residents reacted to tool locks rather than to a story or rules. (#75, #99, #1203)

## Problems

1. **Nobody submitted anything, so the level and competition mechanics never ran.** The run ended with 0 correct and 0 wrong submissions and all four residents stuck on level 1 for the full 12 minutes. Designers get no data on how seats compete because the run never reached a submission. (#5, #1300)
2. **The brain-writing constraint locked residents out of strategy for many minutes.** Ten BRAIN_TOO_LONG refusals (#472 through #921) show residents writing 153-181 words against a 150-word cap. They re-drafted instead of picking, which fits the empty message and transfer counts. (#472, #489, #524, #907, #921)
3. **Residents reasoned about scores, standings and won games that the facts do not record.** A04 reports a 71-point third place for game 1 (#518) and A01 reports 78 and second for game 2 (#915), yet the computed facts show no levels solved and unknown final standings. The residents' model of the world diverges from the recorded events. (#499, #518, #915)
4. **The rules were not communicated up front, pushing residents into guessing.** At minute 0 A02 and A01 both said they wanted to see the table to learn the rules before writing a brain (#20, #35), and A03 drafted general rules without knowing them (#51). The rules only arrived to residents as inferred scoring guesses (#119). (#20, #35, #51, #119)
5. **The gamemaker and classifier contributed nothing to the run.** The facts list no gamemaker actions, no labels, and the gamemaker cost is 0.000 USD. Any story beats the design expected from the gamemaker are missing from the log. (#5, #1300)
6. **Tool locks made the pick phases unreadable to residents.** A01 concluded pack 1 was over because pick was locked (#265), A02 wondered whether pick 5 was the end of game 2 (#434), and A04 inferred pack 2, pick 4 from the lock alone (#1203). Residents spent reasoning turns on guessing phase state rather than playing. (#265, #434, #1203)

## Optimizations

- **Expose the game rules to residents at minute 0.** Residents opened by asking for the rules (#20, #35) and drafted generic brains without them (#51). Ship a rules card in the prompt so picking starts immediately. (#20, #35, #51)
- **Validate brain length before submission and return the word count on the fly.** Ten BRAIN_TOO_LONG refusals cost many minutes (#472, #489, #524, #907, #921). A pre-check that reports 153 vs 150 lets the resident trim instead of restarting the draft. (#472, #489, #524, #907, #921)
- **Make phase state explicit instead of inferring it from tool locks.** A01 (#265), A02 (#434) and A04 (#1203) all guessed the phase from which tools were locked. A short status line (pack, pick, open tools) would stop these wasted turns. (#265, #434, #1203)
- **Give residents an authoritative score and standings readout each minute.** Residents quoted game scores of 59, 79, 71, 78 and 100 (#499, #518, #915) that the computed facts do not record. A city-published standings line would anchor their reasoning to real numbers. (#499, #518, #915)
- **Drive at least one submission through the referee before minute 12.** The run ended with 0 submissions and 13 quiet minutes (#1300, facts on quiet minutes). Shorten the drafting window and require a first submission or make a submission the opening action. (#1300)
- **Have the gamemaker inject at least one beat so the story has structure.** The facts record no gamemaker actions and 0.000 USD spent on the gamemaker. A scheduled beat (a rules reveal, a forced pick) would give the draft something to react to. (#5, #1300)

## Loophole candidates

1. **Residents used free burns as a no-cost denial tool without spending real resources.** (residents) A01 described burning C3 as cutting off cobalt to A02 at no point cost (#565), A03 weighed burning L2 for free (#789), and A03 considered burning the A1 amber purely to deny A02 (#1259). If burns are free, denial is the cheapest play and the pick economy loses tension. (#565, #789, #1259)
2. **Residents replaced uncertain picks with a generic 'safe fallback' colour.** (residents) A01 took jade J8 as a safe fallback without knowing the pack (#620), and A04 took a single jade J1 just to have board presence (#401). This avoids the risk of the intended drafting decision rather than playing it. (#401, #620)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 46: event "brain_written" (seq 46) does not match its schema
- line 47: event "retro_closed" (seq 47) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
- line 69: event "brain_written" (seq 69) does not match its schema
- line 70: event "retro_closed" (seq 70) does not match its schema
- line 113: event "draft_game_started" (seq 113) does not match its schema
- line 114: event "draft_pick_opened" (seq 114) does not match its schema
- line 122: event "draft_card_picked" (seq 122) does not match its schema
- line 129: event "draft_card_picked" (seq 129) does not match its schema
- line 136: event "draft_card_picked" (seq 136) does not match its schema
- line 143: event "draft_card_picked" (seq 143) does not match its schema
- line 144: event "draft_pick_opened" (seq 144) does not match its schema
- line 151: event "draft_card_picked" (seq 151) does not match its schema
- and 193 more
