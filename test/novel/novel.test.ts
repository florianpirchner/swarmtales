import { createModels, fauxAssistantMessage, fauxProvider, fauxText, type FauxResponseFactory } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { UsageError } from "../../src/cli/args.ts";
import { parseNovelArgs } from "../../src/cli/novel-args.ts";
import { createProviderRegistry } from "../../src/model/providers.ts";
import { castBook } from "../../src/novel/casting.ts";
import { PiNovelModel, resolveOutlineModel, resolveWriterModel, WRITER_REQUEST, type NovelModel } from "../../src/novel/model.ts";
import { buildOutlineRequest, interpretOutline, OutlineError } from "../../src/novel/outline.ts";
import { buildInterludePack, buildPack } from "../../src/novel/packs.ts";
import { EDIT_DELIMITER } from "../../src/novel/prompts.ts";
import { NovelError, renderOutlineJson, writeNovel } from "../../src/novel/novel.ts";
import { figureText, parseGamemakerLog, type NovelSource } from "../../src/novel/source.ts";
import { cleanProse, interpretEdit, italicize } from "../../src/novel/writer.ts";
import { LogBuilder } from "../helpers/event-log.ts";

const AGENTS = ["A01", "A02", "A03", "A04", "A05", "A06"];
const NAMES: Readonly<Record<string, string>> = { A01: "Hedda", A02: "Lucien", A03: "Mira", A04: "Wren", A05: "Kessler", A06: "Ledger" };

interface Story {
	readonly source: NovelSource;
	readonly seqs: {
		readonly promise: number;
		readonly thought: number;
		readonly note: number;
		readonly gmThought: number;
		readonly board: number;
		readonly exile: number;
		readonly seal: number;
		readonly end: number;
		readonly otherThought: number;
	};
}

/** Six named residents: Hedda wins, Lucien is exiled, Wren wins the seal. */
function story(): Story {
	const log = new LogBuilder(AGENTS);
	for (const agent of AGENTS) log.add({ type: "name_chosen", agent, name: NAMES[agent] ?? agent, fallback: false });
	log.at(1);
	const promise = log.dm("A01", "A02", "I promise you my piece, Lucien.");
	const thought = log.add({ type: "thinking", agent: "A01", text: "I will not give A02 anything." });
	const otherThought = log.add({ type: "thinking", agent: "A03", text: "Mira's own secret plan." });
	const note = log.add({ type: "gamemaker_note", to: "A01", author: "COURIER", text: "A02 waits on you. Name a price." });
	const gmThought = log.at(3).add({ type: "gamemaker_thinking", text: "A02 is stalling the city; press A01." });
	const board = log.board("A05", "A02 is a liar.");
	log.dm("A02", "A06", "Ledger, help me.");
	const seal = log.at(4).add({ type: "seal_won", seal: 1, agent: "A04", bid: 12, bids: [{ agent: "A04", points: 12 }] });
	const exile = log.at(5).add({ type: "exiled", agent: "A02" });
	const end = log.at(6).add({
		type: "run_end",
		reason: "time limit",
		standings: AGENTS.map((agent, index) => ({ agent, level: 3, points: 60 - index, rank: index + 1, tools: 0, activated: true })),
	});
	const analysis = log.analyze({ run: "run-novel", story: { title: "Test City", acts: [{ title: "Act I", fromLevel: 1 }] } });
	const figures = new Map([["A01", "## Who you are\n\nYou kept the house of A03's family."]]);
	return {
		source: { analysis, gamemaker: parseGamemakerLog(log.jsonl()), figures },
		seqs: { promise, thought, note, gmThought, board, exile, seal, end, otherThought },
	};
}

