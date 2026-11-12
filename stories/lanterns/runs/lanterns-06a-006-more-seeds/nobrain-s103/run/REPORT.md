# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns-nobrain` |
| Seed | 103 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #3 to #1569 (1385 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end); A05 on level 1 from minute 0 for 13 minutes (to the end); A06 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.047 USD for this run (competitors 0.047, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0029 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

- **All six residents stall on level 1 for the whole 14-minute run with no submissions** The computed facts show A01-A06 each stuck on level 1 from minute 0 to minute 13, and 0 correct and 0 wrong submissions. The run ends at #1569 without a single accepted answer. (#1569)
- **Amber keeper A01 plans a 'landscape' clue hitting mountain and river but never gets points** A01 reasons through the landscape words at #13 and A02 guesses mountain and river at #42/#66, yet the standings show no level-ups for anyone. The intended clue-seek sequence runs but the run still ends with zero levels solved. (#13, #42, #66)
- **A01 privately acknowledges losing 3 points on 'Yacht'** At #816 A01 states 'I lost 3 points on Yacht, and I was in the wrong there', which is the only scored guess event visible in reasoning. No transfer or point record backs it in the computed facts. (#816)
- **Late game amber lands plank on the 'walk' 2 clue and queues maze** A03 guesses plank at #1510 and A01 confirms plank is amber and maze is next at #1521. A02 endorses the maze plan at #1553, but the referee ends the run at #1569 before maze resolves. (#1510, #1521, #1553, #1569)
- **Teal wastes a late turn on 'wood' 1 with piano, which comes up fog** A05 picks piano for the wood 1 clue at #1146, and A06 records that piano was fog at #1172. This repeats an earlier teal miss where fence was fog (#733) on the same theme. (#733, #1146, #1172)

## Problems

1. **The run produces no solved levels and no submissions at all** Computed facts show every resident stuck on level 1 for 13 minutes, 0 correct and 0 wrong submissions, and 0 transfers. The story cannot be evaluated when no one ever submits. (#1569)
2. **Residents burn turns on standing-by and 'nothing to do' reasoning instead of acting** Many turns end with 'no task this turn' statements, e.g. A03 at #93, A06 at #268, A05 at #866. Filling turns with passive acknowledgements leaves no time for the guesses the run needs. (#93, #268, #866)
3. **Residents act on facts they say they cannot see or should not see** A02 at #513 says it is reading a team chat message it 'wasn't supposed to be able to see' as keeper, and A03 claims it cannot see owners at #489. Ownership and chat visibility rules are clearly leaking to the wrong roles. (#489, #513)
4. **Ownership facts are reported in reasoning that the owning team cannot verify** A05 at #732 says 'fence is fog, not the answer' and 'A04 should guess whistle instead', a fact only the keeper should hold, yet cannot post it. This splits information so the caller never learns what the keeper knows. (#732, #733)
5. **Repeated wrong theme guesses show the clue mechanics push teams into fog** Teal guesses fence (#737), bamboo (#1055 reported amber at #1084), and piano (#1146-#1172), with fence and piano both fog. The clue-word matching keeps sending callers to fog words rather than their targets. (#737, #1084, #1146, #1172)
6. **No gamemaker, classifier or label activity anywhere in the run** The facts show 0 gamemaker actions, 0 messages, 0 transfers and no labels over 1385 events. The harness produced no adjudication or narration to carry the story. (#1569)

## Optimizations

- **Add a hard per-turn action budget that forces a guess when the guess tool is open** Residents repeatedly end turns with 'no task this turn' while guess tools are available (#93, #268, #866). A turn that opens a guess tool should require either a guess or an explicit pass that is logged. (#93, #268, #866)
- **Make keeper knowledge postable to the team or automatically revealed to the caller** A05 knows fence is fog but cannot post it (#732, #733). Allowing the keeper to push a one-word hint to the team chat would convert hidden ownership into usable guidance. (#732, #733)
- **Fix role-scoped chat so keepers never see messages they are told are hidden** A02 reports reading a message it was not supposed to see (#513) and A03 claims no ownership visibility (#489). The chat view should match the role's stated permissions exactly. (#489, #513)
- **Give callers a memory of which theme words already failed on fog** Teal repeats the wood theme and hits fog again with fence (#733) and piano (#1172). A per-team record of guessed fog words would stop callers recycling dead themes. (#733, #1172)

## Loophole candidates

1. **Players use private reasoning to state unseen ownership facts without any tool call** (residents) A05 asserts fence is fog and whistle is the target at #732 despite being unable to post, and A01 asserts plank is amber at #1521 before any reveal is confirmed. Stating keeper-only facts in reasoning lets residents act on information the game never disclosed to them. (#732, #1521)

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 16: event "clue_given" (seq 16) does not match its schema
- line 17: event "clue_intent" (seq 17) does not match its schema
- line 46: event "team_post" (seq 46) does not match its schema
- line 48: event "clue_word_revealed" (seq 48) does not match its schema
- line 55: event "team_post" (seq 55) does not match its schema
- line 69: event "clue_word_revealed" (seq 69) does not match its schema
- line 70: event "clue_closed" (seq 70) does not match its schema
- line 78: event "clue_given" (seq 78) does not match its schema
- line 79: event "clue_intent" (seq 79) does not match its schema
- line 109: event "team_post" (seq 109) does not match its schema
- line 130: event "team_post" (seq 130) does not match its schema
- line 132: event "clue_word_revealed" (seq 132) does not match its schema
- line 150: event "clue_word_revealed" (seq 150) does not match its schema
- line 151: event "clue_closed" (seq 151) does not match its schema
- line 160: event "clue_given" (seq 160) does not match its schema
- line 161: event "clue_intent" (seq 161) does not match its schema
- line 187: event "team_post" (seq 187) does not match its schema
- line 197: event "team_post" (seq 197) does not match its schema
- and 164 more
