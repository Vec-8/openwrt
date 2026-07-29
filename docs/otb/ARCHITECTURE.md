# Architecture des deux profils

## R4 Pro 8X

Le R4 Pro reste le cœur réseau : DSA MaxLinear, LACP, VLAN, routage, multi-WAN et Wi-Fi BE14. Le correctif permet de désactiver l'offload LAG MxL lorsque le chemin matériel est incompatible avec la topologie testée. Les réglages PAUSE MxL expérimentaux ont été retirés de l'état publié.

## R4 Sud

Le R4 Sud reste d'abord un point d'accès et un switch. La pile conteneurs peut être installée, mais son démarrage dépend d'un stockage persistant préparé explicitement et d'un marqueur d'autorisation. La politique n'ajoute aucun bridge, VLAN ou règle firewall automatiquement.

## Réseau et performances

Le RSS répartit les files RX du MT7988, RPS complète cette distribution et HW-LRO reste optionnel. Le LACP agrège plusieurs flux ; un flux TCP unique reste limité à un seul membre selon le hachage des équipements traversés.

## Wi-Fi

La BE14 est une carte unique exposée par deux fonctions PCIe. Le paquet d'audit exige trois groupes MLO et un BSS 2,4 GHz hérité, sans modifier `/etc/config/wireless`. La puissance effective reste plafonnée par le noyau, le pilote, le firmware radio et la réglementation du pays configuré.
