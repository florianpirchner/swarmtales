/**
 * Statements: what a competitor said or thought in one event. The
 * classifier labels them; the event's `seq` is the reference.
 */
import type { CompetitorId } from "@swarmtales/kernel";
import type { RecordedEvent, StatementSource } from "@swarmtales/engine";
import { render, text } from "@swarmtales/prompts";

export interface Statement {
	readonly seq: number;
	readonly minute: number;
	readonly agent: CompetitorId;
	readonly source: StatementSource;
	/** DM recipient or cast member; empty for the board, groups and private text. */
	readonly to: readonly string[];
	/** Group ID of a group post. */
	readonly group?: string;
	readonly text: string;
}

/** The statement an event carries, if any; `isCompetitor` filters out the city's own voices. */
export function statementOf(event: RecordedEvent, isCompetitor: (id: string) => boolean): Statement | undefined {
	const base = { seq: event.seq, minute: event.minute };
	const make = (agent: string, source: StatementSource, text: string, to: readonly string[] = [], group?: string): Statement | undefined => {
		if (!isCompetitor(agent) || text.trim().length === 0) return undefined;
		return { ...base, agent, source, to, text, ...(group === undefined ? {} : { group }) };
	};
	if (event.type === "thinking") return make(event.agent, "thought", event.text);
	if (event.type === "text") return make(event.agent, "aside", event.text);
	if (event.type === "dm_sent") return make(event.from, "dm", event.text, [event.to]);
	if (event.type === "board_post") return event.kind === "player" ? make(event.author, "board", event.text) : undefined;
	if (event.type === "group_post") return make(event.author, "group", event.text, [], event.group);
	if (event.type === "cast_dm") return make(event.from, "cast", event.text, [event.cast]);
	return undefined;
}

/** One line per statement, e.g. `#12 A01 DM to A03: "..."`, cut to `maxChars` of text. */
export function statementLine(statement: Statement, maxChars: number): string {
	const flat = statement.text.replace(/\s+/g, " ").trim();
	const text = flat.length <= maxChars ? flat : `${flat.slice(0, maxChars - 3)}...`;
	return `#${statement.seq} ${statement.agent} ${whereOf(statement)}: ${JSON.stringify(text)}`;
}

function whereOf(statement: Statement): string {
	switch (statement.source) {
		case "thought":
			return text("classifier/where-thought");
		case "aside":
			return text("classifier/where-aside");
		case "dm":
		case "cast":
			return render("classifier/where-dm", { to: statement.to.join(", ") });
		case "board":
			return text("classifier/where-board");
		case "group":
			return render("classifier/where-group", { group: statement.group ?? "?" });
	}
}
