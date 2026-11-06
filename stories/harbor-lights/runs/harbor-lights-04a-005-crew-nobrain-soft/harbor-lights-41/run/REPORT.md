# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #2 to #2153 (1900 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.172 USD for this run (competitors 0.172, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0053 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 5, TOOL_LOCKED 3, NO_SIGNALS 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The team settled a signal convention in the first minute and played the whole run by it.** A03 and A04 argued over whether a rank signal means "playable now" or "not yet" and A01 adopted A04's reading (#58, #65); every later play followed that rule, e.g. A04 playing slot 4 on a "1" signal (#163) and A01 treating "2" as playable (#198). The fiction of a shared brain was carried by A01 writing v1 and later A02 writing v2 and A03 v3 as retro captain (#85, #816, #1468). (#58, #65, #163, #816, #1468)
- **Both strikes and most discarded cards came from blind guesses, not from signalled plays.** A04's blind play of Violet 6 was a misfire and the first strike (#352, #353), and a later blind play of Rose 7 at minute 7 cost another strike (#1293). A03 discarded Cobalt 7 and Amber 4 with nothing known about them (#327, #390), and A01 discarded a card that was actually playable Amber 3 (#453). (#327, #352, #353, #390, #453, #1293)
- **Each retro produced a new brain version with the same lesson: do not discard unknowns.** After game 1, A02 saved brain v2 with the rules "discard only provably dead cards, signal a known-playable teammate card before any discard, keep one signal in reserve" (#816). After game 2, A03 wrote brain v3 with "never discard an unknown card just to refill a signal" (#1468), yet A02 and A04 still discarded unknowns in game 3 (#1726, #1812). (#816, #1468, #1726, #1812)
- **Residents repeatedly burned signals to restate information a teammate already had.** A02 spent a signal telling A03 about Moss 4 which A03 already knew (#461), and A01 signalled A02 rank "6" on a card A02 could already place (#716). A04's warning was explicit: "a signal to A03 would be redundant" (#878). (#461, #716, #878)
- **The endgame stalled with playable cards visible on the table and no signals left.** At minute 10 A04 knew A03's Amber 2 was playable but reported "no signals are left... no one can tell them its rank" (#1678), and A03's own attempt to play was refused as NOT_YOUR_TURN (#1709). A03 later sat with an empty hand and a playable Cobalt 2 at A02, only able to watch (#2116). (#1678, #1709, #2116)
- **A04's stated core move, playing blind when nothing better exists, repeatedly lost points.** A04 reasoned that a one-in-three shot at Cobalt 5 was worth playing and misfired on Violet 4 (#602, #603, #629). Later A04 misfired Rose 7 the same way (#1293), and in game 3 admitted a blind play was "a coin flip" but discarded unknowns anyway (#1905, #1812). (#602, #603, #629, #1293, #1905)

## Problems

1. **No level was ever solved and all four residents sat on level 1 for the whole run.** The facts show A01-A04 stuck on level 1 from minute 0 to 13 with zero submissions, zero transfers and zero points; the final game-3 state also never closed before the referee ended at minute 13 (#2153). This is the central failure of the run. (#2153)
2. **Residents burned turns on off-turn tool calls, producing five NOT_YOUR_TURN refusals.** A03 tried to play on A02's turn (#1709) and again to give a signal on A02's turn (#1820) and on A04's turn (#2082); A02 tried to signal on A04's turn (#1900); A03 tried to discard on A02's turn (#1993). Each refusal is a wasted action in a 13-minute run. (#1709, #1820, #1900, #1993, #2082)
3. **Residents could not use postTeam in the play phase, so the shared brain had no live channel.** A03 was refused TOOL_LOCKED three times when trying to post to the team during game 3 (#1508, #1579, #1631). The brain was written in retros but residents could not coordinate in-play except through signals. (#1508, #1579, #1631)
4. **Signal economy collapsed to zero and residents had no legal way to point at playable cards.** A04 gave a signal and the log immediately noted "signals show 0 of 6" (#602), and A02's later giveSignal was refused NO_SIGNALS (#1983). A03 and A04 then had to discard to refill, which the brains explicitly forbade for unknowns (#1726, #1983). (#602, #1726, #1983)
5. **Residents reasoned about hidden hands they should not have seen and contradicted the log.** A01 "signalled A02 on rank 6, which touches their Rose 6 (slot 1)" and played slot 3 knowing it was Rose 5 (#716, #1986), and A04 reasoned its hand "must be exactly Amber 5, Rose 7, Violet 2 and Violet 7" (#1905). This private certainty about other seats' cards undercuts the information game the story intends. (#716, #1905, #1986)
6. **The gamemaker took no actions and the run relied entirely on the competitor.** The facts record zero gamemaker actions and zero classifier labels, so no beat, obstacle or twist was injected; the only external event is the referee ending the run (#2153). (#2153)

## Optimizations

- **Give residents a legal in-play signalling fallback when signals hit zero.** Problem: playable cards sat visible while no one could signal. Propose a cheaper "point" action (cost one turn, no token) or a one-token refill on a known-playable discard, since #1678 and #1983 show the deadlock. (#1678, #1983)
- **Reject off-turn tool calls before the model commits an action.** Problem: five NOT_YOUR_TURN refusals wasted turns. Propose the harness to expose the current seat in the state and reject blind calls client-side, citing #1709 and #1993. (#1709, #1993)
- **Open a limited in-play team channel or make postTeam legal in play.** Problem: TOOL_LOCKED blocked A03 three times, so the agreed brain could not be updated mid-game (#1508, #1579, #1631). Propose one post per game per resident, or a shared bulletin board that signals alone cannot replace. (#1508, #1579, #1631)
- **Make the brain change visible in behaviour or stop writing new versions.** Problem: v2 forbade discarding unknowns (#816), yet A02 and A04 discarded unknowns in game 3 (#1726, #1812). Propose enforcing the resident's own written rule as a soft constraint, or flagging when a resident acts against its brain so the retros have teeth. (#816, #1726, #1812)
- **Have the gamemaker inject a beat to break long quiet stretches.** Problem: 14 of 14 quiet minutes with no submissions and no gamemaker actions (#2153). Propose a timed nudge (a hint, a forced signal refill, or a level-up challenge) so a stalled run still produces a story. (#2153)

## Loophole candidates

1. **Residents reasoned about other seats' exact cards from private state, skipping the deduction game.** A01 named A02's Rose 6 before signalling it (#716) and A04 announced its exact remaining hand (#1905); the intended game is to infer from signals, not to read hidden hands. By: residents. (#716, #1905)
2. **Signals were spent restating already-known cards instead of opening new plays.** A02 signalled A03 about Moss 4 which A03 already knew (#461), and A01 signalled rank 6 on a card A02 could already place (#716), turning the signal token into a no-op. By: residents. (#461, #716)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 47: event "team_post" (seq 47) does not match its schema
- line 54: event "team_post" (seq 54) does not match its schema
- line 61: event "team_post" (seq 61) does not match its schema
- line 68: event "brain_written" (seq 68) does not match its schema
- line 69: event "retro_closed" (seq 69) does not match its schema
- line 81: event "team_post" (seq 81) does not match its schema
- line 92: event "team_post" (seq 92) does not match its schema
- line 125: event "cards_dealt" (seq 125) does not match its schema
- line 126: event "game_started" (seq 126) does not match its schema
- line 127: event "deal_revealed" (seq 127) does not match its schema
- line 136: event "signal_given" (seq 136) does not match its schema
- line 146: event "signal_given" (seq 146) does not match its schema
- line 157: event "card_played" (seq 157) does not match its schema
- line 158: event "card_drawn" (seq 158) does not match its schema
- line 166: event "card_played" (seq 166) does not match its schema
- line 167: event "card_drawn" (seq 167) does not match its schema
- line 183: event "signal_given" (seq 183) does not match its schema
- line 201: event "card_played" (seq 201) does not match its schema
- line 202: event "card_drawn" (seq 202) does not match its schema
- and 233 more
