/**
 * The overseers' entries for the role fields of a legacy snapshot (step 18, team R3; C1-13, C2-9):
 * a host resumed with the entries built from the old `interpreter` and `weaver` fields asks exactly
 * what a host resumed from the overseers' own snapshot asks, while one resumed without a cursor
 * labels the replayed prefix again. The gamemaker's entry keeps its tracks and notes and reads from
 * the end of the log.
 */
import { describe, expect, it } from "vitest";
import { overseers } from "@swarmtales/roles";
import { text } from "@swarmtales/prompts";
import { scriptedOverseer } from "@swarmtales/testkit";
import { newHost, playInputs, type Input, type NewSpec } from "./harness.ts";

const at = (minute: number, type: string, fields: Record<string, unknown>): Input => ({ minute, type, fields });
const dm = (minute: number, from: string, to: string, message: string): Input => at(minute, "dm_sent", { from, to, text: message, number: minute });

const INPUTS: readonly Input[] = [
	dm(0, "A01", "A02", "Door 2 is 1234"),
	dm(0, "A02", "A01", "no"),
	at(0, "blame", { caller: "A01", accused: "A02", dm: 1, claim: 2, outcome: "upheld", payer: "A02", penalty: 5, post: 3 }),
	dm(1, "A02", "A01", "deal"),
	at(1, "blame", { caller: "A03", accused: "A02", dm: 4, claim: 5, outcome: "upheld", payer: "A02", penalty: 5, post: 6 }),
	dm(2, "A01", "A02", "good"),
	dm(2, "A03", "A01", "hello"),
	at(2, "blame", { caller: "A01", accused: "A03", dm: 7, claim: 8, outcome: "upheld", payer: "A03", penalty: 5, post: 9 }),
	dm(3, "A01", "A03", "last"),
];

const seqsOf = (prompt: string): readonly number[] =>
	(prompt.split(text("classifier/statements-heading"))[1] ?? "").split("\n").flatMap((line) => {
		const found = /^#(\d+) /.exec(line);
		return found?.[1] === undefined ? [] : [Number(found[1])];
	});

function runtime() {
	let weaves = 0;
	return scriptedOverseer({
		classifier: (call) => ({ answer: { items: seqsOf(call.input).map((ref) => ({ ref, labels: ["threat"] })) } }),
		weaver: () => ({ answer: { kind: weaves++ % 2 === 0 ? "soft" : "hard", text: `Text ${String(weaves)}.`, reason: "again" } }),
	});
}

function spec(minutes: number, rt: ReturnType<typeof runtime>): NewSpec {
	return {
		inputs: INPUTS,
		minutes,
		residents: 3,
		overseers: [overseers.classifierOverseer.as("classifier", { label: "t/c" }), overseers.weaverOverseer.as("weaver", { characters: {}, acts: [] })],
		runtime: rt,
	};
}

