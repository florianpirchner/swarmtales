# @swarmtales/city-directors

Directors: the gamemaker, the Confessor, the judge and the guard of the City and Whispers (decision A58). Its place
in the layer table is in [`docs/LAYERS.md`](../../docs/LAYERS.md).

## The gamemaker

A Director that acts by tool use (`acts: "tools"`): after a round it looks at the city and may send a resident a
private note or post on the board through the tools of its grant, until it calls no more tools.

- **When it looks.** After every round (`defineGamemaker({ every })` for every few), on the run frame's
  `arena.round_end`. No look follows the last round or a round after which the run stops.
- **What it reads.** The old report of the city, written from the facts its head lists (`GAMEMAKER_FACTS`); a game
  lists those of the mechanics it loads (`defineGamemaker({ facts })`). `progression.section` is always read.
- **Its system text.** Composed by `gamemakerOptions(input, prompts)` from the game's brief, rules and act roles and
  the direction dial, out of the prompt files under `prompts/gamemaker/`, carried byte for byte with their old ids.
  A Director reads no file, so the game composes the options; the template of the budget line goes with them.
- **Not yet.** The tracks per resident, the events since the last look and the notes are issue M5-35; standing
  orders of the Human Hand are not ported (decision A61).

```ts
const options = gamemakerOptions({ city: "ECHO", agents: 6, survivors: 2, rules, spec, holdout, whisperer: true }, createPromptLookup());
defineGame({ ..., directors: [{ use: defineGamemaker({ facts: ["progression.section", "whispers.section"] }), options }] });
```
