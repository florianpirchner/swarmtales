// SPDX-License-Identifier: Apache-2.0
/**
 * Rows 4 to 7 of what the viewer must show (specification of M3, section 9), drawn from the resumed run folder of
 * `viewer-core`: the calls of the human and the header badge, the pause as a band, the resume marker as a line,
 * and the banished resident greyed from its suspension on.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { actorLanes, indexRun, loadRun, memorySource, projectRun, type RunEvent } from "@swarmtales/viewer-core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventList } from "../src/components/EventList.tsx";
import { HumanBadge, HumanCard } from "../src/components/HumanHand.tsx";
import { Lanes } from "../src/components/Lanes.tsx";
import { rowAt, timelineOf } from "../src/timeline.ts";

const FOLDER = join(import.meta.dirname, "..", "..", "viewer-core", "test", "fixtures", "resumed-run");
const model = await loadRun(memorySource(Object.fromEntries(readdirSync(FOLDER).map((file) => [`run/${file}`, readFileSync(join(FOLDER, file), "utf8")]))), "run");
const projection = projectRun(model.events);
const rows = timelineOf(model.events, projection);
const nothing = (): void => undefined;
const text = (html: string): string => html.replace(/<!-- -->|<[^>]+>/g, "").replaceAll("&quot;", '"');
// The rows of the event list from one seq to another, as markup.
const list = (from: number, to: number, events = rows): string => renderToStaticMarkup(createElement(EventList, { rows: events.filter((row) => row.seq >= from && row.seq <= to), current: -1, onPick: nothing }));
const lanes = (events: readonly RunEvent[], marks = projectRun(events)): string => renderToStaticMarkup(createElement(Lanes, { lanes: actorLanes(events), index: indexRun(events), tick: 0, onTick: nothing, projection: marks }));

describe("row 4: the calls of the human", () => {
	it("are marked rows that carry the answer, listed on a card, and the header has the badge", () => {
		expect(rows.filter((row) => row.human !== undefined).map((row) => row.seq)).toEqual([160, 164, 182]);
		const shown = list(182, 185);
		expect(shown).toContain('class="stv-vrow human"');
		expect(text(shown)).toContain('182t8humanamendDecision{"decision":"D1","proposal":{"exiled":"A02"},"reason":"A02 paid for its votes"} → amended decision D1');
		// The answer (#184) is no row of its own: it shows the row of its call.
		expect(shown).not.toContain("tool_result");
		expect(rows[rowAt(rows, projection, 184)]?.seq).toBe(182);
		const card = text(renderToStaticMarkup(createElement(HumanCard, { projection, seq: 164, onSeq: nothing })));
		expect(card).toContain('#160 human pause {"reason":"the court has a verdict"} → the run halts at the next tick boundary');
		expect(card).toContain("#164 human resume {} → the run goes on");
		const badge = renderToStaticMarkup(createElement(HumanBadge, { projection, onJump: nothing }));
		expect(text(badge)).toBe("human-influenced");
		expect(badge).toContain("3 calls of the human; the first is #160");
	});

	it("the badge, the card and the marks are absent for a log without a call of the human", () => {
		const before = model.events.filter((event) => event.seq < 160);
		const plain = projectRun(before);
		expect(renderToStaticMarkup(createElement(HumanBadge, { projection: plain, onJump: nothing }))).toBe("");
		expect(renderToStaticMarkup(createElement(HumanCard, { projection: plain, seq: 1, onSeq: nothing }))).toBe("");
		expect(list(0, 159, timelineOf(before, plain))).not.toMatch(/stv-vrow[^"]* (human|paused|resume|suspen)/);
		expect(lanes(before)).not.toMatch(/class="(pause|resume|suspended)"/);
	});
});

describe("row 5: a pause", () => {
	it("is a band of rows from `paused` to `resumed`, and a band between two ticks over the lanes", () => {
		expect(rows.filter((row) => row.pause !== undefined).map((row) => row.seq)).toEqual([161, 163, 164, 165]);
		const shown = list(159, 167);
		expect(shown.match(/class="stv-vrow[^"]* paused/g)).toHaveLength(4);
		expect(text(shown)).toContain("161t7pausehumanbefore tick 7 · “the court has a verdict” · until #165");
		expect(text(shown)).toContain("165t7resumedhumanthe pause of #161 ends");
		expect(lanes(model.events)).toMatch(/<rect class="pause"[^>]*><title>pause before tick 7 · “the court has a verdict” · until #165<\/title>/);
	});

	it("runs to the end of a log that ends paused", () => {
		const cut = model.events.filter((event) => event.seq <= 163);
		const open = timelineOf(cut, projectRun(cut));
		expect(open.filter((row) => row.pause !== undefined).map((row) => row.seq)).toEqual([161, 163]);
		expect(text(list(161, 161, open))).toContain("the log ends paused");
	});
});

describe("row 6: the resume marker", () => {
	it("is a line across the event list and the lanes that names the run it came from", () => {
		const shown = list(163, 163);
		expect(shown).toContain('class="stv-vrow paused resume"');
		expect(text(shown)).toBe("163t7run resumedfrom city-slice-001 at tick 7 · snapshot a15c30916b22…");
		expect(lanes(model.events)).toMatch(/<line class="resume"[^>]*><title>run resumed from city-slice-001 at tick 7/);
		expect(text(renderToStaticMarkup(createElement(HumanCard, { projection, seq: 163, onSeq: nothing })))).toContain("#163 run resumed  from city-slice-001 at tick 7");
	});
});

describe("row 7: a banished resident", () => {
	it("is greyed from its suspension on: its lane, and each later row of it", () => {
		expect(list(192, 192)).toContain('class="stv-vrow suspension"');
		expect(text(list(192, 192))).toBe("192t8suspendedA02by exile · exiled · greyed from here on");
		const shown = lanes(model.events);
		expect(shown).toContain('class="suspended">A02</text>');
		expect(shown).toMatch(/<rect class="suspended"[^>]*><title>A02 suspended by exile at tick 8 \(exiled\)<\/title>/);
		expect(shown.match(/class="suspended"/g)).toHaveLength(2);
		// The fixture has no line of A02 after the event; a call it would still make is a greyed row, one before it is not.
		const late = (seq: number): RunEvent => ({ seq, minute: 8, type: "vote", line: seq, actor: "A02", actorId: "resident:A02", data: {} });
		const more = [...model.events.filter((event) => event.seq < 190 || event.seq === 192), late(191), late(193)].sort((a, b) => a.seq - b.seq);
		const greyed = list(191, 193, timelineOf(more, projectRun(more)));
		expect(greyed.match(/class="stv-vrow([^"]*)"/g)).toEqual(['class="stv-vrow"', 'class="stv-vrow suspension"', 'class="stv-vrow suspended"']);
	});
});
