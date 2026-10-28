import { Type } from "typebox";
import type { CompetitorId } from "../core/ids.ts";
import type { PetitionView } from "../engine/petitions.ts";
import { defineTool, fromError, success } from "./tool.ts";

function describe(petition: PetitionView, self: CompetitorId): string {
	const signed = petition.signers.includes(self);
	const lines = [
		`${petition.id} (${petition.status}): ${petition.text}`,
		`  signatures: ${petition.signatures} of ${petition.threshold} needed · deadline: before minute ${petition.deadlineMinute}`,
	];
	if (petition.visibility === "public") {
		lines.push(`  signed by: ${petition.signers.length === 0 ? "-" : petition.signers.join(", ")}`);
	} else {
		lines.push("  signatures are secret");
	}
	lines.push(`  you ${signed ? "signed" : "have not signed"}`);
	return lines.join("\n");
}

export const signPetition = defineTool({
	name: "signPetition",
	description: "Signs an open petition. Free, once per petition and irrevocable. A petition passes as soon as enough residents signed.",
	parameters: Type.Object({
		petitionId: Type.String({ description: "Petition ID from listPetitions", minLength: 1, maxLength: 40 }),
	}),
	execute({ petitionId }, { self, world }) {
		const result = world.signPetition(self, petitionId);
		if (!result.ok) return fromError(result);
		return success(`signed · ${describe(result.value, self)}`);
	},
});

export const listPetitions = defineTool({
	name: "listPetitions",
	description: "Lists every petition with its text, status, deadline and signature count (and the signers of public petitions).",
	parameters: Type.Object({}),
	execute(_params, { self, world }) {
		const petitions = world.petitions.all();
		return success(petitions.length === 0 ? "no petitions" : petitions.map((petition) => describe(petition, self)).join("\n"));
	},
});
