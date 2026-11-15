// SPDX-License-Identifier: Apache-2.0
/**
 * Key broker, provider adapters, model settings, the resident driver and the cost meter. The issues of milestone M2 fill this package.
 *
 * @packageDocumentation
 */
export { callOutsideActivation, emptyModel, keyLeaked, noCostCap, noKey, noPrice, recordMismatch, savedSessionInvalid, shortKey, thrown, unknownModel, unknownProvider } from "./errors.ts";
export { createKeyBroker, KEY_VARIABLES, type KeyAuth, type KeyBroker } from "./keys.ts";
export { BUILTIN_PROVIDERS, createProviderRegistry, modelOf, openRouterProviderPreferences, type OpenRouterRouting, type ProviderRegistry, type ProviderSpec } from "./providers.ts";
export { RESIDENT_RECORDS, residentRecord, type ResidentRecords } from "./records.ts";
export { isToolChoice, limitsFor, PROVIDER_RETRIES, REQUEST_TIMEOUT_MS, TOOL_CHOICES, toolChoiceDefaults, withRequestDefaults, type RequestLimits, type ToolChoice } from "./request.ts";
export { MODEL_DEFAULTS, resolveModelSettings, type ModelEnv, type ModelOverrides, type ModelSettings, type ThinkingLevel } from "./settings.ts";
export { createCostMeter, formatUsd, type CostMeter, type CostMeterOptions, type Spend } from "./meter.ts";
export { act, fail, say, scriptedSource, type Script, type ScriptStep } from "./scripted.ts";
export { closedModels, createModelSource, limitedStream, type ModelBinding, type ModelSource } from "./source.ts";
export { asksReset, CONTEXT_RESET_KIND, createResidentSession, isSafeguardRefusal, outcomeText, type ResidentSession, type SessionInput, type StepFrame } from "./driver/session.ts";
export { createToolsNotice, toolsNotice, type ToolsNotice } from "./driver/notice.ts";
export { parseSavedSessions, SAVED_SESSION_FORMAT, SavedSessionSchema, SavedSessionsSchema, type SavedSession, type SavedSessions } from "./driver/saved.ts";
export { systemPrompt, type PromptFacts } from "./driver/prompt.ts";
export { createAsker, DIRECTOR_MODEL_RECORDS, scriptedAsker } from "./director.ts";
export { createModelDrivers, RESIDENT_DRIVER, type ModelDrivers, type ModelDriversInput } from "./driver/create.ts";
