# Context reset

A resident's conversation is append-only (`HostResidentRunner`, `packages/roles/src/agents/host-runner.ts`):
every turn adds its inputs, the model's answer and the tool results, and a snapshot saves all of it.
A story with games in a row (tic-tac-toe teams, `docs/ideas/tictactoe-teams.md`) needs the opposite at
a game boundary: forget the last game, start from a fresh briefing. This is that, without a change in
`packages/kernel` or `packages/contracts`.

## Design

The request travels as a **turn input line of a reserved kind**. A mechanic's `turnInputs` hook already
returns lines for a resident's next turn, plain or with a kind (`TurnLine`); the host passes each line
on in `Turn.inputs` with its kind (`TurnNote.kind`). The runner checks the notes of the turn it is
about to play:

```ts
import { CONTEXT_RESET_KIND } from "@swarmtales/roles"; // "context-reset"
```

If any note has `kind === CONTEXT_RESET_KIND`, the runner drops every message but the system
messages (the system prompt and the tool declarations) before it adds the turn's inputs. The notes of
that turn, in the policy's order, are then the whole fresh conversation: the reset line itself is the
briefing (text of the line is shown to the resident like any other), further lines (status, the new
board) follow it, and the tools notice is sent again because the resident no longer remembers the last one.

Why a line and not a new host channel:

- It uses an existing contract hook, so the kernel, the contracts and the mechanic API stay as they are.
- It is stateless in the runner. Whether to reset is decided by the mechanic's own state (the game
  counter in its snapshot slice), so a resume decides the same.
- The reset is visible in the log: the `turn_input` event of that turn holds the briefing, and the run
  shows exactly what the resident was told after the reset.

## How a mechanic requests it

In `turnInputs`, return one line of that kind, **once**, for each resident that starts a new game:

```ts
hooks: {
	turnInputs: (resident, ctx) =>
		ctx.state.newGame.delete(resident)
			? [{ kind: "context-reset", text: briefing(resident, ctx) }, { kind: "status", text: boardText(ctx) }]
			: [{ kind: "status", text: boardText(ctx) }],
},
```

- The mechanic must forget the pending reset when it emits the line (the example deletes it from state),
  or the resident is reset on every turn. State changed in `turnInputs` belongs to a phase that may
  change state (see the hook's doc), so order it after the read-only phases.
- The kind is a plain string, `"context-reset"`, so a mechanic needs no import from `@swarmtales/roles`.
- A story whose turn policy lists `inputs` kinds must either list `"context-reset"` first or accept
  that unlisted kinds follow in load order; the briefing then follows other lines. Listing it first is
  recommended.
- Reset at a game boundary means the turn at which the new game's first input is built. A resident
  that has no turn in that minute (suspended) is reset at its next turn.
- The system prompt is not reset. A briefing that must change per game goes into the reset line, not
  into the prompt.

## Snapshots and resume

A run snapshot keeps each resident's context (`HostResidentRunner.snapshot()`: every message but the
system messages). The reset replaces the live context, so:

- A snapshot taken after the reset turn holds the reset context: the briefing and what followed, not
  the earlier games. Nothing else needs saving; the runner has no hidden state besides the last tools
  notice, which is read back from the messages (`lastAnnounced`) on `restore`.
- A snapshot taken before the reset turn holds the old context. A resume plays the reset turn again
  from the mechanic's restored state and drops it then.
- `contextResets` (the runner's count) is for tests and reports only; it is not saved and restarts at 0
  after a resume.
- The signed event log is never rewritten: it keeps the pre-reset conversation as events. Only the
  model's working context is cut.

## Limits

- The generic CoreStory runner (`apps/cli/src/host/core-run.ts`) has no snapshot or resume yet, so
  today the snapshot behaviour is covered at the runner level (`test/agents/context-reset.test.ts`).
- The memory a team keeps across games must live in the mechanics (a "brain" slice in the briefing), not in
  the conversation; that is the point of the reset.
- A reset also drops the model's cached prefix beyond the system prompt; expect a cache write at the
  start of each game.

## Tests

`test/agents/context-reset.test.ts` (runner: reset, snapshot, restore) and `test/cli/core-run.test.ts`
(a mechanic with game boundaries through the generic runner), both offline with scripted providers.
