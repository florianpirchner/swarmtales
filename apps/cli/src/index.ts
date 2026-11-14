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
export { folderTexts, played, resolveFile, runFacts, runFake, whyOf, type ResolvedFile, type RunInput } from "./run.ts";
export { ENV_NAMES, readEnv } from "./env.ts";
export { badSet, liveFlags, paramsOf, readFlags, seedOf, unknownWord, type Flags, type LiveFlags } from "./flags.ts";
export { confirmatoryAlone, runLive, type LiveInput, type LiveResult } from "./live.ts";