describe("overseerEntriesAtResume", () => {
	it("builds the entries from the old fields: the interpreter's history and cursor, the weaver's state and cursor, the gamemaker's tracks and a fresh read position", () => {
		const roles = {
			interpreter: { pending: [{ seq: 30, minute: 2, agent: "A01", source: "dm", to: ["A02"], text: "pending" }], history: [{ conversation: "dm:A01|A02", statements: [{ seq: 12, minute: 1, agent: "A01", source: "dm", to: ["A02"], text: "old" }] }] },
			weaver: { pending: [], patches: [], shifts: [{ agent: "A02", text: "Hard." }], voices: [{ agent: "A02", text: "Soft." }], closed: [1] },
			gamemaker: { tracks: [{ agent: "A01", levelSince: 3, wrongOnLevel: 1 }], notes: [{ minute: 4, to: "A01", text: "n" }], recentFrom: 9 },
		};
		const entries = overseers.overseerEntriesAtResume(roles, 57, { classifier: "classifier", weaver: "weaver", gamemaker: "gamemaker" });
		expect(entries).toEqual({
			// The pending statement is re-derived from the log: the cursor stops just before it.
			classifier: { calls: 0, costUsd: 0, slice: { version: 1, data: { cursor: 29, history: roles.interpreter.history } } },
			weaver: { calls: 0, costUsd: 0, slice: { version: 1, data: { cursor: 57, ...roles.weaver } } },
			gamemaker: { calls: 0, costUsd: 0, slice: { version: 1, data: { tracks: roles.gamemaker.tracks, notes: roles.gamemaker.notes, seen: 57 } } },
		});
	});

	it("reads to the end of the log when nothing was pending, leaves out the roles the file lacks and the overseers the story does not use", () => {
		const roles = { interpreter: { pending: [], history: [] }, weaver: { pending: [], patches: [], shifts: [], voices: [], closed: [] } };
		expect(overseers.overseerEntriesAtResume(roles, 40, { classifier: "labeller" })).toEqual({ labeller: { calls: 0, costUsd: 0, slice: { version: 1, data: { cursor: 40, history: [] } } } });
		expect(overseers.overseerEntriesAtResume({}, 40, { classifier: "classifier", weaver: "weaver", gamemaker: "gamemaker" })).toEqual({});
		expect(overseers.overseerEntriesAtResume(roles, 40, {})).toEqual({});
	});

	it("checks the old fields (they are untrusted)", () => {
		expect(() => overseers.overseerEntriesAtResume({ weaver: { pending: "none" } }, 1, { weaver: "weaver" })).toThrow();
	});

	it("resumes the overseers where the old roles stood: the same questions as a host resumed from the overseers' own snapshot", async () => {
		const first = runtime();
		const host = newHost(spec(4, first));
		host.start();
		await playInputs(host, spec(4, first), 0, 2, []);
		const snapshot = structuredClone(host.snapshot());
		const prefix = host.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
		const lastSeq = host.log.all().at(-1)?.seq ?? 0;

		// The old fields as the old roles wrote them: the overseers' state without the cursors.
		const classifierSlice = snapshot.overseers?.classifier?.slice?.data;
		const weaverSlice = snapshot.overseers?.weaver?.slice?.data;
		const without = (data: unknown): Record<string, unknown> => (typeof data === "object" && data !== null ? Object.fromEntries(Object.entries(data).filter(([key]) => key !== "cursor")) : {});
		const roles = { interpreter: { pending: [], history: without(classifierSlice).history }, weaver: without(weaverSlice) };
		const entries = overseers.overseerEntriesAtResume(roles, lastSeq, { classifier: "classifier", weaver: "weaver" });

		const resumeWith = async (overseersSection: unknown) => {
			const rt = runtime();
			const resumed = newHost(spec(4, rt), { snapshot: { ...snapshot, overseers: overseersSection }, events: prefix });
			await playInputs(resumed, spec(4, rt), 2, 4, []);
			return { asked: rt.asked.map((entry) => entry.call.input), events: JSON.stringify(resumed.log.all().filter((event) => event.source === "classifier" || event.source === "weaver").map((event) => [event.type, event.payload])) };
		};
		const own = await resumeWith(snapshot.overseers);
		const converted = await resumeWith(entries);
		expect(converted.asked).toEqual(own.asked);
		expect(converted.events).toBe(own.events);
		expect(own.asked.length).toBeGreaterThan(0);

		// Without a cursor the prefix is labelled again: more statements in the first batch, hits asked about twice.
		const fresh = await resumeWith({ classifier: { calls: 0, costUsd: 0, slice: { version: 1, data: { cursor: 0, history: [] } } }, weaver: { calls: 0, costUsd: 0, slice: { version: 1, data: { cursor: 0, pending: [], patches: [], shifts: [], voices: [], closed: [] } } } });
		expect(fresh.asked).not.toEqual(own.asked);
	});
});
