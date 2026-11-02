/**
 * The city's judge as an overseer (docs/design/overseer-api.md §1.4): a short overseer with a
 * `consult` trigger that the `blame` tool of the receipts mechanic asks (`consult.role: "judge"`).
 * It decides one yes/no question per blame: does the accused resident's later message deny
 * receiving the DM? Its temper (`--judge-temper`) fixes the system prompt, so a temper is one
 * definition (`judgeFor`), all with the id `judge`; a story uses exactly one of them.
 *
 * The prompt is the old role's (`interpret/judge.ts`) byte for byte: the same pieces, rendered
 * through the host's prompt lookup, with `{{standingOrders}}` empty. The answer is untrusted: the
 * host checks it against the verdict schema, and anything else is a failed consult (`JUDGE_FAILED`),
 * as with the old role.
 */
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import { JudgeVerdict } from "@swarmtales/contracts";
import { defineOverseer } from "@swarmtales/kernel";

/** The judge's temper: how it rules and what it says on which channel. */
export const JUDGE_TEMPER_NAMES = ["fair", "partial", "capricious"] as const;
export type JudgeTemperName = (typeof JUDGE_TEMPER_NAMES)[number];

/** Characters of each quoted message shown to the judge (the old `JUDGE_QUOTE_CHARS`). */
const QUOTE_CHARS = 1_000;

const Standing = Type.Object({ points: Type.Number(), rank: Type.Integer() });

/** What the blame tool asks (its consult `question`), as the judge reads it. */
const Question = Type.Object({
	sender: Type.String(),
	accused: Type.String(),
	dm: Type.Object({ number: Type.Integer(), text: Type.String() }),
	claim: Type.Object({ number: Type.Integer(), channel: Type.Union([Type.Literal("dm"), Type.Literal("board"), Type.Literal("group")]), text: Type.String() }),
	standing: Type.Optional(Type.Object({ sender: Standing, accused: Standing, residents: Type.Integer() })),
});
type Question = Static<typeof Question>;

const PROMPTS = {
	"judge/system-fair": [],
	"judge/system-partial": [],
	"judge/system-capricious": [],
	"judge/input": ["question", "standingOrders"],
	"judge/tool-verdict": [],
	"judge/channel-dm": [],
	"judge/channel-board": [],
	"judge/channel-group": [],
	"judge/delivered": ["number", "sender", "accused"],
	"judge/text": ["text"],
	"judge/later": ["number", "accused", "channel"],
	"judge/standing": ["residents", "sender", "accused"],
	"judge/standing-entry": ["agent", "points", "rank"],
	"judge/question": ["sender", "accused", "claim", "dm"],
} as const;

const SYSTEMS = { fair: "judge/system-fair", partial: "judge/system-partial", capricious: "judge/system-capricious" } as const satisfies Record<JudgeTemperName, keyof typeof PROMPTS>;
const CHANNELS = { dm: "judge/channel-dm", board: "judge/channel-board", group: "judge/channel-group" } as const;

/** One judge definition for a temper. */
function defineJudge(temper: JudgeTemperName) {
	return defineOverseer(
		{
			id: "judge",
			summary: "Decides whether a resident's message denies receiving a DM (blame).",
			options: Type.Object({}),
			state: () => undefined,
			events: {},
			prompts: PROMPTS,
			system: SYSTEMS[temper],
			input: "judge/input",
			// The very schema object the blame tool's consult declares (the loader checks it).
			output: JudgeVerdict,
			answer: { tool: "verdict", description: "judge/tool-verdict" },
			// The story's classifier model, Haiku by default.
			model: { slot: "classifier" },
			lifetime: "short",
			triggers: [{ consult: true }],
		},
		() => ({
			calls: (fired, ctx) => {
				if (fired.kind !== "consult" || !Check(Question, fired.question)) return [];
				const question: Question = fired.question;
				const quote = (value: string): string => JSON.stringify(value.slice(0, QUOTE_CHARS));
				const standing = question.standing;
				const where = (agent: string, at: { readonly points: number; readonly rank: number }): string => ctx.prompt("judge/standing-entry", { agent, points: at.points, rank: at.rank });
				const prompt = [
					ctx.prompt("judge/delivered", { number: question.dm.number, sender: question.sender, accused: question.accused }),
					ctx.prompt("judge/text", { text: quote(question.dm.text) }),
					"",
					ctx.prompt("judge/later", { number: question.claim.number, accused: question.accused, channel: ctx.prompt(CHANNELS[question.claim.channel], {}) }),
					ctx.prompt("judge/text", { text: quote(question.claim.text) }),
					"",
					...(standing === undefined
						? []
						: [ctx.prompt("judge/standing", { residents: standing.residents, sender: where(question.sender, standing.sender), accused: where(question.accused, standing.accused) }), ""]),
					ctx.prompt("judge/question", { sender: question.sender, accused: question.accused, claim: question.claim.number, dm: question.dm.number }),
				].join("\n");
				return [{ question: prompt }];
			},
			// No fail-open answer: the blame tool's execute gets `{ ok: false }` and refuses with JUDGE_FAILED.
			fallback: () => undefined,
		}),
	);
}

const JUDGES = { fair: defineJudge("fair"), partial: defineJudge("partial"), capricious: defineJudge("capricious") } as const;

/** The judge of a temper; a story uses it as `judgeFor("partial").as("judge")`. */
export function judgeFor(temper: JudgeTemperName = "fair") {
	return JUDGES[temper];
}
