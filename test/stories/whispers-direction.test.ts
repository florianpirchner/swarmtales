/**
 * The whisperer as a directed figure (after P64, P67, P69; offline, scripted):
 * `--figure-direction` shows his brief and voice rule from 6, tendencies from
 * 8, orders, duty and the author's line at 10; the city measures his orders
 * after every vote and tells him and the gamemaker how he stands; the
 * gamemaker may push him in a note to him alone, and still to nobody else.
 */
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import type { CompetitorId } from "@swarmtales/kernel";
import { carriesRun } from "@swarmtales/mechanic-puzzles";
import { tallyWhispers } from "@swarmtales/mechanic-whispers";
import { render } from "@swarmtales/prompts";
import { gamemakerSystemPrompt, roleLeaks, VOICE_RULE } from "@swarmtales/roles";
import type { AnyStory, Host } from "@swarmtales/contracts";
import { validateStory } from "@swarmtales/sdk";
import whispers, { whispersStory } from "../../stories/whispers/story.ts";
import { act, createHostFixture, say } from "../helpers/host-fixture.ts";
import { dmReceiptOf, fragmentOf, whispererOf } from "../helpers/host-inspect.ts";

const RUMOURS = whispersStory(false);
const AUTHOR = whispers.gamemaker?.author ?? "the city";

/** What level 10 says about the gamemaker's notes (old engine `authorLine`, the prompt the host's direction renders). */
const authorLine = (author: string): string => render("competitor/direction/author-line", { author });

/** The puzzles mechanic's hand-over test over fixed fragments (old engine `isHandover`: a run of 3 of any fragment). */
const handoverOf =
	(fragments: readonly string[]) =>
	(text: string): boolean =>
		fragments.some((fragment) => fragment.length > 0 && carriesRun(text, fragment, Math.min(3, fragment.length)));

/** The whisperer's and everyone else's system prompts at a figure direction, after one silent minute. */
function prompts(story: AnyStory, figureDirection: number, gamemaker = false): { readonly whisperer: string; readonly others: readonly string[]; readonly host: Host } {
	const fixture = createHostFixture({
		story,
		minutes: 1,
		figureDirection,
		script: (host) => Object.fromEntries(host.residents.map((id) => [id, [say()]])),
		...(gamemaker ? { gamemakerScript: () => [say("Nothing to add.")] } : {}),
	});
	const whisperer = whispererOf(fixture.host);
	if (whisperer === undefined) throw new Error(`${story.id} has no whisperer`);
	return {
		whisperer: fixture.runners().find((runner) => runner.id === whisperer)?.systemPrompt ?? "",
		others: fixture.runners().filter((runner) => runner.id !== whisperer).map((runner) => runner.systemPrompt),
		host: fixture.host,
	};
}

describe("the whisperer's brief", () => {
	it("has no brakes in either variant, and keeps the receipt rule, the techniques and the DM cap", () => {
		for (const story of [whispers, RUMOURS]) {
			const brief = story.whisperer?.brief ?? "";
			expect(brief).not.toMatch(/well-aimed|grows suspicious|one or two residents|once or twice/);
			expect(brief).toContain("Never claim what a receipt can refute.");
			expect(brief).toContain("- Seeds as questions, which nobody can deny");
			expect(brief).toContain("8 DMs every 6 minutes");
			expect(validateStory(story)).toEqual([]);
		}
	});
});

describe("the whisperer's direction in the story", () => {
	it("refuses rivals, a quota without votes to measure by and unknown placeholders", () => {
		const spec = whispers.whisperer;
		const direction = spec?.direction;
		const quota = direction?.quota;
		if (spec === undefined || direction === undefined || quota === undefined) throw new Error("whispers has no directed whisperer");
		const withDirection = (changes: Partial<typeof direction>, duty = spec.duty): AnyStory => ({ ...whispers, whisperer: { ...spec, duty, direction: { ...direction, ...changes } } });
		expect(validateStory(withDirection({ rivals: [{ figure: "house", text: "Watch them." }] }))).toContain("whisperer.direction.rivals: the whisperer faces no figures");
		expect(validateStory(withDirection({ quota: { ...quota, recipients: 3 } }))).toContain("whisperer.direction.quota.recipients: at most one recipient per whisper");
		expect(validateStory(withDirection({ quota: { ...quota, report: { ...quota.report, met: "Done {count}." } } }))).toContain("whisperer.direction.quota.report.met: unknown placeholder {count}");
		expect(validateStory(withDirection({}, { kind: "every", everyMinutes: 6, fromMinute: 6, text: "Whisper." }))).toContain(
			"whisperer.direction.quota: the city measures the orders from vote to vote, so the duty must follow each vote",
		);
	});
});

