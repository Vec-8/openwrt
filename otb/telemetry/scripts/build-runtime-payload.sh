#!/bin/sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)"
PACKAGE_DIR="$REPO_ROOT/package/custom/luci-app-otb-telemetry"
if [ ! -d "$PACKAGE_DIR" ]; then
  PACKAGE_DIR="$REPO_ROOT/package/otb/luci-app-otb-telemetry"
fi
[ -d "$PACKAGE_DIR" ] || {
  echo 'Paquet luci-app-otb-telemetry introuvable' >&2
  exit 1
}
DIST_DIR="$REPO_ROOT/otb/telemetry/dist"
STAGE="$DIST_DIR/runtime-root"
ARCHIVE="$DIST_DIR/luci-app-otb-telemetry-runtime.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE/www/luci-static/resources/view/status"
cp -R "$PACKAGE_DIR/root/." "$STAGE/"
cp "$PACKAGE_DIR/htdocs/luci-static/resources/view/status/otb-telemetry.js" \
  "$STAGE/www/luci-static/resources/view/status/otb-telemetry.js"
chmod 0755 "$STAGE/etc/init.d/otb-telemetry" \
  "$STAGE/usr/sbin/otb-telemetry-recorder"
chmod 0644 "$STAGE/usr/share/rpcd/ucode/luci.otb_telemetry" \
  "$STAGE/usr/share/luci/menu.d/luci-app-otb-telemetry.json" \
  "$STAGE/usr/share/rpcd/acl.d/luci-app-otb-telemetry.json" \
  "$STAGE/www/luci-static/resources/view/status/otb-telemetry.js"
mkdir -p "$DIST_DIR"
(
  cd "$STAGE"
  tar -czf "$ARCHIVE" .
)
sha256sum "$ARCHIVE" >"$ARCHIVE.sha256" 2>/dev/null || \
  shasum -a 256 "$ARCHIVE" >"$ARCHIVE.sha256"
printf '%s\n' "$ARCHIVE"
