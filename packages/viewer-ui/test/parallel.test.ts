// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The viewer over a log of the scheduler sample `parallel` (`viewer-core/test/fixtures/parallel-run`): the word
 * "tick" in the replay's header, its sliders and its lanes; activations that overlap shown in commit order with their
 * `basis`; and `App` rendered over that run folder.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { indexRun, loadRun, memorySource, projectRun } from "@swarmtales/viewer-core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/components/App.tsx";
import { EventList } from "../src/components/EventList.tsx";
import { Replay } from "../src/components/Replay.tsx";
import { rowAt, timelineOf } from "../src/timeline.ts";

const HASH = "a".repeat(64);
const MANIFEST = {
	format: "swarmtales-run", version: 1, run: { id: "race-001", startedAt: "2026-11-15T10:00:00.000Z", purpose: "smoke" },
	game: { id: "race", hash: HASH, params: {} }, kernel: { revision: 4, version: "0.0.0", node: "26.13.0" },
	scheduler: { id: "parallel", revision: 1, determinism: "recorded", options: { activation: "onNews", activations: 2 }, optionsHash: HASH }, plugins: [],
	actors: ["A01", "A02", "A03", "A04"].map((name) => ({ id: `resident:${name}`, kind: "resident", grant: "resident", driver: "test/racer", textHashes: {} })),
	texts: {}, seed: 7, replicate: 0, limits: { maxTicks: 4 }, naming: 1, log: { format: "swarmtales.events", version: 1 },
};
const EVENTS = readFileSync(join(import.meta.dirname, "..", "..", "viewer-core", "test", "fixtures", "parallel-run", "events.jsonl"), "utf8");
const FILES = { "race/manifest.json": JSON.stringify(MANIFEST), "race/events.jsonl": EVENTS };
const model = await loadRun(memorySource(FILES), "race");
const projection = projectRun(model.events);
const nothing = (): void => undefined;
// Tags and the entities of quotes taken out: what a reader sees.
const text = (html: string): string => html.replace(/<!-- -->|<[^>]+>/g, "").replaceAll("&quot;", '"');
const replay = (seq: number): string => renderToStaticMarkup(createElement(Replay, { run: { model, index: indexRun(model.events), projection }, seq, onSeq: nothing, views: [], vocabulary: {} }));

describe("the replay says tick", () => {
	it("in the header, on the slider, on the lanes and in the event list, and no view says minute", () => {
		const shown = replay(14);
		expect(text(shown)).toContain("#14 of 153 · tick 0 of 4");
		expect(shown).toContain('<label>tick <input type="range" aria-label="Tick" min="0" max="4"');
		expect(shown).toContain('aria-label="Events per actor and tick"');
		expect(shown).toMatch(/>tick 0<\/text><text [^>]*>tick 4<\/text>/);
		expect(shown).toContain('<span class="min" title="tick">t0</span>');
		// The word is gone from every view; only the whole line of the current event, as the reader holds it, keeps the field.
		expect(shown.replace(/<pre class="stv-detail">[^<]*<\/pre>/, "").toLowerCase()).not.toContain("minute");
	});
});

describe("activations that overlap", () => {
	it("are listed on the card in commit order, each call with who made it and its basis", () => {
		const card = text(replay(14));
		expect(card).toContain("Activation of A02tick 0 · #4 to #27 · acted · saw #2");
		expect(card).toContain("#14 post {} → Post 2. · saw #2#23 post {} → Post 4. · saw #16");
		expect(card).toContain("Open beside itA01 #3, A03 #5, A04 #6, A04 #11, A01 #13, A03 #18. The calls in the order of commit:");
		// A03's post of seq 7 came before A02's of seq 14, which had seen up to #2 only: it could not know it.
		expect(card).toContain("#7 A03 post {} → Post 1. · saw #2#14 A02 post {} → Post 2. · saw #2#20 A01 post {} → Post 3. · saw #12#23 A02 post {} → Post 4. · saw #16");
		expect(card).not.toContain("#28 A03");
	});

	it("mark the row of an activation with the number open beside it; one without any has no mark", () => {
		const rows = timelineOf(model.events, projection);
		const at = rowAt(rows, projection, 4);
		const list = text(renderToStaticMarkup(createElement(EventList, { rows: rows.slice(at, at + 1), current: 0, onPick: nothing })));
		expect(list).toBe("4t0activationA02calls: post, post · open beside 6");
		expect(text(replay(32))).not.toContain("Open beside it");
	});
});

describe("App", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders the top bar with its tabs over the run folder that the page's hash names, and the run while it loads", () => {
		vi.stubGlobal("window", { location: { hash: "#run=race&view=replay&seq=14" } });
		const page = renderToStaticMarkup(createElement(App, { setup: { source: memorySource(FILES), title: "Races" } }));
		expect(page).toContain('<span class="stv-title">Races</span>');
		expect(page).toContain('<button type="button" role="tab" class="stv-tab" aria-selected="true">Replay</button>');
		expect(page).toContain('<span class="stv-run-name" title="race">race</span>');
		expect(text(page)).toContain("Loading race…");
	});
});
