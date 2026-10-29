/**
 * The prompt lab (not part of `pnpm check`): forks a recorded scene many
 * times with prompt variants and counts what the residents do. Live models,
 * real money; see `lab/README.md`.
 *
 *   pnpm lab run <scene> <variant> [--forks n] [--glm]
 *   pnpm lab report
 *
 * Scenes: `auction` (the black seal auction opens at minute 12; minutes
 * 12-14 are played) and `seal-<ID>` (the resident holds the seal from minute
 * 12; minutes 12-15 are played). Variants: `A` (no addendum) or the name of
 * a file in `lab/variants/` without `.md`.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readSnapshot, type RunSnapshot } from "../src/snapshot/snapshot.ts";

const BASE = "lab/scenes/nexus-06a-M11.json";
const OUT = "lab/out";
const NAMES: Readonly<Record<string, string>> = { A01: "Aurelio", A02: "Juniper", A03: "quiet-fern", A04: "Rook", A05: "Mercer", A06: "Tovah" };

interface Scene {
	readonly file: string;
	readonly minutes: number;
}

/** The scene's snapshot file, written once from the base. */
function scene(name: string): Scene {
	if (name === "auction") return { file: BASE, minutes: 15 };
	const holder = /^seal-(A\d{2})$/.exec(name)?.[1];
	if (holder === undefined) throw new Error(`unknown scene ${name}`);
	const file = join(OUT, "scenes", `${name}.json`);
	if (!existsSync(file)) {
		mkdirSync(join(OUT, "scenes"), { recursive: true });
		writeFileSync(file, `${JSON.stringify(withSeal(readSnapshot(BASE), holder))}\n`);
	}
	return { file, minutes: 16 };
}

/** The base scene with the seal already won by `holder` (as if it had bid alone), and its private notice. */
function withSeal(base: RunSnapshot, holder: string): RunSnapshot {
	const seal = base.world.seal;
	if (seal === undefined) throw new Error("the base scene has no seal");
	return {
		...base,
		world: {
			...base.world,
			seal: { ...seal, seals: seal.seals.map((entry) => (entry.seal === 1 ? { ...entry, state: "held", holder, bids: [{ agent: holder, points: 20 }] } : entry)) },
			competitors: base.world.competitors.map((entry) =>
				entry.agent === holder
					? {
							...entry,
							notices: [
								...entry.notices,
								{ author: "CITY", text: "You won the black seal for 20 points. You may break it once with permaDeath(resident) until this act ends. Nobody knows you bear it." },
							],
						}
					: entry,
			),
		},
	};
}

function run(sceneName: string, variant: string, fork: number, glm: boolean): Promise<void> {
	const { file, minutes } = scene(sceneName);
	const dir = join(OUT, glm ? "glm" : "haiku", sceneName, variant, `fork-${fork}`);
	mkdirSync(dir, { recursive: true });
	const args = ["start", "--resume", file, "--minutes", String(minutes), "--no-gamemaster", "--no-reporter", "--runs", dir];
	args.push(...(glm ? ["--provider", "openrouter", "--model", "glm-flash"] : ["--provider", "anthropic"]));
	if (variant !== "A") args.push("--prompt-addendum", join("lab", "variants", `${variant}.md`));
	return new Promise((done, fail) => {
		const child = spawn("pnpm", ["-s", ...args], { stdio: ["ignore", "ignore", "inherit"] });
		child.on("exit", (code) => {
			if (code === 0) done();
			else fail(new Error(`fork ${dir} exited with ${String(code)}`));
		});
	});
}

interface Event {
	readonly type: string;
	readonly [key: string]: unknown;
}

function isEvent(value: unknown): value is Event {
	return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}

function events(dir: string): readonly Event[] {
	const runDir = readdirSync(dir).find((entry) => entry.startsWith("run-"));
	if (runDir === undefined) return [];
	const lines = readFileSync(join(dir, runDir, "events.jsonl"), "utf8").trim().split("\n");
	const resumed = lines.findIndex((line) => line.includes('"run_resumed"'));
	return lines.slice(resumed + 1).map((line): unknown => JSON.parse(line)).filter(isEvent);
}

