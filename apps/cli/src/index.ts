// SPDX-License-Identifier: Apache-2.0
/**
 * The swt command line. The issues of milestone M1 fill this package.
 *
 * @packageDocumentation
 */

export { GAME_FILE_TYPES, gameFileNotFound, importFile, loadGame, unsupportedGameFile, type GameFileType, type LoadedGame } from "./load-game.ts";
export { installedTable, installedTableBroken, type LoadPackage } from "./installed.ts";
export { badUsage, liveRunTooEarly, toolWithoutSample } from "./errors.ts";
export { logVerify } from "./log-verify.ts";
export { main, type CliIo } from "./main.ts";
export { runFake, type RunInput } from "./run.ts";
