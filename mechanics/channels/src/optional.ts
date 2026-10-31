/**
 * Reads from a provider that may not have written a method yet. Wave 3.5 providers stub what they
 * lack with `kit.provideSome`, which throws `<api>.<method> is not implemented`; a read that only
 * refines a check (a secret, a core, a standing) then counts as "nothing known" instead of failing
 * the tool. Any other error is the provider's and passes through.
 */
export function attempt<T>(read: () => T): T | undefined {
	try {
		return read();
	} catch (error) {
		if (error instanceof Error && error.message.endsWith("is not implemented")) return undefined;
		throw error;
	}
}
