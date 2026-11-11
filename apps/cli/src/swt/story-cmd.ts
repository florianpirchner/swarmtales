/** `swt story list|show|validate|schema`: the stories of the registry, and story files. */
import { writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { DIRECTOR_SUPPORT, storyJsonSchema, type AnyStory } from "@swarmtales/contracts";
import { storyData } from "@swarmtales/kernel";
import { validateStory } from "@swarmtales/sdk";
import { findCoreStory, STORIES, type CoreStoryEntry } from "../../../../stories/index.ts";
import { UsageError } from "../args.ts";
import { json, parseFlags, table, type CommandRun, type Noun } from "./io.ts";
import { isStoryFile, resolveStory, storyToYaml } from "./story-file.ts";

/** The optional sections of a story, by the name of the feature they switch on. */
function featuresOf(story: AnyStory): readonly string[] {
	const optional = ["gamemaker", "classifier", "tribunal", "names", "coreMotives", "goals", "seal", "whisperer", "popularity", "guards", "holdout", "acts", "models"] as const;
	return [
		...optional.filter((key) => story[key] !== undefined),
		...(story.rules.marks === undefined ? [] : ["marks"]),
		...(story.rules.dmLimit === undefined ? [] : ["dmLimit"]),
		...(story.rules.blame === undefined ? [] : ["blame"]),
		...(Object.keys(story.cast).length === 0 ? [] : ["cast"]),
	];
}

function toolsOf(story: AnyStory): readonly string[] {
	return [...new Set(story.levels.flatMap((level) => level.tools))];
}

function summary(story: AnyStory) {
	return {
		id: story.id,
		title: story.title,
		city: story.city,
		run: story.run,
		model: story.model,
		levels: story.levels.map((level) => ({ number: level.number, title: level.title, puzzle: level.puzzle.kind, team: level.team.kind, reward: level.reward, tools: level.tools })),
		acts: (story.acts ?? []).map((act) => ({ title: act.title, fromLevel: act.fromLevel })),
		features: featuresOf(story),
		tools: toolsOf(story),
		directorRules: story.director.length,
	};
}

const list: CommandRun = (argv, io) => {
	const { flags } = parseFlags(argv);
	const rows = Object.entries(STORIES).map(([name, story]) => ({ name, title: story.title, levels: story.levels.length, agents: story.run.agents, minutes: story.run.minutes }));
	io.out(flags.json === true ? json(rows) : table(["name", "title", "levels", "agents", "minutes"], rows.map((row) => [row.name, row.title, String(row.levels), String(row.agents), String(row.minutes)])));
	return 0;
};

/** The story as plain JSON (what a viewer draws its graph from). */
function plain(value: unknown): unknown {
	return JSON.parse(JSON.stringify(value));
}

/** A core story (stories/index.ts `coreStories`, or a variant by name): its mechanics in load order. */
function showCore(name: string, entry: CoreStoryEntry, asJson: boolean): string {
	const data = storyData(entry.story);
	const mechanics = data.mechanics.map((mechanic) => mechanic.id);
	if (asJson) return json({ id: data.id, title: entry.title, kind: "core", minutes: data.minutes, residents: data.residents, mechanics, story: plain(data) });
	const residents = typeof data.residents === "number" ? String(data.residents) : data.residents.join(", ");
	return [`${entry.title} (${name}), a core story`, `run: ${residents} residents, ${String(data.minutes)} minutes, seed ${String(data.seed)}`, `mechanics: ${mechanics.join(", ")}`].join("\n");
}

const show: CommandRun = (argv, io) => {
	const { positionals, flags } = parseFlags(argv, { yaml: "boolean" });
	const [reference, ...rest] = positionals;
	if (reference === undefined || rest.length > 0) throw new UsageError("show takes one story name or file");
	const resolved = resolveStory(reference);
	const core = resolved.story === undefined && !isStoryFile(reference) ? findCoreStory(reference) : undefined;
	if (core !== undefined && flags.yaml !== true) {
		io.out(showCore(reference, core, flags.json === true));
		return 0;
	}
	if (resolved.story === undefined) {
		io.err(resolved.issues.join("\n"));
		return 1;
	}
	const story = resolved.story;
	if (flags.yaml === true) {
		io.out(storyToYaml(story, "story.schema.json", ".").trimEnd());
		return 0;
	}
	if (flags.json === true) {
		// The summary, and the whole story as plain JSON under `story` (what the viewer's story graph reads).
		io.out(json({ ...summary(story), story: plain(story) }));
		return 0;
	}
	const info = summary(story);
	io.out(
		[
			`${story.title} (${story.id}), from ${resolved.source}`,
			`city: ${story.city}`,
			`run: ${story.run.agents} agents, ${story.run.minutes} minutes, seed ${story.run.seed}, ${story.run.survivors} survivors; model ${story.model.provider}${story.model.id === undefined ? "" : `/${story.model.id}`}`,
			`features: ${info.features.join(", ") || "-"}`,
			`tools: ${info.tools.join(", ")}`,
			`director rules: ${info.directorRules}`,
			"",
			"acts:",
			...(info.acts.length === 0 ? ["  (one implicit act)"] : info.acts.map((act) => `  from level ${act.fromLevel}: ${act.title}`)),
			"",
			"levels:",
			table(["#", "title", "puzzle", "team", "reward"], info.levels.map((level) => [String(level.number), level.title, level.puzzle, level.team, String(level.reward)])),
		].join("\n"),
	);
	return 0;
};

const validate: CommandRun = (argv, io) => {
	const { positionals } = parseFlags(argv);
	const references = positionals.length === 0 ? Object.keys(STORIES) : positionals;
	let failed = false;
	for (const reference of references) {
		const resolved = resolveStory(reference);
		const issues = resolved.story === undefined ? resolved.issues : [...validateStory(resolved.story, { support: DIRECTOR_SUPPORT }), ...(!isStoryFile(reference) && resolved.story.id !== reference ? [`registered as "${reference}" but its id is "${resolved.story.id}"`] : [])];
		if (issues.length === 0 && resolved.story !== undefined) {
			io.out(`ok   ${reference}: ${resolved.story.levels.length} levels, ${resolved.story.director.length} director rules`);
		} else {
			failed = true;
			io.out(`FAIL ${reference}\n${issues.map((issue) => `  - ${issue}`).join("\n")}`);
		}
	}
	return failed ? 1 : 0;
};

const schema: CommandRun = (argv, io) => {
	const { flags } = parseFlags(argv, { out: "string" });
	const text = `${json(storyJsonSchema())}\n`;
	const out = typeof flags.out === "string" ? flags.out : "story.schema.json";
	if (out === "-") {
		io.out(text.trimEnd());
		return 0;
	}
	writeFileSync(resolve(out), text);
	io.out(`wrote ${out} (point a YAML story at it with "# yaml-language-server: $schema=${dirname(out) === "." ? "" : `${dirname(out).split(sep).join("/")}/`}story.schema.json")`);
	return 0;
};

export const storyNoun: Noun = {
	name: "story",
	verbs: {
		list: { args: "[--json]", summary: "the registered stories", run: list },
		show: { args: "<name|file> [--json|--yaml]", summary: "run settings, levels, tools and features of a story (a core story: its mechanics); --json adds the whole story under `story`", run: show },
		validate: { args: "[name|file...]", summary: "the registry's stories, or the ones named (a file is YAML or JSON)", run: validate },
		schema: { args: "[--out <file>]", summary: "write the story schema (default story.schema.json; `--out -` prints it)", run: schema },
	},
};
