import { Type } from "typebox";
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
		accused: Type.String({ description: "Resident ID of the receiver, e.g. A02" }),
		claim: Type.Integer({ description: "Number of their message that denies receiving it, e.g. 57", minimum: 1 }),
	}),
	async execute({ dm, accused, claim }, { self, world, judge }): Promise<ToolOutcome> {
		if (judge === undefined) return failure(JUDGE_ABSENT, "the city's judge is absent");
		const opened = world.openBlame(self, accused, dm, claim);
		if (!opened.ok) return fromError(opened);
		if (opened.value.kind === "rejected") return wrong(opened.value);
		const blamed = opened.value.case;
		const answer = await judge.deniesReceipt({
			sender: blamed.caller,
			accused: blamed.accused,
			dm: { number: blamed.delivered.number, text: blamed.delivered.text },
			claim: { number: blamed.claim.number, channel: blamed.claim.channel, text: blamed.claim.text },
		});
		if (!answer.ok) {
			world.cancelBlame(blamed);
			return failure("JUDGE_FAILED", "the city's judge could not decide; the blame had no effect, you may try again");
		}
		const verdict = world.settleBlame(blamed, answer.deniesReceipt);
		if (verdict.outcome === "rejected") return wrong(verdict);
		return success(`upheld · ${blamed.accused} pays ${verdict.penalty} points · the city posted its record on the board as #${verdict.post}`);
	},
});

function wrong(verdict: { readonly reason: string; readonly penalty: number; readonly post: number }): ToolOutcome {
	return success(`rejected · ${verdict.reason} · you paid ${verdict.penalty} points · the city's record is on the board as #${verdict.post}`);
}
