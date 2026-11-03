/**
 * The app's side of the weaver (`--weaver`, step 18, R1-7 and R3-2): the weaver overseer keeps the
 * inner voices of the running act and each resident's last hard text in its snapshot slice; the app
 * delivers them. Before a resident's step the desk reads the slice (`host.overseerSlice("weaver")`,
 * read-only): a hard text it has not applied rebuilds the resident's system prompt, and the voices
 * it has not handed out yet join the step's inputs once (the old `takeVoices`; a step that loses
 * them gives them back, the old `returnVoices`). The overseer forgets an act's voices when the act
 * ends; the desk then forgets what it handed out of them as well.
 *
 * A run without the weaver keeps who the residents have become (`carried`): their prompts are
 * rebuilt with it, and its own snapshot hands it on (the old `carriedWeaver`).
 */
import { Type } from "typebox";
import { Check } from "typebox/value";
import type { Host, ResidentId } from "@swarmtales/contracts";
import type { InnerVoice } from "@swarmtales/roles";

const AgentText = Type.Object({ agent: Type.String(), text: Type.String() });
const WeaverSlice = Type.Object({ shifts: Type.Array(AgentText), voices: Type.Array(AgentText) }, { additionalProperties: true });

export interface AgentText {
	readonly agent: ResidentId;
	readonly text: string;
}

export interface WeaverDeskState {
	/** The voices of the weaver's act each resident was handed already, in order. */
	readonly heard: readonly AgentText[];
	/** The hard text each resident's prompt shows. */
	readonly shifts: readonly AgentText[];
}

function byAgent(entries: readonly AgentText[]): Map<ResidentId, string[]> {
	const map = new Map<ResidentId, string[]>();
	for (const entry of entries) map.set(entry.agent, [...(map.get(entry.agent) ?? []), entry.text]);
	return map;
}

export class WeaverDesk {
	readonly #host: () => Pick<Host, "overseerSlice">;
	readonly #name: string | undefined;
	readonly #rewrite: (agent: ResidentId, shift: string) => void;
	/** Voices of the act handed out (or given back and waiting), per resident: a prefix of the slice's. */
	readonly #heard: Map<ResidentId, string[]>;
	/** Voices handed out but given back by a lost step, handed out again first. */
	readonly #returned = new Map<ResidentId, string[]>();
	readonly #applied: Map<ResidentId, string>;

	/**
	 * `name` is the weaver overseer's name in the story, or undefined when the run plays without it
	 * (the desk then only carries `state.shifts`).
	 */
	constructor(host: () => Pick<Host, "overseerSlice">, name: string | undefined, rewrite: (agent: ResidentId, shift: string) => void, state: WeaverDeskState = { heard: [], shifts: [] }) {
		this.#host = host;
		this.#name = name;
		this.#rewrite = rewrite;
		this.#heard = byAgent(state.heard);
		this.#applied = new Map(state.shifts.map((entry) => [entry.agent, entry.text]));
	}

	/** Rebuilds the prompts of a resumed run with the hard texts it carries. */
	applyCarried(): void {
		for (const [agent, text] of this.#applied) this.#rewrite(agent, text);
	}

	#slice(): { readonly shifts: Map<ResidentId, string>; readonly voices: Map<ResidentId, string[]> } | undefined {
		if (this.#name === undefined) return undefined;
		const data = this.#host().overseerSlice(this.#name)?.data;
		if (data === undefined || !Check(WeaverSlice, data)) return undefined;
		return { shifts: new Map(data.shifts.map((entry) => [entry.agent, entry.text])), voices: byAgent(data.voices) };
	}

	/** Before `agent`'s step: its new hard text rebuilds its prompt. */
	sync(agent: ResidentId): void {
		const slice = this.#slice();
		const shift = slice?.shifts.get(agent);
		if (shift === undefined || this.#applied.get(agent) === shift) return;
		this.#applied.set(agent, shift);
		this.#rewrite(agent, shift);
	}

	/** The inner voices of `agent`'s next step, for its runner. */
	voice(agent: ResidentId): InnerVoice {
		return {
			take: () => {
				const back = this.#returned.get(agent) ?? [];
				this.#returned.delete(agent);
				const voices = this.#slice()?.voices.get(agent) ?? [];
				const heard = this.#heard.get(agent) ?? [];
				// The act ended: the overseer dropped its voices, and the desk starts over with the next act's.
				const continued = heard.length <= voices.length && heard.every((text, index) => voices[index] === text);
				const fresh = continued ? voices.slice(heard.length) : voices;
				this.#heard.set(agent, [...(continued ? heard : []), ...fresh]);
				return [...(continued ? back : []), ...fresh];
			},
			giveBack: (voices) => {
				if (voices.length === 0) return;
				this.#returned.set(agent, [...voices, ...(this.#returned.get(agent) ?? [])]);
			},
		};
	}

	/** What a snapshot keeps: the voices handed out (given-back ones count as not heard) and the applied hard texts. */
	state(): WeaverDeskState {
		const heard: AgentText[] = [];
		for (const [agent, texts] of this.#heard) {
			const back = this.#returned.get(agent) ?? [];
			for (const text of texts.slice(0, texts.length - back.length)) heard.push({ agent, text });
		}
		return { heard, shifts: [...this.#applied].map(([agent, text]) => ({ agent, text })) };
	}
}