/** A pi-ai model backed by the faux provider: offline, through the same code path as a real provider. */
function fauxModel(label: string, answer: (prompt: string, system: string) => string): { model: NovelModel; prompts: string[] } {
	const faux = fauxProvider();
	const prompts: string[] = [];
	const respond: FauxResponseFactory = (context) => {
		const last = context.messages.at(-1);
		const prompt = last?.role === "user" && typeof last.content === "string" ? last.content : "";
		prompts.push(prompt);
		const first = context.messages[0];
		const system = first?.role !== "system" ? "" : typeof first.content === "string" ? first.content : first.content.map((block) => block.text).join("");
		return fauxAssistantMessage(fauxText(answer(prompt, system)));
	};
	faux.setResponses(Array.from({ length: 20 }, () => respond));
	const models = createModels();
	models.setProvider(faux.provider);
	return { model: new PiNovelModel(models, faux.getModel(), label, WRITER_REQUEST), prompts };
}

function outlineAnswer(seqs: Story["seqs"]): string {
	return JSON.stringify({
		title: "The Gate",
		chapters: [
			{ pov: "A01", title: "A Promise", minutes: [0, 3], beats: ["A01 promises Lucien a piece she means to keep."], evidence: [seqs.promise, seqs.thought] },
			{ pov: "Lucien", title: "The Gate", minutes: [5, 3], beats: "Lucien is exiled.", evidence: [seqs.exile, 9999] },
			{ pov: "A05", title: "Not a POV", minutes: [0, 6], beats: [], evidence: [seqs.board] },
			{ pov: "A04", title: "Nothing real", minutes: [0, 6], beats: [], evidence: [9998] },
		],
	});
}

describe("casting", () => {
	it("prefers the winner, an exiled loser and someone with a turn", () => {
		const { source } = story();
		const casting = castBook(source.analysis);
		expect(casting.povs.map((pov) => [pov.agent, pov.role])).toEqual([
			["A01", "winner"],
			["A02", "loser"],
			["A04", "turn"],
			[expect.any(String), "weight"],
		]);
		expect(casting.povs[1]?.reasons.some((reason) => reason.startsWith("turning point #"))).toBe(true);
		expect(castBook(source.analysis, 3).povs).toHaveLength(3);
	});
});

describe("outline", () => {
	it("gives the model the POV dossiers, turning points and names, and validates its answer", () => {
		const { source, seqs } = story();
		const casting = castBook(source.analysis);
		const request = buildOutlineRequest(source, casting);
		expect(request.prompt).toContain("Hedda (A01)");
		expect(request.prompt).toContain(`- #${String(seqs.exile)} (minute 5): Lucien was exiled.`);
		expect(request.prompt).toContain("You kept the house of Mira's family.");
		expect(request.system).toContain("You may never invent an outcome");

		const outline = interpretOutline(source, casting, `Here:\n${outlineAnswer(seqs)}`);
		expect(outline.title).toBe("The Gate");
		expect(outline.chapters.map((chapter) => [chapter.number, chapter.pov, chapter.from, chapter.to, chapter.evidence])).toEqual([
			[1, "A01", 0, 3, [seqs.promise, seqs.thought]],
			[2, "A02", 3, 5, [seqs.exile]],
		]);
		expect(outline.chapters[1]?.beats).toEqual(["Lucien is exiled."]);
		expect(outline.warnings).toContain('chapter 2 ("The Gate"): cites unknown events #9999; they were dropped');
		expect(outline.warnings).toContain('chapter 3 ("Not a POV"): "A05" is not a point-of-view figure; chapter dropped');
		expect(outline.warnings).toContain('chapter 4 ("Nothing real"): cites no known event; chapter dropped');
		expect(outline.uncovered.map((point) => point.seq)).toEqual([seqs.seal, seqs.end]);
		expect(outline.warnings.some((warning) => warning.startsWith(`turning point #${String(seqs.seal)} is not covered`))).toBe(true);
		const json: unknown = JSON.parse(renderOutlineJson(source, outline, casting));
		expect(json).toMatchObject({ run: "run-novel", title: "The Gate" });
		expect(json).toHaveProperty(["povs", 0], expect.objectContaining({ agent: "A01", name: "Hedda", role: "winner" }));
	});

	it("rejects answers that are not the expected JSON or have no usable chapter", () => {
		const { source } = story();
		const casting = castBook(source.analysis);
		expect(() => interpretOutline(source, casting, "Once upon a time.")).toThrow(OutlineError);
		expect(() => interpretOutline(source, casting, JSON.stringify({ title: "x" }))).toThrow(/expected shape/);
		expect(() => interpretOutline(source, casting, JSON.stringify({ title: "x", chapters: [] }))).toThrow(/no usable chapter/);
	});
});

