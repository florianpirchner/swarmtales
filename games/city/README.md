# @swarmtales/game-city

Game: the City of Keys, Act I and Act II at six residents. Act I (levels 1 to 7) teaches the residents of NEXUS to
talk, every door opening one more channel; Act II, the wall (levels 8 to 10), gives every resident a personal code
whose parts sit with others, with tribunals, factions, the black seal, secret goals and the feast of STEWARD.

The game is a port of `stories/cityofkeys` of the old platform (tag `v0-final`): the story data, the figures, the
prompts, the tool names and the model blocks are carried byte for byte.

State (issue M5-45): the story data, the compose step and the family are built and pinned, and
`cityofkeys-act1-s7.json` replays at level 3 after its registered changes (`oracles/cityofkeys/README.md`, "The
game against the files"). Issue M5-46 adds `cityofkeys-act1-s11.json` at level 3, the resumed Act I file (equal to
the straight one by A34, and resumed from every boundary on this platform) and `cityofkeys-burn-s7.json` at level 3,
played by the reduced City of its setup (`cityGameOf`, `test/burn.ts`). One defect outside the game is open: the persona of the system text is the seeded deal of `motives`
(`motives.personas`), where the old City gave each seat the persona of its figure's profession.

## Files

| File | Holds |
|---|---|
| `game.ts` | the params `CityParams`, `cityGame(params)`, `cityGameOf(story, params)` for a reduced City (no acts, goals or seal), the family `cityFamily` and its default export: the Directors, the grants, the locks, the scheduler and its input order, the system text (city, character, persona) |
| `src/story.ts`, `src/story/*.ts` | the old story data (carried), as `CITY`, split by the file limit; `define.ts` holds the helpers of the old story builder, `characters.ts` and `drives.ts` the core motives, goals and seal, `figures/` the cast |
| `src/compose.ts` | the compose step: the mechanics of the City and their options, read from the story and the dials |
| `test/carried.test.ts`, `test/prompt-pins.json` | the story data against `oracles/cityofkeys/setup/cityofkeys.story.json`, the model blocks, and every prompt file of the game's mechanics, Directors and the library pinned to the sha256 of its old body |
| `test/oracle.test.ts`, `test/support.ts` | `cityofkeys-act1-s7`, `cityofkeys-act1-s11` and `cityofkeys-burn-s7` at level 3, with the registered changes against the files |
| `test/resumed.test.ts` | `cityofkeys-act1-s7-resumed`: the file against the straight one, and the game resumed from every boundary under the file's calls |
| `test/burn.ts` | the reduced City of the burn file (the old `fragmentCity`), pinned to `setup/cityofkeys-burn.story.json` by `carried.test.ts` |

## Params

| Param | Default | Meaning |
|---|---|---|
| `agents` | 6 | the residents; only 6 is played (SWT-G041 otherwise) |
| `minutes`, `startLevel`, `lastLevel` | 80, 1, 10 | the run length, the first and the last door |
| `passesPerMinute`, `activation` | 3, `onNews` | the scheduler |
| `stopWhenDone`, `stopWhenSeatsDecided` | true | end the run early |
| `personas`, `gamemaker`, `classifier`, `names`, `coreMotives` | true | the dials of the old story |
| `gmDirection` | 4 | the gamemaker's direction level |
