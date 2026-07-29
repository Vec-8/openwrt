# Paquet `otb-fan-curve`

Courbes ventilateur par carte :

- R4 Pro : ventilation intermédiaire à 60 °C, maximale à 68 °C ;
- R4 Sud : ventilation intermédiaire à 60 °C, maximale à 68 °C, identique au R4 Pro ;
- refus de s'appliquer sur toute autre carte ;
- restauration des seuils OpenWrt par la commande `restore` ou à l'arrêt du
  service ;
- aucun changement réseau, Wi-Fi, VLAN, LACP ou firewall.

Le bridage dynamique de fréquence reste assuré séparément par
`otb-cpufreq-policy`.
