/**
 * carve-round3-T4b.md must-fix 1: the real 6-agent Act I base (`examples/cityofkeys-act1-06a-04/
 * snapshot-L7.json`) through `convertLegacySnapshot`, resumed by one host with the real seal,
 * standoff and standoff-tribunal side by side, and the real channels, ledger and marks (teams T1/T2)
 * on their converted slices. No slice is patched: the old world wrote none of the three before
 * Act II, the converter writes none, and the host hands each version-0 migration `{}` (R2-D2).
 *
 * Stand-ins stay for what cannot load here yet, each over the snapshot's own facts (everyone held
 * before door 8, nothing dealt that is open, nobody gone): puzzles and progression (the real ones
 * need the story's whole deal and clock, which only the T3 twin wires), exile and tribunal (the
 * real exile requires the real puzzles' deal), names (the real names mechanic renames at its
 * minute). Every other slice keeps its old data through `standInsFor`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import { Type } from "typebox";
import { createHost, defineCoreStory, defineMechanic, type HostOptions } from "@swarmtales/kernel";
import { createPromptLookup, mechanicPromptFolders } from "@swarmtales/prompts";
import { ExileApi, ExileEvents, ProgressionApi, ProgressionEvents, PuzzlesApi, SHARED_EVENTS, TribunalApi } from "@swarmtales/mechanic-shared";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { seal } from "@swarmtales/mechanic-seal";
import { standoff } from "@swarmtales/mechanic-standoff";
import { standoffTribunal } from "@swarmtales/mechanic-standoff-tribunal";
import { standInsFor } from "@swarmtales/testkit";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { SEAL } from "../../../stories/cityofkeys/characters.ts";
import { provider } from "../standoff/support/provider.ts";
import { namesStandIn } from "../channels/stand-ins.ts";
import { HOLDOUT_RULE } from "../standoff-tribunal/rule.ts";

const L7 = resolve(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");
const OURS: readonly string[] = ["seal", "standoff", "standoff-tribunal"];
const REAL = [...OURS, "channels", "ledger", "marks"];
/** The door everyone stands before at L7 (every resident solved 1-7 and is held). */
const DOOR = 8;

function resumed() {
	const converted = convertLegacySnapshot(JSON.parse(readFileSync(L7, "utf8")), {}, L7);
	const ids = converted.host.residents.ids;
	const standIns = [
		provider("puzzles", PuzzlesApi, { openFragmentDoors: () => [], heldPieces: () => [], kindOf: () => "additive", lacking: () => [], inherited: () => [], isDealt: () => false }),
		// The progression and the exile declare their events, which the seal and the real channels listen to.
		defineMechanic(
			{ id: "progression", summary: "Stand-in progression: everyone held before door 8.", options: Type.Object({}), state: (): undefined => undefined, events: ProgressionEvents.events, provides: [ProgressionApi] },
			(kit) => ({
				services: [
					kit.provideSome(ProgressionApi, {
						levelOf: () => DOOR,
						hasPassed: ({ level }) => level < DOOR,
						isOpenOnClock: () => false,
						currentAct: () => 1,
						isFinished: () => false,
						bounds: () => ({ startLevel: 1, lastLevel: 13, survivors: ids.length - 1 }),
					}),
				],
			}),
		),
		defineMechanic(
			{ id: "exile", summary: "Stand-in exile: nobody gone.", options: Type.Object({}), state: (): undefined => undefined, events: ExileEvents.events, provides: [ExileApi] },
			(kit) => ({ services: [kit.provideSome(ExileApi, { alive: () => [...ids], standing: () => ({ kind: "alive" as const }), isExiled: () => false })] }),
		),
		provider("tribunal", TribunalApi, {}),
		namesStandIn(new Map<string, string>()),
	];
	const loaded = [...REAL, "puzzles", "progression", "exile", "tribunal", "names"];
	const story = defineCoreStory({
		id: converted.host.story,
		seed: converted.host.seed,
		minutes: 20,
		residents: ids,
		mechanics: [
			seal.with(SEAL),
			standoff.with(cityOfKeys.rules.ultimatum === undefined ? {} : { ultimatum: cityOfKeys.rules.ultimatum }),
			standoffTribunal.with({ ...HOLDOUT_RULE, author: "COURIER" }),
			channels.with({ city: cityOfKeys.city }),
			ledger.with({ startPoints: cityOfKeys.run.startPoints }),
			marks.with(),
			...standIns.map((mechanic) => mechanic.with()),
			...standInsFor(converted.host, loaded, { events: SHARED_EVENTS }),
		],
		grants: { resident: ["bid", "permaDeath", "claimPiece", "tribunalVote"], gamemaker: ["ultimatum", "callTribunal", "announceTribunal", "permaDeath", "drawLot"] },
	});
	const options: HostOptions = { story, prompts: createPromptLookup({ mechanics: mechanicPromptFolders() }) };
	return { converted, options, host: createHost({ ...options, resume: { snapshot: converted.host, events: converted.events } }) };
}

describe("seal, standoff and standoff-tribunal resume the real 6-agent snapshot-L7 together (real channels, ledger, marks; stand-in puzzles, progression, exile, tribunal, names)", () => {
	it("loads without a patched slice and starts each of the three fresh, as the old world did before Act II", () => {
		const { converted, host } = resumed();
		for (const id of OURS) expect(converted.host.mechanics[id], id).toBeUndefined();
		expect(host.minute).toBe(9);
		const fresh = createHost(resumed().options);
		const mechanics = host.snapshot().mechanics;
		for (const id of OURS) expect(mechanics[id], id).toEqual(fresh.snapshot().mechanics[id]);
	});

	it("plays on with nothing of the three before the act, and its own snapshot resumes to the same state", async () => {
		const { converted, options, host } = resumed();
		const seq = host.log.all().length;
		for (let count = 0; count < 5; count++) await host.playMinute(() => Promise.resolve());
		expect(host.log.all().slice(seq).filter((event) => OURS.includes(event.source))).toEqual([]);
		const saved = host.snapshot();
		const again = createHost({ ...options, resume: { snapshot: structuredClone(saved), events: [...converted.events, ...host.log.all().slice(seq)] } });
		expect(again.snapshot()).toEqual(saved);
	});
});
