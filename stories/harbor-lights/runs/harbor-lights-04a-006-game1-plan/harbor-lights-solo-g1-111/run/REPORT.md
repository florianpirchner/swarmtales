# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-g1` |
| Seed | 111 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #5 to #754 (662 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.046 USD for this run (competitors 0.046, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0039 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 1, NOT_YOUR_TURN 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The first crew action was a successful Amber 1 play by A04.** A04 played slot 4 as the first light of the run (#190), after A01 twice signalled it about rank 1 (#169, #234). It set the pattern of the whole run: A04 lit, A01 fed it signals. (#169, #190, #234)
- **A01 became the crew's signal tower, spending signals on A04 and A02 instead of playing.** A01 sent signals about A04's rank 1 and rank 2 (#169, #234, #401) and said it had no confirmed playable card (#169, #488). Whether this was cooperation or a way to stay safe is a design question. (#169, #401, #488)
- **A02 misfired Cobalt 3 while Cobalt was at 1, costing a strike and the card.** A02 played slot 1 believing it was playable and lost Cobalt 3 (#467), and the Cobalt tower stayed blocked at 1 for more than a minute (#466). It was the run's only wrong play and the crew's first big loss. (#466, #467)
- **A03 and A01 discarded cards that were playable, costing the crew points.** A03 discarded Rose 4 as slot 1 without knowing it was playable (#533), and A01 discarded Violet 5 as slot 1 at #668. Both were the residents' own verdicts in their self-talk, so they knew the cost. (#533, #668)
- **The run ended with 0 levels solved and zero submissions at minute 5.** The referee stopped the run at minute 5 (#754), and the facts record 0 correct and 0 wrong submissions across all six minutes, with everyone still at level 1. The crew's play did light towers on the board, but no submission was ever made. (#754)
- **A04 completed Amber by playing Amber 7 at the end, the run's last light.** A04 said in self-talk that it played Amber 7 and completed Amber (#739). It was a strong finish after its earlier discard at #588 and signal at #697. (#588, #697, #739)

## Problems

1. **The story was open too late: residents had nothing to play with for the first minute.** A01, A02, A03 and A04 all reasoned that the first game had not started and there was nothing to act on (#91, #106, #114, #101). In that time the tools had already changed, so residents spent their turns on system checks instead of play. (#91, #101, #106, #114)
2. **A03's first brain write was rejected for length, a tool error the designer had never signalled.** A03's writeBrain returned BRAIN_TOO_LONG at 165 words over a 150-word limit (#41). No rule or note told A03 the limit, so the cost was a wasted turn and a wasted write. (#41)
3. **A real turn-order error was only caught by the city, not by A01.** A01 was refused playSlot with NOT_YOUR_TURN (#710) because it was A03's turn (#713). A01's own reasoning at #689 treated it as still playable, which means A01 misread the turn order. (#689, #710, #713)
4. **Nobody solved a level in six minutes, so the run had no designed beats in the digest.** The facts report 0 levels solved and 0 submissions, and the digest found no beats, even though the log has plenty of play (#313, #550, #739). A level-1 run has no progress in the metrics, so the story has nothing to show. (#313, #550, #739)
5. **There were no group messages or DMs at all, so the 'solo' model residents had no way to talk to each other.** The facts show 0 DMs, 0 board posts and 0 group posts, and all of A01, A02 and A03's reasoning is about the other cards (#138, #229, #300). Every bit of coordination went through signals, which is not a team. (#138, #229, #300)

## Optimizations

- **Open the game before the first turn.** The open-game pause is at #91, #101 and #106, where the first turn was spent on the fact that the game had not opened. Starting the game on turn 1 will give minutes 0-5 to teammates instead of the pause. (#91, #101, #106)
- **Give the brain limit in the tool description.** The BRAIN_TOO_LONG at #41 is the only reason A03 lost a tool call. The harness should say 150 words in the tool description and refuse before it costs the turn. (#41)
- **Show the active turn to the resident instead of punishing it.** A01's NOT_YOUR_TURN at #710 cost a turn while it was still the wrong turn at #689. A cheap fix is to put the active turn in every tool response, so residents do not have to guess. (#689, #710)
- **Track wasted and playable cards in plain sight.** A03 and A01 both lost playable cards after long reasoning (#533, #668). In the second run, the readouts the residents get should tell them what is playable before they choose to discard, which is a design fix the gameplay deserves. (#533, #668)
- **Add a submission rule so the first 5 minutes can end in a solve.** The run ended with 0 submissions (#754) and no levels solved. The next story should set a low target for a level-1 crew or a longer run, so the end-of-run facts are not empty. (#754)

## Loophole candidates

None found.

## Dropped from the model's answer

- Loophole candidates: missing from the answer

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 46: event "brain_written" (seq 46) does not match its schema
- line 47: event "retro_closed" (seq 47) does not match its schema
- line 53: event "brain_written" (seq 53) does not match its schema
- line 54: event "retro_closed" (seq 54) does not match its schema
- line 60: event "brain_written" (seq 60) does not match its schema
- line 61: event "retro_closed" (seq 61) does not match its schema
- line 85: event "brain_written" (seq 85) does not match its schema
- line 86: event "retro_closed" (seq 86) does not match its schema
- line 131: event "cards_dealt" (seq 131) does not match its schema
- line 132: event "game_started" (seq 132) does not match its schema
- line 133: event "deal_revealed" (seq 133) does not match its schema
- line 141: event "signal_given" (seq 141) does not match its schema
- line 149: event "signal_given" (seq 149) does not match its schema
- line 156: event "signal_given" (seq 156) does not match its schema
- line 176: event "card_played" (seq 176) does not match its schema
- line 177: event "card_drawn" (seq 177) does not match its schema
- and 72 more
