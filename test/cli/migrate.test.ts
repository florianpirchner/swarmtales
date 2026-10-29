import { describe, expect, it } from "vitest";
import { parseStartArgs } from "../../src/cli/args.ts";
import { migrateJson, migrateProse } from "../../src/cli/migrate-gamemaker.ts";

describe("the gamemaker rename", () => {
	it("renames keys and event types in recorded JSON, not what a resident wrote", () => {
		const line = '{"type":"gamemaster_note","text":"the game master says hi","gamemaster":{"notes":[]}}';
		expect(migrateJson(line)).toBe('{"type":"gamemaker_note","text":"the game master says hi","gamemaker":{"notes":[]}}');
		expect(migrateJson(migrateJson(line))).toBe(migrateJson(line));
		expect(migrateProse("The Game master and the game master's notes")).toBe("The Gamemaker and the gamemaker's notes");
	});

	it("still accepts the old flags", () => {
		expect(parseStartArgs(["--no-gamemaster"])).toMatchObject({ overrides: { gamemaker: false } });
		expect(parseStartArgs(["--gamemaster-provider", "anthropic", "--gamemaster-model", "sonnet"])).toMatchObject({ gamemakerProvider: "anthropic", gamemakerModel: "sonnet" });
	});
});
