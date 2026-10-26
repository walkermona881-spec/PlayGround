#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$PROJECT_DIR"

PORT="${PORT:-3000}"
[[ "$PORT" =~ ^[1-9][0-9]*$ ]] || { echo "start.sh: PORT must be a positive integer" >&2; exit 1; }
export PORT

echo "start.sh: project=$PROJECT_DIR port=$PORT"

if [[ -f package.json ]]; then
  if [[ ! -d node_modules ]]; then
    if [[ -f package-lock.json ]]; then
      /usr/bin/time -p npm ci --no-audit --no-fund
    else
      /usr/bin/time -p npm install --no-audit --no-fund
    fi
  fi

  if /usr/bin/time -p node -e 'const p = require("./package.json"); process.exit(p.scripts && p.scripts.build ? 0 : 1)'; then
    /usr/bin/time -p npm run build
  else
    /usr/bin/time -p node scripts/build.mjs
  fi
else
  echo "start.sh: no package.json, using dependency-free static build"
  /usr/bin/time -p node scripts/build.mjs
fi

[[ -f dist/index.html ]] || { echo "start.sh: dist/index.html was not produced" >&2; exit 1; }

BUILD_DIR="$(cd "$PROJECT_DIR/dist" && pwd -P)"
WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
DEPLOYMENT_OUTPUT="$WEB_DIR/deployment-output.json"

/usr/bin/time -p mkdir -p "$WEB_DIR"
/usr/bin/time -p node -e '
  const fs = require("node:fs")
  const [project, directory, output] = process.argv.slice(1)
  fs.writeFileSync(output, `${JSON.stringify({ project, directory })}\n`)
' "$PROJECT_DIR" "$BUILD_DIR" "$DEPLOYMENT_OUTPUT"

echo "start.sh: deployment=$DEPLOYMENT_OUTPUT directory=$BUILD_DIR"
echo "start.sh: serving on 0.0.0.0:$PORT"

exec /usr/bin/time -p node scripts/serve.mjs
