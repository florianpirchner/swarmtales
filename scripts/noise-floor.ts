/**
 * Command line of the noise-floor analysis (`scripts/noise-floor-stats.ts`):
 *
 *   tsx --conditions=development scripts/noise-floor.ts --game quarry --replicates <series> --baseline <series> \
 *     --control quarry --treatment quarry-open --seed 31 [--out <noise-floor.json>] [--digits 1]
 *
 * Reads recorded runs only (no model, no money), writes the machine-readable result to `--out` and prints the
 * Markdown tables of `NOISE-FLOOR.md`.
 */
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { GAMES, noiseFloor, renderNoiseFloor } from "./noise-floor-stats.ts";

const USAGE = "Usage: noise-floor --game <quarry|econ-lab> --replicates <series dir> --baseline <series dir> --control <arm> --treatment <arm> --seed <n> [--out <file>] [--digits <n>]";

function fail(message: string): never {
	process.stderr.write(`${message}\n${USAGE}\n`);
	process.exit(2);
}

const { values } = parseArgs({
	options: {
		game: { type: "string" },
		replicates: { type: "string" },
		baseline: { type: "string" },
		control: { type: "string" },
		treatment: { type: "string" },
		seed: { type: "string" },
		out: { type: "string" },
		digits: { type: "string" },
	},
	strict: true,
});

const game = GAMES[values.game ?? ""];
if (game === undefined) fail(`Unknown game "${values.game ?? ""}"`);
const { replicates, baseline, control, treatment } = values;
if (replicates === undefined || baseline === undefined || control === undefined || treatment === undefined) fail("Missing option");
const seed = Number(values.seed);
if (!Number.isInteger(seed)) fail("--seed must be an integer");
const digits = Number(values.digits ?? "1");
if (!Number.isInteger(digits) || digits < 0) fail("--digits must be a non-negative integer");

const result = noiseFloor({ game, replicates, baseline, control, treatment, seed });
if (values.out !== undefined) writeFileSync(values.out, `${JSON.stringify(result, null, "\t")}\n`);
process.stdout.write(renderNoiseFloor(result, digits));
