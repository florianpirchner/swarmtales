# @swarmtales/sample-roles

Sample 3 of the sample ladder: roles and private texts. It builds on sample 2, team tic-tac-toe
([`samples/team-game/`](../team-game/README.md)).

## What you build

Sample 2's game with roles: each team has one captain for the whole match and one adviser. The game names the roles,
and every resident reads a briefing of its own before the run starts: the text of its role, then a line for it alone.
The rules stay those of three shipped mechanics; the roles and the briefings are data of the game.

## Run it

From the root of the repository, the fake model plays (no key, no cost); the lines are those of
[`commands.sh`](commands.sh):

```sh
node --conditions development apps/cli/src/bin.ts run samples/roles/game.ts --fake
node --conditions development apps/cli/src/bin.ts log verify runs/roles-001
node --conditions development apps/cli/src/bin.ts replay runs/roles-001 --game samples/roles/game.ts
```

The first command prints first (the lines of [`output.txt`](output.txt)):

```text
fake models: no result
roles seed 3: ended after 21 ticks (limit grid.match: the match is over)
result grid.tally: {"X":1,"O":0,"draw":0}
```

The run folder's `texts.json` holds the four briefings as the residents read them, under `briefing/resident:A01` to
`briefing/resident:A04`, and its manifest names the hash of each. Without `--fake` the run asks Haiku with the key of
`SWT_ANTHROPIC_API_KEY` (`swt doctor` says whether it is set).

## The code

[`game.ts`](game.ts) names the teams and the roles once, and gives each role a text and each resident a line:

```ts
const teams = { X: ["A01", "A02"], O: ["A03", "A04"] };
const roles = { captain: ["A01", "A03"], adviser: ["A02", "A04"] };
```

The briefing of the game format is one text for every resident, or one per resident id. A role is not a key of it,
so the game builds one text per resident from the text of its role and its own line ([`game.ts`](game.ts)):

```ts
/** One briefing per resident: the text of its role, then its own line. */
const briefing = Object.fromEntries(Object.entries(roles).flatMap(([role, members]) => members.map((id) => [id, `${byRole[role] ?? ""}\n${personal[id] ?? ""}`])));
```

`roles` goes into the game as it is, and `grid` gets `fixedCaptain: true`, so the first member of each team, the
resident the role names, is its captain for the whole match ([`game.ts`](game.ts)):

```ts
	roles,
	mechanics: [gridGame({ teams, games: 1, wakeTeam: true, fixedCaptain: true }), consensus({ teams }), teamChannel({ teams })],
```

[`test/game.test.ts`](test/game.test.ts) plays the game with the fake model and asserts on its log: only the two
captains play a move, nothing is refused, a resident is shown the posts of its own team only, and only the captains
are told that they are on move; each resident reads the text of its role and a line that no other resident reads, and
carries its role. [`test/tutorial.test.ts`](test/tutorial.test.ts) runs the lines of `commands.sh` in process and
checks that every code block of this README stands in a file of the sample.

## What is new

Against sample 2:

- **Roles.** `roles` of the game format names groups of residents. Each resident carries its role (the first role
  that names it), and the service `roster` answers who holds which role to every mechanic that asks. No shipped
  mechanic gives a role a rule of its own: here `grid`'s option `fixedCaptain` makes the roles true.
- **A briefing per resident.** `briefing` is a text that one resident reads before the run starts, first in its
  system prompt after the header. The run folder records each briefing with its hash.

### What a resident reads, and what it does not

| A resident reads | It does not read |
|---|---|
| its own briefing: the text of its role and its own line | the briefing of any other resident, its teammate's included |
| the posts of its own team's channel, shown at the start of its turn | the channel of the other team |
| the board, when it calls `viewBoard`: the board is the same for all four | what the other team voted, or that a vote is open there |
| as captain, the notice that its side is on move | as adviser, any such notice: the adviser is told of its captain's proposal |

The log shows what each resident was shown: the `inputs` of every `activation_opened` event.

### One model for every resident

The game format has one `model`, and it holds for every resident (a Director names its own). Two residents cannot
play on different models in one run: the format has no field for it, so this sample does not teach one.
[`test/mixed-models.yaml`](test/mixed-models.yaml) asks for a model per resident, and the game is refused before the
run starts, with this error (taken from `test/game.test.ts`):

```text
error SWT-G001: `model` of the game matches none of the forms the format allows
  at model
  A game must match the game definition format, version 1, and may hold no field the format does not know.
  fix: Correct the field; `GameDefinitionSchema` of `@swarmtales/contracts` describes every field of the format.
  docs: docs/reference/errors.md#swt-g001
```

Models are compared between runs instead: an experiment names the model of all its runs, so two models are two
experiments over the same game and seeds (`swt experiment run`, [docs/reference/cli.md](../../docs/reference/cli.md)).

## Try next

1. Leave `A04` out of `personal` and of `roles`: it still plays as O's adviser, since `grid` and `consensus` take
   their teams from their options, but it reads no briefing: the game builds none for a resident of no role, and a
   resident that is no key of `briefing` reads nothing before the run starts.
2. Take `fixedCaptain: true` from `grid`: the captaincy rotates again, one move each, and the adviser of the briefing
   plays every second move; the test that only the captains play fails.
3. Swap the members of `captain` and `adviser`: the roles no longer match `grid`'s captains, which `grid` takes from
   the order of `teams`. A role says what a resident is told; a mechanic's option says what it may do.

## Reference

- The game format (`roles`, `briefing`, `model`): `GameDefinitionSchema` of `@swarmtales/contracts`.
- The mechanics: [grid](../../mechanics/grid/README.md), [consensus](../../mechanics/consensus/README.md),
  [team-channel](../../mechanics/team-channel/README.md).
- The error: [`SWT-G001`](../../docs/reference/errors.md#swt-g001).
- The command line (`run`, `log verify`, `replay`, `experiment run`): [docs/reference/cli.md](../../docs/reference/cli.md).
