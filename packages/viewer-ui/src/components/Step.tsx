// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from "react";

interface Props {
	/** The seq of the line of the log the step stands for. */
	readonly at: number;
	/** The current seq: the step that shows it is marked. */
	readonly seq: number;
	readonly onSeq: (seq: number) => void;
	readonly children: ReactNode;
}

/**
 * One line of a card that stands for a line of the log (inside a list `stv-steps`); a click on its seq moves the replay there.
 *
 * @param props - The seq of the line, the current seq, how to change it, and what the line says.
 * @returns The list item.
 */
export function Step(props: Props) {
	const { at, seq, onSeq, children } = props;
	return (
		<li className={at === seq ? "current" : undefined}>
			<button type="button" className="stv-link" onClick={() => { onSeq(at); }}>#{at}</button> {children}
		</li>
	);
}
