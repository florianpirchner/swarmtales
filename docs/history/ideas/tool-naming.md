# Tool naming: one name per tool, even when two mechanics say `say`

> **Carried from the old platform.** This paper was written for the old platform, before the rewrite, and is kept as
> it was, except for its links. Links to the other papers of [`docs/history/`](../README.md) stay relative; paths into
> code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do not exist on this
> branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

Status: **idea, not approved for building** (2026-11-03, from the chat with Flo). Nothing here is
built. Per the brainstorm-first rule, code starts only after Flo's explicit go.
**Priority: HIGH. This is the next item after the tic-tac-toe teams work** (see
[game-roadmap.md](game-roadmap.md) and [tictactoe-teams.md](tictactoe-teams.md)).

## 1. The problem

A tool is named by the mechanic that defines it: `kit.tool({ name: "transferPoints", ... })`
(`docs/design/mechanic-api.md`). Names today are bare, camelCase strings, unique only by luck inside
the mechanics we ship ourselves. Once third-party mechanics exist (plugins are packages, see
[monorepo.md](monorepo.md)), two of them will sooner or later offer `say`, `bid`, `vote` or `pass`.
Then three things break at once:

- the kernel cannot tell which `say` a story grant, a lock or a limit means;
- the model sees one tool list and cannot tell two `say` tools apart;
- the event log (`tool_called`) records an ambiguous name, which hurts replay, golden-run
  comparison and the signed log's value as evidence.

Flo's idea: **tool names carry npm package + mechanic + tool**, so the origin is part of the name.

## 2. What the model APIs accept (checked live, 2026-11-03)

A tiny live check against the Anthropic Messages API (Haiku, `claude-haiku-4-5`, one tool definition
per call, `max_tokens` 8-16, key from `ARENA_ANTHROPIC_API_KEY`, never printed):

| Tool name tried | Result |
|---|---|
| `say` | accepted |
| `swarmtales-bidding__place_bid` | accepted |
| `@swarmtales/bidding/place_bid` | **rejected**: `tools.0.custom.name: String should match pattern '^[a-zA-Z0-9_-]{1,128}$'` |
| `npm:@swarmtales/bidding#place_bid` | **rejected**, same pattern error |
| `a.b` (a dot) | **rejected**, same pattern error |
| 65 characters | accepted (so the limit is not 64) |
| 128 characters | accepted |
| 129 characters | **rejected**: `String should have at most 128 characters` |

So for Anthropic the rule is `^[a-zA-Z0-9_-]{1,128}$`: letters, digits, underscore, hyphen, at most
**128** characters today. `@`, `/`, `:`, `#` and `.` are not allowed. The limit of 64 that is often
quoted applies to the OpenAI function-calling API (`^[a-zA-Z0-9_-]{1,64}$`); I did not test OpenAI here
(no key in the environment), so treat 64 as the conservative common denominator, not as a measured
fact for every provider.

OpenRouter (checked with `deepseek/deepseek-chat`, one tool, `max_tokens` 8): it **accepted** both
`swarmtales-bidding__place_bid` and `@swarmtales/bidding/place_bid`. OpenRouter forwards to whichever
upstream provider serves the model (the two calls went to different providers), and each upstream
validates differently or not at all. Lesson: "it worked on OpenRouter once" proves nothing; a name
that is valid on the strictest API (`[a-zA-Z0-9_-]`, 64 characters) works everywhere. The model-facing
name must therefore always be restricted to that alphabet and length, whatever the canonical name is.

## 3. The proposal in four parts

### 3.1 Two layers

1. **Canonical name.** Used by the kernel, story grants, locks, limits, the expression language, the
   event log and the signed chain. Unambiguous, parseable, may contain any characters we choose.
2. **Model-facing alias.** What the provider API and the model see. Derived deterministically from the
   canonical name by one function, restricted to `[a-zA-Z0-9_-]`, at most 64 characters. The kernel
   keeps the map alias → canonical per run and translates incoming tool calls back before the
   pipeline runs.

**Event header (decided by Flo, 2026-11-03).** The original canonical name is logged together with the
alias in the **header** of every tool event (`tool_called` and the events that follow from the call), so
each carries both what the kernel means and what the model saw:

```json
{ "seq": 412, "type": "tool_called", "tool": "@swarmtales/bidding/place_bid", "alias": "bid", "actor": "R3", "params": { } }
```

