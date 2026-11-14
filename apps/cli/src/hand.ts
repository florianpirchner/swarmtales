// SPDX-License-Identifier: Apache-2.0
/**
 * The input of the Human Hand for the run loop: the JSON lines of `--hand <file>`, or of standard input with
 * `--hand -`, each checked against the grant `human` of the game. `SWT-X008` and `SWT-X009` are here.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { SwtError, type SwtIssue } from "@swarmtales/contracts";
import type { ResolvedGame } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Check } from "typebox/value";
import type { HandLine, HandSource } from "./loop.ts";
import type { CliIo } from "./main.ts";

const HUMAN = "human";
const HandLineSchema = Type.Object(
	{
		at: Type.Integer({ minimum: 0, description: "The boundary of the line: the number of finished ticks" }),
		tool: Type.Optional(Type.String({ description: "The shown name of a tool of the grant `human`" })),
		params: Type.Optional(Type.Unknown({ description: "The params of the call" })),
		command: Type.Optional(Type.Literal("snapshot", { description: "Write a snapshot" })),
	},
	{ additionalProperties: false, description: "One line of the Human Hand" },
);

/**
 * `SWT-X008`: the Human Hand cannot be used: the game has no actor `human`, or a line of `--hand` is no line of
 * the Human Hand or names a tool the grant `human` does not hold.
 *
 * @param input - What is wrong.
 * @param input.problem - What is wrong, as one sentence without a full stop.
 * @param input.file - The file of `--hand`; absent for standard input.
 * @param input.line - The line of the file.
 * @returns The issue.
 *
 * @public
 */
export function handRefused(input: { readonly problem: string; readonly file?: string; readonly line?: number }): SwtIssue {
	return {
		code: "SWT-X008",
		summary: input.problem,
		why: 'A line of the Human Hand is JSON: `{"at": <finished ticks>, "tool": "<name>", "params": {...}}` for a tool of the grant `human`, or `{"at": <finished ticks>, "command": "snapshot"}`; a game has the actor `human` when its grant `human` holds a tool.',
		fix: "Write every line in one of the two forms, with a tool the game grants to `human` (the mechanic `humanHand` brings `pause` and `resume`).",
		...(input.file === undefined ? {} : { where: { file: input.file, ...(input.line === undefined ? {} : { line: input.line }) } }),
	};
}

/**
 * `SWT-X009`: the run is paused and the input of the Human Hand has ended; the run stopped with a snapshot.
 *
 * @param input - Where the run stopped.
 * @param input.tick - The number of finished ticks.
 * @returns The issue.
 *
 * @public
 */
export function handEnded(input: { readonly tick: number }): SwtIssue {
	return {
		code: "SWT-X009",
		summary: `the run is paused after ${String(input.tick)} ticks and the input of the Human Hand has ended; the run stopped with the snapshot snapshots/t${String(input.tick)}.json`,
		why: "A paused run plays no tick until the Human Hand calls `resume`, and no line is left that could.",
		fix: "Resume the run from the snapshot with a Human Hand that calls `resume`, or end the file of `--hand` with a `resume` line.",
	};
}

// One line, checked: JSON of the schema, either a tool of the grant `human` or the command.
function lineOf(text: string, tools: readonly string[], where: { readonly file?: string; readonly line: number }): HandLine {
	const refuse = (problem: string): SwtError => new SwtError(handRefused({ problem: `line ${String(where.line)} of the Human Hand ${problem}`, ...where }));
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw refuse("is no JSON");
	}
	if (!Check(HandLineSchema, value) || (value.tool === undefined) === (value.command === undefined)) throw refuse("is neither a tool call nor the command `snapshot`");
	if (value.tool !== undefined && !tools.includes(value.tool)) throw refuse(`names the tool "${value.tool}", which the grant \`human\` does not hold`);
	return value;
}

