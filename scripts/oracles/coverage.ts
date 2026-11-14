/**
 * `oracles/COVERAGE.md`: per game, which tools, refusal codes and event types of its mechanics the oracle files
 * exercise and which they never do. The tools and event types are read from the generated blocks of each mechanic's
 * README (`mechanics/<id>/README.md`), the refusal codes from the mechanic's source by a pattern (`refuse("CODE"`,
 * `code: "CODE"`); the counts come from the oracle files. Written by `scripts/export-oracles.ts`.
 */
import { existsSync, globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Value } from "typebox/value";
import { OracleSchema, type Oracle } from "./format.ts";

export const COVERAGE = "oracles/COVERAGE.md";

/** The refusal codes of the platform itself, with the stage that gives each. */
const PLATFORM_CODES: readonly (readonly [string, string, string])[] = [
	["TOOL_UNKNOWN", "lock", "no tool of that name is loaded"],
	["TOOL_NOT_GRANTED", "lock", "the caller's role was never granted the tool"],
	["TOOL_LOCKED", "lock", "the tool is locked for this caller now (not its turn, not its phase, not its level)"],
	["INVALID_ARGUMENTS", "parse", "the arguments do not fit the tool's schema"],
	["TEXT_TOO_LONG", "parse", "a text argument is longer than the tool allows"],
	["STEP_LIMIT", "limit", "the caller used up `setup.limits.maxStepsPerMinute` calls in this minute (refused calls count)"],
	["TOOL_LIMIT", "limit", "a limit the story put on this tool"],
	["GUARD_BLOCKED", "guard", "a tool guard of the story refused the call"],
];

function block(text: string, name: string): string {
	const start = text.indexOf(`<!-- generated:${name} -->`);
	const end = text.indexOf(`<!-- /generated:${name} -->`);
	return start < 0 || end < 0 ? "" : text.slice(start, end);
}

