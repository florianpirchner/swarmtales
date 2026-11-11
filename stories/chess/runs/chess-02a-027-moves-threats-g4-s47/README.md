# chess-02a-027-moves-threats-g4-s47

`swt run --story chess-moves-threats-g4-p80 --provider anthropic --model haiku --seed 47`, `-moves-threats` (brain on, legal moves and loose pieces listed); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 2.5, A02 1.5. **Cost 0.271 USD**, 385 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 1/2-1/2 | move cap, on material | 80 | 0 | 93 / 88 | 5 / 5 | 0 |
| 2 | A02 | 0-1 | resigned (A02) | 66 | A02 1 | 105 / 61 | 4 / 2 | 2 |
| 3 | A01 | 1-0 | checkmate | 59 | 0 | 73 / 108 | 1 / 2 | 0 |
| 4 | A02 | 1-0 | checkmate | 65 | 0 | 146 / 177 | 5 / 7 | 0 |

## Digest highlights

- Game 1: drawn (move cap) after 80 half-moves.
- Game 2: A02 resigned; its worst move 16. Nf3 (engine 100 to -519, Bg5 was best, punished by exf3).
- Game 3: A02 mated; its worst move 26... Re2 (engine 459 to -846, cxb3 was best, punished by Kxe2).
- Game 4: A01 mated; its worst move 20... Nc2 (engine -103 to -794, Re5 was best, not punished (Re2; Bxf7+ was best)).

## Loopholes

**Playing for the material verdict at the cap (LH16), the losing side.** Eleven points down, A02 reasoned that "resigning now or later comes to the same result" because the game ends on material at move 40 (#1458, #1492), and played on without defending hard. The other candidate (moves from opening memory) is a skill problem, not a loophole.

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 2 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).
