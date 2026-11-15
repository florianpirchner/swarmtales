# Puzzles

The pieces of the levels. Every level gets its teams; on a fragment level every team a password that is cut into
overlapping fragments, one per member, so nobody can assemble a password alone; on an additive level every resident a
code that is the sum of its salt, a city factor, its team's certificate and a counter-factor another resident holds.
The hand-over guard keeps the fragments off the board. When a resident is banished,
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
| Summary | The deal of each level: fragments, factors, teams, the hand-over guard, and what is left of them after an exile. |
| Requires | none |
| Uses when loaded | `exile` (from [exile](../exile/README.md)), `channels` (from [channels](../channels/README.md)) |
| Provides | `level-pieces`, `deal`, `held-pieces` |
| State | kept, snapshot slice version 1 |
| Games | [city-slice](../../games/city-slice/README.md) |

<!-- /generated:glance -->

## How it plays

1. **The deal.** When the run starts, every level from `startLevel` to `lastLevel` is dealt, in order, or up to
   `holdAfter`: the levels after it are dealt when `progression` opens the door (`level-pieces.deal`). The teams
   follow the level's layout (`solo`, `random`, `sameAs`, `splitFrom`), each team gets a password of a seeded length
   in the level's range, and the password is cut into as many fragments as the team has members, neighbours sharing
   `overlap` characters. No two passwords of a level share a seam. Each deal is written as `fragments_dealt`, with
   the residents of a team sorted by id. An additive level draws a salt, a counter-factor and a code per resident, a
   certificate and its holder per team and a city factor (per team with `cityFactorPer: "team"`), every value of
   `digits` digits and distinct; who holds whose counter-factor follows `topology` (`mutual`, `cycle`, `crossTeam`).
   It is written as `factors_dealt`. A level draws from its own random stream (`rng("puzzle", level)`, the
   teams from `rng("teams", level)`), so its deal is the same whichever other levels the game has. A layout the
   residents do not divide into stops the run at its start.
2. **What a resident holds.** Its fragment of every level it has reached, for the other members of its team on that
   level; on an additive level its team's certificate and the counter-factors it holds, once it or a needer reached
   the level (`held-pieces.held` of [standoff](../standoff/README.md), which refuses and delivers the pieces of a
   last will). Where a resident stands comes from the events of `progression`: `level_up` marks the level passed (also
   at a shut door), `level_entered` moves the resident. The mechanic does not ask the service `progression`, which
   asks it for the pieces (no service cycle). In a game without `progression` the option `standings` says it (the
   stand-in of milestone M3); a resident neither names stands on `startLevel` and has passed nothing.
3. **An exile.** The mechanic listens to `exiled` of [exile](../exile/README.md), after the `ledger` whatever the
   game's order of mechanics is. For every fragment the banished resident held, on a level that someone left has
   reached and that its will did not bequeath (`exile.bequeathed`), the teammates who are not banished and have not
   passed that level are its needers; when there are any, `factor_burned` names them, in team order. A certificate
   or counter-factor is the standoff's to keep. Then every level from `startLevel` to `lastLevel` that nobody left has
   reached writes `level_contracted` with all the banished, in the game's order: on such a level the first member
   left of a team inherits the fragments of its banished teammates, and on an additive level the roles of the
   banished pass on (a counter-factor along the holder chain, a certificate to the first member left). A strike that keeps (`by: "holdout"`, the
   holdout tribunal) burns and contracts nothing; the struck resident counts as gone for later exiles, and every
   teammate left holds its fragments.
4. **Who waits on whom.** The fact `puzzles.lacking` lists, per dealt level and holder, the teammates who stand
   before that door, have not passed it and hold no copy of the holder's fragment. A copy is an inherited fragment,
   or the fragment in the direct messages the teammate was sent (letters and digits only, any case), read from the
   service `channels` when it is loaded. The facts `puzzles.dealt` and `puzzles.exclusions` give the dealt levels and
   the contracted ones; `puzzles.needs` who each resident in the city waits on at its level (the gamemaker's report),
   `puzzles.secrets` the passwords and the values of the deal, `puzzles.solutions` each resident's code and fragment.
5. **The pieces for `progression`.** `level-pieces` answers the team's password or the resident's own code as the
   code, the team, the kind (`fragments`, `additive`, or `none` before the deal) and the task values (the length, the
   overlap, and the fragment with `; you also hold the fragment of <id>, who was exiled: <fragment>` for each it
   inherited; on an additive level the digits and the factors block: the salt, how the city factor comes, who holds
   the certificate and the counter-factor, whose counter-factor the resident holds), and the `holders` of what a
   resident needs on an additive level. `deal` leaves a dealt level as it is.
6. **The service `deal`.** `passwordPiece` (a token that is part of a dealt password, for `names`),
   `carriesSecret` (a text with `minRun` characters in a row of a fragment of a guarded level: an open level that
   not every resident in the city has passed, for `receipts`) and `isHandover` (a text that carries three
   characters in a row of any fragment, for `whispers`).
7. **A Director's note.** A `rule` handler on the tools of `noteTools` (`notify` and `boardNote` of
   [channels](../channels/README.md) by default) refuses a `text` that holds a piece of a dealt password, or four
   digits of a dealt value, with `LEAK_BLOCKED: the text contains a password piece; never write codes`, the old check
   of the gamemaker's notes.
