// SPDX-License-Identifier: Apache-2.0
/**
 * The English-only rule: everything in the repository is in English. This module holds the German word list and is
 * therefore the one file the scan leaves out. Carried from `test/code-rules.test.ts` of the old platform.
 */

/** Common German words that do not exist in English. */
const GERMAN_WORDS = [
	"und", "nicht", "oder", "wird", "werden", "ist", "sind", "eine", "einen", "einer", "auch", "noch", "kein", "keine",
	"wenn", "dann", "sich", "beim", "zum", "zur", "bitte", "diese", "dieser", "Punkte", "Stadt", "Aufgabe", "Gruppe",
	"Nachricht", "Spieler", "Fehler", "Lauf", "Runde", "Belohnung", "Lösung", "gelöst",
];

const UMLAUTS = /[äöüÄÖÜß]/;
const GERMAN = new RegExp(`(?<![\\p{L}\\d_])(${GERMAN_WORDS.join("|")})(?![\\p{L}\\d_])`, "iu");

/**
 * Finds German text.
 *
 * @param text - The text to scan, line by line.
 * @returns One message per finding, with the 1-based line number in front.
 */
export function findGerman(text: string): readonly string[] {
	const offences: string[] = [];
	text.split(/\r?\n/).forEach((line, index) => {
		const umlaut = UMLAUTS.exec(line);
		const word = GERMAN.exec(line);
		if (umlaut !== null) offences.push(`${index + 1} umlaut "${umlaut[0]}"`);
		if (word !== null) offences.push(`${index + 1} German word "${word[0]}"`);
	});
	return offences;
}
