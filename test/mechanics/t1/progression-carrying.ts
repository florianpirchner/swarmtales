/**
 * The progression stand-in of the T1 resume tests: what the T2 resume harness's `progressionCarrying`
 * does (it replays the old continuation's doors, city posts and notices, and answers the levels of
 * the snapshot), plus the parts of `ProgressionApi` that blame reads: the ranking (the old
 * `ranking()`) and a blame ladder that prices nothing (the old side runs with a ladder of 0).
 * Copied from test/mechanics/channels/resume.ts, which is team T2's and not edited here.
 */
import { Type } from "typebox";
import type { MechanicUse } from "@swarmtales/contracts";
import { defineMechanic } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, HOOK_ORDER, LedgerApi, ProgressionApi, ProgressionEvents } from "@swarmtales/mechanic-shared";

interface Line { readonly type: string; readonly [field: string]: unknown }

/** A delivery notice is channels' own (it follows the DM). */
const DELIVERY = /^DM #\d+ delivered to /;

export function progressionForBlame(lines: readonly Line[], levels: Record<string, number>): MechanicUse {
	const opening = new Set<string>();
	const before: Line[] = [];
	const after: Line[] = [];
	// The last turn ends with its `usage` line; what follows is the end of the run (the act's end).
	const lastUsage = lines.map((line) => line.type).lastIndexOf("usage");
	for (const [index, line] of lines.entries()) {
		if (line.type === "round_start") opening.add(String(line.minute));
		else if (index > lastUsage) after.push(line);
		else if (!opening.has(String(line.minute))) before.push(line);
	}
	return defineMechanic(
		{ id: "progression", summary: "Replays the doors', the script's and the director's lines of an old run.", options: Type.Object({}), state: (): undefined => undefined, events: ProgressionEvents.events, provides: [ProgressionApi], requires: [ChannelsApi], uses: [LedgerApi, ExileApi], prompts: { "tools/readBoard": [] } },
		(kit) => {
			type Ctx = Parameters<Parameters<typeof kit.listen<typeof ProgressionEvents, "act_ended">>[2]>[1];
			const replay = (list: readonly Line[], ctx: Pick<Ctx, "call">, minute?: number): void => {
				for (const line of list) {
					if (minute !== undefined && line.minute !== minute) continue;
					if (line.type === "board_post" && line.kind === "city") ctx.call(ChannelsApi, "post", { author: String(line.author), text: String(line.text) });
					else if (line.type === "notice" && !DELIVERY.test(String(line.text))) ctx.call(ChannelsApi, "notify", { to: String(line.to), author: String(line.author), text: String(line.text) });
				}
			};
			return {
				services: [
					kit.provideSome(ProgressionApi, {
						levelOf: (input) => levels[input.resident] ?? 1,
						currentAct: () => 1,
						firstSolveMinute: () => null,
						hasPassed: (input) => (levels[input.resident] ?? 1) > input.level,
						// The old `ranking()`: the exiled last, then points, level and id.
						ranking: (_input, ctx) => {
							const balances = ctx.tryCall(LedgerApi, "balances", {}) ?? {};
							const exiled = (resident: string): number => (ctx.tryCall(ExileApi, "isExiled", { resident }) === true ? 1 : 0);
							const level = (resident: string): number => levels[resident] ?? 1;
							return [...ctx.residents.ids]
								.sort((a, b) => exiled(a) - exiled(b) || (balances[b] ?? 0) - (balances[a] ?? 0) || level(b) - level(a) || a.localeCompare(b))
								.map((agent, index) => ({ agent, rank: index + 1, points: balances[agent] ?? 0, level: level(agent) }));
						},
						nextBlamePenalty: () => 0,
						chargeBlame: () => 0,
					}),
				],
				hooks: {
					minuteStarted: {
						order: HOOK_ORDER.minuteStarted.script,
						run: (ctx) => {
							// The doors open silently in the old log; the level a resident is told in its first status line of the minute is the one it has.
							for (const line of lines) {
								if (line.minute !== ctx.minute || line.type !== "turn_input") continue;
								const agent = String(line.agent);
								const told = /\blevel (\d+)\b/.exec(String(Array.isArray(line.inputs) ? line.inputs[0] : ""));
								const level = Number(told?.[1] ?? levels[agent]);
								if (level === levels[agent]) continue;
								ctx.emit("level_up", { agent, from: levels[agent] ?? 1, to: level });
								levels[agent] = level;
								ctx.emit("level_entered", { agent, level });
							}
							replay(before, ctx, ctx.minute);
						},
					},
					runEnded: {
						order: HOOK_ORDER.runEnded.progression,
						run: (_reason, ctx) => {
							replay(after, ctx);
						},
					},
				},
			};
		},
	).with();
}
