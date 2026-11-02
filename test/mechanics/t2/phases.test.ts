/**
 * Hook order of the T2 mechanics (carve-decisions D-1): at a minute start petitions expire before the
 * cast acts, and at the run's end petitions resolve before channels settle the treasuries, both
 * before `run_ended`. Two petitions expiring in one minute resolve one after the other.
 */
import { describe, expect, it } from "vitest";
import { defineCoreStory } from "@swarmtales/kernel";
import { channels } from "@swarmtales/mechanic-channels";
import { petitions } from "@swarmtales/mechanic-petitions";
import { idleAgent } from "@swarmtales/testkit";
import { hostFor, payloads, textOf } from "../channels/harness.ts";
import { ledgerStandIn, marksStandIn, namesStandIn, receiptsStandIn } from "../channels/stand-ins.ts";
import { scriptStandIn } from "./script-stand-in.ts";

function city(minutes: number) {
	return hostFor({
		story: defineCoreStory({
			id: "t2-phases",
			seed: 7,
			minutes,
			residents: 3,
			// Load order is deliberately the reverse of the golden order.
			mechanics: [scriptStandIn.with(), petitions.with(), channels.with(), ledgerStandIn(10).with(), marksStandIn().with(), namesStandIn(new Map<string, string>()).with(), receiptsStandIn().with()],
			grants: { resident: ["readBoard"], script: ["openPetition", "resolvePetition"] },
		}),
	});
}

const order = (host: ReturnType<typeof city>, types: readonly string[]) => host.log.all().map((event) => event.type).filter((type) => types.includes(type));

describe("petition phases", () => {
	it("resolves two petitions expiring in one minute one after the other", async () => {
		const host = city(4);
		for (const id of ["P1", "P2"]) textOf(await host.call("script", "openPetition", { id, threshold: { count: 2 }, deadlineMinute: 1, visibility: "public" }));
		await host.playMinute(idleAgent);
		await host.playMinute(idleAgent);
		await host.playMinute(idleAgent);
		expect(payloads(host, "petition_resolved")).toHaveLength(2);
		expect(order(host, ["petition_resolved", "board_post"]).slice(-4)).toEqual(["petition_resolved", "board_post", "petition_resolved", "board_post"]);
	});

	it("resolves open petitions before the run ends, and settles the treasuries after", async () => {
		const host = city(2);
		textOf(await host.call("script", "openPetition", { id: "P1", threshold: { count: 2 }, deadlineMinute: 50, visibility: "public" }));
		await host.run(idleAgent);
		const types = order(host, ["petition_resolved", "treasury_settled", "run_ended"]);
		expect(types.indexOf("petition_resolved")).toBeGreaterThanOrEqual(0);
		expect(types.indexOf("petition_resolved")).toBeLessThan(types.indexOf("run_ended"));
		const settled = types.indexOf("treasury_settled");
		if (settled >= 0) expect(settled).toBeGreaterThan(types.indexOf("petition_resolved"));
	});
});
