# Déploiement et retour arrière

## Intégration dans une image OpenWrt

Le paquet se trouve dans `package/custom/luci-app-otb-telemetry` sur les
branches R4 et dans `package/otb/luci-app-otb-telemetry` sur la branche du
switch. Les profils OTB concernés l'incluent via `DEVICE_PACKAGES` ou la
configuration d'image de référence.

```sh
make package/luci-app-otb-telemetry/compile V=s
```

La compilation d'image complète doit ensuite vérifier la présence du paquet,
les dépendances, la taille de l'image et `sysupgrade -T` avant tout flash.

## Déploiement pilote sans flash

Le script `scripts/remote-install-runtime.sh` attend :

- l'archive sous `/tmp/luci-app-otb-telemetry-runtime.tar.gz` ;
- `EXPECTED_SHA256` ;
- `DEPLOY_STAMP`.

Il réalise, dans cet ordre : contrôle des dépendances et du SHA-256, sauvegarde
des fichiers ciblés, compilation ucode sur la cible, copie, contrôle de chaque
fichier, redémarrage de `rpcd`, activation du collecteur et test ubus.

En cas d'erreur, une restauration automatique est déclenchée. Après réussite,
un rollback autonome est conservé sous :

```text
/root/otb-backups/telemetry-<horodatage>/rollback.sh
```

Le rollback arrête le collecteur, retire les nouveaux fichiers, restaure les
éventuels fichiers précédents et redémarre uniquement `rpcd`. Il ne touche pas
au réseau.

## Ordre de production utilisé

1. R4 Sud ;
2. switch cœur ;
3. R4 Pro.

Après chaque cible, les checksums réseau, les liens, LACP, VLAN, Wi-Fi, routes,
services et chemins d'administration ont été vérifiés avant de poursuivre.
Aucun équipement n'a été redémarré et aucun flash n'a été effectué.
