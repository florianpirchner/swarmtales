/**
 * Differential tests of the API methods other mechanics call (docs/design/carve-round2-T3.md): the
 * pieces a resident holds for others, the release of the city factor and the unlocking of tools,
 * answered by the new host and by the old `World` for the same state, minute by minute.
 */
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { t3Probe } from "./probes.ts";
import { Twin } from "./twin.ts";

const Revealed = Type.Union([Type.Object({ ok: Type.Literal(true), agents: Type.Array(Type.String()) }), Type.Object({ ok: Type.Literal(false), code: Type.String(), detail: Type.String() })]);
const TOOLS = ["probeHeldPieces", "probeReveal", "probeUnlock"];

async function script(twin: Twin, tool: string, params: unknown): Promise<string> {
	const outcome = await twin.host.call("script", tool, params);
	if (!outcome.ok) throw new Error(`${tool}: ${outcome.code}`);
	return outcome.reply;
}

/** The pieces every resident holds for others: the new host's answer equals the old world's. */
async function expectSamePieces(twin: Twin): Promise<number> {
	let held = 0;
	for (const resident of twin.ids) {
		const now: unknown = JSON.parse(await script(twin, "probeHeldPieces", { resident }));
		const old: unknown = JSON.parse(JSON.stringify(twin.world.heldPieces(resident)));
		expect(now, `pieces of ${resident}`).toEqual(old);
		held += twin.world.heldPieces(resident).length;
	}
	return held;
}

describe("twin: puzzles and progression services against the old engine", () => {
	it("heldPieces, revealFactor and unlock answer as the old world does", async () => {
		const twin = new Twin({ story: cityOfKeys, extra: [t3Probe().with()], scriptTools: TOOLS });
		let pieces = 0;
		const reveals: string[] = [];
		for (let minute = 0; minute < 12; minute++) {
			await twin.minuteWith(async () => {
				pieces += await expectSamePieces(twin);
				for (const id of twin.ids) {
					if (twin.world.isFinished(id)) continue;
					const level = twin.world.levelOf(id);
					await twin.same(id, "submitSolution", { level, code: twin.codeOf(id, level) });
				}
				if (minute === 7 || minute === 8) {
					// The city factor of the level that opens: the board, then (per-team levels refuse the board) a notice to some residents.
					for (const level of [8, 9, 10, 99]) {
						for (const target of ["board" as const, twin.ids.slice(0, 3)]) {
							const old = twin.world.revealFactor(level, target);
							const now = Parse(Revealed, JSON.parse(await script(twin, "probeReveal", { level, target })));
							expect(now.ok, `level ${level} ${JSON.stringify(target)}`).toBe(old.ok);
							if (now.ok && old.ok) expect(now.agents).toEqual([...old.value]);
							if (!now.ok && !old.ok) {
								expect(now.code).toBe(old.error);
								reveals.push(now.code);
							}
						}
					}
				}
				if (minute === 3) {
					twin.world.unlockTools("A02", ["setTreasurer", "blame"]);
					await script(twin, "probeUnlock", { resident: "A02", tools: ["setTreasurer", "blame"] });
					await twin.same("A02", "getStatus", {});
					await twin.same("A02", "activeTools", {});
				}
			});
			twin.expectSameLog();
			twin.expectSameState();
		}
		expect(pieces).toBeGreaterThan(0);
		expect(reveals.length).toBeGreaterThan(0);
		expect(twin.logs().old.some((line) => line.includes("factor_revealed"))).toBe(true);
		expect(twin.logs().old.some((line) => line.includes("tools_unlocked"))).toBe(true);
	});
});
