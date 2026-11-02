/**
 * The weaver (`--weaver`, docs/ideas/fate.md) as an overseer (docs/design/overseer-api.md §1.5):
 * lets residents' characters change during a run. A short overseer in the `between` slot, after the
 * classifier (whose labels it reads from the log) and before the gamemaker (who reads a line for
 * every change). It replaces the old `Weaver` and its chat model.
 *
 * Two firings per minute keep the old order of work: the **acts** firing (a schedule trigger every
 * minute) writes the end of every act that is over, one call per resident that changed in it; then
 * the **hits** firing (the `between` hook) reads the log since its last look, lets code name the
 * residents a hard fact touched ({@link FateTriggers}) and asks about each of them, one call each.
 *
 * - `soft`: an inner voice, once, at the end of the resident's next step's inputs;
 * - `hard`: who the story has made of the resident; the character part of its system prompt is
 *   rebuilt with it (the app reads the `fate_shift` events for both);
 * - `none`, or an answer that does not parse: nothing changes (fail open: the body's fallback is
 *   `none`).
 *
 * Per resident and act at most {@link MAX_SOFT} soft and {@link MAX_HARD} hard changes: a hard one
 * beyond its cap becomes soft while soft ones are left, anything beyond both is dropped. When an
 * act is over, every resident still in the city that changed in it gets one text for the next act
 * (`act`); the act's inner voices not heard yet are dropped. Every change is a `fate_shift` event.
 * The state (caps, hard texts, voices, pending hits) is the overseer's snapshot slice, so a
 * resumed run builds the same prompts.
 */
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import { defineOverseer } from "@swarmtales/kernel";
import { FATE_TRIGGER_NAMES, FateHitSchema, FateTriggers, HIT_PROMPTS, type FateHit, type FateTrigger } from "./fate.ts";
import { OVERSEER_ORDER } from "./order.ts";

/** Inner voices per resident and act. */
const MAX_SOFT = 6;
/** Rewrites of the character per resident and act (the act's end does not count). */
const MAX_HARD = 2;
/** Characters of the weaver's text (about three short sentences); a longer one is cut in code, not refused. */
const TEXT_MAX = 600;
/** Characters of the weaver's reason (for the run's record, never the gamemaker); a longer one is cut in code. */
const REASON_MAX = 200;

/** No length limits here: a schema limit would throw a whole answer away; {@link clip} cuts it instead. */
const Weave = Type.Object({
	kind: Type.Union([Type.Literal("none"), Type.Literal("soft"), Type.Literal("hard")], {
		description: "none: nothing changes; soft: an inner voice heard once; hard: who the resident is from now on",
	}),
	text: Type.String({ description: "To the resident, in the second person, at most three short sentences; empty for none" }),
	reason: Type.String({ description: "Why, in at most twelve words, citing what happened (#seq)" }),
});
type Weave = Static<typeof Weave>;

const Events = {
	fate_shift: Type.Object({
		agent: Type.String(),
		kind: Type.Union([Type.Literal("soft"), Type.Literal("hard"), Type.Literal("act")]),
		text: Type.String(),
		reason: Type.String(),
		evidence: Type.Array(Type.Integer()),
		triggers: Type.Array(Type.Enum(FATE_TRIGGER_NAMES)),
	}),
};

/** A change of one resident in an act that is still running. */
const PatchSchema = Type.Object({
	agent: Type.String(),
	/** The first level of the act it belongs to. */
	act: Type.Integer(),
	kind: Type.Union([Type.Literal("soft"), Type.Literal("hard")]),
	text: Type.String(),
	minute: Type.Integer(),
	/** The `seq` of its `fate_shift` event. */
	seq: Type.Integer(),
});
type Patch = Static<typeof PatchSchema>;

const AgentText = Type.Object({ agent: Type.String(), text: Type.String() });

/** What the weaver carries over a run snapshot (SPEC 17), plus the log position it has read to. */
const Slice = Type.Object({
	cursor: Type.Integer(),
	/** Residents touched since the last look, not asked about yet. */
	pending: Type.Array(FateHitSchema),
	patches: Type.Array(PatchSchema),
	/** Each resident's last hard text, as its prompt shows it. */
	shifts: Type.Array(AgentText),
	/** Inner voices its next step has not heard yet. */
	voices: Type.Array(AgentText),
	/** Acts whose end the weaver has written. */
	closed: Type.Array(Type.Integer()),
});

