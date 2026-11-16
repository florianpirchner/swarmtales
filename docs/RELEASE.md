# Releasing Swarm Tales

The checklist of the release of 1.0, in order (`docs/refactoring-before-release/13-m6-spec.md` 6.4, issue M6-21).
Every step here is **the owner's hand** (`DECISIONS.md` section 6, O2 to O13, decision A134): no agent runs one. The
scripts of `scripts/release/` read, check and print; none of them publishes, pushes, tags or creates anything (a test
in `scripts/release/test/release.test.ts` fails on a script that would). Each step names its commands, what to check
after it, and how to undo it while it can be undone.

The repository is `florianpirchner/swarmtales`. `<npm user>` is the owner's account on npm. Commands run in a full
clone of the repository with `pnpm install --frozen-lockfile` done and the Node of `.node-version`.

## 0. The release candidate (an integrator's commit, not the owner's hand)

| | |
|---|---|
| Commands | `pnpm release:version 1.0.0 0.1.0` (the platform line and the plugins' line, A123; it also sets `version` and `date-released` of `CITATION.cff`, A139), commit it on `rewrite/develop` (`develop` after the switch) as the release candidate, then `pnpm check` and `pnpm release:check 1.0.0` |
| Check | `pnpm release:check 1.0.0` ends with `release:check: green on rewrite/develop`: it built the workspace, packed all listed packages, found every tarball complete (13-m6-spec 6.2: `dist/LICENSE`, `dist/NOTICE`, `README.md`, exact dependency versions, a `.js` and a `.d.ts` of every export, no test, `.env` or `.npmrc` file, nothing outside `files`, no inlined package, no local path, a third-party file with its licence), `swt scan` clean over the unpacked tarballs, both version lines in step, `THIRD-PARTY-LICENSES.md` fresh, the tree clean and the head on the line of work. It then prints the publish commands of step 7 |
| Undo | a new commit with other versions; nothing left the clone |

## 1. O2: the names

| | |
|---|---|
| Commands | `pnpm release:names --owner <npm user>` (one read-only HTTPS `GET` per name: every listed package, `create-swarmtales`, and the scope as an organisation). Create the organisation `swarmtales` on npm (`https://www.npmjs.com/org/create`), which holds the scope `@swarmtales`. The unscoped names `swarmtales` and `create-swarmtales` are held only by a publish: by step 7, or earlier by a placeholder that the owner publishes from a folder with a `package.json` and a `README.md` only (`pnpm publish --access public`) |
| Check | `pnpm release:names --owner <npm user>` lists `@swarmtales` as held (the registry does not say by whom: the owner checks his organisation page) and every name he reserved as `held by the owner`; it exits 1 while a name is held by another account or the registry did not answer |
| Undo | an organisation can be deleted on npm; a placeholder can be removed within 72 hours on its npm page, after that it stays (O2: "a placeholder publish is hard to undo") |

## 2. The look at the licence

| | |
|---|---|
| What | A lawyer reads the final `LICENSE` (A65: "not legal advice") and the package `NOTICE` that every tarball carries (`PACKAGE_NOTICE` in `tsdown.base.ts`, A147), before O10 and O12 |
| Check | the owner records the outcome as a decision row; a changed text is an issue, and `pnpm release:check` runs again after it |
| Undo | none needed: nothing is published yet |

## 3. O3: the tags and the switch of `main`

| | |
|---|---|
| Before | the bundle of the old state, kept outside GitHub: `git bundle create swarmtales-v0-final.bundle v0-final`, then `git bundle verify swarmtales-v0-final.bundle` |
| Commands | `node scripts/release/switch-main.ts`: it reads the remote and the open pull requests against `main` (read-only), checks (`legacy` and `v0-final` at `a73e6a9`, the target descends from `rewrite/root` and records `pnpm check: green`) and prints, in order: the push of `v0-final` first (while that tag is missing it prints nothing else), the owed tags (`runtime-r3` to `runtime-r8`, `milestone-m1` to `milestone-m6`, the optional `runs/m5-5a` and `runs/m5-5c`), the retarget of each open pull request to `legacy`, the force push of `main` with its lease on `a73e6a9`, `develop` from `rewrite/develop`, and the default branch. The owner runs the printed lines one by one |
| Check | `node scripts/release/switch-main.ts --verify`: `main` at the target, `develop` at `rewrite/develop`, `legacy` and `v0-final` unchanged |
| Undo | while `legacy` exists, the undo line that `switch-main.ts` prints (the old `main` pushed back with `--force-with-lease`, DECISIONS 8.5); a pushed tag is removed by the owner on GitHub. After the switch, issue M6-29 moves the workflows' triggers to `develop` |

## 4. O4: Actions and branch protection (with O3)

| | |
|---|---|
| Commands | `gh api -X PUT repos/florianpirchner/swarmtales/actions/permissions -F enabled=true`; then for each of `main`, `develop` and `legacy`: `gh api -X PUT repos/florianpirchner/swarmtales/branches/<branch>/protection --input protection.json`, with `protection.json` = `{"required_status_checks":{"strict":true,"contexts":["check","Licence gate"]},"enforce_admins":true,"required_pull_request_reviews":null,"restrictions":null,"allow_force_pushes":false,"allow_deletions":false}`. Add `Packed install` to the contexts if A120's way out (its own CI job) was taken |
| Check | `gh api repos/florianpirchner/swarmtales/branches/main/protection --jq .required_status_checks.contexts` prints `check` and `Licence gate`; the next push to `develop` shows both checks green |
| Undo | `gh api -X DELETE repos/florianpirchner/swarmtales/branches/<branch>/protection`; Actions off with `-F enabled=false` |
| Note | required checks refuse a direct push of a commit whose checks have not run; the integrator's squash commits onto `develop` (A2, A3) then go through a pull request, or the owner grants a bypass. That choice is the owner's |

## 5. O8: the data repository and the old runs

| | |
|---|---|
| Commands | `node scripts/release/data-repo.ts` (the dry run: `data/runs` with its `README.md` and the project's `LICENSE`, every runs index row on the branch, every link classed, `swt scan` clean), then the three lines it prints (create `florianpirchner/swarmtales-runs`, push the head of `data/runs` as its `main`, set the default branch). Then, on the owner's own clone (an agent's staging is lost with its container, A25): `node scripts/release/legacy-runs.ts --sign-off "<name> <email>"`, which stages the old runs of `v0-final` into the local branch `data/legacy-staging` and refuses when its manifest digest differs from the one the record of M6-18 holds (`docs/ISSUE-RECORD.md`, "The legacy runs staged by M6-18"); then the push line it prints |
| Check | `git ls-remote https://github.com/florianpirchner/swarmtales-runs.git refs/heads/main` prints the commit the scripts named; in a checkout of the data repository, `sha256sum -c` of the staged manifest passes for every line. After O8, issue M6-28 rewrites the links (`node scripts/release/links.ts` classes them today) |
| Undo | the data repository can be deleted while nothing links to it; `data/runs` stays on this repository until O6 |

## 6. O10: public

| | |
|---|---|
| Before | step 2 done |
| Commands | `gh repo edit florianpirchner/swarmtales --visibility public --accept-visibility-change-consequences` |
| Check | `gh repo view florianpirchner/swarmtales --json visibility` prints `PUBLIC` |
| Undo | cannot be taken back in effect (O10): the history, the 155 old pull requests and `legacy` while it exists have been public. The setting itself goes back with `--visibility private` |

## 7. O12: publish, the tag `v1.0.0`, the GitHub release

| | |
|---|---|
| Before | the milestone review of M6, steps 0 to 3 done, `pnpm release:check 1.0.0` green on the release candidate |
| Commands | the `pnpm --dir <folder> publish --access public` lines that `pnpm release:check 1.0.0` prints, in their order (each package after the listed packages it depends on); pnpm asks for the one-time code of the account's 2FA. Then `git tag -a v1.0.0 <release commit> -m "v1.0.0"`, `git push origin refs/tags/v1.0.0`, and `gh release create v1.0.0 --repo florianpirchner/swarmtales --title "Swarm Tales 1.0.0" --notes-file <notes>` (the release holds `CITATION.cff`, A139) |
| Check | `pnpm release:names --owner <npm user>` lists every name as `held by the owner`; in an empty folder outside the clone, `pnpm add swarmtales@1.0.0` and then `pnpm exec swt doctor` report the installed versions on their lines |
| Undo | a version can be unpublished on its npm page within 72 hours, never after (O12); the tag and the GitHub release can be deleted on GitHub |

## Not recommended before 1.0

| # | What | Why |
|---|---|---|
| O6 | delete `legacy` and `v0-final` | after 1.0 only, after every row of the save list (`13-m6-spec.md` 7.2) is ticked and the bundle of step 3 is kept; it cannot be undone except from that bundle |
| O11 | a domain | costs money each year, and there is no docs site before 1.0 |
| O13 | a trademark | `NOTICE` states the reservation of the names at no cost |
