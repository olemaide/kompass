#!/usr/bin/env bash
# macOS and Linux: installs or updates Kompass. Run "bash install.sh --uninstall" to remove it.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is missing. Please install the current LTS version from https://nodejs.org and run this script again."
  echo "Node.js fehlt. Bitte die aktuelle LTS-Version von https://nodejs.org installieren und dieses Skript erneut starten."
  exit 1
fi
exec node install.mjs "$@"
