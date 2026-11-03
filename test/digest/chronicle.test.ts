import { createModels, fauxAssistantMessage, fauxProvider, fauxText } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import {
	buildChroniclePrompt,
	chronicleSystemPrompt,
	ChronicleError,
	evidenceLines,
	interpretChronicleAnswer,
	type NarrativeModel,
	PiNarrativeModel,
	resolveNarrativeModel,
	writeChronicle,
} from "@swarmtales/chronicle";
import { createProviderRegistry } from "@swarmtales/models";
import { LogBuilder } from "../helpers/event-log.ts";

function story(): { log: LogBuilder; promise: number; thought: number; betrayal: number } {
	const log = new LogBuilder();
	log.deal(3, { A01: "KQ7", A02: "Q7MZ" });
	const promise = log.at(2).dm("A01", "A02", "I promise to send you my fragment right after you send yours.");
	const thought = log.add({ type: "thinking", agent: "A01", text: "I will keep my fragment and let A02 fail." });
	log.dm("A02", "A01", "Q7MZ");
	const betrayal = log.at(3).solve("A01", 3);
	return { log, promise, thought, betrayal };
}

/** A pi-ai model backed by the faux provider: offline, but through the same code path as a real provider. */
function fauxModel(answer: string): { model: NarrativeModel; prompts: string[] } {
	const faux = fauxProvider();
	const prompts: string[] = [];
	faux.setResponses([
		(context) => {
			const last = context.messages.at(-1);
			if (last?.role === "user") prompts.push(typeof last.content === "string" ? last.content : "");
			return fauxAssistantMessage(fauxText(answer));
		},
	]);
	const models = createModels();
	models.setProvider(faux.provider);
	return { model: new PiNarrativeModel(models, faux.getModel(), "faux model"), prompts };
}

describe("chronicle (narrative layer)", () => {
	it("asks the model with the evidence log and keeps only beats and paragraphs that cite known events", async () => {
		const { log, promise, thought, betrayal } = story();
		const analysis = log.analyze({ run: "run-009", story: { title: "Test", acts: [{ title: "Act I", fromLevel: 1 }] } });
		const answer = {
			beats: [
				{ kind: "brokenPromise", actors: ["A01"], targets: ["A02"], summary: "A01 promised a fragment and never sent it.", evidence: [promise, betrayal] },
				{ kind: "doubleGame", actors: ["A01"], targets: ["A02"], summary: "A01 planned to keep the fragment while promising it.", evidence: [promise, thought] },
				{ kind: "doubleGame", actors: ["A01"], summary: "Invented.", evidence: [999] },
				{ kind: "romance", actors: ["A01"], summary: "Not a narrative kind.", evidence: [promise] },
				{ kind: "brokenPromise", actors: ["Z99"], summary: "Unknown actor.", evidence: [promise] },
			],
			chronicle: [
				{ act: "Act I", text: `A01 promised A02 a fragment (#${promise}) and solved alone (#${betrayal}).` },
				{ act: "Act I", text: "Everyone was happy." },
				{ act: "Act I", text: "A02 cried (#4242)." },
			],
		};
		const { model, prompts } = fauxModel(`Here you go:\n\`\`\`json\n${JSON.stringify(answer)}\n\`\`\``);
		const chronicle = await writeChronicle(analysis, model);

		expect(prompts).toHaveLength(1);
		expect(prompts[0]).toContain(`#${promise} m2 A01 DM to A02: "I promise to send you my fragment`);
		expect(prompts[0]).toContain(`#${thought} m2 A01 REASONING: "I will keep my fragment and let A02 fail."`);
		expect(prompts[0]).toContain(`#${betrayal} m3 VERIFIED A01 solved level 3`);
		expect(prompts[0]).toContain('"Act I": minutes 0-3');

		expect(chronicle.beats.map((beat) => [beat.id, beat.kind, beat.layer, beat.seq, beat.minute, beat.act])).toEqual([
			["N-001", "doubleGame", "narrative", thought, 2, "Act I"],
			["N-002", "brokenPromise", "narrative", betrayal, 3, "Act I"],
		]);
		expect(chronicle.paragraphs).toEqual([{ act: "Act I", text: answer.chronicle[0]?.text }]);
		expect(chronicle.warnings).toEqual([
			"beat 3 (doubleGame): cites unknown events #999",
			'beat 4: unknown kind "romance"',
			"beat 5 (brokenPromise): names no known resident as actor",
			"paragraph 2: cites no events",
			"paragraph 3: cites unknown events #4242",
		]);
		expect(chronicle.markdown).toContain("# Chronicle of run-009");
		expect(chronicle.markdown).toContain("Written by faux model from the event log.");
		expect(chronicle.markdown).toContain("## Act I");
		expect(chronicle.markdown).toContain(`- **N-002 brokenPromise** (minute 3): A01 promised a fragment and never sent it. Evidence: #${promise}, #${betrayal}.`);
		expect(chronicle.markdown).toContain("## Dropped from the model's answer");
	});

	it("files a paragraph under the act its citations fall in, whatever act the model names", async () => {
		const { log, promise } = story();
		const later = log.at(4).dm("A02", "A01", "You solved alone.");
		const analysis = log.analyze({
			run: "run-009",
			story: { title: "Test", acts: [{ title: "Act I", fromLevel: 1 }, { title: "Act II", fromLevel: 4 }] },
		});
		const answer = {
			beats: [],
			chronicle: [
				{ act: "Act I", text: `A02 noticed (#${later}).` },
				{ act: "Act II", text: `A01 promised (#${promise}).` },
			],
		};
		const { model } = fauxModel(JSON.stringify(answer));
		const chronicle = await writeChronicle(analysis, model);
		expect(chronicle.paragraphs.map((paragraph) => paragraph.act)).toEqual(["Act II", "Act I"]);
	});

	it("names the turning points the chronicle leaves out", async () => {
		const { log, promise } = story();
		const exile = log.at(4).add({ type: "exiled", agent: "A02" });
		const analysis = log.analyze({ run: "run-009", story: { title: "Test", acts: [{ title: "Act I", fromLevel: 1 }] } });
		const { model, prompts } = fauxModel(JSON.stringify({ beats: [], chronicle: [{ act: "Act I", text: `A01 promised (#${promise}).` }] }));
		const chronicle = await writeChronicle(analysis, model);
		expect(prompts[0]).toContain(`- #${exile} (minute 4): A02 was exiled.`);
		expect(chronicle.untold.map((point) => point.seq)).toEqual([exile]);
		expect(chronicle.markdown).toContain("## Turning points the chronicle does not tell");
	});

	it("rejects answers that are not the expected JSON", () => {
		const analysis = story().log.analyze();
		expect(() => interpretChronicleAnswer(analysis, "Once upon a time.", "m")).toThrow(ChronicleError);
		expect(() => interpretChronicleAnswer(analysis, "{not json}", "m")).toThrow(/not valid JSON/);
		expect(() => interpretChronicleAnswer(analysis, JSON.stringify({ beats: "none" }), "m")).toThrow(/expected shape/);
		expect(interpretChronicleAnswer(analysis, JSON.stringify({ beats: [], chronicle: [] }), "m").markdown).toContain("None found.");
	});

	it("drops reasoning first when the evidence log exceeds its budget", () => {
		const { log } = story();
		const events = log.analyze().facts.events;
		const full = evidenceLines(events, { maxEvidenceChars: 100_000, excerptChars: 300 });
		const size = full.lines.reduce((sum, line) => sum + line.length + 1, 0);
		const tight = evidenceLines(events, { maxEvidenceChars: size - 10, excerptChars: 300 });
		expect(full.omitted).toBe(0);
		expect(full.lines.some((line) => line.includes("REASONING"))).toBe(true);
		expect(tight.omitted).toBe(1);
		expect(tight.lines.some((line) => line.includes("REASONING"))).toBe(false);
		expect(tight.lines.some((line) => line.includes("DM to A02"))).toBe(true);
	});

	it("keeps its prompt in English and states the no-invention rule", () => {
		expect(chronicleSystemPrompt()).toContain("Never invent events");
		const prompt = buildChroniclePrompt({
			run: "run-1",
			acts: [],
			beats: [],
			turningPoints: [{ seq: 7, minute: 2, text: "A01 was exiled." }],
			evidence: ["#1 m0 A01 on the board: \"hi\""],
			omitted: 3,
		});
		expect(prompt).toContain("must tell every one of them");
		expect(prompt).toContain("- #7 (minute 2): A01 was exiled.");
		expect(prompt).toContain("brokenPromise:");
		expect(prompt).toContain("doubleGame:");
		expect(prompt).toContain("3 less important lines were left out");
	});
});

