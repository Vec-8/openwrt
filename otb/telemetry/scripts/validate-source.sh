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
sh -n "$PACKAGE_DIR/root/etc/init.d/otb-telemetry"
sh -n "$PACKAGE_DIR/root/usr/sbin/otb-telemetry-recorder"
sh -n "$REPO_ROOT/otb/telemetry/scripts/remote-install-runtime.sh"
if command -v node >/dev/null 2>&1; then
  node --check "$PACKAGE_DIR/htdocs/luci-static/resources/view/status/otb-telemetry.js"
fi
python3 - <<PY
import json
from pathlib import Path
base = Path(r'''$PACKAGE_DIR''')
for path in (
    base / 'root/usr/share/luci/menu.d/luci-app-otb-telemetry.json',
    base / 'root/usr/share/rpcd/acl.d/luci-app-otb-telemetry.json',
):
    json.loads(path.read_text())
    print('JSON OK:', path)
PY
