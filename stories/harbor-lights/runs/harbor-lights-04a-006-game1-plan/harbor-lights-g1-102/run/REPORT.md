# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-g1` |
| Seed | 102 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #2 to #711 (625 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.051 USD for this run (competitors 0.051, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0022 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The crew agreed on signal conventions before the first game and A01 wrote them into the brain.** A02, A03 and A04 converged on one meaning for rank and suit signals and delegated the brain to A01, who saved it as version 1 (#58, #65, #89, #112). The whole run then used that shared vocabulary to point at playable cards. (#58, #65, #89, #112)
- **The first real play was a misfire: A04 played a blind Violet 2.** A04 played slot 2 expecting Amber 2 and got Violet 2, taking a strike and losing the card (#264, #265). It recovered immediately by playing the actual Amber 2 on the following turn. (#264, #265)
- **Discards destroyed needed cards, blocking the Violet and Moss towers.** A02 discarded Violet 3 (#294), A03 discarded Moss 3 (#233) and then Moss 4 (#366), so Violet needed 1 before anything else and Moss needed 5. A04 later discarded Cobalt 4 while it was the one playable card in hand (#524). (#233, #294, #366, #524)
- **A03's Rose 1 unlocked a chain of Rose plays across the team.** A02 signalled A03 that slot 3 was a Rose 1 (#510); once lit, Rose 2, Rose 3 and A04's Rose 4 became reachable (#599, #664). This was the run's clearest coordinated sequence. (#510, #599, #664)
- **Several residents held back from blind plays to avoid strikes.** A01 repeatedly declined to play hidden 4s because only one of three possibilities was unplayable (#456), and A02 declined blind plays on unknown slots for the same reason (#404, #583). The result was a cautious, low-risk style with few misfires after minute 1. (#404, #456, #583)
- **A04's final signal was refused as out of turn and the run ended with no level solved.** A04 tried to signal a 5 to A02 but got NOT_YOUR_TURN (#699), and the referee ended the run at minute 5 (#711) with no level solved, no submissions and zero transfers. (#699, #711)

## Problems

1. **No submissions, no level-ups and no transfers across the whole run.** The facts record 0 correct and 0 wrong submissions, no levels solved and 0 transfers, with 6 quiet minutes (#711). The residents spent every turn on signals, discards and single plays that never closed a level. (#711)
2. **The residents were unsure of the rules for much of minute 1.** A02, A03 and A04 debated whether slots were known cards or guesses, whether a rank signal covers all suits, and whether a signal or a direct play was safer (#51, #147, #185, #193). That uncertainty cost a misfire (#264) and several cautious passes. (#51, #147, #185, #193, #264)
3. **Residents discarded needed cards instead of signalling.** A02, A03 and A04 each burned cards for signals that turned out to be needed: Violet 3 (#294), Moss 3 (#233), Moss 4 (#366) and Cobalt 4 (#524). This permanently blocked the Violet and Moss towers and slowed the endgame. (#233, #294, #366, #524)
4. **The harness refused a legal-looking action on turn order.** A04's giveSignal at #699 was refused with NOT_YOUR_TURN because it was A02's turn (#699). The run's one tool error shows residents can lose a planned action to turn ordering they cannot see. (#699)
5. **No messages, no board posts and no gamemaker actions were recorded.** The facts show 0 DMs, 0 board posts, 0 group posts and no gamemaker actions, so the only visible coordination was through signals. The story's social layer (board posts, DMs) never appeared in the log. (#58, #89, #510)

## Optimizations

- **Make level progress measurable by the residents.** Residents kept asking whether a tower was lit or blocked (#253, #528), which suggests they lacked a clear progress readout. Expose the lit count and next-needed card per tower in the tool output so plays are not guesses. (#253, #528, #547)
- **Warn residents when a discard is a card the team still needs.** Several discards removed needed cards (#233, #294, #366, #524). A confirmation or a note that the card is playable or needed would have prevented these losses. (#233, #294, #366, #524)
- **Clarify turn order before signalling.** A04's signal was refused as out of turn (#699). Show whose turn it is and whether signalling is allowed now in the action response, so residents do not lose their action. (#699)
- **Teach the signal convention explicitly at start.** The residents spent minute 1 debating what a rank signal means (#51, #147, #185). Have the gamemaker or brain state the convention once, so play begins sooner. (#51, #147, #185)
- **Give residents a reason to use board posts and DMs.** The facts show no DMs and no board posts at all. If the story intends a social layer, add a task or reward for posting, or the residents will keep coordinating only through signals. (#58, #89, #510)

## Loophole candidates

1. **Residents avoided risk by passing instead of playing.** (residents) A01 and A02 repeatedly declined to play unknown cards, reasoning that a blind play carried too much misfire risk (#456, #583). Passing is a safe path that satisfies the rules but produces no progress, which kept the run at zero levels solved. (#456, #583, #711)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 46: event "team_post" (seq 46) does not match its schema
- line 54: event "team_post" (seq 54) does not match its schema
- line 61: event "team_post" (seq 61) does not match its schema
- line 68: event "team_post" (seq 68) does not match its schema
- line 76: event "brain_written" (seq 76) does not match its schema
- line 77: event "retro_closed" (seq 77) does not match its schema
- line 129: event "cards_dealt" (seq 129) does not match its schema
- line 130: event "game_started" (seq 130) does not match its schema
- line 131: event "deal_revealed" (seq 131) does not match its schema
- line 141: event "signal_given" (seq 141) does not match its schema
- line 150: event "signal_given" (seq 150) does not match its schema
- line 157: event "card_played" (seq 157) does not match its schema
- line 158: event "card_drawn" (seq 158) does not match its schema
- line 165: event "signal_given" (seq 165) does not match its schema
- line 172: event "card_played" (seq 172) does not match its schema
- line 173: event "card_drawn" (seq 173) does not match its schema
- line 181: event "signal_given" (seq 181) does not match its schema
- line 188: event "card_played" (seq 188) does not match its schema
- line 189: event "card_drawn" (seq 189) does not match its schema
- and 66 more
