/**
 * The shared-API decisions of the integrator's round-2 pass (docs/design/carve-decisions.md,
 * R2-D1, R2-D5, R2-D8, R2-D11): the ledger opens accounts and books once per key, the Whispers
 * mechanics load together with `defy` owned by channels, the puzzles name their secrets, and every
 * phase of a hook the order table covers names its slot.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineCoreStory, defineMechanic, reply } from "@swarmtales/kernel";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { names } from "@swarmtales/mechanic-names";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { receipts } from "@swarmtales/mechanic-receipts";
import { LedgerApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import { whispers } from "@swarmtales/mechanic-whispers";
import { goldenLog, puzzleOptions, RESIDENTS, SEED, storyOf } from "./puzzles/harness.ts";

/** Books through the ledger as the script: opens, asks, mints twice with one key, books on an unopened account. */
const banker = defineMechanic(
	{ id: "banker", summary: "Calls the ledger.", options: Type.Object({}), state: () => undefined, events: {}, prompts: { "banker/tools/bank": [] }, requires: [LedgerApi] },
	(kit) => ({
		tools: [
			kit.tool({
				name: "bank",
				description: "banker/tools/bank",
				parameters: Type.Object({ step: Type.String() }),
				execute: ({ step }, ctx) => {
					const account = "escrow:Herald";
					if (step === "open") {
						const before = ctx.call(LedgerApi, "has", { account });
						ctx.call(LedgerApi, "open", { account });
						ctx.call(LedgerApi, "open", { account });
						return reply(`${String(before)}>${String(ctx.call(LedgerApi, "has", { account }))}:${String(ctx.call(LedgerApi, "balance", { account }))}`);
					}
					if (step === "mint") {
						ctx.call(LedgerApi, "mint", { account, amount: 5, reason: "escrow Herald", idempotencyKey: "escrow-Herald" });
						ctx.call(LedgerApi, "mint", { account, amount: 5, reason: "escrow Herald", idempotencyKey: "escrow-Herald" });
						const first = ctx.call(LedgerApi, "move", { from: account, to: "A01", amount: 2, reason: "pay", idempotencyKey: "pay-1" });
						const again = ctx.call(LedgerApi, "move", { from: account, to: "A01", amount: 2, reason: "pay", idempotencyKey: "pay-1" });
						return reply(`${String(ctx.call(LedgerApi, "balance", { account }))}|${JSON.stringify(first) === JSON.stringify(again) ? "same" : "differs"}`);
					}
					ctx.call(LedgerApi, "mint", { account: "GROUP:never-opened", amount: 1, reason: "x" });
					return reply("booked");
				},
			}),
		],
	}),
);

describe("the ledger's accounts (R2-D1)", () => {
	const story = defineCoreStory({ id: "bank", seed: 1, minutes: 1, residents: 2, mechanics: [ledger.with(), banker.with()], grants: { script: ["bank"] } });

	it("opens an account once, books once per idempotency key, and refuses an account nobody opened", async () => {
		const host = createHost({ story });
		host.start();
		expect(await host.call("script", "bank", { step: "open" })).toEqual({ ok: true, reply: "false>true:0" });
		expect(await host.call("script", "bank", { step: "mint" })).toEqual({ ok: true, reply: "3|same" });
		expect(JSON.stringify(host.snapshot().mechanics.ledger?.data)).toContain(JSON.stringify({ account: "escrow:Herald", balance: 3 }));
		await expect(host.call("script", "bank", { step: "unopened" })).rejects.toThrow(/Unknown account: GROUP:never-opened/);
	});
});

describe("the Whispers mechanics together (R2-D5)", () => {
	it("load, and `defy` with `gamemaker_defied` is channels' alone", () => {
		const story = defineCoreStory({
			id: "whispers",
			seed: 7,
			minutes: 2,
			residents: 6,
			mechanics: [names.with(), ledger.with({ startPoints: 10 }), channels.with({ defiance: true }), marks.with(), receipts.with({ quoteDms: true }), whispers.with()],
			grants: { resident: ["sendDM", "defy", "forgeReceipt", "nameFavourite", "showReceipt"] },
		});
		const host = createHost({ story });
		expect(host.toolSpecs("resident").map((spec) => spec.name)).toContain("defy");
		expect(whispers.events).not.toHaveProperty("gamemaker_defied");
		expect(channels.events).toHaveProperty("gamemaker_defied");
	});
});

