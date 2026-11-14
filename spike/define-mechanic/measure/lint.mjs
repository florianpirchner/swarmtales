/**
 * Criterion 4 of DECISIONS.md D1: ESLint with the repository's type-aware configuration on the
 * spike's sources, with a 4 GB heap. Prints ESLint's output, the exit code, the wall time and the
 * peak resident memory of the ESLint process.
 * Run from the repository root: `node spike/define-mechanic/measure/lint.mjs [paths...]`.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const paths = process.argv.length > 2 ? process.argv.slice(2) : ["spike/define-mechanic/src"];
const started = performance.now();
const child = spawn(process.execPath, ["--max-old-space-size=4096", "node_modules/eslint/bin/eslint.js", ...paths, "--ignore-pattern", "spike/define-mechanic/src/fail/"], { stdio: "inherit" });
let peakKb = 0;
const watch = setInterval(() => {
	try {
		const match = /^VmHWM:\s+(\d+) kB/m.exec(readFileSync(`/proc/${String(child.pid)}/status`, "utf8"));
		if (match !== null) peakKb = Math.max(peakKb, Number(match[1]));
	} catch {
		// The process has ended.
	}
}, 200);
child.on("exit", (code) => {
	clearInterval(watch);
	console.log(`eslint ${paths.join(" ")}: exit ${String(code)}, ${((performance.now() - started) / 1000).toFixed(1)}s, peak resident memory ${String(Math.round(peakKb / 1024))} MB (heap limit 4096 MB)`);
});
