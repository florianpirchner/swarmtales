/**
 * The residents of a run on the new host (step 18, team R1; replaces `Arena` + `AgentRunner` on
 * `World` in apps/cli/src/compose.ts): one pi runner per resident ({@link HostResidentRunner}), the
 * residents' system prompts and the figure cues, and the turn taker `host.run` drives.
 *
 * The system prompt is built once from facts a resume keeps, as `composeRun` built it: the run's
 * names (`--names`), the core motive in prose (`motives.prose`) and the story's frame, the figure a
 * resident plays (`motives.coreMotives`) and its direction (`--figure-direction`, rivals among the
 * residents still in the city), the persona (seeded, or the figure's profession), the whisperer's
 * secret brief (`whispers.whisperer`) and the prompt addenda. Build it after `host.start()` (or on
 * a resumed host), when the motives are dealt and the whisperer is chosen.
 *
 * Each turn's inputs are the figure cues (shown as the city shows them), the mechanics' turn
 * inputs, the tools notice and the request line's tools in the old catalog order (`TOOL_NAMES`, G1-5).
 */
import type { AnyStory, Host, ModelChoice, Persona, ResidentId, Souffleur, ThinkingLevel, ToolSpec, TurnTaker } from "@swarmtales/contracts";
import { residentActor } from "@swarmtales/kernel";
import type { ModelSource, RequestLimits } from "@swarmtales/models";
import { assignModels, assignPersonas, baseSystemPrompt, HostResidentRunner, inCatalogOrder, type InnerVoice } from "@swarmtales/roles";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { briefLine, directFigure, directionBlock, directionLevel, FigureCues, figureOf, type FigureCue } from "./direction.ts";
import type { HostRun } from "./story.ts";

/** The request limits of a resident's model unless the run sets its own (compose.ts `DEFAULT_LIMITS`). */
export const RESIDENT_LIMITS: RequestLimits = { maxOutputTokens: 4_000, timeoutMs: 120_000 };

/** Who plays a resident: its model and persona (absent for the control group), as `agent_profile` logs it. */
export interface ResidentProfile {
	readonly agent: ResidentId;
	readonly model: ModelChoice;
	readonly persona?: Persona;
}

export interface HostResidentsOptions {
	readonly story: AnyStory;
	readonly run: HostRun;
	/** Started (or resumed): the motives are dealt and the whisperer is chosen. */
	readonly host: Host;
	/**
	 * Where the prompts' facts are read, when not from `host`: a resumed host does its resume work
	 * (the core motives a snapshot from before v09 lacks) only in its first minute, so a resumed run
	 * reads them from the app's probe host, which did it at once.
	 */
	readonly promptHost?: Host;
	/** Left out (the app's probe host) only prompts, profiles and characters are built, no runners. */
	readonly models?: ModelSource;
	/** Replaces every per-resident model (CLI `--model`). */
	readonly modelOverride?: ModelChoice;
	readonly limits?: RequestLimits;
	readonly thinking?: ThinkingLevel;
	/** `false` plays without personas (control group); default `true`. */
	readonly personas?: boolean;
	/** Texts appended to the system prompt (prompt experiments, `lab/`): of every resident, or of `agent` alone. */
	readonly promptAddenda?: readonly { readonly agent?: ResidentId; readonly text: string }[];
	/** Rewrites a resident's step the provider's safeguards refused (P44). */
	readonly souffleur?: Souffleur;
	/** The weaver's inner voices per resident (`--weaver`). */
	readonly innerVoice?: (agent: ResidentId) => InnerVoice | undefined;
}

export interface HostResidents {
	/** The opening system prompt of each resident, in roster order (the golden `prompts.json`). */
	readonly prompts: ReadonlyMap<ResidentId, string>;
	readonly profiles: readonly ResidentProfile[];
	/** The character part of each prompt, unchanged: what the weaver reads as who a resident is. */
	readonly characters: ReadonlyMap<ResidentId, string>;
	/** Writes `agent_profile` per resident (after `run_start`, as the old arena did). */
	recordProfiles(): void;
	/** The turn taker for `host.run` / `host.playMinute`. */
	readonly take: TurnTaker;
	/** `HostOptions.awaitsAnswer`. */
	awaitsAnswer(resident: ResidentId): boolean;
	/** Rebuilds a resident's system prompt with the weaver's text as who it has become. */
	rewrite(agent: ResidentId, shift: string): void;
	runner(agent: ResidentId): HostResidentRunner | undefined;
}

const Prose = Type.Record(Type.String(), Type.String());
const Figures = Type.Record(Type.String(), Type.Object({ figure: Type.Optional(Type.String()) }, { additionalProperties: true }));
const Whisperer = Type.Union([Type.String(), Type.Null()]);
const Exiled = Type.Array(Type.Object({ resident: Type.String() }, { additionalProperties: true }));
const Struck = Type.Array(Type.String());

