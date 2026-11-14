/**
 * `pnpm lab:chess <run-dir> [--depth 10]`: the engine analysis of a chess run (lab/chess-analyse.ts).
 * Writes `<run-dir>/analysis.json` and `<run-dir>/ANALYSIS.md` and prints the summary. Offline, no model.
 * `--quiet` prints one JSON line (positions searched, median and total milliseconds) instead of the summary.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { analyseRun, markdown } from "./chess-analyse.ts";
import { DEFAULT_DEPTH, ENGINE } from "./chess-engine.ts";

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const flag = args.indexOf("--depth");
	const depth = flag === -1 ? DEFAULT_DEPTH : Number(args[flag + 1]);
	const dir = args.find((arg, index) => !arg.startsWith("--") && (flag === -1 || index !== flag + 1));
	if (dir === undefined || !Number.isInteger(depth) || depth < 1) {
		process.stderr.write(`usage: pnpm lab:chess <run-dir> [--depth ${String(DEFAULT_DEPTH)}] [--quiet]\n`);
		process.exit(2);
	}
	const timings: number[] = [];
	const analyses = await analyseRun(dir, depth, timings);
	writeFileSync(join(dir, "analysis.json"), `${JSON.stringify({ ...ENGINE, depth, games: analyses }, null, "\t")}\n`);
	writeFileSync(join(dir, "ANALYSIS.md"), markdown(analyses, depth));
	if (args.includes("--quiet")) {
		const sorted = [...timings].sort((a, b) => a - b);
		const total = timings.reduce((sum, ms) => sum + ms, 0);
		process.stdout.write(`${JSON.stringify({ dir, depth, searched: timings.length, medianMs: Math.round(sorted[Math.floor(sorted.length / 2)] ?? 0), totalMs: Math.round(total), timings: timings.map((ms) => Math.round(ms)) })}\n`);
	} else process.stdout.write(markdown(analyses, depth));
	process.exit(0);
}

await main();
