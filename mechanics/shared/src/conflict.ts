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

/** A gate as the tribunal and the gamemaker see it (old `GateView`, tribunal.ts; round 3, R2-D18). */
const GateView = Type.Object({
	agent: ResidentId,
	since: Type.Integer(),
	until: Type.Integer(),
	ransomable: Type.Boolean(),
	price: Type.Number(),
	selfPrice: Type.Number(),
	paid: Type.Number(),
	covered: Type.Integer(),
	willDone: Type.Boolean(),
});

/** The tribunal's texts the exile writes (round 3, R2-D18). */
const ExileTextKey = Type.Union([Type.Literal("gateNotice"), Type.Literal("gateNoticeFinal"), Type.Literal("ransomed"), Type.Literal("exiled"), Type.Literal("will")]);

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
		gates: query("Every gate in the order it opened (old `Tribunal.gates()`; round 3, R2-D18).", Type.Object({}), Type.Array(GateView)),
		exiled: query(
			"Who left through the gate or by the seal, in the order they left (old `Tribunal#exiled`); the holdout's struck are not in it (round 3, R2-D18).",
			Type.Object({}),
			Type.Array(ResidentId),
		),
		ransomed: query("Whether the resident was bought back from the gate once (old `Tribunal#ransomed`): a second gate takes no ransom (round 3, R2-D18).", OfResident, Type.Boolean()),
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
		text: query(
			"One of the story's tribunal texts the exile writes, rendered with the rule values and `values` (old `Tribunal#text`; round 3, R2-D18).",
			Type.Object({ key: ExileTextKey, values: Type.Record(Type.String(), Type.String()) }),
			Type.String(),
		),
		bequestPerHeir: query("The share of its points a resident at the gate may leave each heir (`tribunal.bequestPerHeir`; round 3, R2-D18).", Type.Object({}), Type.Number()),
	},
});

/** Old `SchedulingWindow` (round 3, R2-D18). */
const SchedulingWindow = Type.Union([
	Type.Object({ open: Type.Literal(false), why: Type.String() }),
	Type.Object({
		open: Type.Literal(true),
		earliest: Type.Integer({ description: "Earliest opening minute." }),
		latestFinal: Type.Integer({ description: "Latest opening of a tribunal that exiles everything still missing." }),
		latestWithRoom: Type.Optional(Type.Integer({ description: "Latest opening that leaves room for one more tribunal after it." })),
		missing: Type.Integer({ description: "Residents still to exile: the most one tribunal may take." }),
		maxFactions: Type.Integer({ description: "Factions allowed: 2 up to this; 0 when the tribunal has no draft." }),
	}),
]);

/**
 * The gamemaker's view of the tribunal and what the run's stop rule reads (old `schedulingWindow`,
 * `cityCall`, `atRisk` and the arena's `#stopReason`), provided by the tribunal (round 3, R2-D18).
 */
export const TribunalViewApi = defineApi({
	name: "tribunal-view",
	summary: "The tribunal's guard rails and foresight for the gamemaker's view.",
	methods: {
		schedulingWindow: query("Whether `scheduleTribunal` is open now, and its bounds (old `schedulingWindow`).", Type.Object({}), SchedulingWindow),
		cityCall: query(
			"When the city calls a tribunal itself if nobody plans one, or null (old `cityCall`).",
			Type.Object({}),
			Type.Union([Type.Object({ calledAt: Type.Integer(), opens: Type.Integer() }), Type.Null()]),
		),
		stop: query(
			"What the run's stop rule reads (old arena `#stopReason`): the end reason once the target is reached and the last gate closed, whether a tribunal is under way, and whether the city still pursues its target.",
			Type.Object({}),
			Type.Object({ endReason: Type.Union([Type.String(), Type.Null()]), busy: Type.Boolean(), pursuing: Type.Boolean() }),
		),
		atRisk: query(
			"Who stands trial: the open session's accused, or those with the fewest points if the planned tribunal opened now, or null (old `atRisk`).",
			Type.Object({}),
			Type.Union([Type.Object({ opens: Type.Integer(), now: Type.Boolean(), accused: Type.Array(ResidentId) }), Type.Null()]),
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
