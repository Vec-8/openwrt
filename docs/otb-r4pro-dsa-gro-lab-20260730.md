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
