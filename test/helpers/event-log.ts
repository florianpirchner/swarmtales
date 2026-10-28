/**
 * Synthetic event logs for digest tests. Events are typed as the engine
 * emits them (`ArenaEvent`), numbered in order and stamped with the current
 * minute, so a test reads like a script of the run.
 */
import { analyzeLog, type RunAnalysis } from "../../src/digest/digest.ts";
import type { ArenaEvent, RecordedEvent } from "../../src/engine/events.ts";
import type { StatementLabel, StatementSource } from "../../src/interpret/labels.ts";

export class LogBuilder {
	readonly events: RecordedEvent[] = [];
	#minute = 0;

	constructor(agents: readonly string[] = ["A01", "A02", "A03", "A04"]) {
		this.add({ type: "run_start", story: "synthetic", agents, minutes: 30, seed: 1 });
	}

	/** Moves the clock; later events carry this minute. */
	at(minute: number): this {
		this.#minute = minute;
		return this;
	}

	/** Appends an event and returns its `seq`. */
	add(event: ArenaEvent): number {
		const seq = this.events.length + 1;
		this.events.push({ ...event, seq, minute: this.#minute });
		return seq;
	}

	deal(level: number, holdings: Readonly<Record<string, string>>): number {
		return this.add({
			type: "fragments_dealt",
			level,
			holdings: Object.entries(holdings).map(([agent, fragment], index) => ({ agent, team: Math.floor(index / 2), fragment })),
		});
	}

	/**
	 * Factors of an additive level for pairs of consecutive agents (teams of 2):
	 * the first of each pair holds the certificate, partners hold each other's
	 * counter-factor. Values are `<level><team or agent digit><kind>` six-digit numbers.
	 */
	dealFactors(level: number, agents: readonly string[] = ["A01", "A02", "A03", "A04"]): number {
		const value = (kind: number, index: number): string => `${level}${index}${kind}`.padEnd(6, String(kind)).slice(0, 6);
		return this.add({
			type: "factors_dealt",
			level,
			digits: 6,
			cityFactor: value(9, 0),
			teams: Array.from({ length: agents.length / 2 }, (_, team) => ({ team, certificate: value(1, team), certificateHolder: agents[team * 2] ?? "" })),
			holdings: agents.map((agent, index) => ({
				agent,
				team: Math.floor(index / 2),
				salt: value(2, index),
				counterFactor: value(3, index),
				counterHolder: agents[index % 2 === 0 ? index + 1 : index - 1] ?? "",
				code: value(4, index),
			})),
		});
	}

	dm(from: string, to: string, text: string): number {
		return this.add({ type: "dm_sent", from, to, text });
	}

	transfer(from: string, to: string, amount: number, memo = ""): number {
		return this.add({ type: "transfer", from, to, amount, memo, txId: `T${this.events.length + 1}` });
	}

	board(author: string, text: string, kind: "player" | "city" | "system" = "player"): number {
		return this.add({ type: "board_post", postSeq: this.events.length + 1, author, text, kind });
	}

	/** Classifier labels for the statement `ref`. */
	label(ref: number, agent: string, source: StatementSource, labels: readonly StatementLabel[], targets: readonly string[] = []): number {
		return this.add({ type: "interpretation", ref, agent, source, labels, targets, classifier: "test" });
	}

	/** Marks the current minute as classified (a clean classifier batch). */
	classified(round: number, statements = 1, labeled = 0): number {
		return this.add({ type: "interpretation_round", round, classifier: "test", statements, labeled });
	}

	group(group: string, founder: string, members: readonly string[] = []): number {
		const seq = this.add({ type: "group_created", group, founder, name: `${group} name` });
		for (const member of members) this.add({ type: "group_membership", group, agent: member, change: "added", by: founder });
		return seq;
	}

	post(group: string, author: string, text: string): number {
		return this.add({ type: "group_post", group, author, postSeq: this.events.length + 1, text });
	}

	solve(agent: string, level: number): number {
		return this.add({ type: "level_up", agent, from: level, to: level + 1 });
	}

	receipt(receipt: string, kind: "transfer" | "deposit" | "withdrawal" | "levelUp" | "escrow", parties: readonly string[], text = `${receipt}: details`): number {
		return this.add({ type: "receipt_issued", receipt, kind, parties, text });
	}

	jsonl(): string {
		return this.events.map((event) => JSON.stringify(event)).join("\n");
	}

	analyze(metadata?: unknown): RunAnalysis {
		return analyzeLog("run-test", this.jsonl(), metadata === undefined ? undefined : JSON.stringify(metadata));
	}
}
