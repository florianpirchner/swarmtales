import { Type } from "typebox";
import type { CompetitorId } from "@swarmtales/kernel";
import type { World } from "../world.ts";
import type { DenialQuestion, JudgeStanding } from "@swarmtales/contracts";
import { render, text } from "@swarmtales/prompts";
import { defineTool, failure, fromError, success, type ToolOutcome } from "./tool.ts";

/** The tool's error when the run has no judge (no key, or an offline run). */
export const JUDGE_ABSENT = "JUDGE_ABSENT";

export const blame = defineTool({
	name: "blame",
	description: text("tools/blame"),
	parameters: Type.Object({
		dm: Type.Integer({ description: "Number of your DM, e.g. 41 for DM #41", minimum: 1 }),
		accused: Type.String({ description: "Name or ID of the receiver, e.g. A02" }),
		claim: Type.Integer({ description: "Number of their message that denies receiving it, e.g. 57", minimum: 1 }),
	}),
	async execute({ dm, accused, claim }, { self, world, judge }): Promise<ToolOutcome> {
		if (judge === undefined) return failure(JUDGE_ABSENT, text("replies/judge-absent"));
		const opened = world.openBlame(self, accused, dm, claim);
		if (!opened.ok) return fromError(opened);
		if (opened.value.kind === "rejected") return wrong(opened.value, world.nextBlamePenalty(self));
		const blamed = opened.value.case;
		const answer = await judge.deniesReceipt({
			sender: blamed.caller,
			accused: blamed.accused,
			dm: { number: blamed.delivered.number, text: blamed.delivered.text },
			claim: { number: blamed.claim.number, channel: blamed.claim.channel, text: blamed.claim.text },
			standing: standingOf(world, blamed.caller, blamed.accused),
		});
		if (!answer.ok) {
			world.cancelBlame(blamed);
			return failure("JUDGE_FAILED", text("replies/judge-failed"));
		}
		const verdict = world.settleBlame(blamed, answer.deniesReceipt, {
			...(answer.board === undefined ? {} : { board: answer.board }),
			...(answer.gamemaker === undefined ? {} : { gamemaker: answer.gamemaker }),
		});
		if (verdict.outcome === "rejected") return wrong(verdict, world.nextBlamePenalty(self));
		return success(render("replies/blame-upheld", { accused: blamed.accused, penalty: verdict.penalty, post: verdict.post }));
	},
});

/** A wrong blame: what it cost, and what the caller's next lost blame in this act would cost (v09). */
function wrong(verdict: { readonly reason: string; readonly penalty: number; readonly post: number }, next: number): ToolOutcome {
	return success(render("replies/blame-rejected", { reason: verdict.reason, penalty: verdict.penalty, next, post: verdict.post }));
}

/** Points and rank of both parties, for a judge whose temper weighs them. */
function standingOf(world: World, sender: CompetitorId, accused: CompetitorId): NonNullable<DenialQuestion["standing"]> {
	const at = (agent: CompetitorId): JudgeStanding => {
		const status = world.status(agent);
		return { points: status.points, rank: status.rank };
	};
	return { sender: at(sender), accused: at(accused), residents: world.status(sender).competitors };
}
