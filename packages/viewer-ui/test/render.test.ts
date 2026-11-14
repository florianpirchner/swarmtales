// SPDX-License-Identifier: Apache-2.0
/** The views draw a run of the new platform and an old run: rendered to text, without a browser. */
import { indexRun, loadRun, memorySource, projectRun, verifyRun, type RunModel } from "@swarmtales/viewer-core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Charts } from "../src/components/Charts.tsx";
import { Overview } from "../src/components/Overview.tsx";
import { Replay } from "../src/components/Replay.tsx";
import { RunList } from "../src/components/RunList.tsx";

const HASH = "a".repeat(64);
const MANIFEST = {
	format: "swarmtales-run", version: 1, run: { id: "hello-game-001", startedAt: "2026-11-14T10:00:00.000Z", purpose: "smoke" },
	game: { id: "hello-game", title: "Hello Game", hash: HASH, params: {} }, kernel: { revision: 3, version: "0.0.0", node: "26.13.0" },
	scheduler: { id: "turns", revision: 1, determinism: "seeded", options: {}, optionsHash: HASH }, plugins: [],
	actors: [{ id: "resident:A01", kind: "resident", grant: "resident", driver: "fake/sample", textHashes: {} }],
	texts: {}, seed: 7, replicate: 0, limits: { maxTicks: 4 }, naming: 1, log: { format: "swarmtales.events", version: 1 },
};
const ENVELOPES = [
	{ seq: 1, tick: 0, source: "kernel", type: "run_started", actor: "kernel", payload: { seed: 7 } },
	{ seq: 2, tick: 1, source: "pkg/grid", type: "move_played", actor: "resident:A01", causedBy: 1, payload: { cell: 4 } },
];
const FLAT = [{ type: "run_start", seq: 1, minute: 0, seed: 11 }, { type: "text", agent: "A01", text: "I take the centre.", seq: 2, minute: 0 }, { type: "run_end", reason: "minutes", seq: 3, minute: 2 }];
const jsonl = (lines: readonly unknown[]): string => `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`;
const nothing = (): void => undefined;

const overview = (model: RunModel): string => renderToStaticMarkup(createElement(Overview, { model, verification: { status: "done", verification: verifyRun(model) }, onJump: nothing }));
const loaded = (model: RunModel) => ({ model, index: indexRun(model.events), projection: projectRun(model.events) });
const replay = (model: RunModel, seq: number): string => renderToStaticMarkup(createElement(Replay, { run: loaded(model), seq, onSeq: nothing, views: [], vocabulary: {} }));

describe("the views", () => {
	it("draw a run of the new platform: header from the manifest, the event list, the lane of the actor", async () => {
		const model = await loadRun(memorySource({ "run/manifest.json": JSON.stringify(MANIFEST), "run/events.jsonl": jsonl(ENVELOPES) }), "run");
		const page = overview(model);
		expect(page).toContain("<h2>Hello Game</h2>");
		expect(page).toContain("<dt>story</dt><dd>hello-game</dd>");
		expect(page).toContain("<dt>seed</dt><dd>7</dd>");
		expect(page).toContain(">unsigned<");
		const shown = replay(model, 2);
		expect(shown).toContain("#2 of 2 · minute 1 of 1");
		expect(shown).toContain('<span class="type">move_played</span><span class="who">A01</span>');
		expect(shown).toContain("&quot;cell&quot;: 4");
		expect(renderToStaticMarkup(createElement(Charts, { run: loaded(model) }))).toContain("Events by type");
	});

	it("draw an old run as before: the header of the log, the result, the words of an actor", async () => {
		const model = await loadRun(memorySource({ "old/events.jsonl": jsonl(FLAT) }), "old");
		expect(overview(model)).toContain("<dt>result</dt><dd>minutes</dd>");
		const shown = replay(model, 2);
		expect(shown).toContain("<strong>A01</strong> says:<p>I take the centre.</p>");
		expect(shown).toContain('<span class="who">A01</span>');
	});

	it("list the runs of a source, a pending one without its details", () => {
		const runs = [{ dir: "a", name: "a", story: "hello-game", agents: 2, signed: true, hasReport: false }, { dir: "b", name: "b", signed: false, hasReport: false, pending: true as const }];
		const list = renderToStaticMarkup(createElement(RunList, { runs, error: undefined, selected: ["a"], onOpen: nothing, onToggle: nothing, onCompare: nothing }));
		expect(list).toContain("<td>hello-game</td>");
		expect(list).toContain("2 of 2 runs, reading details…");
		expect(list).toContain('<span class="muted">…</span>');
	});
});
