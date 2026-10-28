/**
 * Readable transcript per competitor: `agents/<id>.md`. Inputs, reasoning,
 * text, tool calls and results are written in full, never truncated.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { CompetitorId } from "../core/ids.ts";
import { assertNever } from "../core/result.ts";
import type { EventSink, RecordedEvent } from "../engine/events.ts";

/** Transcript file of the game master (`agents/GM.md`). */
const GAMEMASTER_FILE = "GM";

export class AgentTranscriptLog implements EventSink {
	readonly #lastTools = new Map<CompetitorId, string>();
	readonly #agents = new Set<CompetitorId>();

	constructor(readonly directory: string) {
		mkdirSync(directory, { recursive: true });
	}

	pathFor(agent: CompetitorId): string {
		return join(this.directory, `${agent.replace(/[^A-Za-z0-9_-]/g, "_")}.md`);
	}

	record(event: RecordedEvent): void {
		switch (event.type) {
			case "run_start": {
				const meta =
					event.meta === undefined
						? ""
						: `\n\n${Object.entries(event.meta)
								.map(([key, value]) => `- ${key}: ${value}`)
								.join("\n")}`;
				for (const agent of event.agents) {
					this.#agents.add(agent);
					this.#write(agent, `# ${agent}\n\n${event.story} · ${event.agents.length} competitors · ${event.minutes} minutes${meta}\n`);
				}
				return;
			}
			case "run_resumed":
				for (const agent of this.#agents) {
					this.#write(agent, `\n---\n\n_Resumed from ${event.snapshot} after round ${event.round} (every competitor past level ${event.level}); the context above carries on._\n`);
				}
				return;
			case "turn_input":
				this.#write(event.agent, `\n## Minute ${event.minute}${event.pass === undefined ? "" : `, pass ${event.pass}`}\n\n**Input**\n${event.inputs.map(quote).join("\n")}\n`);
				return;
			case "request": {
				const tools = event.tools.join(", ");
				if (this.#lastTools.get(event.agent) === tools) return;
				this.#lastTools.set(event.agent, tools);
				this.#write(event.agent, `\n**Unlocked tools:** ${tools}\n`);
				return;
			}
			case "thinking":
				this.#write(event.agent, `\n**Reasoning**\n${quote(event.text)}\n`);
				return;
			case "text":
				this.#write(event.agent, `\n**Text**\n\n${event.text}\n`);
				return;
			case "tool_call":
				this.#write(event.agent, `\n**Tool \`${event.tool}\`**\n\n\`\`\`json\n${JSON.stringify(event.args, null, 2)}\n\`\`\`\n`);
				return;
			case "tool_result":
				this.#write(event.agent, `\n-> ${event.isError ? "(error) " : ""}${event.text}\n`);
				return;
			case "turn_error":
				this.#write(event.agent, `\n**Turn error:** ${event.message}\n`);
				return;
			case "run_end": {
				const reason = event.reason === undefined ? "" : `\n\nReason: ${event.reason}`;
				for (const agent of this.#agents) this.#write(agent, `\n---\n\n_End of run._${reason}\n`);
				return;
			}
			case "gamemaster_turn":
				this.#write(GAMEMASTER_FILE, `\n## Minute ${event.minute} (after round ${event.round})\n\n**Situation**\n${quote(event.input)}\n`);
				return;
			case "gamemaster_text":
				this.#write(GAMEMASTER_FILE, `\n**Text**\n\n${event.text}\n`);
				return;
			case "gamemaster_call":
				this.#write(GAMEMASTER_FILE, `\n**Tool \`${event.tool}\`**\n\n\`\`\`json\n${JSON.stringify(event.args, null, 2)}\n\`\`\`\n`);
				return;
			case "gamemaster_result":
				this.#write(GAMEMASTER_FILE, `\n-> ${event.isError ? "(error) " : ""}${event.text}\n`);
				return;
			case "gamemaster_error":
				this.#write(GAMEMASTER_FILE, `\n**Error:** ${event.message}\n`);
				return;
			case "agent_profile":
				this.#write(
					event.agent,
					`\n- model: ${event.provider}/${event.model}\n- persona: ${event.persona ?? "none (control group)"}\n`,
				);
				return;
			case "round_start":
			case "pass_start":
			case "round_end":
			case "interpretation":
			case "interpretation_round":
			case "interpretation_error":
			case "turn_skipped":
			case "usage":
			case "ledger_entry":
			case "submission":
			case "level_up":
			case "board_post":
			case "dm_sent":
			case "dm_delivered":
			case "blame":
			case "tribunal_announced":
			case "tribunal_scheduled":
			case "tribunal_cancelled":
			case "tribunal_called":
			case "faction_nominated":
			case "faction_leaders":
			case "faction_applied":
			case "faction_refused":
			case "factions_formed":
			case "bloc_result":
			case "group_removed":
			case "tribunal_opened":
			case "tribunal_vote":
			case "tribunal_result":
			case "exile_gate":
			case "ransom_paid":
			case "ransomed":
			case "exiled":
			case "act_brake":
			case "name_chosen":
			case "last_will":
			case "factor_burned":
			case "level_contracted":
			case "notice":
			case "marks_spent":
			case "group_created":
			case "group_membership":
			case "group_post":
			case "treasurer_set":
			case "transfer":
			case "tools_unlocked":
			case "director_action":
			case "treasury_settled":
			case "director_skipped":
			case "cast_level_set":
			case "cast_revealed":
			case "cast_retired":
			case "cast_dm":
			case "collection_started":
			case "collection_revealed":
			case "lottery_drawn":
			case "receipt_issued":
			case "receipt_shown":
			case "petition_opened":
			case "petition_signed":
			case "petition_resolved":
			case "fragments_dealt":
			case "factors_dealt":
			case "factor_revealed":
			case "treasury_deposit":
			case "treasury_withdrawal":
			case "standings_published":
			case "gamemaster_note":
				return;
			default:
				assertNever(event, "event");
		}
	}

	#write(agent: CompetitorId, text: string): void {
		appendFileSync(this.pathFor(agent), text);
	}
}

/** Every line as a blockquote, keeping agent text apart from document structure. */
function quote(text: string): string {
	return text
		.split(/\r?\n/)
		.map((line) => `> ${line}`)
		.join("\n");
}
