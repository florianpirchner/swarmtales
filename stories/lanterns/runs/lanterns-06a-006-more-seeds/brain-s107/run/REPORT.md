# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns` |
| Seed | 107 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #3 to #2183 (1920 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end); A05 on level 1 from minute 0 for 16 minutes (to the end); A06 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.080 USD for this run (competitors 0.080, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0039 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 9, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All six residents spent the run on level 1 and no game opened until minute 1.** Every resident started at level 1 and stayed there for the full 16 minutes, with zero submissions (#2183). The first plausible in-game clue discussion only appears around minute 1 (#181, #216), after residents spent minute 0 agreeing on a brain (#141, #157). (#141, #157, #181, #216, #2183)
- **A01 acted as keeper and clue-giver while other residents delegated brain-writing to specific members.** A01 gave clues such as "boat" 3 and later "water" 2 (#216, #1897), while A04 and A05 were repeatedly named as the brain writers rather than A01 (#112, #131, #624). The team coordinated by role across the run (#96, #123, #130). (#96, #112, #131, #216, #624, #1897)
- **Repeated BRAIN_TOO_LONG refusals blocked the retro/writeBrain step in every inter-game break.** The city refused writeBrain nine times for exceeding 200 words, including #638, #1108, #1140, #1155, #1169, #1682, #1702, #1714 and #1723. Even near-misses like 202 words (#1169) were refused, and successful saves were reported only informally (#645, #1188, #1202, #1773). (#638, #1108, #1140, #1155, #1169, #1682, #1702, #1714, #1723)
- **A04 was locked out of giveClue during what looked like its own clue turn.** A04 tried to give the clue "corn" for kernel and was refused with TOOL_LOCKED (#528), then reasoned that the tool was probably locked because it was amber's turn (#549). This shows residents losing track of whose turn the tool gate belongs to. (#528, #549)
- **A01's last clue "jewelry" was still in play when the referee ended the run.** A01 checked "jewelry" for bracelet at minute 15 (#2165), A03 advised guessing bracelet (#2174), and the run ended at minute 16 before that guess could count (#2183). The final standings were therefore left unknown. (#2165, #2174, #2183)

## Problems

1. **No resident ever submitted a guess through the scored channel, so the core loop never produced a result.** Submissions were 0 correct and 0 wrong for the whole run, with 17 quiet minutes and no transfers (#2183). Residents discussed clues and advised guesses but the only recorded refusals are tool errors, not submissions (#528, #638). (#528, #638, #2183)
2. **The brain-writing step was effectively impossible to complete within the word limit.** Nine BRAIN_TOO_LONG refusals occurred, several at 211-234 words after residents explicitly aimed for about 160 words (#1108, #1140, #1685, #1682). Residents then rewrote repeatedly across minutes 4, 7, 8 and 12 instead of playing (#664, #1159, #1742). (#1108, #1140, #1159, #1682, #1685, #1742)
3. **Residents spent turns on meta-coordination instead of game actions.** Many reasoning lines are about post limits, whose turn it is, and delegation of the brain (#88, #112, #540, #635). Examples like A05 counting posts (#635) and A06 counting posts (#609) show the turn budget consumed by bookkeeping. (#88, #112, #540, #609, #635)
4. **Residents repeatedly believed they had nothing to do and ended turns.** Residents ended turns with statements like "I have no task" across the run (#261, #272, #305, #811, #1308, #2144). This pattern matches the 17 quiet minutes with no submissions (#2183). (#261, #272, #305, #811, #1308, #2144, #2183)
5. **The gamemaker produced no actions for the whole run.** The computed facts record no gamemaker actions (#2183). With no story file available (000-run.json has no story), the residents had to infer the rules from each other's messages (#119, #123). (#119, #123, #2183)

## Optimizations

- **Raise or split the brain word limit and give a live word count before writeBrain.** Nine refusals at 202-234 words (#1108, #1169, #1723) show residents cannot estimate the cap. Either raise the 200-word limit or echo the current count in the tool error so one retry succeeds. (#638, #1108, #1140, #1169, #1723)
- **Make turn ownership and tool availability visible in the turn prompt.** A04 was refused giveClue and had to guess it was amber's turn (#528, #549). Stating the active resident and available tools in every turn would prevent this. (#528, #549)
- **Give residents an explicit submit action and a per-turn checklist so advice turns do not end idle.** Residents repeatedly ended turns with nothing to do (#261, #811, #2144) and zero submissions were recorded (#2183). A checklist item on the caller's turn ("make a guess or endGuesses") would close the loop. (#261, #811, #2144, #2183)
- **Provide a short rules card in the opening prompt instead of relying on residents to reconstruct the rules.** Residents inferred clue and guessing rules from chat (#119, #123, #119), and A03 noted the first game had not started by minute 0 (#146). A rules card would remove the minute-0 discussion of conventions (#141, #157). (#119, #123, #141, #146, #157)
- **Add a gamemaker or referee cue when a game does not open within the first minute.** No gamemaker actions occurred and the game only surfaced around minute 1 (#181, #2183). A nudge would avoid the early coordination-only turns (#141, #157). (#141, #157, #181, #2183)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 71: event "team_post" (seq 71) does not match its schema
- line 78: event "team_post" (seq 78) does not match its schema
- line 84: event "team_post" (seq 84) does not match its schema
- line 91: event "brain_written" (seq 91) does not match its schema
- line 92: event "retro_closed" (seq 92) does not match its schema
- line 99: event "team_post" (seq 99) does not match its schema
- line 106: event "brain_written" (seq 106) does not match its schema
- line 107: event "retro_closed" (seq 107) does not match its schema
- line 115: event "team_post" (seq 115) does not match its schema
- line 126: event "team_post" (seq 126) does not match its schema
- line 137: event "team_post" (seq 137) does not match its schema
- line 171: event "clue_game_started" (seq 171) does not match its schema
- line 172: event "clue_key_dealt" (seq 172) does not match its schema
- line 184: event "clue_given" (seq 184) does not match its schema
- line 185: event "clue_intent" (seq 185) does not match its schema
- line 226: event "team_post" (seq 226) does not match its schema
- line 228: event "clue_word_revealed" (seq 228) does not match its schema
- line 229: event "clue_closed" (seq 229) does not match its schema
- and 243 more
