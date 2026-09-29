# Taille des jetons à la molette

Module Foundry VTT (v13 et v14) : grossissez ou réduisez un jeton posé sur une scène en tournant la molette de la souris.

📄 **[Guide illustré en PDF](docs/Guide.pdf)**

## Utilisation

- Survolez un jeton, maintenez **Alt** et tournez la **molette** : vers le haut pour grossir, vers le bas pour réduire.
- Si le jeton survolé fait partie de votre sélection, **tous les jetons sélectionnés** changent de taille ensemble.
- Un petit texte au-dessus du jeton indique la nouvelle taille.
- **Alt + 0 du pavé numérique** rend au jeton sa taille d'origine (celle d'avant le premier coup de molette).

Il faut être sur la couche des jetons (outil « Jetons » actif). Ctrl + molette et Maj + molette gardent leur rôle habituel (rotation des jetons).

## Réglages

| Réglage | Portée | Rôle |
|---|---|---|
| Ce que change la molette | Monde | **Échelle de l'image** (par défaut) : seul le dessin grossit, le jeton occupe les mêmes cases. **Taille en cases** : largeur et hauteur sur la grille (le centre du jeton reste en place). |
| Pas de l'échelle | Monde | 0,05 par cran par défaut (de 0,2 à 5). |
| Pas de la taille en cases | Monde | 0,5 ou 1 case par cran (de 0,5 à 10). |
| Autoriser les joueurs | Monde | Désactivé par défaut : seul le MJ redimensionne. Activé : chaque joueur peut redimensionner ses propres jetons. |
| Touche à maintenir | Client | Alt ou Maj + Alt. |
| Inverser le sens de la molette | Client | Molette vers le bas pour grossir. |

Le raccourci de réinitialisation se modifie dans **Paramètres › Configurer les contrôles**.

## Installation

Dans Foundry : **Modules complémentaires › Installer un module**, puis collez ce lien de manifeste :

```
https://github.com/magisterphamtom/taille-jeton-molette/releases/latest/download/module.json
```

## Licence

MIT — magisterphamtom
