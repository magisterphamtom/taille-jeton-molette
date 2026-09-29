# État du module — Taille des jetons à la molette

## Fait (v1.0.0)
- Alt + molette (ou Maj + Alt) au-dessus d'un jeton : grossit / réduit.
- Deux modes (réglage monde) : échelle de l'image (texture.scaleX/Y, effet miroir conservé) ou taille en cases (width/height, centre conservé, proportions conservées).
- Jeton survolé seul, ou toute la sélection si le jeton survolé est sélectionné.
- Crans regroupés (120 ms) en une seule mise à jour par scène ; texte flottant de retour visuel.
- Taille d'origine mémorisée dans un flag au premier changement ; Alt + Pavé num. 0 pour la restaurer (raccourci modifiable).
- Réglage « Autoriser les joueurs » (désactivé par défaut).
- Interface fr + en.

## À tester dans Foundry 14.368
- La molette ne zoome plus la carte quand Alt est enfoncé au-dessus d'un jeton, et zoome toujours normalement ailleurs.
- Ctrl / Maj + molette tournent toujours les jetons.
- Pavé tactile (sensibilité).
- Joueur propriétaire avec « Autoriser les joueurs » activé.

## Points incertains
- Firefox : relâcher Alt peut afficher la barre de menus du navigateur (sans effet sur Foundry).
- Le texte flottant utilise canvas.interface.createScrollingText (local, non diffusé).
