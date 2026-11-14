/**
 * Writes the oracle files under `oracles/` (see `oracles/README.md`).
 *
 * `tsx --conditions=development scripts/export-oracles.ts [game ...]` writes the catalog's files (all, or the named games);
 * `--check` writes nothing and exits 1 when a file differs from what the code produces now;
 * `--survey <folder>` replays every recorded run under a folder and prints how closely today's code reproduces it;
 * `--diff <events.jsonl> [variant]` prints the first turns and answers of one recorded run that today's code does not reproduce;
 * `--project <oracle.json> [--by-actor]` prints the rules-level projection of a file (`scripts/oracles/projection.ts`).
 *
 * Every write also rewrites `oracles/checksums.txt` (SHA-256 of every file, in the format of `sha256sum`) and
 * `oracles/COVERAGE.md` (which tools and refusal codes the files exercise) and the pages under `oracles/mechanics/`
 * (what each loaded mechanic's README says about its rules, tools, events and options).
 */
import { existsSync, globSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { CATALOG, DEFINITIONS, oraclePath } from "./oracles/catalog.ts";
import { liveOracle, liveRun, ROOT } from "./oracles/live.ts";
import { checksumsText, CHECKSUMS } from "./oracles/checksums.ts";
import { coverageText, COVERAGE } from "./oracles/coverage.ts";
import { OracleSchema } from "./oracles/format.ts";
import { mechanicPages } from "./oracles/mechanics-doc.ts";
import { rulesByActor, rulesProjection, rulesText } from "./oracles/projection.ts";
import { oracleText } from "./oracles/record.ts";
import { Value } from "typebox/value";

async function survey(folder: string): Promise<void> {
	for (const events of globSync("**/events.jsonl{,.gz}", { cwd: resolve(ROOT, folder) }).sort()) {
		const path = relative(ROOT, resolve(ROOT, folder, events));
		const run = liveRun(resolve(ROOT, path));
		if (run === undefined) {
			console.log(`${path}\tno 000-run.json`);
			continue;
		}
		try {
			const { oracle, differences } = await liveOracle({ game: "survey", events: path });
			const f = oracle.source.fidelity;
			const size = Math.round(oracleText(oracle).length / 1024);
			console.log(`${path}\t${run.variant}\ts${String(run.seed)}\tturns ${String(f?.turnsWithEqualInputs)}/${String(f?.turns)} left ${String(f?.turnsLeft)}\tcalls ${String(f?.callsWithEqualResult)}/${String(f?.calls)}\t${String(size)} KB\t${oracle.end?.reason ?? "cut"}@${String(oracle.end?.minute ?? oracle.truncated?.afterMinute)}\t${(differences[0] ?? "").split("\n")[0] ?? ""}`);
		} catch (error) {
			console.log(`${path}\t${run.variant}\tERROR ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const at = args.indexOf("--survey");
	if (at >= 0) {
		await survey(args[at + 1] ?? "stories");
		return;
	}
	const diff = args.indexOf("--diff");
	if (diff >= 0) {
		const variant = args[diff + 2];
		const { oracle, differences } = await liveOracle({ game: "diff", events: args[diff + 1] ?? "", ...(variant === undefined ? {} : { variant }) });
		console.log(JSON.stringify(oracle.source.fidelity), JSON.stringify(oracle.end ?? oracle.truncated), `${String(Math.round(oracleText(oracle).length / 1024))} KB`);
		console.log(JSON.stringify(oracle.counts.events));
		console.log(differences.join("\n"));
		return;
	}
	const project = args.indexOf("--project");
	if (project >= 0) {
		const parsed: unknown = JSON.parse(readFileSync(resolve(args[project + 1] ?? ""), "utf8"));
		if (!Value.Check(OracleSchema, parsed)) throw new Error(`${args[project + 1] ?? ""}: not an oracle file`);
		const projection = rulesProjection(parsed);
		process.stdout.write(args.includes("--by-actor") ? `${JSON.stringify(rulesByActor(projection), null, "\t")}\n` : rulesText(projection));
		return;
	}
	const check = args.includes("--check");
	const games = args.filter((arg) => !arg.startsWith("--"));
	let stale = 0;
	for (const item of CATALOG) {
		if (games.length > 0 && !games.includes(item.game)) continue;
		const first = oracleText(await item.make());
		// Determinism: the same oracle twice, from two fresh hosts.
		const second = oracleText(await item.make());
		if (first !== second) throw new Error(`${item.game}/${item.file}: two exports differ; the source is not deterministic`);
		const path = resolve(ROOT, oraclePath(item));
		const before = existsSync(path) ? readFileSync(path, "utf8") : undefined;
		const state = before === first ? "unchanged" : before === undefined ? "new" : "changed";
		if (state !== "unchanged") stale++;
		if (!check && state !== "unchanged") {
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, first);
		}
		console.log(`${oraclePath(item)}\t${String(Math.round(first.length / 1024))} KB\t${state}\tdeterministic`);
	}
	for (const file of DEFINITIONS) {
		if (games.length > 0 && !games.some((game) => file.path.startsWith(`oracles/${game}/`))) continue;
		const path = resolve(ROOT, file.path);
		const text = file.text();
		const same = existsSync(path) && readFileSync(path, "utf8") === text;
		if (!same) stale++;
		if (!check && !same) {
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, text);
		}
		console.log(`${file.path}\t${String(Math.round(text.length / 1024))} KB\t${same ? "unchanged" : "changed"}`);
	}
	// The derived files cover every oracle on disk, so they are written (or checked) on every run, whatever games were named.
	for (const derived of [{ path: CHECKSUMS, text: checksumsText(ROOT) }, { path: COVERAGE, text: coverageText(ROOT) }, ...mechanicPages(ROOT)]) {
		const path = resolve(ROOT, derived.path);
		const same = existsSync(path) && readFileSync(path, "utf8") === derived.text;
		if (!same) stale++;
		if (!check && !same) {
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, derived.text);
		}
		console.log(`${derived.path}\t${String(Math.round(derived.text.length / 1024))} KB\t${same ? "unchanged" : "changed"}`);
	}
	if (check && stale > 0) process.exitCode = 1;
}

await main();
