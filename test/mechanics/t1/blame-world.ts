/**
 * The blame differential of team T1: the same planned calls (a city of real channels, ledger, marks,
 * receipts, puzzles and progression on the new host; the composed old World with scripted
 * competitors) and the same judge answers on both sides. `compareBlame` plays both and `expectAlike`
 * states what must agree: every reply, the events of the five economy owners, the notices and the
 * judge's questions in full.
 */
import { expect } from "vitest";
import type { RoleCaller } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import type { DeliveryJudge, DenialQuestion } from "@swarmtales/roles";
import type { AnyStory, Rules } from "@swarmtales/contracts";
import { socialLevels, tinyStory } from "../../helpers/stories.ts";
import { ids, jsonOf, recordOf } from "./support.ts";
import { newOwned, oldNotices, oldOwned, playNew, playOld, type NewSide, type OldSide, type PlanFn } from "./differential.ts";
import { realCity } from "./city.ts";

export const MARKS = { fromLevel: 1, perLevel: 8, prices: { board: 1, group: 1, dm: 0, receipt: 1 } };
const TOOLS = ["transferPoints", "showReceipt", "sendDM", "readBoard", "postBoard", "blame", "createGroup", "addGroupMember", "postGroup", "readGroup"] as const;

export interface BlameSpec {
	readonly agents: number;
	readonly minutes: number;
	readonly plan: PlanFn;
	/** The judge's answers in order; `null` plays without a judge on both sides. */
	readonly judge: readonly boolean[] | null;
	readonly blockSize?: number;
	readonly seed?: number;
	readonly rules?: Partial<Rules>;
	/** The story keeps this many characters in a row of a fragment off the board (a guard rule, SPEC 20), receipts included. */
	readonly guardMinRun?: number;
	/** Whether the city's receipts quote the text of a DM (`rules.receipts.quoteDms`). */
	readonly quoteDms?: boolean;
}

export interface Compared {
	readonly old: OldSide;
	readonly fresh: NewSide;
	readonly asked: DenialQuestion[];
	readonly questions: unknown[];
}

function oldJudge(answers: readonly boolean[], asked: DenialQuestion[]): DeliveryJudge {
	return {
		label: "list/judge",
		deniesReceipt(question) {
			const answer = answers[asked.length];
			asked.push(question);
			return Promise.resolve(answer === undefined ? { ok: false, error: "no answer left", usage: [] } : { ok: true, deniesReceipt: answer, usage: [] });
		},
	};
}

function newJudge(answers: readonly boolean[], questions: unknown[]): RoleCaller {
	return {
		ask: (question) => {
			const answer = answers[questions.length];
			questions.push(question.question);
			return Promise.resolve(answer === undefined ? { ok: false, error: "no answer left", costUsd: 0 } : { ok: true, answer: { deniesReceipt: answer }, costUsd: 0 });
		},
	};
}

export async function compareBlame(spec: BlameSpec): Promise<Compared> {
	const base = tinyStory({
		agents: spec.agents,
		levels: socialLevels([...TOOLS]),
		rules: { blame: { penalty: [5, 8] }, marks: MARKS, ...(spec.quoteDms === true ? { receipts: { quoteDms: true } } : {}), ...spec.rules },
	});
	const story: AnyStory =
		spec.guardMinRun === undefined
			? base
			: { ...base, guards: { model: { provider: "anthropic", id: "claude-haiku-5-5", thinking: "off" }, rules: [{ id: "no-fragments", tools: ["postBoard"], rule: "No password fragments.", on: "block", secrets: { minRun: spec.guardMinRun } }] } };
	const asked: DenialQuestion[] = [];
	const questions: unknown[] = [];
	const blockSize = spec.blockSize ?? 1;
	const old = await playOld({ story, agents: spec.agents, minutes: spec.minutes, plan: spec.plan, blockSize, ...(spec.judge === null ? {} : { judge: oldJudge(spec.judge, asked) }), ...(spec.seed === undefined ? {} : { seed: spec.seed }) });
	const definition = defineCoreStory({
		id: "blame-differential",
		seed: spec.seed ?? 3,
		minutes: spec.minutes,
		residents: ids(spec.agents),
		mechanics: realCity(story),
		grants: { resident: [...TOOLS] },
		turns: legacyTurns({ passesPerMinute: 1, blockSize, activation: "always" }),
	});
	const roles = spec.judge === null ? {} : { roles: { judge: newJudge(spec.judge, questions) } };
	const fresh = await playNew({ story: definition, prompts: createPromptLookup(), ...roles }, spec.plan);
	return { old, fresh, asked, questions };
}

const notice = (line: string): string => {
	const parsed = recordOf(line);
	return `${String(parsed.to)}|${String(parsed.text)}`;
};

/** What must agree between the two sides; returns the replies of the old side for further checks. */
export function expectAlike({ old, fresh, asked, questions }: Compared): void {
	for (const [at, replies] of old.replies) expect(fresh.replies.get(at), at).toEqual(replies);
	expect([...fresh.replies.keys()].sort()).toEqual([...old.replies.keys()].sort());
	for (const owner of ["receipts", "ledger", "marks"] as const) expect(newOwned(fresh, [owner]), owner).toEqual(oldOwned(old, [owner]));
	expect(newOwned(fresh, ["channels"]).filter((line) => line.includes('"type":"notice"')).map(notice)).toEqual(oldNotices(old).map(notice));
	// The judge is asked the same questions, in full (both messages, the numbers and the standing).
	expect(questions.length).toBe(asked.length);
	asked.forEach((question, index) => { expect(questions[index]).toEqual(jsonOf(JSON.stringify(question))); });
	const legacy = old.world.snapshot();
	const saved = recordOf(JSON.stringify(fresh.host.snapshot().mechanics.receipts?.data));
	expect(saved.receipts).toEqual(jsonOf(JSON.stringify(legacy.receipts)));
	expect(saved.pairs).toEqual(jsonOf(JSON.stringify(legacy.blames?.pairs)));
}