// Takes the next line out of the buffer: the first one while paused, else the first whose boundary is reached.
function taken(buffer: HandLine[], tick: number, paused: boolean): HandLine | undefined {
	const index = paused ? 0 : buffer.findIndex((line) => line.at <= tick);
	return index < 0 ? undefined : buffer.splice(index, 1)[0];
}

// The source over a buffer of lines; the feed (standard input) is opened at the first boundary and fills it as lines arrive.
function sourceOf(buffer: HandLine[], tools: readonly string[], open?: () => AsyncIterator<string>): HandSource {
	let feed: AsyncIterator<string> | undefined;
	let ended = open === undefined;
	let failure: Error | undefined;
	let wake = (): void => undefined;
	const pump = async (): Promise<void> => {
		for (let line = 1, step = await feed?.next(); step !== undefined && step.done !== true; line++, step = await feed?.next()) {
			if (step.value.trim() !== "") buffer.push(lineOf(step.value, tools, { line }));
			wake();
		}
	};
	const start = (): void => {
		feed = open?.();
		void pump()
			.catch((error: unknown) => (failure = error instanceof Error ? error : new RangeError(String(error))))
			.finally(() => {
				ended = true;
				wake();
			});
	};
	return {
		async next(tick, paused) {
			if (feed === undefined && !ended) start();
			// One turn of the event loop: the lines that are there already are in the buffer.
			if (!ended) await new Promise((done) => setImmediate(done));
			for (;;) {
				if (failure !== undefined) throw failure;
				const line = taken(buffer, tick, paused);
				if (line !== undefined || !paused || ended) return line;
				await new Promise<void>((arrived) => (wake = arrived));
			}
		},
		close: () => void feed?.return?.(),
	};
}

/**
 * The Human Hand of a run, from `--hand`: a JSON-lines file, read and checked whole before the run, or `-` for
 * standard input, whose lines are checked as they arrive. A line is due at the boundary after `at` finished ticks
 * or any later one; a line of standard input is therefore applied at the first boundary after it arrived.
 *
 * @param hand - The value of `--hand`; undefined without the flag.
 * @param game - The resolved game: its actor `human` and the tools of the grant `human`.
 * @param io - The current directory, and the lines of standard input of a test.
 * @param after - For a resumed run, which is given the hand file of the straight run: the lines of the file that
 * the run before the snapshot applied already are dropped. These are the first `calls` tool lines (the calls of the
 * actor `human` in the log up to the snapshot) and every `snapshot` line with `at` at or below `tick` (the finished
 * ticks of the snapshot). Standard input is taken as it comes.
 * @returns The source, or undefined without the flag.
 * @throws SwtError `SWT-X008` when the game has no actor `human`, the file cannot be read, or a line of the file
 * is no line of the Human Hand or names a tool the grant `human` does not hold.
 *
 * @public
 */
export function handOf(hand: string | undefined, game: ResolvedGame, io: Pick<CliIo, "cwd" | "stdin">, after?: { readonly calls: number; readonly tick: number }): HandSource | undefined {
	if (hand === undefined) return undefined;
	const { actors, grants, names } = game.definition;
	if (!actors.some((actor) => actor.id === HUMAN)) throw new SwtError(handRefused({ problem: "`--hand` was given, and the game has no actor `human`" }));
	const tools = (grants[HUMAN] ?? []).map((tool) => names[tool] ?? tool);
	if (hand === "-") return sourceOf([], tools, () => (io.stdin ?? createInterface({ input: process.stdin }))[Symbol.asyncIterator]());
	const file = resolve(io.cwd, hand);
	let text: string;
	try {
		text = readFileSync(file, "utf8");
	} catch {
		throw new SwtError(handRefused({ problem: `the file of \`--hand\` cannot be read`, file }));
	}
	const lines = text.split("\n").flatMap((line, index) => (line.trim() === "" ? [] : [lineOf(line, tools, { file, line: index + 1 })]));
	let left = after?.calls ?? 0;
	return sourceOf(after === undefined ? lines : lines.filter((line) => (line.command === "snapshot" ? line.at > after.tick : left-- <= 0)), tools);
}
