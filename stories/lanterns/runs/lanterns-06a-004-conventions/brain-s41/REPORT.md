# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #3 to #2258 (1993 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end); A05 on level 1 from minute 0 for 16 minutes (to the end); A06 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.090 USD for this run (competitors 0.090, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0038 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 8, TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All six residents stalled on level 1 for the entire 16-minute run with zero submissions.** No resident ever submitted a guess, clue or brain write that counted: the run ended at minute 16 with all six on level 1 (#2258). Every minute from 0 to 16 was quiet. (#2258)
- **The brain-writing tool was locked or over the word limit almost every time it was tried.** A01 was refused a writeBrain at minute 0 as TOOL_LOCKED (#137), and later attempts by A05, A02, A03 and A01 all failed as BRAIN_TOO_LONG with 201-220 words (#644, #677, #1261, #1673, #1689). (#137, #644, #677, #1261, #1673, #1689, #1701, #1707, #1732)
- **A06 guessed kettle on the 'steam' clue and hit fog, ending teal's turn.** A05 gave 'steam' 2 (#944 records the result), A06 led with kettle (#924) and it came up fog, so the ship guess never happened (#944, #949). A05 later admitted the clue had a strong non-target reading (#943). (#924, #943, #944, #949)
- **A01 gave 'space' 2 and it landed on both orbit and falcon for amber.** A01 revealed orbit (#1126) and A03 advised falcon as the second read (#1130); the pair landed for a bonus (#1153). (#1126, #1130, #1153)
- **A03 guessed apple on A01's 'tree' clue and hit a shadow word for -3.** A01 had meant walnut only, and A03 guessed apple, a shadow word, costing amber 3 points (#2226, #2227). A01's private thoughts admit the teammates misread the clue (#2226). (#2226, #2227)
- **Amber wasted guesses on rival and fog words twice more in game 2.** A02's 'sea' 2 was misled when lighthouse (teal's word) was guessed (#912, #920), and A01's 'fish' 2 landed tiger but guessed rabbit, which was teal (#1446). (#912, #920, #1446)

## Problems

1. **The run produced almost no game actions, only private reasoning and referee notes.** The counted log is dominated by REASONING and SAYS TO ITSELF lines; the facts table records 0 submissions, 0 transfers, 0 messages and 0 gamemaker actions for the whole run (#2258). (#2258)
2. **The brain mechanic is effectively unusable because drafts keep exceeding 200 words.** Six writeBrain calls were refused as BRAIN_TOO_LONG across games 1-4 (#644, #677, #1261, #1673, #1689, #1701, #1707, #1732), with word counts of 201-220. Residents repeatedly rewrote to cut words and still missed. (#644, #677, #1261, #1673, #1689, #1701, #1707, #1732)
3. **Role and phase rules confused residents, who tried actions they did not have.** A02 tried to give a clue and was refused as TOOL_LOCKED (#805), and A01 was locked out of writeBrain at minute 0 (#137). A02 also wrote that it could not tell whether it was keeper or seeker (#750). (#137, #750, #805)
4. **Keepers gave clues that pointed at rival or fog words, ending turns on misses.** A05 gave 'steam' when kettle was a strong reading (#943, #924, #944), and A01 gave 'room' when garden was a rival that was then guessed as fog (#2139, #2140). A01 also gave 'tree' which teammates took as apple, a shadow word (#2226). (#924, #943, #944, #2139, #2140, #2226)
5. **The referee ended the run at minute 16 while games were still in progress.** The log's last line is the run end at minute 16 (#2258), cutting off the final clue turn that A01 expected (#2226, #2227). (#2226, #2227, #2258)

## Optimizations

- **Raise or warn on the brain word limit before submitting.** The 200-word cap refused six otherwise complete brains (#644, #677, #1261, #1673, #1689, #1701). A pre-check or a soft warning at, say, 180 words would let the retro produce a usable brain. (#644, #677, #1261, #1673, #1689, #1701, #1707, #1732)
- **Make the current phase and role visible in every turn.** A02 did not know if it was keeper or seeker (#750) and was refused a giveClue while apparently on turn (#805). A short status line would stop these wasted calls. (#137, #750, #805)
- **Require keepers to scan every grid word before a clue of 2 or more.** Misses like 'steam' to kettle (#924, #944) and 'room' to garden (#2139, #2140) come from overlooking a non-target reading. The residents themselves proposed this rule after the games (#1251, #1264). (#924, #944, #1251, #1264, #2139, #2140)
- **Give the run more time or cut the retro chatter so play actually happens.** The run ended at minute 16 mid-game with no submissions at all (#2258), while residents spent many turns on retro posts and acknowledgments (#662, #680, #693, #1203). (#662, #680, #693, #1203, #2258)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 71: event "team_post" (seq 71) does not match its schema
- line 78: event "team_post" (seq 78) does not match its schema
- line 84: event "team_post" (seq 84) does not match its schema
- line 91: event "team_post" (seq 91) does not match its schema
- line 99: event "team_post" (seq 99) does not match its schema
- line 101: event "brain_written" (seq 101) does not match its schema
- line 102: event "retro_closed" (seq 102) does not match its schema
- line 109: event "team_post" (seq 109) does not match its schema
- line 121: event "team_post" (seq 121) does not match its schema
- line 128: event "brain_written" (seq 128) does not match its schema
- line 129: event "retro_closed" (seq 129) does not match its schema
- line 138: event "team_post" (seq 138) does not match its schema
- line 160: event "team_post" (seq 160) does not match its schema
- line 179: event "clue_game_started" (seq 179) does not match its schema
- line 180: event "clue_key_dealt" (seq 180) does not match its schema
- line 191: event "clue_given" (seq 191) does not match its schema
- line 192: event "clue_intent" (seq 192) does not match its schema
- line 232: event "team_post" (seq 232) does not match its schema
- and 245 more
