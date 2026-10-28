/**
 * Event sinks. Log sinks are the only code allowed to stamp wall-clock time.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { assertNever } from "../core/result.ts";
import type { EventSink, RecordedEvent } from "../engine/events.ts";

/** `events.jsonl`: every event with `seq`, virtual minute and wall-clock time. */
export class JsonlEventLog implements EventSink {
	constructor(readonly path: string) {
		mkdirSync(dirname(path), { recursive: true });
	}

	record(event: RecordedEvent): void {
		appendFileSync(this.path, `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`);
	}
}

/** Human-readable live view. */
export class ConsoleReporter implements EventSink {
	readonly #write: (line: string) => void;

	constructor(write: (line: string) => void = (line) => { process.stdout.write(`${line}\n`); }) {
		this.#write = write;
	}

	record(event: RecordedEvent): void {
		const line = describeEvent(event);
		if (line !== undefined) this.#write(line);
	}

	/** A resumed run's prefix was shown when it was played; `run_resumed` says where it ends. */
	replay(): void {
		// Nothing to show.
	}
}

/** One console line per event, or `undefined` for events not worth showing live. */
export function describeEvent(event: RecordedEvent): string | undefined {
	switch (event.type) {
		case "run_start":
			return `> ${event.story}: ${event.agents.join(", ")} · ${event.minutes} minutes · seed ${event.seed}`;
		case "run_resumed":
			return `> resumed from ${event.snapshot}: every competitor past level ${event.level}, continuing after round ${event.round} of ${event.minutes} minutes`;
		case "round_start":
			return event.order === undefined ? `\n-- minute ${event.minute} --` : `\n-- minute ${event.minute} (order ${event.order.join(" ")}) --`;
		case "pass_start":
			return `  -- pass ${event.pass}: ${event.blocks.map((block) => block.join(" ")).join(" | ")} --`;
		case "turn_input":
			return event.inputs.map((input) => `  ${event.agent} <- ${input}`).join("\n");
		case "turn_skipped":
			return `  ${event.agent} (skipped, nothing new)`;
		case "thinking":
			return `  ${event.agent} thinks: ${event.text}`;
		case "text":
			return `  ${event.agent} says: ${event.text}`;
		case "tool_call":
			return `  ${event.agent} calls ${event.tool} ${JSON.stringify(event.args)}`;
		case "tool_result":
			return `  ${event.agent} ${event.isError ? "x" : "->"} ${event.text}`;
		case "turn_error":
			return `  ${event.agent} error: ${event.message}`;
		case "board_post":
			return `  [board #${event.postSeq}] ${event.author}: ${event.text}`;
		case "level_up":
			return `  ${event.agent} reached level ${event.to}`;
		case "director_action":
			return `  (director ${event.rule}${event.via === undefined ? "" : ` / ${event.via}`}: ${event.action}${event.audit === undefined ? "" : ` [${event.audit}]`})`;
		case "director_skipped":
			return `  (director ${event.rule}: ${event.action} skipped, ${event.reason})`;
		case "agent_profile":
			return `  ${event.agent}: ${event.provider}/${event.model}${event.persona === undefined ? "" : ` · persona ${event.persona}`}`;
		case "receipt_shown":
			return `  ${event.by} shows ${event.receipt}${event.to === undefined ? "" : ` privately to ${event.to}`}`;
		case "petition_signed":
			return `  ${event.agent} signs petition ${event.petition} (${event.signatures})`;
		case "petition_resolved":
			return `  petition ${event.petition} ${event.outcome} (${event.signatures} signatures)`;
		case "tribunal_opened":
			return `  (tribunal: ${event.accused.join(", ")} accused, vote until minute ${event.until})`;
		case "tribunal_result":
			return `  (tribunal result: ${event.counts.map((entry) => `${entry.agent} ${entry.votes}`).join(", ")}; to the gate: ${event.exiled.join(", ") || "nobody"})`;
		case "exile_gate":
			return `  (${event.agent} at the gate until minute ${event.until}${event.ransomable ? `, ransom ${event.price} or ${event.selfPrice} by itself` : ", no ransom"})`;
		case "ransom_paid":
			return `  (${event.payer} pays ${event.amount} toward ${event.target}'s ransom, ${event.covered}% covered)`;
		case "ransomed":
			return `  (${event.agent} bought back by ${event.payers.join(", ")})`;
		case "exiled":
			return `  (${event.agent} exiled)`;
		case "act_brake":
			return `  (${event.act}: brake after ${event.maxMinutes} minutes; behind: ${event.behind.map((entry) => `${entry.agent} on ${entry.level}`).join(", ")}${event.snapshot === true ? "; checkpoint written" : ""})`;
		case "name_chosen":
			return `  (${event.agent} is called ${event.name}${event.fallback ? ", given by the city" : ""})`;
		case "last_will":
			return `  (${event.agent} leaves a will: ${event.bequests.length} bequests)`;
		case "factor_burned":
			return `  (${event.agent}'s ${event.piece} burned; needed by ${event.needers.join(", ")})`;
		case "level_contracted":
			return `  (level ${event.level} passes on the roles of ${event.excluded.join(", ")})`;
		case "tribunal_scheduled":
			return `  (tribunal ${event.tribunal} planned by ${event.by}: opens at minute ${event.opens}, called at ${event.calledAt}, exiles ${event.count}, ${event.factions} factions${event.reason === undefined ? "" : `; ${event.reason}`})`;
		case "tribunal_cancelled":
			return `  (tribunal ${event.tribunal} called off: ${event.reason})`;
		case "tribunal_called":
			return `  (tribunal ${event.tribunal} called: opens at minute ${event.opens}, exiles ${event.count}${event.group === undefined ? "" : `, draft in ${event.group}`})`;
		case "faction_leaders":
			return `  (tribunal ${event.tribunal} leaders: ${event.leaders.join(", ")})`;
		case "factions_formed":
			return `  (tribunal ${event.tribunal} factions: ${event.factions.map((faction) => `${faction.leader}: ${faction.members.join(", ")}`).join("; ")}${event.without.length === 0 ? "" : `; without: ${event.without.join(", ")}`})`;
		case "bloc_result":
			return `  (faction of ${event.leader} ${event.united ? `voted as one (+${event.bonus})` : "split"}${event.defectors.length === 0 ? "" : `; defectors: ${event.defectors.join(", ")}`})`;
		case "group_removed":
			return `  (the city removed group ${event.group})`;
		case "seal_auction_opened":
			return `  (black seal ${event.seal}: bidding open until minute ${event.until})`;
		case "seal_won":
			return `  (black seal ${event.seal} won by ${event.agent} for ${event.bid}; ${event.bids.length} bids paid)`;
		case "seal_used":
			return `  (${event.holder} broke black seal ${event.seal} on ${event.target})`;
		case "seal_expired":
			return `  (black seal ${event.seal} gone: ${event.reason})`;
		case "goal_resolved":
			return `  (${event.agent}'s goal ${event.void === true ? "void" : event.fulfilled ? `fulfilled, +${event.bonus}` : "missed"})`;
		case "tribunal_announced":
		case "tribunal_vote":
		case "faction_nominated":
		case "faction_applied":
		case "faction_refused":
		case "seal_bid":
		case "core_dealt":
		case "goal_dealt":
			return undefined;
		case "blame":
			return `  (${event.caller} blames ${event.accused}: DM #${event.dm} vs message #${event.claim}, ${event.outcome}${event.outcome === "upheld" ? "" : `, -${event.penalty}`})`;
		case "factor_revealed":
			return `  (city factor of level ${event.level} released ${event.target === "board" ? "on the board" : `to ${event.agents.join(", ")}`})`;
		case "cast_dm":
			return `  ${event.from} -> ${event.cast} (DM${event.collections.length === 0 ? ", recorded" : `, collected into ${event.collections.join(", ")}`})`;
		case "gamemaster_text":
			return `  GM thinks aloud: ${event.text}`;
		case "gamemaster_call":
			return `  GM calls ${event.tool} ${JSON.stringify(event.args)}`;
		case "gamemaster_result":
			return `  GM ${event.isError ? "x" : "->"} ${event.text}`;
		case "gamemaster_error":
			return `  GM error: ${event.message}`;
		case "interpretation":
			return `  (${event.agent} #${event.ref} ${event.source}: ${event.labels.join(", ")}${event.targets.length === 0 ? "" : ` -> ${event.targets.join(", ")}`})`;
		case "interpretation_error":
			return `  classifier error: ${event.message}`;
		case "run_end":
			return event.reason === undefined ? "\n== end of run" : `\n== end of run: ${event.reason}`;
		case "round_end":
		case "interpretation_round":
		case "request":
		case "usage":
		case "ledger_entry":
		case "submission":
		case "dm_sent":
		case "dm_delivered":
		case "notice":
		case "marks_spent":
		case "group_created":
		case "group_membership":
		case "group_post":
		case "treasurer_set":
		case "transfer":
		case "tools_unlocked":
		case "treasury_settled":
		case "cast_level_set":
		case "cast_revealed":
		case "cast_retired":
		case "collection_started":
		case "collection_shortened":
		case "collection_revealed":
		case "lottery_drawn":
		case "receipt_issued":
		case "petition_opened":
		case "fragments_dealt":
		case "factors_dealt":
		case "treasury_deposit":
		case "treasury_withdrawal":
		case "standings_published":
		case "gamemaster_turn":
		case "gamemaster_note":
			return undefined;
		default:
			return assertNever(event, "event");
	}
}
