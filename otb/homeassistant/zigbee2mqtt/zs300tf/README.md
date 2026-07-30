# Correctif Zigbee2MQTT Excellux ZS-300TF

## Symptôme

La variante `TS0601 / _TZE2841000000_hdml1aav` publie le datapoint Tuya
`111` (`water_warning`) sous forme booléenne (`false` ou `true`).
La définition `ZS-300TF` de `zigbee-herdsman-converters` 26.76.0 attend
uniquement un `Enum(0)` ou `Enum(1)`, ce qui produit périodiquement :

```text
Value 'false' is not allowed, expected one of 0,1
```

## Correctif

`otb-zs300tf-water-warning.mjs` réutilise toute la définition officielle,
mais remplace uniquement le convertisseur du datapoint 111. Les formes
booléennes et énumérées sont toutes les deux acceptées :

- `false` ou `Enum(0)` devient `none` ;
- `true` ou `Enum(1)` devient `alarm`.

Le convertisseur est limité à l’empreinte fabricant fautive
`_TZE2841000000_hdml1aav`.

## Déploiement OTB

Fichier persistant :

```text
/srv/otb-ha/zigbee2mqtt/data/external_converters/otb-zs300tf-water-warning.mjs
```

Zigbee2MQTT 2.11 et plus nécessite également :

```yaml
advanced:
  enable_external_js: true
```

La sauvegarde de production créée avant activation se trouve sous
`/srv/otb-ha/backups/z2m-zs300tf-fix-<horodatage>/`.

## Validation

Le test unitaire vérifie `false`, `true`, `Enum(0)` et `Enum(1)`.
La validation d’exploitation exige ensuite :

1. chargement explicite du convertisseur dans les journaux ;
2. reconnexion du coordinateur Ethernet ;
3. état MQTT `online` ;
4. publication d’un rapport avec `"water_warning":"none"` ;
5. absence de la précédente exception de conversion.