/** What a call was asked about, kept until its answer settles (a call's index is its place here). */
type Asked =
	| { readonly kind: "act"; readonly agent: string; readonly act: number; readonly own: readonly Patch[] }
	| { readonly kind: "hits"; readonly agent: string; readonly act: number; readonly hits: readonly FateHit[] };

interface State {
	/** The last log seq whose hits are already in `pending` (the prefix of a resumed run is only observed). */
	cursor: number;
	/** The last log seq passed through `triggers.observe`. */
	observed: number;
	triggers: FateTriggers | undefined;
	pending: FateHit[];
	patches: Patch[];
	readonly shifts: Map<string, string>;
	readonly voices: Map<string, string[]>;
	readonly closed: Set<number>;
	asked: readonly Asked[];
}

const PROMPTS = {
	...HIT_PROMPTS,
	"weaver/system": [],
	"weaver/input": ["dossier", "standingOrders"],
	"weaver/tool-weave": [],
	"weaver/inner-voice": ["text"],
	"weaver/resident": ["resident", "minute"],
	"weaver/character-heading": [],
	"weaver/character-none": [],
	"weaver/shift-heading": [],
	"weaver/patches-heading": [],
	"weaver/patches-none": [],
	"weaver/patch-soft": ["minute", "text"],
	"weaver/patch-hard": ["minute", "text"],
	"weaver/act-end": ["title", "resident"],
	"weaver/events-heading": ["resident"],
	"weaver/question-hard-one": ["resident"],
	"weaver/question-hard": ["resident", "left"],
	"weaver/question-soft": ["resident"],
} as const;

const ExiledEvent = Type.Object({ agent: Type.String() });
const ActFact = Type.Object({ fromLevel: Type.Integer() });

function emptyState(): State {
	return { cursor: 0, observed: 0, triggers: undefined, pending: [], patches: [], shifts: new Map(), voices: new Map(), closed: new Set(), asked: [] };
}

/** `text` trimmed and cut to at most `max` characters, at a word's end where there is one, marked with " ...". */
function clip(text: string, max: number): string {
	const trimmed = text.trim();
	if (trimmed.length <= max) return trimmed;
	const head = trimmed.slice(0, max - 4);
	const space = head.lastIndexOf(" ");
	return `${(space > 0 ? head.slice(0, space) : head).trimEnd()} ...`;
}

/** The answer's weave when it can change anything: parsed, with a text for a change. */
function usable(weave: Weave): Weave | undefined {
	return weave.kind !== "none" && weave.text.trim().length === 0 ? undefined : { kind: weave.kind, text: clip(weave.text, TEXT_MAX), reason: clip(weave.reason, REASON_MAX) };
}

