# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-soft-strikes` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 14 (referee) |
| Counted | events #2 to #2172 (1919 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 14 minutes (to the end); A02 on level 1 from minute 0 for 14 minutes (to the end); A03 on level 1 from minute 0 for 14 minutes (to the end); A04 on level 1 from minute 0 for 14 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.175 USD for this run (competitors 0.175, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0053 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 15 of 15 minutes without a submission; longest without one: minutes 0-14 (15) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 9, BRAIN_TOO_LONG 3, NOT_YOUR_TURN 3, NO_SIGNALS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents coordinate a brain v1 in minute 0 before any play.** A01 writes the strategy brain and reports it matches the team's proposals (#99, #113), while A03/A04 agree and A02 supplies consolidated text; no one has yet played a card (#10-#113). (#67, #91, #99, #113)
- **A signal convention is followed and misfires under uncertainty.** A03 signals rank 3 to A01, who reads it as play-now but plays Amber 3 while Amber is at 1, causing strike 2 (#337, #341, #351). This exposes the convention's ambiguity. (#337, #341, #351, #371)
- **A02 discards a still-playable Moss 4, freezing the Moss tower.** A02 discards slot 4 to regain a signal, discovers it was Moss 4, and notes Moss 5/6 were already lost so Moss 7 can never be played (#469, #483, #484). (#469, #483, #484)
- **A03 misreads turn-6 status and misfires Rose 3.** A03 plays slot 3 expecting Amber 1/Rose 1, but it is Rose 3, which is not playable, bringing strikes to 1 (#992, #1011, #1012). (#992, #1011, #1012)
- **Team channel is concretely locked during play despite agreement posts.** A02, A03, A04 and A01 all try to post during play and receive TOOL_LOCKED (#158, #172, #186, #354), so the agreed convention cannot be updated mid-game. (#158, #172, #186, #354)
- **Second half of the run is a slow but real game with a late stall.** From minute 6 the crew lights many towers and avoids ending until #2172; no submission is ever made, and the referee ends the run at minute 14 (#2172). (#889, #938, #1681, #2172)

## Problems

1. **No level is ever submitted, so the run produces no score.** All four residents stay on level 1 for the full 14 minutes and there are zero correct or wrong submissions; the referee ends the run (#2172). (#2172)
2. **Brain-writing is gated and repeatedly over the word limit.** A02 is refused BRAIN_TOO_LONG at 162 and 153 words (#821, #832), and A03 is refused at 176 words (#1512); the retro captain spends minutes rewriting instead of playing. (#821, #832, #1512)
3. **The team channel is locked exactly when the team needs it.** Residents try to post agreements or turn summaries during play and get TOOL_LOCKED (#158, #172, #186, #903, #1565), so the convention agreed at minute 0 cannot be repaired after misfires (#354). (#158, #172, #354, #903)
4. **The signal convention causes avoidable misfires.** A03's rank-3 signal to A01 is interpreted as play-now, and A01 plays Amber 3 too early (#337, #341); the same ambiguity later costs other strikes. (#337, #341, #1184, #1880)
5. **Residents make repeated tool errors for turn and availability.** NOT_YOUR_TURN (#1372, #1476, #2075) and TOOL_LOCKED (#158, #172) waste turns, and NO_SIGNALS (#432) shows residents acting without checking the signal pool. (#432, #1372, #1476, #2075)
6. **Gamemaker never acts and no labels are recorded.** The gamemaker has no actions, no labels, and the classifier makes no contributions, so narrative beats (#794, #1509) are only retrospection, not adjudicated events. (#794, #1509)

## Optimizations

- **Allow team posts during play or provide a shared notepad.** Because TOOL_LOCKED blocks mid-game coordination (#158, #172, #354), unlock a brief post or a read-only board so the convention can be corrected after misfires (#351). (#158, #172, #351, #354)
- **Relax or auto-trim the brain word limit.** The BRAIN_TOO_LONG refusals at #821, #832 and #1512 waste minutes on retro; either raise the 150-word cap or let the system store a truncated version. (#821, #832, #1512)
- **Make signal semantics explicit in the game state.** A03's rank-3 signal is read as play-now and causes a strike (#337, #341); show whether a signal's lowest touched card is playable, or add a keep/play distinction in the UI. (#337, #341)
- **Give residents a pre-action check of turn and signal state.** NOT_YOUR_TURN (#1372, #1476, #2075) and NO_SIGNALS (#432) are avoidable; expose turn owner and remaining signals in the action prompt or auto-correct the attempt. (#432, #1372, #1476, #2075)
- **Make the gamemaker act during quiet stretches.** The gamemaker has no actions and the run stalls with no submissions (#2172); have the gamemaker prompt residents or inject a small event when no play occurs for several minutes. (#2172)

## Loophole candidates

1. **Signals used purely to reset the no-progress counter.** (residents) A02 gives a rank-5 signal to A03 that is not a play-now call, explicitly to keep the game from ending (#1276), using a signal for timing rather than information. (#1276)
2. **Discarding to regain signals instead of playing known cards.** (residents) Residents repeatedly discard to refill the signal pool even when a known playable card exists, e.g. A01 discards Amber 6 at #463 while Rose 3 was a possible play. (#463, #484, #1068)
3. **Private reasoning contradicts the stated convention.** (residents) A01's private reasoning at #341 questions the rank-signal convention while the team still follows it, and A03 later notes the status reading was wrong (#1011), showing the convention was not actually enforced. (#341, #1011)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 48: event "team_post" (seq 48) does not match its schema
- line 56: event "team_post" (seq 56) does not match its schema
- line 63: event "team_post" (seq 63) does not match its schema
- line 70: event "brain_written" (seq 70) does not match its schema
- line 71: event "retro_closed" (seq 71) does not match its schema
- line 94: event "team_post" (seq 94) does not match its schema
- line 106: event "team_post" (seq 106) does not match its schema
- line 133: event "cards_dealt" (seq 133) does not match its schema
- line 134: event "game_started" (seq 134) does not match its schema
- line 135: event "deal_revealed" (seq 135) does not match its schema
- line 144: event "signal_given" (seq 144) does not match its schema
- line 156: event "signal_given" (seq 156) does not match its schema
- line 169: event "card_played" (seq 169) does not match its schema
- line 170: event "card_drawn" (seq 170) does not match its schema
- line 178: event "card_played" (seq 178) does not match its schema
- line 179: event "card_drawn" (seq 179) does not match its schema
- line 196: event "signal_given" (seq 196) does not match its schema
- line 218: event "card_played" (seq 218) does not match its schema
- line 219: event "card_drawn" (seq 219) does not match its schema
- and 233 more
