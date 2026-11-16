// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** What the tests of `swt run` and `swt resume` share: the command in process, the log of a run folder, and a resumed log without its marker (`events.ts`). */
import { main, type CliIo } from "../src/main.ts";
import type { Printed } from "./events.ts";

export { eventsOf, withoutMarker, type Printed, type StoredEnvelope } from "./events.ts";

/**
 * The command line in process, with a clock that stands still: `const swt = cli(cwd); await swt("run", file, "--fake")`.
 * Relative paths (the game file aside, give that one absolute) start at `cwd`.
 */
export function cli(cwd: string): (...args: readonly string[]) => Promise<Printed> {
	return async (...args) => {
		const out: string[] = [];
		const err: string[] = [];
		const io: CliIo = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: (line) => out.push(line), err: (line) => err.push(line), env: {} };
		const code = await main(args, io);
		return { code, out, err: err.join("\n"), issue: /SWT-[A-Z]\d{3}/.exec(err.join("\n"))?.[0] };
	};
}
