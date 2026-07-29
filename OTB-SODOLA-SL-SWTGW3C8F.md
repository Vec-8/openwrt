# SODOLA SL-SWTGW3C8F — portage OpenWrt expérimental OTB

## État et avertissement

Cette branche ajoute un profil dédié au **SODOLA SL-SWTGW3C8F** et un mode
de hachage LACP `layer3+4` explicitement activé pour ce profil. Elle est basée
sur OpenWrt `main` au commit `d0110a25edf1854813fcb8f03f38d65679bd6378`
(Linux 6.18).

**Une compilation réussie ne vaut pas validation matérielle.** Aucun flash ne
doit être effectué tant que les éléments suivants ne sont pas obtenus sur le
switch réel : console série fonctionnelle, sauvegarde intégrale des MTD,
environnement U-Boot, configuration réseau/LACP/VLAN exportée et test de
récupération TFTP. Le partitionnement `/proc/mtd` a désormais été confirmé en
lecture seule, mais les autres prérequis de récupération ne le sont pas encore.
Les images constructeur ne sont pas incluses dans ce dépôt.

## Matériel confirmé hors ligne

L'analyse de l'image officielle SODOLA 1.1.1.31 et de son module de profil de
carte donne les caractéristiques suivantes :

- SoC : Realtek RTL9303, MIPS 32 bits big-endian ;
- RAM : 128 MiB ;
- flash SPI NOR : 16 MiB ;
- huit ports SFP+ 10 Gb/s sur les ports ASIC `0, 8, 16, 20, 24, 25, 26, 27` ;
- contrôleur GPIO externe RTL8231 ;
- bouton reset : GPIO interne 5, actif bas ;
- BIX/U-Boot : magic `0x83800000` ;
- partition `runtime` : 12 MiB à partir de `0x300000`.

Le profil fabricant `GS9303-08` / `RTL9303-8XGE` confirme les GPIO SFP :

| SFP | TX_DISABLE | MOD_DEF0 | LOS |
|---:|---:|---:|---:|
| 1 | 0 | 1 | 2 |
| 2 | 3 | 4 | 5 |
| 3 | 6 | 7 | 8 |
| 4 | 9 | 10 | 11 |
| 5 | 12 | 13 | 14 |
| 6 | 21 | 22 | 23 |
| 7 | 24 | 25 | 26 |
| 8 | 27 | 28 | 29 |

Ces valeurs correspondent au DTS OpenWrt du Horaco ZX-SWTGW2C8F, mais le
présent portage conserve un DTS et un identifiant de carte SODOLA distincts.

## Image constructeur auditée

Source officielle :
<https://www.sodola-network.com/products/sodola-8-port-10g-web-managed-switch-8x10g-sfp-ports-link-aggregation-qos-vlan-igmp-wall-mounted-fanless-10gb-multi-gig-network-switch>

- archive officielle : SHA-256
  `ad597bc25473d6b8e5e9b95e0ad290c78900c2c966fc4be176d8df45b110b2ea` ;
- image BIX 1.1.1.31 : SHA-256
  `b2276148edbd2d50a9de096da20197e5989151562621b48cdc25e2f18da42a78` ;
- taille BIX : 8 786 408 octets ;
- CRC d'en-tête U-Boot et CRC de données : valides ;
- noyau constructeur : Linux 3.18.24, SDK Realtek 4.8.5p1.

Le firmware constructeur et ses binaires propriétaires ne doivent pas être
publiés dans ce dépôt.

## Audit en lecture seule du switch réel

L'accès de gestion a été effectué à travers le BPI-R4 Pro, sans changement de
configuration du switch. Les éléments suivants sont confirmés sur le matériel :

- firmware SODOLA `1.1.1.31`, chargeur `1.0.0.2` ;
- carte `RTL9303-8XGE` et noyau constructeur Linux `3.18.24` ;
- sept partitions MTD :

| MTD | Taille | Nom |
|---|---:|---|
| `mtd0` | `0x000e0000` | `LOADER` |
| `mtd1` | `0x00010000` | `BDINFO` |
| `mtd2` | `0x00010000` | `SYSINFO` |
| `mtd3` | `0x00100000` | `CFG` |
| `mtd4` | `0x00100000` | `LOG` |
| `mtd5` | `0x00c00000` | `RUNTIME` |
| `mtd6` | `0x00100000` | `OEMINFO` |

