# OTB V5 — matrice croisée SFP+ R4 Pro ↔ R4 Sud

Date de recette corrigée : 30 juillet 2026, 19:41–19:44 Europe/Paris
Noyau testé : Linux 6.18.39
État final : production restaurée, aucun réglage réseau expérimental conservé

## Correction impérative de nomenclature

Le premier rapport inversait les cages du R4 Sud. Il est remplacé par cette
recette fraîche, refaite intégralement avec la convention physique confirmée :

| Équipement | Cage physique | Rôle sérigraphié | Nom noyau | Chemin matériel |
|---|---:|---|---|---|
| R4 Pro | SFP1 | LAN | `mxl_lan5` | MaxLinear MxL86252, DSA, conduit `eth2` |
| R4 Pro | SFP2 | WAN | `eth1` | SoC direct |
| R4 Sud | SFP1 | LAN | `sfp-lan` | SoC direct, XFI1 |
| R4 Sud | SFP2 | WAN | `sfp-wan` | SoC direct, XFI0 |

Dans le LACP, les deux membres transportent le même trunk et ne sont plus
fonctionnellement « LAN » ou « WAN ». LuCI affiche donc les alias neutres
**SFP1** et **SFP2**, tout en conservant le nom noyau et le chemin matériel dans
le détail. Aucun nom d'interface UCI ou noyau n'a été changé.

## Méthode de la matrice 2 × 2

Pour chaque case :

1. les deux membres LACP étaient d'abord remontés ;
2. un seul membre était gardé actif sur chaque BPI ;
3. le bond devait annoncer exactement un port actif et le bon esclave ;
4. un ping de contrôle devait réussir ;
5. `iperf3` exécutait 16 flux TCP pendant 10 secondes, dans les deux sens ;
6. les compteurs interface, `softnet`, erreurs, drops et températures étaient
   capturés avant et après ;
7. un watchdog distant devait rétablir les quatre membres en cas d'interruption.

Cette méthode teste bien les quatre chemins physiques à travers le switch cœur,
sans dépendre du choix de hash du LACP.

## Résultats frais, avec les bons numéros

| Port actif Pro | Port actif Sud | Sud → Pro | Pro → Sud |
|---|---|---:|---:|
| SFP1/LAN — `mxl_lan5` | SFP1/LAN — `sfp-lan` | **6,132 Gbit/s** | **7,860 Gbit/s** |
| SFP1/LAN — `mxl_lan5` | SFP2/WAN — `sfp-wan` | **6,144 Gbit/s** | **7,824 Gbit/s** |
| SFP2/WAN — `eth1` | SFP1/LAN — `sfp-lan` | **8,002 Gbit/s** | **7,372 Gbit/s** |
| SFP2/WAN — `eth1` | SFP2/WAN — `sfp-wan` | **8,235 Gbit/s** | **7,782 Gbit/s** |

### Ce que démontre la matrice

- Le plafond principal apparaît lorsque le **R4 Pro reçoit par SFP1/LAN** :
  6,132 et 6,144 Gbit/s, soit seulement 0,012 Gbit/s d'écart quand on change
  la cage active du Sud.
- Quand le Pro reçoit par son **SFP2/WAN direct**, il atteint 8,002 à
  8,235 Gbit/s.
- À cage du Sud constante, remplacer le RX SFP1 du Pro par son RX SFP2 procure
  environ **+30 % à +34 %**.
- Le défaut ne suit donc ni les deux ports portant le mot « LAN », ni un module
  optique du Sud. Il suit le **chemin de réception MxL/DSA du SFP1 du Pro**.
- En émission depuis le Pro, SFP1 atteint 7,824–7,860 Gbit/s : il ne s'agit pas
  d'un défaut optique symétrique du SFP1.

La valeur 7,372 Gbit/s en Pro → Sud sur SFP2→SFP1 est plus variable que les
autres mesures d'émission. Elle ne remet pas en cause la localisation RX du
Pro, démontrée par les deux mesures indépendantes Sud → Pro.

## Compteurs qui localisent le goulot

Pendant environ dix secondes de réception sur le Pro :

| RX du Pro | Port Sud | Éléments `softnet` traités | Drops `softnet` | `time_squeeze` |
|---|---|---:|---:|---:|
| SFP1/LAN MxL/DSA | SFP1/LAN | 6 767 172 | 2 284 | 12 100 |
| SFP1/LAN MxL/DSA | SFP2/WAN | 6 841 975 | 4 042 | 12 902 |
| SFP2/WAN direct | SFP1/LAN | 854 228 | 0 | 1 318 |
| SFP2/WAN direct | SFP2/WAN | 848 824 | 0 | 1 396 |

Le RX MxL/DSA demande donc environ huit fois plus de travail `softnet` que le
RX direct. Aucune erreur RX/TX physique n'a augmenté sur les quatre interfaces.

