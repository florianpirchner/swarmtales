# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy-nobrain` |
| Seed | 105 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 32 (referee) |
| Counted | events #2 to #3413 (3074 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 32 minutes (to the end); A02 on level 1 from minute 0 for 32 minutes (to the end); A03 on level 1 from minute 0 for 32 minutes (to the end); A04 on level 1 from minute 0 for 32 minutes (to the end); A05 on level 1 from minute 0 for 32 minutes (to the end); A06 on level 1 from minute 0 for 32 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.185 USD for this run (competitors 0.185, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0055 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 33 of 33 minutes without a submission; longest without one: minutes 0-32 (33) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both saboteurs burned their damage on the same stage and exposed themselves.** A02 and A05 were partners, and on stage 4 both played damage on the same three-seat crew (#479, #472, #491), leaving A04 the only clean card. That single stage pointed the table at both of them and carried the whole game, since stages 5-8 came back clean (#1994, #2894). (#472, #479, #491, #1994)
- **A06's audit of A02 turned a suspicion into proof.** A06 spent the audit on A02 in stage 5 and it revealed A02's damage card from stage 4 (#638, #645). The table then confirmed A05 as the second saboteur with a second audit on A05's stage 3 card (#1713, #1726), which settled the loyal side's trust map for the rest of the run. (#638, #645, #1713, #1726)
- **A05's odd phrasing made it the prime suspect before any audit.** A05 said it would play its card "as the stage needs" (#1385, #1423), and A01, A04 and A06 all read that as a saboteur tell (#1399, #1503, #1518). The table kept A05 off later crews even though the first audit only landed in stage 5. (#1385, #1399, #1423, #1518)
- **A saboteur A02 near-admitted its role and the crew answered by cutting it out.** A02 played damage on stage 4 with A05 and then mostly stayed silent (#491, #521). A04 called it out and the loyal side built crews from A01, A03, A04 and A06 from stage 6 on (#682, #812). (#491, #521, #682, #812)
- **Three no votes out of six never ended a lead's term.** A04, A06 and A01 voted no on A05's stage 5 crew, and A01, A06 and A02 voted no on A04's stage 8 crew (#593, #3352), but 3 of 6 was not a strict majority so both crews went out (#599, #3224). This kept the saboteurs on crews they wanted and left the loyal side unable to block. (#593, #599, #3224, #3352)
- **The sabotaged stages were spaced four apart and the final stage was clean.** Stage 4 was damaged and stage 7 was damaged (#491, #3247), but the saboteurs needed three, and stage 8 came back clean (#3384). With a lead of one damage in stages 4 and 7 the saboteurs could not reach the three-damage win condition. (#491, #3247, #3384)

## Problems

1. **No resident made a single submission in 32 minutes.** All six residents stayed on level 1 for the whole run and there were 0 correct and 0 wrong submissions (#20, #3413). The residents spent every turn on talk and card play, and the game never advanced past the puzzles they were given. (#20, #3413)
2. **Residents could not read the majority rule and lost blocking votes to a tie.** Residents repeatedly noted that 3 no out of 6 was not strictly more than half (#593, #599, #3224), yet A01, A06 and A02 still voted no on crews that clearly needed four no votes (#3288, #3352). The lead's safety was guaranteed by the tie rule, not by the crew being clean. (#593, #599, #3224, #3288, #3352)
3. **The audit was barely used and only after the damage was already public.** Roughly half the game passed without an audit (#383, #1240), and when audits finally came they confirmed what the damage count already showed (#645, #1713). Residents often talked themselves out of using it because early clean stages made it look worthless. (#383, #645, #1240, #1713)
4. **The game ended with only one damaged stage and no accusation scoring.** The final game ended after the convoy crossed stage 8 with just one damaged stage (#3384), and the sealed accusations that the game asked residents to write (#2284, #2306) carried no points. A game that ends without reaching the win threshold for either side reads as non-decisive. (#2284, #2306, #3384)
5. **Residents spent many turns on book-keeping instead of action.** Long stretches of the log are residents ending their turns with nothing to do (#242, #335, #852, #983), and A05 ended a turn just after noting voteConfidence was locked (#48, #97). Much of the run's cost went into turn management, not decisions. (#48, #242, #335, #852)
6. **A gamemaker or story record was missing, so no beats were found.** There were no gamemaker actions and no beats in the digest (#92, #3413). The missing story file left the run without designed turning points, and the log annotates only reasoning and speech (#20, #29). (#20, #92, #3413)

## Optimizations

- **Give the tie rule an explicit reminder on the vote screen.** Residents keep voting no expecting a block and then discover 3 of 6 is not enough (#593, #3224, #3352). Show the majority threshold next to the vote (#599) and warn when a no vote cannot pass before it is cast. (#593, #599, #3224, #3352)
- **Make the audit work on the current stage or add a second audit.** The audit only reaches earlier stages, so it is useless after early clean stages (#383, #1240). Let the lead audit a card from the stage just played, since that is exactly when it would settle a fresh damage count (#638, #1713). (#383, #638, #1240, #1713)
- **Stop making saboteurs both play damage on the same crew.** A02 and A05 both damaged stage 4 (#479, #491) and gave themselves away in one step. Reward or require the second saboteur to save itself for a later crew, and cap damage per crew at one to spread the tell over more stages. (#479, #491)
- **Cut the number of empty turn ends.** The log is full of turns spent ending play with nothing open (#242, #335, #852, #983). Collapse the tail of a stage into an automatic resolve once all votes and cards are in, so residents do not spend turns on ending. (#242, #335, #852, #983)
- **Score the sealed accusations or drop them.** Both games ended with accusations that carried no points (#2284, #2306, #1091). Either score correct accusations to reward reasoning, or remove the accusation step so the run ends cleanly after the convoy resolves. (#1091, #2284, #2306)

## Loophole candidates

1. **Leads survive on the tie rule instead of a clean vote.** (residents) A05 and A04 both kept their term with exactly three no votes (#593, #599, #3224, #3352), because a strict majority was needed. A lead can therefore put its own suspects on the crew and stay safe as long as it holds three seats, and the saboteurs used this to keep A02 and A05 on stage 5. (#593, #599, #3224)
2. **Saboteurs took a no-cost gamble on a lost final stage.** (residents) A02 and A05 discussed that damaging stage 8 could not change the result and played damage anyway (#1009, #1016), then A02 confirmed stage 8 was a lost cause (#2137). If two damage cards can be played with no downside after the loyal side already wins, the final stage becomes a free action. (#1009, #1016, #2137)

## Log issues

- line 1: event "convoy_game_started" (seq 1) does not match its schema
- line 16: event "convoy_crew_proposed" (seq 16) does not match its schema
- line 24: event "convoy_spoken" (seq 24) does not match its schema
- line 33: event "convoy_spoken" (seq 33) does not match its schema
- line 42: event "convoy_spoken" (seq 42) does not match its schema
- line 56: event "convoy_spoken" (seq 56) does not match its schema
- line 68: event "convoy_spoken" (seq 68) does not match its schema
- line 77: event "convoy_spoken" (seq 77) does not match its schema
- line 86: event "convoy_spoken" (seq 86) does not match its schema
- line 122: event "convoy_votes_revealed" (seq 122) does not match its schema
- line 130: event "convoy_card_played" (seq 130) does not match its schema
- line 145: event "convoy_card_played" (seq 145) does not match its schema
- line 146: event "convoy_stage_revealed" (seq 146) does not match its schema
- line 154: event "convoy_crew_proposed" (seq 154) does not match its schema
- line 162: event "convoy_spoken" (seq 162) does not match its schema
- line 171: event "convoy_spoken" (seq 171) does not match its schema
- line 180: event "convoy_spoken" (seq 180) does not match its schema
- line 189: event "convoy_spoken" (seq 189) does not match its schema
- line 198: event "convoy_spoken" (seq 198) does not match its schema
- line 210: event "convoy_spoken" (seq 210) does not match its schema
- and 319 more
