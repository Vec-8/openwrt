#!/bin/sh
set -eu

: "${EXPECTED_SHA256:?EXPECTED_SHA256 requis}"
: "${DEPLOY_STAMP:?DEPLOY_STAMP requis}"
ARCHIVE='/tmp/luci-app-otb-telemetry-runtime.tar.gz'
BACKUP_DIR="/root/otb-backups/telemetry-${DEPLOY_STAMP}"
STAGE="/tmp/otb-telemetry-stage.$$"
FILES='etc/init.d/otb-telemetry
usr/sbin/otb-telemetry-recorder
usr/share/luci/menu.d/luci-app-otb-telemetry.json
usr/share/rpcd/acl.d/luci-app-otb-telemetry.json
usr/share/rpcd/ucode/luci.otb_telemetry
www/luci-static/resources/view/status/otb-telemetry.js'
SUCCESS=0
BACKUP_READY=0
PREVIOUS_ENABLED=1
PREVIOUS_RUNNING=1

restore_previous() {
  [ "$SUCCESS" -eq 0 ] || return 0
  [ "$BACKUP_READY" -eq 1 ] || return 0
  echo 'ERREUR: restauration automatique des fichiers précédents' >&2
  if [ -x /etc/init.d/otb-telemetry ]; then
    /etc/init.d/otb-telemetry stop >/dev/null 2>&1 || true
    /etc/init.d/otb-telemetry disable >/dev/null 2>&1 || true
  fi
  for file in $FILES; do
    rm -f "/$file"
  done
  if [ -s "$BACKUP_DIR/existing-files.tar.gz" ]; then
    tar -xzf "$BACKUP_DIR/existing-files.tar.gz" -C /
  fi
  if [ -x /etc/init.d/otb-telemetry ]; then
    [ "$PREVIOUS_ENABLED" -eq 0 ] && /etc/init.d/otb-telemetry enable >/dev/null 2>&1 || true
    [ "$PREVIOUS_RUNNING" -eq 0 ] && /etc/init.d/otb-telemetry start >/dev/null 2>&1 || true
  fi
  rm -f /tmp/luci-indexcache /tmp/luci-modulecache
  /etc/init.d/rpcd restart >/dev/null 2>&1 || true
}
trap 'restore_previous; rm -rf "$STAGE"' EXIT HUP INT TERM

for command in sha256sum tar ucode ubus; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Commande requise absente: $command" >&2
    exit 1
  }
done
[ -x /usr/sbin/ethtool ] || {
  echo 'Dépendance absente: /usr/sbin/ethtool' >&2
  exit 1
}
[ -s "$ARCHIVE" ] || {
  echo "Archive absente: $ARCHIVE" >&2
  exit 1
}
ACTUAL_SHA256="$(sha256sum "$ARCHIVE" | awk '{print $1}')"
[ "$ACTUAL_SHA256" = "$EXPECTED_SHA256" ] || {
  echo "SHA-256 incorrect: $ACTUAL_SHA256" >&2
  exit 1
}

mkdir -p "$BACKUP_DIR" "$STAGE"
if [ -x /etc/init.d/otb-telemetry ]; then
  if /etc/init.d/otb-telemetry enabled >/dev/null 2>&1; then
    PREVIOUS_ENABLED=0
  else
    PREVIOUS_ENABLED=1
  fi
  if /etc/init.d/otb-telemetry running >/dev/null 2>&1; then
    PREVIOUS_RUNNING=0
  else
    PREVIOUS_RUNNING=1
  fi
fi
{
  echo "timestamp=$(date -Iseconds 2>/dev/null || date)"
  echo "hostname=$(cat /proc/sys/kernel/hostname)"
  echo "board=$(cat /tmp/sysinfo/board_name)"
  echo "archive_sha256=$ACTUAL_SHA256"
  echo "service_enabled_exit=$PREVIOUS_ENABLED"
  echo "service_running_exit=$PREVIOUS_RUNNING"
  for file in $FILES; do
    if [ -e "/$file" ]; then
      printf 'EXISTING %s ' "$file"
      sha256sum "/$file" | awk '{print $1}'
    else
      echo "ABSENT $file"
    fi
  done
} >"$BACKUP_DIR/manifest-before.txt"

