# Plan 003 — rename npm package to scoped name

**Status:** done

## Goal

Prepare the package for npm publication under the scoped name `@championswimmer/pi-speedometer`.

## Changes

1. Update `package.json`:
   - change `name` to `@championswimmer/pi-speedometer`
   - add `publishConfig.access = "public"` for public scoped publishing
2. Update `README.md`:
   - replace install command examples to use `@championswimmer/pi-speedometer`
   - clarify that the package is published under the scoped name
3. Update `AGENTS.md` publishing notes accordingly.
4. Verify with `npm pack --dry-run`.
5. Commit and push the changes.

## Verification

- `npm view @championswimmer/pi-speedometer` currently 404 / not found
- `npm pack --dry-run` succeeds with expected contents
- Git status is clean after commit/push
