# chess-02a-036-moves-threats-coach-g4-s43

`swt run --story chess-moves-threats-coach-g4-p80 --provider anthropic --model haiku --seed 43`, `-moves-threats-coach` (legal moves and loose pieces listed, brain and coach review); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 2, A02 2. **Cost 0.211 USD**, 341 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | resigned (A01) | 52 | 0 | 128 / 79 | 3 / 1 | 0 |
| 2 | A02 | 0-1 | checkmate | 52 | 0 | 99 / 51 | 1 / 0 | 1 |
| 3 | A01 | 1-0 | checkmate | 47 | 0 | 40 / 83 | 0 / 1 | 0 |
| 4 | A02 | 1-0 | move cap, on material | 80 | A01 2 | 80 / 101 | 1 / 4 | 0 |

## Digest highlights

- Game 1: A01 resigned; its worst move 22. Bd4 (engine 438 to -389, b4 was best, punished by cxd4).
- Game 2: A02 mated; its worst move 21. Qb3 (engine 113 to -770, Qxa6 was best, punished by Rxb3).
- Game 3: A02 mated; its worst move 18... Qxc4 (engine 12 to -1000, a5 was best, punished by dxc4).
- Game 4: A01 lost on material at the cap; its worst move 24... Rxd3 (engine 515 to -386, f5 was best, punished by cxd3).
- Coach: 6 reviews; 3 of 6 brains written after one name a reviewed move or the coach.

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 5 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).
