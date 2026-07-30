# Vue d’ensemble OTB commune — recette du 30 juillet 2026

## Objectif

`luci-app-otb-overview` ajoute au tableau d’état LuCI une synthèse commune,
adaptée automatiquement au rôle de l’équipement et strictement en lecture
seule. Elle complète, sans remplacer, les cartes de ports physiques fournies
par `luci-app-otb-ports`.

Rôles reconnus :

- **R4 Pro** : WAN, auto-guérison, Wi-Fi/MLO, LACP/VLAN, clients et supervision
  de toutes les adresses statiques nommées ;
- **R4 Sud/Nord** : Wi-Fi/MLO, LACP/VLAN, services domotiques, stockage et
  supervision limitée aux R4 et aux deux switches ;
- **switch OpenWrt** : LACP/VLAN, état constructeur des ports, températures
  SoC/optiques et supervision limitée à l’infrastructure.

Le collecteur écrit un instantané local toutes les 60 secondes. L’interface
LuCI le lit par RPC ubus ; aucune action de redémarrage, modification WAN,
DHCP, Wi-Fi, bridge, VLAN ou firewall n’est exposée.

## Contenu affiché

- santé système, température, RAM, charge, uptime et noyau ;
- état effectif de chaque agrégat LACP, membres, capacité et VLAN hérités ;
- état des trois WAN et du service d’auto-guérison sur le Pro ;
- radios, pays, canaux et groupes MLO actifs sur les R4 ;
- Home Assistant, Mosquitto, Zigbee2MQTT et occupation de `/srv` sur le Sud ;
- température, marge thermique, niveaux TX/RX et alarmes DDM des optiques ;
- résumé des clients Wi-Fi dégradés lorsque `luci-app-otb-clients` est présent ;
- supervision ICMP nommée, avec distinction entre équipement hors ligne et
  équipement seulement prévu.

La section constructeur **État réel des ports et VLAN** reste affichée sous la
synthèse. Chaque port conserve son état, sa vitesse, son LACP et ses VLAN
directs ou hérités.

## Intégration aux images

### BPI-R4 Pro et R4 Sud

Source : `package/custom/luci-app-otb-overview`.

Les profils `bananapi_bpi-r4` et `bananapi_bpi-r4-pro-8x` incluent désormais :

- `luci-app-otb-overview` ;
- `luci-app-otb-clients` — qui entraîne `luci-app-otb-ports` ;
- `luci-app-otb-telemetry`.

La révision 8 de `luci-app-otb-clients` ne réinstalle plus l’ancien tableau Pro
mutable. À la mise à niveau, elle retire son service de restauration, ses CGI
et ses scripts obsolètes. `luci-app-otb-overview` applique également ce
nettoyage pour rendre la migration déterministe.

### SODOLA SL-SWTGW3C8F

Source : `package/otb/luci-app-otb-overview` sur la branche switch.

Le profil et la configuration de compilation incluent désormais
`luci-app-otb-overview`, `luci-app-otb-lacp`, `luci-app-otb-ports` et
`luci-app-otb-telemetry`.

## Validation réelle en production

Validation effectuée le 30 juillet 2026, sans flash, sans redémarrage et sans
modification du Wi-Fi du Mac.

### R4 Pro

- noyau 6.18.39 ;
- overview actif, un seul collecteur ;
- trois WAN sur trois en ligne et auto-guérison active ;
- bond `mxl_lan5 + eth1` : deux liens à 10 Gbit/s, même agrégateur, aucun churn ;
- trois radios actives en pays FR, canal 11 en 2,4 GHz, trois groupes MLO ;
- 34 adresses nommées supervisées lors de la recette ;
- réservation VLAN 10 du MacBook en `10.0.10.88`, actuellement hors ligne dans
  la vue car le Mac est resté volontairement sur le Wi-Fi Freebox ;
- accès Internet et DNS validés.

### R4 Sud

- noyau 6.18.39 ;
- overview actif, un seul collecteur ;
- bond `sfp-lan + sfp-wan` : deux liens à 10 Gbit/s, même agrégateur, aucun
  churn ;