const headings = (text: string): string[] => [...text.matchAll(/^### `([^`]+)`/gm)].map((match) => match[1] ?? "");

interface MechanicFacts {
	readonly tools: readonly string[];
	readonly events: readonly string[];
	readonly codes: readonly string[];
}

function mechanicFacts(root: string, id: string): MechanicFacts {
	const readme = resolve(root, "mechanics", id, "README.md");
	const text = existsSync(readme) ? readFileSync(readme, "utf8") : "";
	const codes = new Set<string>();
	for (const file of globSync("**/*.ts", { cwd: resolve(root, "mechanics", id, "src") })) {
		const lines = readFileSync(resolve(root, "mechanics", id, "src", file), "utf8").split("\n");
		lines.forEach((line, index) => {
			if (!/\brefused?\(|\bcode:/.test(line)) return;
			for (const match of `${line} ${lines[index + 1] ?? ""}`.matchAll(/"([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)"/g)) codes.add(match[1] ?? "");
		});
	}
	return { tools: headings(block(text, "tools")), events: headings(block(text, "events")), codes: [...codes].sort() };
}

function readOracle(path: string): Oracle {
	const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
	if (!Value.Check(OracleSchema, parsed)) throw new Error(`${path}: not an oracle file`);
	return parsed;
}

const bump = (map: Map<string, number>, key: string): void => void map.set(key, (map.get(key) ?? 0) + 1);

/** The entry of `key`, made by `make` when it is not there yet. */
function entryOf<V>(map: Map<string, V>, key: string, make: () => V): V {
	const found = map.get(key);
	if (found !== undefined) return found;
	const made = make();
	map.set(key, made);
	return made;
}
const row = (cells: readonly string[]): string => `| ${cells.join(" | ")} |`;
const code = (text: string): string => `\`${text}\``;

function gameSection(root: string, game: string): string {
	const files = globSync("*.json", { cwd: resolve(root, "oracles", game) }).sort();
	const oracles = files.map((file) => readOracle(resolve(root, "oracles", game, file)));
	const mechanics = [...new Set(oracles.flatMap((oracle) => oracle.setup.mechanics.map((mechanic) => mechanic.id)))];
	const facts = new Map(mechanics.map((id) => [id, mechanicFacts(root, id)]));
	const accepted = new Map<string, number>();
	const refused = new Map<string, Map<string, number>>();
	const codeFiles = new Map<string, Set<string>>();
	const codeCount = new Map<string, number>();
	const events = new Map<string, number>();
	const callers = new Map<string, Set<string>>();
	files.forEach((file, index) => {
		for (const entry of oracles[index]?.timeline ?? []) {
			if (entry.k === "event") bump(events, `${entry.source}.${entry.type}`);
			if (entry.k !== "call") continue;
			entryOf(callers, entry.tool, () => new Set<string>()).add(entry.actor.split(":")[0] ?? "");
			if (entry.ok) {
				bump(accepted, entry.tool);
				continue;
			}
			const key = `${entry.code ?? ""}@${entry.stage ?? ""}`;
			bump(entryOf(refused, entry.tool, () => new Map<string, number>()), key);
			bump(codeCount, entry.code ?? "");
			entryOf(codeFiles, entry.code ?? "", () => new Set<string>()).add(file);
		}
	});
	const ownerOf = (tool: string): string => mechanics.find((id) => facts.get(id)?.tools.includes(tool)) ?? "";
	const granted = new Set(oracles.flatMap((oracle) => oracle.setup.residentTools));
	const tools = [...new Set([...mechanics.flatMap((id) => facts.get(id)?.tools ?? []), ...granted, ...callers.keys()])].sort();
	const lines: string[] = [`## ${game}`, "", `${String(files.length)} files. Mechanics: ${mechanics.map(code).join(", ")}.`, ""];
	lines.push(row(["Tool", "Mechanic", "Granted to residents", "Called by", "Accepted", "Refused with"]), row(["---", "---", "---", "---", "---:", "---"]));
	for (const tool of tools) {
		const seen = [...(refused.get(tool) ?? new Map<string, number>())].sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, count]) => `${code(key)} ${String(count)}`);
		const by = [...(callers.get(tool) ?? [])].sort().join(", ");
		const never = by === "" ? "**never called**" : by;
		lines.push(row([code(tool), ownerOf(tool) === "" ? "(none)" : ownerOf(tool), granted.has(tool) ? "yes" : "no", never, String(accepted.get(tool) ?? 0), seen.length === 0 ? "-" : seen.join(", ")]));
	}
	lines.push("", row(["Refusal code", "From", "Refused calls", "In files"]), row(["---", "---", "---:", "---:"]));
	const known = new Map<string, string>();
	for (const [name, stage] of PLATFORM_CODES) known.set(name, `platform, stage ${code(stage)}`);
	for (const id of mechanics) for (const name of facts.get(id)?.codes ?? []) known.set(name, known.has(name) && !known.get(name)?.startsWith("platform") ? `${known.get(name) ?? ""}, ${id}` : id);
	for (const name of codeCount.keys()) if (!known.has(name)) known.set(name, "(not found in the source by the pattern)");
	const names = [...known.keys()].sort((a, b) => (codeCount.get(b) ?? 0) - (codeCount.get(a) ?? 0) || (a < b ? -1 : 1));
	for (const name of names.filter((entry) => (codeCount.get(entry) ?? 0) > 0)) lines.push(row([code(name), known.get(name) ?? "", String(codeCount.get(name) ?? 0), String(codeFiles.get(name)?.size ?? 0)]));
	const unseen = names.filter((entry) => (codeCount.get(entry) ?? 0) === 0);
	lines.push("", `Refusal codes no file exercises (${String(unseen.length)}): ${unseen.length === 0 ? "none" : unseen.map((name) => `${code(name)} (${known.get(name) ?? ""})`).join(", ")}.`);
	const declared = mechanics.flatMap((id) => (facts.get(id)?.events ?? []).map((type) => `${id}.${type}`));
	const silentEvents = declared.filter((key) => !events.has(key));
	lines.push("", `Event types of the mechanics: ${String(declared.length - silentEvents.length)} of ${String(declared.length)} occur. Never written in a file: ${silentEvents.length === 0 ? "none" : silentEvents.map(code).join(", ")}.`, "");
	return lines.join("\n");
}

export function coverageText(root: string): string {
	const games = globSync("*/", { cwd: resolve(root, "oracles") })
		.map((folder) => folder.replace(/\/$/, ""))
		.filter((game) => globSync("*.json", { cwd: resolve(root, "oracles", game) }).length > 0)
		.sort();
	const head = [
		"# Oracle coverage",
		"",
		"Written by `scripts/export-oracles.ts` (`scripts/oracles/coverage.ts`); do not edit. Per game: every tool of its",
		"mechanics with the calls the files hold (accepted, and refused by code and stage), every refusal code the",
		"mechanics can give, and the event types that never occur. A code is listed for a game when a mechanic of the game",
		"has it in its source, whether or not a resident can reach it: many are behind the lock (a tool that is locked for",
		"a resident answers `TOOL_LOCKED` before the mechanic's own rule runs) or guard a caller that is no resident.",
		"",
		"The platform's own codes, by pipeline stage:",
		"",
		row(["Code", "Stage", "Meaning"]),
		row(["---", "---", "---"]),
		...PLATFORM_CODES.map(([name, stage, meaning]) => row([code(name), code(stage), meaning])),
		"",
	];
	return [...head, ...games.map((game) => gameSection(root, game))].join("\n");
}
