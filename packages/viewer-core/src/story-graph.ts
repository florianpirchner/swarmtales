/**
 * A story as a graph (docs/ideas/visualization-ui.md §6a), read from its structure as plain JSON:
 * a level story gives levels in order (sequence edges), acts grouping them, the gamemaker's roles
 * by level, the cast, and the director's rules (trigger → rule → actions, with petition outcomes
 * and lotteries as branches) and its endings; a story without levels gives its mechanics in load
 * order. Nothing here knows a game: unknown kinds are drawn by their `kind`.
 */
import { Type, type Static, type TSchema } from "typebox";
import { Check } from "typebox/value";

interface Located {
	readonly id: string;
	readonly label: string;
	/** The act a level belongs to. */
	readonly parent?: string;
}

export type GraphNode = Located &
	(
		| { readonly kind: "start" }
		| { readonly kind: "level"; readonly level: number; readonly reward?: number }
		| { readonly kind: "act"; readonly fromLevel: number }
		| { readonly kind: "role"; readonly fromLevel: number; readonly role: string }
		| { readonly kind: "cast"; readonly cast: string; readonly level?: number }
		| { readonly kind: "rule"; readonly rule: string; readonly trigger: string; readonly conditions: readonly string[] }
		| { readonly kind: "trigger"; readonly rule: string; readonly trigger: string; readonly minute?: number }
		| { readonly kind: "action" | "lottery"; readonly rule: string; readonly action: string }
		| { readonly kind: "petition"; readonly petition: string }
		| { readonly kind: "outcome"; readonly petition: string; readonly outcome: string }
		| { readonly kind: "collection"; readonly into: string }
		| { readonly kind: "mechanic"; readonly mechanic: string }
		| { readonly kind: "overseer"; readonly overseer: string; readonly mechanic: string }
		| { readonly kind: "end"; readonly end: "finished" | "run"; readonly minutes?: number }
	);

export type GraphNodeKind = GraphNode["kind"];

export interface GraphEdge {
	readonly id: string;
	readonly from: string;
	readonly to: string;
	/** sequence: the order of levels or mechanics; trigger: what fires a rule; condition: what a rule's `when` reads; action: what a rule does; branch: a petition outcome or a lottery draw; role, cast, collection: what a node refers to. */
	readonly kind: "sequence" | "trigger" | "condition" | "action" | "branch" | "role" | "cast" | "collection";
	readonly label?: string;
}

export interface StoryGraph {
	/** `levels` for a level story, `mechanics` for a story of mechanics, `unknown` when neither shape fits. */
	readonly kind: "levels" | "mechanics" | "unknown";
	readonly id?: string;
	readonly title?: string;
	readonly nodes: readonly GraphNode[];
	readonly edges: readonly GraphEdge[];
	/** Parts that did not fit and were left out. */
	readonly issues: readonly string[];
}

const Int = Type.Integer();
const Text = Type.String();
const Opt = <T extends TSchema>(schema: T) => Type.Optional(schema);

const LevelPart = Type.Object({ number: Int, title: Opt(Text), reward: Opt(Type.Number()) });
const ActPart = Type.Object({ title: Text, fromLevel: Int });
const RolePart = Type.Object({ fromLevel: Int, role: Text });
const CastPart = Type.Object({ level: Opt(Int) });
const RefPart = Type.Object({ kind: Text, level: Opt(Int), minute: Opt(Type.Number()), petition: Opt(Text), outcome: Opt(Text), status: Opt(Text), into: Opt(Text), cast: Opt(Text) });
const ActionPart = Type.Object({ kind: Text, cast: Opt(Text), from: Opt(Text), into: Opt(Text), petition: Opt(Type.Unknown()), then: Opt(Type.Array(Type.Unknown())) });
const PetitionPart = Type.Object({ id: Text, onPass: Type.Array(Type.Unknown()), onFail: Type.Array(Type.Unknown()) });
const RulePart = Type.Object({ id: Text, trigger: Type.Unknown(), when: Opt(Type.Array(Type.Unknown())), actions: Type.Array(Type.Unknown()) });
const LevelStory = Type.Object({
	id: Opt(Text),
	title: Opt(Text),
	levels: Type.Array(Type.Unknown()),
	director: Opt(Type.Array(Type.Unknown())),
	acts: Opt(Type.Array(Type.Unknown())),
	cast: Opt(Type.Record(Type.String(), Type.Unknown())),
	gamemaker: Opt(Type.Object({ roles: Opt(Type.Array(Type.Unknown())) })),
	run: Opt(Type.Object({ minutes: Opt(Type.Number()) })),
});
const MechanicStory = Type.Object({
	id: Opt(Text),
	title: Opt(Text),
	minutes: Opt(Type.Number()),
	mechanics: Type.Array(Type.Object({ id: Text })),
	overseers: Opt(Type.Array(Type.Object({ name: Text, id: Text }))),
});

