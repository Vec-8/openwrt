# OTB — Auto-guérison des WAN

Ce module complète `mwan3` avec :

- trois contrôles HTTPS indépendants forcés sur chaque WAN ;
- validation stricte des réponses attendues ;
- détection des portails captifs et des redirections ;
- exclusion/réadmission automatique de la fibre par `mwan3` ;
- reconnexion ciblée des modems QMI Free et Bouygues ;
- temporisation progressive et verrou global empêchant les relances simultanées.

## Cibles de contrôle

- Google : réponse HTTPS `204` attendue ;
- Cloudflare : réponse HTTPS `204` attendue ;
- Apple : page HTTPS contenant `Success` attendue.

Deux cibles sur trois doivent réussir. Une redirection HTTP, un certificat TLS
invalide, une réponse inattendue ou un portail captif sont des échecs.

## Politique de récupération

- `wan5g_free` et `wan5g_BYG` : redémarrage ciblé `ifdown/ifup` après un état
  hors ligne confirmé ;
- `wan_fibre` : retrait automatique des politiques MWAN, puis réadmission
  automatique dès que deux contrôles HTTPS redeviennent valides. La box/ONT
  n'est pas redémarrée en boucle, car cela ne répare pas une panne opérateur.

Les délais entre tentatives QMI sont de 60 s, 180 s, 600 s puis 1 800 s.
Une seule interface peut être relancée à la fois.
Après un démarrage complet du routeur, les relances QMI restent inhibées
pendant 120 secondes afin de laisser netifd et les modems s'initialiser.

## Fichiers

- `/usr/bin/httping` (adaptateur destiné à `mwan3track`)
- `/usr/bin/otb-httping`
- `/usr/sbin/otb-wan-heal`
- `/etc/init.d/otb-wan-heal`
- `/etc/config/otb-wan-heal`
- `/etc/uci-defaults/95-otb-wan-heal`

Le paquet OpenWrt `otb-wan-heal` est réservé au profil R4 Pro. Son script
`uci-defaults` modifie uniquement les options de suivi des trois sections WAN
OTB existantes. Il ne change ni les routes, ni les métriques, ni les membres,
ni les politiques MWAN.

## Contrôles

```sh
/usr/sbin/otb-wan-heal status
logread -e otb-wan-heal
ubus call mwan3 status
```

Un échec peut être simulé sans couper physiquement un lien en créant, dans le
répertoire d'état temporaire protégé, `force-fail.wwan0`,
`force-fail.wwan1` ou `force-fail.br-lan.5`. Ces marqueurs disparaissent au
redémarrage et ne doivent être utilisés que pendant une validation contrôlée.

## Retour arrière

Restaurer les sauvegardes horodatées de `/etc/config/mwan3` et
`/etc/config/firewall`, désactiver `otb-wan-heal`, puis recharger `mwan3` et
le pare-feu.
