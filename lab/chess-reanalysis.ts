/**
 * `pnpm lab:chess:gate`: compares the engine analysis of every recorded chess run before and after the change of
 * the reference engine (docs/refactoring-before-release/06-chess-engine.md, sections 4 and 5). It reads
 * `run/analysis.stockfish10.json` (Stockfish 10 at depth 14, kept as measured) and `run/analysis.json` (the engine
 * of `lab/chess-engine.ts`) of every folder under `stories/chess/runs/`, runs the acceptance gate and rewrites the
 * generated block of `stories/chess/runs/REANALYSIS.md`. Offline, no model, no engine call: it only reads files.
 *
 * `--runs <dir>` reads another folder of runs. `--tables` also prints the engine columns of the tables in `stories/chess/runs/README.md` for both engines.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Chess } from "chess.js";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";

const flag = process.argv.indexOf("--runs");
/** The folder of the run folders; `--runs <dir>` reads another one (and writes its REANALYSIS.md there). */
const RUNS = flag === -1 ? new URL("../stories/chess/runs/", import.meta.url).pathname : (process.argv[flag + 1] ?? "");
const REPORT = join(RUNS, "REANALYSIS.md");
const OPEN = "<!-- generated:gate -->";
const CLOSE = "<!-- /generated:gate -->";

const Ply = Type.Object({
	ply: Type.Integer(),
	colour: Type.Union([Type.Literal("white"), Type.Literal("black")]),
	san: Type.String(),
	forfeit: Type.Boolean(),
	best: Type.String(),
	loss: Type.Number(),
	class: Type.String(),
	missedMate: Type.Boolean(),
});
type Ply = Static<typeof Ply>;
const File = Type.Object({ depth: Type.Integer(), games: Type.Array(Type.Object({ game: Type.Integer(), plies: Type.Array(Ply) })) });
type File = Static<typeof File>;

interface Run {
	readonly name: string;
	/** The three-digit run number in the folder name. */
	readonly id: string;
	readonly old: File;
	readonly now: File;
}

function read(path: string): File {
	const data: unknown = JSON.parse(readFileSync(path, "utf8"));
	if (!Check(File, data)) throw new Error(`${path} is not an analysis file`);
	return data;
}

function load(): { readonly runs: Run[]; readonly missing: string[] } {
	const runs: Run[] = [];
	const missing: string[] = [];
	for (const name of readdirSync(RUNS).sort()) {
		const before = join(RUNS, name, "run", "analysis.stockfish10.json");
		const after = join(RUNS, name, "run", "analysis.json");
		if (!existsSync(before)) continue;
		if (!existsSync(after)) missing.push(name);
		else runs.push({ name, id: name.split("-")[2] ?? name, old: read(before), now: read(after) });
	}
	return { runs, missing };
}

const counted = (plies: readonly Ply[]): Ply[] => plies.filter((ply) => !ply.forfeit);
const mean = (values: readonly number[]): number => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length);
const acpl = (plies: readonly Ply[]): number => mean(counted(plies).map((ply) => ply.loss));
const all = (file: File): Ply[] => file.games.flatMap((game) => game.plies);

/** Ranks with ties averaged, for Spearman's rank correlation. */
function ranks(values: readonly number[]): number[] {
	const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
	const out = new Array<number>(values.length).fill(0);
	for (let start = 0; start < order.length; ) {
		let end = start;
		while (end + 1 < order.length && order[end + 1]?.value === order[start]?.value) end++;
		for (let at = start; at <= end; at++) out[order[at]?.index ?? 0] = (start + end) / 2 + 1;
		start = end + 1;
	}
	return out;
}

function spearman(a: readonly number[], b: readonly number[]): number {
	const x = ranks(a);
	const y = ranks(b);
	const mx = mean(x);
	const my = mean(y);
	let top = 0;
	let dx = 0;
	let dy = 0;
	for (let index = 0; index < x.length; index++) {
		const u = (x[index] ?? 0) - mx;
		const v = (y[index] ?? 0) - my;
		top += u * v;
		dx += u * u;
		dy += v * v;
	}
	return top / Math.sqrt(dx * dy);
}

