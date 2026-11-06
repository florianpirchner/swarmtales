# Runs of morris-teams

One folder per run: `morris-teams-<NN>a-<run>-<short-name>/`, with a `README.md` and the full `run/` directory.

| Run | Date | Variant | Residents | Result | Cost |
|---|---|---|---|---|---:|
| [morris-teams-06a-001-smoke](morris-teams-06a-001-smoke/) | 2026-11-06 | `morris-teams-g1`: one game, teams of three, brain written before the game | Haiku | O wins 8 pieces to 2 after 54 turns with a running mill (17 to 20 and back, five captures); no forfeit, no illegal move played; residents misread the board picture (P101) | 0.49 USD |
| [morris-teams-02a-002-solo-forfeit-bug](morris-teams-02a-002-solo-forfeit-bug/) | 2026-11-06 | `morris-teams-solo` and `-nobrain-solo`, 3 games each; four more matches stopped after a few minutes | Haiku | not comparable: 27 and 7 forfeits from a resident that ended its turn on a stale board and was never asked again (P104, fixed) | 0.76 USD |
| [morris-teams-02a-003-solo-brain-vs-nobrain](morris-teams-02a-003-solo-brain-vs-nobrain/) | 2026-11-06 | solo, brain vs no brain, 2 matches of 3 games per arm, with the P104 fix | Haiku | identical tallies: X 2, O 3, draw 1 in each arm; blunders 2.2 vs 2.7 per 100 turns; no brain effect visible (P106); 0 forfeits | 1.44 USD |
| [morris-teams-01a-004-solo-vs-engine](morris-teams-01a-004-solo-vs-engine/) | 2026-11-06 | `morris-teams-solo-vs-engine2` and `-nobrain-`: one Haiku agent (X) against the engine at depth 2 (O), 4 matches of 3 games per arm | Haiku | identical tallies again: Haiku wins 7, loses 2, draws 3 in each arm; blunders 1.3 vs 1.5 per 100 turns; no brain effect (P109); the engine walls itself in (P107), Haiku cannot beat three flying pieces (P108); 0 forfeits | 0.80 USD |
| [morris-teams-03a-005-team-vs-engine](morris-teams-03a-005-team-vs-engine/) | 2026-11-06 | `morris-teams-vs-engine2`: a team of three Haiku agents with a brain against the engine, one match of 3 games (a first attempt stopped by a container restart) | Haiku | 2 wins, 1 draw, 0 blunders, 0 forfeits | 0.27 USD |
