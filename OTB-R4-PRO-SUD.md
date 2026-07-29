# OpenWrt OTB — BPI-R4 Sud et BPI-R4 Pro 8X

Cette branche publie sous forme **squashée et nettoyée** les travaux réalisés sur les deux routeurs OTB. Elle est fondée sur OpenWrt `main` au commit `672400f3619e912e8d2834f225f48a025a4e4ca2` et Linux 6.18.39.

## Profils

- `bananapi_bpi-r4` : profil R4 Sud, point d'accès/switch avec politique de conteneurs Home Assistant prudente ;
- `bananapi_bpi-r4-pro-8x` : profil R4 Pro 8X, DTS dédié, switch MaxLinear, routage et multi-WAN conservés.

## Principaux apports

- portage du RSS MT7988 vers Linux 6.18, NAPI 256, sérialisation DIM et correction du comptage des files RX ;
- RPS persistant sur les quatre CPU, sans RFS global ;
- HW-LRO exact-DIP, **désactivé par défaut** et pilotable explicitement ;
- prise en charge DTS/image du BPI-R4 Pro 8X et possibilité de désactiver l'offload LAG MxL ;
- conservation de l'identité/calibration BE14 et audit passif du cahier Wi-Fi MLO ;
- courbes ventilateur et bridage CPU communs aux deux cartes ;
- LuCI en français, Argon, vue clients/LACP et diagnostics OTB ;
- mise à jour signée avec contrôle de carte, séquence, SHA-256 et `sysupgrade -T` ;
- politique R4 Sud : conteneurs autorisés seulement sur stockage persistant explicitement préparé, sans formatage ni modification automatique du réseau.

## Ce qui n'est pas inclus

- aucune clé Wi-Fi, aucun mot de passe, aucune sauvegarde de routeur ;
- aucun fichier `/etc/config/network`, `/etc/config/wireless` ou sauvegarde sysupgrade réel ;
- aucun firmware binaire prêt à flasher ;
- aucun contournement des limites réglementaires radio ;
- aucune activation PAUSE/flow-control MxL expérimentale.

Les adresses RFC 5737 présentes dans les valeurs par défaut (`192.0.2.0/24`) sont des exemples non routables. Configurez vos propres adresses avant d'activer les fonctions correspondantes.

## Compilation reproductible

```sh
git clone <URL_DU_DEPOT>
cd openwrt
./scripts/otb-pin-feeds.sh
cp .config.seed .config
make defconfig
make download -j8
make -j"$(nproc)"
```

Les deux profils sont sélectionnés dans `.config.seed`. Les sorties attendues sont dans `bin/targets/mediatek/filogic/`.

## Sécurité de déploiement

Lisez impérativement [docs/otb/FLASH-SAFETY.md](docs/otb/FLASH-SAFETY.md). La présence d'une image construite ne constitue jamais une validation de flash.

## État de validation

Voir [docs/otb/VALIDATION-20260729.md](docs/otb/VALIDATION-20260729.md). Les résultats publiés distinguent l'audit hors ligne, le test `sysupgrade -T` et la validation réelle sur matériel.

## Provenance et licences

- OpenWrt : dépôt et licences d'origine conservés ;
- Argon : sources et licences conservées, voir `package/custom/ARGON-SOURCES.md` ;
- état source expérimental avant squash : `071efb8cfbbb8f1657ef0e99b98e76aa0fc90d7f` ;
- cette branche n'est pas une publication officielle OpenWrt ni Banana Pi.