/** A small seeded generator (mulberry32), so the interval and the p values are the same on every call. */
function seeded(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** The arms of the five-seed table in `stories/chess/runs/README.md`. */
const ARMS: readonly (readonly [string, readonly string[]])[] = [
	["default", ["008", "013", "017", "025", "029"]],
	["`-nobrain`", ["011", "016", "020", "028", "032"]],
	["`-coach`", ["033", "035", "037", "039"]],
	["`-moves`", ["009", "014", "018", "026", "030"]],
	["`-moves-threats`", ["015", "019", "027", "031"]],
	["`-moves-threats-coach`", ["034", "036", "038", "040"]],
];
/** The three arms whose order the gate names: default, lists, lists and coach. */
const GATE_ARMS = ["default", "`-moves-threats`", "`-moves-threats-coach`"];

type Pick = (run: Run) => File;
const OLD: Pick = (run) => run.old;
const NOW: Pick = (run) => run.now;

interface ArmNumbers {
	readonly acpl: number;
	readonly low: number;
	readonly high: number;
	readonly byGame: number[];
	readonly blunders: number;
	readonly queenBlunders: number;
	readonly unpunished: string;
	readonly missedMates: number;
	readonly games: number[];
}

function armNumbers(runs: readonly Run[], pick: Pick): ArmNumbers {
	const files = runs.map(pick);
	const plies = counted(files.flatMap(all));
	const blunders = plies.filter((ply) => ply.class === "blunder");
	const random = seeded(20261114);
	const samples: number[] = [];
	for (let round = 0; round < 10000; round++) samples.push(acpl(files.map(() => files[Math.floor(random() * files.length)] ?? { depth: 0, games: [] }).flatMap(all)));
	samples.sort((a, b) => a - b);
	let replied = 0;
	let unpunished = 0;
	for (const game of files.flatMap((file) => file.games)) {
		game.plies.forEach((ply, index) => {
			const reply = game.plies[index + 1];
			if (ply.forfeit || ply.class !== "blunder" || reply === undefined) return;
			replied++;
			if (reply.loss >= 300) unpunished++;
		});
	}
	const gameCount = files.reduce((sum, file) => sum + file.games.length, 0);
	return {
		acpl: acpl(plies),
		low: samples[250] ?? 0,
		high: samples[9750] ?? 0,
		byGame: [1, 2, 3, 4].map((k) => mean(files.map((file) => acpl(file.games.find((game) => game.game === k)?.plies ?? [])))),
		blunders: (100 * blunders.length) / plies.length,
		queenBlunders: blunders.filter((ply) => ply.san.startsWith("Q")).length / gameCount,
		unpunished: `${String(replied === 0 ? 0 : Math.round((100 * unpunished) / replied))}% (${String(unpunished)} of ${String(replied)})`,
		missedMates: plies.filter((ply) => ply.missedMate).length,
		games: files.flatMap((file) => file.games.map((game) => acpl(game.plies))),
	};
}

/** Two-sided permutation p value for the difference of the mean game ACPL of two arms. */
function permutation(a: readonly number[], b: readonly number[]): number {
	const observed = Math.abs(mean(a) - mean(b));
	const pool = [...a, ...b];
	const random = seeded(4711);
	let extreme = 0;
	const rounds = 20000;
	for (let round = 0; round < rounds; round++) {
		for (let index = pool.length - 1; index > 0; index--) {
			const other = Math.floor(random() * (index + 1));
			const keep = pool[index] ?? 0;
			pool[index] = pool[other] ?? 0;
			pool[other] = keep;
		}
		if (Math.abs(mean(pool.slice(0, a.length)) - mean(pool.slice(a.length))) >= observed - 1e-9) extreme++;
	}
	return extreme / rounds;
}

const whole = (value: number): string => String(Math.round(value));
const one = (value: number): string => value.toFixed(1);

function gate(runs: readonly Run[], missing: readonly string[]): string[] {
	// Gate 1: every position analysed, every best move legal.
	let games = 0;
	let halfMoves = 0;
	let illegal = 0;
	const illegalAt: string[] = [];
	let finished = 0;
	let repeated = 0;
	for (const run of runs) {
		for (const game of run.now.games) {
			games++;
			const chess = new Chess();
			for (const ply of game.plies) {
				halfMoves++;
				if (!chess.moves().includes(ply.best)) {
					illegal++;
					if (illegalAt.length < 10) illegalAt.push(`${run.name} game ${String(game.game)} ply ${String(ply.ply)}: "${ply.best}"`);
				}
				chess.move(ply.san);
			}
			// The analyser sees a final position as a FEN, without the game's history: a draw by repetition is searched like any other position.
			if (new Chess(chess.fen()).isGameOver()) finished++;
			else if (chess.isGameOver()) repeated++;
		}
	}
	const sameMoves = runs.every((run) => JSON.stringify(run.old.games.map((game) => game.plies.map((ply) => ply.san))) === JSON.stringify(run.now.games.map((game) => game.plies.map((ply) => ply.san))));
	const gate1 = missing.length === 0 && illegal === 0 && sameMoves;

	// Gate 2: rank correlation per game and side, and the order of the arms.
	const before: number[] = [];
	const after: number[] = [];
	for (const run of runs) {
		run.old.games.forEach((game, index) => {
			const again = run.now.games[index];
			if (again === undefined) return;
			for (const colour of ["white", "black"] as const) {
				const own = counted(game.plies.filter((ply) => ply.colour === colour));
				if (own.length === 0) continue;
				before.push(acpl(own));
				after.push(acpl(again.plies.filter((ply) => ply.colour === colour)));
			}
		});
	}
	const rho = spearman(before, after);
	const byId = new Map(runs.map((run) => [run.id, run]));
	const arms = ARMS.map(([name, ids]) => {
		const members = ids.map((id) => byId.get(id)).filter((run) => run !== undefined);
		return { name, ids, old: armNumbers(members, OLD), now: armNumbers(members, NOW) };
	});
	const order = (pick: "old" | "now", names?: readonly string[]): string =>
		arms
			.filter((arm) => names === undefined || names.includes(arm.name))
			.sort((a, b) => a[pick].acpl - b[pick].acpl)
			.map((arm) => arm.name)
			.join(" < ");
	const sameOrder = order("old", GATE_ARMS) === order("now", GATE_ARMS);
	const gate2 = rho >= 0.9 && sameOrder;

	// Gate 3: the old blunders are still mistakes or blunders.
	let oldBlunders = 0;
	let stillFlagged = 0;
	let stillBlunders = 0;
	let newBlunders = 0;
	let newAlsoOld = 0;
	for (const run of runs) {
		run.old.games.forEach((game, index) => {
			game.plies.forEach((ply, at) => {
				const again = run.now.games[index]?.plies[at];
				if (again === undefined || ply.forfeit) return;
				if (ply.class === "blunder") {
					oldBlunders++;
					if (again.loss >= 100) stillFlagged++;
					if (again.loss >= 300) stillBlunders++;
				}
				if (again.class === "blunder") {
					newBlunders++;
					if (ply.loss >= 100) newAlsoOld++;
				}
			});
		});
	}
	const share = oldBlunders === 0 ? 0 : stillFlagged / oldBlunders;
	const gate3 = share >= 0.85;
	const verdict = (pass: boolean): string => (pass ? "**pass**" : "**FAIL**");
	const depths = [...new Set(runs.map((run) => run.now.depth))].join(", ");

	const lines = [
		`Runs compared: ${String(runs.length)} (${String(games)} games, ${String(halfMoves)} half-moves, ${String(halfMoves + games)} positions). New analysis at depth ${depths}; old analysis: Stockfish 10 at depth ${[...new Set(runs.map((run) => run.old.depth))].join(", ")}.`,
		"",
		"| Gate | Rule | Result | Verdict |",
		"|---|---|---|---|",
		`| 1 | every position analysed without an error, every best move legal by chess.js | ${String(missing.length)} runs without a new analysis${missing.length === 0 ? "" : ` (${missing.join(", ")})`}; ${String(illegal)} of ${String(halfMoves)} best moves illegal${illegalAt.length === 0 ? "" : ` (${illegalAt.join("; ")})`}; the recorded moves are ${sameMoves ? "the same" : "NOT the same"} in both files; ${String(finished)} of the ${String(games)} final positions are mates or draws on the board and were scored without a search, ${String(repeated)} more ended by repetition and were searched (${String(halfMoves + games - finished)} searches) | ${verdict(gate1)} |`,
		`| 2a | Spearman rank correlation of old and new ACPL per game and side at least 0.9 | ${rho.toFixed(3)} over ${String(before.length)} game sides | ${verdict(rho >= 0.9)} |`,
		`| 2b | order of the arms default, lists, lists and coach in the five-seed table unchanged | old: ${order("old", GATE_ARMS)}; new: ${order("now", GATE_ARMS)} (all six arms, old: ${order("old")}; new: ${order("now")}) | ${verdict(sameOrder)} |`,
		`| 3 | at least 85% of the old blunders (300+) are still mistakes or blunders (100+) | ${String(stillFlagged)} of ${String(oldBlunders)} (${one(100 * share)}%); ${String(stillBlunders)} are still blunders (300+) | ${verdict(gate3)} |`,
		"",
		`**Gate as a whole: ${gate1 && gate2 && gate3 ? "passed" : "FAILED"}.**`,
		"",
		`The other direction, for information: the new engine flags ${String(newBlunders)} blunders (300+), of which ${String(newAlsoOld)} (${one(newBlunders === 0 ? 0 : (100 * newAlsoOld) / newBlunders)}%) were mistakes or blunders (100+) for Stockfish.`,
		"",
		"### The arms of the five-seed table, before and after",
		"",
		"ACPL over every non-forfeit move of the arm; the interval resamples whole matches (10,000 draws, fixed seed).",
		"",
		"| Arm | Runs | Games | ACPL old | 95% CI old | ACPL new | 95% CI new | Blunders per 100 moves old | new | Missed mates old | new |",
		"|---|---|---:|---:|---|---:|---|---:|---:|---:|---:|",
		...arms.map(
			(arm) =>
				`| ${arm.name} | ${arm.ids.join(", ")} | ${String(arm.old.games.length)} | ${whole(arm.old.acpl)} | ${whole(arm.old.low)}-${whole(arm.old.high)} | ${whole(arm.now.acpl)} | ${whole(arm.now.low)}-${whole(arm.now.high)} | ${one(arm.old.blunders)} | ${one(arm.now.blunders)} | ${String(arm.old.missedMates)} | ${String(arm.now.missedMates)} |`,
		),
		"",
		"### Every run, before and after",
		"",
		"| Run | Half-moves counted | ACPL old | ACPL new | Blunders old | Blunders new | Missed mates old | Missed mates new |",
		"|---|---:|---:|---:|---:|---:|---:|---:|",
		...runs.map((run) => {
			const old = counted(all(run.old));
			const now = counted(all(run.now));
			const blunders = (plies: readonly Ply[]): string => String(plies.filter((ply) => ply.class === "blunder").length);
			const mates = (plies: readonly Ply[]): string => String(plies.filter((ply) => ply.missedMate).length);
			return `| ${run.name} | ${String(now.length)} | ${whole(acpl(old))} | ${whole(acpl(now))} | ${blunders(old)} | ${blunders(now)} | ${mates(old)} | ${mates(now)} |`;
		}),
	];
	return lines;
}

/** The engine columns of the README tables, for both engines, as plain lines to copy from. */
function tables(runs: readonly Run[]): string[] {
	const byId = new Map(runs.map((run) => [run.id, run]));
	const lines: string[] = [];
	for (const [label, pick] of [
		["old (Stockfish 10, depth 14)", OLD],
		["new", NOW],
	] as const) {
		lines.push(`== ${label}: arms of the five-seed table`);
		const numbers = ARMS.map(([name, ids]) => ({ name, n: armNumbers(ids.map((id) => byId.get(id)).filter((run) => run !== undefined), pick) }));
		for (const { name, n } of numbers)
			lines.push(`${name}: ACPL ${whole(n.acpl)}, CI ${whole(n.low)}-${whole(n.high)}, by game ${n.byGame.map(whole).join(" / ")}, blunders/100 ${one(n.blunders)}, queen blunders/game ${one(n.queenBlunders)}, unpunished ${n.unpunished}, missed mates ${String(n.missedMates)}`);
		const games = (name: string): number[] => numbers.find((arm) => arm.name === name)?.n.games ?? [];
		for (const [a, b] of [
			["default", "`-nobrain`"],
			["default", "`-moves`"],
			["default", "`-moves-threats`"],
			["`-nobrain`", "`-moves-threats`"],
			["default", "`-coach`"],
			["`-moves-threats`", "`-moves-threats-coach`"],
		] as const)
			lines.push(`p (${a} against ${b}): ${permutation(games(a), games(b)).toFixed(3)}`);
		lines.push(`== ${label}: every run (ACPL; ACPL per game; W/B per game; blunders per 100 moves; blunders; queen blunders; missed mates)`);
		for (const run of runs) {
			const file = pick(run);
			const plies = counted(all(file));
			const blunders = plies.filter((ply) => ply.class === "blunder");
			const sides = file.games.map((game) => `${whole(acpl(game.plies.filter((ply) => ply.colour === "white")))}/${whole(acpl(game.plies.filter((ply) => ply.colour === "black")))}`);
			lines.push(
				`${run.id}: ${whole(acpl(plies))}; ${file.games.map((game) => whole(acpl(game.plies))).join(", ")}; ${sides.join(" ")}; ${one((100 * blunders.length) / Math.max(1, plies.length))}; ${String(blunders.length)}; ${String(blunders.filter((ply) => ply.san.startsWith("Q")).length)}; ${String(plies.filter((ply) => ply.missedMate).length)}`,
			);
		}
	}
	return lines;
}

function main(): void {
	const { runs, missing } = load();
	const block = [OPEN, "", ...gate(runs, missing), "", CLOSE].join("\n");
	const text = existsSync(REPORT) ? readFileSync(REPORT, "utf8") : `# Re-analysis of the chess runs\n\n${OPEN}\n${CLOSE}\n`;
	const start = text.indexOf(OPEN);
	const end = text.indexOf(CLOSE);
	if (start === -1 || end === -1) throw new Error(`${REPORT} has no generated block`);
	writeFileSync(REPORT, `${text.slice(0, start)}${block}${text.slice(end + CLOSE.length)}`);
	process.stdout.write(`${block}\n`);
	if (process.argv.includes("--tables")) process.stdout.write(`${tables(runs).join("\n")}\n`);
}

main();
