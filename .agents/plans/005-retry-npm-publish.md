# Plan 005 — retry npm publish after login

**Status:** done (npm login verified; publish attempted but blocked by npm 2FA OTP, user will publish manually)

## Goal

Now that `npm login` is complete, verify authentication and publish `@championswimmer/pi-speedometer@0.1.0`.

## Steps

1. Verify npm auth with `npm whoami`.
2. Confirm package metadata/version in `package.json`.
3. Run `npm publish` from the repo root.
4. Verify publication with `npm view @championswimmer/pi-speedometer version`.
5. Update `AGENTS.md` and this plan with the successful publish state.
