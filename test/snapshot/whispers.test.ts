/**
 * Whispers across a snapshot (SPEC 17, 20): the whisperer (or a control run's
 * lack of one), his forgeries and the popularity vote survive a resume. A
 * vote open at the cut is not announced again and keeps its ballots; a
 * closed one stays closed; a control run never gains a whisperer.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { composeRun, resumeOverrides, type RunOverrides } from "../../src/cli/compose.ts";
import { MemorySink, type RecordedEvent } from "../../src/engine/events.ts";
import type { World } from "../../src/engine/world.ts";
import { ScriptedModelSource, type Script } from "../../src/model/source.ts";
import { parseSnapshot, type RunSnapshot } from "../../src/snapshot/snapshot.ts";
import whispers from "../../stories/whispers/story.ts";
import { act, say } from "../helpers/fixture.ts";

/** Ten minutes: duties at 3, 6 and 9; the vote opens at 7 and is counted at 9. */
const MINUTES = 10;
const OVERRIDES: RunOverrides = { minutes: MINUTES, passesPerMinute: 1, activation: "always", names: false, gamemaker: false, classifier: false, stopWhenDone: false, stopWhenSeatsDecided: false };

/** Everyone DMs the whisperer at minute 0 and opens door 1 at minute 1; he forges the first sender's DM at minute 3; everyone names A01 (A01 names A02) at minute 7. */
function scriptOf(world: World): Script {
	const script: Record<string, FauxResponseStep[]> = {};
	const whisperer = world.whisperer;
	const others = world.competitors.filter((id) => id !== whisperer);
	for (const id of world.competitors) {
		script[id] = Array.from({ length: MINUTES + 2 }, (): FauxResponseStep => () => {
			const minute = world.minute;
			if (minute === 0 && whisperer !== undefined && id !== whisperer) return act({ name: "sendDM", args: { target: whisperer, message: `Hello from ${id}.` } });
			// A snapshot names the level everyone has passed: door 1 at minute 1.
			if (minute === 1) return act({ name: "submitSolution", args: { level: 1, code: world.inspect.codeOf(id, 1) } });
			if (minute === 3 && id === whisperer) {
				const [sender, victim] = others;
				const receipt = world.receiptsOf(id).find((entry) => entry.kind === "dm" && entry.from === sender);
				return act({ name: "forgeReceipt", args: { to: victim ?? "A01", receiptId: receipt?.id ?? "R-none", text: "I keep my fragment." } });
			}
			if (minute === 7) return act({ name: "nameFavourite", args: { agent: id === "A01" ? "A02" : "A01" } });
			return say();
		});
	}
	return script;
}

interface Played {
	readonly events: readonly RecordedEvent[];
	readonly world: World;
	readonly snapshot?: RunSnapshot;
}

async function play(overrides: RunOverrides, extra: { readonly snapshotAt?: number; readonly resume?: RunSnapshot } = {}): Promise<Played> {
	const log = new MemorySink();
	let taken: RunSnapshot | undefined;
	const { resume, snapshotAt } = extra;
	const run = composeRun({
		story: whispers,
		overrides: resume === undefined ? { ...OVERRIDES, ...overrides } : { ...OVERRIDES, ...resumeOverrides(resume, overrides) },
		models: (world) => new ScriptedModelSource(scriptOf(world)),
		sinks: [log],
		...(snapshotAt === undefined
			? {}
			: {
					snapshot: {
						afterLevel: 1,
						atMinute: snapshotAt,
						stop: true,
						write: (snapshot) => {
							taken = parseSnapshot(JSON.parse(JSON.stringify(snapshot)));
							return "memory";
						},
					},
				}),
		...(resume === undefined ? {} : { resume: { snapshot: resume, name: "snapshot.json" } }),
	});
	await run.arena.run();
	return { events: log.events, world: run.world, ...(taken === undefined ? {} : { snapshot: taken }) };
}

