/**
 * What channels hands out about DMs: a record of an old file that kept no text stays without one
 * (R2-D14), and the text of a delivered DM always goes to receipts, which alone decides whether a
 * receipt quotes it (R2-D12).
 */
import { join } from "node:path";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import type { Host } from "@swarmtales/contracts";
import { createHost, defineCoreStory, defineMechanic, reply } from "@swarmtales/kernel";
import { channels, channelsHead } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { receipts } from "@swarmtales/mechanic-receipts";
import { ChannelsApi } from "@swarmtales/mechanic-shared";
import { idleAgent, standInsFor } from "@swarmtales/testkit";
import { progressionStandIn } from "../cast/stand-ins.ts";
import { exileStandIn, hostFor, t2Prompts, textOf } from "./harness.ts";
import { withVersionZeroShapes } from "./resume-fixtures.ts";
import { ROOT, snapshotFile } from "./resume.ts";
import { marksStandIn, namesStandIn } from "./stand-ins.ts";

/** Reads the DM records through the API, as JSON. */
const probe = defineMechanic(
	{ id: "script", summary: "Test driver: reads the DM records.", options: Type.Object({}), state: () => undefined, events: {}, requires: [ChannelsApi], prompts: { "tools/readBoard": [] } },
	(kit) => ({
		tools: [
			kit.tool({
				name: "records",
				description: "tools/readBoard",
				parameters: Type.Object({ number: Type.Optional(Type.Integer()) }),
				execute: ({ number }, ctx) => reply(JSON.stringify(number === undefined ? ctx.call(ChannelsApi, "dmRecords", {}) : ctx.call(ChannelsApi, "dmRecord", { number }))),
			}),
		],
	}),
);

const OldFile = Type.Object({ world: Type.Object({ dms: Type.Array(Type.Object({ id: Type.Integer(), text: Type.Optional(Type.String()) })) }) });

const records = async (host: Host, number?: number): Promise<unknown> => JSON.parse(textOf(await host.call("script", "records", number === undefined ? {} : { number })));

describe("a DM record of an old file without text", () => {
	const raw = withVersionZeroShapes(snapshotFile("cityofkeys-act1-06a-04"));
	const converted = convertLegacySnapshot(JSON.parse(JSON.stringify(raw)), {}, join(ROOT, "examples", "cityofkeys-act1-06a-04", "snapshot-L7.json"));
	const loaded = ["channels", "ledger", "marks", "names", "receipts", "exile", "progression", "script"];

	function resumed(): Host {
		const story = defineCoreStory({
			id: "nexus",
			seed: converted.host.seed,
			minutes: 80,
			residents: converted.host.residents.ids,
			mechanics: [channels.with(), ledger.with(), marksStandIn().with(), namesStandIn(new Map<string, string>()).with(), receipts.with(), exileStandIn.with(), progressionStandIn(new Map<number, number>()).with(), probe.with(), ...standInsFor(converted.host, loaded)],
			grants: { script: ["records"] },
		});
		return createHost({ story, prompts: t2Prompts(), resume: { snapshot: converted.host, events: converted.events } });
	}

	it("is handed out without a text, the others keep theirs", async () => {
		const old = Parse(OldFile, raw);
		const textless = old.world.dms[0];
		const kept = old.world.dms[1];
		expect(textless?.text).toBeUndefined();
		expect(typeof kept?.text).toBe("string");
		const host = resumed();
		const all = await records(host);
		if (!Array.isArray(all)) throw new Error("not a list");
		expect(all).toHaveLength(old.world.dms.length);
		expect(all[0]).not.toHaveProperty("text");
		expect(all[1]).toHaveProperty("text", kept?.text);
		// Asked for by its number, as blame does.
		expect(await records(host, textless?.id)).not.toHaveProperty("text");
		expect(await records(host, textless?.id)).toHaveProperty("id", textless?.id);
		// The record stays absent in the slice too, and a minute played changes nothing about it.
		await host.playMinute(idleAgent);
		expect(await records(host, textless?.id)).not.toHaveProperty("text");
	});
});

describe("the receipt of a delivered DM", () => {
	const SECRET = "the vault opens at dawn";

	async function delivered(quoteDms: boolean): Promise<string> {
		const story = defineCoreStory({
			id: "t2-quote",
			seed: 7,
			minutes: 3,
			residents: 4,
			mechanics: [channels.with(), receipts.with({ quoteDms }), ledger.with({ startPoints: 10 }), marksStandIn().with(), namesStandIn(new Map<string, string>()).with(), exileStandIn.with()],
			grants: { resident: ["sendDM"] },
		});
		const host = hostFor({ story });
		expect(textOf(await host.call("resident:A01", "sendDM", { target: "A02", message: SECRET }))).toContain("sent");
		await host.playMinute(idleAgent);
		expect(host.log.ofType("channels", "dm_delivered")).toHaveLength(1);
		// The delivery notice to the sender carries the text either way; the receipt is receipts' to keep.
		return JSON.stringify(host.snapshot().mechanics.receipts?.data);
	}

	it("quotes the text when the story says so, and never otherwise", async () => {
		expect(await delivered(true)).toContain(SECRET);
		expect(await delivered(false)).not.toContain(SECRET);
	});

	it("has no option of its own to quote: receipts owns the flag", () => {
		expect(Object.keys(channelsHead.options.properties)).not.toContain("quoteDms");
	});
});
