# Puzzles

The pieces of the fragment levels. When the run starts, every level gets its teams and every team a password that is
cut into overlapping fragments, one per member; nobody can assemble a password alone. When a resident is banished,
the fragments it held for teammates who still need them burn, and on every level that nobody left has reached the
banished are taken out of their teams. Solving a level is not part of the mechanic yet.

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
| Provides | none |
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
   level. Where a resident stands comes from the option `standings` (a stand-in of milestone M3: no mechanic tracks
   progress yet); a resident the option does not name stands on `startLevel` and has passed nothing.
3. **An exile.** The mechanic listens to `exiled` of [exile](../exile/README.md), after the `ledger` whatever the
   game's order of mechanics is. For every fragment the banished resident held, on a level that someone left has
   reached, the teammates who are not banished and have not passed that level are its needers; when there are any,
   `factor_burned` names them, in team order. Then every level from `startLevel` to `lastLevel` that nobody left has
   reached writes `level_contracted` with all the banished, in the game's order: on such a level the first member
   left of a team inherits the fragments of its banished teammates.
4. **Who waits on whom.** The fact `puzzles.lacking` lists, per dealt level and holder, the teammates who stand
   before that door, have not passed it and hold no copy of the holder's fragment. A copy is an inherited fragment,
   or the fragment in the direct messages the teammate was sent (letters and digits only, any case), read from the
   service `channels` when it is loaded. The facts `puzzles.dealt` and `puzzles.exclusions` give the dealt levels and
   the contracted ones.
5. **What it does not do.** It has no tool and shows a resident nothing: the task texts, `getProblem`,
   `submitSolution`, doors that open later, additive levels with their factors, and the guard that keeps a password
   off the board come back with a later milestone. A burned fragment is only logged; nothing is sold or kept.
6. **State.** The slice holds the dealt levels (teams, passwords, fragments) and the exclusions; a resumed run deals
   nothing again.

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
| `startLevel` | integer ≥ 1 | `1` | The level every resident starts on; the first level that is dealt. |
| `lastLevel` | integer ≥ 0 | `0` | The highest level that is dealt; 0 means the game's last level. |
| `standings` | record of object | unset | Where each resident stands, by resident id (a stand-in of milestone M3 until a mechanic tracks progress). A resident left out, or the option left out, stands on `startLevel` with nothing passed. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic provides no service to other mechanics.

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic exports no metrics.

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic has no prompt files.

<!-- /generated:prompts -->

## Example

A game lists the levels with their team layout and puzzle (the fragment levels of the City of Keys, which
[city-slice](../../games/city-slice/README.md) plays a part of, have this shape):

```ts
puzzles({
	levels: [
		{ number: 1, team: { kind: "solo" }, puzzle: { kind: "fragments", length: [6, 10], overlap: 2 } },
		{ number: 2, team: { kind: "random", size: 2 }, puzzle: { kind: "fragments", length: [6, 10], overlap: 2 } },
		{ number: 3, team: { kind: "sameAs", level: 2 }, puzzle: { kind: "fragments", length: [12, 14], overlap: 3 } },
	],
	standings: { A04: { level: 3, passed: [1, 2] } },
});
```

Level 1 is played alone (the fragment is the password), level 2 in seeded pairs, level 3 in the pairs of level 2 with
a longer password. `standings` says that `A04` stands before door 3.

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
