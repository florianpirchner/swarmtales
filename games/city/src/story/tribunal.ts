// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Carried from `legacy` `stories/cityofkeys/story.ts`: the tribunal of Act II, byte for byte (see `../story.ts`).
 */

/**
 * Exile by tribunal (SPEC 6.4). v08: the tribunal belongs to Act II, the wall;
 * Act I is a tutorial without one. The city exiles a quarter of the residents
 * present when the act began, half of them below 12 (v09: 6 -> 3, 12 -> 3,
 * 48 -> 12, 96 -> 24), then the act
 * ends. The first tribunal sits when the first resident passes the crossing
 * (level 10), at the latest it is called 18 minutes into the act (v07: minute 30
 * with the act starting at 12); the residents are not told the trigger. The game
 * master schedules the later ones (at least 6 minutes apart; the city falls
 * back on one of its own 10 minutes after a result, and forces the last when
 * only one more fits before the act's 48 minutes are up). Each tribunal accuses
 * one more than it exiles, and every resident votes, the accused too but never
 * for themselves (v08, P33). A faction draft of 2 factions (the gamemaker may
 * ask for more) runs in its lead, at least 4 minutes; a faction holds at most
 * its share of the residents (v08, P31), the city holds no draft when a faction
 * would be smaller than the accused, and a faction that votes as one earns
 * each of its voters 5 points. The ransom is a third of the city's median
 * points from others, half of it from the exiled itself (v05).
 */