/** The fields of a trigger or condition other than `kind`, as `key value` words. */
function describe(part: Readonly<Record<string, unknown>>): string {
	const kind = typeof part.kind === "string" ? part.kind : "?";
	const rest = Object.entries(part)
		.filter(([key, value]) => key !== "kind" && (typeof value === "string" || typeof value === "number" || typeof value === "boolean"))
		.map(([key, value]) => `${key} ${String(value)}`);
	return [kind, ...rest].join(" ");
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

class Builder {
	readonly nodes = new Map<string, GraphNode>();
	readonly edges: GraphEdge[] = [];
	readonly issues: string[] = [];

	node(node: GraphNode): string {
		if (!this.nodes.has(node.id)) this.nodes.set(node.id, node);
		return node.id;
	}

	edge(from: string, to: string, kind: GraphEdge["kind"], label?: string): void {
		this.edges.push({ id: `${kind}:${from}->${to}:${String(this.edges.length)}`, from, to, kind, ...(label === undefined ? {} : { label }) });
	}

	parts<T extends TSchema>(schema: T, values: readonly unknown[], where: string): Static<T>[] {
		const out: Static<T>[] = [];
		for (const [index, value] of values.entries()) {
			if (Check(schema, value)) out.push(value);
			else this.issues.push(`${where}[${String(index)}] does not fit and is left out`);
		}
		return out;
	}

	result(kind: StoryGraph["kind"], id: string | undefined, title: string | undefined): StoryGraph {
		const known = this.edges.filter((edge) => this.nodes.has(edge.from) && this.nodes.has(edge.to));
		return { kind, ...(id === undefined ? {} : { id }), ...(title === undefined ? {} : { title }), nodes: [...this.nodes.values()], edges: known, issues: this.issues };
	}
}

const levelId = (level: number): string => `level:${String(level)}`;
const castId = (cast: string): string => `cast:${cast}`;
const collectionId = (into: string): string => `collection:${into}`;
const petitionId = (petition: string): string => `petition:${petition}`;
const outcomeId = (petition: string, outcome: string): string => `petition:${petition}:${outcome}`;

/** The node a trigger or condition refers to, made when it is a petition outcome or a collection. */
function referenced(builder: Builder, part: Static<typeof RefPart>): string | undefined {
	if (part.petition !== undefined) {
		const outcome = part.outcome ?? part.status;
		builder.node({ id: petitionId(part.petition), kind: "petition", petition: part.petition, label: `petition ${part.petition}` });
		if (outcome === undefined || outcome === "open") return petitionId(part.petition);
		return builder.node({ id: outcomeId(part.petition, outcome), kind: "outcome", petition: part.petition, outcome, label: outcome });
	}
	if (part.into !== undefined) return builder.node({ id: collectionId(part.into), kind: "collection", into: part.into, label: `collection ${part.into}` });
	if (part.level !== undefined && builder.nodes.has(levelId(part.level))) return levelId(part.level);
	if (part.cast !== undefined && builder.nodes.has(castId(part.cast))) return castId(part.cast);
	return undefined;
}

function addActions(builder: Builder, rule: string, from: string, actions: readonly unknown[], path: string, edgeKind: "action" | "branch", label?: string): void {
	for (const [index, action] of builder.parts(ActionPart, actions, `${rule} actions`).entries()) {
		const here = `${path}.${String(index)}`;
		const id = `action:${rule}:${here}`;
		builder.node({ id, kind: action.kind === "lottery" ? "lottery" : "action", rule, action: action.kind, label: action.kind });
		builder.edge(from, id, edgeKind, label);
		const cast = action.cast ?? action.from;
		if (cast !== undefined && builder.nodes.has(castId(cast))) builder.edge(id, castId(cast), "cast");
		if (action.into !== undefined) {
			const collection = builder.node({ id: collectionId(action.into), kind: "collection", into: action.into, label: `collection ${action.into}` });
			if (action.kind === "collectDms") builder.edge(id, collection, "collection");
			else builder.edge(collection, id, "collection");
		}
		if (action.kind === "lottery") addActions(builder, rule, id, action.then ?? [], `${here}.then`, "branch", "drawn");
		if (action.kind === "openPetition") {
			if (!Check(PetitionPart, action.petition)) {
				builder.issues.push(`${rule}: a petition that does not fit is left out`);
				continue;
			}
			const petition = action.petition;
			builder.node({ id: petitionId(petition.id), kind: "petition", petition: petition.id, label: `petition ${petition.id}` });
			builder.edge(id, petitionId(petition.id), "action");
			for (const [outcome, list] of [["passed", petition.onPass], ["failed", petition.onFail]] as const) {
				const target = builder.node({ id: outcomeId(petition.id, outcome), kind: "outcome", petition: petition.id, outcome, label: outcome });
				builder.edge(petitionId(petition.id), target, "branch", outcome);
				addActions(builder, rule, target, list, `${here}.${outcome}`, "action");
			}
		}
	}
}

function levelGraph(story: Static<typeof LevelStory>): StoryGraph {
	const builder = new Builder();
	const levels = builder.parts(LevelPart, story.levels, "levels").sort((left, right) => left.number - right.number);
	const acts = builder.parts(ActPart, story.acts ?? [], "acts").sort((left, right) => left.fromLevel - right.fromLevel);
	const actOf = (level: number): string | undefined => {
		const index = acts.findLastIndex((act) => act.fromLevel <= level);
		return index === -1 ? undefined : `act:${String(index)}`;
	};
	const start = builder.node({ id: "start", kind: "start", label: "start" });
	for (const [index, act] of acts.entries()) builder.node({ id: `act:${String(index)}`, kind: "act", fromLevel: act.fromLevel, label: act.title });
	let previous = start;
	for (const level of levels) {
		const parent = actOf(level.number);
		const id = builder.node({ id: levelId(level.number), kind: "level", level: level.number, ...(level.reward === undefined ? {} : { reward: level.reward }), label: `L${String(level.number)}${level.title === undefined ? "" : ` ${level.title}`}`, ...(parent === undefined ? {} : { parent }) });
		builder.edge(previous, id, "sequence");
		previous = id;
	}
	const finished = builder.node({ id: "end:finished", kind: "end", end: "finished", label: "last level passed" });
	if (levels.length > 0) builder.edge(previous, finished, "sequence", `+${String(levels.at(-1)?.reward ?? 0)}`);
	const minutes = story.run?.minutes;
	builder.node({ id: "end:run", kind: "end", end: "run", ...(minutes === undefined ? {} : { minutes }), label: minutes === undefined ? "run end" : `run end (${String(minutes)} minutes)` });
	for (const [index, role] of builder.parts(RolePart, story.gamemaker?.roles ?? [], "gamemaker.roles").entries()) {
		const id = builder.node({ id: `role:${String(index)}`, kind: "role", fromLevel: role.fromLevel, role: role.role, label: `${role.role} from L${String(role.fromLevel)}` });
		if (builder.nodes.has(levelId(role.fromLevel))) builder.edge(id, levelId(role.fromLevel), "role");
	}
	for (const [name, value] of Object.entries(story.cast ?? {})) {
		if (!Check(CastPart, value)) {
			builder.issues.push(`cast ${name} does not fit and is left out`);
			continue;
		}
		const id = builder.node({ id: castId(name), kind: "cast", cast: name, ...(value.level === undefined ? {} : { level: value.level }), label: name });
		if (value.level !== undefined && builder.nodes.has(levelId(value.level))) builder.edge(id, levelId(value.level), "cast", "public level");
	}
	for (const rule of builder.parts(RulePart, story.director ?? [], "director")) {
		const trigger = Check(RefPart, rule.trigger) ? rule.trigger : undefined;
		const conditions = builder.parts(RefPart, rule.when ?? [], `${rule.id} when`);
		const id = builder.node({ id: `rule:${rule.id}`, kind: "rule", rule: rule.id, trigger: trigger === undefined ? "?" : describe(trigger), conditions: conditions.map(describe), label: rule.id });
		if (trigger === undefined) builder.issues.push(`${rule.id}: a trigger that does not fit`);
		else {
			const source = referenced(builder, trigger) ?? builder.node({ id: `trigger:${rule.id}`, kind: "trigger", rule: rule.id, trigger: trigger.kind, ...(trigger.minute === undefined ? {} : { minute: trigger.minute }), label: describe(trigger) });
			builder.edge(source, id, "trigger", trigger.kind);
		}
		for (const condition of conditions) {
			const source = referenced(builder, condition);
			if (source !== undefined) builder.edge(source, id, "condition", describe(condition));
		}
		addActions(builder, rule.id, id, rule.actions, "a", "action");
	}
	return builder.result("levels", story.id, story.title);
}

function mechanicGraph(story: Static<typeof MechanicStory>): StoryGraph {
	const builder = new Builder();
	let previous = builder.node({ id: "start", kind: "start", label: "start" });
	for (const mechanic of story.mechanics) {
		const id = builder.node({ id: `mechanic:${mechanic.id}`, kind: "mechanic", mechanic: mechanic.id, label: mechanic.id });
		builder.edge(previous, id, "sequence");
		previous = id;
	}
	for (const overseer of story.overseers ?? []) builder.node({ id: `overseer:${overseer.name}`, kind: "overseer", overseer: overseer.name, mechanic: overseer.id, label: `${overseer.name} (${overseer.id})` });
	const end = builder.node({ id: "end:run", kind: "end", end: "run", ...(story.minutes === undefined ? {} : { minutes: story.minutes }), label: story.minutes === undefined ? "run end" : `run end (${String(story.minutes)} minutes)` });
	builder.edge(previous, end, "sequence");
	return builder.result("mechanics", story.id, story.title);
}

/**
 * The graph of a story given as plain JSON: the story itself (a registered story's JSON, a YAML
 * story parsed), or a wrapper with the story under `story` (`swt story show <name> --json`,
 * `000-run.json`).
 */
export function storyGraph(input: unknown): StoryGraph {
	const inner = isRecord(input) ? input.story : undefined;
	const story = isRecord(inner) && (Array.isArray(inner.levels) || Array.isArray(inner.mechanics)) ? inner : input;
	if (Check(LevelStory, story)) return levelGraph(story);
	if (Check(MechanicStory, story)) return mechanicGraph(story);
	return { kind: "unknown", nodes: [], edges: [], issues: ["neither a story with levels nor a story with mechanics"] };
}
