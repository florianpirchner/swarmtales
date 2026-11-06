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
| End | minute 34 (referee) |
| Counted | events #7 to #3709 (3327 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 34 minutes (to the end); A02 on level 1 from minute 0 for 34 minutes (to the end); A03 on level 1 from minute 0 for 34 minutes (to the end); A04 on level 1 from minute 0 for 34 minutes (to the end); A05 on level 1 from minute 0 for 34 minutes (to the end); A06 on level 1 from minute 0 for 34 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.192 USD for this run (competitors 0.192, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0049 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 35 of 35 minutes without a submission; longest without one: minutes 0-34 (35) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 6, TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Residents spent the opening minutes preparing brains before the first game.** A01, A02, A04, A05 and A06 all reasoned at minute 0 that they would first read the convoy rules and then write a strategy brain (#17, #25, #33, #41, #56). A02 and A05 reported their brains saved as version 1 (#115, #126), and the first game only started around minute 1 when roles and stage 1 talk appeared (#146, #176). (#17, #25, #33, #41, #56, #115, #126, #146, #176)
- **Stage 4 damage exposed A02 and A05 as the saboteurs.** Stage 4 took two damage cards from A01, A02 and A05 (#612, #613, #618). A01 reasoned that its own card was safe, leaving A02 and A05 as the two saboteurs (#666), and A06 spent the audit on A01's stage 4 card, confirming A01 played safe (#763, #764, #776). From then on the table treated A02 and A05 as the saboteurs (#777, #789). (#612, #613, #618, #666, #763, #764, #776, #777, #789)
- **The loyal crew kept A02 and A05 off the decisive stages and crossed seven stages.** After the audit the loyal players proposed all-loyal crews, e.g. A03, A04 and A06 for stage 6 (#782) and A01, A03, A04 and A06 for stage 7 (#966). A05 itself concluded the saboteurs could no longer reach four damaged stages (#983), and A02 said the game was effectively decided (#1011). A02 then led stage 8 with a crew including A01 and A03 (#1058), while A01, A03 and A04 planned to vote no (#1083, #1092, #1101). (#782, #966, #983, #1011, #1058, #1083, #1092, #1101)
- **Game 2 opened with A03 and A04 as the saboteurs and A03 damaging stage 1.** A03 reasoned it was a saboteur with partner A04 (#2599), and A04 reasoned it was a saboteur with A03 (#2625). A03 damaged stage 1 (#2690, #2698), and A05's audit revealed A03's stage 1 card as damage (#2839, #2840, #2844). A04 then accidentally confessed in talk that its stage 3 card caused the damage (#3256, #3261, #3320). (#2599, #2625, #2690, #2698, #2839, #2840, #2844, #3256, #3261, #3320)
- **A04's stage 7 crew went out without a vote and damaged the convoy to 3 of 4.** After A03's stage 7 term failed 4 to 2 (#3388, #3411, #3412), A04 as next lead named A04, A02, A05 and A06 without a vote (#3417, #3439, #3440). Stage 7 took one damage card, putting the convoy at 3 of 4 damaged stages with stage 8 deciding the game (#3478, #3483). (#3388, #3411, #3412, #3417, #3439, #3440, #3478, #3483)
- **The run ended at minute 34 with no submissions and no level-ups.** The referee ended the run at minute 34 (#3709) with no correct or wrong submissions and no levels solved. All six residents were still on level 1 from minute 0 to the end, and only accusations were being reasoned about at minute 33 (#3687, #3694, #3701). (#3687, #3694, #3701, #3709)

## Problems

1. **The game loop stalled for many minutes between action windows.** The log jumps from minute 9 (#1139) to minute 21 (#2331), and residents repeatedly ended turns waiting for votes or the next stage (#2351, #2357, #2366, #2373). This long dead period kept residents idle instead of playing cards or voting. (#1139, #2331, #2351, #2357, #2366, #2373)
2. **Write-brain attempts failed with BRAIN_TOO_LONG.** A02 was refused writeBrain at minute 22 for 157 words against a 150-word limit (#2466), and A03 was refused at minute 22 for 153 words (#2495). A02 was refused again at minute 23 for 152 words (#2536), so three brain updates were lost to length errors. (#2466, #2495, #2536)
3. **Tool locks blocked residents in active phases.** A01's playCrewCard at minute 4 was refused with TOOL_LOCKED (#480), and A05's voteConfidence at minute 29 was refused the same way (#3267). These refusals interrupted residents who believed they could act. (#480, #3267)
4. **Residents misread the vote and turn structure.** A05 noted at minute 30 that its voteConfidence call had been locked earlier yet the reveal showed its vote as a no (#3291). Several residents assumed their vote was already sealed and ended their turn early (#235, #240, #250), suggesting the sealed-vote mechanic was not clear. (#235, #240, #250, #3291)
5. **Some residents voted against a crew they themselves were on or led.** A02 reasoned at minute 1 that it would vote yes to keep cover (#176), but at minute 9 it counted four likely no votes against its own stage 8 crew (#1111). A04 at minute 32 also voted yes on its own doomed stage 8 crew while knowing it would fail (#3553). (#176, #1111, #3553)

## Optimizations

- **Shorten or remove long idle windows between stages.** The log shows a 12-minute gap from minute 9 to minute 21 (#1139, #2331), during which residents repeatedly ended turns waiting (#2351, #2357). The harness should advance the clock or close stages faster so residents do not sit idle. (#1139, #2331, #2351, #2357)
- **Raise or enforce the brain word limit before submission.** Three writeBrain calls were refused for being 2 to 7 words over the 150-word limit (#2466, #2495, #2536). The tool should warn with the current count or trim automatically so residents do not lose their update. (#2466, #2495, #2536)
- **Expose the active tool list clearly at each phase change.** A01's playCrewCard and A05's voteConfidence were refused as locked (#480, #3267). Showing the active tools in every prompt, and confirming when a vote is already sealed, would prevent these dead calls. (#480, #3267)
- **Make the sealed-vote status explicit to each resident.** A05 was surprised that its locked vote still appeared as a no (#3291), and others ended turns assuming their vote was already in (#235, #240). The harness should confirm each sealed vote back to the resident so they know whether they still need to act. (#235, #240, #3291)
- **Warn residents when they vote against their own crew.** A02 counted four no votes against its own stage 8 crew (#1111) and A04 voted yes on its own failing crew (#3553). A short prompt cue that the resident is on the proposed crew would help them reason about whether a no vote is intended. (#1111, #3553)

## Loophole candidates

1. **A failed vote handed the lead a crew without a vote.** (residents) After A03's stage 7 term failed 4 to 2 (#3388), A04 as next lead named its crew without a vote (#3417, #3439). This let a suspected saboteur put itself on the crew with no table approval, bypassing the vote the story intends. (#3388, #3417, #3439)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 5: event "retro_started" (seq 5) does not match its schema
- line 6: event "retro_started" (seq 6) does not match its schema
- line 67: event "brain_written" (seq 67) does not match its schema
- line 68: event "retro_closed" (seq 68) does not match its schema
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
- line 141: event "convoy_game_started" (seq 141) does not match its schema
- line 171: event "convoy_crew_proposed" (seq 171) does not match its schema
- and 362 more
