// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The holdout tribunal, part 1, in a small city: the blockers and their clearing, the call with the city's lot among
 * several blockers, the refusals of `callTribunal` (the note desk's in `rule`, the court's in `run`), the grace that
 * ends in a drop with the city's announcement after the fallback, the pause after a tribunal, the fact the
 * gamemaker reads, the head's carried prompt texts, and the resume at every tick boundary.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Activation, ActorDriver, Envelope, Kernel } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { defineGame, type Game } from "@swarmtales/sdk";
import { checkOptionsDocumented, checkPackage, checkResumeEveryBoundary, idleDriver, testKernel } from "@swarmtales/testkit";
import { standoffTribunal } from "../src/index.ts";
import { cityOf, type World } from "./support.ts";

const t = (template: string) => template;
const TEXTS = {
	rule: "The holdout rule.",
	called: t("{accused} holds door {door} from {lacking}: {grace} minutes, until {graceUntil}; votes of {vote}, {maxVotes} in all."),
	drawnAccused: t("The lot among {candidates} fell on {drawn}."),
	voteOpened: t("Vote {number} of {maxVotes} on {accused} until {until}."),
	accusedVote: t("{accused}, vote {number} of {maxVotes} on you until {until}."),
	struck: "{struck} is struck.",
	struckNotice: "{struck}, you are struck.",
	released: "{struck}: {fragments}.",
	dropped: "The tribunal on {accused} is dropped.",
	graceFailed: "{accused} missed the grace; the vote runs until {until}.",
	voteFailed: "{number} on {accused}: {yes}/{no}, {left} left, until {until}.",
	banished: "{accused} banished ({yes}).",
	lot: "{accused}: the lot fell on {drawn}.",
	spared: "{accused} spared at door {door}.",
};
const OPTIONS = { stallMinutes: 1, graceMinutes: 1, voteMinutes: 2, maxVotes: 3, fallbackMinutes: 1, texts: TEXTS };

// Door 1: A01 and A03 pass it at once, A02 stays; A03 sends its fragment at tick 1, A01 at tick 3.
const WORLD: World = {
	residents: ["A01", "A02", "A03"],
	ups: new Map([
		["A01", [[0, 2]]],
		["A03", [[0, 2]]],
	]),
	fragments: new Map([[1, new Map([["A01", "AAAA"], ["A02", "BBBB"], ["A03", "CCCC"]])]]),
	dms: [
		{ tick: 1, from: "A03", to: "A02", text: "door 1: CCCC" },
		{ tick: 3, from: "A01", to: "A02", text: "fine, AAAA" },
	],
	opensAt: () => 0,
	lastLevel: 3,
};

function game(ticks = 8): Game {
	return defineGame({
		id: "holdout-test",
		seed: 7,
		residents: [...WORLD.residents],
		mechanics: [...cityOf(WORLD), channels(), exile(), standoffTribunal(OPTIONS)],
		grants: { script: ["callTribunal"] },
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks },
	});
}

