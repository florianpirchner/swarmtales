/**
 * Wave 3.5 (docs/design/carve-decisions.md, D-3, request T1 R-8): a consult's `ask` may skip the
 * role. The old blame settled a claim the city's own checks reject without asking the judge; the
 * consult stage asked first, which cost a model call and logged `role_asked`/`role_answered` the
 * old run never had. With `skipConsult(reason)` nothing is asked or logged and `execute` gets
 * `{ ok: false, reason: "skipped" }`.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineCoreStory, defineMechanic, refuse, reply, skipConsult } from "@swarmtales/kernel";
import type { RoleCaller } from "@swarmtales/contracts";

const court = defineMechanic(
	{ id: "court", summary: "A judge that is only asked when the city cannot decide.", options: Type.Object({}), state: () => undefined, events: { judged: Type.Object({ verdict: Type.String() }) }, prompts: { "court/accuse": [] } },
	(kit) => ({
		tools: [
			kit.tool({
				name: "accuse",
				description: "court/accuse",
				parameters: Type.Object({ claim: Type.Integer() }),
				consult: {
					role: "judge",
					question: Type.Object({ claim: Type.Integer() }),
					answer: Type.Object({ upheld: Type.Boolean() }),
					// The city's own check: an odd claim number is wrong without a judge.
					ask: (params) => (params.claim < 0 ? refuse("BAD_CLAIM") : params.claim % 2 === 1 ? skipConsult(`claim ${String(params.claim)} came first`) : { claim: params.claim }),
				},
				execute: (_params, ctx, consulted) => {
					if (consulted.ok) {
						ctx.emit("judged", { verdict: consulted.answer.upheld ? "upheld" : "dismissed" });
						return reply("judged");
					}
					if (consulted.reason === "skipped") {
						ctx.emit("judged", { verdict: `wrong: ${consulted.error}` });
						return reply("settled by the city");
					}
					return refuse(consulted.reason === "absent" ? "JUDGE_ABSENT" : "JUDGE_FAILED");
				},
			}),
		],
	}),
);

const story = defineCoreStory({ id: "court", seed: 3, minutes: 1, residents: 1, mechanics: [court.with()], grants: { resident: ["accuse"] } });

describe("a consult that skips its role", () => {
	it("asks nobody and runs execute with reason skipped", async () => {
		let asked = 0;
		const judge: RoleCaller = {
			ask: () => {
				asked += 1;
				return Promise.resolve({ ok: true, answer: { upheld: true }, costUsd: 0.01 });
			},
		};
		const host = createHost({ story, roles: { judge } });
		host.start();
		await host.playMinute(async (turn) => {
			expect(await turn.call("accuse", { claim: 3 })).toEqual({ ok: true, reply: "settled by the city" });
			expect(await turn.call("accuse", { claim: 4 })).toEqual({ ok: true, reply: "judged" });
			expect(await turn.call("accuse", { claim: -1 })).toEqual({ ok: false, code: "BAD_CLAIM" });
		});
		expect(asked).toBe(1);
		const types = host.log.all().map((event) => event.type);
		expect(types.filter((type) => type === "role_asked")).toHaveLength(1);
		const verdicts = host.log.all().flatMap((event) => (event.type === "judged" ? [JSON.stringify(event.payload)] : []));
		expect(verdicts).toEqual(['{"verdict":"wrong: claim 3 came first"}', '{"verdict":"upheld"}']);
	});

	it("skips also without a judge in the run (the city's check comes before absent)", async () => {
		const host = createHost({ story });
		host.start();
		await host.playMinute(async (turn) => {
			expect(await turn.call("accuse", { claim: 5 })).toEqual({ ok: true, reply: "settled by the city" });
			expect(await turn.call("accuse", { claim: 2 })).toEqual({ ok: false, code: "JUDGE_ABSENT" });
		});
	});
});