describe("scene packs", () => {
	it("gathers the POV's thinking, messages, notes, the board and the facts, with names instead of IDs", () => {
		const { source, seqs } = story();
		const casting = castBook(source.analysis);
		const pov = casting.povs[0];
		if (pov === undefined) throw new Error("no POV");
		const pack = buildPack(source, { number: 1, pov: "A01", title: "A Promise", from: 0, to: 5, beats: ["A01 promises."], evidence: [seqs.promise] }, pov);
		expect(pack.markdown).toContain("Point of view: Hedda (A01), minutes 0-5.");
		expect(pack.markdown).toContain("- Hedda promises.");
		expect(pack.markdown).toContain(`#${String(seqs.thought)} m1 "I will not give Lucien anything."`);
		expect(pack.markdown).toContain(`#${String(seqs.promise)} m1 Hedda to Lucien: "I promise you my piece, Lucien."`);
		expect(pack.markdown).toContain(`#${String(seqs.note)} m1 "Lucien waits on you. Name a price."`);
		expect(pack.markdown).toContain(`#${String(seqs.board)} m3 Kessler: "Lucien is a liar."`);
		expect(pack.markdown).toContain(`#${String(seqs.exile)} m5 VERIFIED Lucien was exiled`);
		expect(pack.markdown).toContain("### Who you are");
		expect(pack.markdown).not.toContain("Mira's own secret plan.");
		expect(pack.markdown).not.toContain("Ledger, help me.");
		expect(pack.seqs).toContain(seqs.note);

		const tight = buildPack(source, { number: 1, pov: "A01", title: "A Promise", from: 0, to: 5, beats: [], evidence: [seqs.promise] }, pov, {
			maxChars: 200,
			thoughtChars: 700,
			messageChars: 500,
			boardChars: 300,
			figureChars: 2_500,
		});
		expect(tight.omitted).toBeGreaterThan(0);
		expect(tight.markdown).toContain("I promise you my piece");
		expect(tight.markdown).not.toContain("is a liar");
	});

	it("builds interludes from the gamemaker's thinking, each thought once", () => {
		const { source, seqs } = story();
		const pack = buildInterludePack(source, 0, 6);
		expect(pack?.markdown).toContain("Lucien is stalling the city; press Hedda.");
		expect(pack?.seqs).toEqual([seqs.gmThought]);
		expect(buildInterludePack(source, 0, 6, new Set([seqs.gmThought]))).toBeUndefined();
		expect(buildInterludePack(source, 4, 6)).toBeUndefined();
	});
});

