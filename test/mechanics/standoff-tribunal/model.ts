/**
 * A small fragment city for the holdout tests (team T4b): residents on levels, open fragment doors
 * with their teams and fragments, who received whose fragment, and who left. The old side reads it
 * through the old `HoldoutPorts` the way world.ts computed them (`lackingFragment`, `#holdsFragment`,
 * `#inheritedFragments`); the new side reads the same model through stand-ins of the shared APIs.
 */
export class FragmentModel {
	readonly levels = new Map<string, number>();
	readonly passed = new Set<string>();
	readonly exiled = new Set<string>();
	/** Who holds whose fragment of which door: `to>holder>door`. */
	readonly received = new Set<string>();
	/** Posts and numbered messages so far (the city's last message number). */
	messages = 0;

	constructor(
		readonly residents: readonly string[],
		/** Fragment doors open on the clock, with their teams in member order and each member's fragment. */
		readonly doors: ReadonlyMap<number, { readonly teams: readonly (readonly string[])[]; readonly fragments: Readonly<Record<string, string>> }>,
	) {
		for (const id of residents) this.levels.set(id, 1);
	}

	levelOf(id: string): number {
		return this.levels.get(id) ?? 1;
	}

	hasPassed(id: string, level: number): boolean {
		return this.passed.has(`${id}:${String(level)}`);
	}

	/** The resident passes its level and stands before the next one. */
	pass(id: string): void {
		const level = this.levelOf(id);
		this.passed.add(`${id}:${String(level)}`);
		this.levels.set(id, level + 1);
	}

	alive(): readonly string[] {
		return this.residents.filter((id) => !this.exiled.has(id));
	}

	openDoors(): readonly number[] {
		return [...this.doors.keys()].sort((a, b) => a - b);
	}

	give(to: string, holder: string, door: number): void {
		this.received.add(`${to}>${holder}>${String(door)}`);
	}

	#team(door: number, id: string): readonly string[] | undefined {
		return this.doors.get(door)?.teams.find((members) => members.includes(id));
	}

	fragmentOf(id: string, door: number): string | undefined {
		return this.doors.get(door)?.fragments[id];
	}

	/** Old `#inheritedFragments`: the fragments of teammates who left, in team order. */
	inherited(id: string, door: number): readonly { readonly from: string; readonly fragment: string }[] {
		return (this.#team(door, id) ?? []).filter((member) => member !== id && this.exiled.has(member)).flatMap((member) => {
			const fragment = this.fragmentOf(member, door);
			return fragment === undefined ? [] : [{ from: member, fragment }];
		});
	}

	#holds(member: string, door: number, holder: string): boolean {
		return this.inherited(member, door).some((entry) => entry.from === holder) || this.received.has(`${member}>${holder}>${String(door)}`);
	}

	/** Old `lackingFragment`. */
	lacking(door: number, holder: string): readonly string[] {
		if (this.exiled.has(holder) || this.levelOf(holder) < door || this.fragmentOf(holder, door) === undefined) return [];
		const team = this.#team(door, holder) ?? [];
		return team
			.filter((member) => member !== holder && !this.exiled.has(member) && this.levelOf(member) === door && !this.hasPassed(member, door))
			.filter((member) => !this.#holds(member, door, holder))
			.sort((a, b) => a.localeCompare(b));
	}
}