/** The facts the prompts are built from, parsed at the boundary (absent where the mechanic is not loaded). */
interface PromptFacts {
	readonly prose: Readonly<Record<string, string>>;
	readonly figures: Readonly<Record<string, { readonly figure?: string }>>;
	readonly whisperer: ResidentId | undefined;
	readonly gone: ReadonlySet<ResidentId>;
}

function promptFacts(host: Host): PromptFacts {
	const facts = host.facts();
	const read = <T>(parse: (value: unknown) => T, key: string, fallback: T): T => (key in facts ? parse(facts[key]) : fallback);
	const whisperer = read((value) => Parse(Whisperer, value), "whispers.whisperer", null);
	const exiled = read((value) => Parse(Exiled, value), "exile.exiled", []);
	const struck = read((value) => Parse(Struck, value), "standoff-tribunal.struck", []);
	return {
		prose: read((value) => Parse(Prose, value), "motives.prose", {}),
		figures: read((value) => Parse(Figures, value), "motives.coreMotives", {}),
		whisperer: whisperer ?? undefined,
		gone: new Set([...exiled.map((entry) => entry.resident), ...struck]),
	};
}

/** A persona as the weaver reads it, for a resident without a core motive. */
function personaText(persona: Persona): string {
	return `Temperament: ${persona.temperament}. Values: ${persona.values}. Voice: ${persona.voice}.`;
}

/** The tools a story-scoped resident sees at the start: its doors' tools, `activeTools` and what the city opened to it (`toolScope: "story"`). */
function initialTools(story: AnyStory, all: readonly ToolSpec[], open: readonly string[]): readonly ToolSpec[] {
	if (story.toolScope !== "story") return all;
	const levelTools = new Set<string>(story.levels.flatMap((level) => level.tools));
	return all.filter((tool) => levelTools.has(tool.name) || tool.name === "activeTools" || open.includes(tool.name));
}

/** Every granted resident tool in the old catalog's order (`storyToolNames` bound them so). */
function catalogTools(host: Host): readonly ToolSpec[] {
	const specs = host.toolSpecs("resident");
	return inCatalogOrder(specs.map((spec) => spec.name)).flatMap((name) => specs.filter((spec) => spec.name === name));
}

