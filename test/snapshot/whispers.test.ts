/**
 * Whispers across a snapshot (SPEC 17, 20): the whisperer (or a control run's
 * lack of one), his forgeries, the popularity rounds and the DM cap survive a
 * resume. A round open at the cut is not announced again and keeps its
 * ballots; a counted one stays counted; a control run never gains a
 * whisperer.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { composeRun, resumeOverrides, type RunOverrides } from "../../apps/cli/src/compose.ts";
import type { RecordedEvent } from "@swarmtales/contracts";
import type { World } from "@swarmtales/engine";
import { ScriptedModelSource, type Script } from "@swarmtales/models";
import { parseSnapshot, type RunSnapshot, MemorySink } from "@swarmtales/chronicle";
import whispers from "../../stories/whispers/story.ts";
import { act, say } from "../helpers/fixture.ts";

/** Ten minutes: the first vote opens at 4 and is counted at 6, the whisperer's duty follows the count; door 2 opens at 6. */
const MINUTES = 10;
const OVERRIDES: RunOverrides = { minutes: MINUTES, passesPerMinute: 1, activation: "always", names: false, gamemaker: false, classifier: false, stopWhenDone: false, stopWhenSeatsDecided: false };

/**
 * Everyone DMs the whisperer at minute 0 and opens door 1 at minute 1; he forges the first sender's DM at minute 3;
 * everyone names A01 (A01 names A02) at minute 4; the first sender fills its window of 8 DMs by minute 4
 * and tries a ninth at minute 5.
 */
function scriptOf(world: World): Script {
	const script: Record<string, FauxResponseStep[]> = {};
	const whisperer = world.whisperer;
	const others = world.competitors.filter((id) => id !== whisperer);
	const [sender] = others;
	for (const id of world.competitors) {
		script[id] = Array.from({ length: MINUTES + 2 }, (): FauxResponseStep => () => {
			const minute = world.minute;
			if (minute === 0 && whisperer !== undefined && id !== whisperer) return act({ name: "sendDM", args: { target: whisperer, message: `Hello from ${id}.` } });
			// A snapshot names the level everyone has passed: door 1 at minute 1.
			if (minute === 1) return act({ name: "submitSolution", args: { level: 1, code: world.inspect.codeOf(id, 1) } });
			if (minute === 3 && id === whisperer) {
				const victim = others[1];
				const receipt = world.receiptsOf(id).find((entry) => entry.kind === "dm" && entry.from === sender);
				return act({ name: "forgeReceipt", args: { to: victim ?? "A01", receiptId: receipt?.id ?? "R-none", text: "I keep my fragment." } });
			}
			// The first sender fills its DM window (minutes 0-5): one at minute 0, five at 2, two at 4; the ninth at 5 is refused.
			const dm = (target: string | undefined) => ({ name: "sendDM", args: { target: target ?? "A01", message: "Still here." } });
			const vote = { name: "nameFavourite", args: { agent: id === "A01" ? "A02" : "A01" } };
			if (id === sender && minute === 2) return act(...world.competitors.filter((other) => other !== id).map(dm));
			if (id === sender && minute === 4) return act(vote, dm(others[1]), dm(others[2]));
			if (id === sender && minute === 5) return act(dm(others[1]));
			if (minute === 4) return act(vote);
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
	it("keeps the whisperer and his forgeries: the duty after the first vote counts a forgery made before the cut", async () => {
		const first = await play({}, { snapshotAt: 3 });
		const snapshot = cutAt(first);
		expect(snapshot.minute).toBeLessThan(4);
		expect(snapshot.world.whispers).toMatchObject({ whisperer: first.world.whisperer, forgeries: [3], popularity: { round: 0, state: "pending", ballots: [] } });
		const resumed = await play({}, { resume: snapshot });
		expect(resumed.world.whisperer).toBe(first.world.whisperer);
		const late = after(snapshot, resumed.events);
		expect(ofType(late, "whisperer_chosen")).toEqual([]);
		// No duty before the first vote; the first follows its count at minute 6.
		expect(ofType(resumed.events, "whisper_duty").map((duty) => [duty.minute, duty.since, duty.forgeries])).toEqual([[6, 0, 1]]);
		// Whom he forged for is kept too (figure direction 10 counts the recipients).
		const victim = first.world.competitors.filter((id) => id !== first.world.whisperer)[1];
		expect(snapshot.world.whispers?.forgedTo).toEqual([victim]);
	});

	it("resumes a snapshot from before the forgeries' recipients were kept", async () => {
		const first = await play({}, { snapshotAt: 3 });
		const snapshot = cutAt(first);
		const whispersState = snapshot.world.whispers;
		if (whispersState === undefined) throw new Error("no whispers in the snapshot");
		const { forgedTo, ...older } = whispersState;
		expect(forgedTo).toBeDefined();
		const old = parseSnapshot(JSON.parse(JSON.stringify({ ...snapshot, world: { ...snapshot.world, whispers: older } })));
		const resumed = await play({}, { resume: old });
		expect(ofType(resumed.events, "whisper_duty").map((duty) => [duty.minute, duty.since, duty.forgeries])).toEqual([[6, 0, 1]]);
	});

	it("keeps an open round's ballots and does not announce it again", async () => {
		const first = await play({}, { snapshotAt: 5 });
		const snapshot = cutAt(first);
		expect(snapshot.minute).toBeLessThan(6);
		expect(ofType(first.events, "popularity_opened")).toHaveLength(1);
		expect(snapshot.world.whispers?.popularity).toMatchObject({ round: 0, state: "open" });
		expect(snapshot.world.whispers?.popularity?.ballots).toHaveLength(6);
		const resumed = await play({}, { resume: snapshot });
		const late = after(snapshot, resumed.events);
		expect(ofType(late, "popularity_opened")).toEqual([]);
		expect(ofType(late, "board_post").filter((post) => post.text.startsWith("THE CITY ASKS"))).toEqual([]);
		// Nobody votes after the cut, so the ballots counted are the snapshot's.
		expect(ofType(late, "popularity_ballot")).toEqual([]);
		expect(ofType(late, "popularity_result")).toMatchObject([
			{ round: 1, winners: ["A01"], points: 5, counts: [{ agent: "A01", votes: 5 }, { agent: "A02", votes: 1 }, { agent: "A03", votes: 0 }, { agent: "A04", votes: 0 }, { agent: "A05", votes: 0 }, { agent: "A06", votes: 0 }] },
		]);
	});

	it("keeps a counted round counted", async () => {
		const snapshot = cutAt(await play({}, { snapshotAt: 5 }));
		const counted: RunSnapshot = {
			...snapshot,
			world: { ...snapshot.world, whispers: { whisperer: snapshot.world.whispers?.whisperer ?? null, forgeries: [], popularity: { round: 1, state: "pending", ballots: [] } } },
		};
		const resumed = await play({}, { resume: counted });
		const late = after(snapshot, resumed.events);
		expect(ofType(late, "popularity_opened")).toEqual([]);
		expect(ofType(late, "popularity_result")).toEqual([]);
	});

	it("counts a window's DMs from before the cut against the cap", async () => {
		const snapshot = cutAt(await play({}, { snapshotAt: 4 }));
		const resumed = await play({}, { resume: snapshot });
		const refused = ofType(after(snapshot, resumed.events), "tool_result").filter((event) => event.agent === resumed.world.competitors.find((id) => id !== resumed.world.whisperer) && event.tool === "sendDM");
		expect(refused.map((event) => event.text)).toEqual(["DM_LIMIT: 8 DMs sent since minute 0; you can send again from minute 6"]);
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
