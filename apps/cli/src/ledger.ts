// SPDX-License-Identifier: Apache-2.0
/**
 * The spend ledger: the cap of a milestone held by code. A JSON-lines file whose first line is `{ "capUsd": n }`;
 * every run adds `{ "run", "id", "reservedUsd" }` before it starts and `{ "run", "id", "costUsd" }` after it ended.
 * The `id` is made new for every reservation and pairs the two lines: the name of a run comes back when its folder
 * is deleted, the id never does. A line without an id (written before the id existed, or a cost added by hand) is
 * paired by the run's name. This is the only file that reads or writes a ledger.
 */
import { randomUUID } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { SwtError, type SwtIssue } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Check } from "typebox/value";

const usd = (description: string): ReturnType<typeof Type.Number> => Type.Number({ minimum: 0, description });
const Cap = Type.Object({ capUsd: usd("The most that all runs of the ledger may cost, in USD") }, { description: "The first line of a ledger" });
const id = Type.Optional(Type.String({ minLength: 1, description: "What pairs a reservation with its cost line; absent in a line that is paired by the run's name" }));
const Reserved = Type.Object({ run: Type.String({ description: "The run" }), id, reservedUsd: usd("The cost cap of the run, held until its cost line") }, { description: "The line written before a run starts" });
const Cost = Type.Object({ run: Type.String({ description: "The run; `legacy/...` for a run of the old platform, added by hand" }), id, costUsd: usd("What the run cost") }, { description: "The line written after a run ended" });
// Sums of amounts with four decimals: a difference below this is the arithmetic, not money.
const EPSILON = 1e-9;

/**
 * `SWT-C025`: the spend ledger is unreadable, or the run's cap does not fit under the ledger's cap.
 *
 * @param input - The ledger and what is wrong with it.
 * @param input.file - The ledger file.
 * @param input.problem - What is wrong, as the rest of a sentence that starts with the file.
 * @returns The issue.
 *
 * @public
 */
export function ledgerRefused(input: { readonly file: string; readonly problem: string }): SwtIssue {
	return {
		code: "SWT-C025",
		summary: `the spend ledger "${input.file}" ${input.problem}`,
		why: "With `--ledger` a live run starts only when the costs of the runs before it, the caps of the runs that have no cost line yet and its own cap fit under the ledger's cap. A run that crashed keeps its whole cap.",
		fix: "Use a smaller `--budget`, or have the owner raise `capUsd` in the first line. A line that cannot be read is repaired by hand.",
	};
}

/**
 * A spend ledger, opened for one process.
 *
 * @public
 */
export interface Ledger {
	/**
	 * Checks that a run fits and writes its reservation, in one step without a wait between the two.
	 *
	 * @param run - The name of the run: its folder.
	 * @param usd - The cost cap of the run.
	 * @throws SwtError `SWT-C025` when the ledger cannot be read, or when the costs, the open reservations and `usd` together are above the cap; nothing is written then.
	 */
	reserve(run: string, usd: number): void;
	/**
	 * Writes the cost line of a run, which replaces its reservation in the sum: the last reservation this ledger
	 * object wrote under the name, and no reservation another process wrote under the same name.
	 *
	 * @param run - The name the run was reserved under.
	 * @param costUsd - What the run cost.
	 */
	settle(run: string, costUsd: number): void;
}

// The cap, and what is spent or held: every cost, and every reservation of a run that has no cost line.
function held(file: string): { readonly capUsd: number; readonly heldUsd: number; readonly open: boolean } {
	const refused = (problem: string): SwtError => new SwtError(ledgerRefused({ file, problem }));
	let text = "";
	try {
		text = readFileSync(file, "utf8");
	} catch {
		throw refused("cannot be read");
	}
	const lines = text.split("\n").map((line, index) => ({ line, number: index + 1 })).filter(({ line }) => line.trim() !== "");
	const values = lines.map(({ line, number }): unknown => {
		try {
			return JSON.parse(line);
		} catch {
			throw refused(`is no JSON in line ${String(number)}`);
		}
	});
	const [cap, ...entries] = values;
	if (!Check(Cap, cap)) throw refused('has no first line `{ "capUsd": n }`');
	const bad = entries.findIndex((entry) => Check(Reserved, entry) === Check(Cost, entry));
	if (bad >= 0) throw refused(`has a line ${String(lines[bad + 1]?.number)} that is neither a reservation nor a cost`);
	const costs = entries.filter((entry) => Check(Cost, entry));
	// A cost line settles the reservation of its id; one without an id settles the reservations of its name that have none.
	const settledIds = new Set(costs.flatMap((entry) => (entry.id === undefined ? [] : [entry.id])));
	const settledNames = new Set(costs.flatMap((entry) => (entry.id === undefined ? [entry.run] : [])));
	const reserved = entries.filter((entry) => Check(Reserved, entry)).filter((entry) => !(entry.id === undefined ? settledNames.has(entry.run) : settledIds.has(entry.id)));
	const heldUsd = costs.reduce((sum, entry) => sum + entry.costUsd, 0) + reserved.reduce((sum, entry) => sum + entry.reservedUsd, 0);
	return { capUsd: cap.capUsd, heldUsd, open: text !== "" && !text.endsWith("\n") };
}

/**
 * Opens a spend ledger. The file is read at every reservation, so a line another run wrote meanwhile counts.
 *
 * @param file - The ledger file; it must exist with its cap line.
 * @param now - The clock; every written line carries its time as `at`.
 * @returns The ledger.
 * @example
 * ```ts
 * const ledger = openLedger("games/m2-ledger.jsonl", () => new Date());
 * ledger.reserve("runs/quarry-001", 0.1); // refused with SWT-C025 when 0.1 USD more does not fit
 * ledger.settle("runs/quarry-001", 0.0412);
 * ```
 *
 * @public
 */
export function openLedger(file: string, now: () => Date): Ledger {
	const write = (line: object, open: boolean): void => {
		appendFileSync(file, `${open ? "\n" : ""}${JSON.stringify({ ...line, at: now().toISOString() })}\n`);
	};
	// The ids of the reservations this object wrote and has not settled, by the run's name.
	const ids = new Map<string, string>();
	return {
		reserve(run, reservedUsd) {
			const { capUsd, heldUsd, open } = held(file);
			if (heldUsd + reservedUsd > capUsd + EPSILON) throw new SwtError(ledgerRefused({ file, problem: `has no room for a run with a cap of ${reservedUsd.toFixed(2)} USD: ${heldUsd.toFixed(4)} USD of its ${capUsd.toFixed(2)} USD are spent or reserved` }));
			const id = randomUUID();
			write({ run, id, reservedUsd }, open);
			ids.set(run, id);
		},
		settle(run, costUsd) {
			const id = ids.get(run);
			ids.delete(run);
			write({ run, ...(id === undefined ? {} : { id }), costUsd }, held(file).open);
		},
	};
}
