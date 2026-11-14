# Resumed run fixture

A run folder of the new platform that holds a resume marker, for the tests of the viewer (`viewer-core`,
`viewer-ui`). It is written by the command line and committed unchanged.

- The game is `games/city-slice`, seed 7, in the variant `amended`: the hand file pauses at tick 7, takes a
  snapshot while the run is paused, resumes, and amends the verdict at tick 8 to A02.
- `swt run <game> --fake --seed 7 --hand amended.jsonl` wrote `city-slice-001` with `snapshots/t7.json`;
  `swt resume city-slice-001 --game <game> --hand amended.jsonl` wrote this folder (`city-slice-002`). The
  residents play the script of `apps/cli/test/city-slice.test.ts` (test "the variant amended"), which made the
  folder; the Director takes its fallback, as in every fake run.
- `events.jsonl` (255 lines): the log of the first run up to the snapshot, the marker `run_resumed` at seq 163
  (inside the pause, seq 161 to 165), then the resumed part: the amendment (seq 182 to 184), the settlement
  (seq 187) and the suspension of A02.
- `events.chain.jsonl`, `run.pub`: the chain; it verifies. The signing key was thrown away with the temporary
  folder.
- `manifest.json` names `resumedFrom`; `game.json` and `texts.json` are as written.

To make it again, copy the folder `amended/city-slice-002` out of the temporary folder of that test.
