// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The facts of `standoff` for the gamemaker (old `facts` of `mechanics/standoff/src/index.ts`, D-8): computed when
 * read, through queries of the other mechanics; nothing is cached.
 */
import { Type, type Static } from "typebox";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { TrialRiskService } from "./contract.ts";
import type { StandoffView } from "./head.ts";
import { cityPiecePrice, factBook, heldAll, isExiled } from "./reads.ts";
import { CityPieces, cityPiecesOf, computeStandoffSection, Outstanding, outstandingOf, StandoffSectionFact, Ultimatums, Unused, unusedOf, type SectionReads } from "./situation.ts";

/**
 * The running ultimatums (old `ultimatumsOf`).
 *
 * @param view - The view.
 * @returns The fact's value.
 */
function ultimatumsOf(view: StandoffView): Static<typeof Ultimatums> {
	return view.state.ultimatums.flatMap((entry) => {
		const [a, b] = entry.between;
		if (a === undefined || b === undefined) return [];
		return [{ number: entry.number, between: [a, b], until: entry.until, penalty: entry.penalty }];
	});
}

// What the gamemaker's section reads besides the standoff's book (old `sectionReads`).
function sectionReads(view: StandoffView): SectionReads {
	return {
		minute: view.tick,
		alive: view.tryCall(ExileService, "alive", {}) ?? view.residents.ids,
		standing: (agent) => view.tryCall(ExileService, "standing", { resident: agent }) ?? { kind: "alive" },
		levelOf: (agent) => view.call(ProgressionService, "levelOf", { resident: agent }),
		hasPassed: (agent, level) => view.call(ProgressionService, "hasPassed", { resident: agent, level }),
		isExiled: (agent) => isExiled(view, agent),
		points: (agent) => view.call(LedgerService, "balance", { account: agent }),
		held: (agent) => heldAll(view, agent),
		atRisk: () => view.tryCall(TrialRiskService, "atRisk", {}) ?? null,
		cityPiecePrice: () => cityPiecePrice(view),
	};
}

/**
 * The facts of the standoff, by name.
 *
 * @internal
 */
export const standoffFacts = {
	/** The pieces holders in the city still owe residents before their door. */
	outstanding: { output: Outstanding, compute: (view: StandoffView) => outstandingOf(factBook(view), (agent) => heldAll(view, agent)) },
	/** The pieces the city keeps or seized, who bought each, a seized piece's price. */
	cityPieces: { output: CityPieces, compute: (view: StandoffView) => cityPiecesOf(view.state.city) },
	/** Hand-overs whose needer still stands before the door. */
	unused: { output: Unused, compute: (view: StandoffView) => unusedOf(factBook(view)) },
	/** The running ultimatums. */
	ultimatums: { output: Ultimatums, compute: ultimatumsOf },
	/** What a piece the city keeps costs now. */
	cityPiecePrice: { output: Type.Number({ description: "The points" }), compute: (view: StandoffView) => cityPiecePrice(view) },
	given: { output: Type.Integer({ description: "The hand-overs the city saw" }), compute: (view: StandoffView) => view.state.given.length },
	/** The gamemaker's "Standoffs" and "At risk" lines (old `standoffLines`, `riskLines`). */
	section: {
		output: StandoffSectionFact,
		compute: (view: StandoffView) => {
			const book = factBook(view);
			const inputs = { outstanding: outstandingOf(book, (agent) => heldAll(view, agent)), cityPieces: cityPiecesOf(view.state.city), ultimatums: ultimatumsOf(view), unused: unusedOf(book) };
			return computeStandoffSection(inputs, sectionReads(view));
		},
	},
};
