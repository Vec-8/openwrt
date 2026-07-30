# OTB V5 — matrice croisée SFP+ R4 Pro ↔ R4 Sud

Date de recette : 30 juillet 2026
Noyau testé : Linux 6.18.39
État final : production restaurée, aucun réglage réseau expérimental conservé

## Conclusion courte

Le défaut ne suit pas les anciens libellés `LAN`/`WAN` et ne concerne pas les
deux cages du R4 Sud. Il suit la réception du port **SFP1 du R4 Pro**, qui
traverse le switch MaxLinear MxL86252 et le chemin Linux DSA avant d'atteindre
le GMAC `eth2`.

Les deux cages du R4 Sud donnent des résultats équivalents quand le chemin du
R4 Pro est maintenu constant. Les fibres et modules ne présentent aucune erreur
FCS/CRC permettant d'expliquer l'écart.

## Nomenclature retenue dans LuCI

Les noms noyau restent inchangés afin de ne casser ni UCI, ni le bond, ni les
scripts. LuCI présente désormais des alias physiques neutres :

| Équipement | Alias LuCI | Nom noyau | Chemin matériel |
|---|---:|---|---|
| R4 Pro | SFP1 | `mxl_lan5` | MxL86252, DSA, CPU-port 9, `eth2` |
| R4 Pro | SFP2 | `eth1` | GMAC/PCS SoC direct |
| R4 Sud | SFP1 | `sfp-wan` | GMAC2, XFI0 |
| R4 Sud | SFP2 | `sfp-lan` | GMAC1, XFI1 |

Les anciens mots `LAN` et `WAN` ne décrivent donc ni le même numéro de cage, ni
le même chemin matériel sur les deux cartes.

## Matrice croisée 2 × 2

Un seul membre LACP était actif sur chaque équipement pendant chaque mesure.
Les quatre membres ont été restaurés à la fin. Mesures TCP iperf3, huit flux,
huit secondes :

| Port Pro | Port Sud | Sud → Pro | Pro → Sud |
|---|---|---:|---:|
| SFP1 / MxL | SFP1 / SoC | 5,857 Gbit/s | 7,914 Gbit/s |
| SFP1 / MxL | SFP2 / SoC | 6,261 Gbit/s | 7,961 Gbit/s |
| SFP2 / SoC direct | SFP1 / SoC | 8,244 Gbit/s | 7,706 Gbit/s |
| SFP2 / SoC direct | SFP2 / SoC | 8,270 Gbit/s | 7,706 Gbit/s |

Quand le Pro reçoit sur son SFP2 direct, remplacer SFP1 par SFP2 côté Sud ne
change le résultat que de 0,026 Gbit/s. Le défaut suit donc le **RX MxL/DSA du
Pro**, pas une cage du Sud.

## Cause technique isolée

Sur le GMAC direct, le pilote MediaTek appelle `napi_gro_receive()` sur le vrai
protocole réseau. Le GRO peut agréger les trames avant leur premier passage dans
la pile.

Sur le conduit DSA `eth2`, `eth_type_trans()` force d'abord le protocole
`ETH_P_XDSA`. Chaque trame traverse alors une première fois la pile jusqu'au
tagger MxL 802.1Q. DSA retire ensuite le tag, sélectionne `mxl_lan5`, puis
réinjecte la trame dans `gro_cells_receive()`.

Pendant une réception de huit secondes :

- SFP1 MxL/DSA : environ 4,7 à 5,1 millions d'éléments `softnet` ;
- SFP2 direct : environ 0,6 million ;
- aucune erreur FCS/CRC sur les quatre liens.

Le coût dominant est donc le traitement par paquet du premier passage
`ETH_P_XDSA`, avant le second GRO. C'est une limite du chemin logiciel
MxL86252/DSA dans cette topologie, et non une limite optique.

## Essais de réglages non persistés

### RPS

Réception isolée sur le SFP1/MxL du Pro :

| Réglage | Débit | Drops softnet |
|---|---:|---:|
| RPS `f` | 6,094 Gbit/s | 6 268 |
| RPS `0` | 6,413 Gbit/s | 0 |