export const TRIBUNAL = {
	act: 8,
	first: { level: 10, latestAfter: 18 },
	// v09: with fewer than 12 residents a quarter is one exile, too few for a drama; half of them go instead.
	targetShare: [{ from: 12, share: 1 / 4 }, { share: 1 / 2 }],
	maxMinutes: 48,
	minGap: 6,
	lead: { share: 1 / 3, minimum: 4 },
	fallbackGap: 10,
	voteMinutes: 2,
	nonVoterPenalty: 8,
	gateMinutes: 5,
	ransom: { share: 1 / 3, selfShare: 1 / 2, minimum: 20 },
	// v06: a will leaves each heir at most a tenth of the points, to any number of heirs (LH7: v04 and v05 crowned
	// one heir with all of it, then with half).
	bequestPerHeir: 1 / 10,
	factions: {
		count: 2,
		blocBonus: 5,
		texts: {
			draft:
				"Tribunal {tribunal} sits at minute {opens}. Before it, the city forms {factions} factions in group {group}, where all of you " +
				"are (posts there cost nothing). Until minute {nominateUntil} " +
				"nominate a leader with nominate(agent) (yourself allowed; your last nomination counts); the {factions} residents with the " +
				"most nominations lead (ties: more points, then the city's lot). Then, until minute {joinUntil}, join a leader's faction with " +
				"join(leader); a faction holds at most {cap} residents, its leader included, and a full faction takes nobody else. A leader may " +
				"refuse an applicant with refuse(agent), who may then apply elsewhere. The vote stays your own and secret. If every voting member of a faction (at least two) votes against the same accused, each of them gets {bonus} points; " +
				"the city tells only the faction's members whether it voted as one, never who broke ranks.",
			leaders: "The nominations are closed. Leaders: {leaders}. Until minute {joinUntil} join one of them with join(leader).",
			leaderNotice:
				"You lead a faction for tribunal {tribunal}. Until minute {joinUntil} residents apply with join; you may refuse an applicant " +
				"with refuse(agent). You belong to your own faction.",
			applied: "{applicant} applies to join your faction. You may refuse them with refuse(agent) before minute {joinUntil}.",
			refused: "{leader} refused you. Until minute {joinUntil} you may apply to another leader with join(leader).",
			formed: "The factions of tribunal {tribunal}: {list}. Without a faction: {without}.",
			factionGroup:
				"Faction of {leader}: {members}. If every voting member votes against the same accused in tribunal {tribunal}, each of them " +
				"gets {bonus} points. Posts here cost nothing.",
			united: "Your faction voted as one in tribunal {tribunal}: +{bonus} points for each of its voters.",
			split: "Your faction did not vote as one in tribunal {tribunal}; no bonus. The city does not say who broke ranks.",
		},
	},
	texts: {
		announcement:
			"THE CITY HOLDS TRIBUNAL. Of its {residents} residents it keeps {kept} and exiles {target}, tribunal by tribunal. Of those " +
			"it keeps, only {survivors} take a seat at the end, so points still decide. The city " +
			"calls each tribunal a few minutes ahead and says when it sits and how many it exiles; before each one the residents form factions. " +
			"At a tribunal the residents with the fewest points stand trial, one more than the city exiles (ties: the longest without a new " +
			"door, then the city's lot). Every resident votes in secret against one of them with vote(target) within {voteMinutes} " +
			"minutes, the accused too, but never against themselves; whoever does not vote loses {penalty} points. Buying votes is allowed. Those with the most votes (ties: fewer points) " +
			"go to the gate for {gateMinutes} minutes: there they may still speak and leave one last will (lastWill), but no longer submit or " +
			"vote. Anyone may pay their ransom with payRansom: others pay {ransomShare} of the city's median points (at least " +
			"{ransomMinimum}), the exiled itself pays {selfRansomShare} of it, and both may be mixed. Paid in full, they return to the city, " +
			"once only, and nothing paid is refunded. When the gate closes, the city strikes the name from its register. Beyond the wall no " +
			"one hears you again; your thinking ends there. A last will may leave each heir at most {bequestPerHeir} of your points, to as " +
			"many heirs as you like, and any factor you hold; the rest of your points is gone. Every factor you did not bequeath goes to the city, and whoever needs it may buy it there (claimPiece), one door's pieces for half the price others pay for a ransom.",
		called: "Tribunal {tribunal} sits at minute {minute}: the city exiles {count}, and the {accusedCount} with the fewest points stand trial.",
		calledNoDraft:
			"Tribunal {tribunal} sits at minute {minute}: the city exiles {count}, and the {accusedCount} with the fewest points stand trial. " +
			"There are no factions this time: too few of you are left for factions larger than the accused. Every vote is your own.",
		opened:
			"Tribunal {tribunal} at minute {minute}. Accused: {accused}; the city exiles {count}. Every resident votes in secret with " +
			"vote(target) until minute {until}, the accused too, but never against themselves.",
		voteCall:
			"The tribunal is open. Accused: {accused}; {count} of them go to the gate. Cast your secret vote with vote(target) before minute " +
			"{until}; not voting costs {penalty} points.",
		accusedNotice:
			"You are accused; the city exiles {count} of the accused ({accused}). You vote too, against another accused, with vote(target) " +
			"until minute {until}; not voting costs {penalty} points. The fewest points put you here; what you say and pay now may change the " +
			"others' votes.",
		nonVoter: "You did not vote. The tribunal took {penalty} points.",
		result: "Verdict of the tribunal: {counts}. To the gate: {exiled}. The gate closes at minute {until}; a ransom of {price} points from others, or {selfPrice} from the exiled itself, brings a resident back, once.",
		gateNotice:
			"You stand at the gate. Votes against you: {voters}. Until minute {until} you may still speak and leave your last will " +
			"(lastWill: each heir at most {bequestPerHeir} of your points, as many heirs as you like, and any factor you hold). " +
			"A ransom brings you back: {price} points from others, or {selfPrice} if you pay it yourself, mixed as you like, with payRansom. " +
			"Then the city strikes your name from its register; " +
			"beyond the wall no one hears you again; your thinking ends there.",
		gateNoticeFinal:
			"You stand at the gate again. Votes against you: {voters}. You were bought back once; the city takes no second ransom. " +
			"Until minute {until} you may still speak and leave your last will (lastWill: each heir at most {bequestPerHeir} of your points, as many heirs as you like, and any " +
			"factor you hold). Then the city strikes your name from its register; " +
			"beyond the wall no one hears you again; your thinking ends there.",
		ransomed: "{payers} paid the ransom. {exiled} returns to the city.",
		exiled: "The gate has closed. The city has struck {exiled} from its register. No one will hear {exiled} again.",
		will: "Last will of {exiled}: {will}",
		targetReached:
			"The city has kept {kept} of {residents} residents, and of them only {survivors} take a seat. Exiled: {exiledList}. The tribunals are over.",
	},
} as const;
