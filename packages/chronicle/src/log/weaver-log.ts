/**
 * `<run>/weaver.md`: every change the weaver (`--weaver`) made to a resident,
 * with minute, resident, kind, text, reason and evidence. Written as the
 * changes happen; a run without any change has no file.
 */
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { CompetitorId } from "@swarmtales/kernel";
import type { EventSink, FateShiftKind, RecordedEvent } from "@swarmtales/legacy-log";

/** The file's name in the run directory. */
export const WEAVER_FILE = "weaver.md";

const KIND_TEXT: Readonly<Record<FateShiftKind, string>> = {
	soft: "inner voice",
	hard: "hard change",
	act: "for the next act",
};

export class WeaverLog implements EventSink {
	readonly #names = new Map<CompetitorId, string>();

	constructor(readonly path: string) {}

	record(event: RecordedEvent): void {
		if (event.type === "name_chosen") this.#names.set(event.agent, event.name);
		if (event.type !== "fate_shift") return;
		if (!existsSync(this.path)) {
			mkdirSync(dirname(this.path), { recursive: true });
			appendFileSync(this.path, "# The weaver\n\nWho the story made of the residents: every change, with the events that moved it.\n");
		}
		const name = this.#names.get(event.agent);
		const who = name === undefined ? event.agent : `${name} (${event.agent})`;
		const evidence = event.evidence.length === 0 ? "none" : event.evidence.map((seq) => `#${seq}`).join(", ");
		appendFileSync(
			this.path,
			`\n## Minute ${event.minute}: ${who}, ${KIND_TEXT[event.kind]} (#${event.seq})\n\n${quote(event.text)}\n\n- Reason: ${event.reason}\n- Evidence: ${evidence}\n`,
		);
	}
}

/** Every line as a blockquote, keeping the weaver's text apart from document structure. */
function quote(text: string): string {
	return text
		.split(/\r?\n/)
		.map((line) => `> ${line}`)
		.join("\n");
}