`tool` is always the canonical name, `alias` is the name the model was shown (the story override if set,
else the derived one). Both are inside the signed event, so the chain covers the mapping. Golden runs
compare the canonical `tool`; the `alias` field is compared too, since it is part of the format.

### 3.2 Canonical form

`<package>/<mechanic>/<tool>`, for example `@swarmtales/bidding/place_bid`. A fully qualified name has
three `/`-separated parts after the scope, so it is trivially parseable: the npm package is
`@scope/name` or `name` (npm forbids `/` inside a name, and forbids `@` except as the scope marker),
the mechanic id and the tool name are plain identifiers (tool names may contain `_`, `-`, camelCase;
they never contain `/`). The `underscore` form `npm_package_mechanic_tool` that Flo first suggested
cannot be split back reliably, because package, mechanic and tool names themselves contain `_` and `-`
(`mechanic-channels`, `place_bid`). A separator that may not occur inside any segment is the whole point.

Where a package ships exactly one mechanic whose id equals the package name, the middle segment is
still written; no shortening in the canonical form (shortening is an alias, see 3.4).

### 3.3 Model-facing alias

A pure function `alias(canonical)`:

1. Drop the leading `@`; replace `/` by the double underscore `__`; leave `-` and `_` alone:
   `@swarmtales/bidding/place_bid` becomes `swarmtales__bidding__place_bid`.
   (With three segments the scope and package already read as `swarmtales__bidding`; the mechanic
   segment follows after the next `__`.)
2. If the result is longer than 64 characters, truncate and append `_` plus the first 8 hex characters of
   `sha256(canonical)`, so the result is still at most 64 characters and still unique.
3. Collision check at load time: two canonical names that map to one alias are a load error (cannot
   happen without a hash collision, but the check is cheap).

Why `__`: it never occurs in our identifiers by convention (lint rule on tool, mechanic and package
names: no double underscore), so the alias is also reversible for humans. Reversal in code does not
use parsing, only the per-run map.

Cost note for the model: long aliases cost tokens on every request and make weak models worse at
choosing tools. That is the reason for 3.4 below.

### 3.4 Same tool from two mechanics, and short names

- **Same tool from two mechanics.** Exactly one mechanic is the **provider** of a tool; any other that
  needs it **declares a dependency** (`requires: [ref]`, like `ToolRef` in
  `packages/contracts/src/core/tools.ts`) and stages calls through that ref. A tool defined twice under
  the *same canonical name* (two mechanics both claiming it, or two loaded versions of one package) is
  a **load-time error** that names both owners. Different canonical names never clash, even if the last
  segment is equal: `@a/chat/say` and `@b/whisper/say` can live in one story.
- **Short names in stories (decided, see §7 question 1).** A story grant would be unbearable if it had to spell
  `@swarmtales/mechanic-channels/postToBoard` everywhere. Option: a story-level `aliases` table
  (`bid: "@swarmtales/bidding/place_bid"`) used in grants, locks, limits, rules and as the
  **model-facing name** (the model then sees `bid`, nothing long). Uniqueness of aliases inside one
  story is checked at load time; an unambiguous bare name (`say` while only one loaded tool ends in
  `/say`) may resolve implicitly, while an ambiguous bare name is a load error with the candidates
  listed. **Decided by Flo (2026-11-03): a story may override the alias**, per tool, via the
  `aliases` table; the table's value is the model-facing name and replaces the derived one.

## 4. Decision table

| | A: path form `pkg/mechanic/tool` (recommended) | B: `npm:` URI, for example `npm:@swarmtales/bidding#place_bid` | C: underscores only, `npm_package_mechanic_tool` |
|---|---|---|---|
| Valid for model APIs as is | No, needs the alias layer | No, needs the alias layer | Yes, can be used directly |
| Parseable without a map | Yes, `/` cannot occur inside a segment | Yes, but needs a URI parser, `#` and `:` rules | **No**, `_` and `-` occur inside every segment |
| Readable in YAML grants and logs | Good, reads like an import path | Noisy | Looks flat, origin hard to see |
| Familiar from npm and import paths | Yes | Partly (like `pnpm`/`npm:` specifiers) | No |
| Needs an alias function anyway | Yes (the one in 3.3) | Yes | Only for the 64-character limit |
| Collision risk | None between canonical names | None | Real: `a_b` + `c` vs `a` + `b_c` |
| Migration cost | Medium | Medium | Low now, high later |

