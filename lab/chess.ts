/**
 * `pnpm lab:chess <run-dir> [--depth 14]`: the engine analysis of a chess run (lab/chess-analyse.ts).
 * Writes `<run-dir>/analysis.json` and `<run-dir>/ANALYSIS.md` and prints the summary. Offline, no model.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { analyseRun, markdown } from "./chess-analyse.ts";

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const dir = args.find((arg) => !arg.startsWith("--"));
	const flag = args.indexOf("--depth");
	const depth = flag === -1 ? 14 : Number(args[flag + 1]);
	if (dir === undefined || !Number.isInteger(depth) || depth < 1) {
		process.stderr.write("usage: pnpm lab:chess <run-dir> [--depth 14]\n");
		process.exit(2);
	}
	const analyses = await analyseRun(dir, depth);
	writeFileSync(join(dir, "analysis.json"), `${JSON.stringify({ engine: "stockfish 10", depth, games: analyses }, null, "\t")}\n`);
	writeFileSync(join(dir, "ANALYSIS.md"), markdown(analyses, depth));
	process.stdout.write(markdown(analyses, depth));
	process.exit(0);
}

await main();
