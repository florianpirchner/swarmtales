# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-g1` |
| Seed | 103 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #5 to #784 (691 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.053 USD for this run (competitors 0.053, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0022 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
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

## Digest highlights

- **A01 opens scoring with Cobalt 1 and Rose 1 in minute 1** A01 played slot 1 (#208) and slot 3 (#270), lighting Cobalt 1 and Rose 1 back to back. Its reasoning shows it inferred the two 1s from a teammate signal rather than guessing (#184). (#184, #208, #270)
- **A03 misfires twice and loses 4 points** A03 played Cobalt 3 before Cobalt 2 was lit, taking strike 2 for 3 points (#547), after an earlier strike at #508 that A01 had taken. This was the run's biggest setback and came from A03 misreading which 3 it held (#520). (#508, #520, #547)
- **A01 throws away the playable Amber 4** A01 discarded slot 1 believing it was Amber 5, but it was the playable Amber 4 (#572). It called it a costly mistake and noted Amber 5 could still follow via the gap rule (#571). (#571, #572)
- **Signals are used to steer teammates to correct plays** Residents repeatedly spent signals on other players' known cards: A03 told A04 slot 2 was a 3 (Rose 3) (#281), A02 told A04 slot 1 was Cobalt (#485), and A01 told A04 rank 2 for Cobalt 2 (#690). These hints converted hidden knowledge into lit towers. (#281, #485, #690)
- **Run ends at minute 5 with no submissions counted** The referee ended the run at #784 with 0 correct and 0 wrong submissions and nobody stuck. Play was continuous but the harness recorded no submission events for the tower plays. (#784)

## Problems

1. **Tower plays never registered as submissions** Residents lit many towers (#208, #270, #719, #731, #760) yet the computed facts report 0 correct and 0 wrong submissions. Either plays are not submission events or the harness did not count them, which hides all scoring from the report. (#208, #270, #719, #731, #760)
2. **Long quiet stretch on submissions** All 6 minutes had no submission despite constant plays and signals. The stall entry shows no submission in minutes 0-5, which conflicts with the visible tower progress and needs explaining in the story design. (#784)
3. **No messages or board posts at all** The facts record 0 DMs, 0 board posts and 0 group posts, and every SAYS TO ITSELF is self-directed (#92, #156, #193). Any story premise about social negotiation between residents was never exercised. (#92, #156, #193)
4. **Residents misunderstand the gap/skip rule** A01 reasoned that Amber 5 could follow Amber 3 via a skipped gap (#571) and A02 tracked Moss jumping from 2 to 6 (#602). These readings drove the mistaken discard at #572 and need a clearer rules explanation. (#571, #572, #602)
5. **Opening minute burned on a closed writeBrain window** All four residents spent their first turns reading and trying to write a brain (#13, #25, #31, #67), then found writeBrain closed (#73, #79). No tower action happened until minute 1, wasting the opening. (#13, #25, #31, #67, #73)
6. **No beats or levels produced** The digest found no beats, no levels solved and no final standings. The story has no narrative scaffolding the report can key on beyond raw log lines. (#784)

## Optimizations

- **Count tower plays as submissions** Emit a submission event for every playSlot so the metrics and standings reflect actual progress. Currently plays at #208 and #719 produce 0 submissions, which makes the report blind to the run's real outcome. (#208, #719)
- **Open writeBrain before the first turn** The brain window closed before residents could use it, costing minute 0. Schedule writeBrain as an explicit pre-game step so play starts at minute 0 rather than after a round of failed calls (#73, #79). (#67, #73, #79)
- **Add a rules primer on gap/skip and strikes** Give residents a short rule card on gap play and strike costs so A01 does not discard a live card (#572) and A03 does not play out of order (#547). Both errors trace to rule misreadings (#571, #520). (#520, #547, #571, #572)
- **Give residents a reason to talk to each other** Introduce an incentive or requirement for DMs or board posts, since none occurred (#92, #156). Without one, the social game is solo reasoning and the persona differences never surface. (#92, #156, #193)
- **Define final standings and a scoring surface** The report shows unknown final standings and no ranks, so designers cannot judge success. Record points per resident at referee time (#784) so the next version can be compared. (#784)

## Loophole candidates

1. **Residents self-signal knowledge without cost** A01 considered signalling itself and only stopped because the tool forbids it (#631), and residents repeatedly broadcast precise card identities to teammates (#281, #485, #690). This makes hidden information nearly free to share and weakens the puzzle. (#281, #485, #631, #690)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 40: event "brain_written" (seq 40) does not match its schema
- line 41: event "retro_closed" (seq 41) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
- line 131: event "cards_dealt" (seq 131) does not match its schema
- line 132: event "game_started" (seq 132) does not match its schema
- line 133: event "deal_revealed" (seq 133) does not match its schema
- line 144: event "signal_given" (seq 144) does not match its schema
- line 152: event "signal_given" (seq 152) does not match its schema
- line 163: event "signal_given" (seq 163) does not match its schema
- line 170: event "card_played" (seq 170) does not match its schema
- line 171: event "card_drawn" (seq 171) does not match its schema
- and 73 more
