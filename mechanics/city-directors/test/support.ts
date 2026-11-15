// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Test support: a prompt lookup over this package's `prompts/` folder that parses and renders a file as the prompts
 * package does (a mechanic's test may not import it), the old setup files of the two games, and the old fixtures.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PromptLookup } from "@swarmtales/contracts";
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";

const ROOT = join(import.meta.dirname, "..");
const REPO = join(ROOT, "..", "..");

/** The lookup: frontmatter `id` and `variables`, the body without its last newline, `{{name}}` replaced. */
export const lookup: PromptLookup = {
	render(owner, id, variables, declared) {
		if (owner !== "city-directors") throw new RangeError(`no folder for ${owner}`);
		const lines = readFileSync(join(ROOT, "prompts", `${id}.md`), "utf8").split("\n");
		const end = lines.indexOf("---", 1);
		const fields = new Map(lines.slice(1, end).map((line) => [line.slice(0, line.indexOf(":")).trim(), line.slice(line.indexOf(":") + 1).trim()]));
		const names = (fields.get("variables") ?? "").split(",").map((name) => name.trim()).filter((name) => name.length > 0);
		if (fields.get("id") !== id || names.join() !== [...declared].join()) throw new RangeError(`${id}: declares ${names.join()}, asked ${declared.join()}`);
		const raw = lines.slice(end + 1).join("\n");
		const body = raw.endsWith("\n") ? raw.slice(0, -1) : raw;
		return body.replace(/\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g, (_match, name: string) => String(variables[name]));
	},
};

const Role = Type.Object({ fromLevel: Type.Integer(), role: Type.Union([Type.Literal("coach"), Type.Literal("director"), Type.Literal("keeper")]) });
const Setup = Type.Object({
	city: Type.String(),
	run: Type.Object({ survivors: Type.Integer() }),
	rules: Type.Object({ penalty: Type.Array(Type.Integer()), ultimatum: Type.Optional(Type.Object({ penalty: Type.Integer(), maxMinutes: Type.Integer() })) }),
	gamemaker: Type.Object({ author: Type.String(), every: Type.Integer(), notesPerAgent: Type.Integer(), boardPosts: Type.Integer(), windowMinutes: Type.Integer(), brief: Type.String(), roles: Type.Array(Role) }),
	holdout: Type.Optional(Type.Object({ stallMinutes: Type.Integer(), graceMinutes: Type.Integer(), voteMinutes: Type.Integer(), maxVotes: Type.Integer(), fallbackMinutes: Type.Integer() })),
	tribunal: Type.Optional(Type.Object({ factions: Type.Optional(Type.Unknown()) })),
	goals: Type.Optional(Type.Unknown()),
	seal: Type.Optional(Type.Unknown()),
	coreMotives: Type.Optional(
		Type.Object({
			figures: Type.Optional(Type.Array(
				Type.Object({
					id: Type.String(),
					direction: Type.Optional(Type.Object({ tendencies: Type.Array(Type.String()), orders: Type.Array(Type.String()), duty: Type.Optional(Type.String()), rivals: Type.Array(Type.Object({ figure: Type.String(), text: Type.String() })) })),
				}),
			)),
		}),
	),
	whisperer: Type.Optional(Type.Object({ direction: Type.Optional(Type.Object({ quota: Type.Optional(Type.Unknown()) })) })),
});

/** The parts of an old setup file (`oracles/<game>/setup/<name>.story.json`) the gamemaker's tests read. */
export type OldSetup = Static<typeof Setup>;

/** Reads an old setup file of the repository. */
export function oldSetup(path: string): OldSetup {
	const value: unknown = JSON.parse(readFileSync(join(REPO, path), "utf8"));
	return Parse(Setup, value);
}

const Fixture = Type.Object({ system: Type.Record(Type.String(), Type.String()), firstLook: Type.Record(Type.String(), Type.String()) });

/** The old system texts and first looks of the three golden runs of `legacy` (`test/fixtures/old-gamemaker.json`). */
export const OLD: Static<typeof Fixture> = Parse(Fixture, JSON.parse(readFileSync(join(ROOT, "test", "fixtures", "old-gamemaker.json"), "utf8")));
