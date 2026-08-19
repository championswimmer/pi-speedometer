# Plan 002 — release prep, repo creation, and publishability

**Status:** done

## Goals

1. Confirm whether unscoped npm package name `pi-speedometer` is available.
2. If unavailable, do not publish under that name; prepare the repo and package for publishing under an alternate name later.
3. Add sensible `.gitignore` and `.npmignore`.
4. Initialize git, commit the current work.
5. Create GitHub repo `championswimmer/pi-speedometer` using the `hub` CLI and push the local repo.

## Constraints / facts

- `pi-speedometer` already exists on npm, so unscoped publish under that exact package name is blocked.
- The working directory is not yet a git repository.
- User explicitly asked for GitHub repo creation using `hub`.

## Deliverables

- `.gitignore`
- `.npmignore`
- local git repo with initial commit
- remote GitHub repo `championswimmer/pi-speedometer`
- pushed default branch

## Verification

- `npm view pi-speedometer` shows existing package.
- `git status --short --branch` works after init.
- `git remote -v` shows GitHub remote.
- `git push -u origin <branch>` succeeds.
- `hub browse -u` or `git remote get-url origin` matches `championswimmer/pi-speedometer`.

## Follow-up needed from user

Pick an npm package name, likely one of:
- `@championswimmer/pi-speedometer`
- `pi-speedometer-cli`
- `pi-speedometer-extension`

Only after that should `package.json.name` be updated and `npm publish` be attempted.
