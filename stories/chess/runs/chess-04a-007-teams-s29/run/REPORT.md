# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `chess-teams-p80` |
| Seed | 29 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 24 (referee) |
| Counted | events #3 to #2744 (2268 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 24 minutes (to the end); A02 on level 1 from minute 0 for 24 minutes (to the end); A03 on level 1 from minute 0 for 24 minutes (to the end); A04 on level 1 from minute 0 for 24 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.245 USD for this run (competitors 0.245, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0051 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 25 of 25 minutes without a submission; longest without one: minutes 0-24 (25) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 4, BRAIN_TOO_LONG 2, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents open with coordination, not chess** At minute 0 A02 and A04 only plan short team-chat replies about brain length and captaincy (#55, #62), and A01 reports the brain saved at 123 words (#109) before any move exists. The opening beat is governance of the brain, not play. (#34, #55, #62, #109)
- **Games 1 and 2 are actually played move by move under a rotating captain** Despite level 1, residents play a real Italian/Two Knights sequence through the referee: A04 plays 2...Nc6 (#156), A01 3.Bc4 and 4.O-O (#160, #243), A03 suggests and records Bc5 (#180, #228). Captains rotate by turn and the move tools lock for non-captains (#100, #155, #1634). (#156, #160, #180, #228, #1634)
- **A02's Nf5 blunder hands away the queen in game 1** A02 plays Nf5, opening the h5-e2 diagonal, and Black's Qh5xe2 wins the queen with no recapture; A02 itself calls it a serious error (#919) and material drops from 30–29 to 21–26 (#864, #919). A01 confirms the same collapse (#903). (#864, #896, #903, #919)
- **Residents fight over the brain and hit the word limit** After game 1 the team writes a 150-word brain but three writable attempts are rejected: A03 is TOOL_LOCKED (#1428), A02's brain is 167 words (#1444), A04's 171 words (#1469). A later save finally lands at version 2 with 149 words (#1495). (#1428, #1444, #1469, #1495)
- **A01 repeatedly proposes illegal moves** A01 tries e2e4 on a White-to-move position where e4 was listed as a legal pawn push (#756), then d8b6 when the c7 pawn blocks the diagonal (#2044); A02 also tries an illegal c7a7 blocked by b7 (#1037). The city refuses each, but the residents keep acting on unfounded plans. (#756, #1037, #2044)
- **Game 2 runs to the move cap into a king-and-pawn ending** After queens come off at Qxg5/hxg5 (#2109, #2119), the last minutes are pure king manoeuvring with A02 up against the 40-move cap (#2590, #2699, #2711). No submission ever occurs, so the game is decided on material at the cap (#1386, #2699). (#2109, #2119, #2590, #2699, #2711)

## Problems

1. **Zero submissions in 25 minutes: nobody ever sends a level answer** The run ends with 0 correct and 0 wrong submissions and 25 quiet minutes; residents spend every minute on chess moves and team chat (#109, #1422, #2620). Level 1 is never solved, so the core race of the story never starts. (#109, #1422, #2620)
2. **Brain-writing rule fought the residents three times** The 150-word cap rejected A02 (167 words, #1444) and A04 (171 words, #1469), and A03 couldn't write at all (#1428). Minutes of retro are spent on a formatting constraint rather than strategy. (#1428, #1444, #1469)
3. **Move legality errors show residents reasoning from hallucinated boards** ILLEGAL_MOVE hits A01 twice (#756, #2044) and A02 once (#1037); BRAIN_TOO_LONG twice and TOOL_LOCKED once. Residents often reconstruct positions from memory and disagree with the board (#442, #1673, #1801), which wastes turns. (#756, #1037, #1444, #2044)
4. **Captaincy and turn ownership are confused** A04 announces it is captain and plays (#143), then later admits uncertainty about whether it is still captain (#2076); A02 wonders whether A01 is describing another game (#171). The rotating-captain mechanic creates wasted turns and contradictory notes. (#143, #171, #2076)
5. **The gamemaker was entirely passive** The facts record no gamemaker actions, no labels, and no classifier output for a 25-minute run. Nothing external ever nudged residents toward levels or challenged their drift into endless chat. (#2744)

## Optimizations

- **Give residents an explicit level-1 objective at minute 0** Because no submission ever happened (#109, #2620), the opening prompt should state the level goal and a deadline, so the first minutes are spent on the level rather than on chat etiquette (#55, #62). (#55, #62, #109, #2620)
- **Enforce the brain limit as a form with a live word count** Two BRAIN_TOO_LONG refusals (#1444, #1469) plus one TOOL_LOCKED (#1428) burned a whole retro. Validate length before submitting, or let any resident trim the draft instead of rejecting it. (#1428, #1444, #1469)
- **Have the harness display legal moves before a move is attempted** Both ILLEGAL_MOVE cases (#756, #2044) were on positions the resident misread. Including the legal-move list in the turn prompt would cut refusals and the board-reconstruction tangents (#442, #1673). (#442, #756, #1673, #2044)
- **Make captaincy a single authoritative status line** Confusion over who is captain (#143 vs #2076, #171) causes turns to be spent waiting or advising. A per-move captain banner in the prompt would stop that. (#143, #171, #2076)
- **Have the gamemaker intervene when the run is silent** The gamemaker took no actions while the run had 25 silent minutes. A scheduled nudge (for example at minute 10) pointing at the level would keep the story on its intended track. (#2744)

## Loophole candidates

1. **Residents treat casual chat and retro as progress** (residents) A02 and A04 spend the opening on six-post-limit replies about team style (#55, #62) and later on retros (#1397, #1422) while no level is attempted. The chat mechanic gives cover for never engaging the actual task. (#55, #62, #1397, #1422)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 45: event "team_post" (seq 45) does not match its schema
- line 51: event "team_post" (seq 51) does not match its schema
- line 58: event "team_post" (seq 58) does not match its schema
- line 65: event "team_post" (seq 65) does not match its schema
- line 76: event "team_post" (seq 76) does not match its schema
- line 82: event "brain_written" (seq 82) does not match its schema
- line 83: event "retro_closed" (seq 83) does not match its schema
- line 89: event "brain_written" (seq 89) does not match its schema
- line 90: event "retro_closed" (seq 90) does not match its schema
- line 104: event "team_post" (seq 104) does not match its schema
- line 111: event "game_started" (seq 111) does not match its schema
- line 119: event "move_played" (seq 119) does not match its schema
- line 120: event "move_scored" (seq 120) does not match its schema
- line 122: event "team_post" (seq 122) does not match its schema
- line 128: event "move_played" (seq 128) does not match its schema
- line 129: event "move_scored" (seq 129) does not match its schema
- line 136: event "move_played" (seq 136) does not match its schema
- line 137: event "move_scored" (seq 137) does not match its schema
- and 456 more
