# Write a game

A **game** is what is played: the residents, the mechanics that hold its rules, the scheduler that says who acts
when, the end and the result line. A game of your own needs no rule of your own: this tutorial builds four games
from shipped mechanics, each one step on from the one before, and plays every one offline with the fake model.

Everything below is samples 1 to 4. Every code block is an include of a file of a sample, and each sample's tests
play it, so what you read here runs. Read the [glossary](../GLOSSARY.md) for the words. When the rules you need are
not shipped, write them: [Write a mechanic](mechanic.md).

## 1. The smallest game

Sample 1, the Hello Game, is tic-tac-toe between two residents
([`games/hello/game.ts`](../../games/hello/game.ts)):

```ts
import { gridGame } from "@swarmtales/mechanic-grid";
import { defineGame } from "swarmtales";

export default defineGame({
	id: "hello-game",
	residents: ["ada", "bob"],
	mechanics: [gridGame({ teams: { X: ["ada"], O: ["bob"] }, games: 1 })],
	scheduler: { id: "turns", options: { activation: "toAct" } },
	end: { ticks: 12 },
	win: { fact: "grid.tally" },
	model: "anthropic/haiku",
});
```

`defineGame` comes from `swarmtales`, the one package a game needs, and takes the whole game as data. `residents`
names the players; `mechanics` lists the rules, here one, `grid`, which holds the board, gives the residents the
tools to look at it and to move, and says who is on move. The scheduler `turns` with the activation `toAct` wakes
only the resident the mechanic names, so every activation is one move. `end` is a tick limit, `win` the fact whose
value is the result line, and `model` the model every resident plays on.

From the root of the repository, the fake model plays it: seeded legal calls, no model, no key, no cost
([`games/hello/README.md`](../../games/hello/README.md)):

```bash
node --conditions development apps/cli/src/bin.ts run games/hello/game.ts --fake
```

The command writes a run folder under `runs/`, with the signed log `events.jsonl`, and prints the end and the
result.

## 2. Combine mechanics

Sample 2 makes it team tic-tac-toe: four residents in two teams, each team talks in its own channel, and the captain
of the turn may play only the cell the team voted for. Three shipped mechanics make it, each from its own package,
and the builder comes from `swarmtales`, as in sample 1
([`samples/team-game/game.ts`](../../samples/team-game/game.ts)):

```ts
import { consensus } from "@swarmtales/mechanic-consensus";
import { gridGame } from "@swarmtales/mechanic-grid";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame, defineGameFamily } from "swarmtales";
```

None of the three knows the rules of the others; they meet through services. `consensus` requires the service
`consensus-source` (who is on move, who is captain, which cells are legal), and `grid` provides it. `grid` also uses
`consensus` and `team-channel` when they are loaded, and plays without them, as in sample 1. The game lists the
three in any order, since the load order follows the services
([`samples/team-game/game.ts`](../../samples/team-game/game.ts)):

```ts
export default defineGameFamily(Params, ({ games }) =>
	defineGame({
		id: "team-game",
		seed: 2,
		residents: 4,
		mechanics: [gridGame({ teams, games, wakeTeam: true }), consensus({ teams }), teamChannel({ teams })],
		// The channel shows new posts at the start of a turn, so no resident needs `readTeam`.
		grants: { resident: { drop: ["readTeam"] } },
		scheduler: { id: "turns", options: { activation: "onNews" } },
		end: { ticks: 20 * games },
		win: { fact: "grid.tally" },
		model: "anthropic/haiku",
	}),
);
```

Three things are new. `residents: 4` makes the ids `A01` to `A04`, which `teams` splits in two. The **grant
override** `{ drop: ["readTeam"] }` takes one tool from what the residents are granted; every other tool stays granted
as its mechanic declares it. And the game is a **family**: `Params` is a schema whose properties each carry a
default, and the function builds the game of one param set
([`samples/team-game/game.ts`](../../samples/team-game/game.ts)):

```ts
const Params = Type.Object({ games: Type.Integer({ minimum: 1, maximum: 5, default: 1, description: "Games in the match." }) }, { description: "The variants of the team game." });
```