/** The Director's calls by tick, made after the turns (in the last resident's activation), with their answers. */
function director(kernel: Kernel, calls: Readonly<Record<number, readonly (readonly [string[], string])[]>>, answers: string[]): ActorDriver {
	return async (activation: Activation) => {
		if (activation.actor !== "resident:A03") return;
		for (const [accused, reason] of calls[activation.tick] ?? []) {
			const outcome = await kernel.submit({ actor: "script", as: "callTribunal", params: { accused, reason } });
			answers.push(`${String(activation.tick)} ${outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`}`);
		}
	};
}

const tribunalRows = (events: readonly Envelope[]): readonly string[] =>
	events.filter((event) => event.source.endsWith("/standoff-tribunal") || event.type === "board_post").map((event) => `${String(event.tick)} ${event.type} ${JSON.stringify(event.payload)}`);

describe("the blockers, the call and the grace", () => {
	it("reports and clears blockers, draws the accused among two, refuses what the old court refused and drops the tribunal once the fragment came", async () => {
		const { kernel } = testKernel(game());
		const answers: string[] = [];
		const calls = {
			1: [[["A01"], "   "], [["Z9"], "Z9 holds the door."], [["A01", "A01"], "Twice."], [["A01"], "A01 and A03 hold the first door."], [["A03"], "Again."]],
			3: [[["A02"], "A02 holds nothing."]],
			4: [[["A01"], "Too soon."]],
		} as const satisfies Record<number, readonly (readonly [string[], string])[]>;
		await kernel.run({ resident: director(kernel, calls, answers) }, { ticks: 6 });
		expect(answers).toEqual([
			"1 INVALID_TEXT: 1-400 characters",
			"1 UNKNOWN_AGENT: Z9",
			"1 INVALID_ACCUSED: name each accused once",
			"1 tribunal called on A01 (the lot among A01, A03 drew A01) for door 1: grace until minute 3; its fragment is still missing for A02",
			"1 NOT_NOW: tribunal 1 on A01 is still running; one at a time",
			"3 NOT_NOW: tribunal 1 on A01 is still running; one at a time",
			"4 NOT_NOW: a tribunal ended a short while ago; the next may be called from minute 5",
		]);
		// The grace ends at tick 3 and the first vote opens; the fragment comes at tick 3, so at tick 4 the city first
		// announces the failed grace, then drops the tribunal and announces that after the fallback.
		expect(tribunalRows(kernel.log.all())).toEqual([
			'1 blocker_found {"door":1,"blocker":"A01","lacking":["A02"]}',
			'1 blocker_found {"door":1,"blocker":"A03","lacking":["A02"]}',
			'1 lot_drawn {"tribunal":1,"purpose":"accused","candidates":["A01","A03"],"drawn":"A01"}',
			'1 board_post {"postSeq":1,"author":"COURIER","text":"A01 and A03 hold the first door.\\nThe lot among A01 and A03 fell on A01.\\nA01 holds door 1 from A02: 1 minutes, until 3; votes of 2, 3 in all.","kind":"city"}',
			'1 holdout_called {"tribunal":1,"accused":"A01","door":1,"lacking":["A02"],"until":3,"text":"A01 and A03 hold the first door.\\nThe lot among A01 and A03 fell on A01.\\nA01 holds door 1 from A02: 1 minutes, until 3; votes of 2, 3 in all.","candidates":["A01","A03"]}',
			'2 blocker_cleared {"door":1,"blocker":"A03"}',
			'3 holdout_vote_opened {"tribunal":1,"vote":1,"voters":["A02","A03"],"until":5}',
			'4 blocker_cleared {"door":1,"blocker":"A01"}',
			'4 board_post {"postSeq":2,"author":"CITY","text":"A01 missed the grace; the vote runs until 5.","kind":"city"}',
			'4 holdout_announced {"tribunal":1,"kind":"graceFailed","by":"city","text":"A01 missed the grace; the vote runs until 5."}',
			'4 holdout_ended {"tribunal":1,"outcome":"dropped"}',
			'5 board_post {"postSeq":3,"author":"CITY","text":"The tribunal on A01 is dropped.","kind":"city"}',
			'5 holdout_announced {"tribunal":1,"kind":"dropped","by":"city","text":"The tribunal on A01 is dropped."}',
		]);
	});

	it("shows the grace in the status lines, the rule under the first task, and the tribunal in the fact the gamemaker reads", async () => {
		const { kernel } = testKernel(game());
		const lines: string[] = [];
		const answers: string[] = [];
		const call = director(kernel, { 1: [[["A01"], "A01 holds the first door."]] }, answers);
		const driver: ActorDriver = async (activation) => {
			for (const note of activation.inputs) if (note.source.endsWith("standoff-tribunal")) lines.push(`${String(activation.tick)} ${activation.actor} ${note.kind ?? ""} ${note.text}`);
			await call(activation);
		};
		await kernel.run({ resident: driver }, { ticks: 3 });
		expect(lines).toEqual([
			"0 resident:A01 task The holdout rule.",
			"0 resident:A02 task The holdout rule.",
			"0 resident:A03 task The holdout rule.",
			"1 resident:A01 task The holdout rule.",
			"1 resident:A03 task The holdout rule.",
			"2 resident:A01 status holdout tribunal on you: grace until minute 3 · send your door-1 fragment to A02",
			"2 resident:A02 status holdout tribunal on A01: grace until minute 3",
			"2 resident:A03 status holdout tribunal on A01: grace until minute 3",
		]);
		expect(kernel.fact("standoff-tribunal.section")).toEqual({
			minute: 3,
			stallMinutes: 1,
			alive: ["A01", "A02", "A03"],
			blockers: [{ door: 1, blocker: "A01", lacking: ["A02"], passed: true, since: 1 }],
			session: { number: 1, accused: "A01", door: 1, stage: "grace", until: 3, vote: 0, maxVotes: 3, lacking: ["A02"] },
			pending: null,
			cooldownUntil: 0,
			struck: [],
		});
	});

	it("resumes at every tick boundary through the grace, the vote and the drop", async () => {
		const drivers = (kernel: Kernel) => ({ resident: director(kernel, { 1: [[["A01"], "A01 holds the first door."]] }, []) });
		expect(await checkResumeEveryBoundary(game(), drivers)).toEqual([]);
	});
});

describe("the head", () => {
	it("carries the twenty-three prompt texts of the old platform; only the ids differ", () => {
		const same = (path: string, sha256: string) => [path, path, sha256] as const;
		const old: readonly (readonly [string, string, string])[] = [
			same("tools/tribunalVote", "771eb54de43a9747e821fe5e2137b61d125de63e66ba5bdeaba459a45c96641d"),
			same("replies/ballot-holdout", "ed3914641967b9f7d168486aa2e573521f329dd8a270deb81a96be7910e231bc"),
			same("replies/ballot-yes", "e1d87f11648e43ad9a66f77c0c2178fe460cba8b5bae8035db9e16ac60f0b5fe"),
			same("replies/ballot-no", "2208929617a50999e4b2214c0b2445534c497467bed6d4ffc3245f25fe0af445"),
			same("replies/locked", "70f509570c857b3348bb1283497fe786aec9052bc745265380856cf93a5d8d24"),
			same("gamemaker/tools/drawLot", "3e78caf137167c427a446afd8b3af1b0d10bba95feeaa3aeec5e44121d30bf41"),
			same("gamemaker/tools/announceTribunal", "9314983656aed1f89a5c19e5df5f1d3fe1cd2283d8c2cc843a0ada7128a0b666"),
			same("gamemaker/tools/permaDeath", "ade82f862fd875b0a135665671dab83ad81916f1dd3a34735867c344d5f60943"),
			same("gamemaker/replies/lot-drawn", "af9e4fc29944df44ca03601ef132afe38e6a692ac3836ebf33a58049ee47bd5e"),
			same("gamemaker/replies/announced", "0e8444e64719ab62667e69211860673ae5c90fe311a6c9a4cfb4bda110d96ecb"),
			same("gamemaker/replies/struck", "b9b0d9eeb379b6f5adc6e0190a115ad69632b99d2f706b0bb18614ad129b38df"),
			same("gamemaker/replies/struck-lot", "045d705011d9fcef9388f91908678042e03b6031ec0bfec7b7692cc569e3a8dc"),
			same("gamemaker/replies/struck-vote", "062e427436be82180cdbc9468df778ba98e0a07f10f683f24086409f9097eeb9"),
			["gamemaker/tools/callTribunal", "gamemaker/tools/callTribunal", "41b9d4127ca6145f22f89b24a6c4f6b04d8c1e7dfb1dfcc2fb6f2e0840a24a1b"],
			["gamemaker/replies/tribunal-called", "gamemaker/replies/tribunal-called", "e54aedf51508ff7d60fdba0e7b16d8c311a1e29729adda91b8c2e7a2103420f2"],
			["gamemaker/replies/tribunal-lot", "gamemaker/replies/tribunal-lot", "094c21a99b7db23e51348bf243be17ae33c13e11f7184278c84f2fec2177cdc9"],
			["status/holdout-accused", "competitor/status/holdout-accused", "00bd997345844c8b5a15bcb281f10acc52c208ec39246d79249d2ab7eca2a6ab"],
			["status/holdout-ballot", "competitor/status/holdout-ballot", "d1f989ecab00ea40f14fa59b8d53edb32cddc74ad4c44f5c886b6b97b6e261d3"],
			["status/holdout-grace", "competitor/status/holdout-grace", "8fab561a3b4ae3dddd1d401a13c41e9dd92b4b1c6cb475a58eea27e01313692f"],
			["status/holdout-not-voted", "competitor/status/holdout-not-voted", "18e6f3159150edc9ff0c86c88156ac5503a228c083ea75250c23cf9a7a0c8ed5"],
			["status/holdout-owed", "competitor/status/holdout-owed", "3a18a6ada4d78fc7899f8c49a90c4e202049f4a25c307b5182d553c05dd7ed61"],
			["status/holdout-strike", "competitor/status/holdout-strike", "6b44e18c7faf68d31e872211b07a59069aadc7974f3bdab9bba7419a3eaf8dee"],
			["status/holdout-voter", "competitor/status/holdout-voter", "7e7e946392dd4f56f719f587a221783554a7bf57bc9efbde6109f48250edb788"],
		];
		for (const [path, oldId, sha256] of old) {
			const id = `standoff-tribunal/${path}`;
			const text = readFileSync(new URL(`../prompts/${id}.md`, import.meta.url), "utf8").replace(`id: ${id}`, `id: ${oldId}`);
			expect([id, createHash("sha256").update(text).digest("hex")]).toEqual([id, sha256]);
		}
		expect(Object.keys(standoffTribunal.head.prompts).sort()).toEqual(old.map(([path]) => `standoff-tribunal/${path}`).sort());
		const gm = (name: string) => [name, `standoff-tribunal/gamemaker/tools/${name}`, ["gamemaker"]];
		expect(standoffTribunal.head.tools.map((tool) => [tool.name, tool.description, tool.for])).toEqual([
			["tribunalVote", "standoff-tribunal/tools/tribunalVote", ["resident"]],
			...["callTribunal", "drawLot", "announceTribunal", "permaDeath"].map(gm),
		]);
	});

	it("documents its options, matches its package, and samples a call on a blocker for the fake driver", async () => {
		const packageJson: unknown = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
		expect(checkPackage(standoffTribunal, packageJson)).toEqual([]);
		expect(checkOptionsDocumented(standoffTribunal)).toEqual([]);
		const { kernel } = testKernel(game());
		const pick = <T>(items: readonly T[]): T => {
			const item = items[0];
			if (item === undefined) throw new RangeError("an empty draw");
			return item;
		};
		const random = { next: () => 0, int: (_min: number, max: number) => max, pick, shuffle: <T>(items: readonly T[]) => [...items] };
		expect(kernel.sample("script", "callTribunal", random)).toBeUndefined();
		await kernel.run({ resident: idleDriver }, { ticks: 2 });
		const sampled = kernel.sample("script", "callTribunal", random);
		expect(sampled).toEqual({ accused: ["A01"], reason: "Tribunal 1: A01 holds back a fragment of door 1." });
		expect(await kernel.submit({ actor: "script", as: "callTribunal", params: sampled })).toMatchObject({ ok: true });
		expect(kernel.sample("script", "callTribunal", random)).toBeUndefined();
	});
});
