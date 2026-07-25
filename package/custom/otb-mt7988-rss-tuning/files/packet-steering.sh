#!/bin/sh
# Keep OpenWrt generic steering for Wi-Fi and all non-MT7988 devices.
GENERIC=/usr/libexec/network/packet-steering.uc
[ -x "$GENERIC" ] && "$GENERIC" "$@"

board="$(cat /tmp/sysinfo/board_name 2>/dev/null)"
case "$board" in
	bananapi,bpi-r4|bananapi,bpi-r4-pro-8x) ;;
	*) exit 0 ;;
esac

cpu_count="$(grep -c "^processor[[:space:]]*:" /proc/cpuinfo 2>/dev/null)"
[ "${cpu_count:-0}" -ge 4 ] || exit 0

set_irq_cpu() {
	label="$1"
	cpu="$2"
	irq="$(awk -v label="$label" \
		'index($0, "15100000.ethernet") && index($0, label) { gsub(":", "", $1); print $1; exit }' \
		/proc/interrupts)"
	[ -n "$irq" ] || return 1
	[ -w "/proc/irq/$irq/smp_affinity_list" ] || return 1
	printf "%s\n" "$cpu" > "/proc/irq/$irq/smp_affinity_list"
}

# MT7988 RSS hardware rings: RX0..RX3 on CPU0..CPU3; QDMA TX on CPU0.
set_irq_cpu "ethernet TX" 0
set_irq_cpu "PDMA RX 0" 0
set_irq_cpu "RSS RX 1" 1
set_irq_cpu "RSS RX 2" 2
set_irq_cpu "RSS RX 3" 3

# RPS duplicates hardware RSS and was observed to collapse all rings onto one CPU.
for q in /sys/devices/platform/soc/15100000.ethernet/net/*/queues/rx-*/rps_cpus; do
	[ -w "$q" ] && printf "0\n" > "$q"
done
for q in /sys/devices/platform/soc/15100000.ethernet/net/*/queues/rx-*/rps_flow_cnt; do
	[ -w "$q" ] && printf "0\n" > "$q"
done

# All MTK threaded-NAPI workers currently have the same kernel name. Leave them
# runnable on all four cores; IRQ affinity selects the correct core per RSS ring.
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
