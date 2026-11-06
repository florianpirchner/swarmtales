# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `quarry-noburn` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1292 (1066 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.033 USD for this run (competitors 0.033, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 7, other 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents stalled on level 1 for the entire run** No level was solved: A01-A04 each sat on level 1 from minute 0 to minute 12 with zero submissions, so the run ended with nothing resolved (#1292). The residents did play card drafts internally (e.g. #114, #121, #128), but none of it turned into a submission. (#114, #121, #128, #1292)
- **Brain writes were locked almost immediately, blocking the retro loop** By minute 0 the residents found writeBrain closed and only viewTable/readBrain open (#73, #79, #91). When the retro windows did open, every attempt to save a revised brain was refused for exceeding 150 words (#454, #460, #474, #879, #885, #890, #922), so only the opening brain survived unedited for three residents. (#73, #91, #454, #460, #474)
- **A04 was penalised for a brain it could not see was over the limit** A04's first retro write failed with BRAIN_TOO_LONG at 167 words (#454) after it had reasoned through a detailed scoring lesson (#451). It was not told the word budget while drafting, so it learned only from a refusal. (#451, #454)
- **A01's very first pick was refused on a schema error** A01's opening pick failed validation because it sent no card property (#162). It then re-reasoned and picked a jade at minute 1 (#191), losing a turn to a formatting mistake rather than a strategic one. (#162, #191)
- **Residents formed a consistent concentration strategy from the squared scoring rule** All four independently reasoned that concentrating one colour beats spreading, citing the count-squared rule and lodestone wilds (#114, #121, #135, #293). This is coherent play, yet none of it produced a city-level result because the run had no submissions. (#114, #121, #135, #293)
- **Residents reported Fatn standings in self-talk, but the facts record final standings as unknown** A02 claimed to have won a game with 119 points (#520), A03 claimed a 117-point best (#933), and A01 claimed second place with 100 (#506), contradicting each other's orderings (#510, #528). The computed facts show no levels solved and unknown standings, so these self-reported scores are unverifiable resident claims. (#506, #510, #520, #528, #933)

## Problems

1. **Neither tool errors nor stalls were addressed, so no resident ever submitted** The run shows 13 quiet minutes and zero submissions for all four residents (#1292). Residents kept drafting internally (#1185, #1218, #1258) but never reached the submission step, and nothing in the log shows the city prompting them. (#1185, #1218, #1258, #1292)
2. **BRAIN_TOO_LONG fired seven times because the word limit is invisible at draft time** All seven tool errors were BRAIN_TOO_LONG (#454, #460, #474, #879, #885, #890, #922), each after a resident had written a 157-179 word brain (#879, #885). The refusal teaches the cap only after the fact and wastes a retro window each time. (#454, #460, #474, #879, #885, #890, #922)
3. **The tool surface closed writeBrain before the first game even started** At minute 0 every resident found writeBrain locked with only viewTable and readBrain open (#73, #79, #85, #91). With the brain frozen before play, residents could not apply lessons mid-run, and the retro windows that later opened mostly consumed themselves on failed writes (#890, #922). (#73, #79, #85, #91, #890, #922)
4. **The pick tool rejected an empty argument with a cryptic schema message** A01's pick at minute 1 returned 'must have required properties card / Received arguments: {}' (#162), which the resident had to interpret alone. A clearer instruction or a default pick would have avoided the lost turn (#191). (#162, #191)
5. **Self-reported scores conflict and obscure the actual outcome** Residents talk past each other about who placed where in the same games (#506, #510, #520, #528), and the city reports final standings as unknown (#1292). The story's competitive premise therefore never becomes legible from the log. (#506, #510, #520, #528, #1292)
6. **No messages, transfers or gamemaker events, so there was no social play** The facts record 0 DMs, 0 board posts, 0 transfers and no gamemaker actions, and every SAYS TO ITSELF line is private (#92, #98, #102, #106). The social-competition design had no channel in which to happen. (#92, #98, #102, #106, #1292)

## Optimizations

- **Show the brain word budget and a live word count while drafting** Address the seven BRAIN_TOO_LONG refusals (#454, #879, #922) by surfacing the 150-word cap in the writeBrain tool description and returning remaining words in the call result. Residents would stop losing retro windows to invisible limits (#885). (#454, #879, #885, #922)
- **Keep writeBrain open during the retro window and make it a single permitted edit** The brain was closed before minute 0 (#73, #91), so lessons could not be captured when fresh. Allow one write per retro window with a clear open/close announcement so residents like A04 (#451) can record their scoring insight rather than being refused (#454). (#73, #91, #451, #454)
- **Add a submission checkpoint or gentle nudge each minute** Twelve minutes passed with zero submissions (#1292) while residents kept drafting (#1185, #1258). A per-minute prompt asking for a submission, or a maximum-consecutive-reasoning cap, would convert private drafting into actual plays. (#1185, #1258, #1292)
- **Make the pick tool forgiving of empty or partial arguments** A01 lost a turn to an empty pick argument and a schema error (#162). Default the card to a legal random or top-scored option, or reply with a list of legal card names, so the resident can retry inside the same turn (#191). (#162, #191)
- **Publish an authoritative scoreboard each round instead of relying on self-reported totals** Residents produced contradictory accounts of the same game (#506, #510, #520, #528) while the facts record standings as unknown. A city-side scoreboard after each game would give residents a shared, correct basis for the next draft. (#506, #510, #520, #528)
- **Open a social channel so messages and transfers can actually be used** The run had 0 DMs, 0 board posts and 0 transfers (#1292), and every public line was private self-talk (#92, #106). If the story intends alliances or negotiation, give residents a board or DM tool and a reason to use it before picks. (#92, #106, #1292)

## Loophole candidates

None found.

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
- line 67: event "brain_written" (seq 67) does not match its schema
- line 68: event "retro_closed" (seq 68) does not match its schema
- line 108: event "draft_game_started" (seq 108) does not match its schema
- line 109: event "draft_pick_opened" (seq 109) does not match its schema
- line 117: event "draft_card_picked" (seq 117) does not match its schema
- line 124: event "draft_card_picked" (seq 124) does not match its schema
- line 131: event "draft_card_picked" (seq 131) does not match its schema
- line 138: event "draft_card_picked" (seq 138) does not match its schema
- line 139: event "draft_pick_opened" (seq 139) does not match its schema
- line 147: event "draft_card_picked" (seq 147) does not match its schema
- and 206 more
