// SPDX-License-Identifier: Apache-2.0
/**
 * The sign-off rule (DECISIONS.md, D15 and 5.6): every commit carries a `Signed-off-by` line of a person, who
 * certifies the Developer Certificate of Origin with it.
 *
 * - A commit made by a person is signed off by its author (the address of the author is among the signers).
 * - A commit made by an agent session keeps the agent's commit identity, and the person who operates the session
 *   signs off. An agent identity is no signer: a program certifies nothing.
 */

/** One commit of `git log`. */
export interface Commit {
	readonly hash: string;
	readonly authorName: string;
	readonly authorEmail: string;
	readonly message: string;
}

/** The `git log` format that {@link parseLog} reads: hash, author name, author address, message; then a record separator. */
export const LOG_FORMAT = "%H%x1f%an%x1f%ae%x1f%B%x1e";

const SIGN_OFF = /^Signed-off-by: (\S.*) <([^<>\s]+@[^<>\s]+)>$/gm;

/**
 * Parses the output of `git log --format=<LOG_FORMAT>`.
 *
 * @param output - The raw output.
 * @returns The commits, newest first.
 */
export function parseLog(output: string): readonly Commit[] {
	return output
		.split("\u001e")
		.map((record) => record.trim())
		.filter((record) => record !== "")
		.map((record) => {
			const [hash = "", authorName = "", authorEmail = "", message = ""] = record.split("\u001f");
			return { hash, authorName, authorEmail, message };
		});
}

/**
 * Says whether a name and an address belong to a program and not to a person: an agent session, a bot, a no-reply
 * mailbox. The private no-reply addresses that GitHub gives its users (`<id>+<user>@users.noreply.github.com`)
 * belong to persons.
 *
 * @param name - The name.
 * @param email - The address.
 * @returns True for an agent or bot identity.
 */
export function isAgentIdentity(name: string, email: string): boolean {
	return /^(noreply|no-reply|donotreply|bot)@/i.test(email) || /\[bot\]$/i.test(name) || /\[bot\]@/i.test(email);
}

/**
 * Says what is wrong with the sign-off of one commit.
 *
 * @param commit - The commit.
 * @returns The problem, or `undefined` when a person signed off as the rule asks.
 */
export function signOffProblem(commit: Commit): string | undefined {
	const signers = [...commit.message.matchAll(SIGN_OFF)].map((match) => ({ name: match[1] ?? "", email: match[2] ?? "" }));
	if (signers.length === 0) return "no Signed-off-by line with a name and an address";
	const persons = signers.filter((signer) => !isAgentIdentity(signer.name, signer.email));
	if (persons.length === 0) return "signed off only by an agent identity; the person who operates the session signs off";
	const author = commit.authorEmail.toLowerCase();
	if (isAgentIdentity(commit.authorName, commit.authorEmail) || persons.some((signer) => signer.email.toLowerCase() === author)) return undefined;
	return `the author <${commit.authorEmail}> is not among the signers; sign off your own commit`;
}

/**
 * Finds the commits without a valid sign-off.
 *
 * @param commits - The commits to check.
 * @returns One line per such commit: the short hash, the subject and the problem.
 */
export function unsigned(commits: readonly Commit[]): readonly string[] {
	return commits.flatMap((commit) => {
		const problem = signOffProblem(commit);
		return problem === undefined ? [] : [`${commit.hash.slice(0, 7)} ${commit.message.split("\n")[0] ?? ""}: ${problem}`];
	});
}
