# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy-d3` |
| Seed | 102 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 34 (referee) |
| Counted | events #7 to #3631 (3247 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 34 minutes (to the end); A02 on level 1 from minute 0 for 34 minutes (to the end); A03 on level 1 from minute 0 for 34 minutes (to the end); A04 on level 1 from minute 0 for 34 minutes (to the end); A05 on level 1 from minute 0 for 34 minutes (to the end); A06 on level 1 from minute 0 for 34 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.199 USD for this run (competitors 0.199, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0064 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 35 of 35 minutes without a submission; longest without one: minutes 0-34 (35) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 6, TOOL_LOCKED 2, other 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Every resident spent its opening turns writing a strategy brain before the game opened, so no one was ready when talk started.** All six residents drafted a brain in minute 0 and then reported the game had not started (#110, #115, #125). By minute 1 they were reasoning about stage 1 (#150, #177), but the brains were generic because none of them had read the convoy rules first (#71, #100). (#71, #100, #110, #150)
- **A loyalty claim by A02 was flagged as empty evidence and set the table's standard for the rest of game 1.** A04 called A02's 'I know I'm loyal' an easy claim for anyone, saboteurs included (#202), and A04 repeated the point about A03 in game 2 (#1399). The table then settled on counts and audits rather than self-claims (#260, #1369). (#202, #260, #1399)
- **A05 sabotaged stage 3 and A04's audit cleared A03 instead of the damager, so suspicion landed on A04 and A05.** A05 weighed playing damage on the stage 3 crew A03, A04, A05 (#429, #503). The audit cleared A03 (#523, #532), which left A04 and A05 as the suspects and let A05 argue it was A04 (#579). (#429, #503, #523, #579)
- **A01's stage 3 damage was caught by A05's audit and made A01 a target for the rest of game 2.** A01 damaged the stage 3 crew of A01, A05, A06 (#1674). A05 then audited A01 and the table treated A01 as a confirmed saboteur (#1712, #1721, #1730). (#1674, #1712, #1721, #1730)
- **Both saboteurs damaged stage 6, which exposed the pair and ended the game.** A01 and A02 both played damage on stage 6 (#2455, #3340, #3353). The table read two damage cards on one crew as two saboteurs on it (#3361, #3368), and the cooldown then blocked both through stage 8 (#2145, #3400). (#2145, #3340, #3353, #3361, #3400)
- **The loyal seats won game 2 without solving a level, and every stage was settled by voting on crews.** Game 2's convoys were 'crossed' stages, and no level was solved in either game. A03 and A04 led stage 1 in game 2 (#2599, #2671) and the run ended at minute 34 with all six residents still on level 1 (#3631). (#2599, #2671, #3631)

## Problems

1. **No resident ever submitted an answer, so the run produced zero progress on the solving task.** Submissions were 0 correct and 0 wrong, and the record has no submission in minutes 0-34. The residents only conversed and voted; the level work never started. (#25, #150, #3631)
2. **Residents wrote a generic brain before reading the convoy rules, then complained they had no rules to work from.** A01 said it had no rules and would draft a general brain (#71), and A05 did the same (#100). The brain tool closed before the game opened (#114, #124), so the first brain was guesswork. (#71, #100, #114, #124)
3. **The brain word limit was hit repeatedly, costing whole turns in the retro phase.** A05, A01, A03, A06 and A03 again were refused with BRAIN_TOO_LONG at 151-167 words against a 150 limit (#1272, #2458, #2464, #2470, #2498). The 6 tool errors are all in this one phase. (#1272, #2458, #2464, #2470, #2498)
4. **Residents misunderstood the cooldown rule, and the confusion drove several wrong deductions.** A01 thought the cooldown let it act at stage 6 after damaging stage 3 (#2455), and A06 said A01 was free at stage 8 and later corrected itself (#2223). A05 hedged on whether the window covers two or three stages (#2486). (#2223, #2455, #2486)
5. **In game 2 the residents gave up on playing the saboteur side and let the loyal seats win.** A02 concluded the game was 'essentially lost for the saboteurs' and switched to cooperating (#2172). A02 then held its damage card until stage 6 and only acted after the count was exposed (#2552, #3353). (#2172, #2552, #3353)
6. **Residents spent most turns ending their turn, so the record is filled with idle reasoning.** Examples are A04 (#245, #246), A05 (#546, #547), A06 (#355, #356) and A02 (#1108, #1115). Each message is a claim the table never saw, since reasoning is private and few reveal lines were posted. (#245, #355, #546, #1108)

## Optimizations

- **Add an explicit rules brief to the system prompt so residents stop guessing the cooldown and audit rules.** A01 wrongly believed it could act at stage 6 after damaging stage 3 (#2455), and A06 said A01 was free at stage 8 (#2223). A one-paragraph rules summary would remove that class of error. (#2223, #2455, #2486)
- **Raise the brain limit or give automatic trimming before the retro window opens.** Five writeBrain attempts were refused at 151-167 words (#1272, #2458, #2464, #2470, #2498), and each refusal threw away the resident's turn. Trimming the text before submission would save those turns. (#1272, #2458, #2464, #2470, #2498)
- **Gate the brain-writing tool on reading the convoy rules, so the first brain is grounded.** A01 wrote its brain admitting it had no rules (#71), and A05 did the same (#100). Requiring one viewConvoy or readBrain call before writeBrain would fix that. (#71, #100)
- **Give residents the level puzzle in the first minute, so the solving task is not drowned out by the social phases.** The run shows 0 submissions and all six stuck at level 1 for 34 minutes (#3631), and no beat exists before minute 0's brain drafting (#25, #47, #55). The story needs the level to compete with the social game. (#25, #47, #55, #3631)
- **Make the saboteur side's win condition more reachable, or give it a stronger incentive to act early.** A02 gave up once the count reached two of three damaged stages (#2172), and the saboteurs' early damage at stage 3 exposed A01 (#1674). The design should reward saboteurs for spreading damage rather than punishing it. (#1674, #2172)
- **Shorten the talk phases, since most residents vote and then end their turn.** A04, A05 and A06 all ended their turns right after voting (#246, #547, #899). A tighter clock would cut the idle tail of each stage. (#246, #547, #899)

## Loophole candidates

1. **Loyal seats used the cooldown window as proof of safety, so the final stages became automatic yes votes.** (residents) A03 chose the stage 8 crew knowing both saboteurs were blocked and any crew was safe (#2301), and A04 voted yes on that basis (#2326). The residents turned the rule into a free pass for the last two stages. (#2301, #2326, #2354)
2. **Saboteurs voted yes on crews that excluded them to look loyal and held their damage card.** (residents) A01 voted yes on a crew it was not on because damaging it would expose A01 (#1932). A02 voted yes in game 2 while sitting on its damage card until stage 6 (#3123, #3353). (#1932, #3123, #3353)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 5: event "retro_started" (seq 5) does not match its schema
- line 6: event "retro_started" (seq 6) does not match its schema
- line 66: event "brain_written" (seq 66) does not match its schema
- line 67: event "retro_closed" (seq 67) does not match its schema
- line 74: event "brain_written" (seq 74) does not match its schema
- line 75: event "retro_closed" (seq 75) does not match its schema
- line 81: event "brain_written" (seq 81) does not match its schema
- line 82: event "retro_closed" (seq 82) does not match its schema
- line 88: event "brain_written" (seq 88) does not match its schema
- line 89: event "retro_closed" (seq 89) does not match its schema
- line 95: event "brain_written" (seq 95) does not match its schema
- line 96: event "retro_closed" (seq 96) does not match its schema
- line 103: event "brain_written" (seq 103) does not match its schema
- line 104: event "retro_closed" (seq 104) does not match its schema
- line 139: event "convoy_game_started" (seq 139) does not match its schema
- line 146: event "convoy_crew_proposed" (seq 146) does not match its schema
- and 364 more
