#!/bin/sh

# État LACP en lecture seule pour LuCI. Aucune écriture sysfs/UCI.
. /usr/share/libubox/jshn.sh

bond="${1:-bond-trunk}"
case "$bond" in
	bond-[A-Za-z0-9_.-]*) ;;
	*) bond='bond-trunk' ;;
esac

base="/sys/class/net/$bond/bonding"

read_one() {
	[ -r "$1" ] && tr -d '\n' < "$1"
}

bridge_vlans() {
	local section device vlan port normalized first
	first=1
	for section in $(uci -q show network | sed -n 's/^network\.\([^.=]*\)=bridge-vlan$/\1/p'); do
		device="$(uci -q get network."$section".device)"
		vlan="$(uci -q get network."$section".vlan)"
		[ -n "$vlan" ] || continue
		for port in $(uci -q get network."$section".ports); do
			normalized="${port%%:*}"
			[ "$normalized" = "$bond" ] || continue
			[ "$first" = 1 ] || printf ' '
			printf '%s:%s' "$device" "$vlan"
			first=0
		done
	done
}

json_init
json_add_string bond "$bond"

if [ ! -d "$base" ]; then
	json_add_boolean present 0
	json_add_string error "bond absent ou module bonding non chargé"
	json_dump
	exit 0
fi

json_add_boolean present 1
for field in mode lacp_rate xmit_hash_policy miimon min_links mii_status active_slave ad_select ad_aggregator ad_num_ports ad_actor_key ad_partner_key ad_partner_mac; do
	value="$(read_one "$base/$field")"
	[ -n "$value" ] && json_add_string "$field" "$value"
done

json_add_array vlans
for item in $(bridge_vlans); do
	json_add_string '' "$item"
done
json_close_array

json_add_array members
for member in $(read_one "$base/slaves"); do
	member_base="/sys/class/net/$member/bonding_slave"
	json_add_object ''
	json_add_string name "$member"
	for field in mii_status link_failure_count ad_aggregator_id ad_actor_oper_port_state ad_partner_oper_port_state perm_hwaddr; do
		value="$(read_one "$member_base/$field")"
		[ -n "$value" ] && json_add_string "$field" "$value"
	done
	value="$(read_one "/sys/class/net/$member/operstate")"
	[ -n "$value" ] && json_add_string operstate "$value"
	value="$(read_one "/sys/class/net/$member/carrier")"
	[ -n "$value" ] && json_add_int carrier "$value"
	value="$(read_one "/sys/class/net/$member/speed")"
	case "$value" in ''|*[!0-9]*) ;; *) json_add_int speed "$value" ;; esac
	value="$(read_one "/sys/class/net/$member/duplex")"
	[ -n "$value" ] && json_add_string duplex "$value"
	json_close_object
done
json_close_array

json_dump
