/**
 * Characters as Markdown files with a flat frontmatter header: the
 * story-independent library (archetypes/: professions, drives, the Big Five
 * and general figures) and a story's own cast (stories/<story>/cast/:
 * finished figures with a `base` archetype and the story's wants and limits).
 *
 * A header line is `key: value`; a figure's drives are `id=intensity` pairs
 * separated by commas.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { CORE_LEVELS, DRIVE_INTENSITIES, type CoreLevel, type DriveIntensity } from "../story/index.ts";

const Level = Type.Union(CORE_LEVELS.map((level) => Type.Literal(level)));
const Tone = Type.Union([Type.Literal("light"), Type.Literal("dark")]);

const FigureHeader = Type.Object({
	id: Type.String({ pattern: "^[a-z0-9][a-z0-9-]*$" }),
	base: Type.Optional(Type.String({ minLength: 1 })),
	title: Type.String({ minLength: 1 }),
	profession: Type.String({ minLength: 1 }),
	tone: Tone,
	drives: Type.String({ minLength: 1 }),
	openness: Level,
	conscientiousness: Level,
	extraversion: Level,
	agreeableness: Level,
	neuroticism: Level,
});

const ProfessionHeader = Type.Object({
	id: Type.String({ minLength: 1 }),
	persona: Type.String({ minLength: 1 }),
	temperament: Type.String({ minLength: 1 }),
	values: Type.String({ minLength: 1 }),
	voice: Type.String({ minLength: 1 }),
});

const DriveHeader = Type.Object({
	id: Type.String({ minLength: 1 }),
	group: Type.String({ minLength: 1 }),
	tone: Tone,
});

export type ProfessionFile = Static<typeof ProfessionHeader> & { readonly body: string };
export type DriveFile = Static<typeof DriveHeader> & { readonly body: string };

export interface CastDrive {
	readonly id: string;
	readonly intensity: DriveIntensity;
}

export interface FigureFile {
	readonly id: string;
	/** The archetype a story figure is built on. */
	readonly base?: string;
	readonly title: string;
	readonly profession: string;
	readonly tone: "light" | "dark";
	readonly drives: readonly CastDrive[];
	readonly temperament: Readonly<Record<"openness" | "conscientiousness" | "extraversion" | "agreeableness" | "neuroticism", CoreLevel>>;
	readonly body: string;
}

export interface Archetypes {
	readonly professions: readonly ProfessionFile[];
	readonly drives: readonly DriveFile[];
	readonly figures: readonly FigureFile[];
}

/** Splits a file into its flat `key: value` header and the Markdown body. */
export function splitFrontmatter(text: string, source: string): { header: Record<string, string>; body: string } {
	const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text.replace(/\r\n/g, "\n"));
	if (!match) throw new Error(`${source}: missing frontmatter`);
	const header: Record<string, string> = {};
	for (const line of (match[1] ?? "").split("\n")) {
		if (line.trim() === "") continue;
		const colon = line.indexOf(":");
		if (colon <= 0) throw new Error(`${source}: bad header line "${line}"`);
		header[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
	}
	return { header, body: (match[2] ?? "").trim() };
}

function isIntensity(value: string): value is DriveIntensity {
	return DRIVE_INTENSITIES.some((intensity) => intensity === value);
}

function parseDrives(value: string, source: string): CastDrive[] {
	return value.split(",").map((pair) => {
		const [id, intensity, ...rest] = pair.trim().split("=");
		if (id === undefined || id === "" || intensity === undefined || rest.length > 0 || !isIntensity(intensity)) {
			throw new Error(`${source}: bad drive "${pair.trim()}" (expected id=${DRIVE_INTENSITIES.join("|")})`);
		}
		return { id, intensity };
	});
}

export function parseFigure(text: string, source: string): FigureFile {
	const { header, body } = splitFrontmatter(text, source);
	const parsed = Parse(FigureHeader, header);
	return {
		id: parsed.id,
		...(parsed.base === undefined ? {} : { base: parsed.base }),
		title: parsed.title,
		profession: parsed.profession,
		tone: parsed.tone,
		drives: parseDrives(parsed.drives, source),
		temperament: {
			openness: parsed.openness,
			conscientiousness: parsed.conscientiousness,
			extraversion: parsed.extraversion,
			agreeableness: parsed.agreeableness,
			neuroticism: parsed.neuroticism,
		},
		body,
	};
}

export function parseProfession(text: string, source: string): ProfessionFile {
	const { header, body } = splitFrontmatter(text, source);
	return { ...Parse(ProfessionHeader, header), body };
}

export function parseDrive(text: string, source: string): DriveFile {
	const { header, body } = splitFrontmatter(text, source);
	return { ...Parse(DriveHeader, header), body };
}

function readAll<T>(directory: string, parse: (text: string, source: string) => T): T[] {
	return readdirSync(directory)
		.filter((name) => name.endsWith(".md") && name !== "README.md")
		.sort()
		.map((name) => {
			const path = join(directory, name);
			return parse(readFileSync(path, "utf8"), path);
		});
}

/** Reads the whole library from an archetypes/ folder. */
export function readArchetypes(directory: string): Archetypes {
	return {
		professions: readAll(join(directory, "professions"), parseProfession),
		drives: readAll(join(directory, "drives"), parseDrive),
		figures: readAll(join(directory, "figures"), parseFigure),
	};
}

/** Reads a story's cast: one finished figure per file. */
export function readFigures(directory: string): FigureFile[] {
	return readAll(directory, parseFigure);
}
