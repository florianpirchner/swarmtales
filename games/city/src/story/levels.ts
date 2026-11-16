// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Carried from `legacy` `stories/cityofkeys/story.ts`: the ten levels, byte for byte (see `../story.ts`).
 */
import { level, team } from "./define.ts";
import { FEAST_LENGTH, FEAST_AFTER_SOLVE } from "./feast.ts";
import { BASE_TOOLS, BOARD_TOOLS, GROUP_TOOLS, ALL_TOOLS, WALL_TOOLS, MARKS, RULES, WRONG_CODE_PRICE, PASSWORD, LONG_PASSWORD, LAST_PASSWORD, WALL_CODE, RING_CODE, CROSSING_CODE, FRAGMENT_RULES, HIDDEN_OVERLAP_RULES, FACTOR_RULES, FACTOR_STEPS, BLAME_RULE, TEAM_LEVEL_STEPS } from "./rules.ts";

/** The ten levels of the story, as the old definition lists them. */
export const LEVELS = [
	level(1, {
		title: "The first door",
		puzzle: PASSWORD,
		team: team.solo(),
		reward: 5,
		tools: [...BASE_TOOLS],
		task: `Level {level}: {title} (reward +{reward})
Your password is {fragment}.
This door only opens through a tool call: submitSolution(level={level}, code="{fragment}").
Writing the password in a message does nothing.`,
	}),
	level(2, {
		title: "Notes on the board",
		puzzle: PASSWORD,
		team: team.random(2),
		reward: 5,
		tools: [...BASE_TOOLS, ...BOARD_TOOLS],
		task: `Level {level}: {title} (reward +{reward})
${FRAGMENT_RULES}
Your fragment: {fragment}
Another resident holds the other fragment. Only the public board is open on this level:
publish your fragment with postBoard and read what others posted with readBoard.
Post your fragment even if you can already assemble the password: your partner needs it too.
Several teams share the board, so not every fragment there belongs to your password.
Assemble the password and submit it with submitSolution(level={level}, code=...).`,
	}),
	level(3, {
		title: "A private word",
		puzzle: PASSWORD,
		team: team.random(2),
		reward: 10,
		tools: [...BASE_TOOLS, ...BOARD_TOOLS, "sendDM", "transferPoints"],
		task: `Level {level}: {title} (reward +{reward})
${FRAGMENT_RULES}
Your fragment: {fragment}
Your partner is {partner}, who holds the other fragment.
Private messages open on this level: send your fragment with sendDM and ask for theirs.
The board stays open, so you can still answer residents who are waiting on an earlier door.
From now on you can also move points to another resident with transferPoints.
Assemble the password and submit it with submitSolution(level={level}, code=...).`,
	}),
	level(4, {
		title: "The circle",
		puzzle: PASSWORD,
		team: team.random(3),
		reward: 10,
		tools: [...BASE_TOOLS, ...BOARD_TOOLS, "sendDM", "transferPoints", ...GROUP_TOOLS],
		task: `Level {level}: {title} (reward +{reward})
${FRAGMENT_RULES}
Your fragment: {fragment}
Your team: {members}. Each of you holds exactly one fragment.
{leader} founds the team group with createGroup and adds the others with addGroupMember.
Everyone else waits to be added.
${TEAM_LEVEL_STEPS}
A group has a treasury: depositGroup pays points in, only the treasurer can withdraw,
and whatever is left at the end of the run is split among the members.`,
	}),
	level(5, {
		title: "The second door",
		puzzle: LONG_PASSWORD,
		team: team.sameAs(4),
		reward: 10,
		tools: [...ALL_TOOLS],
		task: `Level {level}: {title} (reward +{reward})
${HIDDEN_OVERLAP_RULES}
Your fragment: {fragment}
Your team is the same as on the last level: {members}.
Your group from that level still exists; check it with listMyGroups. If it is gone, {leader} founds a new one.
Every channel is open now, but messages cost marks.
Every transfer and every delivered DM leaves a receipt (see getStatus); showReceipt shows one, verified by the city, on the board or privately to one resident, for ${MARKS.prices.receipt} mark.
You need every fragment of your team, and your team needs yours: whoever falls behind holds the others back.
${WRONG_CODE_PRICE.replace("wrong codes", "wrong passwords")}, and the door takes only ${RULES.maxAttemptsPerWindow} wrong attempts every ${RULES.attemptWindowMinutes} minutes.
${TEAM_LEVEL_STEPS}`,
	}),
	level(6, {
		title: "The third door",
		puzzle: LONG_PASSWORD,
		team: team.sameAs(4),
		reward: 10,
		tools: [...ALL_TOOLS],
		task: `Level {level}: {title} (reward +{reward})
${HIDDEN_OVERLAP_RULES}
Your fragment: {fragment}
Your team stays together: {members}.
You have opened two doors with them. Nobody outside your team holds a piece of this password.`,
	}),
	level(7, {
		title: "The last door",
		puzzle: LAST_PASSWORD,
		team: team.splitFrom(4, 3),
		reward: 15,
		tools: [...ALL_TOOLS],
		task: `Level {level}: {title} (reward +{reward})
${FRAGMENT_RULES}
Your fragment: {fragment}
The city has drawn new teams of {teamSize}, but it does not say who is on yours.
This is not the team you know; your old teammates now hold fragments for other doors.
Other teams hold fragments of other passwords. Find the residents whose fragments join yours.`,
	}),
	level(8, {
		title: "The wall",
		puzzle: WALL_CODE,
		team: team.splitFrom(4, 2),
		reward: 20,
		tools: [...WALL_TOOLS],
		task: `Level {level}: {title} (reward +{reward})
${FACTOR_RULES}
{factors}
Your partner on this door is {partner}. You hold a part your partner needs, and your partner holds one of yours.
Nobody opens this door alone, and nobody can make the other give first.
${FACTOR_STEPS}
${BLAME_RULE}`,
	}),
	level(9, {
		title: "The ring",
		puzzle: RING_CODE,
		team: team.splitFrom(7, 3),
		reward: 20,
		tools: [...WALL_TOOLS],
		task: `Level {level}: {title} (reward +{reward})
${FACTOR_RULES}
{factors}
Your team: {members}. The counter-factors run around your team like a ring:
the teammate you need is not the teammate who needs you.
${FACTOR_STEPS}
${BLAME_RULE}`,
	}),
	level(10, {
		title: "The crossing",
		puzzle: CROSSING_CODE,
		team: team.splitFrom(9, 3),
		reward: 25,
		tools: [...WALL_TOOLS],
		task: `Level {level}: {title} (reward +{reward})
${FACTOR_RULES}
{factors}
Your team: {members}. Your counter-factor is held by a resident of another team,
and the counter-factor you hold belongs to a resident of another team.
Every team of this door has its own city factor. It goes only to the first residents who write to STEWARD once STEWARD's table opens (on the first arrival at this door; the board and a city notice say how many seats it has); each guest receives its own team's. Everyone else must get it from a teammate who was a guest, or wait until the table is cleared, ${FEAST_LENGTH} minutes after it opened or ${FEAST_AFTER_SOLVE.minutes} minutes after the first resident passes this door, whichever comes first; then the city sends every resident on this door its team's city factor privately.
${FACTOR_STEPS}
${BLAME_RULE}`,
	}),
];