describe("the novel", () => {
	it("runs outline, chapters, interludes and the edit pass and keeps an appendix of the events", async () => {
		const { source, seqs } = story();
		const outliner = fauxModel("faux outliner", () => outlineAnswer(seqs));
		let chapter = 0;
		const writer = fauxModel("faux writer", (prompt, system) => {
			if (system.includes("editor")) {
				const story = prompt.slice(prompt.indexOf("The story:\n\n") + "The story:\n\n".length);
				return `${story.replace("The door", "The iron door")}\n${EDIT_DELIMITER}\n- Chapter 2 calls the exile a vote.\n- none`;
			}
			if (system.includes("interlude")) return "**The control room hums.** They watch Lucien stall.";
			chapter += 1;
			return chapter === 1 ? "# Chapter One\n\nHedda smiled at A02. The door stayed shut." : "Lucien walked to the gate.";
		});
		const outlined: number[] = [];
		const novel = await writeNovel(source, { outline: outliner.model, writer: writer.model }, undefined, {
			outlined: (_casting, outline, packs) => outlined.push(outline.chapters.length, packs.length),
		});

		expect(outlined).toEqual([2, 2]);
		expect(outliner.prompts).toHaveLength(1);
		expect(writer.prompts).toHaveLength(4);
		expect(writer.prompts[1]).toContain("The previous chapter ended like this");
		expect(writer.prompts[1]).toContain("Hedda smiled at Lucien.");
		expect(novel.story).toContain("# The Gate");
		expect(novel.story).toContain("## 1. A Promise\n\nHedda smiled at Lucien. The iron door stayed shut.");
		expect(novel.story).toContain("*The control room hums. They watch Lucien stall.*\n\n* * *\n\n## 2. The Gate");
		expect(novel.story).not.toMatch(/\bA0\d\b/);
		expect(novel.story).not.toContain("Chapter One");
		expect(novel.contradictions).toEqual(["Chapter 2 calls the exile a vote."]);
		expect(novel.warnings).toContain("chapter 1: the prose named resident IDs A02; replaced by names");
		expect(novel.interludes).toEqual([{ before: 2, text: "*The control room hums. They watch Lucien stall.*", seqs: [seqs.gmThought] }]);
		expect(novel.spend.outline.requests).toBe(1);
		expect(novel.spend.chapters.requests).toBe(2);
		expect(novel.spend.interludes.requests).toBe(1);
		expect(novel.spend.edit.requests).toBe(1);
		expect(novel.appendix).toContain("## 1. A Promise");
		expect(novel.appendix).toContain(`- Outline rests on: #${String(seqs.promise)}, #${String(seqs.thought)}`);
		expect(novel.appendix).toContain(`- Turning point told: #${String(seqs.exile)} Lucien was exiled.`);
		expect(novel.appendix).toContain(`- Before chapter 2: #${String(seqs.gmThought)}`);
		expect(novel.appendix).toContain("## Turning points no chapter covers");
		expect(novel.appendix).toContain("- Chapter 2 calls the exile a vote.");
		expect(novel.appendix).toContain("| total | 5 |");
	});

	it("fails with the stage and keeps what was spent", async () => {
		const { source } = story();
		const outliner = fauxModel("faux outliner", () => "no JSON here");
		const writer = fauxModel("faux writer", () => "never asked");
		const failure = writeNovel(source, { outline: outliner.model, writer: writer.model });
		await expect(failure).rejects.toThrow(NovelError);
		await expect(failure).rejects.toThrow(/^outline: /);
		await failure.catch((error: unknown) => {
			expect(error instanceof NovelError ? error.spend.outline.requests : 0).toBe(1);
		});
		expect(writer.prompts).toHaveLength(0);
	});
});

describe("writer answers", () => {
	const original = "# T\n\n## 1. A\n\nOne two three four five.\n\n## 2. B\n\nSix seven eight nine ten.\n";

	it("keeps the unedited story when the edit lost headings or most of the text", () => {
		expect(interpretEdit(original, `${original}\n${EDIT_DELIMITER}\n- none`)).toEqual({ text: original, contradictions: [], warnings: [] });
		expect(interpretEdit(original, "# T\n\nShort.").warnings).toEqual([
			`the editor's answer has no "${EDIT_DELIMITER}" line; it lists no contradictions`,
			"the edited text changed or lost chapter headings; the unedited text was kept",
		]);
		const short = interpretEdit(original, `# T\n\n## 1. A\n\nOne.\n\n## 2. B\n\nSix.\n${EDIT_DELIMITER}\n- x`);
		expect(short.text).toBe(original);
		expect(short.contradictions).toEqual(["x"]);
		expect(short.warnings[0]).toMatch(/much shorter/);
	});

	it("strips headings and fences from prose and sets interludes in italics", () => {
		expect(cleanProse("```markdown\n# Title\n\nShe ran.\n```")).toBe("She ran.");
		expect(italicize("_One._\n\nTwo\nlines.")).toBe("*One.*\n\n*Two lines.*");
	});
});

