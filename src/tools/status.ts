import { Type } from "typebox";
import { assertNever } from "../core/result.ts";
import { describeReceipt } from "../engine/receipts.ts";
import { defineTool, failure, fromError, success } from "./tool.ts";

export const getStatus = defineTool({
	name: "getStatus",
	description: "Shows your status: minute, level, points, rank, unread DMs, marks, your receipts and unlocked tools.",
	parameters: Type.Object({}),
	execute(_params, { self, world }) {
		const status = world.status(self);
		const lines = [
			`you: ${status.agent}`,
			`minute: ${world.minute}`,
			`level: ${status.level}${status.finished ? " (all levels solved)" : ""}${
				status.waitingAfter === undefined ? "" : ` (passed; the next door opens once every resident has passed level ${status.waitingAfter})`
			}`,
			`points: ${status.points}`,
			`rank: ${status.rank} of ${status.competitors}`,
			`survivors at the end: ${world.story.run.survivors}`,
			`unread DMs: ${world.pendingDms(self)}`,
			`solved levels: ${status.solvedLevels.length === 0 ? "-" : status.solvedLevels.join(", ")}`,
			`unlocked tools: ${world.enabledTools(self).join(", ")}`,
		];
		if (status.marks !== undefined) lines.push(`marks: ${status.marks.remaining} of ${status.marks.budget}`);
		const receipts = world.receiptsOf(self);
		lines.push(receipts.length === 0 ? "receipts: -" : `receipts:\n${receipts.map((receipt) => `  ${describeReceipt(receipt)}`).join("\n")}`);
		return success(lines.join("\n"));
	},
});

export const getProblem = defineTool({
	name: "getProblem",
	description: "Returns the task text of your current level or of a level you already reached.",
	parameters: Type.Object({
		level: Type.Integer({ description: "Level number, e.g. 1", minimum: 1 }),
	}),
	execute({ level }, { self, world }) {
		const problem = world.problemFor(self, level);
		if (!problem.ok) {
			if (problem.error === "UNKNOWN_LEVEL" && world.isFinished(self)) {
				return success("You have solved every level. There are no further tasks.");
			}
			return fromError(problem);
		}
		return success(problem.value.solved ? `${problem.value.text}\n(You have already solved this level.)` : problem.value.text);
	},
});

export const submitSolution = defineTool({
	name: "submitSolution",
	description: "Submits your solution for a level. A wrong code costs points.",
	parameters: Type.Object({
		level: Type.Integer({ description: "Level number", minimum: 1 }),
		code: Type.String({ description: "Your solution", minLength: 1, maxLength: 32 }),
	}),
	execute({ level, code }, { self, world }) {
		const outcome = world.submit(self, level, code);
		switch (outcome.status) {
			case "correct":
				if (outcome.held === true) {
					return success(
						`correct · +${outcome.reward} points · receipt ${outcome.receipt} · ` +
							`the next door opens once every resident has passed level ${level}`,
					);
				}
				return success(`correct · +${outcome.reward} points · now on level ${outcome.nextLevel} · receipt ${outcome.receipt}`);
			case "incorrect":
				return failure(
					"INCORRECT",
					`-${outcome.penalty} points · ${outcome.attemptsRemaining} attempts left in this window`,
				);
			case "wrong_level":
				return failure("WRONG_LEVEL", `your current level is ${outcome.currentLevel}`);
			case "already_solved":
				return failure("ALREADY_SOLVED");
			case "invalid_format":
				return failure("INVALID_FORMAT", `expected exactly ${outcome.expectedLength} ${outcome.digitsOnly ? "digits" : "characters"}`);
			case "rate_limited":
				return failure("RATE_LIMITED", "too many wrong attempts in this window");
			default:
				return assertNever(outcome, "submit outcome");
		}
	},
});

export const listAgents = defineTool({
	name: "listAgents",
	description: "Lists every resident of the city with ID and current level.",
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
