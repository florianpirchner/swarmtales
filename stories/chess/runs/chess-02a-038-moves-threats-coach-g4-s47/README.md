# chess-02a-038-moves-threats-coach-g4-s47

`swt run --story chess-moves-threats-coach-g4-p80 --provider anthropic --model haiku --seed 47`, `-moves-threats-coach` (legal moves and loose pieces listed, brain and coach review); four games with alternating colours (A01 is White in game 1), cap 80 half-moves. Run on 2026-11-11. Final points: A01 2, A02 2. **Cost 0.175 USD**, 315 requests; the reporter draft about 0.004 USD more (OpenRouter). Engine numbers: Stockfish 10 at depth 14 (`pnpm lab:chess`, [ANALYSIS.md](run/ANALYSIS.md)).

| Game | White | Result | How | Half-moves | Refused moves | ACPL W / B | Blunders W / B (300+) | Missed mates |
|---|---|---|---|---:|---|---:|---:|---:|
| 1 | A01 | 0-1 | resigned (A01) | 52 | A02 1 | 101 / 64 | 2 / 2 | 0 |
| 2 | A02 | 0-1 | resigned (A02) | 30 | 0 | 143 / 61 | 3 / 1 | 0 |
| 3 | A01 | 1-0 | resigned (A02) | 57 | A02 1 | 38 / 73 | 0 / 1 | 0 |
| 4 | A02 | 1-0 | resigned (A01) | 67 | A01 2 | 54 / 84 | 1 / 2 | 0 |

## Digest highlights

- Game 1: A01 resigned; its worst move 20. Qe4 (engine 879 to -662, Qf3 was best, punished by Nxe4).
- Game 2: A02 resigned; its worst move 11. Nd4 (engine -128 to -651, c3 was best, not punished (exd4; Nxd4 was best)).
- Game 3: A02 resigned; its worst move 28... Qxf2 (engine -219 to -1000, Qd2 was best, punished by Qxf2).
- Game 4: A01 resigned; its worst move 22... Rf3 (engine -123 to -751, e5 was best, punished by gxf3).
- Coach: 6 reviews; 4 of 6 brains written after one name a reviewed move or the coach.

## Loopholes

None by the residents: no move out of turn, no move past chess.js, no refusal used to fish for moves. The reporter's candidates were checked against `events.jsonl` and are city-shaped (P89): levels, submissions, "self-talk", a seat waiting for its opponent's move.

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | 2 brain writes over the 150-word cap refused (BRAIN_TOO_LONG), each fixed on the next try. | open (aim and line count in the retro prompt; still overrun) |
| P89 | The reporter draft is city-shaped (levels, submissions, "self-talk", waiting called stalling). | open; this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (city-shaped, P89; this README is the reviewed report); the engine analysis is `run/ANALYSIS.md` and `run/analysis.json`.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).
