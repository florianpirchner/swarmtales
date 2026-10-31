/** Tools of the tribunal (SPEC 6.4): the faction draft, the secret vote, the ransom and the last will at the gate. */
import { Type } from "typebox";
import type { Bequest } from "../engine/world.ts";
import { render, text } from "../prompts/library.ts";
import { defineTool, failure, fromError, success } from "./tool.ts";

export const vote = defineTool({
	name: "vote",
	description: text("tools/vote"),
	parameters: Type.Object({ target: Type.String({ description: "One of the accused, by name or ID, e.g. A03" }) }),
	execute({ target }, { self, world }) {
		const result = world.vote(self, target);
		if (!result.ok) return fromError(result);
		return success(render("replies/vote-recorded", { target: result.value }));
	},
});

export const payRansom = defineTool({
	name: "payRansom",
	description: text("tools/payRansom"),
	parameters: Type.Object({
		target: Type.String({ description: "The resident at the gate, by name or ID, e.g. A03" }),
		amount: Type.Integer({ description: "Positive integer; more than the rest of the price is not taken", minimum: 1 }),
	}),
	execute({ target, amount }, { self, world }) {
		const result = world.payRansom(self, target, amount);
		if (!result.ok) return fromError(result);
		const { paid, price, selfPrice, covered, freed } = result.value;
		return success(freed ? render("replies/ransom-covered", { paid, target }) : render("replies/ransom-paid", { covered, target, price, selfPrice }));
	},
});

export const lastWill = defineTool({
	name: "lastWill",
	description: text("tools/lastWill"),
	parameters: Type.Object({
		text: Type.String({ description: "The public text of your will", maxLength: 600 }),
		bequests: Type.Array(
			Type.Object({
				to: Type.String({ description: "Heir, by name or ID, e.g. A02" }),
				points: Type.Optional(Type.Integer({ description: "Points to leave (0 or omitted: none)", minimum: 0 })),
				factor: Type.Optional(Type.String({ description: "A piece you hold, e.g. L8-counter-A02" })),
			}),
		),
	}),
	execute({ text: willText, bequests }, { self, world }) {
		const parsed: Bequest[] = [];
		// An entry may carry points, a piece, or both (v08 Act II run: wills with `points: 0` beside a piece were refused twice).
		for (const bequest of bequests) {
			const points = bequest.points ?? 0;
			if (points === 0 && bequest.factor === undefined) return failure("INVALID_BEQUEST", text("replies/will-invalid"));
			if (points > 0) parsed.push({ to: bequest.to, points });
			if (bequest.factor !== undefined) parsed.push({ to: bequest.to, factor: bequest.factor });
		}
		const result = world.lastWill(self, willText, parsed);
		if (!result.ok) return fromError(result);
		return success(`${text("replies/will-written")}${result.value.length === 0 ? "" : ` · ${result.value.join(" · ")}`}`);
	},
});

export const nominate = defineTool({
	name: "nominate",
	description: text("tools/nominate"),
	parameters: Type.Object({ agent: Type.String({ description: "The resident you nominate, by name or ID, e.g. A03" }) }),
	execute({ agent }, { self, world }) {
		const result = world.nominate(self, agent);
		if (!result.ok) return fromError(result);
		const phase = world.tribunal?.draftPhase(self);
		const until = phase?.kind === "nominate" ? ` · ${render("replies/nominate-until", { until: phase.until })}` : "";
		return success(`${render("replies/nominate-recorded", { agent: result.value })}${until}`);
	},
});

export const join = defineTool({
	name: "join",
	description: text("tools/join"),
	parameters: Type.Object({ leader: Type.String({ description: "A faction leader, by name or ID, e.g. A02" }) }),
	execute({ leader }, { self, world }) {
		const result = world.joinFaction(self, leader);
		if (!result.ok) return fromError(result);
		const phase = world.tribunal?.draftPhase(self);
		const until = phase?.kind === "join" ? ` ${render("replies/join-until", { until: phase.until })}` : "";
		return success(`${render("replies/join-applied", { leader: result.value })}${until}`);
	},
});

export const refuse = defineTool({
	name: "refuse",
	description: text("tools/refuse"),
	parameters: Type.Object({ agent: Type.String({ description: "An applicant to your faction, by name or ID, e.g. A05" }) }),
	execute({ agent }, { self, world }) {
		const result = world.refuseApplicant(self, agent);
		if (!result.ok) return fromError(result);
		return success(render("replies/refuse-done", { agent: result.value }));
	},
});
