#!/bin/sh
# Preserve OpenWrt generic steering for Wi-Fi and non-MT7988 devices.
GENERIC=/usr/libexec/network/packet-steering.uc
[ -x "$GENERIC" ] && "$GENERIC" "$@"

board="$(cat /tmp/sysinfo/board_name 2>/dev/null)"
case "$board" in
	bananapi,bpi-r4|bananapi,bpi-r4-pro-8x) ;;
	*) exit 0 ;;
esac
[ "$(grep -c '^processor[[:space:]]*:' /proc/cpuinfo 2>/dev/null)" -ge 4 ] || exit 0

# Some kernels expose detailed labels, while the OTB 6.18.39 images of both
# R4 boards only expose 15100000.ethernet. Stable GIC numbers are therefore the
# guarded fallback on both supported boards.
set_irq_cpu() {
	label="$1"
	gic="$2"
	cpu="$3"
	irq="$(awk -v label="$label" \
		'index($0, "15100000.ethernet") && index($0, label) { gsub(":", "", $1); print $1; exit }' \
		/proc/interrupts)"
	if [ -z "$irq" ] && [ -n "$gic" ]; then
		irq="$(awk -v gic="$gic" \
			'index($0, "15100000.ethernet") && index($0, "GICv3 " gic " Level") { gsub(":", "", $1); print $1; exit }' \
			/proc/interrupts)"
	fi
	[ -n "$irq" ] && [ -w "/proc/irq/$irq/smp_affinity_list" ] || return 1
	printf '%s\n' "$cpu" > "/proc/irq/$irq/smp_affinity_list"
}

set_irq_cpu 'ethernet TX' 229 0
set_irq_cpu 'PDMA RX 0' 221 0
set_irq_cpu 'RSS RX 1' 222 1
set_irq_cpu 'RSS RX 2' 223 2
set_irq_cpu 'RSS RX 3' 224 3

# The OTB A/B test on 2026-07-29 confirms that RPS on all four CPUs
# complements hardware RSS: 7.05/6.95 Gbit/s and 98.7 percent symmetry. Keep
# RFS disabled because its trial made LACP flow selection unstable.
for q in /sys/devices/platform/soc/15100000.ethernet/net/*/queues/rx-*/rps_cpus; do
	[ -w "$q" ] && echo f > "$q"
done
for q in /sys/devices/platform/soc/15100000.ethernet/net/*/queues/rx-*/rps_flow_cnt; do
	[ -w "$q" ] && echo 0 > "$q"
done
[ -w /proc/sys/net/core/rps_sock_flow_entries ] &&
	echo 0 > /proc/sys/net/core/rps_sock_flow_entries

# IRQ affinity selects the queue CPU. Keep the identically named threaded-NAPI
# workers runnable on all four cores.
for status in /proc/[0-9]*/status; do
	[ -r "$status" ] || continue
	name="$(sed -n 's/^Name:[[:space:]]*//p' "$status")"
	case "$name" in
		napi/mtk_eth-*)
			pid="${status#/proc/}"
			pid="${pid%/status}"
			taskset -p -c 0-3 "$pid" >/dev/null 2>&1
			;;
	esac
done
exit 0
