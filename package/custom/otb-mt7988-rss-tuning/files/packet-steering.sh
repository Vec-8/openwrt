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

# The upstream 6.18 Pesa port exposes detailed labels on the Pro but only the
# common 15100000.ethernet label on the standard R4. The latter therefore uses
# its stable GIC SPI numbers as a guarded fallback.
set_irq_cpu() {
	label="$1"
	gic="$2"
	cpu="$3"
	irq="$(awk -v label="$label" \
		'index($0, "15100000.ethernet") && index($0, label) { gsub(":", "", $1); print $1; exit }' \
		/proc/interrupts)"
	if [ -z "$irq" ] && [ "$board" = "bananapi,bpi-r4" ] && [ -n "$gic" ]; then
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

# RPS duplicates hardware RSS and can collapse all receive queues onto one CPU.
for q in /sys/devices/platform/soc/15100000.ethernet/net/*/queues/rx-*/rps_cpus \
         /sys/devices/platform/soc/15100000.ethernet/net/*/queues/rx-*/rps_flow_cnt; do
	[ -w "$q" ] && printf '0\n' > "$q"
done

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
