# Outils d'audit du firmware SODOLA

- `bix_tool.py` inspecte les en-têtes U-Boot/BIX, valide les CRC, extrait le
  payload déclaré et distingue les données ajoutées après le payload. Son mode
  `repack` est destiné aux expériences hors ligne, jamais à un flash direct.
- `extract_initramfs.py` repère et extrait sans périphériques un initramfs CPIO
  `newc` compressé en gzip dans une image noyau décompressée.
- `validate_build.py` contrôle taille, magic, CRC, décompression LZMA du
  noyau, chaînes obligatoires du DTB, présence du SquashFS ajouté et paquets
  requis d’une image OpenWrt compilée.
- `collect-openwrt-preflight.sh` collecte en lecture seule la plateforme, les
  VLAN, les bonds, les capteurs thermiques du RTL9303, les ports et la
  télémétrie DOM des modules SFP après un démarrage de test.
- `stock-diag-readonly.txt` contient uniquement les commandes de lecture du
  hachage LACP du SDK constructeur.
- `stock-diag-layer3-4-test.txt` documente un test temporaire, volontairement
  non automatisé et avec identifiants de trunk laissés en placeholder.

Aucun fichier constructeur, extrait propriétaire, secret ou clé n'est inclus.
