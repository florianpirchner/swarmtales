// SPDX-License-Identifier: Apache-2.0
/**
 * `pnpm check`: every gate in order, with the time and the peak memory of each, and a budget for the whole
 * (10 minutes, 6 GB). The summary at the end is what a pull request quotes while the workflow is not required yet.
 *
 * Memory is the resident memory of the gate's whole process group, sampled four times a second through `ps`. A
 * machine without `ps` cannot enforce the memory budget, so the check fails there (Windows is the one exception:
 * the budget is enforced by the workflow's runner). A gate that is still running when the time budget ends is
 * stopped, so a hanging gate fails the check and does not hold it up.
 */
import { execFileSync, spawn } from "node:child_process";
import { REPO_ROOT } from "./lib/files.ts";
import { CHECK_BUDGET, failures, GATES, groupMemoryMb, summary, type Gate, type GateResult } from "./lib/check-run.ts";

function sampleMemoryMb(group: number): number | undefined {
	try {
		return groupMemoryMb(execFileSync("ps", ["-eo", "pgid=,rss="], { encoding: "utf8" }), group);
	} catch {
		return undefined;
	}
}

function run(gate: Gate, secondsLeft: number): Promise<GateResult> {
	const [command = "", ...args] = gate.command;
	console.log(`\n=== ${gate.name}: ${gate.command.join(" ")}`);
	const started = performance.now();
	const child = spawn(command, args, { cwd: REPO_ROOT, stdio: "inherit", detached: true });
	let peakMb: number | undefined;
	const sample = (): void => {
		const now = child.pid === undefined ? undefined : sampleMemoryMb(child.pid);
		if (now !== undefined) peakMb = Math.max(peakMb ?? 0, now);
	};
	const timer = setInterval(sample, 250);
	const stop = (): void => {
		try {
			if (child.pid !== undefined) process.kill(-child.pid, "SIGTERM");
		} catch {
			// The gate has already ended.
		}
	};
	const overtime = setTimeout(() => {
		console.error(`\ncheck: the time budget of ${CHECK_BUDGET.seconds} s ended during "${gate.name}"; stopping it`);
		stop();
	}, Math.max(0, secondsLeft) * 1000);
	process.once("SIGINT", stop);
	return new Promise((resolve) => {
		const finish = (ok: boolean): void => {
			clearInterval(timer);
			clearTimeout(overtime);
			process.removeListener("SIGINT", stop);
			resolve({ name: gate.name, ok, seconds: (performance.now() - started) / 1000, peakMb });
		};
		child.once("error", () => {
			finish(false);
		});
		child.once("exit", (code) => {
			finish(code === 0);
		});
	});
}

const measurable = process.platform === "win32" || sampleMemoryMb(process.pid) !== undefined;
const results: GateResult[] = [];
const started = performance.now();
for (const gate of measurable ? GATES : []) {
	// One second more than the budget, so the summary reports the crossed budget and not only a stopped gate.
	const result = await run(gate, CHECK_BUDGET.seconds + 1 - (performance.now() - started) / 1000);
	results.push(result);
	if (!result.ok) break;
}
if (!measurable) console.error("check: `ps` is missing, so the memory budget cannot be enforced; install procps");
console.log(`\n${summary(results)}`);
process.exitCode = failures(results).length === 0 ? 0 : 1;
