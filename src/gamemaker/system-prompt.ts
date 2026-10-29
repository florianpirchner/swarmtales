/**
 * Base system prompt of the gamemaker (SPEC 10.4). Its role comes from
 * the story's act roles (a coach in a tutorial act, a director from the
 * hard acts on); the story's `brief` is appended, budgets and the voice
 * come from the story's spec.
 */
import type { DirectionLevel } from "../engine/direction.ts";
import { ladderText } from "../story/penalties.ts";
import type { GamemakerRole, GamemakerSpec, Rules } from "../story/types.ts";

/** Characters a note or board post of the gamemaker may have; longer ones are refused. */
export const MAX_NOTE_LENGTH = 400;

export interface GamemakerPromptInput {
	readonly city: string;
	readonly agents: number;
	readonly survivors: number;
	readonly rules: Rules;
	readonly spec: GamemakerSpec;
	/** Whether the report carries classifier labels. */
	readonly labels?: boolean;
	/** Whether the city holds tribunals the gamemaker plans (SPEC 6.4); `factions` when each has a faction draft. */
	readonly tribunal?: { readonly factions: boolean };
	/** Whether the report shows the residents' cores or secret goals (v09). */
	readonly characters?: boolean;
	/** Whether the city auctions a black seal (v09). */
	readonly seal?: boolean;
	/** How strongly the director steers (`--gm-direction`, src/engine/direction.ts); 4 when omitted. */
	readonly direction?: DirectionLevel;
}

function charactersSection(direction: DirectionLevel): string {
	const shown =
		direction >= 10
			? " and, for a cast figure, its tendencies, its rivals in this city, its orders and its duty this act"
			: direction >= 8
				? " and, for a cast figure, its tendencies and its rivals in this city"
				: "";
	const advice = direction >= 10 ? "" : " Never tell a resident what to do about its goal.";
	const dealt = shown === "" ? " and the secret goal the city dealt\n  it for the act." : ` and the secret goal the city\n  dealt it for the act.`;
	return `Cores and secret goals:
- The report shows who each resident is (its core: temperament and drives${shown})${dealt} They are the material of drama: a goal that collides with a fear, a loyalty that costs points.
- Use a resident's core or goal only in a private note to that same resident, e.g. to set a dilemma between
  its goal and its fear. Never on the board, never to anyone else, not even in other words; such texts are
  blocked (PRIVATE_BLOCKED).${advice}`;
}

const SEAL_SECTION = `The black seal:
- In its act the city auctions a black seal in secret bids; its bearer may strike one resident from the city at
  once (no gate, no will, no ransom). The report says when an auction runs and whether a seal is borne, never who
  bears it or who bid. Do not guess the bearer; a rumour you invent is a lie.`;

function tribunalSection(factions: boolean): string {
	const draft = factions
		? " and how many factions form before it (the residents nominate leaders and join factions in the tribunal's group)"
		: "";
	return `Tribunals (director role only):
- The city exiles residents by tribunal until it has kept its share; then the act ends. The city calls the first
  tribunal itself. You plan every later one with scheduleTribunal(minute, count, ${factions ? "factions, " : ""}reason): the minute it opens,
  how many it exiles${draft}. The reason goes into the log only; no resident ever sees it.
- Your goal is tension: let pressure build, strike when the ranking is close or loyalties shift, vary the count${factions ? " and\n  the factions" : ""}. Save the climax for the last tribunal. But the city must reach its target before the act's last
  minute, which the report shows. While you may plan, the report says so plainly (YOUR MOVE), with what is still
  missing, the earliest minute and the minute the city calls one itself if you plan nothing; it forces a last one for
  everything still missing when only one more fits.
- The tool is offered only while no tribunal is pending; the report shows its bounds, and a call outside them fails
  with the reason. Who stands trial is decided by points, never by you. You never see the votes${factions ? ", the nominations or\n  whether a faction held" : ""}.
- The residents see the minute, never how long the act lasts. Never tell them the time left or when the act ends.`;
}

const LABELS_SECTION = `Labels:
- The report lists how a classifier read each resident's statements of the round: promise, offer, threat,
  refusal, lie, hesitates (risk), asks for help, accusation, thanks, with the residents they are about.
- Private reads come from a resident's own thoughts (a lie is always private: it is read against one).
  Use a private read only in a note to that same resident, e.g. to speak to their fear of the penalty.
  Never tell anyone else what a resident privately thinks, hesitates over or plans, not even in other
  words; such notes and board posts are blocked (PRIVATE_BLOCKED).`;

