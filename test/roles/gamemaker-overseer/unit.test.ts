/**
 * The gamemaker overseer's own rules (step 18, team C2), without a city: when it looks (`every`,
 * the last round, the arena's `arena.stopping`), the system prompt per direction (the dial's
 * profiles), the `system` hook, the snapshot slice's check, and the story mapping's grant lines.
 */
import { describe, expect, it } from "vitest";
import type { EventEnvelope, EventLogView, Fired, OverseerInstance } from "@swarmtales/contracts";
import { createRng } from "@swarmtales/kernel";
import { DIRECTION_LEVELS } from "@swarmtales/contracts";
import { OVERSEER_ORDER } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import {
	defineGamemaker,
	GAMEMAKER_NAME,
	gamemakerGrantTweaks,
	gamemakerOptions,
	gamemakerSystemPrompt,
	tribunalGamemakerRoles,
	type GamemakerLook,
	type GamemakerOverseerOptions,
} from "@swarmtales/roles";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";

const prompts = createPromptLookup();

function logOf(events: readonly EventEnvelope[]): EventLogView {
	return {
		get length() {
			return events.length;
		},
		all: () => events,
		since: (seq) => events.filter((event) => event.seq > seq),
		ofType: (source, type) => events.filter((event) => event.source === source && event.type === type),
	};
}

interface Setup {
	readonly minutes?: number;
	readonly facts?: Readonly<Record<string, unknown>>;
	readonly options?: Partial<GamemakerOverseerOptions>;
	readonly report?: (look: GamemakerLook) => string;
}

function instance(setup: Setup = {}): { readonly overseer: OverseerInstance; readonly looks: GamemakerLook[] } {
	const looks: GamemakerLook[] = [];
	const events: EventEnvelope[] = setup.minutes === undefined ? [] : [{ seq: 1, minute: 0, type: "run_started", source: "core", actor: "host", payload: { minutes: setup.minutes } }];
	const overseer = defineGamemaker({
		situation(look) {
			looks.push(look);
			return setup.report?.(look) ?? `report ${String(look.round)}`;
		},
	}).instantiate(
		{
			name: GAMEMAKER_NAME,
			seed: 7,
			minute: () => 0,
			residents: { ids: ["A01", "A02"], has: (id) => id === "A01" || id === "A02", mayAct: () => true, attribute: () => undefined },
			log: logOf(events),
			facts: () => setup.facts ?? {},
			decisions: { pending: () => [] },
			display: (text) => text.replaceAll("A01", "Ada"),
			emit: () => {
				throw new Error("the gamemaker declares no events");
			},
			render: (prompt, variables, declared) => prompts.render(GAMEMAKER_NAME, prompt, variables, declared),
			rng: () => createRng(7),
		},
		setup.options ?? {},
	);
	return { overseer, looks };
}

const at = (minute: number): Fired => ({ kind: "schedule", minute });

describe("when the gamemaker overseer looks", () => {
	it("looks after every round by default, with the report shown under the host's names", () => {
		const { overseer, looks } = instance({ minutes: 12 });
		expect(overseer.calls(at(0))).toEqual([{ situation: "report 1" }]);
		expect(overseer.calls(at(4))).toEqual([{ situation: "report 5" }]);
		expect(looks.map((look) => look.round)).toEqual([1, 5]);
	});

	it("shows the report under the host's names", () => {
		const { overseer } = instance({ minutes: 12, report: () => "A01 waits" });
		expect(overseer.calls(at(0))).toEqual([{ situation: "Ada waits" }]);
	});

	it("looks only after rounds that are a multiple of every", () => {
		const { overseer } = instance({ minutes: 12, options: { every: 3 } });
		expect([0, 1, 2, 3, 4, 5].map((minute) => overseer.calls(at(minute)).length)).toEqual([0, 0, 1, 0, 0, 1]);
	});

	it("makes no look after the last round", () => {
		const { overseer } = instance({ minutes: 3 });
		expect([0, 1, 2].map((minute) => overseer.calls(at(minute)).length)).toEqual([1, 1, 0]);
	});

	it("makes no look once the arena says the run stops", () => {
		expect(instance({ minutes: 12, facts: { "arena.stopping": "survivors" } }).overseer.calls(at(0))).toEqual([]);
		expect(instance({ minutes: 12, facts: { "arena.stopping": null } }).overseer.calls(at(0))).toHaveLength(1);
	});

	it("looks only on its schedule", () => {
		const { overseer } = instance({ minutes: 12 });
		expect(overseer.calls({ kind: "hook", hook: "between", minute: 0 })).toEqual([]);
		expect(overseer.calls({ kind: "fact", value: 1 })).toEqual([]);
	});

	it("hands the report the budget line of its options", () => {
		const { overseer, looks } = instance({ minutes: 12, options: { notesPerAgent: 2, boardPosts: 1, windowMinutes: 3 } });
		overseer.calls(at(0));
		expect(looks[0]?.budget).toBe("2 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: nobody. Board posts left: 1.");
		expect(looks[0]?.direction).toBe(4);
	});
});

