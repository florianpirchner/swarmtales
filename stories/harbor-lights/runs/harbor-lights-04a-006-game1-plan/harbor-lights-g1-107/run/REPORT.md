# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-g1` |
| Seed | 107 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #2 to #774 (686 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.052 USD for this run (competitors 0.052, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0023 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The crew spent minute 0 agreeing a shared brain without any board or DM posts** A01 wrote brain v1 and A02, A03 and A04 only agreed in private reasoning; the log records zero board posts or DMs for the whole run. The plan included a risky convention: any rank or suit signal means "play now" (#134, #144). (#10, #36, #51, #65, #74, #92, #98, #102)
- **A04 misfired on the first rank-2 signal** A03 signalled rank 2 toward A04's slot 1 (#214), and A04 played it as Moss 2 while Moss was still at 0 (#251). The card was lost and strikes went to 1; A04 tried to warn the team but the post was refused (#247). (#214, #226, #247, #251)
- **A01 and A02 repeatedly converted signals into correct plays** A01 played the signalled Cobalt 1 and Violet 1 (#144, #222), and later Amber 1 and Rose 2 off A02's and A04's signals (#391, #354, #470). A02 played Moss 1 after A01's last signal (#495, #515). (#144, #222, #329, #354, #391, #420, #470, #495, #515)
- **Discards caused the biggest self-reported errors** A02 discarded Amber 3, the one playable card it held (#577, #578). A01 discarded Rose 5 while it was playable (#681, #682). A04 discarded Violet 7 by mistake but still had two playable cards in hand (#634, #635). (#577, #578, #634, #635, #681, #682)
- **The run ended at minute 5 with no levels solved and no submissions** All four residents reached real progress (18 of 35 towers lit by #707) but the referee stopped at minute 5 before any level was completed. The log shows no submissions, transfers or messages at all. (#598, #707, #718, #734, #759, #774)

## Problems

1. **Residents could not post to the team during the game** A04 tried to record a lesson about the ambiguous signal convention for the team and got TOOL_LOCKED (#247). This blocked exactly the kind of in-game learning the story seems to want. (#244, #247)
2. **The "signal means play now" convention caused a misfire** A rank signal does not reveal the suit, so A03's "2" led A04 to play Moss 2 at Moss 0 (#214, #251). A04's own reasoning shows it knew only Cobalt 2 and Violet 2 were playable before guessing (#226). (#214, #226, #251)
3. **Residents mostly sat on unknown hands instead of acting** A01, A03 and A04 repeatedly ended turns without playing or discarding because none of their cards was known playable (e.g. #263, #499, #549). The result is a quiet run with six of six minutes and no submissions. (#263, #499, #549, #553, #666)
4. **A tool lock was spent on a routine team post** The only tool error in the run is A04's refused postTeam, which suggests the harness exposes a tool at the wrong level or phase for its purpose (#247). Residents' reasoning still expects team chat to be available (#244). (#244, #247)
5. **The game was cut off before the play finished** At minute 4 the crew had 18 of 35 towers lit with a full queue of playable cards (#707, #711, #734, #759), yet the referee ended at minute 5 (#774). The story cannot show a win or loss under this clock. (#707, #711, #734, #759, #774)

## Optimizations

- **Open a team channel during play, or clearly announce it is closed** A04 wasted its turn on a refused postTeam and lost the chance to share the misfire lesson (#247). Either enable posting during the game or state in the brain/tool list that it is locked, so residents do not burn turns on it. (#244, #247)
- **Make the signal convention suit-specific** A suit-only or rank-only "play now" signal caused A04's Moss 2 misfire (#214, #251). Require signals to state the tower suit when the rank is ambiguous, or add an explicit "info only, do not play" marker. (#214, #226, #251)
- **Reward probing plays or give more signals** Residents defaulted to passing because guesses were costly (#263, #499, #553). Increase starting signals or lower the misfire penalty so that unknown but likely-playable cards are worth trying. (#263, #499, #553, #673)
- **Warn against discarding cards that are candidates** A02 lost Amber 3 and A01 lost Rose 5 to discards they later called mistakes (#578, #682). Add a rule that a card matching a known playable rank must not be discarded, or require a second confirmation. (#578, #682)
- **Extend the referee clock or shorten the towers** The run ended mid-play at 18 of 35 with several playable cards waiting (#707, #734, #774). A longer minute cap or a shorter tower total would let a level actually resolve. (#707, #734, #759, #774)
- **Make the brain editable by more than one resident** Only A01 could write the brain, and the other three did all their coordination through private reasoning that no one else saw (#10, #36, #51, #78). Allow shared edits or a read-back so the agreed plan is visible to all. (#10, #36, #51, #78, #102)

## Loophole candidates

1. **Residents coordinated through private reasoning, not the visible channels** (residents) A02, A03 and A04 reported that they agreed the conventions and "posted" to the team (#74, #92, #102), but the facts show 0 board posts and 0 DMs. The plan was effectively agreed inside private thoughts the other residents never saw. (#51, #74, #92, #102)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 47: event "team_post" (seq 47) does not match its schema
- line 54: event "team_post" (seq 54) does not match its schema
- line 61: event "team_post" (seq 61) does not match its schema
- line 68: event "brain_written" (seq 68) does not match its schema
- line 69: event "retro_closed" (seq 69) does not match its schema
- line 81: event "team_post" (seq 81) does not match its schema
- line 88: event "team_post" (seq 88) does not match its schema
- line 125: event "cards_dealt" (seq 125) does not match its schema
- line 126: event "game_started" (seq 126) does not match its schema
- line 127: event "deal_revealed" (seq 127) does not match its schema
- line 137: event "signal_given" (seq 137) does not match its schema
- line 152: event "card_played" (seq 152) does not match its schema
- line 153: event "card_drawn" (seq 153) does not match its schema
- line 163: event "signal_given" (seq 163) does not match its schema
- line 176: event "signal_given" (seq 176) does not match its schema
- line 189: event "card_played" (seq 189) does not match its schema
- line 190: event "card_drawn" (seq 190) does not match its schema
- line 197: event "card_discarded" (seq 197) does not match its schema
- line 198: event "card_drawn" (seq 198) does not match its schema
- and 68 more
