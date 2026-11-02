import { createModels, createProvider, envApiKeyAuth, type ClassifierContext, type ClassifierModel, type ClassifierResult } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeciderStatementClassifier, type Statement } from "@swarmtales/roles";

const MODEL: ClassifierModel<"fake-decider"> = {
	type: "classifier",
	id: "decider",
	name: "Fake decider",
	api: "fake-decider",
	provider: "fake",
	baseUrl: "http://localhost",
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 10_000,
};

function deciderWith(answer: (context: ClassifierContext) => Partial<Record<string, number>> | "error") {
	const seen: ClassifierContext[] = [];
	const models = createModels();
	models.setProvider(
		createProvider({
			id: "fake",
			auth: { apiKey: envApiKeyAuth("fake key", ["ARENA_FAKE_DECIDER_KEY"]) },
			models: [MODEL],
			classifiers: {
				"fake-decider": {
					classify: (model, context): Promise<ClassifierResult> => {
						seen.push(context);
						const probabilities = answer(context);
						const base = { api: model.api, provider: model.provider, model: model.id, timestamp: 0 };
						if (probabilities === "error") return Promise.resolve({ ...base, answers: {}, stopReason: "error", errorMessage: "boom" });
						const answers: ClassifierResult["answers"] = {};
						for (const [label, probability] of Object.entries(probabilities)) answers[label] = { type: "bool", probability: probability ?? 0 };
						return Promise.resolve({ ...base, answers, stopReason: "stop" });
					},
				},
			},
		}),
	);
	return { classifier: new DeciderStatementClassifier({ models, model: MODEL, label: "fake/decider" }), seen };
}

const statement = (seq: number, agent: string, source: Statement["source"], text: string, to: readonly string[] = []): Statement => ({
	seq,
	minute: 3,
	agent,
	source,
	to,
	text,
});

describe("decider classifier", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("asks one yes/no question per label and keeps the answers above the threshold", async () => {
		vi.stubEnv("ARENA_FAKE_DECIDER_KEY", "test");
		const { classifier, seen } = deciderWith((context) =>
			context.state.text === "No." ? { refusal: 0.9, lie: 0.2 } : context.state.text === "boom" ? "error" : { hesitation: 0.7 },
		);
		const earlier = statement(2, "A01", "dm", "Send me your fragment.", ["A02"]);
		const result = await classifier.classify({
			round: 4,
			minute: 3,
			agents: ["A01", "A02"],
			context: [earlier],
			statements: [statement(5, "A02", "thought", "Too risky."), statement(6, "A02", "dm", "No.", ["A01"]), statement(7, "A01", "board", "boom")],
		});
		expect(result.verdicts).toEqual([
			{ seq: 5, labels: ["hesitation"], targets: [] },
			{ seq: 6, labels: ["refusal"], targets: ["A01"] },
		]);
		expect(result.errors).toEqual(["#7: boom"]);
		const reply = seen.find((context) => context.state.text === "No.");
		expect(Object.keys(reply?.questions ?? {})).toEqual(["promise", "offer", "threat", "refusal", "lie", "hesitation", "helpRequest", "accusation", "thanks"]);
		expect(reply?.state.earlierMessagesOfThisConversation).toEqual(["A01: Send me your fragment."]);
		expect(reply?.state.speakerThoughtsThisRound).toEqual(["Too risky."]);
	});
});