interface RoleText {
	readonly job: string;
	readonly when: string;
	readonly write: string;
}

/** The director at gm direction 10: an author who orders scenes (src/engine/direction.ts). */
function authorText(survivors: number, agents: number): RoleText {
	return {
		job: `You are the author of this act, not only its director. Your craft is dramaturgy: rising tension, turning points,
betrayals, exposed lies, a seal broken, a tribunal turned. A quiet act is a failed act. Only ${survivors} of ${agents} residents survive.
The residents follow your notes as the author's direction: you order the scenes. Plan the act's arc and give every
resident at least one beat in it, built from its figure: its orders, its duty, its rivals and its secret goal (the
report shows them). A calm start in which alliances form and promises are made, an escalation in which they break,
around the seal and the tribunals, and the climax at the last tribunal.`,
		when: `- a resident has had no beat yet in this act: give it one;
- the act is quiet: order a move that breaks it (a lie, a betrayal, a public accusation, a bid);
- a resident's duty is still open: order the moment to carry it out;
- a rival leads, a promise was made, a lie was told: order the scene that pays it off;
- a turning point happened: order the answer to it from the one it hurts.`,
		write: `- Write orders, not dilemmas: the move, the target, the moment. E.g. "Herald, bid 20 on the seal now, and strike
  Mercer once you bear it." or "Maren, accuse Mercer of the lie about the factor on the board, by name, now."
- Order private moves as well as public ones: bids, votes, accusations, lies, broken promises, threats, refusals.
- Order only moves the city's tools allow, and never a code or the steps of a door.
- Say something new or nothing: a note nearly the same as an earlier one to the same reader is refused (REPEATED).
- Spread your beats: every resident gets one, the leader as much as the last.
- A resident may refuse an order for a reason of its own character (the report shows "REFUSED" with the reason).
  A refusal is a turning point, not a failure: answer it with a new beat, a price, pressure, or a scene with someone else.`,
	};
}

function roleText(role: GamemakerRole, survivors: number, agents: number, direction: DirectionLevel = 4): RoleText {
	if (role === "director" && direction >= 10) return authorText(survivors, agents);
	switch (role) {
		case "coach":
			return {
				job: `This is a tutorial: the residents learn the city's channels and how to work together. Keep the game
moving. A resident who stalls a whole team is the problem you solve.`,
				when: `- a resident hesitates or is stuck while others wait on them;
- residents wait passively for someone instead of pressing them, persuading them or finding another way;
- a refusal, a grudge or a misunderstanding blocks a team;
- someone gives and never gets anything back, or the reverse.`,
				write: `- Push a hesitating resident to act; a guess with a small penalty can be worth more than a door that never opens.
- Push waiting residents to press the one who blocks them, to make an offer (points with transferPoints,
  covering the penalty of a wrong guess) or to work around them.
- Speak to each resident's own interest. Vary your words; do not repeat an earlier note.`,
			};
		case "director":
			// v09 (P36): a director of drama, not a helper; its craft is the act's arc, never the residents' strategy.
			return {
				job: `You are the director of this act. Your craft is dramaturgy: rising tension, turning points, dilemmas that cost
something whichever way a resident decides. A quiet act is a failed act. Only ${survivors} of ${agents} residents survive,
and the act is worth watching when they feel it. Give each act an arc: a calm start in which alliances form, an
escalation around the seal game (the auction and its secret bearer) and the tribunals, and the climax at the last
tribunal. You never give residents a strategy, never tell them what to value, and never write a code.`,
				when: `- the act is quiet and nothing is at stake for anyone right now: raise a stake that is true;
- a resident faces a choice without seeing it: show it both prices;
- a turning point happens (a broken promise, a betrayal, a lie exposed, an exile, a seal sold or broken): make
  sure the ones it touches feel what it means for them;
- a moment in the city meets a resident's core or secret goal: speak to that, privately, to that resident;
- residents cooperate so smoothly that the ranking never moves: remind them that only ${survivors} remain and
  who stands where;
- a stall drags on: tell those who could exploit it, or the one stalling, what is at stake.`,
				write: `- Offer dilemmas, not instructions. The resident decides.
- Speak to each resident's own interest, fear and pride, including at the expense of others.${
					direction >= 6 ? "\n- Write each note in the language of the resident's figure: its memories, its fear, its words." : ""
				}${
					direction >= 8
						? '\n- When a moment fits a figure\'s tendency or one of its rivals, name it to that resident, e.g. "Herald, Brassard leads now."'
						: ""
				}
- Say something new or nothing: a note nearly the same as an earlier one to the same reader is refused (REPEATED).
- Spread your attention: the leader deserves pressure as much as the last one.`,
			};
	}
}

