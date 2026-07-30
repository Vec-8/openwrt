#!/bin/bash
set -Eeuo pipefail

ROOT='/Users/vec/Documents/New project/otb-throughput-investigation/results/20260730-174123-sfp1-sfp2-rootcause-readonly'
OUT="$ROOT/matrix-correct-sfp1-lan-sfp2-wan-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

PRO=(ssh -p 2222 -o BatchMode=yes -o ConnectTimeout=8 \
  -o ServerAliveInterval=3 -o ServerAliveCountMax=3 root@192.168.1.102)
SUD=(ssh -o BatchMode=yes -o ConnectTimeout=8 \
  -o ServerAliveInterval=3 -o ServerAliveCountMax=3 \
  -o 'ProxyCommand=ssh -p 2222 -o BatchMode=yes -o ConnectTimeout=8 root@192.168.1.102 -W %h:%p' \
  root@10.0.10.1)

log() {
  printf '[%s] %s\n' "$(date -Iseconds)" "$*" | tee -a "$OUT/progress.log"
}

remote_restore_pro='ip link set mxl_lan5 up 2>/dev/null; ip link set eth1 up 2>/dev/null; killall iperf3 2>/dev/null; true'
remote_restore_sud='ip link set sfp-lan up 2>/dev/null; ip link set sfp-wan up 2>/dev/null; killall iperf3 2>/dev/null; true'

restore() {
  set +e
  log 'Restauration des quatre membres LACP'
  "${PRO[@]}" "$remote_restore_pro; [ -f /tmp/otb-cross-watchdog.pid ] && kill \$(cat /tmp/otb-cross-watchdog.pid) 2>/dev/null; rm -f /tmp/otb-cross-watchdog.pid" >/dev/null 2>&1
  "${SUD[@]}" "$remote_restore_sud; [ -f /tmp/otb-cross-watchdog.pid ] && kill \$(cat /tmp/otb-cross-watchdog.pid) 2>/dev/null; rm -f /tmp/otb-cross-watchdog.pid" >/dev/null 2>&1
}
trap restore EXIT INT TERM HUP

capture() {
  local side="$1" file="$2"
  local -a C
  if [[ "$side" == PRO ]]; then C=("${PRO[@]}"); else C=("${SUD[@]}"); fi
  "${C[@]}" '
    date -Iseconds 2>/dev/null || date
    echo "=== BOARD ==="
    ubus -S call system board 2>/dev/null || true
    echo "=== BOND ==="
    grep -E "Bonding Mode|MII Status|Number of ports|Slave Interface|Speed:|Aggregator ID|Churn State" /proc/net/bonding/bond-trunk
    echo "=== LINKS ==="
    ip -br link
    echo "=== COUNTERS ==="
    for d in mxl_lan5 eth1 eth2 sfp-lan sfp-wan bond-trunk; do
      [ -d /sys/class/net/$d ] || continue
      printf "%s rx=%s tx=%s rxp=%s txp=%s rxd=%s txd=%s rxe=%s txe=%s\n" "$d" \
        "$(cat /sys/class/net/$d/statistics/rx_bytes)" \
        "$(cat /sys/class/net/$d/statistics/tx_bytes)" \
        "$(cat /sys/class/net/$d/statistics/rx_packets)" \
        "$(cat /sys/class/net/$d/statistics/tx_packets)" \
        "$(cat /sys/class/net/$d/statistics/rx_dropped)" \
        "$(cat /sys/class/net/$d/statistics/tx_dropped)" \
        "$(cat /sys/class/net/$d/statistics/rx_errors)" \
        "$(cat /sys/class/net/$d/statistics/tx_errors)"
      ethtool -S "$d" 2>/dev/null | grep -Ei "crc|fcs|drop|error" | sed "s/^/  $d /" || true
    done
    echo "=== SOFTNET ==="
    cat /proc/net/softnet_stat
    echo "=== TEMP ==="
    for z in /sys/class/thermal/thermal_zone*/temp; do [ -r "$z" ] && echo "$z=$(cat "$z")"; done
  ' > "$file"
}

