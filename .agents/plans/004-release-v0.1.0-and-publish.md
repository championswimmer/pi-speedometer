# Plan 004 — release v0.1.0 and publish

**Status:** done (publish attempted; blocked by npm registry auth/scope access)

## Goal

Cut the first tagged release for `@championswimmer/pi-speedometer` at `v0.1.0` and publish it to npm.

## Steps

1. Verify `package.json.version` is `0.1.0`.
2. Ensure git working tree is clean.
3. Create an annotated git tag `v0.1.0`.
4. Push the tag to GitHub.
5. Run `npm publish` for the scoped package.
6. Record the result and any blocker (e.g. npm auth).

## Verification

- `git tag --list v0.1.0` shows the tag
- `git push origin v0.1.0` succeeds
- `npm publish` succeeds, or if it fails, the failure is captured accurately
