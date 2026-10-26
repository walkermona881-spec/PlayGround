#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$PROJECT_DIR"

: "${CAPTURE_URL:?capture.sh: set CAPTURE_URL to the preview URL}"
: "${CAPTURE_DIR:?capture.sh: set CAPTURE_DIR to an output directory outside the project}"

RUNTIME="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"
CAPTURE_SCRIPT="$RUNTIME/scripts/default-capture.mjs"
[[ -f "$CAPTURE_SCRIPT" ]] || { echo "capture.sh: missing $CAPTURE_SCRIPT" >&2; exit 1; }

/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
CAPTURE_DIR="$(cd "$CAPTURE_DIR" && pwd -P)"

if [[ "$CAPTURE_DIR" == "$PROJECT_DIR" || "$CAPTURE_DIR" == "$PROJECT_DIR"/* ]]; then
  echo "capture.sh: CAPTURE_DIR must be outside $PROJECT_DIR" >&2
  exit 1
fi

export CAPTURE_READY_SELECTOR="${CAPTURE_READY_SELECTOR:-[data-app-ready=\"true\"]}"
export CAPTURE_AUTO_START="${CAPTURE_AUTO_START:-false}"

echo "capture.sh: url=$CAPTURE_URL"
echo "capture.sh: output=$CAPTURE_DIR"

set +e
/usr/bin/time -p node "$CAPTURE_SCRIPT"
status=$?
set -e

if (( status != 0 )); then
  echo "capture.sh: browser capture failed with exit $status" >&2
fi

exit "$status"
