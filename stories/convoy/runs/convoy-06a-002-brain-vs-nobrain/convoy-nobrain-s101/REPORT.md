# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy-nobrain` |
| Seed | 101 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 31 (referee) |
| Counted | events #2 to #3361 (3018 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 31 minutes (to the end); A02 on level 1 from minute 0 for 31 minutes (to the end); A03 on level 1 from minute 0 for 31 minutes (to the end); A04 on level 1 from minute 0 for 31 minutes (to the end); A05 on level 1 from minute 0 for 31 minutes (to the end); A06 on level 1 from minute 0 for 31 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.173 USD for this run (competitors 0.173, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0055 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 32 of 32 minutes without a submission; longest without one: minutes 0-31 (32) |
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

- **Two saboteurs both dumped damage on stage 3, exposing themselves.** A04 and A05 were dealt the saboteur pair in the first game and both played damage on the same stage 3 mission, taking the count to 1 of 4 (#317, #380, #407, #419, #420). A03's stage-3 crew spot let it conclude the two damage cards had to be A04 and A05 (#424, #425). The double play turned a hidden role into a public deduction within one stage. (#317, #380, #407, #419, #420, #424, #425)
- **Loyal block used audit and cooldown logic to lock saboteurs off every later crew.** After the audit showed A03 safe on stage 3 (#793, #810), loyal seats kept A04 and A05 off crews for stages 4-8 (#604, #883, #1016) and the convoy crossed with only 1 damaged stage (#1103, #1145, #1159). No submission or level-up ever happened; the whole game was the vote loop. (#604, #793, #810, #883, #1016, #1103, #1145, #1159)
- **Saboteur A01 confessed to its stage 3 damage in public talk.** A01 reasoned it would defend itself and admit the stage 3 damage (#1962), and the table then treated A01 as a confirmed saboteur (#1993, #1994). That admission let the crew exclude A01 for stages 5-8 while A02 stayed hidden. (#1962, #1993, #1994)
- **A false claim by A01 (played safe on stages 1-2) was caught and used as evidence.** A01 claimed it had played safe on stages 1 and 2 though it sat on neither crew; A03 called it out (#1680) and A01 privately conceded the error (#1687, #1688). Loyal seats then cited the false claim as suspicion against A01 (#1693, #1697). (#1680, #1687, #1688, #1693, #1697)
- **A second game re-dealt roles and the saboteurs again blew themselves up on stage 3.** After a clean first game the city restarted with new roles: A01 and A06 became the saboteur pair (#2328, #2337) and again both played damage on the same stage 3 mission (#2679, #2686, #2702). The loyal block then deduced the pair (#2702, #2969) and crossed again (#3226, #3233). (#2328, #2337, #2679, #2686, #2702, #2969, #3226, #3233)
- **Two full games ended with no submission at all.** All six residents stayed on level 1 from minute 0 to minute 31 with no submissions, no level-ups, no transfers, no DMs and no board posts (facts; #3361). The only recorded actions are talk, votes and audits inside the convoy game. (#3361)

## Problems

1. **The convoy vote loop replaced the actual leveling game.** Every event in the log is convoy talk, votes, audits and card plays; there is not one submission in 31 minutes (#18, #1174, #2328, #3361). The residents spent the run on a social deduction minigame while the stated level-1 start never advanced. (#18, #1174, #2328, #3361)
2. **Cooldown arithmetic was guessed, not given, and drove the whole deduction.** Residents repeatedly reasoned about a 'once per three stages' damage limit and whether stage 4/5 were blocked (#380, #419, #631, #640), but the rule is nowhere in the visible log; they inferred it and built strategy on it. A03's winning deduction rested on the same guessed cooldown (#424, #425). (#380, #419, #424, #425, #631, #640)
3. **Many turns burned on self-talk and ending turns with nothing to do.** Off-crew seats repeatedly said to themselves that they had no card to play and ended their turn (#140, #252, #262, #267, #789, #1989). The stage-3 crew members sat through long 'waiting' stretches (#387, #402) instead of doing anything productive. (#140, #252, #262, #267, #387, #402, #789, #1989)
4. **Saboteurs had no incentive to hold damage, so the game self-destructs.** Both saboteurs independently chose to dump damage on the same stage rather than spread it (#317, #407, #419, #420; again #2679, #2686). The result is that the saboteur side is nearly always exposed by its own first damage play (#424, #425, #2702). (#317, #407, #419, #420, #424, #425, #2679, #2686, #2702)
5. **Roles appear to be re-dealt mid-run without telling the players clearly.** A06 notes roles were 're-dealt' (#1181) and A02 notes the same (#1463), while A01's reasoning at #1174 and #2328 shows a fresh saboteur assignment. Nothing in the log announces the restart, so residents spend early turns re-orienting. (#1174, #1181, #1463, #2328)

## Optimizations

- **Force a real submission loop between convoy stages.** Because no resident ever submitted (#3361), the story should gate each convoy stage behind a level attempt or at least require an action outside talk. That would stop 31 minutes of pure social deduction. (#3361)
- **Publish the damage/cooldown rules in the log instead of letting residents infer them.** Residents guessed the once-per-three-stages rule and used it as the backbone of accusation (#380, #419, #631, #640). Stating it explicitly (and stating it in the audit output) removes a big source of confused reasoning. (#380, #419, #631, #640)
- **Change the saboteur payoff so simultaneous damage is not the default.** Both games saw both saboteurs fire on the same stage (#317, #407, #420; #2679, #2686), which instantly reveals the pair. Penalizing duplicate-stage damage or rewarding spread would create real deception. (#317, #407, #420, #2679, #2686)
- **Give off-crew seats something useful to do.** Off-crew residents only had 'viewConvoy' and 'speak' and mostly ended their turn (#140, #252, #789, #1989). Adding an audit or investigation action for non-crew seats would fill those turns with evidence gathering. (#140, #252, #789, #1989)
- **Announce role re-deals explicitly in the shared log.** A06 and A02 had to reason that roles were re-dealt (#1181, #1463) while the restart at #1174 and #2328 is invisible in the visible stream. A clear 'new game, roles re-dealt' line would cut the re-orientation turns. (#1174, #1181, #1463, #2328)

## Loophole candidates

1. **Loyal seats win by refusing to ever crew a suspect, with no cost.** (residents) Once the pair was deduced, loyal seats simply excluded A04/A05 (#604, #883, #1016) and A01/A06 (#3111, #3226) from every later crew and still got a crossing. The crew vote lets the majority freeze out the saboteurs for the rest of the game without them ever being able to act. (#604, #883, #1016, #3111, #3226)
2. **Vote-anyway behavior: everyone votes yes even when accusing.** (residents) Saboteurs and suspects voted yes on crews that excluded them to keep 'trusted standing' (#188, #231, #761, #900, #915, #2045). Voting yes became a free reputation move detached from the actual crew, undermining the vote as a signal. (#188, #231, #761, #900, #915, #2045)

## Log issues

- line 1: event "convoy_game_started" (seq 1) does not match its schema
- line 14: event "convoy_crew_proposed" (seq 14) does not match its schema
- line 22: event "convoy_spoken" (seq 22) does not match its schema
- line 31: event "convoy_spoken" (seq 31) does not match its schema
- line 40: event "convoy_spoken" (seq 40) does not match its schema
- line 49: event "convoy_spoken" (seq 49) does not match its schema
- line 58: event "convoy_spoken" (seq 58) does not match its schema
- line 82: event "convoy_spoken" (seq 82) does not match its schema
- line 90: event "convoy_spoken" (seq 90) does not match its schema
- line 97: event "convoy_spoken" (seq 97) does not match its schema
- line 126: event "convoy_spoken" (seq 126) does not match its schema
- line 134: event "convoy_votes_revealed" (seq 134) does not match its schema
- line 161: event "convoy_card_played" (seq 161) does not match its schema
- line 167: event "convoy_card_played" (seq 167) does not match its schema
- line 168: event "convoy_stage_revealed" (seq 168) does not match its schema
- line 184: event "convoy_crew_proposed" (seq 184) does not match its schema
- line 192: event "convoy_spoken" (seq 192) does not match its schema
- line 202: event "convoy_spoken" (seq 202) does not match its schema
- line 210: event "convoy_spoken" (seq 210) does not match its schema
- line 219: event "convoy_spoken" (seq 219) does not match its schema
- and 323 more
