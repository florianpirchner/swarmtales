/**
 * Where a run ends (step 18, A1-1 and A1-4): a stop noticed at a minute's start, before any pass
 * began, ends the run at that minute (the clock stays, as the old `#nextMinute` wrote `run_end`);
 * the text of `host.stop(reason)` reaches the `runEnded` hooks; a stop between minutes stamps the
 * run's last events with the minute just played.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineMechanic } from "@swarmtales/kernel";
import { playStory, scriptedAgent } from "@swarmtales/testkit";
import type { CoreStory } from "@swarmtales/contracts";

/** Records what `runEnded` was given; its limit breaches from the minute `stopFrom` on, but only once the minute has started. */
const witness = defineMechanic(
	{
		id: "witness",
		summary: "A test mechanic: writes what its runEnded hook receives; a limit that fires from a minute on.",
		options: Type.Object({ stopFrom: Type.Integer({ default: 99, description: "The first minute whose start breaches the limit." }) }),
		state: (): { started: number } => ({ started: -1 }),
		events: { ended: Type.Object({ reason: Type.String(), detail: Type.Optional(Type.String()), minute: Type.Integer() }) },
		prompts: {},
	},
	(kit) => ({
		listeners: [
			kit.core(
				"minute_started",
				(_payload, ctx) => {
					ctx.state.started = ctx.minute;
				},
				{ immediate: true },
			),
		],
		hooks: {
			runEnded: (reason, ctx, detail) => {
				ctx.emit("ended", { reason, ...(detail === undefined ? {} : { detail }), minute: ctx.minute });
			},
		},
		limits: [kit.limit("early", "Breaches once the minute has started.", (view) => (view.state.started >= view.options.stopFrom ? "stopped early" : undefined))],
		snapshot: kit.snapshot({
			version: 1,
			schema: Type.Object({ started: Type.Integer() }),
			save: (state) => ({ started: state.started }),
			load: (data) => ({ started: data.started }),
		}),
	}),
);

const nothing = scriptedAgent(() => []);

function story(stopFrom: number): CoreStory {
	return { id: "run-end", seed: 5, minutes: 6, residents: 2, mechanics: [witness.with({ stopFrom })], grants: {} };
}

function ends(events: readonly { readonly source: string; readonly type: string; readonly payload: unknown }[]): readonly unknown[] {
	return events.filter((event) => event.source === "witness" && event.type === "ended").map((event) => event.payload);
}

describe("the minute a run ends at", () => {
	it("ends at the minute whose start breached when no pass began, and keeps the clock there", async () => {
		const run = await playStory({ story: story(3) }, nothing);
		expect(run.end).toMatchObject({ reason: "referee", minute: 3, limit: "witness.early" });
		expect(run.events.at(-1)).toMatchObject({ type: "run_ended", minute: 3 });
		expect(ends(run.events)).toEqual([{ reason: "referee", minute: 3 }]);
	});

	it("ends at the minute where a breach from the cost cap stands at the start", async () => {
		const host = createHost({ story: { ...story(99), limits: { maxCostUsd: 1 } } });
		host.start();
		const spend = scriptedAgent(() => []);
		await host.playMinute(spend);
		host.recordCost(2);
		const end = await host.playMinute(spend);
		// Minute 1 began with the breach standing: no pass started, so it ends there.
		expect(end).toMatchObject({ reason: "referee", minute: 1, limit: "core.maxCostUsd" });
	});

	it("ends at the next minute once a pass of the breaching minute ran (the stop came later than the start)", async () => {
		const host = createHost({ story: { ...story(99), limits: { maxCostUsd: 1 } } });
		host.start();
		const end = await host.playMinute(
			scriptedAgent(() => {
				host.recordCost(2);
				return [];
			}),
		);
		expect(end).toMatchObject({ reason: "referee", minute: 1 });
	});
});

describe("the text of host.stop", () => {
	it("reaches the runEnded hooks of a stop between minutes and stamps the last played minute", async () => {
		const host = createHost({ story: story(99) });
		host.start();
		await host.playMinute(nothing);
		await host.playMinute(nothing);
		host.stop("snapshot written");
		expect(host.ended).toEqual({ reason: "stopped", minute: 2 });
		expect(ends(host.log.all())).toEqual([{ reason: "stopped", detail: "snapshot written", minute: 1 }]);
		expect(host.log.all().at(-1)).toMatchObject({ type: "run_ended", minute: 1 });
		expect(host.minute).toBe(2);
	});

	it("reaches the runEnded hooks of a stop requested during a minute", async () => {
		const host = createHost({ story: story(99) });
		host.start();
		const end = await host.playMinute(
			scriptedAgent(() => {
				host.stop("operator");
				return [];
			}),
		);
		expect(end).toEqual({ reason: "stopped", minute: 1 });
		expect(ends(host.log.all())).toEqual([{ reason: "stopped", detail: "operator", minute: 1 }]);
	});

	it("gives no text to a run that ends by the referee or by its minutes", async () => {
		const natural = await playStory({ story: { ...story(99), minutes: 2 } }, nothing);
		expect(ends(natural.events)).toEqual([{ reason: "minutes", minute: 2 }]);
		const referee = await playStory({ story: story(1) }, nothing);
		expect(ends(referee.events)).toEqual([{ reason: "referee", minute: 1 }]);
	});
});
