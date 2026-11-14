/** Calls the rules refuse, added to a scripted player so that an oracle holds the refusals a model runs into. */
import type { TurnTaker } from "@swarmtales/contracts";

/** A call a resident makes once, before its own play, on the first turn whose inputs contain `when`: a refusal a model would run into. */
export interface Probe {
	readonly resident: string;
	readonly when: string;
	readonly tool: string;
	readonly params: unknown;
}

/** The player with a few calls added that the rules refuse (out of turn, illegal, malformed), each made once. */
export function withProbes(player: TurnTaker, probes: readonly Probe[]): TurnTaker {
	const open = [...probes];
	return async (turn) => {
		const text = turn.inputs.map((note) => note.text).join("\n");
		const at = open.findIndex((probe) => probe.resident === turn.resident && text.includes(probe.when));
		if (at >= 0) {
			const [probe] = open.splice(at, 1);
			if (probe !== undefined) await turn.call(probe.tool, probe.params);
		}
		await player(turn);
	};
}
