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
import { CORE_MOTIVE_LEVELS, DRIVE_INTENSITIES, type CoreMotiveLevel, type DriveIntensity, type FigureDirection, type FigureSpec } from "@swarmtales/contracts";

const Level = Type.Union(CORE_MOTIVE_LEVELS.map((level) => Type.Literal(level)));
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
	readonly temperament: Readonly<Record<"openness" | "conscientiousness" | "extraversion" | "agreeableness" | "neuroticism", CoreMotiveLevel>>;
	/** The body without its direction sections: who the figure is. */
	readonly body: string;
	readonly direction?: FigureDirection;
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

/** The sections of a figure body that steer what it does; the rest says who it is. */
const DIRECTION_HEADINGS = ["In brief", "Tendencies", "Orders", "Duty", "Rivals"] as const;
type DirectionHeading = (typeof DIRECTION_HEADINGS)[number];

function isDirectionHeading(heading: string): heading is DirectionHeading {
	return DIRECTION_HEADINGS.some((known) => known === heading);
}

/** `- text` lines of a section. */
function bullets(text: string, source: string, heading: string): string[] {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => {
			if (!line.startsWith("- ")) throw new Error(`${source}: "## ${heading}" holds "- " lines only, got "${line}"`);
			return line.slice(2).trim();
		});
}

/** Splits a figure body into who it is and its direction sections (`## In brief`, ...). */
export function splitDirection(body: string, source: string): { body: string; direction?: FigureDirection } {
	const sections = body.split(/^(?=## )/m);
	const kept: string[] = [];
	const found = new Map<DirectionHeading, string>();
	for (const section of sections) {
		const match = /^## (.+)\n?([\s\S]*)$/.exec(section);
		const heading = match?.[1]?.trim();
		if (match === null || heading === undefined || !isDirectionHeading(heading)) {
			kept.push(section);
			continue;
		}
		if (found.has(heading)) throw new Error(`${source}: "## ${heading}" twice`);
		found.set(heading, (match[2] ?? "").trim());
	}
	const rest = kept.join("").trim();
	if (found.size === 0) return { body: rest };
	const brief = found.get("In brief");
	const duty = found.get("Duty");
	const rivals = bullets(found.get("Rivals") ?? "", source, "Rivals").map((line) => {
		const rival = /^\*{0,2}([a-z0-9][a-z0-9-]*)\*{0,2}:\s*(.+)$/.exec(line);
		if (rival?.[1] === undefined || rival[2] === undefined) throw new Error(`${source}: a rival line is "- <figure id>: text", got "${line}"`);
		return { figure: rival[1], text: rival[2] };
	});
	return {
		body: rest,
		direction: {
			...(brief === undefined || brief.length === 0 ? {} : { brief }),
			tendencies: bullets(found.get("Tendencies") ?? "", source, "Tendencies"),
			orders: bullets(found.get("Orders") ?? "", source, "Orders"),
			...(duty === undefined || duty.length === 0 ? {} : { duty }),
			rivals,
		},
	};
}

export function parseFigure(text: string, source: string): FigureFile {
	const split = splitFrontmatter(text, source);
	const { header } = split;
	const { body, direction } = splitDirection(split.body, source);
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
		...(direction === undefined ? {} : { direction }),
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

/** A figure file as the story's cast holds it: the core motive in the engine's shape and the body as its text. */
export function figureSpec(file: FigureFile): FigureSpec {
	return {
		id: file.id,
		title: file.title,
		profession: file.profession,
		tone: file.tone,
		bigFive: Object.entries(file.temperament).map(([axis, level]) => ({ axis, level })),
		drives: file.drives.map((entry) => ({ drive: entry.id, intensity: entry.intensity })),
		text: file.body,
		...(file.direction === undefined ? {} : { direction: file.direction }),
	};
}
