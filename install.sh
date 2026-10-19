#!/usr/bin/env bash
# dsh-music installer for DeepSeek Harness (web profile)
# Copies the plugin into ~/.dsh, installs NeteaseCloudMusicApi, and appends
# the two loader rows to the profile's cordis.patch.yml.
set -euo pipefail

DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo
echo "==> dsh-music installer"
echo "    DSH_HOME: $DSH_HOME"
echo "    source  : $ROOT"

# --- 1. host plugin (spawns the NeteaseCloudMusicApi server on DSH startup) ---
HOST_DEST="$DSH_HOME/plugins/dsh-music"
API_DIR="$HOST_DEST/netease-api"
mkdir -p "$API_DIR"
cp "$ROOT/host/index.js" "$HOST_DEST/index.js"
cp "$ROOT/host/netease-api/launch.js" "$API_DIR/launch.js"
cp "$ROOT/host/netease-api/separate.py" "$API_DIR/separate.py"
cp "$ROOT/host/netease-api/package.json" "$API_DIR/package.json"
echo "    host plugin -> $HOST_DEST"

# --- 2. install NeteaseCloudMusicApi ---
echo "    installing NeteaseCloudMusicApi (npm)..."
( cd "$API_DIR" && npm install --no-audit --no-fund >/dev/null )
echo "    netease-api ready"

# --- 3. client bundle (the music player UI) ---
CLIENT_DEST="$DSH_HOME/profiles/node_modules/@deepseek-ai/dsh-client-ui-music"
mkdir -p "$CLIENT_DEST/lib"
cp "$ROOT/client/package.json" "$CLIENT_DEST/package.json"
cp "$ROOT/client/lib/index.js" "$CLIENT_DEST/lib/index.js"
cp "$ROOT/client/lib/client.js" "$CLIENT_DEST/lib/client.js"
echo "    client bundle -> $CLIENT_DEST"

# --- 4. resolve node path ---
NODE_PATH_BIN="$(command -v node || echo node)"

# --- 5. patch the profile (idempotent) ---
PATCH_FILE="$DSH_HOME/profiles/web/cordis.patch.yml"
if [ ! -f "$PATCH_FILE" ]; then
  echo "    ! patch file not found: $PATCH_FILE"
  echo "    ! add the rows in README '手动安装' section yourself."
else
  if grep -q "id:[[:space:]]*ui-music" "$PATCH_FILE" && grep -q "id:[[:space:]]*tool-music-server" "$PATCH_FILE"; then
    echo "    patch already contains dsh-music rows (skip)"
  else
    cat >> "$PATCH_FILE" <<YAML

# dsh-music: Netease Cloud Music player (bottom-right floating player) + API server
- insert:
    - id: ui-music
      name: '@deepseek-ai/dsh-client-ui-music'
- insert:
    - id: tool-music-server
      name: 'file://$HOST_DEST/index.js'
      config:
        nodePath: '$NODE_PATH_BIN'
        serverScript: '$API_DIR/launch.js'
        port: 3000
YAML
    echo "    patch appended -> $PATCH_FILE"
  fi
fi

echo
echo "==> done. Restart DSH (or hard-refresh the page); the player appears bottom-right."
