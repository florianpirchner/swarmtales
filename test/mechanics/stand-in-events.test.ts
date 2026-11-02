/**
 * The testkit's stand-in declares the shared events of its id (wave 3.5, T1 request 12): a loaded
 * mechanic that listens to `progression.level_up` loads next to a stand-in progression.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineCoreStory, defineMechanic } from "@swarmtales/kernel";
import { ProgressionEvents, SHARED_EVENTS } from "@swarmtales/mechanic-shared";
import { standIn } from "@swarmtales/testkit";

const listener = defineMechanic({ id: "ear", summary: "Listens to level_up.", options: Type.Object({}), state: () => undefined, events: {} }, (kit) => ({
	listeners: [
		kit.listen(ProgressionEvents, "level_up", () => {
			// heard
		}),
	],
}));

function story(progression: ReturnType<typeof standIn>) {
	return defineCoreStory({ id: "stand-in", seed: 1, minutes: 1, residents: 1, mechanics: [progression.with(), listener.with()], grants: {} });
}

describe("a stand-in", () => {
	it("declares the shared events of its id", () => {
		expect(Object.keys(standIn("progression", { events: SHARED_EVENTS }).events)).toEqual(Object.keys(ProgressionEvents.events));
		expect(standIn("nobody", { events: SHARED_EVENTS }).events).toEqual({});
		expect(() => createHost({ story: story(standIn("progression", { events: SHARED_EVENTS })) })).not.toThrow();
	});

	it("without them, fails the loader's listener check", () => {
		expect(() => createHost({ story: story(standIn("progression")) })).toThrow();
	});
});
