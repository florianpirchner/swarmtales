// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Sample 3: roles and private texts. Sample 2's team tic-tac-toe with one captain per team for the whole match: the
 * game names the roles, `grid` keeps the first member of each team as its captain, and every resident reads a
 * briefing of its own, made of the text of its role and a line for it alone.
 */
import { consensus } from "@swarmtales/mechanic-consensus";
import { gridGame } from "@swarmtales/mechanic-grid";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame } from "swarmtales";

const teams = { X: ["A01", "A02"], O: ["A03", "A04"] };
const roles = { captain: ["A01", "A03"], adviser: ["A02", "A04"] };

/** What every resident of a role reads. */
const byRole: Readonly<Record<string, string>> = {
	captain: "You are your team's captain for the whole match. Only you propose and play a move, and you play only the cell your team agreed on.",
	adviser: "You advise your team's captain. You never propose or play a move: you vote on your captain's proposal and talk in the team channel.",
};
/** What one resident reads and nobody else. */
const personal: Readonly<Record<string, string>> = {
	A01: "Your team plays X; A02 advises you.",
	A02: "Your team plays X; your captain is A01.",
	A03: "Your team plays O; A04 advises you.",
	A04: "Your team plays O; your captain is A03.",
};

/** One briefing per resident: the text of its role, then its own line. */
const briefing = Object.fromEntries(Object.entries(roles).flatMap(([role, members]) => members.map((id) => [id, `${byRole[role] ?? ""}\n${personal[id] ?? ""}`])));

export default defineGame({
	id: "roles",
	seed: 3,
	residents: 4,
	roles,
	mechanics: [gridGame({ teams, games: 1, wakeTeam: true, fixedCaptain: true }), consensus({ teams }), teamChannel({ teams })],
	// The channel shows new posts at the start of a turn, so no resident needs `readTeam`.
	grants: { resident: { drop: ["readTeam"] } },
	scheduler: { id: "turns", options: { activation: "onNews" } },
	end: { ticks: 40 },
	win: { fact: "grid.tally" },
	briefing,
	model: "anthropic/haiku",
});
