# Plugin market on npm (idea, not approved)

Status: design only. Nothing here is built. It belongs with the plugin system of the monorepo rewrite
(`docs/ideas/monorepo.md`, `docs/ideas/overseers-and-plugins.md` on the rewrite branch).

## Goal

Find, filter and install plugins (mechanics, overseers, stories, archetypes) without running a store of
our own at first. Plugin = npm package.

## Phase 1: npm conventions

- The npm organization `swarmtales` exists (2026-11-01). Official packages are `@swarmtales/<name>`.
- Third-party packages carry one keyword: `swarmtales-mechanic`, `swarmtales-overseer`,
  `swarmtales-story` or `swarmtales-archetype`. The npm search API filters by keyword.
- `package.json` carries a `swarmtales` field: `kind`, `sdk` (compatible version range) and `needs` (the
  grants the plugin asks for: tools, network, files).
- CLI: `swt plugin search|info|install` with filters `--kind`, `--text`, `--sdk` (only compatible),
  `--verified`. It queries the npm registry. No server of ours.
- `info` reads the license, grants and sdk range from the package itself, because the search API does not
  return them reliably.

## Trust

- npm has no quality or safety seal. A small list `verified.json` in a repository of ours holds
  name, version and integrity hash of reviewed packages. The CLI shows those first and warns on others.
- Foreign code runs only in the planned sandbox (QuickJS or isolated-vm) with explicitly granted rights.
  This matters more than any store.
- Our packages publish with 2FA enforced and npm provenance.

## Money and licensing

- npm cannot sell. Paid plugins are a later step (own store, license keys, or a private registry).
- The license allows selling plugins (Additional Term 5). `contracts` and `sdk` are Apache 2.0.

## Phase 2 (only if third-party plugins exist)

Web page over the same data, ratings, paid listings. Not before.

## Open questions

- Who reviews for `verified.json`, and by what checklist?
- Do stories and archetypes also ship as npm packages, or as plain files in `library/`?
- Name clash policy for the keywords.
