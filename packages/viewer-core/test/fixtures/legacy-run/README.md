# Legacy fixture

A run folder in the format of the old platform, for the test that an old run still loads.

- `events.jsonl`: the first 39 lines and the last line (the `run_end`, seq 1370) of the old run
  `tictactoe-teams-06a-003-gemma27b-texttools` (tag `v0-final`, `stories/tictactoe-teams/runs/`), each unchanged. A
  log of the old format verifies only when it ends with its `run_end`.
- `000-run.json`: the header of that run, unchanged.
- `events.chain.jsonl`, `run.pub`: a chain of version 1 over these 40 lines, written for this fixture with a key
  that was thrown away. Its genesis states what the genesis of the old run states; only the key differs. The chain
  of the old run itself covers all 1370 lines and cannot be cut.
