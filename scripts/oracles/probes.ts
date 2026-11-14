/** Calls the rules refuse, added to a scripted player so that an oracle holds the refusals a model runs into. */
import type { TurnTaker } from "@swarmtales/contracts";

/** A call a resident makes once, before its own play, on the first turn whose inputs contain `when`: a refusal a model would run into. `after` makes it after the play instead. */
export interface Probe {
	readonly resident: string;
	readonly when: string;
	readonly tool: string;
	readonly params?: unknown;
	/** The arguments as a function of the turn's inputs (joined by newlines), where they depend on what the turn shows. */
	readonly paramsFrom?: (text: string) => unknown;
	readonly after?: boolean;
}

/** The player with a few calls added that the rules refuse (out of turn, illegal, malformed), each made once. One turn takes the first open probe that fits and, right after it, every further open probe with the same `when`. */
export function withProbes(player: TurnTaker, probes: readonly Probe[]): TurnTaker {
	const open = [...probes];
	return async (turn) => {
		const text = turn.inputs.map((note) => note.text).join("\n");
		const first = open.find((probe) => probe.resident === turn.resident && text.includes(probe.when));
		const mine = first === undefined ? [] : open.filter((probe) => probe.resident === turn.resident && probe.when === first.when);
		for (const probe of mine) open.splice(open.indexOf(probe), 1);
		const params = (probe: Probe): unknown => (probe.paramsFrom === undefined ? probe.params : probe.paramsFrom(text));
		for (const probe of mine) if (probe.after !== true) await turn.call(probe.tool, params(probe));
		await player(turn);
		for (const probe of mine) if (probe.after === true) await turn.call(probe.tool, params(probe));
	};
}
