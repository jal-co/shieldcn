#!/bin/bash

# Skip Vercel preview deploys when only non-deployable files changed.
# Exit 0 = skip build, Exit 1 = proceed with build.
#
# Production deploys (main branch) always build.

if [[ "$VERCEL_GIT_COMMIT_REF" == "main" ]]; then
  echo "✅ Production branch — building."
  exit 1
fi

# Files/dirs that do NOT affect the deployed app
IGNORE_PATTERNS="README.md|AGENTS.md|LICENSE|\.github/|brand/|\.env\.example|public/llms.*\.txt"

# Check if any changed file is NOT in the ignore list
CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")

if [ -z "$CHANGED" ]; then
  echo "⚠️ Could not determine changed files — building to be safe."
  exit 1
fi

RELEVANT=$(echo "$CHANGED" | grep -Ev "^($IGNORE_PATTERNS)$" || true)

if [ -z "$RELEVANT" ]; then
  echo "⏭️ Only non-deployable files changed — skipping build."
  echo "Changed files: $(echo "$CHANGED" | tr '\n' ' ')"
  exit 0
fi

echo "✅ Deployable files changed — building."
echo "Relevant: $(echo "$RELEVANT" | tr '\n' ' ')"
exit 1
