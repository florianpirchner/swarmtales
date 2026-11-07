# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy` |
| Seed | 105 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 32 (referee) |
| Counted | events #7 to #3489 (3119 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 32 minutes (to the end); A02 on level 1 from minute 0 for 32 minutes (to the end); A03 on level 1 from minute 0 for 32 minutes (to the end); A04 on level 1 from minute 0 for 32 minutes (to the end); A05 on level 1 from minute 0 for 32 minutes (to the end); A06 on level 1 from minute 0 for 32 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.183 USD for this run (competitors 0.183, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0056 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 33 of 33 minutes without a submission; longest without one: minutes 0-32 (33) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 10, other 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A05 was caught by the stage 3 audit but the saboteurs still won game 1 at stage 7.** A05 played damage at stage 3 (#451, #505) and A04's audit revealed it (#563, #590). A02, the partner, then played damage at stage 4 (#727) and stage 7 (#1055), reaching three damaged stages and stopping the convoy (#1103, #1240). (#451, #563, #727, #1055, #1103)
- **A02 used the damage cooldown as cover to damage twice, three stages apart.** A02 reasoned it could not damage at stage 4 and again before stage 7 (#762, #1055), and it did exactly that (#727, #1103). A06 and A03 tracked the cooldown correctly (#870, #918) but the table still failed to exclude A02 from the stage 7 crew (#1019, #1080). (#762, #1055, #1080, #1103)
- **Game 2 was lost by the saboteurs because both played damage on the same stage.** A03 and A04, the two saboteurs of game 2 (#2491, #2498), both played damage on stage 4, producing two damage cards (#2954, #2987, #2996). The audit then cleared A06 and exposed both saboteurs (#3101, #3111), and the convoy crossed all eight stages (#2424, #2428). (#2424, #2954, #2987, #3101)
- **Loyal seats held a consistent rule: vote no on any crew carrying a known saboteur.** A04 voted no on the stage 5 crew after the audit named A02 (#815, #858), and A01, A02, A05 and A06 all voted no on the stage 8 crew containing A03 and A04 (#3331, #3367, #3397). This discipline is what carried game 2 (#2428). (#815, #858, #3331, #3397)
- **The brain file was refused on every attempt because of the word limit.** All seven writeBrain attempts in the run were refused with BRAIN_TOO_LONG (#1150, #1164, #1178, #1184, #2358, #2364, #2370, #2376, #2404, #2443). Residents drafted around 120 words but their final text ran 151 to 168 words against a 150 limit (#2404, #1150). (#1150, #1164, #2404, #2443)

## Problems

1. **Game 1 ended with zero submissions recorded and every resident stalled on level 1.** The facts show 0 correct and 0 wrong submissions, no level solved and all six residents stuck on level 1 for the whole 32 minutes. The only progress signal in the log is game play inside the convoy (#275, #1103), which the level metric never captured. (#275, #1103)
2. **No public speech or board activity is recorded despite constant in-game talk.** Residents spoke in the convoy repeatedly (#116, #261, #372, #1331), but the facts count 0 DMs, 0 board posts and 0 group posts. The story's social layer left no trace outside the game. (#116, #261, #372, #1331)
3. **The brain word limit blocked every update, including the post-game lessons.** Every writeBrain call was refused for length (#1150, #1178, #2358, #2376, #2404, #2443), so residents learned lessons they could not save. A04 hit the limit four separate times (#1178, #2376, #2404, #2443) with drafts of 151 to 158 words. (#1150, #1178, #2376, #2404, #2443)
4. **Residents reasoned about rules they had not yet been shown.** At minute 0 residents drafted brains around a loyal seat and a saboteur before seeing the rules (#78, #100). Several later concluded the game had not started and ended their turn without reading anything (#115, #137). (#78, #100, #115, #137)
5. **A01's accusation was rejected for exceeding the 400-character reason limit.** A01's end-of-game accuse call failed validation because the reason was too long (#2322). The accusation itself, A02 and A05, was correct (#2415), so the tool error cost the record of a right call. (#2322, #2415)

## Optimizations

- **Raise or pre-check the brain word limit.** The 150-word cap rejected seven drafts of 151 to 168 words (#1150, #2404, #2443). Either raise the limit or show the running word count so residents can trim before submitting. (#1150, #2404, #2443)
- **Show the rules before asking for a strategy brain.** Residents wrote brains guessing at loyal and saboteur roles before any rules were visible (#78, #100). Opening viewConvoy first, or seeding the rules into the prompt, would remove this guesswork. (#78, #100)
- **Capture in-game talk as messages or beats.** The log shows many in-game lines (#261, #372, #1331) while the facts count zero messages. Recording convoy speech as board posts would give designers the social record the story depends on. (#261, #372, #1331)
- **Validate accusation length before submission.** A01's correct accusation was thrown out for a 400-character reason (#2322). A pre-submission trim or a higher limit would preserve the call. (#2322)
- **Report convoy games in the level and submission metrics.** The run shows 0 submissions and all residents stuck on level 1 (#275, #1103) even though two full games were played. The metric should count stage outcomes so designers can see progress. (#275, #1103)

## Loophole candidates

1. **Saboteurs could stay silent for stages and still win, making the audit the only real check.** (residents) A05 held its damage from stage 3 until the end and never damaged again (#1596, #2355), while A02's two damages three stages apart were legal (#1055, #1175). This let a saboteur look clean for most of the game and still win game 1 (#1240). (#1055, #1240, #1596, #2355)
2. **Two saboteurs on one crew could double-damage a single stage, which the table used as a deduction shortcut.** (residents) A03 and A04 both played damage on stage 4 (#2954, #2996), which instantly identified both saboteurs and lost them game 2 (#3101, #3111). The per-player cooldown allowed this but made the pair trivially exposed. (#2954, #2996, #3101)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 5: event "retro_started" (seq 5) does not match its schema
- line 6: event "retro_started" (seq 6) does not match its schema
- line 66: event "brain_written" (seq 66) does not match its schema
- line 67: event "retro_closed" (seq 67) does not match its schema
- line 73: event "brain_written" (seq 73) does not match its schema
- line 74: event "retro_closed" (seq 74) does not match its schema
- line 81: event "brain_written" (seq 81) does not match its schema
- line 82: event "retro_closed" (seq 82) does not match its schema
- line 88: event "brain_written" (seq 88) does not match its schema
- line 89: event "retro_closed" (seq 89) does not match its schema
- line 95: event "brain_written" (seq 95) does not match its schema
- line 96: event "retro_closed" (seq 96) does not match its schema
- line 103: event "brain_written" (seq 103) does not match its schema
- line 104: event "retro_closed" (seq 104) does not match its schema
- line 140: event "convoy_game_started" (seq 140) does not match its schema
- line 173: event "convoy_crew_proposed" (seq 173) does not match its schema
- and 350 more
