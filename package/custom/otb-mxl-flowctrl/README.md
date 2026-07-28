# otb-mxl-flowctrl

Paquet de préparation du correctif de contrôle de flux du **BPI-R4 Pro**.

## Périmètre

- carte admise : `bananapi,bpi-r4-pro-8x` uniquement ;
- interface admise : `mxl_lan5` uniquement ;
- agrégat attendu : `bond-trunk` avec exactement `eth1` et `mxl_lan5` ;
- adresse de gestion attendue : `10.0.10.254` ;
- pilote exigé : `mxl862xx_dsa` dont le paramètre noyau en lecture seule
  `/sys/module/mxl862xx_dsa/parameters/otb_flowctrl_version` vaut
  `otb-mxl-flowctrl-v1`.

Le profil prévu active uniquement l’émission de trames PAUSE sur
`mxl_lan5` :

```text
autoneg off
rx      off
tx      on
```

Il ne modifie aucun fichier réseau, VLAN, bridge, bond, pare-feu ou Wi-Fi.

## État de sécurité initial

Le paquet livré ici est volontairement inerte :

```text
enabled=0
validated_profile=unvalidated
```

L’activation persistante est refusée tant que l’essai matériel réversible
de 45 secondes n’a pas validé le profil TX PAUSE. Le paquet de préparation
contient donc :

```text
/etc/otb-mxl-flowctrl/PROVEN_PROFILE = unvalidated
```

Le jeton console ne suffit pas : `runtime-enable`, `enable` et le démarrage
persistant exigent également que ce fichier contienne exactement
`mxl-lan5-tx-only-v1`. Seul le pipeline de finalisation, après analyse
symétrique réussie, peut produire cette variante du paquet.

## Commandes

Lecture seule :

```sh
/usr/libexec/otb-mxl-flowctrl status
```

Activation temporaire, après validation matérielle :

```sh
/usr/libexec/otb-mxl-flowctrl runtime-enable \
  CONFIRM-R4PRO-MXL-LAN5-TX-PAUSE
```

Retour immédiat au mode firmware automatique :

```sh
/usr/libexec/otb-mxl-flowctrl runtime-disable
```

Activation persistante, après validation matérielle :

```sh
/usr/libexec/otb-mxl-flowctrl enable \
  CONFIRM-R4PRO-MXL-LAN5-TX-PAUSE
```

Désactivation persistante :

```sh
/usr/libexec/otb-mxl-flowctrl disable
```

## Retour arrière

`runtime-disable` et `disable` demandent :

```text
autoneg on
rx      off
tx      off
```

Avec le pilote OTB, cet état restaure `MXL862XX_FLOW_AUTO`, qui est l’état
matériel observé avant l’essai. En cas d’échec d’application ou de
vérification, le script lance automatiquement ce retour arrière.
