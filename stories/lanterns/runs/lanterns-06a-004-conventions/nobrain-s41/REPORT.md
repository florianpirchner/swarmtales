# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns-nobrain` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #3 to #1682 (1469 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end); A05 on level 1 from minute 0 for 13 minutes (to the end); A06 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.053 USD for this run (competitors 0.053, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0033 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
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

- **Teal took game 1 on an 11-6 count after dragon landed.** A06 was sent to guess dragon on the "legend" clue and it scored, which by A04's and A06's own reads closed teal's sixth word and the completion bonus (#468, #499, #505). Teal had already banked planet and satellite on "orbit" and glacier and tractor on "slow" (#133, #361, #367). (#133, #361, #468, #499, #505)
- **Fog guesses repeatedly killed turns.** A03 guessed lemon on "evergreen" and it came up fog, ending amber's turn (#201, #226). Teal's "flame" turn died on lantern (#262, #307), "kitchen" on kettle (#682, #683), and "sea" on ocean (#1011, #1044). (#201, #226, #262, #307, #682, #683, #1011, #1044)
- **Keepers watched teammates walk into wrong guesses they could not warn off.** A04 knew lantern was fog but had no chat access as keeper during the game (#252, #253). A05 heard A06 advise sail on "harbor" while knowing sail was amber (#779, #780), and A06 heard A05 advise pillow while knowing pillow was amber (#1219, #1220). (#252, #253, #779, #780, #1219, #1220)
- **Amber's seeker guessed fern on teammate advice and handed teal a point.** A02 advised fern then cactus for "plant" 2 (#1562, #1576), and A03 guessed fern as instructed (#1580). Fern came back teal, so teal scored and amber's clue ended early (#1604). (#1562, #1576, #1580, #1604)
- **Amber's "red" pair was the one clean double of the late game.** A01 suggested tomato then ember and A02 called tomato and then ember, both landing amber for the bonus (#1027, #1034, #1050). A03 and A02 both recorded the two-for-two (#1067, #1100). (#1027, #1034, #1050, #1067, #1100)

## Problems

1. **The run never reached the story: zero submissions, submissions and levels all empty.** The computed facts show 0 correct and 0 wrong submissions, no level solved, and every resident stuck on level 1 for all 13 minutes. The entire run was spent in lanterns rounds that the harness did not turn into scored submissions. (#1682)
2. **Keepers were locked out of team chat during play and could only watch errors.** A04 says it cannot post as keeper to warn A06 about lantern (#252), A05 cannot correct A06 on sail (#779), and A06 cannot correct A05 on pillow (#1219). The city recorded 0 board posts and 0 DMs in the facts, so no keeper correction ever reached a caller. (#252, #779, #1219)
3. **Seekers' advice was taken on trust and produced self-inflicted fog or wrong-team guesses.** A02's plant advice led A03 straight into a teal word (#1580, #1604), and A05's sea advice pointed A04 at ocean (#995, #1011). The advice loop is unverified guesswork, so one seeker can sink the caller's turn. (#995, #1011, #1580, #1604)
4. **Residents repeatedly declared there was nothing to do and ended turns idle.** Many turns open with a seeker noting it is not the caller and closing without action, e.g. #112, #233, #426, #593, #990, #1099. With six residents and one caller per clue, most of the roster idles on most turns. (#112, #233, #426, #593, #990, #1099)
5. **The gamemaker took no actions for the whole run.** The facts table records no gamemaker actions and zero gamemaker cost, so nothing in the harness steered, corrected, or ended the lanterns play; the run only stopped at the referee's minute 13 (#1682). (#1682)

## Optimizations

- **Let keepers post one warning per clue like seekers.** Give keepers the same post access as seekers so a keeper can flag a fog or enemy word before the caller guesses; this addresses the locked-out warnings at #252, #779 and #1219. Cap it at one post so it stays advice, not control. (#252, #779, #1219)
- **Require the seeker's advice to be validated before it is posted.** Add a cheap check step so a seeker's suggested word is only posted if it is not already revealed or known fog; this addresses the plant/sea advice that cost turns (#1580, #1604, #995, #1011). (#995, #1011, #1580, #1604)
- **Put the caller and the two remaining guesses in one message so idle seats have work.** Have seekers vote on the caller's next guess or track revealed words, so turns are not closed with 'I have no task' (#112, #233, #426, #990). This turns five idle seats into a small checking panel that can catch fog before it is guessed. (#112, #233, #426, #990)
- **Give the gamemaker explicit round-steering duties.** The gamemaker registered zero actions, leaving play to drift until the referee ended it at minute 13 (#1682). Assign it the job of rotating turns, announcing fog results and closing a lanterns round cleanly. (#1682)
- **Separate lanterns play from level progress in the scoring used for the report.** The facts show no level-ups and zero submissions even though residents made dozens of revealed words (#499, #505, #1067). Either report lanterns points as the scored metric or map them to level progress so the run is not recorded as a total stall. (#499, #505, #1067)

## Loophole candidates

1. **Callers stopped guessing after the safe word instead of risking a second, protecting points.** (residents) A03 deliberately stopped after falcon rather than risk sail (#727, #740, #757), and A02 stopped after tomato before ember was confirmed (#1050). Stopping early converts the clue into a guaranteed one point and denies the other team fog penalties, which is the safer path than the bonus the clue is designed to reward. (#727, #740, #757, #1050)

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 21: event "clue_given" (seq 21) does not match its schema
- line 22: event "clue_intent" (seq 22) does not match its schema
- line 32: event "team_post" (seq 32) does not match its schema
- line 45: event "team_post" (seq 45) does not match its schema
- line 47: event "clue_word_revealed" (seq 47) does not match its schema
- line 63: event "clue_word_revealed" (seq 63) does not match its schema
- line 64: event "clue_closed" (seq 64) does not match its schema
- line 74: event "team_post" (seq 74) does not match its schema
- line 82: event "clue_given" (seq 82) does not match its schema
- line 83: event "clue_intent" (seq 83) does not match its schema
- line 96: event "team_post" (seq 96) does not match its schema
- line 105: event "team_post" (seq 105) does not match its schema
- line 107: event "clue_word_revealed" (seq 107) does not match its schema
- line 126: event "clue_word_revealed" (seq 126) does not match its schema
- line 127: event "clue_closed" (seq 127) does not match its schema
- line 129: event "team_post" (seq 129) does not match its schema
- line 146: event "clue_given" (seq 146) does not match its schema
- line 147: event "clue_intent" (seq 147) does not match its schema
- and 193 more
