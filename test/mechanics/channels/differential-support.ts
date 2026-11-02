/**
 * Shared pieces of the differential tests of the T2 mechanics: the story of a small city, the
 * planned-call helpers and `compare`, which plays a plan on the old World and on the new host and
 * checks replies, the lines the T2 mechanics (and the economy beside them) wrote and the channels state.
 */
import { expect } from "vitest";
import { defineStory, gamemaker, type RuleInput } from "@swarmtales/sdk";
import type { AnyStory } from "@swarmtales/contracts";
import { ownedBy, type PlannedCall } from "@swarmtales/testkit";
import { castStory, socialLevels, tinyStory } from "../../helpers/stories.ts";
import { writtenBy } from "../t1/support.ts";
import { TOOLS, playNew, playOld, type Spec } from "./differential.ts";
import { newState, oldState } from "./differential-state.ts";

export const MARKS = { fromLevel: 1, perLevel: 2, prices: { board: 1, group: 1, dm: 0, receipt: 1 } };
const OWNERS = ["channels", "cast", "receipts", "ledger", "marks", "petitions"] as const;

export function storyWith(rules: Parameters<typeof tinyStory>[0] extends infer O ? (O extends { rules?: infer R } ? R : never) : never) {
	const base = tinyStory({ agents: 4, levels: socialLevels(TOOLS), rules });
	return defineStory({
		...base,
		cast: { STEWARD: { level: 1 } },
		director: [],
		gamemaker: gamemaker({ model: base.model, brief: "Test.", author: "COURIER", notesPerAgent: 1, boardPosts: 1, windowMinutes: 3 }),
	});
}

export const call = (tool: string, params: Record<string, string | number | boolean> = {}): PlannedCall => ({ tool, params });
export const dm = (target: string, message: string): PlannedCall => call("sendDM", { target, message });
export const group = (tool: string, groupId: string, extra: Record<string, string | number> = {}): PlannedCall => call(tool, { groupId, ...extra });

/** The old runner's schema complaint and the host's `INVALID_ARGUMENTS` are the kernel's wording, not channels': both count as one refusal here. */
const normal = (reply: string): string => (reply.startsWith('true|Validation failed for tool "') ? "true|INVALID_ARGUMENTS" : reply.startsWith("true|INVALID_ARGUMENTS") ? "true|INVALID_ARGUMENTS" : reply);

/** Plays a plan on both sides and compares everything. */
export async function compare(spec: Spec, seen: readonly string[] = [], minGamemaker = 0): Promise<void> {
	const old = await playOld(spec);
	// The plan must have hit what it claims to test: every phrase appears in some reply of the old engine.
	const all = [...old.replies.values()].flat().concat(old.gamemaker).join("\n");
	for (const phrase of seen) expect(all, phrase).toContain(phrase);
	const fresh = await playNew(spec);
	expect([...fresh.replies.keys()].sort()).toEqual([...old.replies.keys()].sort());
	for (const [at, replies] of old.replies) expect(fresh.replies.get(at)?.map(normal), at).toEqual(replies.map(normal));
	expect(fresh.gamemaker.map(normal)).toEqual(old.gamemaker.map(normal));
	expect(old.gamemaker.length).toBeGreaterThanOrEqual(minGamemaker);
	expect(writtenBy(fresh.host.log.all(), OWNERS)).toEqual(ownedBy(old.events, OWNERS));
	expect(newState(fresh.host.snapshot())).toEqual(oldState(old.world.snapshot()));
}


/** A city with a cast member whose escrow pays the lottery's winner, and the director rules of a society test. */
export function societyStory(director: readonly RuleInput<"STEWARD">[], agents = 4): AnyStory {
	const base = castStory({ cast: { STEWARD: { level: 1, escrow: 30 } }, director, levels: socialLevels([...TOOLS, "signPetition", "listPetitions"]), agents, minutes: 10 });
	return { ...base, rules: { ...base.rules, marks: MARKS } };
}

/** The resident tools a society test adds to the channels tools. */
export const SOCIETY_TOOLS = ["signPetition", "listPetitions"] as const;
