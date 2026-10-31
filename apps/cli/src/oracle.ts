/** Observer view for `--provider scripted`: competitors that know their solution. */
import type { World } from "@swarmtales/engine";
import type { OracleView } from "@swarmtales/models";

export function worldOracle(world: World): OracleView {
	return {
		solutionFor(agent) {
			if (world.isFinished(agent) || world.waitingAfter(agent) !== undefined) return undefined;
			const level = world.levelOf(agent);
			return { level, code: world.inspect.codeOf(agent, level) };
		},
	};
}
