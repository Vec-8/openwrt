# Validation au 29 juillet 2026

## Branche publique squashée

- audit de l'ensemble stagé : aucune clé privée, aucun jeton GitHub, aucun identifiant Wi-Fi/opérateur privé, aucun chemin utilisateur et aucune adresse RFC 1918 dans les ajouts OTB ;
- validation syntaxique : 44 scripts shell et 7 fichiers JSON valides ;
- `git diff --check` : réussi hors sources Argon vendoriées, dont les espaces de fin de ligne sont hérités et volontairement non réécrits ;
- `scripts/otb-pin-feeds.sh` : réussi, avec contrôle des cinq révisions épinglées ;
- `make defconfig` : réussi et sélection simultanée des profils `bananapi_bpi-r4` et `bananapi_bpi-r4-pro-8x` confirmée ;
- avertissements non bloquants observés dans les feeds épinglés : dépendance vidéo `libwayland` et récursions Kconfig `freeradius3`/`nftables-nojson` ;
- aucune compilation complète de la branche assainie n'est revendiquée : les validations matérielles ci-dessous concernent le snapshot interne équivalent avant remplacement des valeurs privées.

## R4 Sud — séquence expérimentale 2026072931

- compilation : réussie (`BUILD_RC=0`) ;
- noyau : 6.18.39 ;
- audit du rootfs : 448 paquets, 0 échec ;
- Docker, dockerd, Compose, containerd, runc, veth et ipvlan présents ;
- absence volontaire d'OpenVPN, mwan3, PBR, SQM, UPnP et pile modem ;
- politique stockage/conteneurs présente, sans formatage et sans modification automatique du réseau ;
- `sysupgrade -T` sur la cible : réussi.

## R4 Pro — séquence expérimentale 2026072932

- compilation : réussie (`BUILD_RC=0`) ;
- noyau : 6.18.39 ;
- audit du rootfs : 438 paquets, 0 échec ;
- pilote DSA MxL et PHY Aeonsemi présents ;
- multi-WAN et OpenVPN conservés ;
- Docker absent ;
- PAUSE/flow-control MxL expérimental absent ;
- `sysupgrade -T` du candidat et du rollback : réussi.

## Points communs vérifiés hors ligne

- scripts RSS/RPS installés et activés ;
- HW-LRO désactivé par défaut ;
- profils thermiques communs : ventilation renforcée dès 60 °C, maximum à 68 °C, bridages CPU à 70 °C et 85 °C ;
- LuCI, français, Argon et outils OTB présents ;
- aucune configuration réseau ou Wi-Fi d'exploitation embarquée dans le rootfs.

## Limites de cette publication

La branche publique est un snapshot squashé dont les valeurs privées ont été remplacées par des exemples. Ses futurs binaires auront donc des empreintes différentes des candidats internes audités. Une reconstruction et un nouvel audit complet sont obligatoires avant tout flash.

Un test `sysupgrade -T` confirme la compatibilité de format, pas le bon fonctionnement du Wi-Fi, des VLAN, du LACP, du SFP+, du multi-WAN ou des conteneurs après redémarrage.
