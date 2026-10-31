import { Type } from "typebox";
import type { CompetitorId } from "../core/ids.ts";
import type { PetitionView } from "../engine/petitions.ts";
import { render, text } from "../prompts/library.ts";
import { defineTool, fromError, success } from "./tool.ts";

function describe(petition: PetitionView, self: CompetitorId): string {
	const signed = petition.signers.includes(self);
	const lines = [
		`${petition.id} (${petition.status}): ${petition.text}`,
		`  ${render("replies/petition-signatures", { signatures: petition.signatures, threshold: petition.threshold, deadline: petition.deadlineMinute })}`,
	];
	if (petition.visibility === "public") {
		lines.push(`  ${render("replies/petition-signers", { signers: petition.signers.length === 0 ? "-" : petition.signers.join(", ") })}`);
	} else {
		lines.push(`  ${text("replies/petition-secret")}`);
	}
	lines.push(`  ${text(signed ? "replies/petition-you-signed" : "replies/petition-you-not-signed")}`);
	return lines.join("\n");
}

export const signPetition = defineTool({
	name: "signPetition",
	description: text("tools/signPetition"),
	parameters: Type.Object({
		petitionId: Type.String({ description: "Petition ID from listPetitions", minLength: 1, maxLength: 40 }),
	}),
	execute({ petitionId }, { self, world }) {
		const result = world.signPetition(self, petitionId);
		if (!result.ok) return fromError(result);
		return success(render("replies/petition-signed", { petition: describe(result.value, self) }));
	},
});

export const listPetitions = defineTool({
	name: "listPetitions",
	description: text("tools/listPetitions"),
	parameters: Type.Object({}),
	execute(_params, { self, world }) {
		const petitions = world.petitions.all();
		return success(petitions.length === 0 ? text("replies/petitions-none") : petitions.map((petition) => describe(petition, self)).join("\n"));
	},
});