describe("the gamemaker overseer's system prompt", () => {
	const spec = cityOfKeys.gamemaker;
	if (spec === undefined) throw new Error("no gamemaker");
	const input = { city: "NEXUS", agents: 6, survivors: 2, rules: cityOfKeys.rules, spec };

	it.each(DIRECTION_LEVELS)("at direction %i is the old composer's prompt for that direction", (direction) => {
		const options = gamemakerOptions({ ...input, direction });
		expect(options.system).toBe(gamemakerSystemPrompt({ ...input, direction }));
		expect(options.direction).toBe(direction);
		expect(instance({ options }).overseer.system?.()).toBe(options.system);
	});

	it("differs between the dial's ends", () => {
		expect(gamemakerOptions({ ...input, direction: 0 }).system).not.toBe(gamemakerOptions({ ...input, direction: 10 }).system);
	});

	it("keeps the head's default when no system is composed", () => {
		expect(instance().overseer.system?.()).toBeUndefined();
	});
});

describe("the gamemaker overseer's input", () => {
	it("is the report alone without orders, and the report with the rendered orders after it", () => {
		const declared = ["situation", "standingOrders"];
		expect(prompts.render(GAMEMAKER_NAME, "gamemaker/look", { situation: "The city.", standingOrders: "" }, declared)).toBe("The city.");
		expect(prompts.render(GAMEMAKER_NAME, "gamemaker/look", { situation: "The city.", standingOrders: "\n\nOrders: post less." }, declared)).toBe("The city.\n\nOrders: post less.");
	});
});

describe("the gamemaker overseer's slice", () => {
	it("refuses a slice that is not its shape", () => {
		const { overseer } = instance();
		expect(() => overseer.snapshot?.load({ tracks: "no" }, 1)).toThrow();
	});
});

describe("the story mapping of the gamemaker", () => {
	it("drops ultimatum below the dial's top, under the overseer's name", () => {
		expect(gamemakerGrantTweaks({ ultimatum: false, standoff: true })).toEqual({ gamemaker: { drop: ["ultimatum"] } });
		expect(gamemakerGrantTweaks({ name: "director", ultimatum: false, standoff: true })).toEqual({ director: { drop: ["ultimatum"] } });
	});

	it("keeps ultimatum when the run grants it, and says nothing without the standoff", () => {
		expect(gamemakerGrantTweaks({ ultimatum: true, standoff: true })).toEqual({});
		expect(gamemakerGrantTweaks({ ultimatum: false, standoff: false })).toEqual({});
	});

	it("hands the tribunal the story's roles", () => {
		const spec = cityOfKeys.gamemaker;
		if (spec === undefined) throw new Error("no gamemaker");
		expect(tribunalGamemakerRoles(spec.roles)).toEqual(spec.roles.map(({ fromLevel, role }) => ({ fromLevel, role })));
	});
});

describe("the gamemaker overseer's place in the between slot", () => {
	it("looks after the classifier and the weaver (the shared OVERSEER_ORDER)", () => {
		const head = defineGamemaker({ situation: () => "" });
		const orders = head.triggers.map((trigger) => ("order" in trigger ? trigger.order : undefined) ?? 0);
		expect(orders).toEqual([OVERSEER_ORDER.gamemaker]);
		expect(Math.min(...orders)).toBeGreaterThan(OVERSEER_ORDER.weaver + 1);
		expect(OVERSEER_ORDER.classifier).toBeLessThan(OVERSEER_ORDER.weaver);
	});
});
