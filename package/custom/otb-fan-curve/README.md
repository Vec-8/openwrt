# Paquet `otb-fan-curve`

Courbe ventilateur commune au BPI-R4 Sud et au BPI-R4 Pro :

- ventilation intermédiaire à partir de 60 °C ;
- ventilation maximale à partir de 68 °C ;
- refus de s'appliquer sur toute autre carte ;
- restauration des seuils OpenWrt par la commande `restore` ou à l'arrêt du
  service ;
- aucun changement réseau, Wi-Fi, VLAN, LACP ou firewall.

Le bridage dynamique de fréquence reste assuré séparément par
`otb-cpufreq-policy`.
