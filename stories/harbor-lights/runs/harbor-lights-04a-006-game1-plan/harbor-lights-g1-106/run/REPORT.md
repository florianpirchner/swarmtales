# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-g1` |
| Seed | 106 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 6 (referee) |
| Counted | events #2 to #822 (732 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.051 USD for this run (competitors 0.051, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0050 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 7 of 7 minutes without a submission; longest without one: minutes 0-6 (7) |
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

- **A01 writes the crew's first strategy brain before any game starts** A01, acting as captain, saves brain version 1 (116 words) with rank signals meaning play-now and suit signals meaning keep, then cannot revise it because writeBrain leaves its tool list (#92, #100). The convention is adopted without dispute, so the whole run hinges on a rule about when a signal means play. (#53, #77, #81, #92, #100)
- **Signals meant as keep are read as play-now, and play stalls around Cobalt 2** A01 signals 'Cobalt' to A03 (#189 context at #193) while Cobalt 2 in A03 slot 2 is the next card; under the brain a suit signal means keep, so A03 passes on a playable card (#246). A02 in turn treats A03's Cobalt signal as keep on its own slot 4 (#252). (#193, #216, #246, #252)
- **A01 plays a blind slot and takes the crew's only strike** With no known playable card and no signals left, A01 plays slot 4 blind and it misfires as Moss 6 (#355, #356). This is the run's single strike, taken on minute 2. (#344, #355, #356)
- **Crew recovers and chains plays across the middle minutes** From minute 2 to 5 the residents light a series of cards in turn: Amber 3 by A01 (#413), Amber 4 by A02 (#484), Amber 5 by A04 (#489), Rose 3 by A02 (#654), Cobalt 4 and Rose 4 by A03 (#670, #720), Moss 5 by A04 (#742). Repeated discards of dead cards (Rose/Moss/Violet beyond lost ranks) keep signals flowing (#576, #617, #658). (#413, #484, #489, #654, #670, #720, #742)
- **A03's signal is refused because it acted out of turn** A03 tries to giveSignal and the city refuses with NOT_YOUR_TURN because it is A04's turn (#539); A03 then loses the action and waits a full round (#563, #564). This is the run's only tool error and the only REFUSED line. (#539, #563, #564)
- **Run ends mid-turn with 19 cards lit and nobody stuck** The referee ends the run at minute 6 (#822) while A01 is planning to spend its last two cards (#806). No level is solved, no submission is made, and the quiet-minute count spans the whole run. (#802, #806, #822)

## Problems

1. **Brain convention about suit signals conflicts with the board and costs plays** The brain says a suit signal means keep (#100), but the board repeatedly holds the next-needed card of that suit, so residents correctly follow the rule and decline playable cards (#246, #252). The rule, not the players, is producing the hesitation. (#100, #193, #246, #252, #428)
2. **Zero submissions across the entire run** The computed facts show 0 correct and 0 wrong submissions and a submission-quiet stretch of minutes 0-6. The residents play cards and discard all run, so the level never resolves and standings stay unknown. (#802, #806, #822)
3. **Blind plays and risky guesses are not discouraged by the scoring** A01 plays an unknown slot and misfires (#355, #356), and later weighs a coin-flip play on slot 1 (#735, #776). The only stated penalty noted is '3 points' for a misfire (#417), which is cheap relative to the pace of play. (#355, #356, #417, #735, #776)
4. **writeBrain window closes before the agreed amendment can be saved** A01 identifies a needed tweak to the convention but writeBrain has dropped from its tool list, so the agreed change can only be described in chat (#92). The strategy artifact cannot be maintained during play, so the first draft is binding all run. (#92, #100, #107)
5. **Signals are a scarce shared resource spent on redundant or self-aimed hints** Uses include telling A03 about Cobalt 5 twice (#757 then #784), and the counter drifts between 0 and 2 of 6 depending on the round (#423, #473, #629). Scarcity plus ambiguity pushes residents to discard more than they play. (#423, #473, #629, #757, #784)

## Optimizations

- **Define rank vs suit signal semantics against the current tower state, not a fixed rule** Because the fixed rule in #100 caused missed plays at #246 and #252, the brain should say a suit signal means 'play if it is the next card, else keep'. This removes the contradiction between the convention and the next-needed card. (#100, #246, #252)
- **Keep a writeBrain window open through the game or allow mid-game amendments** A01 could not save the agreed tweak after #92 because writeBrain disappeared. Reopening the window at each retro or allowing a small amendment budget would let the crew fix the rule it already agreed on. (#92, #100, #107)
- **Make signals targeted at playable cards and stop counting them as scarce** Duplicated hints on A03 Cobalt 5 at #757 and #784 wasted a signal, and the 0-to-2 drift (#423, #473, #629) makes the crew discard instead of playing. Give a stronger incentive to play known-playable cards or refund signals for accurate hints. (#423, #473, #629, #757, #784)
- **Add a turn indicator before the tool call to avoid NOT_YOUR_TURN losses** A03's signal was refused at #539 and it lost the round. Showing whose turn it is in the resident's context, or queueing the action, would stop this tool error. (#539, #563, #564)
- **Give residents the level-clear condition explicitly and track submissions** There were 0 submissions while the crew lit 19 cards (#802). Reminding residents per turn how to submit, or auto-submitting when all cards are known, would convert play into at least one submission attempt. (#802, #806, #822)

## Loophole candidates

1. **Dead cards are discarded for free to farm signals** (residents) Residents repeatedly discard cards that can never light (Moss 7 after Moss 6 is lost #576, Rose 6 and Rose 7 after Rose 5 is lost #617, #658, Violet 7 #564) specifically to win a signal back. This is a legal but unintended cheap path to signal tokens. (#564, #576, #617, #658)
2. **Blind play on unknown slots accepts a small misfire penalty for a chance at progress** (residents) A01 plays an unknown slot (#355) and later weighs another coin-flip (#735, #776), treating the 3-point misfire penalty as a worthwhile bet rather than a deterrent. The scoring lets residents use blind plays as a low-risk lottery. (#355, #417, #735, #776)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 48: event "team_post" (seq 48) does not match its schema
- line 56: event "brain_written" (seq 56) does not match its schema
- line 57: event "retro_closed" (seq 57) does not match its schema
- line 64: event "team_post" (seq 64) does not match its schema
- line 71: event "team_post" (seq 71) does not match its schema
- line 88: event "team_post" (seq 88) does not match its schema
- line 95: event "team_post" (seq 95) does not match its schema
- line 134: event "cards_dealt" (seq 134) does not match its schema
- line 135: event "game_started" (seq 135) does not match its schema
- line 136: event "deal_revealed" (seq 136) does not match its schema
- line 146: event "signal_given" (seq 146) does not match its schema
- line 161: event "card_played" (seq 161) does not match its schema
- line 162: event "card_drawn" (seq 162) does not match its schema
- line 172: event "signal_given" (seq 172) does not match its schema
- line 184: event "card_played" (seq 184) does not match its schema
- line 185: event "card_drawn" (seq 185) does not match its schema
- line 196: event "signal_given" (seq 196) does not match its schema
- line 203: event "signal_given" (seq 203) does not match its schema
- line 219: event "signal_given" (seq 219) does not match its schema
- and 70 more