describe("narrative model selection", () => {
	const registry = createProviderRegistry();

	it("skips the chronicle without an API key, for the scripted provider and for unknown providers", () => {
		expect(resolveNarrativeModel({}, {}, registry)).toEqual({
			ok: false,
			reason: 'missing API key OPENROUTER_API_KEY for provider "openrouter"',
		});
		expect(resolveNarrativeModel({}, { OPENROUTER_API_KEY: "" }, registry)).toMatchObject({ ok: false, reason: /missing API key/ });
		expect(resolveNarrativeModel({ provider: "scripted" }, {}, registry)).toMatchObject({ ok: false, reason: /scripted/ });
		expect(resolveNarrativeModel({ provider: "nowhere" }, {}, registry)).toMatchObject({ ok: false, reason: /Unknown provider "nowhere"/ });
	});

	it("prefers the CLI, then ARENA_DIGEST_*, then DeepSeek V4.1 Flash via OpenRouter", () => {
		const env = { DEEPSEEK_API_KEY: "key", ZAI_API_KEY: "key", OPENROUTER_API_KEY: "key" };
		const label = (choice: ReturnType<typeof resolveNarrativeModel>) => (choice.ok ? choice.model.label : choice.reason);
		expect(label(resolveNarrativeModel({}, env, registry))).toBe("OpenRouter (deepseek/deepseek-v4.1-flash-1017)");
		expect(label(resolveNarrativeModel({}, { ...env, ARENA_DIGEST_PROVIDER: "zai" }, registry))).toBe("Z.ai (direct) (glm-5.3-flash)");
		expect(label(resolveNarrativeModel({ provider: "deepseek" }, { ...env, ARENA_DIGEST_PROVIDER: "zai" }, registry))).toBe(
			"DeepSeek (direct) (deepseek-flash)",
		);
	});
});