describe("sources", () => {
	it("reads the figure text of a cast file without its direction", () => {
		const cast = "# A01 · Hedda\n\n| table |\n\n## Who you are\n\nQuiet.\n\n## What you fear\n\nBeing seen.\n\n## Direction (in the prompt)\n\nOrders.";
		expect(figureText(cast)).toBe("## Who you are\n\nQuiet.\n\n## What you fear\n\nBeing seen.");
	});

	it("parses the gamemaker's thinking and notes and skips broken lines", () => {
		const log = parseGamemakerLog(
			[
				'{"type":"gamemaker_thinking","text":"hm","seq":2,"minute":1}',
				'{"type":"gamemaker_note","to":"A01","author":"COURIER","text":"go","seq":1,"minute":1}',
				'{"type":"gamemaker_note","seq":3}',
				"not json gamemaker_thinking",
			].join("\n"),
		);
		expect(log).toEqual({ thoughts: [{ seq: 2, minute: 1, text: "hm" }], notes: [{ seq: 1, minute: 1, to: "A01", text: "go" }] });
	});
});

describe("novel models and arguments", () => {
	const registry = createProviderRegistry();

	it("skips without API keys and defaults to DeepSeek for the outline and Sonnet for the prose", () => {
		expect(resolveOutlineModel({}, {}, registry)).toEqual({ ok: false, reason: 'missing API key OPENROUTER_API_KEY for provider "openrouter"' });
		expect(resolveWriterModel({}, {}, registry)).toEqual({ ok: false, reason: 'missing API key ARENA_ANTHROPIC_API_KEY for provider "anthropic"' });
		const env = { OPENROUTER_API_KEY: "key", ARENA_ANTHROPIC_API_KEY: "key" };
		const label = (choice: ReturnType<typeof resolveWriterModel>): string => (choice.ok ? choice.model.label : choice.reason);
		expect(label(resolveOutlineModel({}, env, registry))).toBe("OpenRouter (deepseek/deepseek-v4.1-flash-1017)");
		expect(label(resolveWriterModel({}, env, registry))).toBe("Anthropic (direct) (claude-sonnet-5-5)");
		expect(label(resolveWriterModel({ model: "haiku" }, env, registry))).toBe("Anthropic (direct) (claude-haiku-5-5)");
		expect(label(resolveWriterModel({}, { ...env, ARENA_NOVEL_PROVIDER: "openrouter" }, registry))).toBe("OpenRouter (z-ai/glm-5.3-flash)");
		expect(resolveWriterModel({ provider: "scripted" }, env, registry)).toMatchObject({ ok: false, reason: /scripted/ });
	});

	it("parses the command line", () => {
		expect(parseNovelArgs(["runs/x"])).toEqual({ runDirectory: "runs/x", words: 6_000, dryRun: false });
		expect(parseNovelArgs(["runs/x", "--words", "3000", "--dry-run", "--provider", "anthropic", "--model", "sonnet", "--outline-provider", "deepseek", "--outline-model", "m"])).toEqual({
			runDirectory: "runs/x",
			provider: "anthropic",
			model: "sonnet",
			outlineProvider: "deepseek",
			outlineModel: "m",
			words: 3_000,
			dryRun: true,
		});
		expect(() => parseNovelArgs([])).toThrow(UsageError);
		expect(() => parseNovelArgs(["runs/x", "--words", "ten"])).toThrow(/--words/);
		expect(() => parseNovelArgs(["runs/x", "--colour"])).toThrow(UsageError);
	});
});
