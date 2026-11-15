// SPDX-License-Identifier: Apache-2.0
/**
 * Rows 1 to 3 of what the viewer must show (specification of M3, section 9), drawn from the resumed run folder
 * of `viewer-core`: the records of a driver on the card of their activation, a Director's activation as a row of
 * its own kind with its firing and its act, and a decision as one item.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { indexRun, loadRun, memorySource, projectRun, type Activation } from "@swarmtales/viewer-core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivationCard } from "../src/components/ActivationCard.tsx";
import { DecisionCard } from "../src/components/DecisionCard.tsx";
import { EventList } from "../src/components/EventList.tsx";
import { Replay } from "../src/components/Replay.tsx";
import { rowAt, timelineOf } from "../src/timeline.ts";

const FOLDER = join(import.meta.dirname, "..", "..", "viewer-core", "test", "fixtures", "resumed-run");
const model = await loadRun(memorySource(Object.fromEntries(readdirSync(FOLDER).map((file) => [`run/${file}`, readFileSync(join(FOLDER, file), "utf8")]))), "run");
const projection = projectRun(model.events);
const rows = timelineOf(model.events, projection);
const nothing = (): void => undefined;
// Tags and the entities of quotes taken out: what a reader sees.
const text = (html: string): string => html.replace(/<!-- -->|<[^>]+>/g, "").replaceAll("&quot;", '"');
const replay = (seq: number): string => renderToStaticMarkup(createElement(Replay, { run: { model, index: indexRun(model.events), projection }, seq, onSeq: nothing, views: [], vocabulary: {} }));

describe("row 1: the records of a driver", () => {
	it("are lines of the card of their activation, in the order of the log, and no rows of the event list", () => {
		const card = text(replay(142));
		expect(card).toMatch(/#141 asked \{"firings":\[1\]\}#142 answeredfallback \{"costUsd":0,.*"reason":"error"\}#143 postBoard/);
		expect(rows.some((row) => row.event.type === "asked" || row.event.type === "answered" || row.event.type === "tool_called" && row.event.actorId !== "human")).toBe(false);
		// The answers to the three calls of the human are not rows either (issue 29).
		expect(rows.length).toBe(model.events.length - projection.attached.size - projection.humanCalls.length);
		// A line of the activation shows the activation's row and card; the line itself stays the current event.
		expect(rows[rowAt(rows, projection, 142)]?.seq).toBe(138);
		const shown = replay(142);
		expect(shown).toContain('<li class="current"><button type="button" class="stv-link">#142</button>');
		expect(text(shown)).toContain("Event #142");
	});

	it("a resident's card lists its calls with their answers, a refusal with its code", () => {
		const call = { seq: 252, tick: 9, actor: "resident:A01", as: "transferPoints", tool: "pkg/ledger/transferPoints", params: { to: "A04", amount: 5 }, human: false, take: false, activation: 251 };
		const activation: Activation = { seq: 251, tick: 9, actor: "resident:A01", kind: "resident", name: "A01", closedSeq: 254, outcome: "acted", calls: [{ ...call, answer: { seq: 253, ok: false, text: "A04 was exiled", code: "EXILED" } }], records: [], firings: [], overlaps: [] };
		const card = renderToStaticMarkup(createElement(ActivationCard, { activation, seq: 252, onSeq: nothing }));
		expect(text(card)).toBe('Activation of A01tick 9 · #251 to #254 · acted#252 transferPoints {"to":"A04","amount":5} → EXILED: A04 was exiled');
		expect(card).toContain('<span class="stv-answer refused">');
	});
});

describe("row 2: a Director's activation", () => {
	it("is a row of its own kind with what woke it and its act; a resident's activation is a plain activation row", () => {
		const at = rowAt(rows, projection, 138);
		const list = renderToStaticMarkup(createElement(EventList, { rows: rows.slice(at - 1, at + 3), current: 1, onPick: nothing }));
		expect(list).toContain('class="stv-vrow activation director current"');
		expect(text(list)).toContain("138t6Directorwardenwoken by decisions.decision_proposed #136 · acts: postBoard");
		// The board post the act caused stays an event of its own, right below.
		expect(list).toContain('<span class="type">board_post</span><span class="who">warden</span>');
		expect(renderToStaticMarkup(createElement(EventList, { rows: rows.filter((row) => row.activation?.kind === "resident").slice(0, 1), current: 0, onPick: nothing }))).toMatch(/class="stv-vrow activation resident current".*<span class="type">activation<\/span>/);
	});

	it("has a card with the firing (the answer of `take`) and the act with its answer; `take` is not listed as an act", () => {
		const card = text(replay(138));
		expect(card).toContain("Director wardentick 6 · #138 to #146 · acted · saw #137Woken by#136 decisions.decision_proposed at tick 6 {\"decision\":\"D1\"");
		expect(card).toContain('What it did#141 asked');
		expect(card).toContain('#143 postBoard {"message":"The warden has seen the proposal. The city waits for the deadline."} → posted · #3');
		expect(card).not.toContain("#139 take");
	});
});

describe("row 3: a decision", () => {
	// The run has one decision.
	const card = (seq: number): string => text(projection.decisions.map((decision) => renderToStaticMarkup(createElement(DecisionCard, { decision, seq, onSeq: nothing }))).join(""));

	it("is one item: proposed with kind, owner, proposal, deadline and holders; the amendment with who and why; settled, changed", () => {
		expect(card(187)).toBe('Decision D1 settled, changedkindcourt.verdictownercourtdeadlinetick 8holdershuman, director:warden#136 proposed at tick 6 {"exiled":"A04"}#183 amended at tick 8 by human {"exiled":"A02"} “A02 paid for its votes”#187 settled at tick 8, changed by an amendment {"exiled":"A02"}');
	});

	it("stands as it stood at the current seq, and the replay shows it from its proposal on", () => {
		expect(card(150)).toBe('Decision D1 open until tick 8kindcourt.verdictownercourtdeadlinetick 8holdershuman, director:warden#136 proposed at tick 6 {"exiled":"A04"}');
		expect(card(183)).toContain("open until tick 8");
		expect(card(183)).toContain("#183 amended");
		expect(replay(135)).not.toContain("stv-decision");
		expect(replay(136)).toContain('<div class="stv-card stv-decision"><h3>Decision D1 <span class="stv-badge wait">open until tick 8</span></h3>');
	});
});
