/**
 * The standoff resumed from real old snapshot files (carve-round2-T4.md must-fixes 2 and 8): the
 * 6-agent `snapshot-L7` as it is (an empty standoff), and the 12-agent `snapshot-L7` with a
 * standoff the old `StandoffBook` (packages/engine, read only) wrote into it: a kept piece, a running
 * ultimatum and a hand-over, without `givenAt` as in the oldest files. Converted, resumed with the
 * standoff, stand-ins of the T4 world and `standInsFor` every other slice, the new host continues
 * exactly as the old book restored from the same file.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { replayOld } from "../../helpers/old-engine.ts";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import type { ToolOutcome } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { SHARED_EVENTS, TribunalApi, type HeldPiece } from "@swarmtales/mechanic-shared";
import { standoff } from "@swarmtales/mechanic-standoff";
import { standInsFor } from "@swarmtales/testkit";
import { ownLines, storyOptions } from "./support/host.ts";
import { probe } from "./support/probe.ts";
import { provider } from "./support/provider.ts";
import { channelsStandIn, ledgerStandIn, progressionStandIn, puzzlesStandIn, TestWorld } from "./support/world.ts";

const EXAMPLES = resolve(import.meta.dirname, "../../../examples");
const RULE = { penalty: 10, maxMinutes: 5 };
const RANSOM = 40;

/** Door 8 as in the unit tests: A01 and A02 hold each other's counter-factor, A04 the certificate both need. */
const PIECES: Readonly<Record<string, readonly HeldPiece[]>> = {
	A01: [{ id: "L8-counter-A02", kind: "counter", level: 8, label: "the counter-factor of A02 for door 8", value: "403343", needers: ["A02"] }],
	A02: [{ id: "L8-counter-A01", kind: "counter", level: 8, label: "the counter-factor of A01 for door 8", value: "542489", needers: ["A01"] }],
	A04: [{ id: "L8-certificate", kind: "certificate", level: 8, label: "the team certificate of door 8", value: "323122", needers: ["A01", "A02"] }],
};
const held = (agent: string): readonly HeldPiece[] => PIECES[agent] ?? [];

interface BookRecord {
	readonly events: string[];
	readonly burns: string[];
	readonly notices: string[];
	readonly posts: string[];
	readonly replies: string[];
}

function worldOf(ids: readonly string[]): TestWorld {
	const world = new TestWorld(ids, 30);
	for (const id of ids) world.levels.set(id, 8);
	return world;
}

const empty = (): BookRecord => ({ events: [], burns: [], notices: [], posts: [], replies: [] });

function replyText(outcome: ToolOutcome): string {
	return outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`;
}

/** Converts `file` (its `world.standoff` replaced by `standoffOf`), resumes it and plays `minutes`; the old book continues from the same file. */
async function continueBoth(file: string, standoffOf: (ids: readonly string[], at: number) => unknown, minutes: number) {
	const raw: unknown = JSON.parse(readFileSync(resolve(EXAMPLES, file), "utf8"));
	if (typeof raw !== "object" || raw === null || !("world" in raw) || typeof raw.world !== "object" || raw.world === null) throw new Error(`${file}: no world`);
	const probeIds = convertLegacySnapshot(raw, {}, file).host;
	const ids = probeIds.residents.ids;
	const saved = standoffOf(ids, probeIds.minute);
	const edited = saved === undefined ? raw : { ...raw, world: { ...raw.world, standoff: saved } };
	const converted = convertLegacySnapshot(edited, {}, file);
	// A file whose world wrote no standoff gets no slice from the converter; the host hands the version-0 migration `{}` (R2-D2).
	const snapshot = converted.host;
	const start = snapshot.minute;

	const world = worldOf(ids);
	const ours = [
		standoff.with({ ultimatum: RULE }),
		probe.with(),
		channelsStandIn(world).with(),
		ledgerStandIn(world).with(),
		progressionStandIn(world).with(),
		puzzlesStandIn(world, {}, undefined, held).with(),
		provider("tribunal", TribunalApi, { ransomPrices: () => ({ price: RANSOM, selfPrice: RANSOM }) }).with(),
	];
	const loaded = ["standoff", "probe", "channels", "ledger", "progression", "puzzles", "tribunal"];
	const test = { residents: ids, minutes: start + minutes, mechanics: ours, residentTools: ["claimPiece"], gamemakerTools: ["ultimatum"] };
	const story = defineCoreStory({
		id: converted.host.story,
		seed: converted.host.seed,
		minutes: start + minutes,
		residents: ids,
		mechanics: [...ours, ...standInsFor(snapshot, loaded, { events: SHARED_EVENTS })],
		grants: { resident: ["claimPiece"], gamemaker: ["ultimatum"], script: ["probe"] },
	});
	const host = createHost({ ...storyOptions(test), story, resume: { snapshot, events: converted.events } });
	const now = empty();
	let done = -1;
	while (host.ended === undefined) {
		await host.playMinute(async (turn) => {
			if (done === turn.minute) return;
			done = turn.minute;
			if (turn.minute === start + 1) now.replies.push(replyText(await host.call("resident:A01", "claimPiece", { piece: "L8-certificate", from: "A04" })));
		});
	}
	now.events.push(...ownLines(host, ["standoff"]));
	now.burns.push(...world.calls.filter((call) => call.method === "burn").map((call) => JSON.stringify(call.input)));
	now.notices.push(...world.notices.map((notice) => `${notice.to} ${notice.author} ${notice.text}`));
	now.posts.push(...world.posts.map((post) => `${post.author} ${post.text}`));

	const old = oldBookRun(ids, saved, start, minutes);
	return { now, old, slice: host.snapshot().mechanics.standoff, converted };
}

const Lines = Type.Array(Type.String());
const BookRecordSchema = Type.Object({ events: Lines, burns: Lines, notices: Lines, posts: Lines, replies: Lines });

/** The old book continuing from `saved` for `minutes`, as it was recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`). */
function oldBookRun(ids: readonly string[], saved: unknown, start: number, minutes: number): BookRecord {
	const recorded = replayOld({ ids, saved: saved ?? null, start, minutes }, BookRecordSchema);
	return { events: [...recorded.events], burns: [...recorded.burns], notices: [...recorded.notices], posts: [...recorded.posts], replies: [...recorded.replies] };
}

/** The old book's own state just before the file was written, as it was recorded once (step 18, item 7b). */
function filled(ids: readonly string[], at: number): unknown {
	return replayOld({ ids, at }, Type.Unknown());
}

describe("standoff resumed from real old snapshot files (stand-in T4 world, standInsFor the rest)", () => {
	it("resumes the 6-agent snapshot-L7 (no standoff written) and continues as the old book", async () => {
		const { now, old, slice, converted } = await continueBoth("cityofkeys-act1-06a-04/snapshot-L7.json", () => undefined, 4);
		expect(converted.host.mechanics.standoff).toBeUndefined();
		expect(now).toEqual(old);
		expect(slice?.version).toBe(1);
	});

	it("resumes the 12-agent snapshot-L7 with a kept piece, a running ultimatum and no givenAt, and continues as the old book", async () => {
		const { now, old, converted } = await continueBoth("cityofkeys-act1-12a-02/snapshot-L7.json", filled, 5);
		expect(converted.host.mechanics.standoff?.version).toBe(0);
		expect(old.events.some((line) => line.includes("ultimatum_resolved"))).toBe(true);
		expect(old.events.some((line) => line.includes("piece_claimed"))).toBe(true);
		expect(now).toEqual(old);
	});
});
