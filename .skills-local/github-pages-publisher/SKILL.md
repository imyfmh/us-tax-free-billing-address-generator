---
name: github-pages-publisher
description: Publish the current project to a GitHub repository and deploy it on GitHub Pages by automatically reading a Personal Access Token from ~/.pw. Use when the user asks to "发布到 GitHub 并部署", "push and deploy", "上线到 GitHub Pages", or any equivalent request after coding work is complete.
---

# GitHub Pages Publisher

Run this workflow after implementing the user's requested code changes.

## Workflow

1. Ensure the working tree contains the final code to publish.
2. Run the script:

```bash
bash scripts/publish_and_deploy.sh
```

3. If the user requested a specific repo name or branch, pass flags:

```bash
bash scripts/publish_and_deploy.sh --repo my-repo --branch main
```

4. Report both URLs:
- Repository URL
- GitHub Pages URL

## Script behavior

- Read token from `~/.pw` by extracting `github_pat_*` or `ghp_*`.
- Initialize git repo if needed.
- Stage and commit uncommitted changes when present.
- Create the remote GitHub repo if it does not exist.
- Push the selected branch.
- Enable GitHub Pages from that branch/path `/`.
- Poll build status and print final URLs.

## Arguments

- `--repo <name>`: target repository name (default: current directory name).
- `--branch <name>`: publish branch (default: `main`).
- `--description <text>`: repository description.
- `--private`: create a private repo instead of public.
- `--commit-message <text>`: custom commit message.

When deployment fails, surface the error and avoid silent fallbacks.