**Recommendation: A**, with the alias layer of 3.3 and the short-alias table of 3.4 if Flo allows it.
C is the cheapest day-one but the ambiguity is permanent and shows up as a security and replay
problem exactly when third-party mechanics arrive. B has no advantage over A that outweighs its
noise.

## 5. Impact on the rest of the platform

- **Story grants.** Today `grants` lists bare tool names per role (the shipped stories use the
  current camelCase names). They have to be resolvable to canonical names at load time. Migration:
  first-party mechanics get package + mechanic ids; the loader accepts the old bare names for one
  release as an unambiguous suffix match and warns; a bare name that now matches two tools is an
  error. Shipped stories (`stories/*/story.ts`) are updated in one sweep, with the old names kept as
  the story's `aliases` table so the model-facing prompts do not change at all.
- **`grants: auto`** (`docs/design/grants-auto.md`). The derivation in
  `packages/kernel/src/host/auto-grants.ts` works on loaded mechanics, so it already knows owners; it
  must output canonical names, and its "derived grants must equal today's lists" check compares
  after canonicalisation. With two providers of one bare name nothing is ambiguous any more.
- **The Human Hand.** `/hand` and the human tools address tools by name. The CLI accepts canonical
  names and any unambiguous suffix; ambiguity is shown as a list to pick from. `human_note` /
  `human_amend` log the canonical name.
- **Locks, limits, rules, guards.** All keyed by canonical name; `limit.key` counters and the
  `resetOn` event names are unaffected (events are mechanic-scoped already; a similar question
  for event types is **open question 3**, out of scope here).
- **Event log and signed chain.** `tool_called` carries the canonical name and the alias. This is a
  format change, so the chain's genesis must record the naming scheme version.
- **Golden-run tests.** The goldens (byte-equal logs) contain bare names today. Options: (a) keep the
  bare name as the logged value for first-party tools via the story's `aliases` table and log the
  canonical name in an additional field (goldens unchanged except the field); (b) regenerate the
  goldens once, with a documented reason ("tool names become canonical"), as was done for
  "core becomes core motive". I recommend (b) in the same change as the migration, but only after
  the semantic diff (names only) is shown to be the only difference.
- **Prompts.** Prompts that mention tools by name (`description` prompts, briefing text) must use the
  model-facing name; the render step receives the alias map. Weak models get the short story alias
  (3.4), not the long derived one.
- **Transcripts.** Transcripts and `agents/*.md` print the model-facing name, with the
  canonical name in the run report.

## 6. Migration steps (when approved)

1. Add canonical-name type and `alias()` in `packages/contracts` (pure, unit-tested incl. the
   truncation and hash case, plus a property test: any canonical name maps to a valid provider name).
2. Give every first-party mechanic a package and mechanic id; derive canonical names in `loadMechanics`.
   Duplicate canonical name = load error with both owners.
3. Gateway: translate model-facing name back to canonical before `lock`; log both.
4. Story schema: grants and policies accept canonical names, suffix-unique bare names, and a story `aliases` table. Run `swt story schema` and commit `story.schema.json`.
5. Update shipped stories and the human hand; keep old names working with a warning for one release.
6. Goldens: regenerate once, reviewed as a names-only diff.
7. Provider layer: one assertion that every outgoing tool name matches `^[a-zA-Z0-9_-]{1,64}$`.
8. Docs: `docs/STORY-FORMAT.md`, `docs/design/mechanic-api.md`, `docs/CLI.md`.

Effort estimate: M (a few days), mostly mechanical, one larger kernel touch in the gateway and
loader. No new dependency.

## 7. Open questions for Flo

1. ~~Short aliases in stories~~ **Decided (Flo, 2026-11-03): yes, a story may override the alias**; canonical name and alias are both logged in the event header (3.3).
2. **Decision A / B / C** (table in §4). Recommendation: A.
3. **Do events get the same treatment** (mechanic-scoped event types)? Probably yes, but separate paper.
4. **Old bare names**: one release of warnings, or a hard cut together with the monorepo release?
5. **Goldens**: regenerate once (b) or keep them stable through a log-only alias (a)?
6. **Alias length**: 64 (safe on OpenAI-style APIs) or 128 (Anthropic, measured)? Recommendation: 64.