describe("the puzzles' secrets (R2-D8)", () => {
	const reader = defineMechanic(
		{ id: "secret-reader", summary: "Reads the secrets in a fact.", options: Type.Object({}), state: () => undefined, events: {}, requires: [PuzzlesApi] },
		(kit) => ({ facts: { secrets: kit.fact(Type.Object({ passwords: Type.Array(Type.String()), numbers: Type.Array(Type.String()) }), (view) => view.call(PuzzlesApi, "secrets", {})) } }),
	);

	it("names every dealt password and deal value, ascending by level, as the old gamemaker's guard collected them", () => {
		const name = "cityofkeys-f4g4";
		const story = defineCoreStory({ id: name, seed: SEED, minutes: 3, residents: [...RESIDENTS], mechanics: [puzzles.with(puzzleOptions(storyOf(name))), reader.with()], grants: {} });
		const host = createHost({ story });
		host.start();
		const secrets = host.facts()["secret-reader.secrets"];
		const dealt = goldenLog(name).filter((line) => line.minute === 0);
		const fragments = dealt.flatMap((line) => (line.type === "fragments_dealt" && Array.isArray(line.holdings) ? line.holdings.map((holding: unknown) => (typeof holding === "object" && holding !== null && "fragment" in holding ? String(holding.fragment) : "")) : []));
		const cityFactors = dealt.flatMap((line) => (line.type === "factors_dealt" ? [String(line.cityFactor)] : []));
		expect(fragments.length).toBeGreaterThan(10);
		expect(cityFactors.length).toBeGreaterThan(0);
		if (typeof secrets !== "object" || secrets === null || !("passwords" in secrets) || !("numbers" in secrets) || !Array.isArray(secrets.passwords) || !Array.isArray(secrets.numbers)) throw new Error("no secrets fact");
		const passwords: readonly unknown[] = secrets.passwords;
		const numbers: readonly unknown[] = secrets.numbers;
		for (const fragment of fragments) expect(passwords.some((password) => typeof password === "string" && password.includes(fragment)), fragment).toBe(true);
		for (const factor of cityFactors) expect(numbers).toContain(factor);
		// Level order: the first level's password comes first, the first additive level's city factor before the next one's.
		expect(String(passwords[0])).toContain(fragments[0]);
		expect(numbers.indexOf(cityFactors[0])).toBeLessThan(numbers.indexOf(cityFactors.at(-1)));
	});
});

describe("the order rule of D-1 (R2-D11)", () => {
	const root = resolve(import.meta.dirname, "../../mechanics");
	/** Plain functions the round-3 briefs still have to give a slot: owner and hook. */
	const PENDING = ["whispers:minuteEnded"];

	it("gives every phase of a hook the order table covers its slot (a plain function is order 0)", () => {
		const plain = readdirSync(root).flatMap((id) => {
			const dir = join(root, id, "src");
			let files: readonly string[];
			try {
				files = readdirSync(dir).filter((file) => file.endsWith(".ts"));
			} catch {
				return [];
			}
			return files.flatMap((file) =>
				readFileSync(join(dir, file), "utf8")
					.split("\n")
					.flatMap((line) => {
						const found = /^\s+(runStarted|runResumed|minuteStarted|turnInputs|minuteEnded|runEnded): *\(/.exec(line);
						return found === null ? [] : [`${id}:${found[1] ?? ""}`];
					}),
			);
		});
		expect(plain.filter((entry) => !PENDING.includes(entry))).toEqual([]);
		for (const entry of PENDING) expect(plain, `${entry} has its slot now; drop it from PENDING`).toContain(entry);
	});
});
