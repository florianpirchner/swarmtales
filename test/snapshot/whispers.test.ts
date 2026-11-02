/**
 * Whispers across a snapshot (SPEC 17, 20): the whisperer (or a control run's
 * lack of one), his forgeries, the popularity rounds and the DM cap survive a
 * resume. A round open at the cut is not announced again and keeps its
 * ballots; a counted one stays counted; a control run never gains a
 * whisperer.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import type { Host, HostSnapshot } from "@swarmtales/contracts";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import type { Script } from "@swarmtales/models";
import type { ResumePoint } from "../../apps/cli/src/host/snapshot.ts";
import { resumedOverrides, type RunOverrides } from "../../apps/cli/src/run-options.ts";
import whispers from "../../stories/whispers/story.ts";
import { act, createHostFixture, say } from "../helpers/host-fixture.ts";
import { codeOf, receiptsOf, whispererOf } from "../helpers/host-inspect.ts";
import { sliceIn, snapshotTaker, WhispersSlice } from "../helpers/host-snapshot.ts";

/** Ten minutes: the first vote opens at 4 and is counted at 6, the whisperer's duty follows the count; door 2 opens at 6. */
const MINUTES = 10;
const OVERRIDES: RunOverrides = { minutes: MINUTES, passesPerMinute: 1, activation: "always", names: false, gamemaker: false, classifier: false, stopWhenDone: false, stopWhenSeatsDecided: false };

/**
 * Everyone DMs the whisperer at minute 0 and opens door 1 at minute 1; he forges the first sender's DM at minute 3;
 * everyone names A01 (A01 names A02) at minute 4; the first sender fills its window of 8 DMs by minute 4
 * and tries a ninth at minute 5.
 */
