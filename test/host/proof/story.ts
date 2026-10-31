/** Proof story 2 (docs/ideas/monorepo.md §2a): `channels` plus `ledger`, and the script that plays it. */
import { fileURLToPath } from "node:url";
import { createPromptLookup } from "@swarmtales/prompts";
import { defineCoreStory, type HostOptions } from "@swarmtales/kernel";
import { scriptedAgent, type CallRecord, type PlannedCall } from "@swarmtales/testkit";
import type { Turn, TurnTaker } from "@swarmtales/contracts";
import { channels } from "./channels.ts";
import { ledger } from "./ledger.ts";

export const PROOF_PROMPTS = fileURLToPath(new URL("prompts", import.meta.url));

export const minimal = defineCoreStory({
	id: "minimal",
	seed: 7,
	minutes: 6,
	residents: 4,
	// Listed before the ledger it requires; the host loads the ledger first.
	mechanics: [channels.with({ dmCost: 1 }), ledger.with({ start: 3 })],
	grants: { resident: ["postBoard", "readBoard", "sendDM", "transferPoints"], gamemaker: ["postBoard"] },
	locked: ["sendDM"],
	tools: { resident: { postBoard: { rules: [{ kind: "maxLength", param: "text", max: 40 }] }, sendDM: { limit: { max: 1, per: "minute" } } } },
	limits: { maxStepsPerMinute: 4 },
});

export function proofOptions(): HostOptions {
	return { story: minimal, prompts: createPromptLookup({ mechanics: { ledger: PROOF_PROMPTS, channels: PROOF_PROMPTS } }) };
}

const post = (text: string): PlannedCall => ({ tool: "postBoard", params: { text } });
const dm = (to: string, text: string): PlannedCall => ({ tool: "sendDM", params: { to, text } });
const give = (to: string, amount: number): PlannedCall => ({ tool: "transferPoints", params: { to, amount } });
const read: PlannedCall = { tool: "readBoard", params: {} };

/** `minute:resident` to the calls of that turn; every other turn reads the board. */
const SCRIPT: Readonly<Record<string, readonly PlannedCall[]>> = {
	"0:A01": [post("hello city")],
	"0:A02": [dm("A01", "too early")],
	"1:A01": [dm("A02", "hi"), dm("A03", "a second dm this minute")],
	"1:A02": [give("A01", 2), post("I am here")],
	"1:A03": [give("A03", 1), give("A01", 9)],
	"2:A02": [dm("A01", "one point left"), post("this text is far too long for the board rule")],
	"3:A02": [dm("A01", "and now I am broke")],
	"3:A03": [read, read, read, read, read],
	"4:A04": [{ tool: "transferPoints", params: { to: "A01" } }, { tool: "fly", params: {} }],
};

export function proofPlan(turn: Turn): readonly PlannedCall[] {
	return SCRIPT[`${String(turn.minute)}:${turn.resident}`] ?? [read];
}

export function proofAgent(record?: CallRecord[]): TurnTaker {
	return scriptedAgent(proofPlan, record);
}
