#!/usr/bin/env bash
# Wayfarer's Journal — macOS / Linux launcher. The Windows equivalent is start.bat.
set -e
cd "$(dirname "$0")"

echo
echo "  ======================================"
echo "    Wayfarer's Journal"
echo "  ======================================"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "  Node.js is not installed, and this app needs it to run."
  echo
  echo "    1. Go to   https://nodejs.org/en/download"
  echo "    2. Install the version marked \"LTS\""
  echo "    3. Run ./start.sh again"
  echo
  exit 1
fi

NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "  Your Node.js is version $NODE_MAJOR, which is too old. Version 20 or newer is needed."
  echo "  Get the latest LTS from https://nodejs.org/en/download"
  echo
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "  First time here, so a few pieces need downloading."
  echo "  This happens once and usually takes a minute or two."
  echo
  npm install --no-audit --no-fund
  echo
fi

if [ ! -f dist/client/index.html ]; then
  echo "  Preparing the journal..."
  echo
  npm run build
  echo
fi

echo "  Opening your journal in the browser."
echo "  Keep this terminal open while you write."
echo
export WJ_OPEN=1
exec npm start
