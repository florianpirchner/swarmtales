/**
 * The whispers mechanic beside the real exile (round 3, T1: mutants T1-6, T1-7 and T1-13, and the
 * live `dutyNow` of must-fix 3). The Whispers story's city is the real one (test/mechanics/t1/city.ts)
 * plus the real exile; only the tribunal's texts and the standoff are stand-ins. A resident at the
 * gate stays in the city (it is counted in the vote and the whisperer at the gate still gets its
 * duty), a struck resident is gone (no duty, no orders). There is no old-engine differential for this:
 * the old whispers world cannot gate a resident without the whole tribunal, so the expectations are
 * the old code's semantics (`inCity` is `!isExiled`, world.ts:701, 716, 1070) written out.
 */
import { describe, expect, it } from "vitest";
import type { Host, Turn, TurnTaker } from "@swarmtales/contracts";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { exile } from "@swarmtales/mechanic-exile";
import { ExileApi, StandoffApi, TribunalApi } from "@swarmtales/mechanic-shared";
import { whispers } from "@swarmtales/mechanic-whispers";
import whispersStory from "../../../stories/whispers/story.ts";
import { provider } from "../exile/support/provider.ts";
import { runProbe, startHost } from "../exile/support/host.ts";
import { realCity } from "../t1/city.ts";
import { ids } from "../t1/support.ts";
import { options as storyOptions } from "../t1/whispers-options.ts";


function city(): Host {
	const configured = storyOptions(whispersStory);
	return startHost({
		id: "whispers-exile",
		seed: 7,
		minutes: 30,
		residents: ids(6),
		mechanics: [
			...realCity(whispersStory),
			provider("standoff", StandoffApi, { keep: () => null, noteGiven: () => null, noteText: () => null }).with(),
			provider("tribunal-texts", TribunalApi, { text: () => "the gate" }).with(),
			exile.with(),
			whispers.with({ ...configured.whispers, direction: { level: 10, defies: false } }),
		],
		residentTools: ["sendDM", "nameFavourite"],
		turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }),
	});
}

/** The whisperer of this seed. */
function whispererOf(host: Host): string {
	const data = host.snapshot().mechanics.whispers?.data;
	const found: unknown = typeof data === "object" && data !== null ? Reflect.get(data, "whisperer") : undefined;
	if (typeof found !== "string") throw new Error("the run has no whisperer");
	return found;
}

const toGate = (host: Host, resident: string) => runProbe(host, (ctx) => ctx.tryCall(ExileApi, "toGate", { resident, until: 99, ransomable: true, voters: [], price: 20, selfPrice: 30 }));
const strike = (host: Host, resident: string) => runProbe(host, (ctx) => ctx.tryCall(ExileApi, "strike", { resident, by: "holdout" }));

async function playTo(host: Host, last: number, agent: TurnTaker): Promise<void> {
	for (let minute = 0; minute <= last; minute++) await host.playMinute(agent);
}

/** Ballots of A01, A02 and A04 for A03 at minute 4 (the first vote opens then), `act` for what else happens in a minute's first turn. */
function agent(whisperer: string, act: (minute: number, turn: Turn) => Promise<void>, by: string = ids(6).find((id) => id !== whisperer) ?? whisperer): TurnTaker {
	const done = new Set<number>();
	return async (turn) => {
		if (turn.minute === 4 && ["A01", "A02", "A04"].includes(turn.resident) && turn.resident !== whisperer) await turn.call("nameFavourite", { agent: "A03" });
		if (turn.resident !== by || done.has(turn.minute)) return;
		done.add(turn.minute);
		await act(turn.minute, turn);
	};
}

const facts = (host: Host): unknown => host.facts()["whispers.dutyNow"];
const dutyEvents = (host: Host) => host.log.all().filter((event) => event.type === "whisper_duty");
const results = (host: Host) => host.log.all().filter((event) => event.type === "popularity_result");

describe("whispers beside the real exile", () => {
	it("keeps a resident at the gate in the city: its ballot counts and the whisperer at the gate gets its duty and its orders", async () => {
		const host = city();
		const whisperer = whispererOf(host);
		const sender = whisperer === "A01" ? "A02" : "A01";
		let seen: unknown;
		const taker = agent(whisperer, async (minute) => {
			if (minute === 5) {
				expect(await toGate(host, sender)).toBeNull();
				await toGate(host, whisperer);
			}
			if (minute === 7) seen = facts(host);
		});
		await playTo(host, 7, taker);
		expect(host.snapshot().mechanics.exile?.data).toMatchObject({ gates: [{ resident: sender }, { resident: whisperer }] });
		const first = results(host)[0]?.payload;
		expect(first).toMatchObject({ round: 1, winners: ["A03"] });
		// The ballot of the resident sent to the gate after voting counts (old `inCity` is `!isExiled`).
		expect(Reflect.get(first ?? {}, "voters")).toContain(sender);
		expect(dutyEvents(host).map((event) => event.payload)).toMatchObject([{ agent: whisperer }]);
		expect(seen).toMatchObject({ agent: whisperer, since: 6, nextVote: 12 });
	});

	it("gives a struck whisperer no duty and no orders, and keeps the ballots of the others", async () => {
		const host = city();
		const whisperer = whispererOf(host);
		let seen: unknown = "unset";
		const taker = agent(whisperer, async (minute) => {
			if (minute === 5) await strike(host, whisperer);
			if (minute === 7) seen = facts(host);
		});
		await playTo(host, 7, taker);
		expect(results(host)).toHaveLength(1);
		expect(dutyEvents(host)).toEqual([]);
		expect(seen).toBeNull();
	});

	it("counts a DM of the minute at once and drops a strike at once (dutyNow is computed live, in the same turn)", async () => {
		const host = city();
		const whisperer = whispererOf(host);
		const targets = ids(6).filter((id) => id !== whisperer).slice(0, 2);
		const log: unknown[] = [];
		const sentOk: boolean[] = [];
			const taker = agent(whisperer, async (minute, turn) => {
			if (minute !== 7) return;
			log.push(facts(host));
			for (const target of targets) sentOk.push((await turn.call("sendDM", { target, message: `psst ${target}` })).ok);
			log.push(facts(host));
			await strike(host, whisperer);
			log.push(facts(host));
		}, whisperer);
		await playTo(host, 7, taker);
		expect(sentOk).toEqual([true, true]);
		expect(log).toHaveLength(3);
		expect(log[0]).toMatchObject({ agent: whisperer, whispers: 0, recipients: [], met: false });
		expect(log[1]).toMatchObject({ agent: whisperer, whispers: 2, recipients: targets, met: true });
		expect(log[2]).toBeNull();
	});
});
