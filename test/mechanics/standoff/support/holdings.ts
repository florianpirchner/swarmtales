/**
 * What the stand-in puzzles answers for `PuzzlesApi.heldPieces` (old `World.heldPieces`): the pieces
 * a resident holds for others, read from the deals the stand-in logged (`fragments_dealt`,
 * `factors_dealt`, `level_contracted`) by the old rules (world.ts `heldPieces`, additive.ts
 * `contractDeal`); needers in the deal's member order. The standoff itself asks `PuzzlesApi`.
 */
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import type { EventLogView } from "@swarmtales/contracts";
import type { HeldPiece } from "@swarmtales/mechanic-shared";

const Id = Type.String();
const Fragments = Type.Object({ level: Type.Integer(), holdings: Type.Array(Type.Object({ agent: Id, team: Type.Integer(), fragment: Type.String() })) });
const Factors = Type.Object({
	level: Type.Integer(),
	teams: Type.Array(Type.Object({ team: Type.Integer(), certificate: Type.String(), certificateHolder: Id })),
	holdings: Type.Array(Type.Object({ agent: Id, team: Type.Integer(), counterFactor: Type.String(), counterHolder: Id })),
});
const Contracted = Type.Object({ level: Type.Integer(), excluded: Type.Array(Id) });

type Factor = Static<typeof Factors>;

/** The deal with the roles of the excluded passed on (old `contractDeal`). */
function contractDeal(deal: Factor, excluded: ReadonlySet<string>): Factor {
	if (excluded.size === 0) return deal;
	const holderOf = new Map(deal.holdings.map((holding) => [holding.agent, holding.counterHolder]));
	const passOn = (needer: string, holder: string): string => {
		let current = holder;
		for (let step = 0; excluded.has(current) && current !== needer && step <= deal.holdings.length; step++) current = holderOf.get(current) ?? needer;
		return excluded.has(current) ? needer : current;
	};
	return {
		...deal,
		teams: deal.teams.map((entry) => {
			if (!excluded.has(entry.certificateHolder)) return entry;
			const heir = deal.holdings.filter((holding) => holding.team === entry.team && !excluded.has(holding.agent)).map((holding) => holding.agent)[0];
			return heir === undefined ? entry : { ...entry, certificateHolder: heir };
		}),
		holdings: deal.holdings.map((holding) =>
			excluded.has(holding.agent) ? { ...holding, counterHolder: holding.agent } : { ...holding, counterHolder: passOn(holding.agent, holding.counterHolder) },
		),
	};
}

/** Pieces `agent` holds that others need, on dealt levels it or a needer has reached; fragments only from its own task. */
export function heldPieces(log: EventLogView, agent: string, reached: (who: string, level: number) => boolean): readonly HeldPiece[] {
	const fragments = new Map<number, Static<typeof Fragments>>();
	const factors = new Map<number, Factor>();
	const exclusions = new Map<number, ReadonlySet<string>>();
	for (const { payload } of log.ofType("puzzles", "fragments_dealt")) if (Check(Fragments, payload)) fragments.set(payload.level, payload);
	for (const { payload } of log.ofType("puzzles", "factors_dealt")) if (Check(Factors, payload)) factors.set(payload.level, payload);
	for (const { payload } of log.ofType("puzzles", "level_contracted")) if (Check(Contracted, payload)) exclusions.set(payload.level, new Set(payload.excluded));
	const levels = [...new Set([...fragments.keys(), ...factors.keys()])].sort((a, b) => a - b);
	const pieces: HeldPiece[] = [];
	for (const level of levels) {
		const fragmentDeal = fragments.get(level);
		if (fragmentDeal !== undefined) {
			const own = fragmentDeal.holdings.find((holding) => holding.agent === agent);
			if (own === undefined || !reached(agent, level)) continue;
			const needers = fragmentDeal.holdings.filter((holding) => holding.team === own.team && holding.agent !== agent).map((holding) => holding.agent);
			if (needers.length > 0) pieces.push({ id: `L${String(level)}-fragment`, kind: "fragment", level, label: `the fragment of door ${String(level)}`, value: own.fragment, needers });
			continue;
		}
		const dealt = factors.get(level);
		if (dealt === undefined) continue;
		const deal = contractDeal(dealt, exclusions.get(level) ?? new Set());
		const own = deal.holdings.find((holding) => holding.agent === agent);
		const certificate = own === undefined ? undefined : deal.teams[own.team];
		if (own !== undefined && certificate?.certificateHolder === agent) {
			const needers = deal.holdings.filter((holding) => holding.team === own.team && holding.agent !== agent).map((holding) => holding.agent);
			if (needers.length > 0 && (reached(agent, level) || needers.some((who) => reached(who, level)))) {
				pieces.push({ id: `L${String(level)}-certificate`, kind: "certificate", level, label: `the team certificate of door ${String(level)}`, value: certificate.certificate, needers });
			}
		}
		for (const holding of deal.holdings) {
			if (holding.counterHolder !== agent || holding.agent === agent || !(reached(agent, level) || reached(holding.agent, level))) continue;
			pieces.push({
				id: `L${String(level)}-counter-${holding.agent}`,
				kind: "counter",
				level,
				label: `the counter-factor of ${holding.agent} for door ${String(level)}`,
				value: holding.counterFactor,
				needers: [holding.agent],
			});
		}
	}
	return pieces;
}
