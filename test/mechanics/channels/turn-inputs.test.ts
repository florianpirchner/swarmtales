/**
 * The order inside a turn's inputs (carve-decisions D-1): every part that only reads is built
 * before the inbox is emptied, because emptying it issues receipts and writes notices. Channels
 * and receipts are the real mechanics here; ledger, marks, names and exile stand in.
 */
import { describe, expect, it } from "vitest";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { channels } from "@swarmtales/mechanic-channels";
import { receipts } from "@swarmtales/mechanic-receipts";
import { scriptedAgent } from "@swarmtales/testkit";
import { exileStandIn, turnsOf } from "./harness.ts";
import { ledgerStandIn, marksStandIn, namesStandIn } from "./stand-ins.ts";

const TOOLS = ["sendDM", "readBoard", "postBoard"] as const;

/** A started host with every mechanic's own prompt folder (receipts has one). */
function started(definition: ReturnType<typeof story>) {
	const host = createHost({ story: definition, prompts: createPromptLookup() });
	host.start();
	return host;
}

function story(dmLimit?: { windowMinutes: number; perWindow: number }) {
	return defineCoreStory({
		id: "t2-inputs",
		seed: 7,
		minutes: 4,
		residents: 3,
		mechanics: [
			channels.with(dmLimit === undefined ? {} : { dmLimit }),
			receipts.with({}),
			ledgerStandIn(10).with(),
			marksStandIn().with(),
			namesStandIn(new Map<string, string>()).with(),
			exileStandIn.with(),
		],
		grants: { resident: TOOLS },
	});
}

/** A01 writes to A02 in minute 0 and says nothing after. */
const agent = () => scriptedAgent((turn) => (turn.resident === "A01" && turn.minute === 0 ? [{ tool: "sendDM", params: { target: "A02", message: "hello" } }] : []));

describe("the status line is built before the inbox is emptied", () => {
	it("does not count the receipt of the DM it delivers in the same turn (golden f10g10 seq 251)", async () => {
		const host = started(story());
		await host.run(agent());
		const turns = turnsOf(host);
		const first = turns.find((turn) => turn.resident === "A02" && turn.minute === 0) ?? turns.find((turn) => turn.resident === "A02");
		const delivered = turns.filter((turn) => turn.resident === "A02" && turn.inputs.some((input) => input.kind === "dm"));
		expect(first).toBeDefined();
		expect(delivered).toHaveLength(1);
		const status = (delivered[0]?.inputs ?? []).filter((input) => input.kind === "status").map((input) => input.text);
		// The receipt is issued while the DM is delivered: the recipient's status of that turn does not count it yet.
		expect(status.join(" ")).not.toContain("receipt");
		// The next turn of the recipient and the sender's next turn count it.
		const later = turns.filter((turn) => turn.resident === "A02" && turn.minute > (delivered[0]?.minute ?? 0)).flatMap((turn) => turn.inputs.filter((input) => input.kind === "status").map((input) => input.text));
		expect(later.join(" ")).toContain("1 receipt");
	});

	it("keeps the order inbox, then digest, in the lines of the turn", async () => {
		const host = started(story({ windowMinutes: 5, perWindow: 3 }));
		await host.run(agent());
		const delivered = turnsOf(host).filter((turn) => turn.resident === "A02" && turn.inputs.some((input) => input.kind === "dm"));
		const kinds = (delivered[0]?.inputs ?? []).map((input) => input.kind);
		expect(kinds).toEqual(["status", "dm", "digest"]);
		expect(delivered[0]?.inputs.find((input) => input.kind === "status")?.text).toContain("DMs");
	});
});
