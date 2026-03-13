---
description: Create and push a new version tag to trigger an automated GitHub Release
allowed-tools: Bash, Read
---

Create a new release for this repository by tagging and pushing to GitHub.

## Step 1: Determine next version

Run the following to see the latest tag:
```bash
git tag --sort=-version:refname | head -5
```

If an argument was passed (e.g. `/release v1.2.0`), use that as the version.
Otherwise, look at the latest tag and suggest the next patch/minor/major bump based on the commits since last tag:
```bash
git log $(git tag --sort=-version:refname | head -1)..HEAD --oneline --no-merges
```

- Commits with `feat:` → bump minor
- Commits with `fix:` or `chore:` → bump patch
- Commits with `BREAKING CHANGE` → bump major

Show the user the proposed version and the commits that will be included, then ask for confirmation before proceeding.

## Step 2: Tag and push

Once confirmed:
```bash
git tag <version>
git push origin <version>
```

## Step 3: Confirm

Show the GitHub Actions URL and remind the user the release will be live within ~30 seconds:
```
https://github.com/PuvaanRaaj/claude-gitlab-analytics/actions
```
