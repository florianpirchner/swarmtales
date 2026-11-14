/**
 * Criterion 2 of DECISIONS.md D1, first half: `tsc --noEmit` on `channels` and `chess` in the
 * head-and-body form (the packages under `mechanics/`), in the one-object form and in the
 * declared-head form (the copies here). Each project is checked RUNS times; the median of the total time is reported, with the
 * type count, the instantiation count and the memory of the median run. The head-and-body projects
 * (`tsconfig.hb-*.json`) take the sources of the packages under `mechanics/` with the same options and
 * references as the one-object projects, without `composite`, so no build info shortens the check.
 * Run from the repository root after `tsc -b mechanics/channels mechanics/chess`:
 * `node spike/define-mechanic/measure/tsc-time.mjs [runs]`.
 */
import { spawnSync } from "node:child_process";

const RUNS = Number(process.argv[2] ?? 3);
const PROJECTS = [
	["head-and-body", "channels", "spike/define-mechanic/tsconfig.hb-channels.json"],
	["head-and-body", "chess", "spike/define-mechanic/tsconfig.hb-chess.json"],
	["one-object", "channels", "spike/define-mechanic/tsconfig.one-channels.json"],
	["one-object", "chess", "spike/define-mechanic/tsconfig.one-chess.json"],
	["declared-head", "channels", "spike/define-mechanic/tsconfig.declared-channels.json"],
	["declared-head", "chess", "spike/define-mechanic/tsconfig.declared-chess.json"],
	// Not part of the sums: the chess variant with the head written apart.
	["head-apart", "chess", "spike/define-mechanic/tsconfig.one-chess-head-apart.json"],
];

const field = (text, name) => {
	const match = new RegExp(`^${name}:\\s+([\\d.]+)`, "m").exec(text);
	return match === null ? Number.NaN : Number(match[1]);
};

const results = [];
for (const [form, name, project] of PROJECTS) {
	const runs = [];
	for (let run = 0; run < RUNS; run += 1) {
		const started = performance.now();
		const done = spawnSync("node_modules/.bin/tsc", ["--noEmit", "-p", project, "--extendedDiagnostics"], { encoding: "utf8" });
		const wall = (performance.now() - started) / 1000;
		if (done.status !== 0) throw new Error(`${project} does not compile:\n${done.stdout}`);
		runs.push({ wall, total: field(done.stdout, "Total time"), check: field(done.stdout, "Check time"), types: field(done.stdout, "Types"), instantiations: field(done.stdout, "Instantiations"), memoryK: field(done.stdout, "Memory used"), lines: field(done.stdout, "Lines of TypeScript") });
	}
	const sorted = [...runs].sort((a, b) => a.total - b.total);
	const median = sorted[Math.floor(sorted.length / 2)];
	results.push({ form, name, ...median, all: runs.map((run) => run.total) });
	console.log(`${form.padEnd(14)} ${name.padEnd(9)} total ${median.total.toFixed(2)}s  check ${median.check.toFixed(2)}s  wall ${median.wall.toFixed(2)}s  types ${String(median.types)}  instantiations ${String(median.instantiations)}  memory ${String(Math.round(median.memoryK / 1024))} MB  own lines ${String(median.lines)}  runs [${runs.map((run) => run.total.toFixed(2)).join(", ")}]`);
}
const sum = (form, key) => results.filter((row) => row.form === form).reduce((total, row) => total + row[key], 0);
for (const form of ["one-object", "declared-head"]) {
	for (const key of ["total", "check", "wall"]) console.log(`${key}: head-and-body ${sum("head-and-body", key).toFixed(2)}s, ${form} ${sum(form, key).toFixed(2)}s, ratio ${(sum(form, key) / sum("head-and-body", key)).toFixed(2)}`);
}