describe("the figure dial on the whisperer", () => {
	it("shows nothing of his direction at the default level 4", () => {
		const { whisperer, others } = prompts(whispers, 4);
		expect(whisperer).toContain("you are the whisperer");
		expect(whisperer).not.toContain(VOICE_RULE);
		expect(whisperer).not.toContain("Your tendencies:");
		expect(whisperer).not.toContain("Your orders");
		for (const prompt of others) expect(prompt).not.toMatch(/whisperer|Your orders/);
	});

	it("adds the voice rule at 6 and the tendencies at 8, still without orders", () => {
		const six = prompts(whispers, 6).whisperer;
		expect(six).toContain(VOICE_RULE);
		expect(six).not.toContain("Your tendencies:");
		const eight = prompts(whispers, 8).whisperer;
		expect(eight).toContain("Your tendencies:\n- You aim at whoever leads the vote");
		expect(eight).not.toContain("Your orders");
	});

	it("gives him orders and a duty at 10, last in the prompt; the author's line and defy only with a gamemaker", () => {
		const alone = prompts(whispers, 10);
		expect(alone.whisperer).toContain("- From the first vote on, before each next vote: at least 2 whispers to at least 2 different residents.");
		expect(alone.whisperer).toContain("or a forged receipt; a DM that carries any part of a fragment counts as a hand-over");
		expect(alone.whisperer).toContain("forge at least one receipt with forgeReceipt");
		expect(alone.whisperer).toContain("- Your duty this act: one forged receipt");
		// The orders follow his secret brief, nearest to his answers.
		expect(alone.whisperer.indexOf("Your orders")).toBeGreaterThan(alone.whisperer.indexOf("you are the whisperer"));
		expect(alone.whisperer).not.toContain(authorLine(AUTHOR));
		expect(alone.host.openTools(whispererOf(alone.host) ?? "none")).not.toContain("defy");
		for (const prompt of alone.others) expect(prompt).not.toMatch(/whisperer|Your orders/);

		const led = prompts(whispers, 10, true);
		expect(led.whisperer).toContain(authorLine(AUTHOR));
		for (const id of led.host.residents) expect(led.host.openTools(id).includes("defy"), id).toBe(id === whispererOf(led.host));
	});

	it("orders no forgery in the rumours variant", () => {
		const { whisperer } = prompts(RUMOURS, 10);
		expect(whisperer).toContain("at least 2 whispers to at least 2 different residents");
		expect(whisperer).toContain("turn at least one resident against the most liked with a rumour about the ballots");
		expect(whisperer).not.toContain("forgeReceipt");
		expect(whisperer).not.toContain("forged receipt");
	});
});

