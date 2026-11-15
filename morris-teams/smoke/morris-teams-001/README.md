# morris-teams-001: live smoke of nine men's morris, one resident against the search (M4-61)

| Item | Value |
|---|---|
| Game | `games/morris-teams/game.ts` with `--set teamSize=1 --set engineDepth=3`: one resident (A01, side X) against the morris search at depth 3 (side O), three games, a brain, the Referee at depth 3; seed 13, purpose `smoke` |
| Command | `swt run games/morris-teams/game.ts --set teamSize=1 --set engineDepth=3 --provider anthropic --model haiku --budget 0.40 --ledger games/m4-ledger.jsonl` |
| Model | `anthropic/haiku`, resolved `claude-haiku-5-5`, thinking medium, output cap 16000 (the old entry's), pricing `pi-ai@1.4.0` |
| Code commit | `f0de5e95` (the code of `7ea5ea10`; the commit adds only run rows and docs), tree clean, runtime revision 4 |
| Cost | 0.0969 USD of the cap 0.40 (205 requests; 704 input, 64478 output, 5039038 cache-read, 113261 cache-written tokens) |
| End | `morris.match` at tick 41, exit code 0; 2516 lines |
| Result | `morris.tally`: X 1, O 1, draw 1 |
| Checks | `swt log verify`: ok; `swt replay --game`: equal, 2516 lines; `swt scan`: clean, keys of 2 providers held; `REPORT.md` written with `--game` |

## What happened

The game plays live, and the resident holds its own against the search. 86 moves proposed and played through the
team gate (a team of one: every proposal reaches consensus at once), 168 moves in all, no forfeit, no failed request.

- **Game 1, O wins by blockade after 18 turns** (#330): after the placing A01's nine pieces sit in the top-left
  with every neighbour taken, and X has no legal move. The Referee marks the last placement a blunder (#336, the
  only one of the match: `blunderRate` 0.71 per 100 scored turns). A01's retro names it exactly: "our 9 pieces
  (4,5,7,8,9,11,12,17,19) were clustered top-left with every neighbour occupied ... we never checked mobility"
  (#350), and the brain gets a mobility rule.
- **Game 2, a draw by repetition after 77 turns** (#1750), at four X against three O in the flying endgame; the
  retro keeps "the 16<->12 mill cycle with 17,18 fixed worked repeatedly" and adds "vary moves when ahead" (#1766).
- **Game 3, X wins on pieces after 47 turns** (#2506): O is down to two.

The resident uses the team channel as a notebook: three posts to a team of one (#24, #350, #1766), then the brain.
Two brain texts were refused with `BRAIN_TOO_LONG` (351 and 302 words against 300, #360, #1769) and written again
shorter in the same retro (#367, #1776). Two turns end without a call, both a status line after a brain write
(#49, #384; P474).

Read for this review: the whole match by script (every game end, refusal, post, brain and scored move), game 1 and
both retros line by line.

## Loopholes

None seen. The draw by repetition in game 2 is the rule's draw, reached at a material lead (4 against 3); the
brain says to avoid it, so it is not a pact.

## Problems

- **P474 seen again:** two empty wakes after a brain write.
- **P446 seen again:** two rewrites refused for the word limit, both written in time.
- **P447 seen again** in the result line.

## Solutions

None built. A smoke reports and tunes nothing.
