// SPDX-License-Identifier: Apache-2.0
/**
 * `pnpm check`: every gate, with the time and the peak memory of each, and a budget for the whole (10 minutes, 6
 * GB). The lanes of the gate list run side by side, the gates of a lane one after the other (M4-71); the output of a
 * gate is printed when it ends, so the outputs do not mix. The summary at the end is what a pull request quotes while
 * the workflow is not required yet.
 *
 * Memory is the resident memory of the process groups of all running gates together, sampled four times a second
 * through `ps`. A machine without `ps` cannot enforce the memory budget, so the check fails there (Windows is the one
 * exception: the budget is enforced by the workflow's runner). The gates that still run when the time budget ends are
 * stopped, so a hanging gate fails the check and does not hold it up; the first failed gate stops the others.
 */
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { REPO_ROOT } from "./lib/files.ts";
import { CHECK_BUDGET, GATES, groupMemoryMb, lanes, summary, failures, type Gate, type GateResult } from "./lib/check-run.ts";

const running = new Map<ChildProcess, { peakMb: number | undefined }>();
let peakMb: number | undefined;
let stopping = false;
let overtime = false;

function sampleMemory(): void {
	let output: string;
	try {
		output = execFileSync("ps", ["-eo", "pgid=,rss="], { encoding: "utf8" });
	} catch {
		return;
	}
	let sum = 0;
	for (const [child, gate] of running) {
		if (child.pid === undefined) continue;
		const now = groupMemoryMb(output, child.pid);
		gate.peakMb = Math.max(gate.peakMb ?? 0, now);
		sum += now;
	}
	if (running.size > 0) peakMb = Math.max(peakMb ?? 0, sum);
}

function stopAll(): void {
	stopping = true;
	for (const child of running.keys()) {
		try {
			if (child.pid !== undefined) process.kill(-child.pid, "SIGTERM");
		} catch {
			// The gate has already ended.
		}
	}
}

function run(gate: Gate): Promise<GateResult | undefined> {
	const [command = "", ...args] = gate.command;
	const started = performance.now();
	const child = spawn(command, args, { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
	const memory: { peakMb: number | undefined } = { peakMb: undefined };
	running.set(child, memory);
	const output: Buffer[] = [];
	child.stdout.on("data", (chunk: Buffer) => output.push(chunk));
	child.stderr.on("data", (chunk: Buffer) => output.push(chunk));
	return new Promise((resolve) => {
		const finish = (ok: boolean): void => {
			running.delete(child);
			const seconds = (performance.now() - started) / 1000;
			const stopped = stopping && !ok;
			console.log(`\n=== ${gate.name}: ${gate.command.join(" ")} (${stopped ? "stopped" : ok ? "pass" : "FAIL"}, ${seconds.toFixed(1)} s)`);
			process.stdout.write(Buffer.concat(output));
			// A gate that another gate's failure stopped did not run to its end: it is no result of its own.
			resolve(stopped && !overtime ? undefined : { name: gate.name, ok, seconds, peakMb: memory.peakMb });
		};
		child.once("error", () => {
			finish(false);
		});
		child.once("close", (code) => {
			finish(code === 0);
		});
	});
}

async function lane(gates: readonly Gate[], results: GateResult[]): Promise<void> {
	for (const gate of gates) {
		if (stopping) return;
		const result = await run(gate);
		if (result !== undefined) results.push(result);
		if (result?.ok !== true) {
			stopAll();
			return;
		}
	}
}

let measurable = process.platform === "win32";
try {
	measurable ||= execFileSync("ps", ["-eo", "pgid=,rss="], { encoding: "utf8" }).length > 0;
} catch {
	// No `ps`: see below.
}
const results: GateResult[] = [];
const started = performance.now();
const timer = setInterval(sampleMemory, 250);
// One second more than the budget, so the summary reports the crossed budget and not only a stopped gate.
const budget = setTimeout(() => {
	overtime = true;
	console.error(`\ncheck: the time budget of ${CHECK_BUDGET.seconds} s ended; stopping ${[...running.keys()].length} gate(s)`);
	stopAll();
}, (CHECK_BUDGET.seconds + 1) * 1000);
process.once("SIGINT", stopAll);
if (measurable) await Promise.all(lanes(GATES).map((gates) => lane(gates, results)));
clearInterval(timer);
clearTimeout(budget);
if (!measurable) console.error("check: `ps` is missing, so the memory budget cannot be enforced; install procps");
const order = (result: GateResult): number => GATES.findIndex((gate) => gate.name === result.name);
const checked = { results: results.sort((left, right) => order(left) - order(right)), seconds: (performance.now() - started) / 1000, peakMb };
console.log(`\n${summary(checked)}`);
process.exitCode = failures(checked).length === 0 ? 0 : 1;