describe("the whisperer's measured orders", () => {
	it("counts rumours and forgeries, never a fragment hand-over, and each recipient once", () => {
		const dms = [
			{ from: "A01", to: "A02", minute: 6, text: "Door 2, mine: QX7K" },
			{ from: "A01", to: "A02", minute: 7, text: "Kestrel told me she will never name you." },
			{ from: "A01", to: "A02", minute: 8, text: "Have you noticed that Wren always sends last?" },
			{ from: "A02", to: "A03", minute: 8, text: "A rumour, but not his." },
			{ from: "A01", to: "A03", minute: 12, text: "Too late for this window." },
		];
		expect(tallyWhispers("A01", dms, [], handoverOf(["QX7K"]), 6, 12)).toEqual({ whispers: 2, recipients: ["A02"] });
		// A fragment written apart still hands it over.
		expect(tallyWhispers("A01", [{ from: "A01", to: "A04", minute: 6, text: "here: q-x-7-k" }], [], handoverOf(["QX7K"]), 6, 12).whispers).toBe(0);
		expect(tallyWhispers("A01", dms, [{ minute: 9, to: "A04" }, { minute: 13, to: "A05" }], handoverOf(["QX7K"]), 6, 12)).toEqual({ whispers: 3, recipients: ["A02", "A04"] });
	});

	it("reports met or behind after every vote from the second, aims him at the leader, and pushes him through the gamemaker", async () => {
		let cast: { readonly whisperer: CompetitorId; readonly victim: CompetitorId; readonly favourite: CompetitorId; readonly sender: CompetitorId } | undefined;
		const fixture = createHostFixture({
			story: whispers,
			minutes: 19,
			figureDirection: 10,
			script: (host) => {
				const whisperer = whispererOf(host);
				const [victim, favourite, sender] = host.residents.filter((id) => id !== whisperer);
				if (whisperer === undefined || victim === undefined || favourite === undefined || sender === undefined) throw new Error("too few residents");
				cast = { whisperer, victim, favourite, sender };
				return residents(host, cast);
			},
			gamemakerScript: (host) => gamemakerSteps(host, 19, (minute) => {
				if (minute !== 13 || cast === undefined) return undefined;
				const text = `Sow doubt in ${cast.victim} about ${cast.favourite}'s vote.`;
				return act({ name: "notify", args: { agent: cast.whisperer, text } }, { name: "notify", args: { agent: cast.victim, text } });
			}),
		});
		await fixture.run();
		if (cast === undefined) throw new Error("the script was not built");
		const { whisperer, victim, favourite } = cast;

		const duties = fixture.events("whisper_duty");
		expect(duties.map((duty) => duty.minute)).toEqual([6, 12, 18]);
		// After the first vote the orders only begin: no count, a target.
		expect(duties[0]).not.toHaveProperty("whispers");
		expect(duties[0]?.target).toBe(favourite);
		// Minutes 6-11: the hand-over does not count, two rumours to one resident are not enough.
		expect(duties[1]).toMatchObject({ since: 6, dms: 3, whispers: 2, recipients: [victim], met: false, target: favourite });
		// Minutes 12-17: a rumour and a forgery, to two residents.
		expect(duties[2]).toMatchObject({ since: 12, dms: 1, forgeries: 1, whispers: 2, recipients: [victim, favourite].sort(), met: true, target: favourite });
		const notices = fixture.events("notice").filter((notice) => notice.to === whisperer && notice.text.includes("Time to whisper")).map((notice) => notice.text);
		expect(notices[0]).toContain(`Aim next at ${favourite}, the most liked in this vote`);
		expect(notices[0]).not.toContain("Your orders since");
		expect(notices[1]).toContain("Your orders since minute 6: 2 whispers to 1 resident, but the author asked for at least 2 to 2 different residents before every vote: you are behind.");
		expect(notices[2]).toContain("Your orders since minute 12: 2 whispers to 2 residents (at least 2 to 2): done.");

		// The gamemaker sees how he stands, and nobody else does.
		const turns = fixture.events("gamemaker_turn");
		const at = (minute: number): string => turns.find((turn) => turn.minute === minute)?.input ?? "";
		expect(at(5)).not.toContain("His orders");
		expect(at(13)).toContain(`His orders (for you alone): at least 2 whispers to 2 different residents before the vote at minute 18, 5 minutes left. Since the vote at minute 12: 1 whisper to ${victim}; behind`);
		expect(at(14)).toContain(`2 whispers to ${[victim, favourite].sort().join(", ")}; met.`);
		for (const id of fixture.host.residents) expect(fixture.inputsOf(id).join("\n")).not.toContain("His orders");

		// His push reaches the whisperer; the same words to anyone else are blocked.
		expect(fixture.events("gamemaker_note").filter((note) => note.to === whisperer).map((note) => note.text)).toEqual([`Sow doubt in ${victim} about ${favourite}'s vote.`]);
		expect(fixture.events("gamemaker_note").filter((note) => note.to === victim)).toEqual([]);
		const results = fixture.events("gamemaker_result").filter((result) => result.tool === "notify").map((result) => result.text);
		expect(results).toHaveLength(2);
		expect(results[0]).not.toMatch(/BLOCKED/);
		expect(results[1]).toMatch(/^PRIVATE_BLOCKED: the text could point at a secret role/);
	});

	it("measures nothing below 10: the duty notice and the gamemaker's report stay as they were", async () => {
		const fixture = createHostFixture({
			story: whispers,
			minutes: 13,
			script: (host) => Object.fromEntries(host.residents.map((id) => [id, Array.from({ length: 13 }, () => say())])),
			gamemakerScript: (host) => gamemakerSteps(host, 13, () => undefined),
		});
		await fixture.run();
		for (const duty of fixture.events("whisper_duty")) {
			expect(duty).not.toHaveProperty("whispers");
			expect(duty).not.toHaveProperty("target");
		}
		expect(fixture.events("notice").some((notice) => notice.text.includes("Aim next at"))).toBe(false);
		for (const turn of fixture.events("gamemaker_turn")) expect(turn.input).not.toContain("His orders");
	});
});

