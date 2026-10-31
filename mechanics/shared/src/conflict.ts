/**
 * The APIs of team T4 (conflict): standoff, exile, tribunal, seal, standoff-tribunal. FROZEN in wave
 * 3.0; a change goes through the integration owner (docs/design/carve-plan.md, "Shared files").
 * These five use each other; optional edges are `uses` (ctx.has, ctx.tryCall), see each summary.
 */
import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";
import { command, query } from "./method.ts";
import { Done, HeldPiece, OfResident, ResidentId, Standing } from "./schemas.ts";

/** Pieces and ultimatums (step 11). Channels `uses` it: every post and DM goes through `noteText`. */
export const StandoffApi = defineApi({
	name: "standoff",
	summary: "Pieces residents hold for others, the city's kept pieces and ultimatums.",
	methods: {
		heldPieces: query("Old `heldPieces`.", OfResident, Type.Array(HeldPiece)),
		keep: command("The city keeps an exiled holder's pieces and sells them to their needers (old `#standoff.keep`); writes `piece_kept`.", Type.Object({ from: ResidentId, pieces: Type.Array(HeldPiece) }), Type.Null()),
		noteText: command("A text the author sent to `readers` (old `#standoff.noteText`): a piece handed over in it counts as given; writes `piece_given`.", Type.Object({ author: ResidentId, readers: Type.Array(ResidentId), text: Type.String() }), Type.Null()),
		noteGiven: command("A last will handed `piece` to `to` (old `#standoff.noteGiven`): it counts as given; writes `piece_given` (T4 request R2).", Type.Object({ from: ResidentId, to: ResidentId, piece: HeldPiece }), Type.Null()),
		cityPiecePrice: query("Old `cityPiecePrice`.", Type.Object({}), Type.Number()),
	},
});

/** The gate, ransom, last will and exile (step 12). Seal, goals and standoff-tribunal are told through `uses`. */
export const ExileApi = defineApi({
	name: "exile",
	summary: "Who stands at the gate or is gone, and what an exile does.",
	methods: {
		isExiled: query("Old `isExiled`: exiled by the tribunal, struck by the seal or the holdout tribunal.", OfResident, Type.Boolean()),
		standing: query("Old `standingOf`.", OfResident, Standing),
		alive: query("Every resident still in the city, in the story's order (old `alive`).", Type.Object({}), Type.Array(ResidentId)),
		exiledBy: query(
			"Who exiled the resident: the tribunal's gate, the seal or the holdout tribunal, or null while in the city or at the gate. The tribunal's ransom register leaves out all but `holdout` (old `Tribunal#exiled`).",
			OfResident,
			Type.Union([Type.Literal("tribunal"), Type.Literal("seal"), Type.Literal("holdout"), Type.Null()]),
		),
		toGate: command(
			"The tribunal sends a resident to the gate (old `Tribunal#exile` gates); writes `exile_gate` with these fields, notifies the resident; the gate closes at `until` (T4 request R4).",
			Type.Object({
				resident: ResidentId,
				until: Type.Integer(),
				ransomable: Type.Boolean(),
				voters: Type.Array(ResidentId),
				price: Type.Number(),
				selfPrice: Type.Number(),
			}),
			Type.Null(),
		),
		strike: command(
			"Strikes a resident for good without gate, will or ransom (old seal `strike`, holdout `#onStruck`); writes `exiled` with `by`.",
			Type.Object({ resident: ResidentId, by: Type.Union([Type.Literal("seal"), Type.Literal("holdout")]) }),
			Done,
		),
	},
});

/** Votes and factions (step 13). Seal needs how many exiles are still missing. */
export const TribunalApi = defineApi({
	name: "tribunal",
	summary: "Tribunal sessions, votes and faction drafts.",
	methods: {
		missing: query("Residents the tribunal still has to exile; the seal is refused at 0 (old `SealPorts.missing`).", Type.Object({}), Type.Integer()),
		inSession: query("Whether a tribunal session is open now.", Type.Object({}), Type.Boolean()),
		ransomPrices: query(
			"The ransom an exiled resident's gate would cost now (old `ransomPrices`, the tribunal's spec): the city's median price and the resident's own; standoff reads `price` for the city's kept pieces (old `cityPiecePrice`).",
			Type.Object({}),
			Type.Object({ price: Type.Number(), selfPrice: Type.Number() }),
		),
	},
});

/** The black seal (step 10, after exile and tribunal). Exile tells it of every exile through `uses`. */
export const SealApi = defineApi({
	name: "seal",
	summary: "The black seal auction.",
	methods: {
		onExiled: command("A resident left: a seal it bore is gone (old `seal.onExiled`); writes `seal_expired` when it held one.", OfResident, Type.Null()),
	},
});

/** The holdout tribunal (step 14). Channels `uses` it for the DM cap's exemption. */
export const StandoffTribunalApi = defineApi({
	name: "standoff-tribunal",
	summary: "The holdout tribunal over a resident who keeps a fragment back.",
	methods: {
		exemptFromCap: query("The accused may always write to those who lack its fragment (old `holdout.exemptFromCap`).", Type.Object({ from: ResidentId, to: ResidentId }), Type.Boolean()),
		taskLine: query(
			"The holdout rule under every door's task (old `#withHoldoutRule`), or null; progression appends it between the names line and the marks line (D-3, round 2 R2-D10).",
			OfResident,
			Type.Union([Type.String(), Type.Null()]),
		),
	},
});