export function hostResidents(options: HostResidentsOptions): HostResidents {
	const { story, run, host } = options;
	const ids = host.residents;
	const facts = promptFacts(options.promptHost ?? host);
	const figureDirection = directionLevel(run.figureDirection);
	const gmDirection = directionLevel(run.gmDirection);
	const assignments = assignModels(story, ids, run.seed, options.modelOverride);
	const personas = options.personas === false ? new Map<ResidentId, Persona>() : assignPersonas(story, ids, run.seed);
	const coreMotivesSpec = story.coreMotives;
	const figures = coreMotivesSpec?.figures;
	const figureIdOf = (agent: ResidentId): string | undefined => facts.figures[agent]?.figure;
	// Rivals still in the city; an exiled one is no longer faced.
	const playedBy = (figure: string): ResidentId | undefined => ids.find((agent) => !facts.gone.has(agent) && figureIdOf(agent) === figure);
	// Residents follow the notes as orders only when the director gives orders (gm direction 10).
	const author = gmDirection >= 10 ? story.gamemaker?.author : undefined;
	const storyTools = story.toolScope === "story";
	const all = catalogTools(host);
	const names = story.names !== undefined && run.names ? { names: { untilMinute: story.names.untilMinute } } : {};
	const cueMap = new Map<ResidentId, FigureCue>();
	const prompts = new Map<ResidentId, string>();
	const promptOf = new Map<ResidentId, (shift: string | undefined) => string>();
	const characters = new Map<ResidentId, string>();
	const profiles: ResidentProfile[] = [];
	const runners = new Map<ResidentId, HostResidentRunner>();

	for (const id of ids) {
		// The whisperer's secret brief closes its own prompt; nobody else reads it.
		const whispers = facts.whisperer === id ? story.whisperer : undefined;
		const brief = whispers?.brief.trim();
		const model = assignments.get(id) ?? story.model;
		const figure = figureOf(figures, figureIdOf(id));
		// The whisperer is directed like a cast figure; its orders follow its secret brief, last in the prompt.
		const direction = figure?.direction ?? whispers?.direction;
		// From figure direction 6 a figure speaks for itself: no persona block beside it.
		const led = (figure !== undefined || whispers?.direction !== undefined) && figureDirection >= 6;
		const directed = directFigure(figureDirection, direction, playedBy);
		// The whisperer obeys the gamemaker's notes whenever one plays; a figure only at gm direction 10.
		const authorOf = whispers === undefined ? author : run.gamemaker ? story.gamemaker?.author : undefined;
		const block = directed === undefined ? undefined : directionBlock(directed, (text) => host.display(text), authorOf);
		const whispererBlock = whispers === undefined ? undefined : block;
		const prose = facts.prose[id];
		const coreMotive: { readonly coreMotive?: string; readonly frame?: string } = coreMotivesSpec === undefined || prose === undefined ? {} : { coreMotive: prose, ...(coreMotivesSpec.frame === undefined ? {} : { frame: coreMotivesSpec.frame }) };
		if (directed !== undefined && coreMotive.coreMotive !== undefined) {
			const line = briefLine(directed);
			cueMap.set(id, { ...(line === undefined ? {} : { brief: line }), full: [coreMotive.coreMotive, ...(block === undefined ? [] : [block])].join("\n\n") });
		}
		// A cast figure plays the persona of its profession, so its voice and its figure agree.
		const profession = figure?.profession;
		const figurePersona = profession === undefined ? undefined : story.personas.find((persona) => persona.name.toLowerCase() === profession.toLowerCase());
		const persona = options.personas !== false && !led ? (figurePersona ?? personas.get(id)) : undefined;
		profiles.push({ agent: id, model, ...(persona === undefined ? {} : { persona }) });
		const build = (shift: string | undefined): string => {
			const base = baseSystemPrompt(
				{
					id,
					city: story.city,
					survivors: story.run.survivors,
					agents: ids.length,
					passesPerMinute: run.arena.passesPerMinute,
					...names,
					...coreMotive,
					...(led ? { direction: { level: figureDirection, ...(block === undefined || whispererBlock !== undefined ? {} : { block }) } } : {}),
					...(shift === undefined ? {} : { shift }),
					...(storyTools ? { storyTools: true } : {}),
				},
				persona,
			);
			return [
				base,
				...(brief === undefined ? [] : [brief]),
				...(whispererBlock === undefined ? [] : [whispererBlock]),
				...(options.promptAddenda ?? []).filter((entry) => entry.agent === undefined || entry.agent === id).map((entry) => entry.text.trim()),
			].join("\n\n");
		};
		promptOf.set(id, build);
		const systemPrompt = build(undefined);
		prompts.set(id, systemPrompt);
		characters.set(id, coreMotive.coreMotive ?? (persona === undefined ? "" : personaText(persona)));
		const maxOutputTokens = model.maxOutputTokens ?? story.model.maxOutputTokens;
		const limits = options.limits ?? { ...RESIDENT_LIMITS, ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }) };
		const actor = residentActor(id);
		const voice = options.innerVoice?.(id);
		if (options.models === undefined) continue;
		runners.set(
			id,
			new HostResidentRunner({
				id,
				systemPrompt,
				tools: initialTools(story, all, host.openTools(id)),
				...(storyTools ? { lateTool: (name: string) => all.find((tool) => tool.name === name) } : {}),
				binding: options.models.bind(id, limits),
				thinking: options.thinking ?? model.thinking ?? story.model.thinking ?? "medium",
				record: (type, payload) => {
					host.record(actor, type, payload);
				},
				openTools: () => host.openTools(id),
				recordCost: (usd) => {
					host.recordCost(usd);
				},
				...(options.souffleur === undefined ? {} : { souffleur: options.souffleur }),
				...(voice === undefined ? {} : { innerVoice: voice }),
			}),
		);
	}

	const cues = new FigureCues(cueMap);
	return {
		prompts,
		profiles,
		characters,
		recordProfiles: () => {
			for (const profile of profiles) {
				host.record(residentActor(profile.agent), "agent_profile", {
					agent: profile.agent,
					provider: profile.model.provider,
					model: profile.model.id ?? "-",
					...(profile.persona === undefined ? {} : { persona: profile.persona.name }),
				});
			}
		},
		take: (turn) => {
			const runner = runners.get(turn.resident);
			if (runner === undefined) return Promise.reject(new Error(`no runner for resident ${turn.resident}`));
			// Residents read names, not ids (v08): the cues as the city shows them, at the turn's start.
			const leading = cues.linesFor(turn.resident, turn.minute).map((line) => host.display(line));
			return runner.step(turn, leading);
		},
		awaitsAnswer: (resident) => runners.get(resident)?.awaitsAnswer === true,
		rewrite: (agent, shift) => {
			const build = promptOf.get(agent);
			if (build !== undefined) runners.get(agent)?.rewriteSystemPrompt(build(shift));
		},
		runner: (agent) => runners.get(agent),
	};
}
