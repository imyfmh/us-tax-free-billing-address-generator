#!/usr/bin/env bash
set -euo pipefail

repo_name=""
branch="main"
description="Published by Codex"
visibility="public"
commit_message="chore: publish via github-pages-publisher skill"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      repo_name="${2:-}"
      shift 2
      ;;
    --branch)
      branch="${2:-}"
      shift 2
      ;;
    --description)
      description="${2:-}"
      shift 2
      ;;
    --private)
      visibility="private"
      shift
      ;;
    --commit-message)
      commit_message="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$repo_name" ]]; then
  repo_name="$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9._-]/-/g')"
fi

token="$(rg -o 'github_pat_[A-Za-z0-9_]+' ~/.pw | head -n1 || true)"
if [[ -z "$token" ]]; then
  token="$(rg -o 'ghp_[A-Za-z0-9]+' ~/.pw | head -n1 || true)"
fi
if [[ -z "$token" ]]; then
  echo "No GitHub token found in ~/.pw" >&2
  exit 1
fi

api="https://api.github.com"
auth_header="Authorization: Bearer $token"
accept_header="Accept: application/vnd.github+json"

user_json="$(curl -fsSL -H "$auth_header" -H "$accept_header" "$api/user")"
owner="$(printf '%s' "$user_json" | sed -n 's/.*"login"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
if [[ -z "$owner" ]]; then
  echo "Failed to resolve GitHub username" >&2
  exit 1
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  git init
fi

if [[ -z "$(git config user.name || true)" ]]; then
  git config user.name "codex-bot"
fi
if [[ -z "$(git config user.email || true)" ]]; then
  git config user.email "codex-bot@example.com"
fi

if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  git commit -m "$commit_message"
fi

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  git commit --allow-empty -m "$commit_message"
fi

git checkout -B "$branch"

create_payload="$(printf '{"name":"%s","private":%s,"description":"%s"}' "$repo_name" "$([[ "$visibility" == "private" ]] && echo true || echo false)" "$description")"
create_code="$(curl -sS -o /tmp/create_repo_resp.json -w '%{http_code}' -X POST -H "$auth_header" -H "$accept_header" "$api/user/repos" -d "$create_payload")"
if [[ "$create_code" != "201" && "$create_code" != "422" ]]; then
  cat /tmp/create_repo_resp.json >&2
  exit 1
fi

remote_url="https://github.com/$owner/$repo_name.git"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$remote_url"
else
  git remote add origin "$remote_url"
fi

basic_auth="$(printf 'x-access-token:%s' "$token" | base64 -w0)"
git -c "http.https://github.com/.extraheader=AUTHORIZATION: basic $basic_auth" push -u origin "$branch"

pages_payload="$(printf '{"source":{"branch":"%s","path":"/"}}' "$branch")"
pages_code="$(curl -sS -o /tmp/pages_resp.json -w '%{http_code}' -X POST -H "$auth_header" -H "$accept_header" "$api/repos/$owner/$repo_name/pages" -d "$pages_payload")"
if [[ "$pages_code" == "409" || "$pages_code" == "422" ]]; then
  curl -fsSL -X PUT -H "$auth_header" -H "$accept_header" "$api/repos/$owner/$repo_name/pages" -d "$pages_payload" >/tmp/pages_update_resp.json
elif [[ "$pages_code" != "201" ]]; then
  cat /tmp/pages_resp.json >&2
  exit 1
fi

for _ in $(seq 1 30); do
  build_status="$(curl -fsSL -H "$auth_header" -H "$accept_header" "$api/repos/$owner/$repo_name/pages/builds/latest" | sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
  if [[ "$build_status" == "built" ]]; then
    break
  fi
  if [[ "$build_status" == "errored" || "$build_status" == "canceled" ]]; then
    echo "GitHub Pages build failed: $build_status" >&2
    exit 1
  fi
  sleep 5
done

repo_link="https://github.com/$owner/$repo_name"
pages_link="https://$owner.github.io/$repo_name/"

echo "Repository: $repo_link"
echo "Pages: $pages_link"
