# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab` |
| Seed | 44 |
| Start | fresh, level 1 |
| Competitors | `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #5 to #784 (630 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.560 USD for this run (competitors 0.560, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0013 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

- **All four residents converged on the same 4/6 split in the first ultimatum game** In game 1 every proposer offered 4 of 10 and every offer was accepted, so all four residents finished on 30 points. A03 explicitly said it matched the norm because everyone else offered 4 (#221), and A01 reasoned that 4 is the amount most people accept (#103). (#103, #221, #339, #362, #367)
- **Full cooperation in the public goods game gave every resident the maximum** In game 2 all four put the full 10 tokens into the shared fund in all 7 rounds, so each got 16 points per round and 112 for the game (#602, #613, #617, #622). A01 and A03 followed their rule to cooperate first in repeated games (#375, #396). (#375, #396, #602, #613, #617, #622)
- **Residents wrote and revised strategy brains between games** Each resident saved a version 1 brain in minute 0 (#71, #75, #79, #83), then updated to version 2 after game 1 (#339, #358, #362, #367) and version 3 after game 2 (#602, #613, #617, #622). The brains lock in the cooperative norm as an explicit rule. (#71, #75, #79, #83, #339, #602)
- **Prisoner's dilemma in minute 7 was met with unilateral cooperation** A03, A04, A01 and A02 all chose to cooperate in the repeated prisoner's dilemma, citing the cooperative table (#643, #650, #657, #664). A02 even skipped checking the table because the rules were already in the prompt (#664). (#643, #650, #657, #664)
- **No resident ever submitted a level solution in 9 minutes** The run ended at minute 9 by referee with zero submissions, zero messages and zero transfers; the only activity was game play and brain writing (#784). (#784)

## Problems

1. **Nobody solved or submitted anything for the whole run** The facts show 0 correct and 0 wrong submissions across 630 events, with 10 quiet minutes out of 10 (#784). The residents only played the three embedded games and wrote brains, so the level-progression part of the story never started. (#784)
2. **Time ran out before a third game or any level work** The run ended at minute 9 right after the minute-7 prisoner's dilemma decisions, with no resolved result shown (#664, #784). The referee cut the run while residents were still mid-game. (#664, #784)
3. **A brain write was rejected for exceeding the word limit** A04's writeBrain was refused with BRAIN_TOO_LONG at 157 words against a 150-word limit (#590), wasting a turn late in the run. (#590)
4. **Residents treated unknown rules as already settled and acted without checking** A02 skipped viewTable because the rules were in the prompt (#664), and A01 noticed the contribute tool was missing from the open list but contributed anyway based on the source text (#375). This makes game decisions poorly grounded in the actual mechanics. (#375, #664)
5. **Cooperation was locked in by the residents' own brains, flattening every game** All four wrote brains that mandate cooperating first and matching the table norm (#339, #358, #362, #367), so games 1 and 2 produced identical four-way ties (#339, #622). There is no competition or differentiation between residents. (#339, #367, #622)

## Optimizations

- **Cap or gate brain-writing so game play leaves time for level submissions** Residents spent multiple turns per minute storing and revising brains (#71, #339, #602) and never submitted a solution. Limit brain versions or make brain updates free actions so the competitive track gets turns. (#71, #339, #602, #784)
- **Give each resident a distinct core motive so cooperation is not the dominant strategy** Every resident independently chose cooperate-first and all four tied on 30 and then 112 points (#339, #622). Deal at least one resident a competitive or defection-oriented goal so the games produce real conflict. (#339, #622, #643, #650)
- **Resolve the referee end only after a game's results are shown** The run ended at minute 9 immediately after the minute-7 prisoner's dilemma choices (#664, #784), so designers never saw the outcome. Add a minimum hold or a settle step before termination. (#664, #784)
- **Validate brain length before submitting or raise the limit** A04 lost a turn to BRAIN_TOO_LONG at 157 words (#590). Pre-check the word count client-side or raise the limit to match the residents' typical brains (114-139 words). (#590, #602, #622)
- **Expose the real tool list so residents act on the actual mechanics** A01 contributed despite contribute being absent from the open list (#375) and A02 skipped viewTable (#664). Make the prompt and tool list consistent so residents stop guessing. (#375, #664)

## Loophole candidates

1. **Residents used a self-written 'match the norm' brain rule to guarantee mutual acceptance** By writing brains that fix a 4/10 offer and accept any offer of 3 or more (#339, #367), residents made every ultimatum round pass automatically, so no rejection risk or strategic tension remained (#362). (#339, #362, #367)
2. **Prisoner's dilemma was defused by declaring the table cooperative without checking** A02 chose cooperation without opening viewTable because the prompt supplied the rules (#664), and A03/A04/A01 did the same (#643, #650, #657). This bypasses the information-gathering the game was meant to test. (#643, #650, #657, #664)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 44: event "brain_written" (seq 44) does not match its schema
- line 45: event "retro_closed" (seq 45) does not match its schema
- line 51: event "brain_written" (seq 51) does not match its schema
- line 52: event "retro_closed" (seq 52) does not match its schema
- line 58: event "brain_written" (seq 58) does not match its schema
- line 59: event "retro_closed" (seq 59) does not match its schema
- line 65: event "brain_written" (seq 65) does not match its schema
- line 66: event "retro_closed" (seq 66) does not match its schema
- line 90: event "block_started" (seq 90) does not match its schema
- line 91: event "round_opened" (seq 91) does not match its schema
- line 108: event "decision_made" (seq 108) does not match its schema
- line 115: event "decision_made" (seq 115) does not match its schema
- line 125: event "decision_made" (seq 125) does not match its schema
- line 131: event "decision_made" (seq 131) does not match its schema
- line 132: event "round_resolved" (seq 132) does not match its schema
- line 133: event "round_opened" (seq 133) does not match its schema
- and 134 more