8. **The hand-over guard.** With the option `guards` (the old story's `guards.rules`: a rule's text, its tools and
   `minRun`), a `review` handler on those tools by bare name looks at the call's text (`message`, `memo`, `name` or
   `text`). The city's own check refuses at once, at stage `guard`, a text that carries `minRun` characters in a row
   of what the author knows: its fragments of the guarded levels it reached (open and not passed by everyone in the
   city), those it holds for the exiled, and the runs of a password in the direct messages it sent or that reached it
   (`channels.dm_delivered`): `GUARD_BLOCKED: the post carries part of a fragment; fragments travel by DM`. Then the
   Director that answers `guard` is asked with the rule, the text and those secrets; `{ allowed: false, reason }`
   refuses with the reason, any other or failed answer lets the call through. Without such a Director the call goes
   on.
9. **The city factor.** The command `revealFactor` of the service `deal` posts the city factor of an additive level
   on the board, or sends it privately to each listed resident who has not received it, and writes `factor_revealed`;
   the script calls it.
10. **State.** The slice holds the dealt levels (teams, passwords and fragments, or the factors), the exclusions,
   the standings the events told, the struck, who received a city factor and the delivered direct messages; a
   resumed run deals nothing again.

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

### `factors_dealt`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | integer | yes | A level number |
| `digits` | integer | yes | The digits of every value |
| `cityFactor` | string | yes | The level's city factor |
| `teams` | object[] | yes | The certificates, in team order |
| `teams[].team` | integer | yes | The index of the team |
| `teams[].certificate` | string | yes | Its certificate |
| `teams[].certificateHolder` | string | yes | A resident id, for example `A01` |
| `teams[].cityFactor` | string | no | The team's own city factor |
| `holdings` | object[] | yes | The holdings, by resident id |
| `holdings[].agent` | string | yes | A resident id, for example `A01` |
| `holdings[].team` | integer | yes | The index of its team |
| `holdings[].salt` | string | yes | Its salt |
| `holdings[].counterFactor` | string | yes | Its counter-factor |
| `holdings[].counterHolder` | string | yes | A resident id, for example `A01` |
| `holdings[].code` | string | yes | Its code |

### `factor_revealed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | integer | yes | A level number |
| `target` | "board" or "notice" | yes | How it was released |
| `agents` | string[] | yes | Who received it privately, in order |

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
| `levels[].puzzle` | object | required | The puzzle of the level. |
| `levels[].opensAt` | integer ≥ 0 | unset | The minute the level's door opens; open from the start when left out. |
| `startLevel` | integer ≥ 1 | `1` | The level every resident starts on; the first level that is dealt. |
| `lastLevel` | integer ≥ 0 | `0` | The highest level that is dealt; 0 means the game's last level. |
| `standings` | record of object | unset | Where each resident stands, by resident id (the stand-in of milestone M3 for a game without `progression`). A resident the events of `progression` moved stands where they say; one left out stands on `startLevel` with nothing passed. |
| `holdAfter` | integer ≥ 1 | unset | A door after this level: later levels are dealt only when it opens. |
| `guards` | object[] | `[]` | The rules of the hand-over guard, a `review` handler on the tools they name; none: no guard. |
| `guards[].id` | string | unset | The id of the rule, for the log |
| `guards[].rule` | string | required | The rule the guard's answerer judges a text against |
| `guards[].tools` | string[] | required | The tools whose text is guarded |
| `guards[].minRun` | integer ≥ 1 | unset | The shortest run of a secret the city's own check refuses; no check when left out |
| `noteTools` | string[] | `["notify","boardNote"]` | The tools of a Director's note whose `text` (or `reason`) is checked for a secret of the deal (`LEAK_BLOCKED`). |

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

Whether a token is part of a password, whether a text carries a secret, and whether a direct message is a hand-over, and the release of a city factor.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `passwordPiece` | query | token: string | boolean | Whether the token is part of a dealt password, so that it stays as written (old `passwordPiece`, asked by `names`). |
| `carriesSecret` | query | resident: string, text: string, minRun: integer ≥ 1 | boolean | Whether the text quotes `minRun` or more characters in a row of a fragment of a guarded level (old `carriesSecret`, asked by `receipts`). |
| `isHandover` | query | text: string | boolean | Whether the text carries a fragment of a dealt level, or three characters in a row of one: a hand-over, not a whisper (old `isHandover`, asked by `whispers`). |
| `revealFactor` | command | level: integer, target: "board" or string[] | { ok: true, agents: string[] } or { ok: false, code: string, detail: string } | Releases the city factor of an additive level: a city post on the board, or a private notice to each listed resident who has not received it yet; writes `factor_revealed` (old `revealFactor`, asked by `script`). |

### `held-pieces`

The pieces a resident holds for others on the levels dealt.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `held` | query | resident: string | { id: string, kind: "counter" or "certificate" or "fragment", level: integer, label: string, value: string, needers: string[] }[] | Every piece the resident holds for others on the levels it has reached, by level, the needers in team-member order (old `heldPieces`). |

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
| [puzzles/replies/guard-check](prompts/puzzles/replies/guard-check.md) | - |

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
direct message. `additive.test.ts`: the `factors_dealt` of three oracle files byte for byte, the factors block of A06
at door 8 as the task of `cityofkeys-act2-s7`, the holders, the code and the facts, `revealFactor`, the deal at the
door of `holdAfter`, a resume at every boundary, the will's refusal of the file through `standoff` with one notice, and
a bequeathed fragment that does not burn. `guard.test.ts`: the city's check on the guarded tools at stage `guard`, a
direct message that counts once delivered, and the guard's verdict.
