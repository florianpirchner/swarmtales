/**
 * `defy` is open to everybody (`defiance`), to the whisperer alone (`whispererDefies`) or to nobody,
 * and it stays that way after a resume, where `whisperer_chosen` is not written again (R2-D5). The
 * whisperer, names, ledger, marks and receipts are the real mechanics.
 */
import { describe, expect, it } from "vitest";
import { Parse } from "typebox/value";
import { HostSnapshotSchema, type Host } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { names } from "@swarmtales/mechanic-names";
import { receipts } from "@swarmtales/mechanic-receipts";
import { whispers } from "@swarmtales/mechanic-whispers";
import { idleAgent } from "@swarmtales/testkit";
import whispersStory from "../../../stories/whispers/story.ts";
import { options as storyOptions } from "../t1/whispers-options.ts";
import { t2Prompts } from "./harness.ts";

const REASON = "My character would never do that to a friend.";
/** The words the old engine answered for a tool that is closed to the caller (pinned by the golden gates). */
const LOCKED = "TOOL_LOCKED: not available to you at this level or in this phase; activeTools lists the tools you can use now";
const WHISPERER = "A04";

interface Opening {
	readonly defiance?: boolean;
	readonly whispererDefies?: boolean;
}

function story(opening: Opening, minutes = 8) {
	const configured = storyOptions(whispersStory);
	return defineCoreStory({
		id: "t2-defy",
		seed: 7,
		minutes,
		residents: ["A01", "A02", "A03", "A04", "A05", "A06"],
		mechanics: [
			names.with({ announcement: whispersStory.names?.announcement ?? "" }),
			ledger.with({ startPoints: 10 }),
			channels.with({ defiance: opening.defiance === true, whispererDefies: opening.whispererDefies === true }),
			marks.with(configured.marks),
			receipts.with({ quoteDms: true }),
			whispers.with({ whisperer: { ...configured.whispers.whisperer, agent: WHISPERER } }),
		],
		grants: { resident: ["defy", "sendDM"] },
	});
}

/** Everyone's answer to `defy`, `ok` or the words of the refusal. */
async function defiances(host: Host): Promise<Record<string, string>> {
	const answers: Record<string, string> = {};
	for (const id of host.residents) answers[id] = answerOf(await host.call(`resident:${id}`, "defy", { reason: REASON }));
	return answers;
}

function answerOf(outcome: Awaited<ReturnType<Host["call"]>>): string {
	if (outcome.ok) return "open";
	return `${outcome.code}${outcome.detail === undefined ? "" : `: ${outcome.detail}`}`;
}

function withheld(except: readonly string[]): Record<string, string> {
	return Object.fromEntries(["A01", "A02", "A03", "A04", "A05", "A06"].map((id) => [id, except.includes(id) ? "open" : LOCKED]));
}

describe("who may defy the gamemaker", () => {
	it("nobody, unless the story opens it", async () => {
		const host = createHost({ story: story({}), prompts: t2Prompts() });
		host.start();
		expect(await defiances(host)).toEqual(withheld([]));
	});

	it("everybody with defiance", async () => {
		const host = createHost({ story: story({ defiance: true }), prompts: t2Prompts() });
		host.start();
		expect(await defiances(host)).toEqual(withheld(["A01", "A02", "A03", "A04", "A05", "A06"]));
	});

	it("only the whisperer when the whisperer defies, in the first minute and in a later one", async () => {
		const host = createHost({ story: story({ whispererDefies: true }), prompts: t2Prompts() });
		host.start();
		expect(host.log.ofType("whispers", "whisperer_chosen").map((event) => event.payload)).toEqual([{ agent: WHISPERER }]);
		expect(await defiances(host)).toEqual(withheld([WHISPERER]));
		await host.playMinute(idleAgent);
		await host.playMinute(idleAgent);
		await host.playMinute(idleAgent);
		expect(host.minute).toBeGreaterThan(2);
		expect(await defiances(host)).toEqual(withheld([WHISPERER]));
	});

	it("the whisperer alone, still, after the run is resumed from a file that holds no locks (as a converted old file does; the event is not written again)", async () => {
		const first = createHost({ story: story({ whispererDefies: true }), prompts: t2Prompts() });
		first.start();
		await first.playMinute(idleAgent);
		await first.playMinute(idleAgent);
		const events = first.log.all();
		// A converted old file carries no locks: the story's start locks hold, and nothing but the log tells who the whisperer is.
		const bare = Parse(HostSnapshotSchema, Object.fromEntries(Object.entries(first.snapshot()).filter(([key]) => key !== "locks")));
		expect(bare.locks).toBeUndefined();
		const resumed = createHost({ story: story({ whispererDefies: true }), prompts: t2Prompts(), resume: { snapshot: bare, events } });
		expect(await defiances(resumed)).toEqual(withheld([WHISPERER]));
		await resumed.playMinute(idleAgent);
		expect(resumed.log.ofType("whispers", "whisperer_chosen")).toHaveLength(1);
		expect(await defiances(resumed)).toEqual(withheld([WHISPERER]));
	});

	it("is shown to the whisperer in the open tools only, and the reason is recorded", async () => {
		const host = createHost({ story: story({ whispererDefies: true }), prompts: t2Prompts() });
		host.start();
		const recorded = await host.call(`resident:${WHISPERER}`, "defy", { reason: REASON, note: 3 });
		expect(recorded.ok).toBe(true);
		expect(host.log.ofType("channels", "gamemaker_defied").map((event) => event.payload)).toEqual([{ agent: WHISPERER, reason: REASON, note: 3 }]);
		expect(host.log.ofType("channels", "gamemaker_defied")).toHaveLength(1);
	});
});
