// SPDX-License-Identifier: Apache-2.0
/**
 * The tutorial `docs/tutorials/director.md` as a test. Every code block of the tutorial is an include: its lines
 * stand, in one piece, in the file of the sample that the last link before the block names. The commands of
 * `commands.sh` run in process, in their order, from a folder that holds the sample as the repository does; the
 * first prints the lines of `output.txt`, and the resumed run is the straight run with its marker.
 */
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { main, type CliIo } from "@swarmtales/cli/src/main.ts";
import { StoredEnvelopeSchema } from "@swarmtales/contracts";
import { Parse } from "typebox/value";
import { afterAll, describe, expect, it } from "vitest";

const SAMPLE = fileURLToPath(new URL("..", import.meta.url));
const TUTORIAL = fileURLToPath(new URL("../../../docs/tutorials/director.md", import.meta.url));
const PREFIX = "node --conditions development apps/cli/src/bin.ts ";
const LINK = /\]\(\.\.\/\.\.\/samples\/own-director\/([^)#]+)\)/g;

const linesOf = (file: string): readonly string[] => readFileSync(file, "utf8").trimEnd().split("\n");

/** The code blocks of the tutorial, each with the sample file the last link before it names. */
function blocks(): readonly { readonly file: string; readonly lines: readonly string[] }[] {
	const parts = readFileSync(TUTORIAL, "utf8").split(/^```/m);
	return parts.flatMap((part, index) => {
		if (index % 2 === 0) return [];
		const before = parts.slice(0, index).filter((_, at) => at % 2 === 0).join("");
		const file = [...before.matchAll(LINK)].at(-1)?.[1] ?? "(no link)";
		return [{ file, lines: part.split("\n").slice(1, -1) }];
	});
}

/** True when `part` stands in `whole` as consecutive lines. */
const within = (part: readonly string[], whole: readonly string[]): boolean => whole.some((_, at) => part.length > 0 && part.every((line, offset) => whole[at + offset] === line));

/** The lines of a run folder's log, parsed, without the fields that count lines (a resumed log has one line more). */
const eventsOf = (folder: string): readonly { readonly type: string; readonly tick: number; readonly actor: string; readonly payload: unknown }[] =>
	linesOf(join(folder, "events.jsonl")).map((line) => {
		const { type, tick, actor, payload } = Parse(StoredEnvelopeSchema, JSON.parse(line));
		return { type, tick, actor, payload };
	});

/** One command of `swt` in process, in the folder of the test, with a clock that stands still. */
async function swt(args: readonly string[]): Promise<{ readonly code: number; readonly out: readonly string[]; readonly err: readonly string[] }> {
	const out: string[] = [];
	const err: string[] = [];
	const io: CliIo = { cwd, now: () => new Date("2026-11-15T12:00:00.000Z"), out: (line) => out.push(line), err: (line) => err.push(line), env: {} };
	return { code: await main(args, io), out, err };
}

const cwd = mkdtempSync(join(tmpdir(), "swt-own-director-"));
symlinkSync(join(SAMPLE, ".."), join(cwd, "samples"));
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

describe("the tutorial of sample 6", () => {
	it("every code block is an include of a file of the sample", () => {
		const found = blocks();
		expect(found.length).toBeGreaterThan(8);
		expect(found.filter((block) => !within(block.lines, linesOf(join(SAMPLE, block.file)))).map((block) => block.file)).toEqual([]);
	});

	it("the commands run as the tutorial says: the human's captain stands, the resumed run continues the straight one and replays equal", async () => {
		const commands = linesOf(join(SAMPLE, "commands.sh")).filter((line) => line.startsWith(PREFIX));
		const printed: (readonly string[])[] = [];
		for (const command of commands) {
			const { code, out, err } = await swt(command.slice(PREFIX.length).split(" "));
			expect([command, code, err]).toEqual([command, 0, []]);
			printed.push(out);
		}
		expect(commands).toHaveLength(5);
		expect(printed[0]?.slice(0, 2)).toEqual(linesOf(join(SAMPLE, "output.txt")));
		expect(printed[3]).toEqual([expect.stringMatching(/^ok, 53 lines, head [0-9a-f]{64}, continuity holds$/)]);
		expect(printed[4]).toEqual(["equal, 53 lines"]);
		const [straight, resumed] = ["runs/own-director-001", "runs/own-director-002"].map((folder) => eventsOf(join(cwd, folder)));
		expect(resumed?.filter((event) => event.type !== "run_resumed")).toEqual(straight);
		expect(straight?.filter((event) => event.type === "captain_named").map((event) => event.payload)).toEqual([{ captain: "A01", changed: true }]);
		expect(straight?.filter((event) => event.type === "decision_amended").map((event) => event.actor)).toEqual(["human"]);
	});

	it("a fake run without a hand: resumed through the command line from every boundary, it is the straight run, verifies and replays equal", async () => {
		const game = "samples/own-director/game.ts";
		expect(await swt(["run", game, "--fake", "--out", "plain", "--snapshot-at", "0,1,2"])).toMatchObject({ code: 0, err: [] });
		const straight = eventsOf(join(cwd, "plain/own-director-001"));
		expect([straight.at(-1)?.payload, straight.filter((event) => event.type === "tool_result").length]).toEqual([{ reason: "limit" }, 5]);
		expect((await swt(["replay", "plain/own-director-001", "--game", game])).code).toBe(0);
		for (const tick of [0, 1, 2]) {
			const folder = `plain/own-director-00${String(tick + 2)}`;
			expect(await swt(["resume", "plain/own-director-001", "--game", game, "--snapshot", `plain/own-director-001/snapshots/t${String(tick)}.json`])).toMatchObject({ code: 0, err: [] });
			expect(eventsOf(join(cwd, folder)).filter((event) => event.type !== "run_resumed"), `boundary ${String(tick)}`).toEqual(straight);
			expect((await swt(["log", "verify", folder, "--previous", "plain/own-director-001"])).out).toEqual([expect.stringMatching(/continuity holds$/)]);
			expect((await swt(["replay", folder, "--game", game])).code).toBe(0);
		}
	});
});
