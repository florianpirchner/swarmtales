/**
 * A real old checkpoint that still says `core_dealt` resumed through the CLI path (step 18
 * challenge, determinism M1 and m3). `test/cli/host-resume.test.ts` feeds the CLI old-engine
 * recordings already renamed to `motive_dealt` (`underCurrentNames`), a shape no real old file has;
 * this test reads `examples/cityofkeys-act1-06a-04/snapshot-L7.json` (6 `core_dealt` lines) as
 * `--resume` reads it:
 *
 * - run A resumes the old file, cuts a `swarmtales-run` file one minute later and signs its log;
 * - run B resumes A's run file and signs its log;
 * - B's prefix repeats A's lines up to the cut (all but `at`), so `swt log verify B --previous A`
 *   holds: the Act I -> Act II -> Act III path the project plays.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { EVENTS_FILE, EventChain, JsonlEventLog, verifyContinuity } from "@swarmtales/chronicle";
import { say, type Script } from "@swarmtales/models";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { runGenesis } from "../../apps/cli/src/host/chain.ts";
import { prefixLines, readResumePoint, type ResumePoint, writeRunFile } from "../../apps/cli/src/host/snapshot.ts";
import { resumedOverrides } from "../../apps/cli/src/run-options.ts";
import { createHostFixture, storyDefaults } from "../helpers/host-fixture.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const OLD = join(ROOT, "examples", "cityofkeys-act1-06a-04", "snapshot-L7.json");
const work = mkdtempSync(join(tmpdir(), "swt-legacy-names-"));

afterAll(() => {
	rmSync(work, { recursive: true, force: true });
});

function waiting(ids: readonly string[]): Script {
	return Object.fromEntries(ids.map((id) => [id, Array.from({ length: 40 }, () => say(`${id} waits.`))]));
}

interface Played {
	readonly directory: string;
	readonly lines: readonly Record<string, unknown>[];
	readonly runFile?: string;
}

async function play(name: string, point: ResumePoint, file: string, minutes: number, cutAt?: number): Promise<Played> {
	const directory = join(work, name);
	const chain = new EventChain(directory, runGenesis({ story: cityOfKeys, seed: point.seed, models: {}, resume: { point, name: file } }));
	let runFile: string | undefined;
	const run = createHostFixture({
		story: cityOfKeys,
		...storyDefaults(cityOfKeys),
		...resumedOverrides(point, { gamemaker: false, classifier: false, minutes }),
		script: (host) => waiting(host.residents),
		resume: { point, name: file },
		sinks: [new JsonlEventLog(join(directory, EVENTS_FILE), { chain })],
		...(cutAt === undefined
			? {}
			: {
					snapshot: {
						afterLevel: 99,
						atMinute: cutAt,
						stop: false,
						file: join(directory, "snapshot-cut.json"),
						write: (taken) => {
							runFile = writeRunFile(directory, { ...taken, chain: chain.checkpoint() }, "snapshot-cut.json");
							return runFile;
						},
					},
				}),
	});
	await run.run();
	chain.close();
	const lines = readFileSync(join(directory, EVENTS_FILE), "utf8")
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line): Record<string, unknown> => {
			const value: unknown = JSON.parse(line);
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("not an object line");
			return Object.fromEntries(Object.entries(value));
		});
	return { directory, lines, ...(runFile === undefined ? {} : { runFile }) };
}

const typeCount = (lines: readonly Record<string, unknown>[], type: string): number => lines.filter((line) => line.type === type).length;
const withoutStamp = (line: Record<string, unknown>): string => JSON.stringify(Object.fromEntries(Object.entries(line).filter(([key]) => key !== "at")));

describe("a real core_dealt checkpoint resumed twice through the CLI path", () => {
	it("keeps one name per line across the resumes, so the continuity check holds", async () => {
		// The file says core_dealt (6 lines and the dealt residents' slice).
		expect(readFileSync(OLD, "utf8").split('"type":"core_dealt"').length - 1).toBe(6);
		const old = readResumePoint(OLD);
		expect((old.legacyLines ?? []).filter((line) => line.type === "motive_dealt")).toHaveLength(6);
		// The host goes on with today's names (its mechanics and overseers read `motive_dealt`).
		expect(old.events.filter((envelope) => envelope.type === "core_dealt")).toHaveLength(0);
		expect(old.events.filter((envelope) => envelope.type === "motive_dealt")).toHaveLength(6);

		const minutes = old.minute + 3;
		const a = await play("run-a", old, "snapshot-L7.json", minutes, old.minute + 1);
		if (a.runFile === undefined) throw new Error("run A wrote no run file");
		const cut = prefixLines(old);
		expect(a.lines.length).toBeGreaterThan(cut);
		// A's prefix repeats the old file's lines under today's names: one name in the whole log.
		expect(typeCount(a.lines, "core_dealt")).toBe(0);
		expect(typeCount(a.lines.slice(0, cut), "motive_dealt")).toBe(6);

		const point = readResumePoint(a.runFile);
		const b = await play("run-b", point, "snapshot-cut.json", minutes);
		const prefix = prefixLines(point);
		expect(prefix).toBeGreaterThan(cut);
		expect(b.lines.slice(0, prefix).map(withoutStamp)).toEqual(a.lines.slice(0, prefix).map(withoutStamp));
		const verdict = verifyContinuity(a.directory, b.directory);
		expect(verdict.ok ? "ok" : verdict.reason).toBe("ok");
	}, 300_000);
});
