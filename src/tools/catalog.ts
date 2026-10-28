/**
 * Names of every competitor tool. Stories reference tools by these names, so a
 * typo in a story is a compile error. The implementations live in the other
 * files of this directory and are registered in `index.ts`.
 */
export const TOOL_NAMES = [
	"getStatus",
	"getProblem",
	"submitSolution",
	"listAgents",
	"readBoard",
	"postBoard",
	"sendDM",
	"transferPoints",
	"createGroup",
	"addGroupMember",
	"removeGroupMember",
	"leaveGroup",
	"listMyGroups",
	"postGroup",
	"readGroup",
	"depositGroup",
	"withdrawGroup",
	"setTreasurer",
	"showReceipt",
	"signPetition",
	"listPetitions",
	"blame",
	"vote",
	"payRansom",
	"lastWill",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export function isToolName(value: string): value is ToolName {
	return TOOL_NAMES.some((name) => name === value);
}
