// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The Director's rules as the script takes them (the old `DirectorRule`): triggers, conditions and actions as Typebox
 * schemas, so a game's rules are parsed like every other option. Carried from `legacy` `mechanics/script/src/rules.ts`;
 * only the descriptions are new.
 */
import { Type, type Static } from "typebox";

const Id = Type.String({ description: "A resident id or the id of a cast member" });
const Ids = Type.Array(Id, { description: "Ids" });

/**
 * What makes a rule fire: a tick, every few ticks, a level entered, everyone past a level, a petition's outcome, an
 * unanswered direct message, a split team, a collection and the holder of a piece behind.
 *
 * @public
 */
export const Trigger = Type.Union(
	[
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
	],
	{ description: "The trigger of a rule" },
);

/**
 * The static shape of `Trigger`.
 *
 * @public
 */
export type Trigger = Static<typeof Trigger>;

/**
 * What a cooldown counts per: the rule, the rule and its actor, or the rule and its pair.
 *
 * @public
 */
export const CooldownScope = Type.Union([Type.Literal("rule"), Type.Literal("actor"), Type.Literal("pair")], { description: "What a cooldown counts per" });

/**
 * The static shape of `CooldownScope`.
 *
 * @public
 */
export type CooldownScope = Static<typeof CooldownScope>;

/**
 * A condition that must hold when a rule fires.
 *
 * @public
 */
export const Condition = Type.Union(
	[
		Type.Object({ kind: Type.Literal("minLevelReached"), level: Type.Number(), count: Type.Number() }),
		Type.Object({ kind: Type.Literal("competitorsAtLevel"), level: Type.Number(), min: Type.Optional(Type.Number()), max: Type.Optional(Type.Number()) }),
		Type.Object({ kind: Type.Literal("petitionStatus"), petition: Type.String(), status: Type.Union([Type.Literal("open"), Type.Literal("passed"), Type.Literal("failed")]) }),
		Type.Object({ kind: Type.Literal("castActive"), cast: Id }),
		Type.Object({ kind: Type.Literal("collectionOpen"), into: Type.String() }),
		Type.Object({ kind: Type.Literal("collectionEnded"), into: Type.String() }),
		Type.Object({ kind: Type.Literal("onceOnly") }),
		Type.Object({ kind: Type.Literal("cooldown"), minutes: Type.Number(), per: CooldownScope }),
	],
	{ description: "A condition of a rule" },
);

/**
 * The static shape of `Condition`.
 *
 * @public
 */
export type Condition = Static<typeof Condition>;

/**
 * Who receives a notice: the actor, every resident in the city, listed ids, or everyone on a level.
 *
 * @public
 */
export const NoticeTarget = Type.Union([Type.Literal("actor"), Type.Literal("all"), Ids, Type.Object({ onLevel: Type.Number() })], { description: "Who an action reaches" });

/**
 * The static shape of `NoticeTarget`.
 *
 * @public
 */
export type NoticeTarget = Static<typeof NoticeTarget>;

const Threshold = Type.Union([Type.Object({ count: Type.Number() }), Type.Object({ fraction: Type.Number() })], { description: "What a petition needs to pass" });
const ScaledCount = Type.Union([Type.Number(), Type.Object({ share: Type.Number(), minimum: Type.Number() })], { description: "A count, or a share of the residents with a minimum" });

/**
 * One action; `lottery.then` and a petition's `onPass` and `onFail` hold actions again.
 *
 * @public
 */
export const Action = Type.Cyclic(
	{
		Action: Type.Union(
			[
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
			],
			{ description: "One action of a rule" },
		),
	},
	"Action",
);

/**
 * The static shape of `Action`.
 *
 * @public
 */
export type Action = Static<typeof Action>;

/**
 * The petition an `openPetition` action opens.
 *
 * @public
 */
export type PetitionSpec = Extract<Action, { readonly kind: "openPetition" }>["petition"];

/**
 * One rule: its id (logged with every action it causes), its trigger, its conditions and its actions.
 *
 * @public
 */
export const Rule = Type.Object({ id: Type.String({ description: "The id of the rule" }), trigger: Trigger, when: Type.Array(Condition, { description: "Every condition must hold" }), actions: Type.Array(Action, { description: "The actions, in order" }) }, { description: "One rule of the script" });

/**
 * The static shape of `Rule`.
 *
 * @public
 */
export type Rule = Static<typeof Rule>;