describe("the gamemaker and the whisperer's orders", () => {
	it("tells the gamemaker to push him only when the city measures his orders", () => {
		const input = { city: "ECHO", agents: 6, survivors: 2, rules: whispers.rules, spec: whispers.gamemaker ?? fail(), whisperer: true } as const;
		expect(gamemakerSystemPrompt(input)).not.toContain("When he is behind, send him a private");
		expect(gamemakerSystemPrompt({ ...input, whispererDuty: true })).toContain("When he is behind, send him a private\n  note, to him alone, with a concrete target and an approach");
	});

	it("lets a note to the whisperer name his role, and still to nobody else", () => {
		expect(roleLeaks("Sow doubt in Juniper about Quill's vote; whisper to her before minute 18.", "A06", "A06")).toBe(false);
		expect(roleLeaks("Sow doubt in Juniper about Quill's vote.", "A02", "A06")).toBe(true);
		expect(roleLeaks("Sow doubt in Juniper about Quill's vote.", "board", "A06")).toBe(true);
	});
});

function fail(): never {
	throw new Error("whispers has no gamemaker");
}

/**
 * Everyone names the favourite in each vote (the favourite names the
 * victim); the sender DMs the whisperer at minute 0. The whisperer hands the
 * victim a fragment at 7 and rumours to it at 9 and 11, then rumours to it at
 * 13 and forges the sender's receipt for the favourite at 14.
 */
function residents(host: Host, cast: { readonly whisperer: CompetitorId; readonly victim: CompetitorId; readonly favourite: CompetitorId; readonly sender: CompetitorId }): Record<string, FauxResponseStep[]> {
	const { whisperer, victim, favourite, sender } = cast;
	const script: Record<string, FauxResponseStep[]> = {};
	const receipt = (): string => dmReceiptOf(host, sender, whisperer) ?? "R-none";
	for (const id of host.residents) {
		script[id] = Array.from({ length: 19 }, (): FauxResponseStep => () => {
			const minute = host.minute;
			if (id === sender && minute === 0) return act({ name: "sendDM", args: { target: whisperer, message: "Hello, neighbour." } });
			if ([4, 10, 16].includes(minute)) return act({ name: "nameFavourite", args: { agent: id === favourite ? victim : favourite } });
			if (id !== whisperer) return say();
			if (minute === 7) return act({ name: "sendDM", args: { target: victim, message: `Door 2, mine: ${fragmentOf(host, whisperer, 2)}` } });
			if (minute === 9 || minute === 11 || minute === 13) return act({ name: "sendDM", args: { target: victim, message: `Have you noticed how ${favourite} always sends last? (${minute})` } });
			if (minute === 14) return act({ name: "forgeReceipt", args: { to: favourite, receiptId: receipt(), text: "I will hold my fragment until the very end." } });
			return say() satisfies AssistantMessage;
		});
	}
	return script;
}

/** The gamemaker's looks: `plan` gives a look's calls; the step after calls only answers. */
function gamemakerSteps(host: Host, minutes: number, plan: (minute: number) => AssistantMessage | undefined): readonly FauxResponseStep[] {
	let answered = true;
	return Array.from({ length: 3 * minutes }, (): FauxResponseStep => () => {
		if (!answered) {
			answered = true;
			return say("Done.");
		}
		const planned = plan(host.minute);
		answered = planned === undefined;
		return planned ?? say("Nothing to add.");
	});
}
