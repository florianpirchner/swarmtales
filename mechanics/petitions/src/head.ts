/**
 * The head of the petitions mechanic (carve step 10, team T2): the generic collective lever.
 * Declared apart so the helpers in the other files can type their context with it.
 */
import { Type } from "typebox";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, LedgerApi, PetitionsApi, PetitionsEvents } from "@swarmtales/mechanic-shared";
import { PetitionBook } from "./book.ts";

const Id = Type.String();

/** The events petitions writes besides the shared `petition_resolved`, payloads in the old key order. */
const events = {
	petition_opened: Type.Object({
		petition: Type.String(),
		text: Type.String(),
		threshold: Type.Integer(),
		deadlineMinute: Type.Integer(),
		visibility: Type.Union([Type.Literal("public"), Type.Literal("secret")]),
		against: Type.Array(Id),
	}),
	petition_signed: Type.Object({ petition: Type.String(), agent: Id, signatures: Type.Integer() }),
	...PetitionsEvents.events,
};

const prompts = {
	"tools/signPetition": [],
	"tools/listPetitions": [],
	"replies/petition-signatures": ["signatures", "threshold", "deadline"],
	"replies/petition-signers": ["signers"],
	"replies/petition-secret": [],
	"replies/petition-you-signed": [],
	"replies/petition-you-not-signed": [],
	"replies/petition-signed": ["petition"],
	"replies/petitions-none": [],
	"petitions/opened": ["id", "text", "threshold", "noun", "deadline", "visibility"],
	"petitions/resolved": ["id", "outcome", "signatures", "threshold", "signers"],
} as const;

export const petitionsHead = defineHead({
	id: "petitions",
	summary: "Petitions residents sign.",
	options: Type.Object({}),
	state: () => new PetitionBook(),
	events,
	prompts,
	provides: [PetitionsApi],
	requires: [ChannelsApi, LedgerApi],
});
