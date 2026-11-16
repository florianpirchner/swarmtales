# @swarmtales/sample-shipped-director

Sample 4 of the sample ladder: a Director and its dial. It builds on sample 2, team tic-tac-toe
([`samples/team-game/`](../team-game/README.md)).

## What you build

Sample 2's game with a Director placed in it: the coach. Every second minute it looks at the board's captain on move
and may send that captain one private note. Its dial, `direction`, says how strongly it steers. You play the game
twice, with the dial at 0 and at 8, and read the difference from the two logs.

The shipped Directors (the gamemaker, the Confessor, the judge and the guard of
[`@swarmtales/city-directors`](../../mechanics/city-directors/README.md)) are not placed here: each needs the City's
run frame, so the coach is a Director of this sample, built from the same parts (see "What is new").

## Run it

From the root of the repository, the fake model plays (no key, no cost); the lines are those of
[`commands.sh`](commands.sh):

```sh
node --conditions development apps/cli/src/bin.ts run samples/shipped-director/game.ts --fake
node --conditions development apps/cli/src/bin.ts run samples/shipped-director/game.ts --fake --set direction=8
node --conditions development apps/cli/src/bin.ts log verify runs/coached-game-002
node --conditions development apps/cli/src/bin.ts replay runs/coached-game-002 --game samples/shipped-director/game.ts
```

The first command plays at the dial's default, 0, and prints first (the lines of [`output.txt`](output.txt)):

```text
fake models: no result
coached-game seed 2: ended after 18 ticks (limit grid.match: the match is over)
result grid.tally: {"X":0,"O":1,"draw":0}
```

The second plays at 8. The fake model gives the coach no answer, so the coach acts on its fallback: at 0 it says
nothing, at 8 it reminds the captain on move. The two logs differ from the coach's first look on: at 8 they hold
`gamemaker_note` events (the note desk of `channels` names every Director's note so), the captains are woken by them,
and the match takes another course. Without `--fake` the run asks Haiku with the key of `SWT_ANTHROPIC_API_KEY`
(`swt doctor` says whether it is set).

## The code

[`game.ts`](game.ts) is sample 2's game with `channels`, which carries the coach's notes, and the coach in
`directors`. The grant names what each actor may call: the residents keep sample 2's tools, the coach gets `notify`:

```ts
		mechanics: [gridGame({ teams, games: 1, wakeTeam: true }), consensus({ teams }), teamChannel({ teams }), channels({ noteAuthor: "COACH", windowMinutes: 2 })],
		directors: [{ use: coach, options: { direction } }],
		grants: { resident: ["postTeam", "viewBoard", "playMove", "proposeMove", "castVote"], coach: ["notify"] },
```

[`src/coach.ts`](src/coach.ts) defines the coach. Its head is data: a tick trigger `{ every: 2 }` wakes it at the
start of every second tick (0, 2, 4, ...), it reads two facts of `grid`, its answer is one note, and it is asked at
most five times a run:

```ts
		id: "coach",
		summary: "Every second tick, may send the captain on move one private note; its dial direction says how strongly it steers.",
		options: CoachOptions,
		on: [{ every: 2 }],
		facts: ["grid.captain", "grid.tally"],
		output: Type.Object({ note: Type.String({ maxLength: 200, description: "The note to the captain; empty sends nothing." }) }, { additionalProperties: false, description: "The coach's answer" }),
		limits: { maxCalls: 5 },
```

The body builds the question and acts on the answer. The dial reaches both: the system text says whether to steer,
and the fallback, the answer when the model gives none, is a reminder from direction 1 on ([`src/coach.ts`](src/coach.ts)):

```ts
		system: ({ options: { direction } }) =>
			[
				"You coach one game of team tic-tac-toe. Every second minute you may send the captain on move one private note.",
				direction === 0 ? "Direction 0: do not steer. Answer with an empty note." : `Direction ${String(direction)} of 10: steer the captain toward a line of three; the higher the direction, the more plainly you name the cell.`,
				'Answer with JSON: { "note": string }, at most 200 characters.',
			].join("\n"),
		input: (ctx) => `Minute ${String(ctx.tick)}. Captain on move: ${captainOf(ctx) ?? "nobody"}. Games won: ${JSON.stringify(Check(Tally, ctx.facts["grid.tally"]) ? ctx.facts["grid.tally"] : {})}.`,
		act: async (answer, ctx) => {
			const captain = captainOf(ctx);
			if (answer.note !== "" && captain !== undefined) await ctx.call("notify", { agent: captain, text: answer.note });
		},
		fallback: (ctx) => {
			const captain = captainOf(ctx);
			return ctx.options.direction === 0 || captain === undefined ? undefined : { note: `${captain}, ${COACH_REMINDER}` };
		},
```

Back in [`game.ts`](game.ts), the dial is a param of the game, so `--set direction=8` picks its value and each value is
another game with its own hash:

```ts
const Params = Type.Object({ direction: Type.Integer({ minimum: 0, maximum: 10, default: 0, description: "The coach's dial." }) }, { description: "The variants of the coached game." });
```

[`test/game.test.ts`](test/game.test.ts) plays both values with an asker of the test: the coach is asked at ticks 0,
2, 4, 6 and 8 and skipped after its fifth question; at 0 the log holds no note, at 8 the reminders, and the note desk
refuses the same reminder twice in a row to one captain (`REPEATED`); a model's note reaches the captain at either
value. [`test/tutorial.test.ts`](test/tutorial.test.ts) runs the lines of `commands.sh` in process and checks that
every code block of this README stands in a file of the sample.

## What is new

Against samples 2 and 6:

- **A Director placed in a game.** `directors` names it; its actor is `director:coach` and its grant is `coach`. The
  scheduler gives Directors their slot (`afterBlocks: ["director"]`), else the game is refused with `SWT-D003`.
- **A tick trigger.** `{ every: n }` wakes a Director at the start of every n-th tick, before the residents' first
  pass, where sample 6's steward is woken by an event.
- **A dial.** An option of the Director's schema, here set by a param of the game, read by its system text and its
  fallback. With a model, the system text is what changes; with the fake model, the fallback.
- **A shipped mechanic's note desk.** `notify` of `channels` checks the note (length, a repeat, the budget of
  `notesPerAgent` within `windowMinutes`) and writes `gamemaker_note`; the coach only calls it.
