/**
 * The holdout tribunal's tools: the residents' secret ballot (old tools/whispers.ts `tribunalVote`)
 * and the gamemaker's four moves (old gamemaker.ts `#callTribunalTool`, `#drawLotTool`,
 * `#announceTool`, `#permaDeathTool`). Each gamemaker text goes through the note desk (D-7): the old
 * `#checked(text, "board", "tribunal")` is `NotesApi.check` in `rule`, and the old `#deliver` is
 * `NotesApi.record` after the post, under the message number the post took.
 */
import { Type } from "typebox";
import type { MechanicKit, ShapeOf } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/kernel";
import { ChannelsApi, NamesApi, NotesApi } from "@swarmtales/mechanic-shared";
import type { ToolCtx, standoffTribunalWorkHead } from "./head.ts";
import { courtFor } from "./ports.ts";

type Kit = MechanicKit<ShapeOf<typeof standoffTribunalWorkHead>>;

/** The old note cap of the gamemaker's texts (system-prompt.ts `MAX_NOTE_LENGTH`), for the parameter descriptions. */
const MAX_NOTE_LENGTH = 400;

/** A name or id as the resident it stands for (old `resolveResident`), trimmed. */
function resolve(ctx: ToolCtx, text: string): string {
	const trimmed = text.trim();
	return ctx.tryCall(NamesApi, "resolve", { text: trimmed }) ?? trimmed;
}

/** Names or IDs as residents; the first unknown one is the refusal (old `#residentIds`). */
function residentIds(ctx: ToolCtx, names: readonly string[]): { readonly ok: true; readonly ids: readonly string[] } | { readonly ok: false; readonly unknown: string } {
	const ids = names.map((name) => resolve(ctx, name));
	const unknown = ids.find((id) => !ctx.residents.has(id));
	return unknown === undefined ? { ok: true, ids } : { ok: false, unknown };
}

/** The old `#checked(text, "board", "tribunal")`: the trimmed text, or the desk's refusal. */
function checked(ctx: ToolCtx, text: string): { readonly ok: true; readonly text: string } | { readonly ok: false; readonly code: string; readonly detail: string } {
	return ctx.call(NotesApi, "check", { text, to: "board", as: "tribunal" });
}

function checkRule(ctx: ToolCtx, text: string) {
	const result = checked(ctx, text);
	return result.ok ? undefined : refuse(result.code, result.detail);
}

/** The old `#deliver("tribunal", text, before + 1, "board")`: the note under the number the city's post took. */
function record(ctx: ToolCtx, text: string, before: number): void {
	ctx.call(NotesApi, "record", { to: "tribunal", text, number: before + 1, shown: "board" });
}

export function residentTools(kit: Kit) {
	return [
		kit.tool({
			name: "tribunalVote",
			description: "tools/tribunalVote",
			parameters: Type.Object({ yes: Type.Boolean({ description: "true: banish the accused; false: keep it" }) }),
			suggest: ["resident"],
			serves: ["resident"],
			execute: ({ yes }, ctx) => {
				const agent = ctx.resident;
				if (agent === undefined) return refuse("NO_RESIDENT");
				const result = courtFor(ctx).vote(agent, yes);
				if (!result.ok) return refuse(result.error, result.detail);
				const { accused, until, number } = result.value;
				return reply(ctx.prompt("replies/ballot-holdout", { vote: ctx.prompt(yes ? "replies/ballot-yes" : "replies/ballot-no", {}), accused, number, until }));
			},
		}),
	];
}