function scriptOf(host: Host): Script {
	const script: Record<string, FauxResponseStep[]> = {};
	const whisperer = whispererOf(host);
	const others = host.residents.filter((id) => id !== whisperer);
	const [sender] = others;
	for (const id of host.residents) {
		script[id] = Array.from({ length: MINUTES + 2 }, (): FauxResponseStep => () => {
			const minute = host.minute;
			if (minute === 0 && whisperer !== undefined && id !== whisperer) return act({ name: "sendDM", args: { target: whisperer, message: `Hello from ${id}.` } });
			// A snapshot names the level everyone has passed: door 1 at minute 1.
			if (minute === 1) return act({ name: "submitSolution", args: { level: 1, code: codeOf(host, id, 1) } });
			if (minute === 3 && id === whisperer) {
				const victim = others[1];
				const receipt = receiptsOf(host, id).find((entry) => entry.kind === "dm" && entry.parties[0] === sender);
				return act({ name: "forgeReceipt", args: { to: victim ?? "A01", receiptId: receipt?.receipt ?? "R-none", text: "I keep my fragment." } });
			}
			// The first sender fills its DM window (minutes 0-5): one at minute 0, five at 2, two at 4; the ninth at 5 is refused.
			const dm = (target: string | undefined) => ({ name: "sendDM", args: { target: target ?? "A01", message: "Still here." } });
			const vote = { name: "nameFavourite", args: { agent: id === "A01" ? "A02" : "A01" } };
			if (id === sender && minute === 2) return act(...host.residents.filter((other) => other !== id).map(dm));
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
	readonly host: Host;
	readonly snapshot?: ResumePoint;
}

async function play(overrides: RunOverrides, extra: { readonly snapshotAt?: number; readonly resume?: ResumePoint } = {}): Promise<Played> {
	const { resume, snapshotAt } = extra;
	const taker = snapshotAt === undefined ? undefined : snapshotTaker({ afterLevel: 1, atMinute: snapshotAt, stop: true });
	const run = createHostFixture({
		story: whispers,
		...(resume === undefined ? { ...OVERRIDES, ...overrides } : { ...OVERRIDES, ...resumedOverrides(resume, overrides) }),
		script: scriptOf,
		...(taker === undefined ? {} : { snapshot: taker.request }),
		...(resume === undefined ? {} : { resume: { point: resume, name: "snapshot.json" } }),
	});
	await run.run();
	const snapshot = taker?.taken()?.point;
	return { events: run.log.events, host: run.host, ...(snapshot === undefined ? {} : { snapshot }) };
}

function cutAt(played: Played): ResumePoint {
	if (played.snapshot === undefined) throw new Error("no snapshot was taken");
	return played.snapshot;
}

/** The snapshot with its whispers slice replaced, as an older or hand-edited file would hold it. */
function withWhispers(snapshot: ResumePoint, data: unknown): ResumePoint {
	const slice = snapshot.host.mechanics.whispers;
	if (slice === undefined) throw new Error("no whispers in the snapshot");
	const host: HostSnapshot = { ...snapshot.host, mechanics: { ...snapshot.host.mechanics, whispers: { ...slice, data } } };
	return { ...snapshot, host };
}

/** Events the resumed run logged after the cut. */
function after(snapshot: ResumePoint, events: readonly RecordedEvent[]): readonly RecordedEvent[] {
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
		const slice = sliceIn(snapshot, "whispers", WhispersSlice);
		expect(slice).toMatchObject({ whisperer: whispererOf(first.host), round: 0, phase: "pending", ballots: [] });
		expect(slice.forgeries.map((forgery) => forgery.minute)).toEqual([3]);
		const resumed = await play({}, { resume: snapshot });
		expect(whispererOf(resumed.host)).toBe(whispererOf(first.host));
		const late = after(snapshot, resumed.events);
		expect(ofType(late, "whisperer_chosen")).toEqual([]);
		// No duty before the first vote; the first follows its count at minute 6.
		expect(ofType(resumed.events, "whisper_duty").map((duty) => [duty.minute, duty.since, duty.forgeries])).toEqual([[6, 0, 1]]);
		// Whom he forged for is kept too (figure direction 10 counts the recipients).
		const victim = first.host.residents.filter((id) => id !== whispererOf(first.host))[1];
		expect(slice.forgeries.map((forgery) => forgery.to)).toEqual([victim]);
	});

	it("resumes a snapshot from before the forgeries' recipients were kept", async () => {
		const first = await play({}, { snapshotAt: 3 });
		const snapshot = cutAt(first);
		const slice = sliceIn(snapshot, "whispers", WhispersSlice);
		expect(slice.forgeries.every((forgery) => forgery.to !== undefined)).toBe(true);
		const older = withWhispers(snapshot, { ...slice, forgeries: slice.forgeries.map((forgery) => ({ minute: forgery.minute })) });
		const resumed = await play({}, { resume: older });
		expect(ofType(resumed.events, "whisper_duty").map((duty) => [duty.minute, duty.since, duty.forgeries])).toEqual([[6, 0, 1]]);
	});

	it("keeps an open round's ballots and does not announce it again", async () => {
		const first = await play({}, { snapshotAt: 5 });
		const snapshot = cutAt(first);
		expect(snapshot.minute).toBeLessThan(6);
		expect(ofType(first.events, "popularity_opened")).toHaveLength(1);
		const slice = sliceIn(snapshot, "whispers", WhispersSlice);
		expect(slice).toMatchObject({ round: 0, phase: "open" });
		expect(slice.ballots).toHaveLength(6);
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
		const slice = sliceIn(snapshot, "whispers", WhispersSlice);
		const counted = withWhispers(snapshot, { whisperer: slice.whisperer, forgeries: [], round: 1, phase: "pending", ballots: [] });
		const resumed = await play({}, { resume: counted });
		const late = after(snapshot, resumed.events);
		expect(ofType(late, "popularity_opened")).toEqual([]);
		expect(ofType(late, "popularity_result")).toEqual([]);
	});

	it("counts a window's DMs from before the cut against the cap", async () => {
		const snapshot = cutAt(await play({}, { snapshotAt: 4 }));
		const resumed = await play({}, { resume: snapshot });
		const refused = ofType(after(snapshot, resumed.events), "tool_result").filter((event) => event.agent === resumed.host.residents.find((id) => id !== whispererOf(resumed.host)) && event.tool === "sendDM");
		expect(refused.map((event) => event.text)).toEqual(["DM_LIMIT: 8 DMs sent since minute 0; you can send again from minute 6"]);
	});

	it("never gives a resumed control run a whisperer, and refuses --no-whisperer on a run that had one", async () => {
		const control = await play({ whisperer: false }, { snapshotAt: 4 });
		const snapshot = cutAt(control);
		expect(sliceIn(snapshot, "whispers", WhispersSlice).whisperer).toBeNull();
		const resumed = await play({}, { resume: snapshot });
		expect(whispererOf(resumed.host)).toBeUndefined();
		expect(ofType(after(snapshot, resumed.events), "whisper_duty")).toEqual([]);

		const played = cutAt(await play({}, { snapshotAt: 4 }));
		await expect(play({ whisperer: false }, { resume: played })).rejects.toThrow(/resume it without --no-whisperer/);
	});
});