- **Reading a dial from the log.** The records `asked` and `answered` of the engine say when the coach was asked and
  whether it acted on its fallback (`"fallback": true`); the notes and their effect are ordinary events.

Why not a shipped Director: the gamemaker and the Confessor are woken by `arena.round_end`, the end of a round of the
City's run frame, and the gamemaker always reads the facts of `progression`. Place the gamemaker in this game with
`arena` added, as [`test/game.test.ts`](test/game.test.ts) does, and the game is refused before the run starts:

```text
error SWT-G030: mechanic "arena" needs the service "progression", and no mechanic of the game provides it
  at mechanics[4]
  A mechanic runs only when every service it requires is provided by a mechanic of the same game.
  fix: Add a mechanic that provides "progression" to `mechanics`, or remove "arena".
  docs: docs/reference/errors.md#swt-g030
```

`progression` in turn needs `ledger`, `channels` and the levels of `puzzles`: the City itself. The judge and the guard
answer the reviews of `receipts` and `puzzles`, City mechanics too. The gamemaker's dial, `direction` (0, 4, 6, 8, 10),
is the param `gmDirection` of [`games/whispers`](../../games/whispers/README.md).

## Try next

1. `--set direction=4`: the coach steers less plainly; with the fake model its notes are those at 8, because the
   fallback reads only whether the dial is 0.
2. Change `{ every: 2 }` to `{ every: 3 }`: the coach is asked at ticks 0, 3, 6, 9 and 12.
3. Take `afterBlocks: ["director"]` out of the scheduler: the game is refused with `SWT-D003`.

## Reference

- The mechanics: [grid](../../mechanics/grid/README.md), [consensus](../../mechanics/consensus/README.md),
  [team-channel](../../mechanics/team-channel/README.md), [channels](../../mechanics/channels/README.md).
- A Director of your own, woken by an event: [sample 6](../own-director/README.md) and its tutorial
  [Write a Director](../../docs/tutorials/director.md).
- The errors: [`SWT-D003`](../../docs/reference/errors.md#swt-d003), [`SWT-G030`](../../docs/reference/errors.md#swt-g030).
- The command line (`run`, `log verify`, `replay`, `--set`): [docs/reference/cli.md](../../docs/reference/cli.md).