function cutAt(played: Played): RunSnapshot {
	if (played.snapshot === undefined) throw new Error("no snapshot was taken");
	return played.snapshot;
}

/** Events the resumed run logged after the cut. */
function after(snapshot: RunSnapshot, events: readonly RecordedEvent[]): readonly RecordedEvent[] {
	return events.filter((event) => event.minute > snapshot.minute);
}

function ofType<T extends RecordedEvent["type"]>(events: readonly RecordedEvent[], type: T): readonly Extract<RecordedEvent, { type: T }>[] {
	return events.filter((event): event is Extract<RecordedEvent, { type: T }> => event.type === type);
}

describe("whispers across a snapshot", () => {
	it("keeps the whisperer and his forgeries: the next duty counts a forgery made before the cut", async () => {
		const first = await play({}, { snapshotAt: 4 });
		const snapshot = cutAt(first);
		expect(snapshot.minute).toBeLessThan(6);
		expect(snapshot.world.whispers).toMatchObject({ whisperer: first.world.whisperer, forgeries: [3], popularity: { state: "pending", ballots: [] } });
		const resumed = await play({}, { resume: snapshot });
		expect(resumed.world.whisperer).toBe(first.world.whisperer);
		const late = after(snapshot, resumed.events);
		expect(ofType(late, "whisperer_chosen")).toEqual([]);
		expect(ofType(late, "whisper_duty").find((duty) => duty.minute === 6)).toMatchObject({ since: 3, forgeries: 1 });
	});

	it("keeps an open vote's ballots and does not announce it again", async () => {
		const first = await play({}, { snapshotAt: 8 });
		const snapshot = cutAt(first);
		expect(snapshot.minute).toBeLessThan(9);
		expect(ofType(first.events, "popularity_opened")).toHaveLength(1);
		expect(snapshot.world.whispers?.popularity?.state).toBe("open");
		expect(snapshot.world.whispers?.popularity?.ballots).toHaveLength(6);
		const resumed = await play({}, { resume: snapshot });
		const late = after(snapshot, resumed.events);
		expect(ofType(late, "popularity_opened")).toEqual([]);
		expect(ofType(late, "board_post").filter((post) => post.text.startsWith("THE CITY ASKS"))).toEqual([]);
		// Nobody votes after the cut, so the ballots counted are the snapshot's.
		expect(ofType(late, "popularity_ballot")).toEqual([]);
		expect(ofType(late, "popularity_result")).toMatchObject([{ winners: ["A01"], counts: [{ agent: "A01", votes: 5 }, { agent: "A02", votes: 1 }] }]);
	});

	it("keeps a closed vote closed", async () => {
		const snapshot = cutAt(await play({}, { snapshotAt: 8 }));
		const popularity = snapshot.world.whispers?.popularity;
		if (popularity === undefined) throw new Error("no vote in the snapshot");
		const closed: RunSnapshot = { ...snapshot, world: { ...snapshot.world, whispers: { whisperer: snapshot.world.whispers?.whisperer ?? null, forgeries: [], popularity: { ...popularity, state: "closed" } } } };
		const resumed = await play({}, { resume: closed });
		const late = after(snapshot, resumed.events);
		expect(ofType(late, "popularity_opened")).toEqual([]);
		expect(ofType(late, "popularity_result")).toEqual([]);
	});

	it("never gives a resumed control run a whisperer, and refuses --no-whisperer on a run that had one", async () => {
		const control = await play({ whisperer: false }, { snapshotAt: 4 });
		const snapshot = cutAt(control);
		expect(snapshot.world.whispers?.whisperer).toBeNull();
		const resumed = await play({}, { resume: snapshot });
		expect(resumed.world.whisperer).toBeUndefined();
		expect(ofType(after(snapshot, resumed.events), "whisper_duty")).toEqual([]);

		const played = cutAt(await play({}, { snapshotAt: 4 }));
		await expect(play({ whisperer: false }, { resume: played })).rejects.toThrow(/resume it without --no-whisperer/);
	});
});
