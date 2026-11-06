# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns-nobrain` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #3 to #2036 (1786 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end); A05 on level 1 from minute 0 for 16 minutes (to the end); A06 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.066 USD for this run (competitors 0.066, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0036 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Every resident is stuck on level 1 for the whole run** All six residents start at level 1 and never submit a solution; the run ends at minute 16 with zero submissions and zero level-ups (#2036). The stalls began at minute 0 and lasted to the end. (#2036)
- **Teal solves six words across game 1 through clue play** A04's clues and A05/A06's guesses clear thimble, cotton, acorn, plank, storm and drum (#507), and the same pattern repeats in later games with 'silver' landing goblet and thimble (#1266) and 'river' landing bridge to win game 3 (#1602). (#507, #1266, #1602)
- **Keepers repeatedly wish to correct wrong team guesses but cannot post** A01 knows pearl, not ferry, is the target but cannot post during play (#207); A05 knows rabbit is fog and shield is the teal word but cannot warn A06 (#911); A01 knows volcano is fog while A02 recommends it (#1847). (#207, #911, #1847)
- **Give-clue tool locks out keepers on their own turn** A02 tries giveClue and is REFUSED with TOOL_LOCKED (#976), then A04 hits the same refusal (#1689), each losing the clue turn entirely. (#976, #1689)
- **Fog-word guesses repeatedly end turns on team advice** Teal's 'red' clue ends on flame, a fog word (#805); 'magic' ends on rabbit, fog (#950); 'silver' ends on spoon, fog (#1048); amber's 'fish' ends on pilot, fog (#1996). (#805, #950, #1048, #1996)

## Problems

1. **No resident ever submits a puzzle answer** The computed facts show 0 correct and 0 wrong submissions and all six residents stuck on level 1 from minute 0 to minute 16 (#2036). The residents only play the lanterns word game, so the level-solving objective is never attempted. (#2036)
2. **Keepers are silenced during exactly the moments they know the answer is wrong** Keepers state they cannot post in team chat during play (#57, #207, #1443) while callers follow bad advice and hit fog (#911, #1847). This removes the one source of ground truth from the team. (#57, #207, #911, #1443, #1847)
3. **giveClue is locked when a keeper believes it is their turn** A02 and A04 both attempt giveClue and get TOOL_LOCKED (#976, #1689), so clue turns are silently skipped and the intended rotation breaks. (#976, #1689)
4. **No social or competitive layer activates** There are 0 DMs, 0 board posts, 0 group posts and 0 transfers (#2036 facts). Residents only 'SAY TO ITSELF', which the other residents never see (#72, #207, #911). (#72, #207, #911)
5. **Callers rely on guess-the-word intuition with hidden ownership** Callers guess from clue similarity without knowing targets (e.g. #128, #424, #1011), and keepers hold the real targets privately (#1023, #1492), producing fog hits that waste turns (#805, #1048). (#128, #424, #1011, #1023, #1492)

## Optimizations

- **Let keepers send a one-way warning during a clue** Problem: keepers watch wrong guesses they cannot stop (#207, #911). Allow a limited 'keeper hint' post per clue so ground truth can reach the caller. (#207, #911)
- **Fix or clearly announce giveClue availability** Problem: TOOL_LOCKED refusals break clue turns (#976, #1689). Either open giveClue on the keeper's own turn or show the active tool list before the keeper acts. (#976, #1689)
- **Surface the real objective and add a submission step** Problem: no resident ever submits a puzzle answer (#2036). Give residents an explicit per-minute instruction to attempt the level, or gate lanterns play behind submissions. (#2036)
- **Turn private thoughts into visible team messages** Problem: most information sits in SAYS TO ITSELF lines the team never sees (#72, #1023, #1443). Convert key reasoning into team chat so advice and warnings actually transfer. (#72, #1023, #1443)
- **Add feedback so callers learn fog vs. target ownership** Problem: callers repeatedly pick fog words on advice (#805, #950, #1048). Expose revealed-word ownership to the whole team after each reveal. (#805, #950, #1048)

## Loophole candidates

1. **Residents narrate plans privately instead of acting on them** (residents) Several residents record detailed correct plans in SAYS TO ITSELF but take no tool action, effectively treating private reasoning as the deliverable (#207, #911, #1023). (#207, #911, #1023)
2. **Callers stop early to protect points rather than pursue the bonus** (residents) A02 and A03 stop after a single landed word citing shadow risk, avoiding the two-word bonus the story intends (#344, #498), converting the clue game into a low-risk single guess. (#344, #498)

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 18: event "clue_given" (seq 18) does not match its schema
- line 19: event "clue_intent" (seq 19) does not match its schema
- line 44: event "team_post" (seq 44) does not match its schema
- line 46: event "clue_word_revealed" (seq 46) does not match its schema
- line 88: event "team_post" (seq 88) does not match its schema
- line 90: event "clue_closed" (seq 90) does not match its schema
- line 100: event "clue_given" (seq 100) does not match its schema
- line 101: event "clue_intent" (seq 101) does not match its schema
- line 132: event "team_post" (seq 132) does not match its schema
- line 134: event "clue_word_revealed" (seq 134) does not match its schema
- line 142: event "team_post" (seq 142) does not match its schema
- line 159: event "team_post" (seq 159) does not match its schema
- line 161: event "clue_word_revealed" (seq 161) does not match its schema
- line 162: event "clue_closed" (seq 162) does not match its schema
- line 175: event "clue_given" (seq 175) does not match its schema
- line 176: event "clue_intent" (seq 176) does not match its schema
- line 184: event "team_post" (seq 184) does not match its schema
- line 186: event "clue_word_revealed" (seq 186) does not match its schema
- and 230 more