## Origine technique la plus probable

La localisation est démontrée ; le correctif exact dans le noyau ne l'est pas
encore.

Le SFP1 du Pro n'est pas relié directement au GMAC comme son SFP2. Les trames
arrivent par le conduit `eth2`, sont reconnues comme DSA (`ETH_P_XDSA`), passent
par le détagage/sélection du port utilisateur MaxLinear, puis sont remises dans
une cellule GRO et un second cycle NAPI. Cette double étape explique
l'augmentation massive du coût par paquet et l'épuisement du budget `softnet`.

Les sources Linux 6.18 montrent précisément :

- `eth_type_trans()` force `ETH_P_XDSA` sur un conduit DSA ;
- `dsa_switch_rcv()` détague, réassigne le périphérique puis appelle
  `gro_cells_receive()` ;
- `gro_cells` met les paquets en file et les reprend dans un autre poll NAPI via
  `napi_gro_receive()`.

Cela désigne un problème d'efficacité du chemin RX **MediaTek conduit + tagger
MaxLinear + DSA/GRO**, et non une limitation à 10 Gb/s du laser ou de la fibre.
Le problème OpenWrt #18004 confirme par ailleurs une régression/performance SFP+
10G sur BPI-R4, mais ne constitue pas à lui seul le correctif de ce chemin Pro
particulier.

## Réglages déjà essayés, non conservés

- RPS activé/désactivé ;
- `gro_normal_batch` de 8 à 128 ;
- `net.core.netdev_budget` de 300 à 1200 ;
- LACP complet avec plusieurs répartitions de flux.

Certains réglages améliorent une mesure isolée mais aucun n'a fourni un gain
symétrique et reproductible sur le LACP complet. La production reste donc à :

- `net.core.netdev_budget=300` ;
- `net.core.gro_normal_batch=8` ;
- RPS `f` sur les quatre files RX de `eth1` et `eth2`.

## Refroidissement du R4 Sud

Le perçage de la coque a un effet net en situation réelle :

- avant amélioration du boîtier : environ **77,9 °C** observés ;
- après perçage et pendant les séries 10G : environ **58–60 °C** ;
- contrôle après restauration : **58,5 °C**.

Ce n'est pas un essai climatique normalisé, mais une baisse observée proche de
19 °C est trop importante pour être attribuée au seul bruit de mesure.

Les modules restent thermiquement dissymétriques :

- SFP1/LAN (`sfp-lan`) : **63,6 °C**, RX −7,64 dBm ;
- SFP2/WAN (`sfp-wan`) : **51,5 °C**, RX −6,24 dBm ;
- aucune alarme ou alerte DDM active.

Le balayage d'air autour du SFP1/LAN reste donc à améliorer même si le SoC est
maintenant sous 70 °C.

## État final vérifié

- deux membres 10G actifs dans chaque LACP ;
- même agrégateur pour les deux membres de chaque BPI ;
- `Actor Churn State: none` et `Partner Churn State: none` après stabilisation ;
- Wi-Fi actif sur les deux BPI, trois groupes MLO présents ;
- Internet et DNS fonctionnels sur les deux BPI ;
- aucun processus `iperf3` résiduel ;
- paramètres runtime de production restaurés ;
- LuCI/RPC corrigé et vérifié en direct :
  - Pro : `mxl_lan5` = SFP1, `eth1` = SFP2 ;
  - Sud : `sfp-lan` = SFP1, `sfp-wan` = SFP2.

## Suite technique raisonnable

Le prochain correctif doit être une image **R4 Pro de laboratoire**, avec
instrumentation du conduit `eth2` et du tagger MxL, afin de réduire ou éviter le
premier passage individuel `ETH_P_XDSA` avant agrégation GRO. Il ne faut pas
injecter un patch spéculatif dans l'image de production : la matrice montre le
chemin fautif, mais pas encore une modification noyau validée avec rollback.

## Artefacts reproductibles

Les fichiers publiés dans `docs/data/otb-r4-sfp-cross-tests-20260730/` sont :

- `physical-map.txt` ;
- `throughput-summary.tsv` ;
- `matrix-analysis.json` ;
- `test-cross-matrix-correct-labels.sh` ;
- contrôles finaux de production et de stabilisation LACP.

Références principales :

- Linux 6.18, DSA `tag.c` :
  <https://github.com/torvalds/linux/blob/v6.18/net/dsa/tag.c>
- Linux 6.18, `eth_type_trans()` :
  <https://github.com/torvalds/linux/blob/v6.18/net/ethernet/eth.c>
- Linux 6.18, `gro_cells` :
  <https://github.com/torvalds/linux/blob/v6.18/net/core/gro_cells.c>
- OpenWrt #18004, débit SFP+ 10G BPI-R4 :
  <https://github.com/openwrt/openwrt/issues/18004>
