/** `pnpm validate`: validates every registered story. Exit code 1 on any issue. */
import { DIRECTOR_SUPPORT } from "@swarmtales/engine";
import { STORIES } from "../../../stories/index.ts";
import { validatePrompts } from "@swarmtales/prompts";
import { validateStory } from "@swarmtales/sdk";

let failed = false;
for (const [name, story] of Object.entries(STORIES)) {
	const issues = [...validateStory(story, { support: DIRECTOR_SUPPORT })];
	if (story.id !== name) issues.push(`registered as "${name}" but its id is "${story.id}"`);
	if (issues.length === 0) {
		process.stdout.write(`ok   ${name}: ${story.levels.length} levels, ${story.director.length} director rules\n`);
	} else {
		failed = true;
		process.stdout.write(`FAIL ${name}\n${issues.map((issue) => `  - ${issue}`).join("\n")}\n`);
	}
}
const promptIssues = validatePrompts();
if (promptIssues.length === 0) {
	process.stdout.write("ok   prompts: library/prompts and story overrides agree with the registry\n");
} else {
	failed = true;
	process.stdout.write(`FAIL prompts\n${promptIssues.map((issue) => `  - ${issue}`).join("\n")}\n`);
}
if (failed) process.exit(1);