Le SFP direct est passé de 8,227 à 8,528 Gbit/s dans le même essai. Malgré ce
gain isolé, les recettes sur le LACP complet ont été variables à cause du hash
des flux et n'ont pas démontré un gain symétrique reproductible. Le réglage de
production n'a donc pas été changé.

### `gro_normal_batch`

Avec RPS désactivé sur le conduit MxL :

| Valeur | Débit moyen |
|---:|---:|
| 8 | 6,351 Gbit/s |
| 32 | 6,233 Gbit/s |
| 64 | 6,042 Gbit/s |
| 128 | 6,097 Gbit/s |

La valeur actuelle 8 est la meilleure et a été conservée.

### `net.core.netdev_budget`

Le NAPI matériel de l'image OTB utilise un poids 256 alors que le budget global
était 300. Le chemin DSA nécessite deux étapes NAPI. Avec RPS désactivé :

| Budget | Débit moyen | `time_squeeze` moyen |
|---:|---:|---:|
| 300 | 6,526 Gbit/s | 3 165,5 |
| 450 | 6,530 Gbit/s | 57,5 |
| 600 | 6,621 Gbit/s | 1,5 |
| 900 | 6,630 Gbit/s | 0 |
| 1200 | 6,489 Gbit/s | 0 |

Le budget 600 corrige l'épuisement de budget mais ne supprime pas le coût du
premier passage DSA. Sur le LACP complet, le couple budget 600/RPS 0 n'a pas
fourni de gain symétrique reproductible ; il n'a pas été conservé.

## LACP complet

Avec 32 flux TCP, les essais de référence ont mesuré environ :

- Sud → Pro : 6,87 à 7,01 Gbit/s ;
- Pro → Sud : 7,59 à 7,66 Gbit/s.

Les compteurs par membre prouvent que les deux liens transportaient bien du
trafic. Cette mesure est limitée par la terminaison iperf sur les SoC et le
traitement DSA ; elle ne constitue pas une preuve que le switch externe ou les
deux fibres seraient limités au même débit en commutation matérielle entre
deux hôtes 10G.

## Températures après perçage du boîtier Sud

La température SoC observée avant amélioration du boîtier était proche de
77,9 °C. Pendant les longues séries 10G après perçage, elle est restée entre
environ 58 et 60 °C, soit un écart observé de 18 à 20 °C. La comparaison n'est
pas un essai climatique contrôlé, mais l'amélioration est nette.

La dissipation reste inégale autour des cages :

- Sud SFP1 : environ 52 °C ;
- Sud SFP2 : environ 64 °C.

Le SFP2 reste sous son seuil d'avertissement DDM, mais mérite un meilleur
balayage d'air local.

## État final vérifié

- deux membres 10G actifs dans chaque LACP ;
- même agrégateur de chaque côté ;
- aucun état `churn` ;
- VLAN 5, 6, 10, 20 et 30 visibles comme hérités du bond ;
- Wi-Fi actif ;
- Internet et DNS actifs ;
- aucun processus iperf résiduel ;
- réglages runtime restaurés (`netdev_budget=300`, `gro_normal_batch=8`,
  RPS `f`) ;
- alias SFP1/SFP2 actifs dans la vue ports, l'overview et la télémétrie ;
- aucun renommage d'interface noyau.

## Correctif structurel à prototyper

Le correctif permettant de rapprocher SFP1/MxL du débit du SFP direct doit
éviter le premier passage individuel `ETH_P_XDSA`, par exemple avec un chemin
de détagage DSA avant le GRO initial ou une assistance du pilote MediaTek pour
le tag MxL 802.1Q. Ce changement touche le chemin RX noyau et doit être testé
dans une image Pro dédiée avec rollback et console, pas injecté directement en
production.

Références principales :

- Linux DSA `tag.c` :
  <https://github.com/torvalds/linux/blob/v6.18/net/dsa/tag.c>
- Linux `eth_type_trans()` :
  <https://github.com/torvalds/linux/blob/v6.18/net/ethernet/eth.c>
- prise en charge DSA via `gro_cells` :
  <https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/commit/?id=e131a5634830047923c694b4ce0c3b31745ff01b>
- problème de débit MT7988/BPI-R4 et RSS :
  <https://github.com/openwrt/openwrt/issues/18004>
