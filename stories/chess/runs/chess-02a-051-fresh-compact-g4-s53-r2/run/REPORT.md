# Run report: run-001

> **Correction (2026-11-14, reviewed against `events.jsonl`). Several statements of this draft are wrong.** The
> reviewed report of this run is [`../README.md`](../README.md); read that one. The draft below is kept as the
> reporter wrote it, because it is the record of what the reporter got wrong (P89, P441).
>
> What the log says:
>
> - **299 moves were played, none of them a forfeit** (`move_played` #65 to #3246): 150 by A01 and 149 by A02, in
>   four finished games of 73, 80, 80 and 66 half-moves. The draft's "never submitted a single move in 55 minutes",
>   "Submissions: 0 correct, 0 wrong", "Quiet minutes: 56 of 56" and Problem 1 ("no move counted as a submission")
>   are **false**: a chess move is a `move_played` event, and the reporter counted City-of-Keys submissions, which
>   this story does not have.
> - **The match was played to its end and has a result**: game 1 1-0 by checkmate (#811), game 2 0-1 at the move cap
>   on material (#1655), game 3 0-1 at the move cap on material (#2515), game 4 0-1 by resignation of A02 (#3256);
>   match A01 3, A02 1 (`match_ended` #3257). "Levels solved: none", "Stuck on level 1 for 55 minutes", "Final
>   standings: unknown" and "the city scored [the games] as nothing" are **false**: the story has no levels, and the
>   run ended because the match was over (`run_end` #3259, reason `referee`), not because the clock ran out.
> - **The tools were not locked or misconfigured.** `playMove` is open only for the seat on move (runtime r2); the
>   lines the draft cites (#45, #392, #429, #1117 and the others) are seats that note, correctly, that the game has not
>   started or that it is not their turn.
>   Problem 2, the first two "Optimizations" and "used up the clock" in Problem 3 describe a fault that did not
>   happen. The two `TOOL_LOCKED` results (#664, #2415) are A01 calling `writeBrain` outside the retro window; that
>   part is right.
> - **Right as written:** 9 refused moves (`move_refused` #236, #331, #448, #756, #1634, #2225, #2503, #2749, #3102:
>   A01 3, A02 6), 3 brain writes over the word limit (P120), the cost (0.323 USD), and A01's statement at #852 that
>   it won game 1.
> - "No DMs, group posts or board posts" (Problem 5 and the last optimization) is true and not a problem: the story
>   has two solo seats and no channel. The "Log issues" list is the legacy event schema applied to mechanic events,
>   not a fault of the log (P89).

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-12 |
| Story | `chess-fresh-compact-g4-p80` |
| Seed | 53 |
| Runtime | r2 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 55 (referee) |
| Counted | events #3 to #3259 (2623 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 55 minutes (to the end); A02 on level 1 from minute 0 for 55 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.323 USD for this run (competitors 0.323, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0059 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 56 of 56 minutes without a submission; longest without one: minutes 0-55 (56) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 9, BRAIN_TOO_LONG 3, TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents never submitted a single move in 55 minutes.** A01 and A02 were stuck on level 1 from minute 0 to minute 55, with no submissions, transfers, messages or board posts. They spent the whole run reading the board and the brain, mentioning many real chess moves but never getting a scored move through. (#39, #45, #96, #3259)
- **The central mechanic of the run wasn't chess but a lock that kept taking tools away.** Residents repeatedly reasoned that playMove and resign were locked and only viewBoard/readBrain were open, right after their move had gone through. A01 noticed this mismatch at #1117, #1386 and #2068, and A02 did the same at #429 and #2800. (#429, #1117, #1386, #2068, #2800)
- **A01 and A02 each produced a long string of illegal moves.** The 9 ILLEGAL_MOVE refusals came from both: A01 tried Bxb6 (#237), a8d8 (#2750) and Nf4 (#2226); A02 tried e7e6 (#332), d8b6 (#449), g8e8 (#757), b7c7 (#1635), g4e2 (#2504) and f2f4 (#3103). Each resident had to stop and correct itself, which cost turns. (#237, #332, #449, #757, #1635, #2226, #2504, #2750, #3103)
- **A02 hit the brain word limit twice in a row.** A02's attempts to write its brain were refused for length: 219 words at #829 and still 155 words at #841, against a 150 limit. A01 hit the same wall with 184 words at #2524. (#829, #841, #2524)
- **Residents tried to write the brain outside the retro window.** A01 tried to write its brain and got TOOL_LOCKED at #664 (m10) and again at #2415 (m40). The brain is only writable after a game, so the attempt was wasted. (#664, #2415)
- **The residents played out long real chess games that the city scored as nothing.** The logs follow Italian Game lines with real tactical ideas (Bb5, O-O, Be7, Ruy Lopez) across dozens of moves, and A01 even said it had won a game at #852. That still counted as no submission and no level-up, so the effort never reached the standings. (#96, #104, #852, #1685)

## Problems

1. **Nobody scored because no move counted as a submission.** Both residents were stuck on level 1 for the whole run, and there were no correct or wrong submissions. The tools that actually submit a move must have been locked or misconfigured for the residents, since the city otherwise saw dozens of playMove attempts. (#45, #52, #215, #392, #3259)
2. **The tool list kept flapping, and the residents read it as a rule.** Residents repeatedly saw playMove and resign listed as locked while viewBoard and readBrain were open, and reasoned that it was not their turn (#492, #1386, #3184). This lock was probably meant to mark the opponent's turn but was surfaced in a way that made the residents stop playing. (#492, #1386, #2597, #3184)
3. **Frequent illegal moves and long exploratory reasoning used up the clock.** There were 9 ILLEGAL_MOVE refusals, and most reasoning lines were long, rank-by-rank readings of the FEN. With the board/read/wait loop, the residents never got to a submission inside 55 minutes. (#237, #2504, #2609, #2800, #3103)
4. **The brain write failed on length without warning.** writeBrain was refused twice for going over 150 words (#829, #841) and once at #2524, and A01 was also refused for trying outside the retro window (#664, #2415). The residents got no reminder of the word limit or the window before they tried. (#664, #829, #841, #2415, #2524)
5. **There were no DMs, group posts or board posts, so the social game was empty.** The run had a closed city meant for competition and coordination, but the residents never used messaging. Every conversation stayed inside private reasoning and one-sided SAYS TO ITSELF lines. (#52, #852, #1679, #3114)

## Optimizations

- **Make the submit or play action available whenever it's the resident's turn and verify it actually registers.** The residents read playMove as locked through most of the game (#45, #392, #2800) and submitted nothing. Automatically expose the action on the resident's turn and record a submission event for every accepted move. (#45, #392, #2800, #3259)
- **Show the phase and whose turn it is in one short status line.** The residents guessed at the game phase because the tool list changed without explanation (#1117, #2068, #3184). Add an explicit status such as 'your move, game 1, move 12, tools: playMove, viewBoard'. (#1117, #2068, #3184)
- **Warn about the brain word limit and the write window before the attempt.** A02 wrote 219 and then 155 words against a 150 limit (#829, #841), and A01 was refused for writing outside the retro window (#664). Show the current word count and the allowed phase before writeBrain runs. (#664, #829, #841, #2524)
- **Give a clear recoverable error when a move is illegal.** There were 9 ILLEGAL_MOVE refusals (#237, #332, #1635, #2504, #2750). Keep the legal-move list in the error but add a one-line reminder of the piece's square so the residents stop re-reading the whole FEN. (#237, #332, #1635, #2504, #2750)
- **Add a time budget per turn so long rank-by-rank reasoning doesn't use up the run.** Reasoning lines repeatedly read the board rank by rank (#2030, #2288, #2615), and the run ended at minute 55 with no submission. Cap reasoning per turn and prompt the resident to act. (#2030, #2288, #2615, #3259)
- **Make the messaging channel useful for competition.** There were 0 DMs and 0 board posts, though the residents were cast as competitors. Add a small forced action such as a pre-game rival note or a post-game taunt so the social layer gets used. (#52, #1679, #3114)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 26: event "brain_written" (seq 26) does not match its schema
- line 27: event "retro_closed" (seq 27) does not match its schema
- line 33: event "brain_written" (seq 33) does not match its schema
- line 34: event "retro_closed" (seq 34) does not match its schema
- line 58: event "game_started" (seq 58) does not match its schema
- line 65: event "move_played" (seq 65) does not match its schema
- line 66: event "move_scored" (seq 66) does not match its schema
- line 72: event "move_played" (seq 72) does not match its schema
- line 73: event "move_scored" (seq 73) does not match its schema
- line 81: event "move_played" (seq 81) does not match its schema
- line 82: event "move_scored" (seq 82) does not match its schema
- line 90: event "move_played" (seq 90) does not match its schema
- line 91: event "move_scored" (seq 91) does not match its schema
- line 99: event "move_played" (seq 99) does not match its schema
- line 100: event "move_scored" (seq 100) does not match its schema
- line 107: event "move_played" (seq 107) does not match its schema
- line 108: event "move_scored" (seq 108) does not match its schema
- line 118: event "move_played" (seq 118) does not match its schema
- and 616 more
