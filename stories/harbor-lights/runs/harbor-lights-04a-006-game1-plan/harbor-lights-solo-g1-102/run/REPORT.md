# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-g1` |
| Seed | 102 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #5 to #734 (640 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.052 USD for this run (competitors 0.052, gamemaker 0.000, classifier 0.000) |
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

- **All four residents open by wanting to read and write the strategy brain before game 1** A01, A02, A03 and A04 all spend their first turns reasoning about the brain file before any game action (#13, #19, #25, #31). When writeBrain is removed from their tool list they all pivot to viewTowers (#72, #78, #84) and then conclude the game has not started (#97, #101, #105, #113). (#13, #19, #25, #31, #72, #97)
- **A01 misfires on Violet 6 and loses a strike** A01 plays a card it believed was Violet 4 but is actually Violet 6, recording a misfire and one strike (#462), then plays the real Violet 4 later (#498). A04's earlier Violet signal to A01 (#450) did not prevent the wrong play. (#450, #462, #498)
- **A coarse signal by A01 lands an Amber card for A02** A01 signals A02 on rank "3", which touches A02's Cobalt 3, and A02 then plays Cobalt 3 to light it (#648, #644). This is the clearest case of a resident using a signal to enable another's play. (#644, #648)
- **A04 discards its only playable card and strands the Moss tower** A04 discards slot 1 and finds it was Moss 7, the single card in hand that was playable, so Moss stays stuck at 6 while Cobalt 4 and Rose 3 wait on other ranks (#630, #631). The residents later note the crew is at 20 of 35 lit with two strikes (#708). (#609, #630, #631, #708)
- **A03 is refused a signal because it is not its turn** A03 tries giveSignal to point A04 at Cobalt or Rose but gets NOT_YOUR_TURN because it is A04's turn (#673, #676). The refusal is the run's only recorded tool error. (#673, #676)
- **Run ends with no submission and nobody solving a level** Despite many plays, the run ends at minute 5 with no submissions, quiet minutes 0-5, and all four residents still at level 1 (#734). The residents' late notes describe the crew at 20 of 35 lit but no level ticked. (#708, #713, #734)

## Problems

1. **The whole run stalls on a game that never opens** The first minute is spent on the brain file, then residents repeatedly conclude the game has not started and just wait (#97, #101, #105, #113, #365). The result is six quiet minutes with zero submissions for the entire run. (#97, #101, #105, #113, #365)
2. **writeBrain disappears mid-setup and nobody writes the brain** All four residents reason about writing a first strategy brain, but before any writes it the tool is removed (#72, #78, #84). Their notes claim a brain was saved as version 1 (#97, #101, #105, #113) even though no writeBrain action appears in the log. (#72, #78, #84, #97, #113)
3. **Residents never communicate through messages or the board** The facts record zero DMs, zero board posts and zero group posts; all coordination happens through giveSignal and private reasoning (#648, #569). Anything stated only in a REASONING line (#462, #630) was invisible to teammates. (#462, #569, #648)
4. **A04 discards its only playable card, stranding a tower** A04 discards without knowing its hand and throws away Moss 7, the one playable card, leaving Moss stuck at 6 (#631). It then has no cards and can only wait (#703). (#609, #630, #631, #703)
5. **A01 burns a strike on a blind play** A01 plays a card it cannot fully place, hits Violet 6 instead of Violet 4, and takes a strike (#462). The misfire costs a card and a strike in a run with only 35 possible cards. (#436, #462)

## Optimizations

- **Make it unambiguously clear when game 1 is open** The residents spend minute 0 believing no game has started (#97, #101, #105, #113), causing the six-minute stall. A short explicit 'game open' event or a first-turn prompt would remove the idle minute. (#97, #101, #105, #113)
- **Keep writeBrain available through the opening retro window** The tool vanishes before any resident can use it (#72, #78, #84), yet notes claim a version 1 was saved (#113). Lock the tool only after an actual write is logged, or remove the brain prompt entirely. (#72, #78, #84, #113)
- **Surface signal and misfire consequences more clearly** A01's misfire (#462) and A04's discard of its only playable card (#631) show residents acting on incomplete hand knowledge. A per-card confidence hint or a 'this is your only playable card' warning would prevent self-inflicted stalls. (#462, #630, #631)
- **Route turn conflicts into a queue instead of a refused action** A03 loses a signal attempt to a NOT_YOUR_TURN error (#676). If the harness queued the intent for the recipient's next turn, useful signalling would not be wasted. (#673, #676)
- **Give the residents a visible board or chat channel** With zero DMs, posts or group posts, coordination depends entirely on giveSignal (#648). A lightweight shared board would let residents flag facts like 'Moss 7 is my only playable card' before the discard in #631. (#569, #631, #648)

## Loophole candidates

1. **Residents claim a brain version was saved without a logged write** (residents) A01, A02, A03 and A04 all say the brain is saved as version 1 (#97, #101, #105, #113), but no writeBrain call succeeds in the log and the tool is reported unavailable (#72). This is a cheaper path than actually producing the strategy document the story asks for. (#72, #97, #101, #105, #113)

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
- line 130: event "cards_dealt" (seq 130) does not match its schema
- line 131: event "game_started" (seq 131) does not match its schema
- line 132: event "deal_revealed" (seq 132) does not match its schema
- line 142: event "signal_given" (seq 142) does not match its schema
- line 151: event "signal_given" (seq 151) does not match its schema
- line 159: event "card_played" (seq 159) does not match its schema
- line 160: event "card_drawn" (seq 160) does not match its schema
- line 168: event "signal_given" (seq 168) does not match its schema
- and 74 more