wait_one_member() {
  local side="$1" wanted="$2" file="$3"
  local -a C
  if [[ "$side" == PRO ]]; then C=("${PRO[@]}"); else C=("${SUD[@]}"); fi
  local ok=0
  for _ in {1..20}; do
    "${C[@]}" 'cat /proc/net/bonding/bond-trunk' > "$file"
    if grep -q 'Number of ports: 1' "$file" && \
       grep -A8 "Slave Interface: $wanted" "$file" | grep -q 'MII Status: up'; then
      ok=1
      break
    fi
    sleep 1
  done
  [[ "$ok" == 1 ]]
}

arm_watchdogs() {
  "${PRO[@]}" "sh -c 'sleep 480; $remote_restore_pro' </dev/null >/tmp/otb-cross-watchdog.log 2>&1 & echo \$! >/tmp/otb-cross-watchdog.pid"
  "${SUD[@]}" "sh -c 'sleep 480; $remote_restore_sud' </dev/null >/tmp/otb-cross-watchdog.log 2>&1 & echo \$! >/tmp/otb-cross-watchdog.pid"
}

isolate_case() {
  local pro_up="$1" pro_down="$2" sud_up="$3" sud_down="$4" case_name="$5"
  log "$case_name : Pro $pro_up actif / $pro_down coupé ; Sud $sud_up actif / $sud_down coupé"

  # On rétablit toujours les deux membres avant de sélectionner le suivant.
  "${PRO[@]}" "$remote_restore_pro"
  "${SUD[@]}" "$remote_restore_sud"
  sleep 4

  # Le chemin désiré est explicitement monté avant la coupure de l'autre membre.
  "${PRO[@]}" "ip link set $pro_up up; ip link set $pro_down down"
  sleep 2
  "${SUD[@]}" "ip link set $sud_up up; ip link set $sud_down down"

  wait_one_member PRO "$pro_up" "$OUT/$case_name-isolated-pro-bond.txt"
  wait_one_member SUD "$sud_up" "$OUT/$case_name-isolated-sud-bond.txt"
  "${PRO[@]}" 'ping -c 2 -W 2 10.0.10.1' > "$OUT/$case_name-connectivity.txt"
}

run_iperf() {
  local case_name="$1" direction="$2" port="$3"
  local prefix="$case_name-$direction"
  local -a SERVER CLIENT
  local target

  capture PRO "$OUT/$prefix-before-pro.txt"
  capture SUD "$OUT/$prefix-before-sud.txt"

  if [[ "$direction" == 'SUD-vers-PRO' ]]; then
    SERVER=("${PRO[@]}")
    CLIENT=("${SUD[@]}")
    target='10.0.10.254'
  else
    SERVER=("${SUD[@]}")
    CLIENT=("${PRO[@]}")
    target='10.0.10.1'
  fi

  "${SERVER[@]}" "rm -f /tmp/$prefix-server.json /tmp/$prefix-server.err; iperf3 -s -1 -p $port -J </dev/null >/tmp/$prefix-server.json 2>/tmp/$prefix-server.err &" >/dev/null
  sleep 1
  "${CLIENT[@]}" "iperf3 -c $target -p $port -P 16 -t 10 -O 1 -J" > "$OUT/$prefix-client.json"
  sleep 1

  capture PRO "$OUT/$prefix-after-pro.txt"
  capture SUD "$OUT/$prefix-after-sud.txt"

  python3 - "$case_name" "$direction" "$OUT/$prefix-client.json" >> "$OUT/throughput-summary.tsv" <<'PY'
import json, sys
case_name, direction, path = sys.argv[1:]
with open(path) as f:
    j = json.load(f)
r = j['end']['sum_received']
s = j['end']['sum_sent']
print(f"{case_name}\t{direction}\t{r['bits_per_second']/1e9:.6f}\t{s['bits_per_second']/1e9:.6f}\t{s.get('retransmits', 0)}\t{r['seconds']:.6f}")
PY
}

log 'Préflight : table physique imposée SFP1=LAN, SFP2=WAN'
printf '%s\n' \
  'R4 Pro: SFP1/LAN=mxl_lan5 ; SFP2/WAN=eth1' \
  'R4 Sud: SFP1/LAN=sfp-lan ; SFP2/WAN=sfp-wan' > "$OUT/physical-map.txt"

