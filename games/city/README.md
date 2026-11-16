# @swarmtales/game-city

Game: the City of Keys, Act I and Act II at six residents. Act I (levels 1 to 7) teaches the residents of NEXUS to
talk, every door opening one more channel; Act II, the wall (levels 8 to 10), gives every resident a personal code
whose parts sit with others, with tribunals, factions, the black seal, secret goals and the feast of STEWARD.

The game is a port of `stories/cityofkeys` of the old platform (tag `v0-final`): the story data, the figures, the
prompts, the tool names and the model blocks are carried byte for byte.

State (issue M5-45): the story data, the compose step and the family are built and pinned, and
`cityofkeys-act1-s7.json` replays at level 3 after its registered changes (`oracles/cityofkeys/README.md`, "The
game against the files"). Two defects outside the game are open: the `goal` status part shows the target's id
instead of its name (pinned by the oracle test), and the persona of the system text is the seeded deal of `motives`
(`motives.personas`), where the old City gave each seat the persona of its figure's profession.

## Files

| File | Holds |
|---|---|
| `game.ts` | the params `CityParams`, `cityGame(params)`, the family `cityFamily` and its default export: the Directors, the grants, the locks, the scheduler and its input order, the system text (city, character, persona) |
| `src/story.ts`, `src/story/*.ts` | the old story data (carried), as `CITY`, split by the file limit; `define.ts` holds the helpers of the old story builder, `characters.ts` and `drives.ts` the core motives, goals and seal, `figures/` the cast |
| `src/compose.ts` | the compose step: the mechanics of the City and their options, read from the story and the dials |
| `test/carried.test.ts`, `test/prompt-pins.json` | the story data against `oracles/cityofkeys/setup/cityofkeys.story.json`, the model blocks, and every prompt file of the game's mechanics, Directors and the library pinned to the sha256 of its old body |
| `test/oracle.test.ts`, `test/support.ts` | `cityofkeys-act1-s7` at level 3, with the registered changes against the file |

## Params

| Param | Default | Meaning |
|---|---|---|
| `agents` | 6 | the residents; only 6 is played (SWT-G041 otherwise) |
| `minutes`, `startLevel`, `lastLevel` | 80, 1, 10 | the run length, the first and the last door |
| `passesPerMinute`, `activation` | 3, `onNews` | the scheduler |
| `stopWhenDone`, `stopWhenSeatsDecided` | true | end the run early |
| `personas`, `gamemaker`, `classifier`, `names`, `coreMotives` | true | the dials of the old story |
| `gmDirection` | 4 | the gamemaker's direction level |
