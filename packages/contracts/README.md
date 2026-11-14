# @swarmtales/contracts

Types, schemas and closed vocabularies shared by every package. No behaviour, no workspace dependency, safe in a
browser (layer L0, see [`docs/LAYERS.md`](../../docs/LAYERS.md)).

At milestone M0 the package holds one constant, `GAME_FORMAT_VERSION`, so that every gate of `pnpm check` has
something to check. The contracts of the kernel arrive with issue 16.
