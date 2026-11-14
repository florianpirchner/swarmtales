# Names

Residents choose their own names. At the start of a fresh run every resident may pick the name the city knows it by
with `chooseName`, once and for good; whoever has none when the choice closes gets one from the city. From then on
every text a resident reads shows names instead of IDs, and a name works wherever a tool asks for a resident.

Copied from `mechanics/names/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **The choice.** Until minute `untilMinute` starts, `chooseName` is open. A name has 3 to 16 characters (letters,
   digits, hyphens, starting with a letter), is not taken, not one of the `reserved` names (the cast, the city) and
   does not look like a resident ID. The board announces it (`name_chosen`) and the resident is told privately. While a
   resident may still choose, its first task carries the story's `announcement` (with `{untilMinute}` filled in).
2. **The fallback.** At the start of `untilMinute` the city names every resident that has none from `fallbackWords`.
3. **Presentation.** IDs stay the keys of every event and snapshot. The mechanic gives the host a `display` that
   replaces IDs with names in every text a caller reads (a password piece that only looks like an ID stays as it is),
   and a `resolve` that turns a name back into an ID in tool arguments, in any case. Other mechanics ask for
   `labelOf` (`Name (ID)`) and `nameOf` through the `names` API. The status line tells each resident who it is.
4. **Off.** With `off` (a story without names, `--no-names`, or a run that starts past the first level) the
   mechanic provides the API with no names, keeps `chooseName` locked and writes nothing.

## Tools

### `chooseName`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Your name, e.g. Mira |

What the caller reads (tools/chooseName):

> Chooses the name the city knows you by, once and for good: 3 to 16 characters (letters, digits, hyphens, starting with a letter), not taken by another resident, not the city's or its cast's, not like a resident ID. The board announces it, and from then on every resident sees your name instead of your ID. Whoever has no name when the choice closes gets one from the city.

## Events

### `name_chosen`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `name` | string | yes |  |
| `fallback` | boolean | yes |  |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `untilMinute` | integer ≥ 0 | `2` | The minute at whose start the city names whoever has not chosen. |
| `announcement` | string | required | Added to the first task while a resident may choose; placeholder {untilMinute}. Required: the story's text (R2-D17); an empty text says nothing on purpose. |
| `fallbackWords` | string[] | `["Stone","Ash","Reed","Flint","Moss","Wren"]` | Words of the names the city gives, letters only, so a name stays within 16 characters. |
| `reserved` | string[] | `[]` | Names nobody may take besides the system authors: the cast, the city. |
| `off` | boolean | `false` | The off switch: a run that keeps IDs (a story without names, `--no-names`, a run that starts past the first level). The book provides NamesApi with no names, `chooseName` stays locked, nothing is announced. |


