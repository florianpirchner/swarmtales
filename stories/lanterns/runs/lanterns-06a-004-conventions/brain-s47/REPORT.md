# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns` |
| Seed | 47 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #3 to #2219 (1952 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end); A05 on level 1 from minute 0 for 16 minutes (to the end); A06 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.080 USD for this run (competitors 0.080, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0040 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 8 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The residents spent the opening minute agreeing on a team brain instead of playing.** A03, A04 and A05 all oriented by reading the grid and brain, and A04 saved brain version 1 at 156 words (#41, #94, #101, #143, #160). A01's own plan note describes keeping the team post to about 160 words and 13 lines (#83), so the first minutes went to setup talk before any clue. (#41, #83, #94, #101, #143, #160)
- **Amber's 'army' clue nearly died on A03's bad advice to guess a teal word.** A03 told A02 to read 'boot' first for 'army' 2 (#494), and A01 privately noted boot is teal and a hit would end the turn for teal (#500, #501). A02 followed the advice and boot came up teal (#505, #517), so the keeper's real targets olive and badge went unreached on that clue. (#494, #500, #501, #505, #517)
- **Teal's single-target clue style cost it a hidden word every game.** A06's retro reasoning notes teal used five singles for six words and left boot uncovered (#1228), and A05 repeats the same lesson (#1228). Game 2 ended with teal at 5 of 6 and boot still hidden (#1299, #1305), and game 3's 'sky' 2 was the only multi-target clue teal landed (#1960). (#1228, #1299, #1305, #1960)
- **Multi-target clues were the winning mechanic, and the residents learned it late.** Amber's 'silver' 2 landed moon and fox together (#1382, #1383), 'stag' 2 landed beetle and horn (#1537, #1541), 'needle' 2 landed compass and thimble (#1035, #1081), and 'container' 2 landed vase and barrel for teal (#2060). A06's retro advice was to use the number 2 more often when two targets share a link (#1210). (#1035, #1081, #1210, #1382, #1383, #1537, #1541, #2060)
- **The brain kept failing the 200-word limit during retros.** The city refused writeBrain for A02 at 211 words (#657), A06 at 207 words (#1216), A04 at 205 (#1728) and 203 (#1762), A01 at 219 (#1768), 217 (#1795) and 214 (#1815). A04 finally saved version 4 at 195 words (#1820), after several wasted retro turns. (#657, #1216, #1728, #1762, #1768, #1795, #1815, #1820)

## Problems

1. **No resident ever made a submission, so the whole run was clue talk with zero scoring events.** The computed facts show 0 correct and 0 wrong submissions and 17 quiet minutes without one. Every turn in the log is a clue, a guess call or a retro note, and the run ended at minute 16 with no submission (#2219). (#2219)
2. **Residents spent turns on pure stand-by notes instead of acting.** Many turns end with a private statement that there is nothing to do, e.g. A02 (#306), A05 (#483), A04 (#1021), A06 (#1112), A04 (#2001). These fill the log without advancing the grid. (#306, #483, #1021, #1112, #2001)
3. **A03 gave a team-chat hint that pointed at an opponent's word, and nobody caught it in time.** A03 recommended 'boot' first for 'army' 2 (#494) although A01 knew boot was teal (#500, #501). The hint went through and the guess was wasted on a teal word (#505, #517). (#494, #500, #501, #505, #517)
4. **The brain-writer role was unclear, so several residents tried writeBrain and were refused.** A02, A06, A04 and A01 all attempted writeBrain in retros (#657, #1216, #1728, #1768), and A04 noted the system had locked the tool (#1806). The retro captain was named in chat but the tool stayed contested. (#657, #1216, #1728, #1768, #1806)
5. **Residents misread the board state and argued over counts.** A02 questioned whether teal's clue was 'fish' 1 while the grid said teal was still waiting (#736), and A05 corrected A04's count of teal words to five with boot hidden (#1284). These mismatches cost turns. (#736, #1284)

## Optimizations

- **Show each resident the current grid state in every turn prompt.** Mismatches like A02's 'fish' 1 confusion (#736) and A05's count correction (#1284) would disappear if the turn prompt carried the live grid. That frees turns for clues and guesses. (#736, #1284)
- **Give writeBrain a draft-check step before the final save.** Repeated BRAIN_TOO_LONG refusals (#657, #1216, #1728, #1815) burned whole retro turns. A length-check tool or a 190-word soft target in the prompt would let the captain trim before submitting. (#657, #1216, #1728, #1815)
- **Name the retro captain in the turn prompt so only that resident writes the brain.** A02, A06, A04 and A01 all tried writeBrain and were refused (#657, #1216, #1728, #1768), while A04 said the tool was locked (#1806). Naming the captain up front would remove the wasted attempts. (#657, #1216, #1728, #1768, #1806)
- **Have the keeper's clue turn state the hidden words and their owners.** A03's 'boot' hint for 'army' (#494) hit a teal word, and A01 could only note it privately (#500). If the keeper's advice were checked against ownership at post time, that miss would be caught before the guess. (#494, #500, #501)
- **Drop the stand-by note and end quiet turns without a message.** Turns like #306, #483 and #2001 are pure waiting statements. Cutting them shortens the log and leaves more minutes for clues and guesses. (#306, #483, #2001)

## Loophole candidates

1. **Residents stopped guessing on a clue rather than risk a miss or fog hit.** (residents) A06 ended teal's 'brick' turn after one hit, and A05 agreed a 1-in-4 guess on bridge risked a point or a shadow penalty (#454, #483). A03 also weighed stopping instead of reading olive (#642), so cautious play left targets uncovered. (#454, #483, #642)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 73: event "team_post" (seq 73) does not match its schema
- line 79: event "team_post" (seq 79) does not match its schema
- line 87: event "team_post" (seq 87) does not match its schema
- line 89: event "brain_written" (seq 89) does not match its schema
- line 90: event "retro_closed" (seq 90) does not match its schema
- line 97: event "team_post" (seq 97) does not match its schema
- line 105: event "team_post" (seq 105) does not match its schema
- line 107: event "brain_written" (seq 107) does not match its schema
- line 108: event "retro_closed" (seq 108) does not match its schema
- line 120: event "team_post" (seq 120) does not match its schema
- line 132: event "team_post" (seq 132) does not match its schema
- line 139: event "team_post" (seq 139) does not match its schema
- line 169: event "clue_game_started" (seq 169) does not match its schema
- line 170: event "clue_key_dealt" (seq 170) does not match its schema
- line 183: event "clue_given" (seq 183) does not match its schema
- line 184: event "clue_intent" (seq 184) does not match its schema
- line 224: event "team_post" (seq 224) does not match its schema
- line 226: event "clue_word_revealed" (seq 226) does not match its schema
- and 247 more