- LAG1 actif à 20 Gb/s avec TE1 et TE2 correctement agrégés ;
- VLAN 5, 6, 10, 20 et 30 taggés sur LAG1, VLAN 1 non taggé ;
- mode constructeur effectivement observé :
  `Load Balancing: src-dst-mac-ip`.

Le mode stock utilise donc les adresses MAC et IP, mais pas les ports TCP/UDP.

### Températures optiques observées

La commande constructeur de télémétrie DOM a confirmé que les températures,
tensions, courants laser et puissances TX/RX sont directement lisibles. Relevé
ponctuel effectué pendant l'audit :

| Port | Lien | Température | TX | RX |
|---|---|---:|---:|---:|
| TE1 | connecté | 66,68 °C | 0,01 dBm | -3,10 dBm |
| TE2 | connecté | 57,22 °C | -0,74 dBm | -5,11 dBm |
| TE3 | connecté | 59,16 °C | -0,98 dBm | -5,21 dBm |
| TE4 | connecté | 58,67 °C | -0,54 dBm | -6,84 dBm |
| TE5 | sans lien | 56,59 °C | -0,13 dBm | -40,00 dBm |
| TE6 | sans lien | **76,78 °C** | 0,25 dBm | -40,00 dBm |
| TE7 | connecté | 69,39 °C | -2,87 dBm | -7,96 dBm |
| TE8 | module absent | indisponible | indisponible | indisponible |

TE6 était l'optique la plus chaude lors de ce relevé. Il s'agit d'une
température interne au transceiver, pas de la température du châssis ni du SoC.
Le module TE6 est un Skylane `SPB23020100D`. Sa fiche constructeur donne une
température de boîtier recommandée de 0 à 70 °C :
<https://portal.skylaneoptics.com/datasheet/SPB2302010xD.pdf>. La télémétrie
interne à 76,78 °C justifie donc au minimum une surveillance et une vérification
physique du module ou du point chaud, même si le firmware SODOLA indique encore
`OK`.

## Cause du plafonnement LACP

Le RTL9303 possède deux masques globaux de distribution partagés entre les
agrégats. Le SDK du firmware constructeur sait inclure les adresses IP et les
ports TCP/UDP dans le hachage, mais le switch réel est actuellement configuré
en MAC+IP (`src-dst-mac-ip`).

Le pilote DSA OpenWrt officiel n'accepte que `layer2` et `layer2+3`. Plusieurs
flux `iperf3` ayant la même paire d'adresses IP restent donc sur le même membre
10 Gb/s, même s'ils utilisent des ports TCP différents. Un flux unique ne peut
jamais dépasser la capacité d'un seul membre ; le but du correctif est de
répartir **plusieurs flux** entre les deux membres.

Cette limitation de hachage n'explique pas, à elle seule, un plafond mesuré
autour de 4 à 5 Gbit/s sur **un membre 10G isolé**. Un tel plafond doit être
diagnostiqué séparément sur le chemin R4 (pilote Ethernet, RSS/IRQ, offloads,
CPU et transceiver). Le LAG ne pourra approcher 20 Gbit/s agrégés que si chaque
membre approche d'abord 10 Gbit/s individuellement.

Références OpenWrt :

- ajout du support de la carte Horaco :
  <https://github.com/openwrt/openwrt/pull/23648> ;
- ajout de l'offload bonding RTL93xx :
  <https://github.com/openwrt/openwrt/pull/21740>.

## Correctif `layer3+4` opt-in

Le DTS SODOLA contient :

```dts
realtek,lag-hash-layer3-4;
```

Quand cette propriété est présente :

- le masque 0 reste réservé au trafic L2 ;
- le masque 1 utilise IP source, IP destination, port L4 source et port L4
  destination ;
- les paquets non-IP d'un agrégat `layer3+4` restent liés au masque L2 ;
- le pilote accepte `layer2` ou `layer3+4`, mais refuse `layer2+3` afin de ne
  pas annoncer un offload différent du masque global réellement programmé ;