export function gamemakerTools(kit: Kit) {
	return [
		kit.tool({
			name: "callTribunal",
			description: "gamemaker/tools/callTribunal",
			parameters: Type.Object({
				accused: Type.Array(Type.String({ description: "Resident name or ID, e.g. A04" }), {
					description: "Residents the report names as blockers; when it names more than one, the city draws the accused by lot among all of them",
					minItems: 1,
					maxItems: 12,
				}),
				reason: Type.String({ description: `Your public announcement, 1-${String(MAX_NOTE_LENGTH)} characters; the city adds the procedure` }),
			}),
			suggest: ["gamemaker"],
			serves: ["gamemaker"],
			rule: ({ reason }, ctx) => checkRule(ctx, reason),
			execute: ({ accused, reason }, ctx) => {
				const announcement = checked(ctx, reason);
				if (!announcement.ok) return refuse(announcement.code, announcement.detail);
				const ids = residentIds(ctx, accused);
				if (!ids.ok) return refuse("UNKNOWN_AGENT", ids.unknown);
				const before = ctx.call(ChannelsApi, "lastNumber", {});
				const called = courtFor(ctx).call(ids.ids, announcement.text, ctx.options.author);
				if (!called.ok) return refuse(called.error, called.detail);
				record(ctx, announcement.text, before);
				const { value } = called;
				const lot = value.candidates === undefined ? "" : ` ${ctx.prompt("gamemaker/replies/tribunal-lot", { candidates: value.candidates.join(", "), accused: value.accused })}`;
				return reply(ctx.prompt("gamemaker/replies/tribunal-called", { accused: value.accused, lot, door: value.door, until: value.until, lacking: value.lacking.join(", ") }));
			},
		}),
		kit.tool({
			name: "drawLot",
			description: "gamemaker/tools/drawLot",
			parameters: Type.Object({
				candidates: Type.Array(Type.String({ description: "Resident name or ID" }), { description: "After the last vote of a tribunal failed: every resident in the city", minItems: 1, maxItems: 96 }),
			}),
			suggest: ["gamemaker"],
			serves: ["gamemaker"],
			execute: ({ candidates }, ctx) => {
				const ids = residentIds(ctx, candidates);
				if (!ids.ok) return refuse("UNKNOWN_AGENT", ids.unknown);
				const drawn = courtFor(ctx).drawLot(ids.ids);
				if (!drawn.ok) return refuse(drawn.error, drawn.detail);
				return reply(ctx.prompt("gamemaker/replies/lot-drawn", { drawn: drawn.value.drawn }));
			},
		}),
		kit.tool({
			name: "announceTribunal",
			description: "gamemaker/tools/announceTribunal",
			parameters: Type.Object({ text: Type.String({ description: `The outcome in your words, 1-${String(MAX_NOTE_LENGTH)} characters` }) }),
			suggest: ["gamemaker"],
			serves: ["gamemaker"],
			rule: ({ text }, ctx) => checkRule(ctx, text),
			execute: ({ text }, ctx) => {
				const words = checked(ctx, text);
				if (!words.ok) return refuse(words.code, words.detail);
				const before = ctx.call(ChannelsApi, "lastNumber", {});
				const announced = courtFor(ctx).announce(words.text, ctx.options.author);
				if (!announced.ok) return refuse(announced.error, announced.detail);
				record(ctx, words.text, before);
				return reply(ctx.prompt("gamemaker/replies/announced", { value: announced.value }));
			},
		}),
		kit.tool({
			name: "permaDeath",
			description: "gamemaker/tools/permaDeath",
			parameters: Type.Object({
				agent: Type.String({ description: "The banished accused, or the resident the lot drew; name or ID" }),
				reason: Type.String({ description: `Your public line on the board, 1-${String(MAX_NOTE_LENGTH)} characters` }),
			}),
			suggest: ["gamemaker"],
			serves: ["gamemaker"],
			rule: ({ reason }, ctx) => checkRule(ctx, reason),
			execute: ({ agent, reason }, ctx) => {
				const line = checked(ctx, reason);
				if (!line.ok) return refuse(line.code, line.detail);
				const id = resolve(ctx, agent);
				if (!ctx.residents.has(id)) return refuse("UNKNOWN_AGENT", id);
				const before = ctx.call(ChannelsApi, "lastNumber", {});
				const struck = courtFor(ctx).permaDeath(id, line.text, ctx.options.author);
				if (!struck.ok) return refuse(struck.error, struck.detail);
				record(ctx, line.text, before);
				const how = ctx.prompt(struck.value.by === "lot" ? "gamemaker/replies/struck-lot" : "gamemaker/replies/struck-vote", {});
				return reply(ctx.prompt("gamemaker/replies/struck", { agent: struck.value.agent, how }));
			},
		}),
	];
}
