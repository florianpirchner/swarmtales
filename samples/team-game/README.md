# @swarmtales/sample-team-game

Sample 2 of the sample ladder: combine mechanics. It builds on sample 1, the Hello Game
([`games/hello/`](../../games/hello/README.md)).

## What you build

Team tic-tac-toe: four residents in two teams of two share one board, each team talks in its own channel, and the
captain of the turn may play only the cell the team voted for. Three shipped mechanics make it, and none of them knows
the others' rules: they meet through services.

## Run it

From the root of the repository, the fake model plays (no key, no cost), and the same game in its data form writes the
same log; the lines are those of [`commands.sh`](commands.sh):

```sh
node --conditions development apps/cli/src/bin.ts run samples/team-game/game.ts --fake
node --conditions development apps/cli/src/bin.ts run samples/team-game/game.yaml --fake
node --conditions development apps/cli/src/bin.ts log verify runs/team-game-002
node --conditions development apps/cli/src/bin.ts replay runs/team-game-002 --game samples/team-game/game.ts
node --conditions development apps/cli/src/bin.ts run samples/team-game/game.ts --fake --set games=2
```

The first command prints first (the lines of [`output.txt`](output.txt)):

```text
fake models: no result
team-game seed 2: ended after 10 ticks (limit grid.match: the match is over)
result grid.tally: {"X":1,"O":0,"draw":0}
```

The second prints the same lines, and its run folder holds the same log line for line, so the replay of the YAML run
against [`game.ts`](game.ts) is equal. Without `--fake` the run asks Haiku with the key of `SWT_ANTHROPIC_API_KEY`
(`swt doctor` says whether it is set): `node --conditions development apps/cli/src/bin.ts run samples/team-game/game.ts`.

## The code

[`game.ts`](game.ts) imports three mechanics, each from its own package, and the builder from `swarmtales`:

```ts
import { consensus } from "@swarmtales/mechanic-consensus";
import { gridGame } from "@swarmtales/mechanic-grid";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame, defineGameFamily } from "swarmtales";
```

The game is a family: `Params` is a schema whose properties each carry a default, and the function builds the game of
one param set. `grid` gets the teams and wakes the whole team on move, so the member who is not captain can advise and
vote; `consensus` gets the same teams; `team-channel` gives each team a channel only its members read. The grant
override drops `readTeam` from what the residents are granted; every other tool stays granted as its mechanic declares
it ([`game.ts`](game.ts)):

```ts
export default defineGameFamily(Params, ({ games }) =>
	defineGame({
		id: "team-game",
		seed: 2,
		residents: 4,
		mechanics: [gridGame({ teams, games, wakeTeam: true }), consensus({ teams }), teamChannel({ teams })],
		// The channel shows new posts at the start of a turn, so no resident needs `readTeam`.
		grants: { resident: { drop: ["readTeam"] } },
```

[`game.yaml`](game.yaml) is the same game as data. It names each mechanic by its id; `swt` finds the ids in the
packages that [`package.json`](package.json) lists. A data game has no params, so it is the family at `games: 1`:

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

[`test/game.test.ts`](test/game.test.ts) plays the game with the fake model and asserts on its log: every move played
is the cell its team agreed on, every team post comes from a member of its team, nothing is refused; the residents are
granted every tool but `readTeam`; `game.yaml` resolves to the hash of `game.ts`, and `--set games=2` to another.
[`test/tutorial.test.ts`](test/tutorial.test.ts) runs the lines of `commands.sh` in process and checks that every code
block of this README stands in a file of the sample.

## What is new

Against sample 1:

- **Teams.** `grid`, `consensus` and `team-channel` each take the teams as an option, checked against the residents
  when the run starts.
- **Three mechanics and a service between them.** `consensus` requires the service `consensus-source` (who is on move,
  who is captain, which cells are legal), and `grid` provides it. The game lists both, in any order: the load order
  follows the services. `grid` also uses `consensus` and `team-channel` when they are loaded (it resets the vote and
  opens a new chat at each game), and plays without them, as in sample 1.
- **A grant override.** Without `grants` a resident gets every tool whose mechanic names `resident`; a list replaces
  that, and `{ drop, add }` changes it.
- **Params and `--set`.** `defineGameFamily` declares typed variants; `--set games=2` is checked against the schema
  (`SWT-G041` for a name that is no param or a value that does not fit), and the variant is another game with another
  hash.
- **The same game as YAML.** A game in its data form resolves to the same game, with the same hash and the same log.

Leave `gridGame(...)` out of `mechanics` and `consensus` has no provider of the service it requires. The game is
refused before the run starts, with this error (taken from `test/game.test.ts`):

```text
error SWT-G030: mechanic "consensus" needs the service "consensus-source", and no mechanic of the game provides it
  at mechanics[0]
  A mechanic runs only when every service it requires is provided by a mechanic of the same game.
  fix: Add a mechanic that provides "consensus-source" to `mechanics`, or remove "consensus".
  docs: docs/reference/errors.md#swt-g030
```

## Try next

1. `--set games=3`: a match of three games; X starts the first and the third, and `result grid.tally` counts three.
2. Leave `teamChannel(...)` out: the game is refused with `SWT-G012`, because the grant override drops `readTeam`,
   which no mechanic of the game defines now. Take the override out too, and the teams vote without talking: `grid`
   only uses the service of `team-channel`.
3. Take `wakeTeam: true` from `grid`: only the captain is woken, the member who votes is never asked, and every move
   is a forfeit after `consensus`'s `maxRounds`.

## Reference

- The mechanics: [grid](../../mechanics/grid/README.md), [consensus](../../mechanics/consensus/README.md),
  [team-channel](../../mechanics/team-channel/README.md).
- The errors: [`SWT-G012`](../../docs/reference/errors.md#swt-g012), [`SWT-G030`](../../docs/reference/errors.md#swt-g030),
  [`SWT-G041`](../../docs/reference/errors.md#swt-g041).
- The command line (`run`, `log verify`, `replay`, `--set`): [docs/reference/cli.md](../../docs/reference/cli.md).
- The full game with a strategy brain and a referee: [games/tictactoe](../../games/tictactoe/README.md).
