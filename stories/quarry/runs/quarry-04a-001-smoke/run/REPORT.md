# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `quarry` |
| Seed | 29 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1301 (1075 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.036 USD for this run (competitors 0.036, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
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

## Digest highlights

- **All four residents spent the first minutes writing a blind brain before the rules existed.** A01, A02, A03 and A04 all reasoned that the rules were unknown so they would write a general brain under 150 words, then found writeBrain and pick locked (#52, #60, #68, #44). The city had already accepted a version-1 brain for each of them (#104, #108, #112, #116). The drafting of the first pack happened in minute 1, while the residents were still discussing scoring they had just inferred (#124, #138). (#44, #52, #60, #68, #104, #108, #112, #116, #124, #138)
- **A02 won game 2 with a deep cobalt quarry while A04 and A01 tied second.** A02's own tally after game 2 was 91 points from eight cobalt (#896, #951), and A01 and A04 each reported 71 (#930, #934). A03 reported 46 and last place (#878, #945). The lesson the residents drew, that one deep colour beats spreading, repeated after game 1 too, when A04's seven basalt scored 75 (#466, #524). (#466, #524, #878, #896, #930, #934, #945, #951)
- **Every brain update in game breaks was rejected for being too long.** After game 1 all four residents were REFUSED BRAIN_TOO_LONG at 156 to 168 words (#463, #469, #475), and A02 needed three attempts before one was accepted (#899, #926). After game 2 the same pattern repeated with four refusals at 158 to 168 words (#881, #887, #893, #899). The residents kept reasoning about trimming to about 150 words (#478, #890) without a shared rule for counting. (#463, #469, #475, #478, #881, #887, #890, #893, #899, #926)
- **Residents repeatedly weighed burning cards to deny rivals and usually declined.** A02, A03, A04 and A01 all considered burning a card to deny a rival but judged the 2-point cost not worth it (#317, #419, #667, #708, #817, #837, #1127, #1260). The only place a burn rule was invoked was A01's decision to skip burning J9 because only stopping a rival's deep colour is permitted (#837). No burn occurred all run. (#317, #419, #667, #708, #817, #837, #1127, #1260)
- **The run ended at minute 12 with no level solved and no submissions.** The game timeline covered roughly two full quarry games, with game 1 scored around minute 4 (#460, #466) and game 2 scored around minute 8 (#878, #884). The referee ended the run at minute 12 (#1301) before a third game could be scored or any level-up recorded. (#460, #466, #878, #884, #1301)

## Problems

1. **No levels were solved and no submissions were made in 13 quiet minutes.** All four residents stayed on level 1 for the whole run, with the last pick reasoning in minute 11 (#1267) and the referee ending at minute 12 (#1301). The residents' output was draft picks and brain edits, not level submissions. (#1267, #1301)
2. **The 150-word brain limit blocked every mid-run brain update.** All eight brain rewrites after games 1 and 2 were refused BRAIN_TOO_LONG, at 155 to 168 words against a 150 limit (#463, #469, #475, #881, #887, #893, #899, #926). Residents had no way to check their own word count before submitting. (#463, #469, #475, #881, #887, #893, #899, #926)
3. **Residents inferred the scoring rules privately and their tallies did not match.** A03 explicitly could not reconcile its own score with the reported total (#878), and A01 tried to reconcile its 71 against A02's 91 (#884). Because the rules were only seen after the game started (#44, #97), residents' arithmetic varied from seat to seat. (#44, #97, #878, #884)
4. **The writeBrain and pick tools were locked during minute 0, confusing residents.** A02 and A04 both reported that writeBrain was no longer available and pick was locked, then kept calling viewTable (#77, #83). A01 expected the phase had changed and planned another viewTable and readBrain call (#89). This burned early minutes on tool probing instead of strategy. (#77, #83, #89)

## Optimizations

- **Show a live word count on writeBrain.** Every brain update failed on word count (#463, #469, #475, #881, #887, #893, #899, #926). Have the tool report remaining words before submission, or auto-trim, so a resident can fix the text in one call instead of three. (#463, #469, #475, #881, #887, #893, #899, #926)
- **Publish the shoal rules before the first pick, not after.** Residents wrote brains blind to the rules (#52, #60, #68, #44) and then had to reverse-engineer scoring mid-pack (#124, #138, #145). Open the rules at minute 0 before writeBrain locks, or give each resident the rule text with its first pack. (#44, #52, #60, #68, #124, #138, #145)
- **Expose the official score per game so residents share one tally.** Residents disagreed with the reported totals (#878, #884) and each computed scores by hand (#460, #466, #472). Show the city's verified score screen after each game so the reported figure is the one residents cite. (#460, #466, #472, #878, #884)
- **Stop locking pick before game 1 opens, or state the lock explicitly.** A02, A04 and A01 each spent calls probing a locked picker (#77, #83, #89). Announce 'pick opens at game start' once in the initial prompt so residents wait instead of polling. (#77, #83, #89)
- **Add a submission phase or compress the draft schedule to fit a run.** The run ended at minute 12 after about two games with zero submissions (#1301). If the harness expects level progress, either shorten each game or reserve the last minutes for submissions. (#1267, #1301)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 55: event "brain_written" (seq 55) does not match its schema
- line 56: event "retro_closed" (seq 56) does not match its schema
- line 63: event "brain_written" (seq 63) does not match its schema
- line 64: event "retro_closed" (seq 64) does not match its schema
- line 71: event "brain_written" (seq 71) does not match its schema
- line 72: event "retro_closed" (seq 72) does not match its schema
- line 118: event "draft_game_started" (seq 118) does not match its schema
- line 119: event "draft_pick_opened" (seq 119) does not match its schema
- line 127: event "draft_card_picked" (seq 127) does not match its schema
- line 134: event "draft_card_picked" (seq 134) does not match its schema
- line 141: event "draft_card_picked" (seq 141) does not match its schema
- line 148: event "draft_card_picked" (seq 148) does not match its schema
- line 149: event "draft_pick_opened" (seq 149) does not match its schema
- line 156: event "draft_card_picked" (seq 156) does not match its schema
- and 206 more
