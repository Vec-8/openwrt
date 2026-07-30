# Limites connues

1. **Pas de tachymètre sur les BPI-R4 observés.** La commande PWM est lisible,
   mais le noyau n'expose pas de vitesse réelle. L'interface ne peut donc pas
   prouver qu'un ventilateur tourne ou qu'il est mécaniquement bloqué.
2. **Switch passif.** Le RTL9303 expose la température SoC et les DDM, mais aucun
   PWM, tachymètre, `cooling_device` ou contrôle `cpufreq` exploitable. Le module
   ne peut pas piloter un ventilateur ajouté.
3. **DDM facultatif.** Un port sans module, avec DAC passif ou avec module sans
   DOM/DDM ne fournit pas de température. Il est affiché hors ligne ou sans DDM,
   jamais complété par une valeur estimée.
4. **Pas de température d'air ni de châssis.** Les valeurs SoC, PHY, Wi-Fi et
   optiques ne remplacent pas une sonde ambiante placée dans le boîtier.
5. **Historique volatil.** Les 24 heures sont conservées en RAM et disparaissent
   au redémarrage. C'est volontaire pour éviter l'usure de la flash.
6. **Lecture DDM relativement lente sur le switch.** Une collecte complète des
   huit ports prend environ 1,14 seconde. Le poll est limité à 30 secondes et ne
   fonctionne que lorsque la page est ouverte.
7. **Seuils opérationnels.** Le niveau 70/85 °C utilisé pour les capteurs sans
   limites natives est un indicateur prudent, pas une limite électrique du
   fabricant. Les seuils DDM natifs restent affichés séparément.
8. **R4 Nord non recetté.** Il était physiquement absent/injoignable pendant le
   déploiement. Le paquet est prévu dans le profil BPI-R4, mais sa télémétrie
   réelle reste à vérifier lors de sa remise en ligne.
9. **Paquet source non compilé dans un buildroot pendant cette intervention.**
   Le backend a été compilé par `ucode` sur chaque cible et tous les fichiers ont
   été déployés, mais l'APK généré par le build OpenWrt devra encore être validé
   lors de la prochaine compilation d'image.
10. **Déploiement pilote hors base APK.** Les trois systèmes actifs utilisent
    actuellement les fichiers copiés dans l'overlay. Ils persistent au reboot,
    mais un sysupgrade les remplacera. Les prochaines images doivent inclure le
    paquet ajouté aux profils, plutôt que conserver une ancienne copie via
    `sysupgrade.conf`.
11. **Aucune action corrective automatique.** Le module signale les anomalies,
    mais ne modifie ni PWM, ni fréquence CPU, ni lien, ni VLAN. Cette séparation
    évite qu'un défaut de télémétrie perturbe la fonction réseau.
12. **Stockage du R4 Sud à surveiller.** `/srv` était à 80 % lors de la recette,
    avec environ 1,4 Gio libres. Cette occupation appartient aux services
    domotiques existants ; elle doit être réduite ou surveillée avant une
    croissance importante de la base Home Assistant.
