# Sécurité de la branche OTB

Cette branche publique ne doit contenir ni mot de passe, ni clé privée, ni sauvegarde de routeur, ni configuration Wi-Fi/réseau réelle. Les adresses `192.0.2.0/24` sont réservées à la documentation.

Pour signaler une fuite ou une vulnérabilité, utilisez un canal privé du mainteneur du dépôt et ne publiez pas de secret dans une issue.

L'outil de mise à jour vérifie une signature usign, un SHA-256, la carte cible et `sysupgrade -T`. L'installation automatique est désactivée dans les valeurs publiques par défaut.
