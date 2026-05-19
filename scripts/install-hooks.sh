#!/usr/bin/env bash
# ── Install Tome pre-commit hooks ──────────────────────────
# Usage: ./scripts/install-hooks.sh [repo-path]
# Defaults to current directory if no path given.

set -euo pipefail

REPO_DIR="${1:-.}"
HOOKS_DIR="$REPO_DIR/.git/hooks"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Error: $REPO_DIR is not a git repository"
  exit 1
fi

mkdir -p "$HOOKS_DIR"

# Install pre-commit hooks
cp "$SCRIPT_DIR/pre-commit-sanitize" "$HOOKS_DIR/pre-commit-sanitize"
cp "$SCRIPT_DIR/pre-commit-biome" "$HOOKS_DIR/pre-commit-biome"
chmod +x "$HOOKS_DIR/pre-commit-sanitize" "$HOOKS_DIR/pre-commit-biome"

cat > "$HOOKS_DIR/pre-commit" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

HOOKS_DIR="$(cd "$(dirname "$0")" && pwd)"

"$HOOKS_DIR/pre-commit-sanitize"
"$HOOKS_DIR/pre-commit-biome"
EOF
chmod +x "$HOOKS_DIR/pre-commit"

echo "Pre-commit sanitize and biome hooks installed at $HOOKS_DIR"
echo "Both hooks will run together on every commit."
