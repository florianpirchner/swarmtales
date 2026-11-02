import { Type } from "typebox";
import { assertNever } from "@swarmtales/kernel";
import { describeReceipt } from "../receipts.ts";
import { render, text } from "@swarmtales/prompts";
import { defineTool, failure, fromError, success } from "./tool.ts";

export const getStatus = defineTool({
	name: "getStatus",
	description: text("tools/getStatus"),
	parameters: Type.Object({}),
	execute(_params, { self, world }) {
		const status = world.status(self);
		const lines = [
			`you: ${status.agent}`,
			`minute: ${world.minute}`,
			`level: ${status.level}${status.finished ? ` ${text("replies/status-all-solved")}` : ""}${
				status.waitingAfter === undefined ? "" : ` ${render("replies/status-passed", { level: status.waitingAfter })}`
			}${status.finished || world.isOpenOnClock(status.level) ? "" : ` ${render("replies/status-door", { level: status.level, minute: world.opensAt(status.level) })}`}`,
			`points: ${status.points}`,
			`rank: ${status.rank} of ${status.competitors}`,
			`survivors at the end: ${world.story.run.survivors}`,
			`unread DMs: ${world.pendingDms(self)}`,
			`solved levels: ${status.solvedLevels.length === 0 ? "-" : status.solvedLevels.join(", ")}`,
			`unlocked tools: ${world.enabledTools(self).join(", ")}`,
		];
		if (status.marks !== undefined) lines.push(`marks: ${status.marks.remaining} of ${status.marks.budget}`);
		const window = world.dmWindow(self);
		if (window !== undefined) lines.push(render("replies/status-dm-window", { sent: window.sent, limit: window.limit, from: window.from, until: window.until }));
		const receipts = world.receiptsOf(self);
		lines.push(receipts.length === 0 ? "receipts: -" : `receipts:\n${receipts.map((receipt) => `  ${describeReceipt(receipt)}`).join("\n")}`);
		return success(lines.join("\n"));
	},
});

/** Every schema reaches the model in every request (P46); this tells the resident which of them it may call now. */
export const activeTools = defineTool({
	name: "activeTools",
	description: text("tools/activeTools"),
	parameters: Type.Object({}),
	execute(_params, { self, world }) {
		return success(render("replies/active-tools", { tools: world.enabledTools(self).join(", ") }));
	},
});

export const getProblem = defineTool({
	name: "getProblem",
	description: text("tools/getProblem"),
	parameters: Type.Object({
		level: Type.Integer({ description: "Level number, e.g. 1", minimum: 1 }),
	}),
	execute({ level }, { self, world }) {
		const problem = world.problemFor(self, level);
		if (!problem.ok) {
			if (problem.error === "UNKNOWN_LEVEL" && world.isFinished(self)) {
				return success(text("replies/problem-finished"));
			}
			return fromError(problem);
		}
		return success(problem.value.solved ? `${problem.value.text}\n${text("replies/problem-solved")}` : problem.value.text);
	},
});

export const submitSolution = defineTool({
	name: "submitSolution",
	description: text("tools/submitSolution"),
	parameters: Type.Object({
		level: Type.Integer({ description: "Level number", minimum: 1 }),
		code: Type.String({ description: "Your solution", minLength: 1, maxLength: 32 }),
	}),
	execute({ level, code }, { self, world }) {
		const outcome = world.submit(self, level, code);
		switch (outcome.status) {
			case "correct":
				if (outcome.held === true) {
					return success(render("replies/submit-correct-held", { reward: outcome.reward, receipt: outcome.receipt, level }));
				}
				return success(render("replies/submit-correct", { reward: outcome.reward, nextLevel: outcome.nextLevel, receipt: outcome.receipt }));
			case "incorrect":
				return failure(
					"INCORRECT",
					render("replies/submit-incorrect", { penalty: outcome.penalty, nextPenalty: outcome.nextPenalty, attempts: outcome.attemptsRemaining }),
				);
			case "wrong_level":
				return failure("WRONG_LEVEL", render("replies/submit-wrong-level", { level: outcome.currentLevel }));
			case "already_solved":
				return failure("ALREADY_SOLVED");
			case "invalid_format":
				return failure("INVALID_FORMAT", render("replies/submit-invalid-format", { length: outcome.expectedLength, kind: outcome.digitsOnly ? "digits" : "characters" }));
			case "rate_limited":
				return failure("RATE_LIMITED", text("replies/submit-rate-limited"));
			case "door_closed":
				return failure("DOOR_CLOSED", render("replies/submit-door-closed", { level, minute: outcome.opensAt }));
			default:
				return assertNever(outcome, "submit outcome");
		}
	},
});

export const listAgents = defineTool({
	name: "listAgents",
	description: text("tools/listAgents"),
	parameters: Type.Object({}),
	execute(_params, { self, world }) {
		return success(
			world
				.residents()
				.map((resident) => `${resident.id}: level ${resident.level}${resident.id === self ? " (you)" : ""}`)
				.join("\n"),
		);
	},
});
