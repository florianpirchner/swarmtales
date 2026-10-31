/**
 * Channels with the real exile and tribunal (T4a) instead of a stand-in that writes `exiled`: a
 * resident at the gate is still in the city, a resident the holdout struck or the gate closed on is
 * beyond the wall, and channels refuses a DM to them. The ledger and the standoff are the real ones; progression,
 * puzzles, the goals and the seal stay stand-ins (the exile's own support city),
 * because the real ones need the story's options of steps 17 and 18 and nothing here reads them.
 */
import { describe, expect, it } from "vitest";
import type { Host } from "@swarmtales/contracts";
import { competitorIds, createHost } from "@swarmtales/kernel";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { standoff } from "@swarmtales/mechanic-standoff";
import { ledger } from "@swarmtales/mechanic-ledger";
import { ExileApi } from "@swarmtales/mechanic-shared";
import { tribunal } from "@swarmtales/mechanic-tribunal";
import { idleAgent } from "@swarmtales/testkit";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { standIns, TestCity } from "../exile/support/city.ts";
import { runProbe, storyOptions } from "../exile/support/host.ts";
import { marksStandIn, namesStandIn } from "./stand-ins.ts";
import { textOf } from "./harness.ts";

const IDS = competitorIds(6);

function city(): { readonly host: Host; readonly toGate: (resident: string, until: number) => Promise<unknown>; readonly strike: (resident: string) => Promise<unknown> } {
	const found = cityOfKeys.tribunal;
	if (found === undefined) throw new Error("cityofkeys has no tribunal");
	const simulated = new TestCity(IDS, 100);
	// The exile's support city, without its ledger and channels: the real ones answer.
	const around = standIns(simulated).filter((use) => !["ledger", "channels", "standoff"].includes(use.mechanic.id));
	const host = createHost(
		storyOptions({
			residents: IDS,
			mechanics: [channels.with(), ledger.with({ startPoints: 100 }), marksStandIn().with(), namesStandIn(new Map<string, string>()).with(), ...around, standoff.with({}), exile.with(), tribunal.with({ ...found, first: { ...found.first, latestAfter: 1000 } })],
			residentTools: ["sendDM", "payRansom", "lastWill"],
		}),
	);
	host.start();
	return {
		host,
		toGate: (resident, until) => runProbe(host, (ctx) => ctx.tryCall(ExileApi, "toGate", { resident, until, ransomable: true, voters: [], price: 20, selfPrice: 30 })),
		strike: (resident) => runProbe(host, (ctx) => ctx.tryCall(ExileApi, "strike", { resident, by: "holdout" })),
	};
}

const dm = async (host: Host, from: string, to: string): Promise<string> => textOf(await host.call(`resident:${from}`, "sendDM", { target: to, message: "A word." }));

describe("channels and the real exile", () => {
	it("still reaches a resident at the gate, and refuses one the holdout struck or the gate closed on", async () => {
		const { host, toGate, strike } = city();
		await toGate("A01", 3);
		expect(await dm(host, "A02", "A01")).toContain("sent");
		expect(await strike("A03")).toEqual({ ok: true });
		expect(await dm(host, "A02", "A03")).toBe("EXILED: A03 was exiled; beyond the wall no message reaches them");
		expect(host.log.ofType("exile", "exiled").map((event) => event.payload)).toMatchObject([{ agent: "A03", by: "holdout" }]);
		for (let minute = 0; minute < 4; minute++) await host.playMinute(idleAgent);
		expect(host.log.ofType("exile", "exiled").map((event) => event.payload)).toMatchObject([{ agent: "A03" }, { agent: "A01" }]);
		expect(await dm(host, "A02", "A01")).toBe("EXILED: A01 was exiled; beyond the wall no message reaches them");
		expect(await dm(host, "A02", "A04")).toContain("sent");
	});
});