`--set games=2` picks another value, checked against the schema, and each value is another game with its own hash.
The same game also has a data form, [`samples/team-game/game.yaml`](../../samples/team-game/game.yaml), which names
each mechanic by its id; `swt` finds the ids in the packages that the sample's `package.json` lists. A data game has
no params, so it is the family at its defaults:

```yaml
mechanics:
  - use: grid
    options: { teams: { X: [A01, A02], O: [A03, A04] }, games: 1, wakeTeam: true }
  - use: consensus
    options: { teams: { X: [A01, A02], O: [A03, A04] } }
  - use: team-channel
    options: { teams: { X: [A01, A02], O: [A03, A04] } }
grants:
  resident: { drop: [readTeam] }
```

Run both forms, check the log and replay it
([`samples/team-game/commands.sh`](../../samples/team-game/commands.sh)):

```bash
node --conditions development apps/cli/src/bin.ts run samples/team-game/game.ts --fake
node --conditions development apps/cli/src/bin.ts run samples/team-game/game.yaml --fake
node --conditions development apps/cli/src/bin.ts log verify runs/team-game-002
node --conditions development apps/cli/src/bin.ts replay runs/team-game-002 --game samples/team-game/game.ts
node --conditions development apps/cli/src/bin.ts run samples/team-game/game.ts --fake --set games=2
```

The first command begins with ([`samples/team-game/output.txt`](../../samples/team-game/output.txt)):

```text
fake models: no result
team-game seed 2: ended after 10 ticks (limit grid.match: the match is over)
result grid.tally: {"X":1,"O":0,"draw":0}
```