export const weaverOverseer = defineOverseer(
	{
		id: "weaver",
		summary: "Lets residents' characters change after events that touch them: an inner voice, a rewrite, a new text for the next act.",
		options: Type.Object({
			characters: Type.Record(Type.String(), Type.String(), { default: {}, description: "The character part of each resident's prompt without any change (its core motive in prose, or its persona), by resident id; the app fills it" }),
			acts: Type.Array(Type.Object({ fromLevel: Type.Integer({ description: "The first level of the act" }), title: Type.String({ description: "The act's title, e.g. Act II" }) }), {
				default: [],
				description: "The story's acts, for the act-end question; an act without a title reads as 'The act from level n'",
			}),
			startLevel: Type.Integer({ default: 1, description: "The first level of the run; the act running before any act has begun" }),
		}),
		state: emptyState,
		events: Events,
		prompts: PROMPTS,
		system: "weaver/system",
		input: "weaver/input",
		output: Weave,
		answer: { tool: "weave", description: "weaver/tool-weave" },
		model: { slot: "weaver" },
		lifetime: "short",
		triggers: [
			// The acts firing: every minute, before the hits firing (the old `closeActs`, then the touched residents).
			{ schedule: { every: 1 }, order: OVERSEER_ORDER.weaver },
			{ hook: "between", order: OVERSEER_ORDER.weaver + 1 },
		],
	},
	(kit) => ({
		calls(fired, ctx) {
			const state = ctx.state;
			const residents = ctx.residents.ids;
			const events = ctx.log.all();
			// Exile is final: whoever an `exiled` event names (the exile, the seal and the holdout write it) is out of the city.
			const exiled = (): ReadonlySet<string> => new Set(events.flatMap((event) => (event.type === "exiled" && Check(ExiledEvent, event.payload) ? [event.payload.agent] : [])));
			const actEnded = (fromLevel: number): boolean => events.some((event) => event.type === "act_ended" && Check(ActFact, event.payload) && event.payload.fromLevel === fromLevel);
			const currentAct = (): number =>
				events.reduce((act, event) => (event.type === "act_started" && Check(ActFact, event.payload) ? Math.max(act, event.payload.fromLevel) : act), ctx.options.startLevel);
			const shiftOf = (agent: string): string | undefined => state.shifts.get(agent);
			const characterOf = (agent: string): string => ctx.options.characters[agent] ?? "";
			const quote = (value: string): string => JSON.stringify(value);

			/** The dossier of one resident (the old `weaverPrompt`). */
			const dossier = (agent: string, patches: readonly Patch[], hits: readonly FateHit[], actEnd: number | undefined): string => {
				const resident = ctx.display(agent);
				const character = ctx.display(characterOf(agent)).trim();
				const shift = shiftOf(agent);
				const patchLines =
					patches.length === 0
						? [ctx.prompt("weaver/patches-none", {})]
						: patches.map((patch) => ctx.prompt(patch.kind === "soft" ? "weaver/patch-soft" : "weaver/patch-hard", { minute: patch.minute, text: quote(patch.text) }));
				const head = [
					ctx.prompt("weaver/resident", { resident, minute: ctx.minute }),
					"",
					ctx.prompt("weaver/character-heading", {}),
					character.length === 0 ? ctx.prompt("weaver/character-none", {}) : character,
					...(shift === undefined ? [] : ["", ctx.prompt("weaver/shift-heading", {}), shift]),
					"",
					ctx.prompt("weaver/patches-heading", {}),
					...patchLines,
					"",
				];
				if (actEnd !== undefined) {
					const title = ctx.options.acts.find((act) => act.fromLevel === actEnd)?.title ?? `The act from level ${String(actEnd)}`;
					return [...head, ctx.prompt("weaver/act-end", { title, resident })].join("\n");
				}
				const hard = patches.filter((patch) => patch.kind === "hard").length;
				const left = Math.max(0, MAX_HARD - hard);
				return [
					...head,
					ctx.prompt("weaver/events-heading", { resident }),
					...hits.map((hit) => `- #${String(hit.seq)} ${ctx.display(hit.text)}`),
					"",
					left > 1 ? ctx.prompt("weaver/question-hard", { resident, left }) : left === 1 ? ctx.prompt("weaver/question-hard-one", { resident }) : ctx.prompt("weaver/question-soft", { resident }),
				].join("\n");
			};

			if (fired.kind === "schedule") {
				// Writes the end of every act that is over: one text for the next act per resident that changed in it.
				const gone = exiled();
				const acts = [...new Set(state.patches.map((patch) => patch.act))].filter((act) => !state.closed.has(act) && actEnded(act)).sort((a, b) => a - b);
				const asked: Asked[] = [];
				for (const act of acts) {
					state.closed.add(act);
					const patches = state.patches.filter((patch) => patch.act === act);
					state.patches = state.patches.filter((patch) => patch.act !== act);
					for (const agent of residents.filter((id) => !gone.has(id) && patches.some((patch) => patch.agent === id))) {
						// The act's inner voices are gone with it.
						state.voices.delete(agent);
						asked.push({ kind: "act", agent, act, own: patches.filter((patch) => patch.agent === agent) });
					}
				}
				state.asked = asked;
				return asked.map((entry) => ({ dossier: entry.kind === "act" ? dossier(entry.agent, entry.own, [], entry.act) : "" }));
			}

			// The hits firing: what the log holds since the last look; the prefix of a resumed run is only observed.
			const triggers = state.triggers ?? new FateTriggers((id) => ctx.residents.has(id));
			state.triggers = triggers;
			const render = <K extends keyof typeof HIT_PROMPTS>(id: K, variables: Readonly<Record<(typeof HIT_PROMPTS)[K][number], string | number>>): string => ctx.prompt(id, variables);
			for (const event of ctx.log.since(state.observed)) {
				// Hits first: a message's readers are read before its interpretation forgets them.
				if (event.seq > state.cursor) state.pending.push(...triggers.hitsOf(event, render));
				triggers.observe(event);
				state.observed = event.seq;
			}
			state.cursor = Math.max(state.cursor, state.observed);
			const hits = state.pending;
			state.pending = [];
			const gone = exiled();
			const touched = residents.filter((id) => !gone.has(id) && hits.some((hit) => hit.agent === id));
			const act = currentAct();
			const asked: Asked[] = touched.map((agent) => ({ kind: "hits", agent, act, hits: hits.filter((hit) => hit.agent === agent) }));
			state.asked = asked;
			return asked.map((entry) =>
				entry.kind === "hits" ? { dossier: dossier(entry.agent, state.patches.filter((patch) => patch.agent === entry.agent && patch.act === entry.act), entry.hits, undefined) } : { dossier: "" },
			);
		},

		// A failed weaver changes nothing.
		fallback: (): Weave => ({ kind: "none", text: "", reason: "" }),

		settle(output, call, ctx) {
			const state = ctx.state;
			const entry = state.asked[call.index];
			const weave = usable(output);
			if (entry === undefined || weave === undefined || weave.kind === "none") return;
			const text = ctx.display(weave.text.trim());
			const reason = weave.reason.trim();
			const lastSeq = (): number => ctx.log.ofType("weaver", "fate_shift").at(-1)?.seq ?? 0;
			if (entry.kind === "act") {
				state.shifts.set(entry.agent, text);
				ctx.emit("fate_shift", { agent: entry.agent, kind: "act", text, reason, evidence: entry.own.map((patch) => patch.seq), triggers: ["act_end"] });
				return;
			}
			const own = state.patches.filter((patch) => patch.agent === entry.agent && patch.act === entry.act);
			const soft = own.filter((patch) => patch.kind === "soft").length;
			const hard = own.length - soft;
			const kind = weave.kind === "hard" && hard < MAX_HARD ? "hard" : soft < MAX_SOFT ? "soft" : undefined;
			if (kind === undefined) return;
			const evidence = [...new Set(entry.hits.map((hit) => hit.seq))].sort((a, b) => a - b);
			const triggers: FateTrigger[] = FATE_TRIGGER_NAMES.filter((trigger) => entry.hits.some((hit) => hit.trigger === trigger));
			if (kind === "hard") {
				state.shifts.set(entry.agent, text);
			} else {
				const head = ctx.prompt("weaver/inner-voice", { text: "\u0000" }).split("\u0000")[0] ?? "";
				state.voices.set(entry.agent, [...(state.voices.get(entry.agent) ?? []), `${head}${text}`]);
			}
			ctx.emit("fate_shift", { agent: entry.agent, kind, text, reason, evidence, triggers });
			state.patches.push({ agent: entry.agent, act: entry.act, kind, text, minute: ctx.minute, seq: lastSeq() });
		},

		snapshot: kit.snapshot({
			version: 1,
			schema: Slice,
			save: (state) => ({
				cursor: state.cursor,
				pending: state.pending.map((hit) => ({ ...hit })),
				patches: state.patches.map((patch) => ({ ...patch })),
				shifts: [...state.shifts].map(([agent, text]) => ({ agent, text })),
				voices: [...state.voices].flatMap(([agent, texts]) => texts.map((text) => ({ agent, text }))),
				closed: [...state.closed].sort((a, b) => a - b),
			}),
			load: (data) => {
				const voices = new Map<string, string[]>();
				for (const entry of data.voices) voices.set(entry.agent, [...(voices.get(entry.agent) ?? []), entry.text]);
				return {
					...emptyState(),
					cursor: data.cursor,
					pending: data.pending.map((hit) => ({ ...hit })),
					patches: data.patches.map((patch) => ({ ...patch })),
					shifts: new Map(data.shifts.map((entry) => [entry.agent, entry.text])),
					voices,
					closed: new Set(data.closed),
				};
			},
		}),
	}),
);
