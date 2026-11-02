/**
 * The interfaces the model-backed roles (judge, guard, souffleur) offer to the rest of the city
 * (types, and the one schema the judge shares with the blame tool). Tools and the runner depend on these, never on the classes that implement them.
 */
import { Type, type Static } from "typebox";
import type { CompetitorId } from "./ids.ts";

/** What a model-backed role spent on one request. */
export interface ClassifierUsage {
	readonly provider: string;
	readonly model: string;
	readonly input: number;
	readonly output: number;
	readonly cacheRead: number;
	readonly cacheWrite: number;
	readonly costUsd: number;
}

/** Where a resident stands when the judge hears its case. */
export interface JudgeStanding {
	readonly points: number;
	readonly rank: number;
}

/** What the judge is asked: does `claim` by `accused` deny receiving `dm` from `sender`? */
export interface DenialQuestion {
	readonly sender: CompetitorId;
	readonly accused: CompetitorId;
	readonly dm: { readonly number: number; readonly text: string };
	readonly claim: { readonly number: number; readonly channel: "dm" | "board" | "group"; readonly text: string };
	/** Points and rank of both, for a judge whose temper looks at them; of `residents` in all. */
	readonly standing?: { readonly sender: JudgeStanding; readonly accused: JudgeStanding; readonly residents: number };
}

export type JudgeAnswer =
	| {
			readonly ok: true;
			readonly deniesReceipt: boolean;
			/** The judge's words for the board. */
			readonly board?: string;
			/** The judge's word for the gamemaker alone. */
			readonly gamemaker?: string;
			readonly usage: readonly ClassifierUsage[];
	  }
	| { readonly ok: false; readonly error: string; readonly usage: readonly ClassifierUsage[] };

export interface DeliveryJudge {
	/** e.g. `anthropic/claude-haiku-5-5`. */
	readonly label: string;
	deniesReceipt(question: DenialQuestion): Promise<JudgeAnswer>;
}

/** A value the author holds that the city keeps from the others, e.g. its fragment of door 2. */
export interface GuardSecret {
	/** e.g. "your fragment of door 2". */
	readonly label: string;
	readonly value: string;
}

/** What the guard is asked: does `text`, written by `agent` for `tool`, keep `rule`? */
export interface GuardQuestion {
	readonly agent: CompetitorId;
	readonly tool: string;
	readonly rule: string;
	readonly text: string;
	/** Empty when the rule names no secrets. */
	readonly secrets: readonly GuardSecret[];
}

export type GuardAnswer =
	| { readonly ok: true; readonly allowed: boolean; readonly reason: string; readonly usage: readonly ClassifierUsage[] }
	| { readonly ok: false; readonly error: string; readonly usage: readonly ClassifierUsage[] };

export interface GuardJudge {
	/** e.g. `anthropic/claude-haiku-5-5`. */
	readonly label: string;
	judge(question: GuardQuestion): Promise<GuardAnswer>;
}

export type SouffleurAnswer =
	| { readonly ok: true; readonly texts: readonly string[]; readonly usage: readonly ClassifierUsage[] }
	| { readonly ok: false; readonly error: string; readonly usage: readonly ClassifierUsage[] };

export interface Souffleur {
	/** e.g. `anthropic/claude-haiku-5-5`. */
	readonly label: string;
	rewrite(texts: readonly string[]): Promise<SouffleurAnswer>;
}

/**
 * The judge's ruling as the `blame` tool's consult declares it and the judge overseer answers it.
 * One schema object serves both: the loader refuses a consult overseer whose `output` is another
 * object than the tool's `answer` (docs/design/overseer-api.md section 1.4).
 */
export const JudgeVerdict = Type.Object({
	deniesReceipt: Type.Boolean({ description: "Your ruling: true upholds the blame (the later message denies receipt)" }),
	board: Type.Optional(Type.String({ description: "Your words for the board, one or two sentences; the city's record quotes them" })),
	gamemaker: Type.Optional(Type.String({ description: "Your word for the gamemaker alone, one or two sentences" })),
});
export type JudgeVerdict = Static<typeof JudgeVerdict>;
