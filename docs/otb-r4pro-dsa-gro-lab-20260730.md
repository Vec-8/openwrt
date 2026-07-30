# R4 Pro — image laboratoire DSA/GRO, interdite de flash

Cette branche contient un prototype compilable destiné à tester la localisation
mesurée sur le RX SFP1/LAN du R4 Pro (`mxl_lan5` via le conduit DSA `eth2`).

## Sécurité

- build ID préfixé `LAB-NOFLASH` ;
- aucun script de déploiement ;
- aucun changement de configuration réseau, Wi-Fi, VLAN ou LACP ;
- le nouveau chemin est **désactivé par défaut** ;
- cette branche ne doit pas être flashée avant audit du binaire, sauvegarde,
  `sysupgrade -T`, console de secours et accord explicite.

## Hypothèse testée

Le chemin normal reçoit d'abord chaque trame du conduit avec le protocole
`ETH_P_XDSA`. Faute de gestionnaire GRO pour ce protocole, le premier passage
NAPI est vidé paquet par paquet. DSA détague ensuite la trame et la réinjecte
dans `gro_cells`, ce qui impose un second passage NAPI.

Le patch ajoute un gestionnaire GRO expérimental strictement limité au tagger
`DSA_TAG_PROTO_MXL862_8021Q`. Lorsqu'il est activé, il démodule le port DSA
avant l'agrégation du conduit et appelle directement le gestionnaire GRO du
protocole intérieur sur le périphérique utilisateur.

## Activation prévue pour un futur essai contrôlé

Le prototype est piloté par :

```text
/sys/module/dsa_core/parameters/mxl862_8021q_gro_demux
```

Valeur par défaut : `N`.

L'essai matériel futur devra comparer A/B, vérifier les VLAN 5/6/10/20/30,
checksums, TCP/UDP/IPv4/IPv6, bridge, bond, compteurs, captures et rollback. Une
compilation réussie ne prouve ni la sécurité ni le gain de débit.

## Résultat de compilation

Compilation effectuée dans la VM OTB le 30 juillet 2026, sans contact avec les
routeurs et sans flash :

- `make -j4 world V=s` : retour 0 ;
- image R4 Pro produite : 33 030 462 octets ;
- SHA-256 :
  `824be2604e972f58fa07e2376028924bc6a0d7f90fd37f1bf2d3c9f018d234bf` ;
- FIT : noyau ARM64 Linux 6.18.39 et rootfs BPI-R4 Pro 8X validés ;
- `CONFIG_NET_DSA=y` : DSA est intégré au noyau, pas dans `dsa_core.ko` ;
- symbole du paramètre retrouvé dans `vmlinux` ;
- variable booléenne dans la BSS, donc valeur initiale `N` ;
- build ID rootfs préfixé `LAB-NOFLASH` ;
- alias LuCI vérifiés dans le rootfs : SFP1/LAN et SFP2/WAN ;
- `luci-app-otb-ports` et `luci-app-otb-telemetry` présents ;
- aucune autorisation de flash attachée à cet artefact.

Le premier script d'audit cherchait à tort `dsa_core.ko`. La compilation avait
réussi, mais DSA est construit en dur (`CONFIG_NET_DSA=y`). L'audit a été
corrigé pour inspecter `vmlinux`; les preuves sont publiées dans
`docs/data/otb-r4pro-dsa-gro-lab-20260730/`.

Cette réussite prouve seulement que le prototype compile et se trouve dans
l'image. Elle ne prouve pas encore qu'il dépasse 9 Gbit/s ni qu'il respecte
tous les protocoles. Un futur essai A/B contrôlé est obligatoire.

## Critère de recette demandé

Le prototype ne pourra être retenu que si chacun des deux liens SFP+ isolés
dépasse **9,0 Gbit/s TCP utile dans les deux sens**, puis si le LACP complet
utilise simultanément ses deux membres avec un objectif agrégé supérieur à
18 Gbit/s, sans régression VLAN, Wi-Fi/MLO, WAN, checksums ou stabilité.
