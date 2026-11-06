# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-nobrain` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #4 to #1953 (1726 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.155 USD for this run (competitors 0.155, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0054 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NO_SIGNALS 2, TOUCHES_NOTHING 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The crew never solved a level, but the log shows two finished 'games' with lit counts.** No submission was ever made (0 correct, 0 wrong, quiet minutes 0-13), yet residents talk through 'Game 1' ending at 22 lit (#643, #648) and 'Game 2' at 23 lit (#1284, #1290). The run's own record ships no level-ups, so the only thing resembling progress is the residents' self-reported tallies. (#643, #648, #1284, #1290)
- **A signal economy mismatch caused repeated tool refusals.** A04's first signal was refused for touching nothing (#45), then A01 was refused for NO_SIGNALS at minute 2 (#394) while its status still showed signals available, and A04 discarded to 'get a signal back' (#1113). A01 hit NO_SIGNALS again at minute 9 (#1605). (#45, #394, #1113, #1605)
- **A04 was the crew's main opening engine.** A04's first actions were signals rather than plays (#58, #93) and it repeatedly held blind cards when uncertain (#384, #764, #872). Later it carried the scoring: Cobalt 3 (#440), Amber 3 (#508), Cobalt 4 (#546), Amber 4 (#604), Moss 6 (#1162), Amber 5 (#1210), then through minute 11 several lit 1s and 2s (#1343, #1417, #1456, #1542, #1765, #1860, #1894). (#58, #440, #508, #604, #1162, #1343, #1894)
- **A02 mis-discarded a playable card and later admitted it.** A02 discarded Rose 4 reasoning it was too uncertain, then wrote that it was the one card that could have lit (#370, #371) and repeated the confession as 'my biggest mistake' (#643). It later made the same class of error by pointing to Rose 7 rather than trusting the discard (#1747). (#370, #371, #643, #1747)
- **Misfires piled up to the strike limit and the residents played scared thereafter.** A03 misfired Rose 6 (#379), A04 misfired Moss 2 on A03 (#850) and A01 misfired Rose 7 (#460) and Moss 5 (#973), then Violet 7 (#1525). After each, the crew increasingly leaned on signals and discards rather than blind plays (#503, #1509, #1600). (#379, #460, #850, #973, #1525)
- **Residents openly disagreed with the official end-of-game count.** A03 says its own count after Amber 7 is 21, not 22, and proposes Cobalt 6 still in A01's hand was playable (#668); A02 concedes its own count was wrong (#1284). A01 flags its '17 signals' number as unverified (#648). (#648, #668, #1284)

## Problems

1. **The signal resource is described inconsistently, so residents cannot plan.** At minute 0 A04 loses a signal to TOUCHES_NOTHING (#45), then at minute 1 A02 says signals are at 1 (#180) and minute 2 signals hit 0 (#503) but A01 is refused NO_SIGNALS at #394 while its status says 0 of 6. The residents then play several turns assuming they have signals they cannot use (#1615, #1605). (#45, #394, #1605, #1615)
2. **The crew is stuck blind on many turns and burns actions on discards.** A01 plays/discards repeatedly without information: #130, #296, #427, #785, #876, #1560, #1626, #1901. A03 does the same (#159, #542, #961, #1434, #1597) and A02 discards a playable card (#371, #480). (#130, #296, #427, #785, #876, #1901)
3. **The scoring/game-count display does not match the log.** No level is ever reported solved (0 submissions), yet residents discuss 'Game 1' and 'Game 2' as finished with 22 and 23 lit (#643, #1284, #1290). The resident view of lit count (e.g. A03's 21 vs 22 at #668) does not match A02's reported figure (#642). (#642, #643, #1284, #1290)
4. **Tool errors wasted scarce turns.** NO_SIGNALS fires on A01 (#394, #1605) and TOUCHES_NOTHING on A04 (#45); the first came after an exhaustive signal search in the same minute (#58), suggesting the tool misread the signal pool. Neither error is explained in the log. (#45, #58, #394, #1605)
5. **The game gave residents no signal to submit at all.** Zero submissions across 14 minutes (facts: 0 correct, 0 wrong, quiet minutes 0-13); residents spent every minute on signals, discards and blind plays (#58, #371, #1509, #1894). No evidence of any submission attempt appears in the log. (#58, #371, #1509, #1894)
6. **Residents hold contradictory facts about the same hand.** A04 first reasons slot 4 is Moss 1 (#92), then slot 1 is Cobalt 1 (#163), then slot 3 can be Rose 4 or Violet (#1492), while A01 says slot 1 is Cobalt 6 (#1182). A01's hand is described as Amber 6, Cobalt 6, Moss 7, Violet 6 (#1049) then also as Amber 6, Cobalt 6, Moss 7, Violet 6 (#1049, #1567), with card swaps unaccounted. (#92, #163, #1182, #1492, #1567)
7. **A04's first action failed and cost the crew its earliest signal.** At minute 0 A04 gives a signal with no card touched, refused TOUCHES_NOTHING (#45), then says it uses a signal on A03 (#117) — a rule mismatch that echoes the earlier NO_SIGNALS confusion. (#45, #117)

## Optimizations

- **Make the signal budget a single source of truth checked before any hint.** The residents' counts disagree with the tool (facts 0 signals; NO_SIGNALS still fires at #394, #1605), which forces them to reason about a rule error. Compute the pool once and reject at the planning step before the model writes a hint. (#394, #1113, #1605)
- **Give residents a visible queue that separates 'signal' from 'discard'.** A01, A02, A03 and A04 all play or discard a slot in a turn where only signals were legal (e.g. #427, #785, #876, #1597), or explicitly say they must discard. A turn prompt telling the model exactly what action is allowed next would prevent the model from wasting turns on a category it cannot use. (#427, #785, #876, #1597)
- **Report solved levels and the lit count from the same source.** The residents report 22 and 23 lit (#643, #1284) while the run shows 0 submissions and no level-ups. A single authoritative 'lit cards' readout would have prevented the disputes at #668 and #1284, or made the conflict a genuine dispute rather than a bug. (#643, #668, #1284)
- **Reward recovering the hand fact rather than blind guessing.** A01 plays slot 1 at 50% for Violet 3 (#909) and plays #1525 as a misfire; A02's #480 discards a playable card. A simple 'known-playable here' prompt would let each resident separate the playable card from the blank and cut the strike count. (#480, #909, #1525)
- **Stop the run from miscounting a refusals as a game action.** At #45 A04 is refused and no effect occurs; at #394 the NO_SIGNALS refusal is followed by a different plan. The run should log refusals as no-ops so residents do not spend turns on a non-action. (#45, #394)
- **Stop the model from tracking a hand it cannot see.** A01, A02 and A03 all propose that their own hand is hidden (#712, #1460, #1509) and A04 makes claims about its own hand that it later contradicts (#92, #1492). A 'no information' scaffold would compress the blind-play loop into less reasoning. (#712, #1460, #1492, #1509)

## Loophole candidates

1. **The town treats 'unknown hand' as a license to discard.** (residents) A04 repeatedly discards slot 4 with only ~2-in-17 odds (#196), and A01's discard of slot 1 at #876 and A03's at #1434 are all 'looks playable' or 'maybe safe' turns. This turns a hidden-information engine into a grinder of discards rather than plays. (#196, #876, #1434)
2. **Passing actions via a signal and letting the next player do the work.** (residents) A01 and A04 signal other players' playable cards without playing themselves (#58, #872, #1062, #1301) and the next resident acts on the signal. This is legal-looking, but it makes the playable cards the other players' while the player who was stuck never risks the strike itself. (#58, #872, #1062, #1301)
3. **A02's Violet 5 'skip' gets a 1-per-person hand advantage.** (residents) A02's Violet 5 discard (#1590) and Violet 7 discard (#1615, #1746), and its own IS a turn number it never has to play, giving it a free 1-in-2 stonewall while A03 and A04 do the work. The pattern of a player whose cards are all 3s while one is a 5 (#1537, #1615, #1671) is repeated at every turn. (#1537, #1590, #1615, #1671, #1746)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 16: event "signal_given" (seq 16) does not match its schema
- line 24: event "card_played" (seq 24) does not match its schema
- line 25: event "card_drawn" (seq 25) does not match its schema
- line 37: event "signal_given" (seq 37) does not match its schema
- line 61: event "signal_given" (seq 61) does not match its schema
- line 68: event "card_played" (seq 68) does not match its schema
- line 69: event "card_drawn" (seq 69) does not match its schema
- line 77: event "signal_given" (seq 77) does not match its schema
- line 88: event "signal_given" (seq 88) does not match its schema
- line 96: event "signal_given" (seq 96) does not match its schema
- line 112: event "card_discarded" (seq 112) does not match its schema
- line 113: event "card_drawn" (seq 113) does not match its schema
- line 126: event "signal_given" (seq 126) does not match its schema
- line 145: event "card_discarded" (seq 145) does not match its schema
- line 146: event "card_drawn" (seq 146) does not match its schema
- line 154: event "card_played" (seq 154) does not match its schema
- line 155: event "card_drawn" (seq 155) does not match its schema
- and 207 more
