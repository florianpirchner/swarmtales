/**
 * The judge lab (not part of `pnpm check`): does Haiku play the judge's
 * temper? Every case is one blame with a fixed pair of texts, heard by each
 * temper with the accused standing above the accuser and below it. Live
 * model (the story's classifier model), real money, a few cents.
 *
 *   pnpm lab:judge [--repeats n]
 *
 * Writes `lab/out/judge/RESULTS.md`: per temper and case, how often the blame
 * was upheld with the accused on top and with the accuser on top, and the
 * judge's words on both channels.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { JUDGE_TEMPERS, type DenialQuestion, type JudgeTemper, type Standing } from "../src/interpret/judge.ts";
import { createDeliveryJudge } from "../src/interpret/sources.ts";
import { createProviderRegistry } from "../src/model/providers.ts";
import { resolveModelSettings, settingsFromStory } from "../src/model/settings.ts";
import { findStory } from "../stories/index.ts";

const OUT = "lab/out/judge";

/** One text each: a plain denial, a request that denies nothing, a reading with room either way, and an answer that confirms receipt. */
const CASES: Readonly<Record<string, string>> = {
	denial: "I never got your DM. Nothing from you has reached me, so stop pretending you sent it.",
	"asks-again": "Still waiting for your factor. Where is it? Send it now.",
	unclear: "Odd. I don't see anything new from you. Are you sure you sent it to the right resident?",
	"got-it": "Thanks, got it, but the number you sent was wrong.",
};

const HIGH: Standing = { points: 140, rank: 1 };
const LOW: Standing = { points: 70, rank: 5 };

function question(text: string, accusedOnTop: boolean): DenialQuestion {
	return {
		sender: "A01",
		accused: "A02",
		dm: { number: 41, text: "Here is the piece you need from me. Use it before the door closes." },
		claim: { number: 57, channel: "board", text },
		standing: { sender: accusedOnTop ? LOW : HIGH, accused: accusedOnTop ? HIGH : LOW, residents: 6 },
	};
}

interface Hearing {
	readonly temper: JudgeTemper;
	readonly case: string;
	readonly accusedOnTop: boolean;
	readonly upheld?: boolean;
	readonly board?: string;
	readonly gamemaker?: string;
	readonly error?: string;
	readonly costUsd: number;
}

async function main(argv: readonly string[]): Promise<void> {
	const at = argv.indexOf("--repeats");
	const repeats = at < 0 ? 2 : Number(argv[at + 1]);
	const story = findStory("cityofkeys");
	if (story?.classifier === undefined) throw new Error("cityofkeys has no classifier model");
	const registry = createProviderRegistry([]);
	const settings = resolveModelSettings({}, {}, settingsFromStory(story.classifier.model), registry);
	const limits = { maxOutputTokens: 1_000, timeoutMs: 60_000 };
	const tasks = JUDGE_TEMPERS.flatMap((temper) => {
			const judge = createDeliveryJudge(settings, story.classifier ?? { model: story.model, maxChars: 1_500 }, registry, limits, temper);
			return Object.entries(CASES).flatMap(([name, text]) =>
				[true, false].flatMap((accusedOnTop) =>
					Array.from({ length: repeats }, () => async (): Promise<Hearing> => {
						const answer = await judge.deniesReceipt(question(text, accusedOnTop));
						const costUsd = answer.usage.reduce((sum, entry) => sum + entry.costUsd, 0);
						if (!answer.ok) return { temper, case: name, accusedOnTop, error: answer.error, costUsd };
						return {
							temper,
							case: name,
							accusedOnTop,
							upheld: answer.deniesReceipt,
							...(answer.board === undefined ? {} : { board: answer.board }),
							...(answer.gamemaker === undefined ? {} : { gamemaker: answer.gamemaker }),
							costUsd,
						};
					}),
				),
			);
		});
	const hearings = await pool(tasks, 2);
	mkdirSync(OUT, { recursive: true });
	writeFileSync(join(OUT, "RESULTS.md"), report(hearings, repeats));
	process.stdout.write(`${table(hearings, repeats).join("\n")}\n`);
}

/** Runs the tasks with at most `size` at a time (the organisation's concurrency limit is shared with live runs). */
async function pool<T>(tasks: readonly (() => Promise<T>)[], size: number): Promise<readonly T[]> {
	const results: T[] = [];
	let next = 0;
	const worker = async (): Promise<void> => {
		while (next < tasks.length) {
			const task = tasks[next];
			next += 1;
			if (task !== undefined) results.push(await task());
		}
	};
	await Promise.all(Array.from({ length: size }, worker));
	return results;
}

function table(hearings: readonly Hearing[], repeats: number): readonly string[] {
	const rows = ["| temper | case | upheld, accused on top | upheld, accuser on top | errors |", "|---|---|---:|---:|---:|"];
	for (const temper of JUDGE_TEMPERS) {
		for (const name of Object.keys(CASES)) {
			const of = (onTop: boolean) => hearings.filter((entry) => entry.temper === temper && entry.case === name && entry.accusedOnTop === onTop);
			const upheld = (onTop: boolean) => `${String(of(onTop).filter((entry) => entry.upheld === true).length)}/${String(repeats)}`;
			const errors = hearings.filter((entry) => entry.temper === temper && entry.case === name && entry.error !== undefined).length;
			rows.push(`| ${temper} | ${name} | ${upheld(true)} | ${upheld(false)} | ${String(errors)} |`);
		}
	}
	const cost = hearings.reduce((sum, entry) => sum + entry.costUsd, 0);
	return [...rows, "", `Cost: ${cost.toFixed(4)} USD for ${String(hearings.length)} hearings.`];
}

function report(hearings: readonly Hearing[], repeats: number): string {
	const words = hearings.map(
		(entry) =>
			`- **${entry.temper} / ${entry.case} / accused ${entry.accusedOnTop ? "on top" : "below"}:** ` +
			(entry.error === undefined ? `${entry.upheld === true ? "upheld" : "rejected"}. Board: ${entry.board ?? "-"} · To the gamemaker: ${entry.gamemaker ?? "-"}` : `error: ${entry.error}`),
	);
	return `# Judge lab\n\n${table(hearings, repeats).join("\n")}\n\n## Words\n\n${words.join("\n")}\n`;
}

await main(process.argv.slice(2));