function text(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function cost(dir: string): number {
	const runDir = readdirSync(dir).find((entry) => entry.startsWith("run-"));
	if (runDir === undefined) return 0;
	const usage: unknown = JSON.parse(readFileSync(join(dir, runDir, "usage.json"), "utf8"));
	if (typeof usage !== "object" || usage === null || !("own" in usage)) return 0;
	const own = usage.own;
	if (typeof own !== "object" || own === null || !("totals" in own)) return 0;
	const totals = own.totals;
	return typeof totals === "object" && totals !== null && "costUsd" in totals && typeof totals.costUsd === "number" ? totals.costUsd : 0;
}

/** One line per (model, scene, variant): what the forks did. */
function report(): void {
	const lines = ["| model | scene | variant | forks | bids > 0 (of residents) | bid points | seal used | threat / offer / lie labels | cost USD |", "|---|---|---|---:|---|---|---|---|---:|"];
	for (const model of ["haiku", "glm"]) {
		const modelDir = join(OUT, model);
		if (!existsSync(modelDir)) continue;
		for (const sceneName of readdirSync(modelDir).sort()) {
			for (const variant of readdirSync(join(modelDir, sceneName)).sort()) {
				const forks = readdirSync(join(modelDir, sceneName, variant)).map((fork) => join(modelDir, sceneName, variant, fork));
				let positive = 0;
				let bidders = 0;
				const amounts: number[] = [];
				const strikes: string[] = [];
				const labels = { threat: 0, offer: 0, lie: 0 };
				let spent = 0;
				for (const fork of forks) {
					const all = events(fork);
					const last = new Map<string, number>();
					for (const event of all) {
						if (event.type === "seal_bid" && typeof event.points === "number") last.set(text(event.agent), event.points);
						if (event.type === "seal_used") strikes.push(`${NAMES[text(event.holder)] ?? ""} → ${NAMES[text(event.target)] ?? ""} (min ${String(event.minute)})`);
						if (event.type === "interpretation" && Array.isArray(event.labels)) {
							const list: readonly unknown[] = event.labels;
							for (const label of list) if (label === "threat" || label === "offer" || label === "lie") labels[label] += 1;
						}
					}
					bidders += 6;
					for (const points of last.values()) {
						if (points > 0) {
							positive += 1;
							amounts.push(points);
						}
					}
					spent += cost(fork);
				}
				const sealCell = sceneName.startsWith("seal-") ? `${String(strikes.length)} of ${String(forks.length)}${strikes.length > 0 ? `: ${strikes.join("; ")}` : ""}` : "-";
				lines.push(
					`| ${model} | ${sceneName} | ${variant} | ${String(forks.length)} | ${sceneName === "auction" ? `${String(positive)} of ${String(bidders)}` : "-"} | ${amounts.join(", ") || "-"} | ${sealCell} | ${String(labels.threat)} / ${String(labels.offer)} / ${String(labels.lie)} | ${spent.toFixed(3)} |`,
				);
			}
		}
	}
	const table = lines.join("\n");
	writeFileSync(join(OUT, "RESULTS.md"), `${table}\n`);
	process.stdout.write(`${table}\n`);
}

async function main(argv: readonly string[]): Promise<void> {
	const [command, sceneName, variant, ...rest] = argv;
	if (command === "report") {
		report();
		return;
	}
	if (command !== "run" || sceneName === undefined || variant === undefined) throw new Error("usage: pnpm lab run <scene> <variant> [--forks n] [--glm] | pnpm lab report");
	const forksAt = rest.indexOf("--forks");
	const forks = forksAt < 0 ? 3 : Number(rest[forksAt + 1]);
	const glm = rest.includes("--glm");
	// Forks add to those already there; the first writes the prompt cache, the others read it.
	const dir = join(OUT, glm ? "glm" : "haiku", sceneName, variant);
	const first = existsSync(dir) ? readdirSync(dir).length + 1 : 1;
	await run(sceneName, variant, first, glm);
	await Promise.all(Array.from({ length: forks - 1 }, (_, index) => run(sceneName, variant, first + index + 1, glm)));
}

await main(process.argv.slice(2));
