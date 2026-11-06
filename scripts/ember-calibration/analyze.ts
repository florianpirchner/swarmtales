/**
 * Calibration of recorded Ember Tricks runs: how far the bids are from the tricks taken and from a
 * Monte Carlo expectation of the hand at bidding time (`reference.ts`).
 *
 *   tsx --conditions=development scripts/ember-calibration/analyze.ts <run-dir> [<run-dir>...] [--samples N] [--seed N] [--json]
 *
 * Reads `<run-dir>/events.jsonl` (or `.jsonl.gz`). Offline: no model is called.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { expectedTricks, mulberry32 } from "./reference.ts";

const SUITS = [
	{ name: "Ash", ranks: 10 },
	{ name: "Brine", ranks: 9 },
	{ name: "Cinder", ranks: 8 },
	{ name: "Dust", ranks: 7 },
	{ name: "Ember", ranks: 6 },
] as const;

const Dealt = Type.Object({ type: Type.Literal("cards_dealt"), hands: Type.Record(Type.String(), Type.Array(Type.String())) });
const Started = Type.Object({ type: Type.Literal("round_started"), game: Type.Integer(), round: Type.Integer(), cards: Type.Integer(), order: Type.Array(Type.String()) });
const Bid = Type.Object({ type: Type.Literal("bid_placed"), game: Type.Integer(), round: Type.Integer(), seat: Type.String(), bid: Type.Integer() });
const Scored = Type.Object({ type: Type.Literal("round_scored"), game: Type.Integer(), round: Type.Integer(), tricks: Type.Record(Type.String(), Type.Integer()) });

interface Row {
	readonly seat: string;
	readonly game: number;
	readonly bid: number;
	readonly taken: number;
	readonly expected: number;
}

interface Stats {
	readonly key: string;
	readonly n: number;
	readonly hits: number;
	readonly meanBid: number;
	readonly meanTaken: number;
	readonly meanExpected: number;
	readonly errVsTaken: number;
	readonly errVsExpected: number;
	readonly zeroShare: number;
}

interface RunReport {
	readonly run: string;
	readonly bySeat: readonly Stats[];
	readonly byGame: readonly Stats[];
	readonly total: Stats;
}

function readEvents(dir: string): readonly unknown[] {
	const plain = join(dir, "events.jsonl");
	const text = existsSync(plain) ? readFileSync(plain, "utf8") : gunzipSync(readFileSync(`${plain}.gz`)).toString("utf8");
	return text
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line): unknown => JSON.parse(line));
}

/** The rows (one per bid) of a run: deals are matched to rounds in order, bids and results by game, round and seat. */
function rowsOf(events: readonly unknown[], samples: number, seed: number): Row[] {
	const rng = mulberry32(seed);
	const deals = events.filter((event) => Value.Check(Dealt, event)).map((event) => Value.Parse(Dealt, event));
	const starts = events.filter((event) => Value.Check(Started, event)).map((event) => Value.Parse(Started, event));
	const bids = events.filter((event) => Value.Check(Bid, event)).map((event) => Value.Parse(Bid, event));
	const scores = events.filter((event) => Value.Check(Scored, event)).map((event) => Value.Parse(Scored, event));
	const rows: Row[] = [];
	starts.forEach((round, index) => {
		const dealt = deals[index];
		const score = scores.find((event) => event.game === round.game && event.round === round.round);
		if (dealt === undefined || score === undefined) return;
		for (const bid of bids) {
			if (bid.game !== round.game || bid.round !== round.round) continue;
			const hand = dealt.hands[bid.seat];
			const position = round.order.indexOf(bid.seat);
			const taken = score.tricks[bid.seat];
			if (hand === undefined || position < 0 || taken === undefined) continue;
			rows.push({ seat: bid.seat, game: round.game, bid: bid.bid, taken, expected: expectedTricks(hand, position, round.cards, SUITS, rng, samples) });
		}
	});
	return rows;
}

const mean = (values: readonly number[]): number => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length);

function statsOf(key: string, rows: readonly Row[]): Stats {
	return {
		key,
		n: rows.length,
		hits: rows.filter((row) => row.bid === row.taken).length,
		meanBid: mean(rows.map((row) => row.bid)),
		meanTaken: mean(rows.map((row) => row.taken)),
		meanExpected: mean(rows.map((row) => row.expected)),
		errVsTaken: mean(rows.map((row) => row.bid - row.taken)),
		errVsExpected: mean(rows.map((row) => row.bid - row.expected)),
		zeroShare: rows.length === 0 ? 0 : rows.filter((row) => row.bid === 0).length / rows.length,
	};
}

function groupBy(rows: readonly Row[], keyOf: (row: Row) => string | number, label: string): Stats[] {
	const keys = [...new Set(rows.map(keyOf))].sort((a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b))));
	return keys.map((key) => statsOf(`${label} ${String(key)}`, rows.filter((row) => keyOf(row) === key)));
}

const fixed = (value: number, digits = 2): string => value.toFixed(digits);
const signed = (value: number): string => (value >= 0 ? "+" : "") + fixed(value);

function table(stats: readonly Stats[]): string {
	const head = "| Group | Bids | Hits | Mean bid | Mean taken | Mean MC | Bid - taken | Bid - MC | Zero bids |\n|---|---|---|---|---|---|---|---|---|";
	const lines = stats.map((s) => `| ${s.key} | ${String(s.n)} | ${String(s.hits)} (${fixed((100 * s.hits) / Math.max(1, s.n), 0)}%) | ${fixed(s.meanBid)} | ${fixed(s.meanTaken)} | ${fixed(s.meanExpected)} | ${signed(s.errVsTaken)} | ${signed(s.errVsExpected)} | ${fixed(100 * s.zeroShare, 0)}% |`);
	return [head, ...lines].join("\n");
}

function main(argv: readonly string[]): void {
	const dirs: string[] = [];
	let samples = 400;
	let seed = 1;
	let json = false;
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index] ?? "";
		if (arg === "--json") json = true;
		else if (arg === "--samples") samples = Number(argv[++index]);
		else if (arg === "--seed") seed = Number(argv[++index]);
		else dirs.push(arg);
	}
	if (dirs.length === 0 || !Number.isInteger(samples) || samples < 1 || !Number.isInteger(seed)) {
		process.stderr.write("usage: analyze.ts <run-dir> [<run-dir>...] [--samples N] [--seed N] [--json]\n");
		process.exitCode = 2;
		return;
	}
	const perRun = dirs.map((dir) => ({ dir, rows: rowsOf(readEvents(dir), samples, seed) }));
	const reports: RunReport[] = perRun.map(({ dir, rows }) => ({
		run: dir,
		bySeat: groupBy(rows, (row) => row.seat, "seat"),
		byGame: groupBy(rows, (row) => row.game, "game"),
		total: statsOf("all", rows),
	}));
	const allRows = perRun.flatMap((run) => run.rows);
	const total: RunReport = { run: "all runs", bySeat: groupBy(allRows, (row) => row.seat, "seat"), byGame: groupBy(allRows, (row) => row.game, "game"), total: statsOf("all", allRows) };
	if (json) {
		process.stdout.write(`${JSON.stringify({ samples, seed, runs: reports, total }, null, 2)}\n`);
		return;
	}
	const shown = reports.length > 1 ? [...reports, total] : reports;
	process.stdout.write(`${shown.map((report) => `## ${report.run}\n\n${table([...report.bySeat, ...report.byGame, report.total])}`).join("\n\n")}\n`);
}

main(process.argv.slice(2));