EXISTING_FILES=''
for file in $FILES; do
  [ -e "/$file" ] && EXISTING_FILES="$EXISTING_FILES $file"
done
if [ -n "$EXISTING_FILES" ]; then
  # Les chemins sont une liste interne constante, sans entrée utilisateur.
  # shellcheck disable=SC2086
  tar -czf "$BACKUP_DIR/existing-files.tar.gz" -C / $EXISTING_FILES
else
  : >"$BACKUP_DIR/existing-files.tar.gz"
fi
BACKUP_READY=1

tar -xzf "$ARCHIVE" -C "$STAGE"
ucode -c -s -o "$STAGE/luci.otb_telemetry.compiled" \
  "$STAGE/usr/share/rpcd/ucode/luci.otb_telemetry"
ucode "$STAGE/luci.otb_telemetry.compiled" >/dev/null

for file in $FILES; do
  [ -f "$STAGE/$file" ] || {
    echo "Fichier manquant dans l'archive: $file" >&2
    exit 1
  }
  mkdir -p "$(dirname "/$file")"
  cp "$STAGE/$file" "/$file"
done
chmod 0755 \
  /etc/init.d/otb-telemetry \
  /usr/sbin/otb-telemetry-recorder \
  /usr/share/rpcd/ucode/luci.otb_telemetry
chmod 0644 \
  /usr/share/luci/menu.d/luci-app-otb-telemetry.json \
  /usr/share/rpcd/acl.d/luci-app-otb-telemetry.json \
  /www/luci-static/resources/view/status/otb-telemetry.js

for file in $FILES; do
  EXPECTED_FILE_SHA="$(sha256sum "$STAGE/$file" | awk '{print $1}')"
  INSTALLED_FILE_SHA="$(sha256sum "/$file" | awk '{print $1}')"
  [ "$EXPECTED_FILE_SHA" = "$INSTALLED_FILE_SHA" ] || {
    echo "Contrôle d'intégrité échoué pour /$file" >&2
    exit 1
  }
done

rm -f /tmp/luci-indexcache /tmp/luci-modulecache
/etc/init.d/rpcd restart
sleep 2
/etc/init.d/otb-telemetry enable
if /etc/init.d/otb-telemetry running >/dev/null 2>&1; then
  /etc/init.d/otb-telemetry restart
else
  /etc/init.d/otb-telemetry start
fi
sleep 2

ubus -S call luci.otb_telemetry status >"$BACKUP_DIR/status-after.json"
ubus -S call luci.otb_telemetry history >"$BACKUP_DIR/history-after.json"
/etc/init.d/otb-telemetry enabled
/etc/init.d/otb-telemetry running

cat >"$BACKUP_DIR/rollback.sh" <<EOF
#!/bin/sh
set -eu
BACKUP_DIR='$BACKUP_DIR'
FILES='$FILES'
if [ -x /etc/init.d/otb-telemetry ]; then
  /etc/init.d/otb-telemetry stop >/dev/null 2>&1 || true
  /etc/init.d/otb-telemetry disable >/dev/null 2>&1 || true
fi
for file in \$FILES; do rm -f "/\$file"; done
if [ -s "\$BACKUP_DIR/existing-files.tar.gz" ]; then
  tar -xzf "\$BACKUP_DIR/existing-files.tar.gz" -C /
fi
if [ -x /etc/init.d/otb-telemetry ]; then
  [ '$PREVIOUS_ENABLED' -eq 0 ] && /etc/init.d/otb-telemetry enable || true
  [ '$PREVIOUS_RUNNING' -eq 0 ] && /etc/init.d/otb-telemetry start || true
fi
rm -f /tmp/luci-indexcache /tmp/luci-modulecache
/etc/init.d/rpcd restart
EOF
chmod 0700 "$BACKUP_DIR/rollback.sh"

SUCCESS=1
rm -rf "$STAGE" "$ARCHIVE"
trap - EXIT HUP INT TERM
printf 'INSTALL_OK backup=%s sha256=%s\n' "$BACKUP_DIR" "$ACTUAL_SHA256"