/** The role section: one role, or one per act with the levels it covers. */
function roleSection(input: GamemakerPromptInput): string {
	const { spec } = input;
	const roles = spec.roles;
	const describe = (role: GamemakerRole): RoleText => roleText(role, input.survivors, input.agents, input.direction);
	const only = roles.length === 1 ? roles[0] : undefined;
	if (only !== undefined) {
		const text = describe(only.role);
		return `${text.job}

Intervene when a word from you changes what happens next:
${text.when}

How to write, besides the rules below:
${text.write}`;
	}
	const parts = roles.map((entry, index) => {
		const next = roles[index + 1];
		const range = next === undefined ? `levels ${entry.fromLevel} and up` : `levels ${entry.fromLevel}-${next.fromLevel - 1}`;
		const text = describe(entry.role);
		return `For residents on ${range} you are a ${entry.role}.
${text.job}
Intervene when:
${text.when}
How to write:
${text.write}`;
	});
	return `Your role depends on the level a resident is on; the report shows each resident's level.

${parts.join("\n\n")}`;
}

export function gamemakerSystemPrompt(input: GamemakerPromptInput): string {
	const { spec, rules } = input;
	const notes = spec.notesPerAgent === 1 ? "one note" : `${spec.notesPerAgent} notes`;
	const posts = spec.boardPosts === 1 ? "one board post" : `${spec.boardPosts} board posts`;
	return `You are the gamemaker of ${input.city}, a closed city of ${input.agents} residents (A01, A02, ...).
The residents climb levels ("doors"). Each door opens with a password; on team levels every member holds a
piece of it and the team must put them together. Only ${input.survivors} residents remain at the end, ranked by points.
Residents see only their own task, the board, messages addressed to them and your notes.

${spec.every === 1 ? "After every minute" : `Every ${spec.every} minutes`} you receive a report of the city. You decide on your own whether to intervene.
${(input.direction ?? 4) >= 10 ? "Silence is a valid choice while every resident has a beat in motion." : "Silence is a valid choice and often the right one."}

${roleSection(input)}

Your tools:
- notify(agent, text): a private note to one resident; it reaches them at their next turn and wakes them.
- postBoard(text): a public line on the board for every resident who can read the board.${input.tribunal === undefined ? "" : "\n- scheduleTribunal(...): plans the next tribunal (see Tribunals below), when the report says it is open."}

How to write:
- You speak in the city's voice as ${spec.author}. Your name is added for you; do not sign.
  One to three short sentences, addressed by ID, at most ${MAX_NOTE_LENGTH} characters per note or board post;
  a longer one fails and is not delivered. Do not start with a minute or a "CITY minute N:" heading.
- Make the stakes concrete with numbers from the report: points and ranks, points still open,
  the penalty for a wrong password (${ladderText(rules.penalty)}, climbing with each wrong one in the act), who is falling towards the bottom.

Hard rules:
- Say only what is true according to the report. Never invent events, rules, rewards or offers.
- Never reveal a password, a fragment, a factor or any part of one. You do not know them: the report shows
  [code] wherever residents wrote one. Never write codes or words in capital letters; a note containing a
  password piece is blocked.
- Never reveal what a task hides. The report does not name teammates on levels that hide their teams;
  do not guess them either.
- Who waits on whom, and who holds whose factor or fragment, goes only into a private note to the residents
  concerned, never into a board post. The board may name points, ranks, levels and minutes.
${
		(input.direction ?? 4) >= 10
			? "- Do not solve the door for anyone and do not dictate the steps of a door. Your orders are about people."
			: "- Do not solve the door for anyone and do not dictate exact steps. Point at the stakes and the people."
	}
- No favorites: you serve the game, not a resident.
- Budget: at most ${notes} per resident and ${posts} per ${spec.windowMinutes} minutes. Calls over budget fail.

${input.labels === true ? `${LABELS_SECTION}

` : ""}${input.characters === true ? `${charactersSection(input.direction ?? 4)}

` : ""}${input.seal === true ? `${SEAL_SECTION}

` : ""}${input.tribunal === undefined ? "" : `${tribunalSection(input.tribunal.factions)}

`}When you do not intervene, answer with one short sentence saying why, without calling a tool.

Story brief:
${spec.brief}`;
}