capture PRO "$OUT/preflight-pro.txt"
capture SUD "$OUT/preflight-sud.txt"
grep -q 'Number of ports: 2' "$OUT/preflight-pro.txt"
grep -q 'Number of ports: 2' "$OUT/preflight-sud.txt"
arm_watchdogs

printf 'cas\tdirection\trecu_Gbit_s\temis_Gbit_s\tretransmissions\tduree_s\n' > "$OUT/throughput-summary.tsv"

# SFP1=LAN et SFP2=WAN sur les deux équipements.
CASES=(
  'SFP1-LAN__SFP1-LAN|mxl_lan5|eth1|sfp-lan|sfp-wan'
  'SFP1-LAN__SFP2-WAN|mxl_lan5|eth1|sfp-wan|sfp-lan'
  'SFP2-WAN__SFP1-LAN|eth1|mxl_lan5|sfp-lan|sfp-wan'
  'SFP2-WAN__SFP2-WAN|eth1|mxl_lan5|sfp-wan|sfp-lan'
)

port=57400
for entry in "${CASES[@]}"; do
  IFS='|' read -r case_name pro_up pro_down sud_up sud_down <<< "$entry"
  isolate_case "$pro_up" "$pro_down" "$sud_up" "$sud_down" "$case_name"
  run_iperf "$case_name" 'SUD-vers-PRO' "$port"
  port=$((port + 1))
  run_iperf "$case_name" 'PRO-vers-SUD' "$port"
  port=$((port + 1))
done

restore
trap - EXIT INT TERM HUP
sleep 12
capture PRO "$OUT/final-pro.txt"
capture SUD "$OUT/final-sud.txt"
grep -q 'Number of ports: 2' "$OUT/final-pro.txt"
grep -q 'Number of ports: 2' "$OUT/final-sud.txt"
! grep -qE 'Churn State: (churned|monitoring)' "$OUT/final-pro.txt"
! grep -qE 'Churn State: (churned|monitoring)' "$OUT/final-sud.txt"

python3 - "$OUT" > "$OUT/matrix-analysis.json" <<'PY'
import csv, json, pathlib, re, sys
root = pathlib.Path(sys.argv[1])
rows = list(csv.DictReader((root/'throughput-summary.tsv').open(), delimiter='\t'))
for row in rows:
    for k in ('recu_Gbit_s', 'emis_Gbit_s', 'duree_s'):
        row[k] = float(row[k])
    row['retransmissions'] = int(row['retransmissions'])

counter_re = re.compile(r'^(\S+) rx=(\d+) tx=(\d+) rxp=(\d+) txp=(\d+) rxd=(\d+) txd=(\d+) rxe=(\d+) txe=(\d+)$')
def counters(p):
    out = {}
    for line in p.read_text().splitlines():
        m = counter_re.match(line)
        if m:
            out[m.group(1)] = dict(zip(('rx','tx','rxp','txp','rxd','txd','rxe','txe'), map(int, m.groups()[1:])))
    return out

deltas = {}
for row in rows:
    prefix = f"{row['cas']}-{row['direction']}"
    deltas[prefix] = {}
    for side in ('pro','sud'):
        before = counters(root/f'{prefix}-before-{side}.txt')
        after = counters(root/f'{prefix}-after-{side}.txt')
        deltas[prefix][side] = {
            dev: {k: after[dev][k] - vals[k] for k in vals}
            for dev, vals in before.items() if dev in after
        }

print(json.dumps({
    'nomenclature': {
        'R4 Pro': {'SFP1/LAN': 'mxl_lan5', 'SFP2/WAN': 'eth1'},
        'R4 Sud': {'SFP1/LAN': 'sfp-lan', 'SFP2/WAN': 'sfp-wan'},
    },
    'throughput': rows,
    'counter_deltas': deltas,
}, indent=2))
PY

log 'Matrice correcte terminée ; les quatre membres LACP sont restaurés'
printf 'RESULT_DIR=%s\n' "$OUT"
cat "$OUT/throughput-summary.tsv"
