#!/bin/sh
# SPDX-License-Identifier: GPL-2.0-or-later
# Audit en lecture seule d'un switch RTL9303 démarré sous OpenWrt.

set -u

section() {
	printf '\n===== %s =====\n' "$1"
}

run() {
	printf '\n$ %s\n' "$*"
	"$@" 2>&1 || true
}

section "Horodatage"
run date -Is
run uptime

section "Plateforme"
run ubus call system board
run uname -a
run sh -c "tr '\\000' '\\n' </proc/device-tree/model"
run sh -c "tr '\\000' '\\n' </proc/device-tree/compatible"
run cat /proc/mtd
run cat /proc/meminfo
run df -h

section "Paquets critiques"
if command -v apk >/dev/null 2>&1; then
	run apk info -e kmod-bonding luci-mod-network luci-app-otb-lacp \
		luci-i18n-otb-lacp-fr ip-full ip-bridge ethtool-full \
		iperf3 tcpdump-mini lldpd
elif command -v opkg >/dev/null 2>&1; then
	for package in kmod-bonding luci-mod-network luci-app-otb-lacp \
		luci-i18n-otb-lacp-fr ip-full ip-bridge ethtool-full \
		iperf3 tcpdump-mini lldpd; do
		run opkg status "$package"
	done
fi

section "Températures du switch"
for zone in /sys/class/thermal/thermal_zone*; do
	[ -d "$zone" ] || continue
	printf '\n-- %s --\n' "${zone##*/}"
	run cat "$zone/type"
	run cat "$zone/temp"
	for trip in "$zone"/trip_point_*_type "$zone"/trip_point_*_temp; do
		[ -f "$trip" ] && run cat "$trip"
	done
done

for hwmon in /sys/class/hwmon/hwmon*; do
	[ -d "$hwmon" ] || continue
	printf '\n-- %s --\n' "${hwmon##*/}"
	[ -f "$hwmon/name" ] && run cat "$hwmon/name"
	for input in "$hwmon"/temp*_input "$hwmon"/temp*_label \
		"$hwmon"/temp*_max "$hwmon"/temp*_crit; do
		[ -f "$input" ] && run cat "$input"
	done
done

section "Réseau"
run ip -d -br link
run ip -br addr
run ip route show table all
run bridge link show
run bridge vlan show
run bridge fdb show

section "Bonding"
if [ -d /proc/net/bonding ]; then
	for bond in /proc/net/bonding/*; do
		[ -f "$bond" ] && run cat "$bond"
	done
else
	printf 'Aucun bond actif.\n'
fi

section "Ports et modules SFP"
for netdev in /sys/class/net/lan*; do
	[ -e "$netdev" ] || continue
	name=${netdev##*/}
	run ethtool "$name"
	run ethtool -S "$name"
	run ethtool -m "$name"
done

section "Pilote RTL93xx"
run dmesg
