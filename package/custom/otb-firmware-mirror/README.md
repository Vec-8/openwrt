# Miroir local de mises à jour OTB

Ce paquet ajoute un serveur HTTP statique séparé de LuCI, lié par défaut à
`127.0.0.1:8088`. Il sert uniquement un arbre de firmwares déjà signé. Il ne
contient aucune clé privée et ne sait pas signer une image.

Le service reste désactivé tant que le déploiement n’a pas :

1. copié atomiquement `DEVICE/stable/manifest.json`,
   `manifest.json.sig` et l’image correspondante dans le `docroot` ;
2. vérifié la signature avec la clé publique embarquée par `otb-upgrade` ;
3. positionné le `docroot` adapté au routeur ;
4. activé le service.

Le manifeste doit être installé en dernier. Ainsi, une copie interrompue de
l’image ne peut pas annoncer une mise à jour incomplète.

La configuration de production peut ensuite utiliser :

```text
http://127.0.0.1:8088
```

comme `base_url` de `otb-upgrade`. Les vérifications de signature, de taille,
de SHA-256 et `sysupgrade -T` restent réalisées par `otb-upgrade` avant toute
installation.

Sur le R4 Sud, le miroir est placé sous `/srv`. Sur le R4 Pro, seule l’image
du Pro est conservée afin de limiter l’occupation de l’overlay.
