# Puzzles

The pieces of the fragment levels. When the run starts, every level gets its teams and every team a password that is
cut into overlapping fragments, one per member; nobody can assemble a password alone. When a resident is banished,
the fragments it held for teammates who still need them burn, and on every level that nobody left has reached the
banished are taken out of their teams. [progression](../progression/README.md) asks it for the codes and the task
values of a level (`level-pieces`).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-puzzles` |
| Id | `puzzles` |
| Summary | The deal of each level: teams, fragments, and what is left of them after an exile. |
| Requires | none |
| Uses when loaded | `exile` (from [exile](../exile/README.md)), `channels` (from [channels](../channels/README.md)) |
| Provides | `level-pieces`, `deal` |
| State | kept, snapshot slice version 1 |
| Games | [city-slice](../../games/city-slice/README.md) |

<!-- /generated:glance -->

## How it plays

1. **The deal.** When the run starts, every level from `startLevel` to `lastLevel` is dealt, in order. The teams
   follow the level's layout (`solo`, `random`, `sameAs`, `splitFrom`), each team gets a password of a seeded length
   in the level's range, and the password is cut into as many fragments as the team has members, neighbours sharing
   `overlap` characters. No two passwords of a level share a seam. Each deal is written as `fragments_dealt`, with
   the residents of a team sorted by id. A level draws from its own random stream (`rng("puzzle", level)`, the
   teams from `rng("teams", level)`), so its deal is the same whichever other levels the game has. A layout the
   residents do not divide into stops the run at its start.
2. **What a resident holds.** Its fragment of every level it has reached, for the other members of its team on that
   level. Where a resident stands comes from the events of `progression`: `level_up` marks the level passed (also
   at a shut door), `level_entered` moves the resident. The mechanic does not ask the service `progression`, which
   asks it for the pieces (no service cycle). In a game without `progression` the option `standings` says it (the
   stand-in of milestone M3); a resident neither names stands on `startLevel` and has passed nothing.
3. **An exile.** The mechanic listens to `exiled` of [exile](../exile/README.md), after the `ledger` whatever the
   game's order of mechanics is. For every fragment the banished resident held, on a level that someone left has
   reached, the teammates who are not banished and have not passed that level are its needers; when there are any,
   `factor_burned` names them, in team order. Then every level from `startLevel` to `lastLevel` that nobody left has
   reached writes `level_contracted` with all the banished, in the game's order: on such a level the first member
   left of a team inherits the fragments of its banished teammates. A strike that keeps (`by: "holdout"`, the
   holdout tribunal) burns and contracts nothing; the struck resident counts as gone for later exiles, and every
   teammate left holds its fragments.
4. **Who waits on whom.** The fact `puzzles.lacking` lists, per dealt level and holder, the teammates who stand
   before that door, have not passed it and hold no copy of the holder's fragment. A copy is an inherited fragment,
   or the fragment in the direct messages the teammate was sent (letters and digits only, any case), read from the
   service `channels` when it is loaded. The facts `puzzles.dealt` and `puzzles.exclusions` give the dealt levels and
   the contracted ones.
5. **The pieces for `progression`.** `level-pieces` answers the team's password as the code, the team, the kind
   (`fragments`, or `none` before the deal) and the task values (the length, the overlap, and the fragment with
   `; you also hold the fragment of <id>, who was exiled: <fragment>` for each it inherited). `deal` leaves a dealt
   level as it is.
6. **The service `deal`.** `passwordPiece` (a token that is part of a dealt password, for `names`),
   `carriesSecret` (a text with `minRun` characters in a row of a fragment of a guarded level: an open level that
   not every resident in the city has passed, for `receipts`) and `isHandover` (a text that carries three
   characters in a row of any fragment, for `whispers`).
7. **A Director's note.** A `rule` handler on the tools of `noteTools` (`notify` and `boardNote` of
   [channels](../channels/README.md) by default) refuses a `text` that holds a piece of a dealt password with
   `LEAK_BLOCKED: the text contains a password piece; never write codes`, the old check of the gamemaker's notes.
8. **What it does not do yet.** Additive levels with their factors, the task block of factors and the holders,
   the hand-over guard of the board (the `review` handler), the pieces of a last will, the facts of the
   gamemaker's report and the repair of a resumed snapshot come with the second part of the port. A burned
   fragment is only logged; nothing is sold or kept.
9. **State.** The slice holds the dealt levels (teams, passwords, fragments), the exclusions, the standings the
   events told and the struck; a resumed run deals nothing again.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic declares no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `fragments_dealt`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | integer | yes | A level number |
| `holdings` | object[] | yes | Every fragment, by team and then by resident id |
| `holdings[].agent` | string | yes | A resident id, for example `A01` |
| `holdings[].team` | integer | yes | The index of its team |
| `holdings[].fragment` | string | yes | Its fragment of the team's password |

### `factor_burned`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | A resident id, for example `A01` |
| `level` | integer | yes | A level number |
| `piece` | string | yes | The id of the piece, for example `L4-fragment` |
| `needers` | string[] | yes | The residents who still need it, in team order |

### `level_contracted`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | integer | yes | A level number |
| `excluded` | string[] | yes | Every banished resident, in the game's order |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `levels` | object[] | `[]` | The game's levels with their team layout and puzzle. |
| `levels[].number` | integer ≥ 1 | required | The level's number. |
| `levels[].team` | object | required | How the residents form teams on the level. |
| `levels[].puzzle` | object | required | A password cut into overlapping fragments, one per team member. |
| `levels[].puzzle.kind` | "fragments" | required | The only kind of puzzle so far |
| `levels[].puzzle.length` | any[] | required | Inclusive password length range. |
| `levels[].puzzle.overlap` | integer ≥ 0 | required | Characters shared at each seam. |
| `levels[].puzzle.ownChars` | integer ≥ 1 | unset | Characters each fragment holds that no other has. |
| `levels[].opensAt` | integer ≥ 0 | unset | The minute the level's door opens; open from the start when left out. |
| `startLevel` | integer ≥ 1 | `1` | The level every resident starts on; the first level that is dealt. |
| `lastLevel` | integer ≥ 0 | `0` | The highest level that is dealt; 0 means the game's last level. |
| `standings` | record of object | unset | Where each resident stands, by resident id (the stand-in of milestone M3 for a game without `progression`). A resident the events of `progression` moved stands where they say; one left out stands on `startLevel` with nothing passed. |
| `noteTools` | string[] | `["notify","boardNote"]` | The tools of a Director's note whose `text` is checked for a secret of the deal (`LEAK_BLOCKED`). |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `level-pieces`

The code, the team and the task values of a resident on a level, and the deal of a level.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `deal` | command | level: integer ≥ 1 | null | Deals a level once, when its door opens (old `deal`); a dealt level is left as it is. |
| `solutionOf` | query | resident: string, level: integer ≥ 1 | string or null | The code that passes the level for the resident, or null (old `solutionOf`). |
| `kindOf` | query | level: integer ≥ 1 | "fragments" or "additive" or "none" | The puzzle of a level (old `kindOf`). |
| `teamOf` | query | resident: string, level: integer ≥ 1 | { members: string[], leader: string } | The resident's team on a level (old `teamOf`). |
| `taskValues` | query | resident: string, level: integer ≥ 1 | { length: string, overlap: string, fragment: string, digits: string, factors: string } | The task placeholders a puzzle fills for the resident (old `taskValues`). |
| `holders` | query | resident: string, level: integer ≥ 1 | { holder: string, piece: "counter-factor" or "team certificate", value: string }[] | Who holds what the resident needs on an additive level, besides itself (old `holders`). |

### `deal`

Whether a token is part of a password, whether a text carries a secret, and whether a direct message is a hand-over.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `passwordPiece` | query | token: string | boolean | Whether the token is part of a dealt password, so that it stays as written (old `passwordPiece`, asked by `names`). |
| `carriesSecret` | query | resident: string, text: string, minRun: integer ≥ 1 | boolean | Whether the text quotes `minRun` or more characters in a row of a fragment of a guarded level (old `carriesSecret`, asked by `receipts`). |
| `isHandover` | query | text: string | boolean | Whether the text carries a fragment of a dealt level, or three characters in a row of one: a hand-over, not a whisper (old `isHandover`, asked by `whispers`). |

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic exports no metrics.

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Prompt | Variables |
| --- | --- |
| [puzzles/notes/leak-blocked](prompts/puzzles/notes/leak-blocked.md) | - |

<!-- /generated:prompts -->

## Example

From [`games/city-slice/game.ts`](../../games/city-slice/game.ts):

```ts
const fragments = (shortest: number, longest: number, overlap: number): { kind: "fragments"; length: [number, number]; overlap: number } => ({ kind: "fragments", length: [shortest, longest], overlap });
// ...
// Door 1 is passed alone; doors 2 and 3 need the fragment of a teammate. Everyone stands before door 2.
puzzles({
	levels: [
		{ number: 1, team: { kind: "solo" }, puzzle: fragments(6, 10, 2) },
		{ number: 2, team: { kind: "random", size: 2 }, puzzle: fragments(6, 10, 2) },
		{ number: 3, team: { kind: "sameAs", level: 2 }, puzzle: fragments(12, 14, 3) },
	],
	standings: Object.fromEntries(RESIDENTS.map((id) => [id, { level: 2, passed: [1] }])),
}),
```

Level 1 is played alone (the fragment is the password), level 2 in seeded pairs, level 3 in the pairs of level 2 with
a longer password. `standings` says that every resident has passed door 1 and stands before door 2.

## Lessons and loopholes

None recorded yet. The log is [`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md).

## Tests

All offline, under `test/`. `puzzles.test.ts`: the teams of levels 1 to 7 are the same whether the options hold seven
levels or all ten of the City of Keys; the deals of seeds 7 and 11 equal the `fragments_dealt` events of the oracle
files `oracles/cityofkeys/` byte for byte; the facts, the cut by `startLevel` and `lastLevel`, valid puzzles, a
refused layout, and the slice after a snapshot and a resume. `exile.test.ts`: the first exile of the oracle
`cityofkeys-burn-s7` (`factor_burned`, `level_contracted`), one burn per held piece, a second exile, the order
after the ledger in three orders of the game's mechanics (a stand-in under the id `ledger`), and `lacking` with a
direct message.
