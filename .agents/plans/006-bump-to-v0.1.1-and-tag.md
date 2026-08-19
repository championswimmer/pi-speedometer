# Plan 006 — bump to v0.1.1, commit, and tag

**Status:** done

## Goal

Prepare the repo for a manual npm publish by:

1. bumping `package.json` from `0.1.0` to `0.1.1`
2. committing all outstanding changes
3. creating annotated git tag `v0.1.1`
4. pushing `main` and the tag to GitHub

## Expected file changes

- `package.json` version bump to `0.1.1`
- record this step in `AGENTS.md`
- keep release planning files tracked under `.agents/plans/`

## Verification

- `git status` clean after commit
- `git tag --list v0.1.1` shows the tag
- `git push origin main` and `git push origin v0.1.1` succeed
