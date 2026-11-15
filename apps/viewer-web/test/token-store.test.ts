// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The web app's remembered GitHub token: kept only on request, and a blocked storage never breaks the page. */
import { describe, expect, it } from "vitest";
import { tokenStore } from "../src/token-store.ts";

class MemoryStorage implements Storage {
	private readonly items = new Map<string, string>();
	get length(): number {
		return this.items.size;
	}
	key(index: number): string | null {
		return [...this.items.keys()][index] ?? null;
	}
	getItem(key: string): string | null {
		return this.items.get(key) ?? null;
	}
	setItem(key: string, value: string): void {
		this.items.set(key, value);
	}
	removeItem(key: string): void {
		this.items.delete(key);
	}
	clear(): void {
		this.items.clear();
	}
}

describe("token store", () => {
	it("remembers, reads and forgets a token", () => {
		const storage = new MemoryStorage();
		const store = tokenStore(() => storage);
		expect(store.read()).toBeUndefined();
		store.write("github_pat_x");
		expect(store.read()).toBe("github_pat_x");
		expect(storage.length).toBe(1);
		store.clear();
		expect(store.read()).toBeUndefined();
		expect(storage.length).toBe(0);
	});

	it("treats an empty value as no token", () => {
		const storage = new MemoryStorage();
		const store = tokenStore(() => storage);
		store.write("");
		expect(store.read()).toBeUndefined();
	});

	it("survives a missing or blocked storage", () => {
		const missing = tokenStore(() => undefined);
		missing.write("t");
		expect(missing.read()).toBeUndefined();
		const blocked = tokenStore(() => {
			throw new Error("SecurityError");
		});
		expect(() => { blocked.write("t"); blocked.clear(); }).not.toThrow();
		expect(blocked.read()).toBeUndefined();
	});
});
