/**
 * Conformance and fail-open of the carved overseers (docs/design/overseer-api.md §1.3, §6 step 8):
 * every option is documented, the prompts they declare exist with the variables they declare, the
 * limits cut calls without ending the run, and the input prompts render to the old bytes when no
 * standing order is active and to the old bytes plus the orders when one is.
 */
import { describe, expect, it } from "vitest";
import { createPromptLookup, validatePrompts } from "@swarmtales/prompts";
import { overseers } from "@swarmtales/roles";
import { checkOptionsDocumented, scriptedOverseer } from "@swarmtales/testkit";
import { flat, playNew, type Input } from "./harness.ts";

const dm = (minute: number, text: string): Input => ({ minute, type: "dm_sent", fields: { from: "A01", to: "A02", text, number: minute } });

describe("the carved overseers conform", () => {
	it("document every option", () => {
		for (const definition of [overseers.classifierOverseer, overseers.weaverOverseer, overseers.judgeFor("fair"), overseers.judgeFor("partial"), overseers.judgeFor("capricious")]) {
			expect(checkOptionsDocumented(definition)).toEqual([]);
		}
	});

	it("declare prompts that exist with exactly the variables they declare, and the registry agrees with the files", () => {
		expect(validatePrompts()).toEqual([]);
		const lookup = createPromptLookup();
		for (const definition of [overseers.classifierOverseer, overseers.weaverOverseer, overseers.judgeFor("fair"), overseers.judgeFor("partial"), overseers.judgeFor("capricious")]) {
			for (const [id, variables] of Object.entries(definition.prompts)) {
				expect(() => lookup.render(definition.id, id, Object.fromEntries(variables.map((name) => [name, "x"])), variables), `${definition.id} ${id}`).not.toThrow();
			}
		}
	});

	it("render their input prompts as the old text followed by the standing orders, nothing when there are none", () => {
		const lookup = createPromptLookup();
		for (const [owner, id, variable] of [["judge", "judge/input", "question"], ["classifier", "classifier/input", "batch"], ["weaver", "weaver/input", "dossier"]] as const) {
			expect(lookup.render(owner, id, { [variable]: "BODY", standingOrders: "" }, [variable, "standingOrders"])).toBe("BODY");
			expect(lookup.render(owner, id, { [variable]: "BODY", standingOrders: "\n\nORDERS" }, [variable, "standingOrders"])).toBe("BODY\n\nORDERS");
		}
	});

	it("name the answer tools of the old roles", () => {
		expect(overseers.judgeFor("fair").answer).toEqual({ tool: "verdict", description: "judge/tool-verdict" });
		expect(overseers.classifierOverseer.answer).toEqual({ tool: "label", description: "classifier/tool-label" });
		expect(overseers.weaverOverseer.answer).toEqual({ tool: "weave", description: "weaver/tool-weave" });
		expect(overseers.classifierOverseer.model).toEqual({ slot: "classifier" });
		expect(overseers.weaverOverseer.model).toEqual({ slot: "weaver" });
		expect(overseers.judgeFor("fair").model).toEqual({ slot: "classifier" });
	});
});

describe("the classifier fails open under a call limit", () => {
	it("skips what is over the limit, keeps the run going and labels what it was allowed to ask", async () => {
		const inputs: Input[] = [dm(0, "first"), dm(1, "second"), dm(2, "third")];
		const runtime = scriptedOverseer({ classifier: (call) => ({ answer: { items: [{ ref: Number(/^#(\d+) /m.exec(call.input.split("\n").slice(-1).join("\n"))?.[1] ?? 0), labels: ["promise"] }] } }) });
		const run = await playNew({ inputs, minutes: 3, residents: 2, runtime, overseers: [overseers.classifierOverseer.as("classifier", { label: "t", limits: { maxCalls: 2 } })] });
		expect(run.host.log.all().some((event) => event.type === "run_ended")).toBe(true);
		expect(runtime.asked).toHaveLength(2);
		expect(run.events.filter((event) => event.type === "overseer_skipped").map((event) => event.payload)).toEqual([{ overseer: "classifier", reason: "maxCalls" }]);
		expect(flat(run.events, "classifier").filter((event) => event.type === "interpretation")).toHaveLength(2);
	});
});
