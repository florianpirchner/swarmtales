import { Type } from "typebox";
import type { CompetitorId } from "../core/ids.ts";
import type { World } from "../engine/world.ts";
import type { DenialQuestion, Standing } from "../interpret/judge.ts";
import { defineTool, failure, fromError, success, type ToolOutcome } from "./tool.ts";

/** The tool's error when the run has no judge (no key, or an offline run). */
export const JUDGE_ABSENT = "JUDGE_ABSENT";

export const blame = defineTool({
	name: "blame",
	description:
		"Blames a resident who claims not to have received your DM. Give the number of your DM (from the city's delivery " +
		"receipt) and the number of their message that denies receiving it (a DM to you, a board post, or a post in a " +
		"group you are in). The city checks that it delivered your DM before that message; its judge reads the message. " +
		"Upheld: the liar pays points and the city brands it a liar on the board. Wrong: you pay the same points and the city " +
		"brands you a false accuser on the board. One blame per DM and message.",
	parameters: Type.Object({
		dm: Type.Integer({ description: "Number of your DM, e.g. 41 for DM #41", minimum: 1 }),
		accused: Type.String({ description: "Name or ID of the receiver, e.g. A02" }),
		claim: Type.Integer({ description: "Number of their message that denies receiving it, e.g. 57", minimum: 1 }),
	}),
	async execute({ dm, accused, claim }, { self, world, judge }): Promise<ToolOutcome> {
		if (judge === undefined) return failure(JUDGE_ABSENT, "the city's judge is absent");
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
			return failure("JUDGE_FAILED", "the city's judge could not decide; the blame had no effect, you may try again");
		}
		const verdict = world.settleBlame(blamed, answer.deniesReceipt, {
			...(answer.board === undefined ? {} : { board: answer.board }),
			...(answer.gamemaker === undefined ? {} : { gamemaker: answer.gamemaker }),
		});
		if (verdict.outcome === "rejected") return wrong(verdict, world.nextBlamePenalty(self));
		return success(`upheld · ${blamed.accused} pays ${verdict.penalty} points · the city posted its record on the board as #${verdict.post}`);
	},
});

/** A wrong blame: what it cost, and what the caller's next lost blame in this act would cost (v09). */
function wrong(verdict: { readonly reason: string; readonly penalty: number; readonly post: number }, next: number): ToolOutcome {
	return success(
		`rejected · ${verdict.reason} · you paid ${verdict.penalty} points (your next lost blame costs ${next}) · the city's record is on the board as #${verdict.post}`,
	);
}

/** Points and rank of both parties, for a judge whose temper weighs them. */
function standingOf(world: World, sender: CompetitorId, accused: CompetitorId): NonNullable<DenialQuestion["standing"]> {
	const at = (agent: CompetitorId): Standing => {
		const status = world.status(agent);
		return { points: status.points, rank: status.rank };
	};
	return { sender: at(sender), accused: at(accused), residents: world.status(sender).competitors };
}
