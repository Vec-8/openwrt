# Garde-fous de flash

1. disposer d'une console série lisible et testée ;
2. sauvegarder la configuration et les partitions nécessaires au retour arrière ;
3. calculer et conserver le SHA-256 de l'image et du rollback ;
4. vérifier la carte avec `ubus call system board` ;
5. exécuter `sysupgrade -T` sur le candidat **et** sur le rollback ;
6. flasher le R4 Sud avant le R4 Pro lorsque les deux doivent être mis à jour ;
7. contrôler après redémarrage : gestion, VLAN, LACP, SFP+, Wi-Fi/MLO, WAN, température et services ;
8. ne jamais changer le Wi-Fi de la station d'administration pour contourner une perte de route ;
9. arrêter immédiatement si la console, l'ARP ou les liens optiques de récupération sont absents.

Le dépôt ne contient volontairement aucun script qui lance automatiquement `sysupgrade`.