- les autres cartes RTL93xx conservent le comportement OpenWrt officiel.

### Risque connu

Linux documente `layer3+4` comme n'étant pas strictement conforme à 802.3ad :
les fragments d'un même flux peuvent être distribués différemment et arriver
dans le désordre. Il faut tester les fragments IPv4/IPv6 et surveiller les
retransmissions avant mise en production.

## LuCI et outils inclus dans l'image OTB

La configuration de référence sélectionne :

- `kmod-bonding` ;
- `luci-ssl` et `luci-mod-network` ;
- `ip-full`, `ip-bridge`, `ethtool-full`, `iperf3`, `tcpdump-mini` ;
- `lldpd` et `luci-app-lldpd` ;
- le thème Argon et sa configuration ;
- la vue OTB unifiée des ports, bonds et VLAN effectifs.

LuCI actuel configure le bonding comme un périphérique réseau natif. Son
éditeur expose notamment `802.3ad`, `layer3+4`, `lacp_rate`, `min_links` et
`ad_select`. Il n'existe plus de paquet `luci-proto-bonding` à ajouter.

L'image OTB ajoute une page LuCI en lecture seule **LACP et températures**,
traduite en français. Elle affiche :

- état du bond, politique de hachage, partenaire, agrégateur et churn ;
- vitesse et état de chaque membre physique ;
- VLAN du bond logique répétés comme VLAN hérités sur ses membres ;
- température interne du SoC RTL9303 et seuil critique du noyau ;
- température DOM de chaque optique, seuils du module, tension, courant laser,
  puissances TX/RX en dBm, constructeur, référence, numéro de série et longueur
  d'onde ;
- actualisation automatique toutes les 15 secondes.

L'affichage devient orange à partir de 70 °C et rouge à partir de 85 °C, sans
modifier les seuils matériels. Les optiques sont interrogées en lecture seule
via `ethtool` et aucune nouvelle politique d'arrêt thermique ne leur est
appliquée. Une optique sans DOM est explicitement signalée.

La vue globale des ports lit `bridge -j vlan show` et `/proc/net/bonding`. Elle
affiche les VLAN taggés, non taggés et PVID réellement programmés. Pour chaque
membre physique d’un LAG, elle remonte explicitement les VLAN hérités du bond
logique sans modifier la configuration réseau.

## Compilation

```sh
./scripts/feeds update -a
./scripts/feeds install -a
cp otb-sodola-sl-swtgw3c8f.config .config
make defconfig
make -j"$(nproc)"
```

Le build doit produire au minimum une image `factory.bix` pour
`realtek/rtl930x/sodola_sl-swtgw3c8f`. Vérifier impérativement :

1. taille totale inférieure ou égale à 12 MiB ;
2. magic BIX `0x83800000` ;
3. CRC U-Boot valides ;
4. modèle/compatible du DTB SODOLA ;
5. présence de `kmod-bonding`, `ethtool-full`, `ip-bridge`, des paquets LuCI
   OTB, d’Argon et de la traduction française dans le manifeste ;
6. absence de secrets et de configuration OTB privée dans l'image.

## Validation prévue sur matériel

Ordre obligatoire :

1. sauvegarde binaire des sept partitions MTD et contrôle SHA-256 hors switch ;
2. export de la configuration constructeur, des VLAN et des groupes LACP ;
3. test de la console et de la récupération U-Boot/TFTP ;
4. démarrage temporaire si le bootloader le permet, sinon flash contrôlé ;
5. validation des huit SFP+, LOS, MOD_DEF0 et TX_DISABLE ;
6. comparaison température SoC et DOM avec le firmware constructeur ;
7. validation VLAN/gestion/LLDP ;
8. validation de la page LuCI LACP et températures ;
9. validation LACP rapide dans les deux sens ;
10. `iperf3` avec 1, 2, 4, 8 et 16 flux, dans les deux sens ;
11. test de panne d'un membre et retour automatique ;
12. test de fragmentation/réordonnancement ;
13. redémarrage final uniquement après validation du rollback.

Aucune image de cette branche ne doit être présentée comme « opérationnelle »
avant la fin de cette validation matérielle.