- trois radios actives en pays FR, canal 11 en 2,4 GHz, trois groupes MLO ;
- Home Assistant, Mosquitto et Zigbee2MQTT actifs, aucun redémarrage recensé ;
- `/srv` occupé à 81 %, donc signalé « À surveiller » ;
- accès Internet et DNS validés.

### Switch cœur

- noyau 6.18.39 ;
- overview actif, un seul collecteur ;
- LACP Pro `lan1 + lan2` : 2 × 10 Gbit/s, agrégateur unique, sans churn ;
- LACP Sud `lan3 + lan4` : 2 × 10 Gbit/s, agrégateur unique, sans churn ;
- LACP Nord `lan5 + lan6` explicitement marqué prévu et non compté en panne ;
- VLAN effectifs 1, 5, 6, 10, 20 et 30 conservés sur les trunks ;
- huit cartes de ports constructeur conservées ;
- SoC autour de 63 °C pendant la recette ; optiques actives autour de 51 à
  62 °C, sans alarme DDM ;
- accès Internet et DNS validés.

## Débit Pro ↔ Sud après déploiement

Trois profils TCP contrôlés ont été relancés après la recette LuCI. Ils
utilisent des adresses RFC2544 temporaires, vérifient les températures et les
configurations avant/après, puis retirent automatiquement tout état de test.

- 8 flux, premier tirage : 7,32 Gbit/s Pro→Sud et 4,01 Gbit/s Sud→Pro ;
- 16 flux : 7,44 Gbit/s Pro→Sud et 6,77 Gbit/s Sud→Pro ;
- 8 flux, second tirage : 7,40 Gbit/s Pro→Sud et 6,65 Gbit/s Sud→Pro.

Les deux membres de chaque agrégat ont transporté du trafic pendant les trois
essais. Le premier résultat asymétrique vient d’une mauvaise répartition des
huit couples IP/ports par le hash LACP, pas d’un lien tombé : dans ce sens,
près de 90 % des octets ont été concentrés sur un seul membre. Le second essai
à huit flux n’a enregistré aucun drop supplémentaire.

Le meilleur résultat antérieur conservé sur le même noyau est de 7,81/7,53
Gbit/s. La limite actuelle est celle des deux SoC utilisés comme terminaisons
iperf3 et de la répartition de quelques flux ; elle ne certifie pas la capacité
de commutation agrégée de 20 Gbit/s. Cette certification exige deux
générateurs externes 10G de chaque côté, ou un générateur 25G par côté, avec
plusieurs couples d’adresses et de ports.

## Sauvegarde et retour arrière

Avant chaque déploiement, les fichiers remplacés ont été archivés sous
`/root/otb-backups/` sur l’équipement concerné. Le retour arrière consiste à :

1. arrêter et désactiver `otb-overview` ;
2. restaurer les fichiers archivés à leur chemin d’origine ;
3. redémarrer uniquement `rpcd` ;
4. vider `/tmp/luci-indexcache` et `/tmp/luci-modulecache/`.

Le rollback ne nécessite ni reboot ni modification réseau.

## Limites constatées

- La recette en production valide le code d’exécution et le rendu, mais le
  paquet n’a pas été recompilé sur macOS : l’arbre OpenWrt refuse le chemin de
  travail contenant une espace et exige une version GNU de `make`/`bash` plus
  récente que les outils Apple. La prochaine image doit être compilée dans la
  VM Linux/CI habituelle.
- Le LuCI Wi-Fi standard peut encore présenter les sections UCI sous-jacentes
  d’un MLO comme désactivées. La synthèse OTB utilise l’état netifd réellement
  actif et affiche correctement les trois groupes MLO ; la limitation du panneau
  standard reste indépendante de ce paquet.
- Une supervision ICMP peut déclarer un client en veille ou filtrant le ping
  « hors ligne » sans que son service soit en panne.
- Le stockage `/srv` du Sud dépasse le seuil de prudence de 80 %.
- L’image Zigbee2MQTT actuellement exécutée utilise encore un tag flottant ;
  elle devra être figée lors de la prochaine maintenance conteneurs.

Aucun secret, mot de passe ou identifiant de module optique n’est stocké dans
ce document.
