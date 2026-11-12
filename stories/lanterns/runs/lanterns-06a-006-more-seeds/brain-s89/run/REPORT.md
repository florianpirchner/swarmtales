# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns` |
| Seed | 89 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 17 (referee) |
| Counted | events #3 to #2226 (1979 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 17 minutes (to the end); A02 on level 1 from minute 0 for 17 minutes (to the end); A03 on level 1 from minute 0 for 17 minutes (to the end); A04 on level 1 from minute 0 for 17 minutes (to the end); A05 on level 1 from minute 0 for 17 minutes (to the end); A06 on level 1 from minute 0 for 17 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.080 USD for this run (competitors 0.080, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0038 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 18 of 18 minutes without a submission; longest without one: minutes 0-17 (18) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 7, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01's single-word clues kept amber landing every clue in the early games.** A01 reasoned that "floor" would hit carpet and plank (#183, #192) and "tooth" would hit brush and gear (#300, #384); both clues landed (#225, #411, #419). This set the pattern for amber's high-scoring games. (#183, #192, #225, #300, #384, #411)
- **A06 repeatedly blew the 200-word brain limit and lost writing turns.** A06 tried to write the brain three times and was refused each time for BRAIN_TOO_LONG at 227, 204 words (#1074, #1096), and A03 was refused at 207 (#1117). A04 was refused four times later in the run at 274, 249, 230 words (#1743, #1780, #1800). (#1074, #1096, #1117, #1743, #1780, #1800)
- **A keeper's "greek" clue was misread by its own seekers.** A06 targeted torch and marble with "greek" 2 (#1555), but A04 advised marble then maze (#1536) and A05 guessed maze (#1569). Only marble landed teal (#1551), and A06 noted the seeker list was wrong (#1556). (#1536, #1551, #1555, #1556, #1569)
- **A04's "wood" 3 clue collapsed on the first guess.** A04 advised cabin and canoe (#883), and A06 guessed cabin first (#897), which came back fog (#954, #2082 context). The turn ended with teal words still hidden. (#883, #897, #954)
- **The team evolved a shared brain across four versions in retro windows.** Brain v1 was saved before game 1 (#149, #170), v2 after game 1 (#631, #650), v3 after game 2 (#1170, #1177) and v4 after game 3 (#1783, #1820). Each version added rules drawn from the previous game's mistakes. (#149, #170, #631, #650, #1170, #1177, #1783, #1820)
- **Amber won all three completed games and teal stalled late.** A01 reported amber winning game 1 at 11-5 (#645) and game 3 at 11-5 (#1773), and amber's clues all landed in game 2 (#1143). Teal finished game 3 with torch still hidden (#1666, #2193). (#645, #1143, #1666, #1773, #2193)

## Problems

1. **Six residents spent most turns waiting with no task.** Many reasoning lines end with "nothing to do this turn" because only the keeper or caller acts (#261, #299, #411, #1347, #1683). The run produced 0 submissions and 18 quiet minutes. (#261, #299, #411, #1347, #1683)
2. **The brain word limit was repeatedly violated by every would-be writer.** A06, A03 and A04 all wrote drafts over 200 words and were refused (#1074, #1117, #1743, #1800). The tool gives no warning before submission, so turns were wasted. (#1074, #1117, #1743, #1800)
3. **The giveClue tool locked at the wrong moment for A01.** A01 was refused giveClue with TOOL_LOCKED at minute 1 (#251) and then had to infer whose turn it was from the grid (#292, #299). This cost a clue turn. (#251, #292, #299)
4. **Keepers could not correct seekers during a game.** A06 knew the seeker list was wrong but could not post in team chat during play (#1555, #1556), and A04 could not warn that cabin was fog (#891, #892). Seekers acted on bad advice. (#891, #892, #1555, #1556)
5. **Retro windows were crowded with overlapping writers.** In one retro window A06, A03, A01 and A04 all attempted writeBrain in sequence (#1074, #1117, #1726, #1743), producing refusals and duplicated effort. The team had not settled on one writer. (#1074, #1117, #1726, #1743)

## Optimizations

- **Give every resident a standing advisory job so non-acting turns are not empty.** Most residents idled because only the keeper or caller had tools (#261, #411, #1347). Add a mandatory short advice post per turn for the non-calling seekers, which the story already treats as their role (#364, #1031). (#261, #364, #411, #1031, #1347)
- **Warn the writer before a brain exceeds 200 words.** Every writeBrain attempt failed on length (#1074, #1096, #1117, #1743, #1780, #1800). Have writeBrain return the word count and refuse only after showing the overage, or accept an auto-trim. (#1074, #1096, #1117, #1743, #1780, #1800)
- **Tell the resident whose turn it is instead of forcing inference from the grid.** A01 had to deduce turn order after TOOL_LOCKED (#251, #292). Show the current phase and active team in the turn prompt. (#251, #292, #299)
- **Let the keeper post one correction during a clue.** A06 saw a wrong seeker list but was silent (#1555, #1556), and A04 knew cabin was fog (#891). Allow the keeper a single one-word correction per clue. (#891, #892, #1555, #1556)
- **Assign one retro captain per window in the rules.** Multiple writers raced for writeBrain in one window (#1074, #1117, #1726, #1743). The brain should name the next captain, or the harness should designate one. (#1074, #1117, #1726, #1743)

## Loophole candidates

1. **Residents sent advice to the caller and effectively made the guess for them.** (residents) Seekers routinely named the exact word the caller then guessed, e.g. A03 advising leash then fang (#1993, #2021) and A06 advising broom for sweep (#2170, #2177). This routes the guess through chat rather than the caller's own read. (#1993, #2021, #2170, #2177)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 70: event "team_post" (seq 70) does not match its schema
- line 76: event "team_post" (seq 76) does not match its schema
- line 83: event "team_post" (seq 83) does not match its schema
- line 91: event "team_post" (seq 91) does not match its schema
- line 93: event "brain_written" (seq 93) does not match its schema
- line 94: event "retro_closed" (seq 94) does not match its schema
- line 101: event "team_post" (seq 101) does not match its schema
- line 108: event "team_post" (seq 108) does not match its schema
- line 129: event "team_post" (seq 129) does not match its schema
- line 136: event "brain_written" (seq 136) does not match its schema
- line 137: event "retro_closed" (seq 137) does not match its schema
- line 144: event "team_post" (seq 144) does not match its schema
- line 163: event "team_post" (seq 163) does not match its schema
- line 175: event "clue_game_started" (seq 175) does not match its schema
- line 176: event "clue_key_dealt" (seq 176) does not match its schema
- line 186: event "clue_given" (seq 186) does not match its schema
- line 187: event "clue_intent" (seq 187) does not match its schema
- line 195: event "team_post" (seq 195) does not match its schema
- and 227 more
