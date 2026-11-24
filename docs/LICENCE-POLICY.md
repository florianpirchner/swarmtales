# Licence policy

The decisions behind this page are section 5 of
[`refactoring-before-release/DECISIONS.md`](refactoring-before-release/DECISIONS.md) and its row A65. This page is the working copy
for contributors; the gate is `scripts/check-licences.ts`.

## The rule

Swarm Tales, all of it, is under the Sustainable Use License 1.0 with Additional Terms ([`LICENSE`](../LICENSE), SPDX
id `LicenseRef-SUL-1.0`): kernel, sdk, contracts, code, prompts, game texts, docs and run data. It is source-available,
not open source. Only third-party files keep their own licences. **No GPL and no other copyleft licence anywhere,
ever.** Copyleft means strong, weak, file-level and network copyleft alike.

The project's own licence is not on the allowlist below: a third-party dependency is judged against the allowlist
alone, and a dependency under `LicenseRef-SUL-1.0` or any other source-available licence is refused.

The rule covers everything the repository declares, vendors, bundles or downloads: every package in the lockfile
(production, development, optional, peer, transitive, platform binaries), every file in the repository, every file a
script or a workflow fetches, and every GitHub Action a workflow uses.

## Allowlist

A package passes when its SPDX licence expression is satisfied by these ids alone. The list in code is
`scripts/licences/allowlist.ts`.

| Group | SPDX ids |
|---|---|
| Permissive code | `Apache-2.0`, `MIT`, `MIT-0`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `0BSD`, `Zlib`, `BlueOak-1.0.0`, `Python-2.0`, `Apache-2.0 WITH LLVM-exception` |
| Public domain | `CC0-1.0`, `Unlicense` |
| Data and text inside packages | `CC-BY-4.0`, `CC-BY-3.0`, `Unicode-3.0`, `Unicode-DFS-2016` |

- `A OR B` passes when one side is on the list; the inventory records which side is used.
- `A AND B` passes only when both sides are on the list.
- Never allowed, with no exception path: every `GPL`, `LGPL`, `AGPL`, `MPL`, `EPL`, `CDDL`, `EUPL`, `OSL`,
  `CC-BY-SA` and `OFL` licence, and any other licence with a share-alike or source-disclosure duty. Also refused,
  because they would bind the project to someone else's terms: `CC-BY-NC`, `SSPL`, `BUSL`, `Elastic`, the
  Sustainable Use License, other source-available licences, `UNLICENSED` and a missing licence.

## What the gate checks

`pnpm check:licences` runs in `pnpm check` and in the workflow. It fails when

1. a package of the lockfile has a licence outside the allowlist, an expression that cannot be parsed, or no
   licence. The list of packages is `pnpm-lock.yaml` itself: every platform, optional and transitive packages
   included. The licence of an installed package is read through `pnpm licenses list --json`; a package that this
   machine does not install (a binary of another platform and what it pulls in) is judged by its row in
   `THIRD-PARTY-LICENSES.md`, which `pnpm licences:write` fills from the registry. A package with neither fails.
   The message names the package, the licence and what pulls the package in;
2. a package of the lockfile does not come from the registry with an integrity hash (a git repository, a tarball
   address, a local path);
3. a source file does not start with `// SPDX-License-Identifier: LicenseRef-SUL-1.0` (vendored files under `third_party/`
   keep the header of their source);
4. a `package.json` does not say `"license": "LicenseRef-SUL-1.0"`, or names a dependency without an exact version;
5. a workflow or a local action under `.github/` uses an action that is not on the short list in
   `scripts/licences/allowlist.ts` or is not pinned by a full commit id, or runs a job in a container image; or
   there is no workflow at all;
6. a folder under `third_party/` has no row in `third_party/manifest.json`, no `LICENSE` file, or a licence outside
   the allowlist, or a file lies loose in `third_party/`;
7. a file that git tracks is a binary or model file (`.wasm`, `.node`, `.so`, `.dll`, `.exe`, `.jar`, `.onnx`,
   `.safetensors`, `.gguf`, `.pt`, `.bin`, `.tflite`, `.pkl`, `.npy`, an archive and more; the list is
   `BINARY_SUFFIXES` in `scripts/licences/repo-files.ts`) and does not lie in a folder `third_party/<name>/` with a
   manifest row. Such a file carries no SPDX header, so no other check would see it;
8. `THIRD-PARTY-LICENSES.md` is stale. `pnpm licences:write` rewrites it; only this command uses the network.

The inventory lists the packages of the lockfile, the vendored folders and the actions with their pinned commits.
It is the same on every machine. The licence of an action is the one of its repository, read by hand from the
licence file at the pinned commit when the action is put on the list; the code that an action bundles is not
judged package by package.

## In CI

The workflow `.github/workflows/licences.yml` runs the gate as its own job, `Licence gate`, on every pull request
(to any branch) and on every push to `main`, `develop` and `rewrite/develop` (decision A69). Since the switch of
2026-11-24 (decision A5, O3) `main` holds the last reviewed milestone and `develop` the line of work; the ruleset of
`develop` refuses a direct push, so the build session still pushes to `rewrite/develop`, and its trigger stays until
the owner settles O4 (`docs/RELEASE.md`, step 4). It installs with `pnpm install --frozen-lockfile` and runs `pnpm check:licences`, which exits
non-zero on any offence above; it needs no network beyond the install, because the packages of other platforms are
judged by their rows in `THIRD-PARTY-LICENSES.md`. The job takes a few minutes, so a pull request learns of a refused
licence long before the full check of `check.yml` (which runs the gate too) is done.

The job blocks a merge only once it is a required status check. **The owner sets this by hand**: on GitHub,
Settings, the protection rule or ruleset of `main` and of `develop`, "Require status checks to pass", with the checks
`Licence gate` and `check` (exact names). A build session cannot set branch protection. Since 2026-11-24 the ruleset
of `develop` requires both checks and refuses a direct push, while GitHub Actions has started no run since
2026-11-14, so neither check has reported on `develop` yet (O4, `docs/RELEASE.md`, step 4).

## Exceptions

There are exactly two, and neither reaches a copyleft licence.

1. **Wrong or missing metadata.** If a package's own licence file shows an allowlisted licence that its
   `package.json` does not state, a row in `licences.overrides.json` pins `name@version` to the SPDX id, with a link
   to the licence file. The row is valid for that exact version only. An override never replaces a declared licence
   of a family that is never allowed: such a package is replaced.
2. **A permissive licence that is not on the list yet.** An issue quotes the licence text and shows that it has no
   share-alike or source-disclosure duty; the pull request adds the id to the allowlist; a challenger in a
   separate session approves. If there is doubt, the answer is no and the dependency is replaced.
