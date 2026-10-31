/**
 * The per-mechanic golden gate of channels: every golden log, replayed on the new host with
 * stand-in providers (see `replay.ts` for what the replay keeps and what it leaves to the turn loop).
 */
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readLegacyLog } from "@swarmtales/testkit";
import { replayChannels } from "./replay.ts";

const GOLDEN = join(resolve(import.meta.dirname, "../../.."), "test", "golden");

describe("golden gate: channels (marks, receipts, names stand in)", () => {
	for (const name of ["cityofkeys-f4g4", "cityofkeys-f10g10", "whispers-f10-grudge"]) {
		it(`reproduces the channel lines and replies of ${name}`, async () => {
			const result = await replayChannels(readLegacyLog(join(GOLDEN, `${name}.events.jsonl`)), 6);
			expect(result.calls).toBeGreaterThan(0);
			expect(result.replyMismatches).toEqual([]);
			for (const stream of result.streams) {
				expect(stream.mismatch, `${stream.name}: ${JSON.stringify(stream.mismatch)}`).toBeUndefined();
				expect(stream.actual.length, stream.name).toBe(stream.expected.length);
			}
		});
	}
});
