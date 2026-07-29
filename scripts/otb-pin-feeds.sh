#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
LOCK="$ROOT/OTB_FEEDS.lock"

[ -r "$LOCK" ] || { echo "Fichier absent: $LOCK" >&2; exit 1; }
cd "$ROOT"
./scripts/feeds update -a

for feed in packages luci routing telephony video; do
    rev="$(sed -n "s/^FEED_${feed}=//p" "$LOCK")"
    [ -n "$rev" ] || { echo "Révision absente pour $feed" >&2; exit 1; }
    git -C "feeds/$feed" fetch origin "$rev"
    git -C "feeds/$feed" checkout --detach "$rev"
done

./scripts/feeds install -a
printf '%s\n' 'Feeds OTB épinglés et installés.'
