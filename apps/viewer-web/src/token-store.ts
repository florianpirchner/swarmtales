// SPDX-License-Identifier: Apache-2.0
/**
 * The GitHub token, remembered on this device only when the person ticks "Remember on this device". It lives in
 * `localStorage` of the page's origin, which on GitHub Pages is shared by every Pages site of the owner; that is why it
 * is opt-in and why the hint asks for a read-only token of one repository. Storage can be missing or blocked
 * (private windows), so every access is guarded and a failure means "not remembered".
 */
const KEY = "swarmtales-viewer:github-token";

/** Where a remembered access token is kept. */
export interface TokenStore {
	read(): string | undefined;
	write(token: string): void;
	clear(): void;
}

/** A token store over a web storage; a storage that fails keeps nothing. */
export function tokenStore(storage: () => Storage | undefined): TokenStore {
	return {
		read() {
			try {
				const value = storage()?.getItem(KEY);
				return value === null || value === undefined || value === "" ? undefined : value;
			} catch {
				return undefined;
			}
		},
		write(token) {
			try {
				storage()?.setItem(KEY, token);
			} catch {
				// Not remembered; the token still works for this tab.
			}
		},
		clear() {
			try {
				storage()?.removeItem(KEY);
			} catch {
				// Nothing to clear.
			}
		},
	};
}

/** The token store of this device: the local storage of the page. */
export const deviceTokens = tokenStore(() => (typeof window === "undefined" ? undefined : window.localStorage));
