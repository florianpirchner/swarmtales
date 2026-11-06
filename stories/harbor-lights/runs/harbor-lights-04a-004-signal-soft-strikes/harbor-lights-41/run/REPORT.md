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
| Counted | events #2 to #2064 (1817 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.172 USD for this run (competitors 0.172, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0051 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 4, NOT_YOUR_TURN 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 wrote the first shared brain only after two rejected attempts.** A01 tried to write the brain at minute 0 and was refused twice for exceeding 150 words (#70, #85), then saved a 121-word version that the crew treated as their convention set (#111). This brain then framed every later signal convention discussion. (#70, #85, #111)
- **The crew recovered from early misfires to reach 17 lit cards by minute 12.** Despite no level being solved, A02 lit Amber 1 at minute 1 (#215) and the crew accumulated plays across the run, reaching 17 of 35 lit after A01's Moss 2 at minute 12 (#2046) and 20 of 35 per A02 at minute 12 (#2052). The run still stalled on level 1 for all 13 minutes. (#215, #2046, #2052)
- **Residents repeatedly discarded playable cards by mistake.** A01 discarded Amber 7 when it was playable (#570, #571), A04 discarded Cobalt 2 while playable (#895, #896), A02 discarded Violet 5 by mistake (#1860, #1861), and A01 discarded Rose 5 which made Rose 6 unlightable (#1625, #1626). These self-reported errors show residents not checking playable ranks before discarding. (#570, #895, #1625, #1860)
- **The retro produced a new brain version with explicit signal conventions.** After a round of team posts (#688, #692, #1426), A03 wrote brain version 3 at 149 words stating that a rank hint touching exactly one next card means play it now (#1430). This convention then drove later single-card signals such as A03's rank-1 to A02 (#1489). (#1430, #1489)
- **Strikes nearly ended the run, with residents becoming cautious near three.** A04 misfired on Cobalt 6 at minute 10 (#1675) and A01 misfired on Cobalt 4 at minute 11 (#1849), bringing strikes to 2 of 3, after which residents explicitly refused blind plays to avoid a third strike (#1921, #1957). (#1675, #1849, #1921, #1957)
- **The run ended at minute 13 with the draw pile empty and unfinishable cards remaining.** A02 concluded at minute 12 that only A03's Cobalt 5 remained and it was dead because Cobalt was still at 2 (#2052), and the referee ended the run at minute 13 (#2064). No level was solved across all 13 minutes. (#2052, #2064)

## Problems

1. **No resident solved or advanced a level in 13 minutes.** All four residents stayed on level 1 from minute 0 to the end and no correct submissions were recorded, despite substantial in-game play (#2064). The story produced activity but no progress on its core competition. (#2064)
2. **Everyone played the same side; no competitive or message-based conflict emerged.** Residents acted as one cooperative crew, and the facts record 0 DMs, 0 board posts, and 0 group posts. With no seats contested and no messaging pressure, the social-competition premise of the story never appeared. (#34, #96, #2064)
3. **The 150-word brain limit blocked writing twice per attempt round.** BRAIN_TOO_LONG occurred 4 times: A01 at minute 0 twice (#70, #85), A02 at minute 3 (#651), and A03 at minute 8 (#1386). The limit forced rewrites and consumed turns without adding gameplay. (#70, #85, #651, #1386)
4. **NOT_YOUR_TURN errors wasted attempts and signals.** A03 was refused a signal at minute 2 (#329), A03 again at minute 6 (#1084), and A02 at minute 11 (#1819), each losing a planned signal. This shows residents could not reliably track whose turn it was. (#329, #1084, #1819)
5. **Residents burned signals on cards teammates could not act on and stalled on ambiguity.** Multiple signals touched either non-playable or multi-card targets, e.g. A01's Violet signal to A04 (#908) and A01's rank-3 to A02 (#415), and A04 repeatedly refused to play between two Violet candidates (#857, #928). Ambiguity in multi-card hints caused stalls rather than decisive plays. (#415, #857, #908, #928)
6. **Discarding was used as a signal generator at real cost.** Residents discarded repeatedly to regain signals, e.g. A03 at minute 5 (#937), A01 at minute 6 (#1069), and A02 at minute 11 (#1861), losing both dead and playable cards. The mechanic rewarded discarding even as it destroyed cards the towers needed. (#937, #1069, #1861)

## Optimizations

- **Raise or make configurable the brain word limit.** The 150-word cap caused four refusals (#70, #85, #651, #1386) and forced residents to spend turns rewriting. A higher limit or a warning before submission would let the crew settle conventions in one pass. (#70, #85, #651, #1386)
- **Prevent or clearly signal whose turn it is before tool calls.** Three NOT_YOUR_TURN refusals (#329, #1084, #1819) each cost a planned signal. The harness should reject earlier in reasoning or surface the current actor so residents do not draft signal actions for another player's turn. (#329, #1084, #1819)
- **Add a pre-discard check or warning for playable cards.** Residents discarded Amber 7, Cobalt 2, Violet 5, and Rose 5 while those were playable or needed (#570, #895, #1860, #1625). A simple prompt to verify the card is not next on any tower would reduce self-inflicted stalls. (#570, #895, #1625, #1860)
- **Make the story's competition and messaging explicit in the setup.** The facts record 0 DMs and 0 posts by residents even though the design intends competition for a few seats. The persona and objective should state that seats are scarce and that messaging is part of the contest so residents engage opponents. (#34, #96, #2064)
- **Reduce ambiguity in the signal mechanic or teach a canonical tie-break.** Multi-card hints left residents guessing (e.g. A04's Violet slots #857, #928) while single-card hints worked well (#1489). The rules should specify which matching slot to play or let givers mark a specific slot. (#857, #928, #1489)

## Loophole candidates

1. **Residents discarded unknown cards to farm signals rather than play.** (residents) Residents repeatedly discarded solely to regain a signal when they could not play, e.g. A04 at minute 2 (#359) and A03 at minute 5 (#937). This converts a loss-avoidance mechanic into a signal engine, letting the crew pass turns at only the cost of a card, which is often dead anyway. (#359, #937)
2. **Residents stalled rather than risk a play near the strike limit.** (residents) With 2 of 3 strikes used, residents passed on many turns explicitly avoiding a blind play (#1921, #1957), relying on teammates or discards instead. This lets a resident avoid all risk while the team's progress depends on others, which the story likely did not intend as a stable strategy. (#1921, #1957)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 48: event "team_post" (seq 48) does not match its schema
- line 56: event "team_post" (seq 56) does not match its schema
- line 63: event "team_post" (seq 63) does not match its schema
- line 91: event "team_post" (seq 91) does not match its schema
- line 103: event "brain_written" (seq 103) does not match its schema
- line 104: event "retro_closed" (seq 104) does not match its schema
- line 131: event "cards_dealt" (seq 131) does not match its schema
- line 132: event "game_started" (seq 132) does not match its schema
- line 133: event "deal_revealed" (seq 133) does not match its schema
- line 142: event "signal_given" (seq 142) does not match its schema
- line 152: event "card_played" (seq 152) does not match its schema
- line 153: event "card_drawn" (seq 153) does not match its schema
- line 164: event "signal_given" (seq 164) does not match its schema
- line 171: event "card_played" (seq 171) does not match its schema
- line 172: event "card_drawn" (seq 172) does not match its schema
- line 190: event "signal_given" (seq 190) does not match its schema
- line 208: event "card_played" (seq 208) does not match its schema
- line 209: event "card_drawn" (seq 209) does not match its schema
- line 222: event "card_played" (seq 222) does not match its schema
- and 227 more
