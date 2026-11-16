// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The command line in a child process, for the standing parts (decision A112): in process, one fake run of Whispers
 * held a Vitest worker's event loop for 76 to 103 s, past Vitest's 60 s RPC timeout; in a child the worker only waits.
 * Started by `cliProcess` of `standing-cache.ts` with the condition `development` and an IPC channel, it runs the
 * commands it is sent one after the other, as `cli` of `support.ts` runs them in process (a clock that stands still,
 * no variable of the environment), and answers each with what it printed. The modules stay loaded between commands.
 */
import { main, type CliIo } from "../src/main.ts";
import { Type } from "typebox";
import { Parse } from "typebox/value";

const Command = Type.Object(
	{ id: Type.Number(), cwd: Type.String(), args: Type.Array(Type.String()) },
	{ description: "One command for the child: its number, its working directory and its arguments" },
);

/** Runs one command and returns what it printed. */
async function run(cwd: string, args: readonly string[]): Promise<{ code: number; out: readonly string[]; err: string }> {
	const out: string[] = [];
	const err: string[] = [];
	const io: CliIo = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: (line) => out.push(line), err: (line) => err.push(line), env: {} };
	const code = await main(args, io);
	return { code, out, err: err.join("\n") };
}

let queue: Promise<void> = Promise.resolve();
process.on("message", (message: unknown) => {
	const { id, cwd, args } = Parse(Command, message);
	queue = queue.then(async () => {
		try {
			process.send?.({ id, ...(await run(cwd, args)) });
		} catch (error) {
			// A command that throws fails its test in the parent, as it does in process.
			process.send?.({ id, thrown: error instanceof Error ? (error.stack ?? error.message) : String(error) });
		}
	});
});
