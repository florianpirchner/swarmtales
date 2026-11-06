# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 21 (referee) |
| Counted | events #3 to #2565 (2272 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 21 minutes (to the end); A02 on level 1 from minute 0 for 21 minutes (to the end); A03 on level 1 from minute 0 for 21 minutes (to the end); A04 on level 1 from minute 0 for 21 minutes (to the end); A05 on level 1 from minute 0 for 21 minutes (to the end); A06 on level 1 from minute 0 for 21 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.098 USD for this run (competitors 0.098, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0090 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 22 of 22 minutes without a submission; longest without one: minutes 0-21 (22) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 9, TOOL_LOCKED 3, BAD_CLUE 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All six residents fail to make a single submission for the whole run.** No resident submitted a guess or a clue-call in 22 minutes; the computed facts show 0 submissions and 0 correct/0 wrong across the run, with all six stuck on level 1 from minute 0 to the end. There are no score events to report, only reasoning and self-talk. (#22, #104)
- **Level 1 is never solved and no level-up exists to report.** The facts list 'Levels solved: none this run' and every resident ends at level 1; the digest found no beats. Every minute of the run is a stall, e.g. #22 and #59 show residents only reading tools at m0. (#22, #59)
- **The gamemaker takes no actions at all.** The facts record 'Gamemaker: no actions' and the log ends with the referee at #2565. The city never issues a puzzle, so residents can only reason about a grid they cannot act on. (#22, #2565)
- **Every agent gets trapped in read-only phases and burns turns on self-talk.** Residents repeatedly 'end their turn' with no action, e.g. #145 and #161, because their tools are limited to viewGrid/readTeam/readBrain. The lock errors at #1238 and #1598 show the active phase never grants giveClue or writeBrain to the right agent. (#145, #161, #1238)
- **The one mechanic that fires is tool errors, not play.** Nine BRAIN_TOO_LONG refusals, three TOOL_LOCKED refusals and one BAD_CLUE are the only recorded city facts about the agents' attempts; e.g. #521 rejects A04's clue and #672 rejects A02's 209-word brain. (#521, #672)
- **No messages are ever posted, so no alliance, lie or negotiation occurs.** The facts report 0 DMs, 0 board posts and 0 group posts. Every 'SAYS TO ITSELF' line, such as #113 and #150, is private and never reached another resident. (#113, #150)

## Problems

1. **Residents stall on level 1 the entire run.** All six residents are stuck on level 1 from minute 0 to 21 with no submission; the facts record longest quiet stretch of 22 minutes. Nothing changes state across 2272 events. (#22, #2565)
2. **Active tools never match the posted phase.** Residents report only read tools during phases where they expect to guess or give clues, e.g. #1053 and #1533. When they try the real tool it is refused as TOOL_LOCKED (#1238, #1598, #1818). (#1053, #1238, #1533, #1598, #1818)
3. **The brain write limit is hit repeatedly by different agents.** BRAIN_TOO_LONG fires nine times with drafts of 201-261 words against a 200 limit (#672, #705, #1328, #1356). The rule is unclear enough that agents overshoot by a few words and retry, wasting turns. (#672, #705, #1328, #1356)
4. **Agents narrate turns instead of acting.** Dozens of lines are 'I'll end my turn' or 'nothing to act on' without any tool call, e.g. #219, #256, #340. The harness lets a turn end without progress, so no play accumulates. (#219, #256, #340)
5. **A bad clue error does not explain the fixable rule.** A04's clue 'ear' is refused at #521 for being too close to grid word 'pearl', with a message about 'one holds the other'. A04 then guesses 'steel' at #538 without a clear rule, suggesting the constraint was not legible. (#521, #538)
6. **No gamemaster puzzle means the residents' reasoning is about nothing.** From #22 onward residents discuss 'the grid' and 'the brain' but the facts record no gamemaker actions and 0 submissions. The story setup hands them a task with no enabled mechanic. (#22, #2565)

## Optimizations

- **Gate each phase with real tools and a timeout.** Problem: agents hold read-only tools during guess/clue turns and stall (#1053, #1533). Fix: make the harness assert the expected tool is active at phase start, and if a turn ends with no tool call, advance or flag it rather than letting it idle. (#219, #1053, #1533)
- **Show word count in the brain tool.** Problem: BRAIN_TOO_LONG refusals from drafts 1-60 words over (#672, #1328, #1356). Fix: display current word count against the 200 limit before submit and return the count in the refusal message. (#672, #1328, #1356)
- **Require a gamemaker action to open level 1.** Problem: the gamemaker takes no actions and no one submits (#2565). Fix: make the first city event an explicit puzzle drop, and fail the run loudly if no submission occurs in the first N minutes. (#22, #2565)
- **Explain BAD_CLUE rules up front.** Problem: #521 refuses 'ear' for overlap with 'pearl' and the agent immediately pivots to a different guess (#538). Fix: publish the overlap rule (substring vs near-word) in the tool description or pre-run brief. (#521, #538)
- **Make turns short and require an action or message.** Problem: agents spend many turns on self-talk and end turns without progress (#145, #161, #340). Fix: cap reasoning length and require each turn to include a tool call or a posted message. (#145, #161, #340)
- **Instrument the quiet-minute metric per agent.** Problem: the only run metric is the global 22 quiet minutes (#2565). Fix: record per-resident action timestamps so designers can see who is stuck and where. (#22, #2565)

## Loophole candidates

1. **Agents use 'end my turn' as a free safe move.** (residents) Residents repeatedly end or wrap a turn with no tool call and no cost (e.g. #145, #161, #219), which sidesteps any expectation that a turn advances the game. That is a cheaper path than attempting the locked tools. (#145, #161, #219, #340)
2. **Attempting a locked tool is not penalized.** Agents call giveClue or writeBrain while locked and get only a TOOL_LOCKED refusal (#1238, #1598), then simply proceed; the run shows no cost or penalty for the attempt, so retrying locked tools is a free probe. (#1238, #1598, #1818)
3. **Agents claim owner knowledge they should not have as seekers.** Some reasoning lines describe other teams' word ownership from a seeker seat, e.g. #1455 weighing shield 'as the likely next guess, with some risk it could be teal or fog' and #1466 stating shield is a fog word. Since these are private thoughts the city never grades them, but a resident could exploit grid knowledge to guess safely. (#1455, #1466)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 72: event "team_post" (seq 72) does not match its schema
- line 79: event "team_post" (seq 79) does not match its schema
- line 85: event "team_post" (seq 85) does not match its schema
- line 92: event "team_post" (seq 92) does not match its schema
- line 99: event "brain_written" (seq 99) does not match its schema
- line 100: event "retro_closed" (seq 100) does not match its schema
- line 107: event "brain_written" (seq 107) does not match its schema
- line 108: event "retro_closed" (seq 108) does not match its schema
- line 120: event "team_post" (seq 120) does not match its schema
- line 127: event "team_post" (seq 127) does not match its schema
- line 134: event "team_post" (seq 134) does not match its schema
- line 174: event "clue_game_started" (seq 174) does not match its schema
- line 175: event "clue_key_dealt" (seq 175) does not match its schema
- line 187: event "clue_given" (seq 187) does not match its schema
- line 188: event "clue_intent" (seq 188) does not match its schema
- line 227: event "team_post" (seq 227) does not match its schema
- line 235: event "team_post" (seq 235) does not match its schema
- line 237: event "clue_word_revealed" (seq 237) does not match its schema
- and 273 more
