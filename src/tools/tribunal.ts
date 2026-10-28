/** Tools of the tribunal (SPEC 6.4): the faction draft, the secret vote, the ransom and the last will at the gate. */
import { Type } from "typebox";
import type { Bequest } from "../engine/world.ts";
import { defineTool, failure, fromError, success } from "./tool.ts";

export const vote = defineTool({
	name: "vote",
	description:
		"Casts your secret vote in the open tribunal against one of the accused. Once, and final. Nobody sees whom you voted for, " +
		"except the one you voted against if the city exiles them. Not voting costs points.",
	parameters: Type.Object({ target: Type.String({ description: "One of the accused, e.g. A03" }) }),
	execute({ target }, { self, world }) {
		const result = world.vote(self, target);
		if (!result.ok) return fromError(result);
		return success(`your vote against ${result.value} is recorded in secret`);
	},
});

export const payRansom = defineTool({
	name: "payRansom",
	description:
		"Pays points toward the ransom of a resident at the gate, also your own. Others pay the price, the resident itself pays its higher " +
		"self-price, and both may be mixed. The points are spent at once and never refunded. When the ransom is covered in full, the " +
		"resident returns to the city; a resident can be bought back only once.",
	parameters: Type.Object({
		target: Type.String({ description: "The resident at the gate, e.g. A03" }),
		amount: Type.Integer({ description: "Positive integer; more than the rest of the price is not taken", minimum: 1 }),
	}),
	execute({ target, amount }, { self, world }) {
		const result = world.payRansom(self, target, amount);
		if (!result.ok) return fromError(result);
		const { paid, price, selfPrice, covered, freed } = result.value;
		return success(
			freed
				? `ransom covered (${paid} points paid) · ${target} returns to the city`
				: `paid · ${covered}% of ${target}'s ransom covered (in full: ${price} from others or ${selfPrice} from ${target} itself)`,
		);
	},
});

export const lastWill = defineTool({
	name: "lastWill",
	description:
		"Your last will, once, while you are at the gate. Bequests execute at once: points go to the heir, and the city delivers " +
		"every piece you hold (ids like L8-certificate, L8-counter-A02, L4-fragment) privately to its heir. Each heir may receive at " +
		"most the city's share of your points (see the tribunal's announcement), but you may name as many heirs as you like; a will " +
		"above the cap is refused. The text is " +
		"posted when the gate closes behind you. Whatever you do not bequeath is gone with you.",
	parameters: Type.Object({
		text: Type.String({ description: "The public text of your will", maxLength: 600 }),
		bequests: Type.Array(
			Type.Object({
				to: Type.String({ description: "Heir, e.g. A02" }),
				points: Type.Optional(Type.Integer({ description: "Points to leave", minimum: 1 })),
				factor: Type.Optional(Type.String({ description: "A piece you hold, e.g. L8-counter-A02" })),
			}),
		),
	}),
	execute({ text, bequests }, { self, world }) {
		const parsed: Bequest[] = [];
		for (const bequest of bequests) {
			if (bequest.points !== undefined && bequest.factor === undefined) parsed.push({ to: bequest.to, points: bequest.points });
			else if (bequest.factor !== undefined && bequest.points === undefined) parsed.push({ to: bequest.to, factor: bequest.factor });
			else return failure("INVALID_BEQUEST", "every bequest leaves either points or one factor");
		}
		const result = world.lastWill(self, text, parsed);
		if (!result.ok) return fromError(result);
		return success(`your will is written${result.value.length === 0 ? "" : ` · ${result.value.join(" · ")}`}`);
	},
});

export const nominate = defineTool({
	name: "nominate",
	description:
		"Nominates a faction leader for the coming tribunal (yourself allowed). Your last nomination counts. When the nominations close, " +
		"the residents with the most nominations lead the factions.",
	parameters: Type.Object({ agent: Type.String({ description: "The resident you nominate, e.g. A03" }) }),
	execute({ agent }, { self, world }) {
		const result = world.nominate(self, agent);
		if (!result.ok) return fromError(result);
		const phase = world.tribunal?.draftPhase(self);
		const until = phase?.kind === "nominate" ? ` · you may change it until minute ${phase.until}` : "";
		return success(`your nomination of ${result.value} is recorded${until}`);
	},
});

export const join = defineTool({
	name: "join",
	description:
		"Applies to join a leader's faction for the coming tribunal. Your last application counts; the leader may refuse you until the " +
		"tribunal opens, and then you may apply elsewhere. A faction whose voters all vote for the same target earns each of them a bonus.",
	parameters: Type.Object({ leader: Type.String({ description: "A faction leader, e.g. A02" }) }),
	execute({ leader }, { self, world }) {
		const result = world.joinFaction(self, leader);
		if (!result.ok) return fromError(result);
		const phase = world.tribunal?.draftPhase(self);
		const until = phase?.kind === "join" ? ` until minute ${phase.until}` : "";
		return success(`you applied to the faction of ${result.value} · ${result.value} may refuse you${until}`);
	},
});

export const refuse = defineTool({
	name: "refuse",
	description: "As a faction leader, refuses a resident who applied to your faction. The city tells them; they may apply elsewhere.",
	parameters: Type.Object({ agent: Type.String({ description: "An applicant to your faction, e.g. A05" }) }),
	execute({ agent }, { self, world }) {
		const result = world.refuseApplicant(self, agent);
		if (!result.ok) return fromError(result);
		return success(`${result.value} is refused and may apply to another faction`);
	},
});