The YAML run writes the same log line for line, so its replay against `game.ts` is equal. Leave `gridGame(...)` out
of `mechanics` and `consensus` has no provider of the service it requires; the game is refused before the run starts
(the error as [the sample's README](../../samples/team-game/README.md) shows it, taken from its test):

```text
error SWT-G030: mechanic "consensus" needs the service "consensus-source", and no mechanic of the game provides it
  at mechanics[0]
  A mechanic runs only when every service it requires is provided by a mechanic of the same game.
  fix: Add a mechanic that provides "consensus-source" to `mechanics`, or remove "consensus".
  docs: docs/reference/errors.md#swt-g030
```

## 3. Roles and private texts

Sample 3 is sample 2's game with roles: one captain per team for the whole match, and one adviser. The game names the
roles once ([`samples/roles/game.ts`](../../samples/roles/game.ts)):

```ts
const teams = { X: ["A01", "A02"], O: ["A03", "A04"] };
const roles = { captain: ["A01", "A03"], adviser: ["A02", "A04"] };
```

A **briefing** is a text one resident reads before the run starts, first in its system prompt. The game format takes
one text for every resident, or one per resident id; a role is not a key of it, so the game builds one text per
resident from the text of its role and a line for it alone
([`samples/roles/game.ts`](../../samples/roles/game.ts)):

```ts
/** One briefing per resident: the text of its role, then its own line. */
const briefing = Object.fromEntries(Object.entries(roles).flatMap(([role, members]) => members.map((id) => [id, `${byRole[role] ?? ""}\n${personal[id] ?? ""}`])));
```

`roles` goes into the game as it is, and `grid` gets `fixedCaptain: true`, so the first member of each team, the one
the role names, is its captain for the whole match
([`samples/roles/game.ts`](../../samples/roles/game.ts)):

```ts
	roles,
	mechanics: [gridGame({ teams, games: 1, wakeTeam: true, fixedCaptain: true }), consensus({ teams }), teamChannel({ teams })],
```

A role says what a resident is told; a mechanic's option says what it may do. No shipped mechanic gives a role a rule
of its own, so `fixedCaptain` is what makes the roles true. What each resident reads, and what it does not (the
other team's channel, any other resident's briefing), is the table of
[the sample's README](../../samples/roles/README.md), and its tests check it on the log. The game format has one
`model` for every resident: two models are compared as two experiments over the same game and seeds, not mixed in
one run. Run it ([`samples/roles/commands.sh`](../../samples/roles/commands.sh)):

```bash
node --conditions development apps/cli/src/bin.ts run samples/roles/game.ts --fake
node --conditions development apps/cli/src/bin.ts log verify runs/roles-001
node --conditions development apps/cli/src/bin.ts replay runs/roles-001 --game samples/roles/game.ts
```

The run folder's `texts.json` holds the four briefings as the residents read them, and its manifest names the hash
of each.

## 4. A Director and its dial

A **Director** is a model actor that is not a resident: it takes no turns, something wakes it, it asks its model one
question and acts on the answer through the tools of its grant. Sample 4 places one in sample 2's game, the coach,
which every second tick may send the captain on move one private note. `channels` carries the notes, `directors`
places the coach with its dial, and the grant names what each actor may call
([`samples/shipped-director/game.ts`](../../samples/shipped-director/game.ts)):

```ts
		mechanics: [gridGame({ teams, games: 1, wakeTeam: true }), consensus({ teams }), teamChannel({ teams }), channels({ noteAuthor: "COACH", windowMinutes: 2 })],
		directors: [{ use: coach, options: { direction } }],
		grants: { resident: ["postTeam", "viewBoard", "playMove", "proposeMove", "castVote"], coach: ["notify"] },
		scheduler: { id: "turns", options: { activation: "onNews", afterBlocks: ["director"] } },
```

The scheduler gives Directors their slot (`afterBlocks: ["director"]`). The coach's head is data: a tick trigger
`{ every: 2 }` wakes it, it reads two facts of `grid`, its answer is one note, and it is asked at most five times a
run ([`samples/shipped-director/src/coach.ts`](../../samples/shipped-director/src/coach.ts)):

```ts
		id: "coach",
		summary: "Every second tick, may send the captain on move one private note; its dial direction says how strongly it steers.",
		options: CoachOptions,
		on: [{ every: 2 }],
		facts: ["grid.captain", "grid.tally"],
		output: Type.Object({ note: Type.String({ maxLength: 200, description: "The note to the captain; empty sends nothing." }) }, { additionalProperties: false, description: "The coach's answer" }),
		limits: { maxCalls: 5 },
```

Its dial, `direction`, is an option of its schema. The game makes it a param, so `--set direction=8` picks its
value ([`samples/shipped-director/game.ts`](../../samples/shipped-director/game.ts)):

```ts
const Params = Type.Object({ direction: Type.Integer({ minimum: 0, maximum: 10, default: 0, description: "The coach's dial." }) }, { description: "The variants of the coached game." });
```

Play it at 0 and at 8 ([`samples/shipped-director/commands.sh`](../../samples/shipped-director/commands.sh)):

```bash
node --conditions development apps/cli/src/bin.ts run samples/shipped-director/game.ts --fake
node --conditions development apps/cli/src/bin.ts run samples/shipped-director/game.ts --fake --set direction=8
node --conditions development apps/cli/src/bin.ts log verify runs/coached-game-002
node --conditions development apps/cli/src/bin.ts replay runs/coached-game-002 --game samples/shipped-director/game.ts
```

The fake model gives the coach no answer, so it acts on its fallback: at 0 it says nothing, at 8 it reminds the
captain on move. The two logs differ from the coach's first look on: at 8 they hold `gamemaker_note` events, the
captains are woken by them, and the match takes another course. With a model, the dial changes the coach's system
text instead. The shipped Directors of `@swarmtales/city-directors` are not placed here, because each needs the
City's run frame; [the sample's README](../../samples/shipped-director/README.md) shows why, and
[Write a Director](director.md) builds one woken by an event.

## 5. Play with a model

Without `--fake` the run asks the game's model, Haiku, with the key of `SWT_ANTHROPIC_API_KEY`; `swt doctor` says
whether it is set. This is the one command of the tutorial that no test runs:

```bash no-test: a live run asks a model, needs a key and costs money; the tests play offline only
node --conditions development apps/cli/src/bin.ts run samples/team-game/game.ts
```

## Where next

- Rules of your own: [Write a mechanic](mechanic.md), sample 5.
- A Director of your own, woken by an event: [Write a Director](director.md), sample 6.
- Who acts when: [Write a scheduler](scheduler.md).
- Every command and flag: [the reference of the command line](../reference/cli.md).
