/** Observer view for `--provider scripted`: competitors that know their solution. */
import { Type } from "typebox";
import { Check } from "typebox/value";
import type { Host } from "@swarmtales/contracts";
import type { World } from "@swarmtales/engine";
import type { OracleView } from "@swarmtales/models";
import { solutionsFrom } from "@swarmtales/mechanic-puzzles";

export function worldOracle(world: World): OracleView {
	return {
		solutionFor(agent) {
			if (world.isFinished(agent) || world.waitingAfter(agent) !== undefined) return undefined;
			const level = world.levelOf(agent);
			return { level, code: world.inspect.codeOf(agent, level) };
		},
	};
}

const Ranking = Type.Object(
	{
		ranking: Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer(), finished: Type.Boolean(), waiting: Type.Union([Type.Integer(), Type.Null()]) }, { additionalProperties: true })),
	},
	{ additionalProperties: true },
);

/** The same view on the new host: progression's section tells the level, puzzles' solutions the code. */
export function hostOracle(host: Pick<Host, "fact">): OracleView {
	return {
		solutionFor(agent) {
			const section = host.fact("progression.section");
			if (!Check(Ranking, section)) return undefined;
			const entry = section.ranking.find((row) => row.agent === agent);
			if (entry === undefined || entry.finished || entry.waiting !== null) return undefined;
			const code = solutionsFrom(host.fact("puzzles.solutions")).find((row) => row.agent === agent && row.level === entry.level)?.code;
			return code === undefined || code === null ? undefined : { level: entry.level, code };
		},
	};
}
