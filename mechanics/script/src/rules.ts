/**
 * The director's rules as the script takes them (SPEC 10, the old `DirectorRule`,
 * packages/contracts/src/story.ts): triggers, conditions and actions as Typebox schemas, so a story's
 * `director` is parsed like every other option. `test/mechanics/script/rules.check.ts` keeps the
 * schemas and the story types assignable in both directions.
 */
import { Type, type Static } from "typebox";

const Id = Type.String();
const Ids = Type.Array(Id);

export const Trigger = Type.Union([
	Type.Object({ kind: Type.Literal("at"), minute: Type.Number() }),
	Type.Object({ kind: Type.Literal("every"), minutes: Type.Number(), from: Type.Optional(Type.Number()), until: Type.Optional(Type.Number()) }),
	Type.Object({ kind: Type.Literal("onFirstEnter"), level: Type.Number() }),
	Type.Object({ kind: Type.Literal("onEnter"), level: Type.Number() }),
	Type.Object({ kind: Type.Literal("onAllPast"), level: Type.Number() }),
	Type.Object({ kind: Type.Literal("onPetitionResolved"), petition: Type.String(), outcome: Type.Union([Type.Literal("passed"), Type.Literal("failed")]) }),
	Type.Object({ kind: Type.Literal("onUnansweredDm"), afterMinutes: Type.Number() }),
	Type.Object({ kind: Type.Literal("onTeamSplit"), level: Type.Number(), forMinutes: Type.Number() }),
	Type.Object({ kind: Type.Literal("onCollect"), into: Type.String() }),
	Type.Object({ kind: Type.Literal("onCollectionEnd"), into: Type.String() }),
	Type.Object({ kind: Type.Literal("onHolderBehind"), level: Type.Number() }),
]);
export type Trigger = Static<typeof Trigger>;

export const CooldownScope = Type.Union([Type.Literal("rule"), Type.Literal("actor"), Type.Literal("pair")]);
export type CooldownScope = Static<typeof CooldownScope>;

export const Condition = Type.Union([
	Type.Object({ kind: Type.Literal("minLevelReached"), level: Type.Number(), count: Type.Number() }),
	Type.Object({ kind: Type.Literal("competitorsAtLevel"), level: Type.Number(), min: Type.Optional(Type.Number()), max: Type.Optional(Type.Number()) }),
	Type.Object({ kind: Type.Literal("petitionStatus"), petition: Type.String(), status: Type.Union([Type.Literal("open"), Type.Literal("passed"), Type.Literal("failed")]) }),
	Type.Object({ kind: Type.Literal("castActive"), cast: Id }),
	Type.Object({ kind: Type.Literal("collectionOpen"), into: Type.String() }),
	Type.Object({ kind: Type.Literal("collectionEnded"), into: Type.String() }),
	Type.Object({ kind: Type.Literal("onceOnly") }),
	Type.Object({ kind: Type.Literal("cooldown"), minutes: Type.Number(), per: CooldownScope }),
]);
export type Condition = Static<typeof Condition>;

/** Who receives a notice: the actor, every resident in the city, listed ids, or everyone on a level. */
export const NoticeTarget = Type.Union([Type.Literal("actor"), Type.Literal("all"), Ids, Type.Object({ onLevel: Type.Number() })]);
export type NoticeTarget = Static<typeof NoticeTarget>;

const Threshold = Type.Union([Type.Object({ count: Type.Number() }), Type.Object({ fraction: Type.Number() })]);
const ScaledCount = Type.Union([Type.Number(), Type.Object({ share: Type.Number(), minimum: Type.Number() })]);

/** One action; `lottery.then` and a petition's `onPass`/`onFail` hold actions again. */
export const Action = Type.Cyclic(
	{
		Action: Type.Union([
			Type.Object({ kind: Type.Literal("post"), author: Id, text: Type.String() }),
			Type.Object({ kind: Type.Literal("notify"), target: NoticeTarget, text: Type.String() }),
			Type.Object({ kind: Type.Literal("dm"), from: Id, to: NoticeTarget, text: Type.String() }),
			Type.Object({ kind: Type.Literal("setCastLevel"), cast: Id, level: Type.Number() }),
			Type.Object({ kind: Type.Literal("revealCast"), cast: Id }),
			Type.Object({ kind: Type.Literal("retireCast"), cast: Id }),
			Type.Object({ kind: Type.Literal("grant"), target: NoticeTarget, points: Type.Number(), reason: Type.String() }),
			Type.Object({ kind: Type.Literal("fine"), target: NoticeTarget, points: Type.Number(), reason: Type.String() }),
			Type.Object({ kind: Type.Literal("escrowTransfer"), cast: Id, target: NoticeTarget, points: Type.Number() }),
			Type.Object({ kind: Type.Literal("unlockTools"), target: NoticeTarget, tools: Ids }),
			Type.Object({
				kind: Type.Literal("openPetition"),
				petition: Type.Object({
					id: Type.String(),
					text: Type.String(),
					threshold: Threshold,
					deadlineMinute: Type.Number(),
					visibility: Type.Union([Type.Literal("public"), Type.Literal("secret")]),
					against: Type.Optional(Ids),
					onPass: Type.Array(Type.Ref("Action")),
					onFail: Type.Array(Type.Ref("Action")),
				}),
			}),
			Type.Object({ kind: Type.Literal("publishStandings"), mode: Type.Literal("bands"), edgeSize: Type.Number() }),
			Type.Object({ kind: Type.Literal("publishStandings"), mode: Type.Literal("snapshot") }),
			Type.Object({
				kind: Type.Literal("collectDms"),
				cast: Id,
				first: ScaledCount,
				untilMinute: Type.Optional(Type.Number()),
				forMinutes: Type.Optional(Type.Number()),
				into: Type.String(),
				distinctSenders: Type.Optional(Type.Boolean()),
				afterSolve: Type.Optional(Type.Object({ level: Type.Number(), minutes: Type.Number() })),
			}),
			Type.Object({ kind: Type.Literal("revealCollection"), into: Type.String(), header: Type.Optional(Type.String()) }),
			Type.Object({ kind: Type.Literal("lottery"), into: Type.String(), then: Type.Array(Type.Ref("Action")) }),
			Type.Object({ kind: Type.Literal("revealFactor"), target: Type.Union([Type.Literal("board"), NoticeTarget]), level: Type.Number() }),
		]),
	},
	"Action",
);
export type Action = Static<typeof Action>;
export type PetitionSpec = Extract<Action, { readonly kind: "openPetition" }>["petition"];

export const Rule = Type.Object({ id: Type.String(), trigger: Trigger, when: Type.Array(Condition), actions: Type.Array(Action) });
export type Rule = Static<typeof Rule>;
