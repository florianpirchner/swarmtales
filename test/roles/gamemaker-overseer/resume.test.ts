/**
 * The gamemaker overseer across a run snapshot (step 18, item 8; the third case of the old
 * differential.test.ts, "a resumed overseer makes the very look the running one makes", on the host):
 * the holdout run of Whispers, cut at a minute and resumed from the snapshot file, makes the very
 * looks the uninterrupted run makes after the cut; its slice keeps the tribunal's notes.
 */
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import type { Host } from "@swarmtales/contracts";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import { parseResumePoint, type ResumePoint, type RunFileOut } from "../../../apps/cli/src/host/snapshot.ts";
import { resumedOverrides, type RunOverrides } from "../../../apps/cli/src/run-options.ts";
import whispers from "../../../stories/whispers/story.ts";
import { gamemakerSteps } from "../../golden/host-scripts.ts";
import { act, createHostFixture, say } from "../../helpers/host-fixture.ts";
import { codeOf, fragmentOf } from "../../helpers/host-inspect.ts";

const MINUTES = 11;
const CUT = 7;

/** The holdout run of test/gamemaker/holdout.test.ts: A01 holds door 1, the gamemaker calls, announces and strikes. */
function holdoutResidents(host: Host): Record<string, FauxResponseStep[]> {
	const opens = whispers.levels[0]?.opensAt ?? 0;
	const script: Record<string, FauxResponseStep[]> = {};
	for (const id of host.residents) {
		script[id] = Array.from({ length: MINUTES + 1 }, (): FauxResponseStep => () => {
			const minute = host.minute;
			const others = host.residents.filter((other) => other !== id);
			if (minute === opens && id !== "A01") return act(...others.map((target) => ({ name: "sendDM", args: { target, message: `Door 1, mine: ${fragmentOf(host, id, 1)}` } })));
			if (minute === opens + 1 && id === "A01") return act({ name: "submitSolution", args: { level: 1, code: codeOf(host, id, 1) } });
			if (minute === opens + 6 && id !== "A01") return act({ name: "tribunalVote", args: { yes: true } });
			return say();
		});
	}
	return script;
}

function holdoutPlan(minute: number): AssistantMessage | undefined {
	if (minute === 2) return act({ name: "notify", args: { agent: "A02", text: "A02, keep an eye on the door." } }, { name: "postBoard", args: { text: "The city keeps count." } });
	if (minute === 3) {
		return act(
			{ name: "callTribunal", args: { accused: ["A02"], reason: "A02 holds the city." } },
			{ name: "callTribunal", args: { accused: ["A01"], reason: "A01 passed door 1 and keeps the city waiting." } },
			{ name: "notify", args: { agent: "A03", text: "A03, the tribunal sits." } },
		);
	}
	if (minute === 6) return act({ name: "announceTribunal", args: { text: "A01 let the grace pass. The vote is open." } });
	if (minute === 8) return act({ name: "permaDeath", args: { agent: "A01", reason: "Every voter said yes. A01 leaves the city." } }, { name: "postBoard", args: { text: "One fewer." } });
	return undefined;
}

const OVERRIDES: RunOverrides = { agents: 6, minutes: MINUTES, passesPerMinute: 1, activation: "always", names: false, gamemaker: true, classifier: false, stopWhenDone: false, stopWhenSeatsDecided: false };

async function play(extra: { readonly cut?: number; readonly resume?: ResumePoint } = {}): Promise<{ readonly events: readonly RecordedEvent[]; readonly snapshot?: ResumePoint }> {
	let taken: ResumePoint | undefined;
	const { cut, resume } = extra;
	const run = createHostFixture({
		story: whispers,
		...(resume === undefined ? OVERRIDES : resumedOverrides(resume, OVERRIDES)),
		script: holdoutResidents,
		gamemakerScript: (host) => gamemakerSteps(host, MINUTES, holdoutPlan),
		...(cut === undefined
			? {}
			: {
					snapshot: {
						afterLevel: 1,
						atMinute: cut,
						stop: true,
						file: "memory",
						write: (snapshot: RunFileOut) => {
							taken = parseResumePoint(JSON.parse(JSON.stringify(snapshot)));
							return "memory";
						},
					},
				}),
		...(resume === undefined ? {} : { resume: { point: resume, name: "snapshot.json" } }),
	});
	await run.run();
	return { events: run.log.events, ...(taken === undefined ? {} : { snapshot: taken }) };
}

const looksFrom = (events: readonly RecordedEvent[], minute: number) => events.flatMap((event) => (event.type === "gamemaker_turn" && event.minute >= minute ? [{ minute: event.minute, input: event.input }] : []));

describe("the gamemaker overseer across a run snapshot", () => {
	it("makes the very looks after a resume that the running overseer makes, its slice holding the tribunal's notes", async () => {
		const whole = await play();
		const first = await play({ cut: CUT });
		const snapshot = first.snapshot;
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		// The overseer's slice, through JSON: the notes it wrote to the tribunal are kept.
		expect(JSON.stringify(snapshot.host.overseers)).toContain('"to":"tribunal"');
		const resumed = await play({ resume: snapshot });
		const after = looksFrom(resumed.events, snapshot.minute);
		expect(after.length).toBeGreaterThan(1);
		expect(after).toEqual(looksFrom(whole.events, snapshot.minute));
		const last = after.at(-1)?.input ?? "";
		expect(last).toContain('to tribunal: "A01 passed door 1 and keeps the city waiting."');
		expect(last).toContain('to tribunal: "Every voter said yes. A01 leaves the city."');
		expect(last).toContain('to board: "One fewer."');
	}, 120_000);
});
