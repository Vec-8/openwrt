#!/bin/sh
# Lecture seule. CHECK_HOSTS peut contenir une liste d'hôtes séparés par espaces.
set +e

printf 'timestamp='; date -Iseconds 2>/dev/null || date
printf 'hostname='; cat /proc/sys/kernel/hostname
printf 'board='; cat /tmp/sysinfo/board_name
printf 'kernel='; uname -r
for file in /etc/config/network /etc/config/wireless /etc/config/firewall; do
  [ -f "$file" ] && sha256sum "$file"
done
ip -br link 2>/dev/null || ip link show
bridge vlan show 2>/dev/null
for file in /proc/net/bonding/*; do
  [ -f "$file" ] && { echo "--- $file"; cat "$file"; }
done
iw dev 2>/dev/null
ip route show
for host in ${CHECK_HOSTS:-1.1.1.1}; do
  ping -c 1 -W 1 "$host" >/dev/null 2>&1
  printf 'ping_%s=%s\n' "$host" "$?"
done
