# Terminal

Une console PowerShell dans un onglet de NeoDex : tape une commande, appuie sur Entrée, et la sortie s'affiche en dessous, avec le dossier courant dans l'invite et l'historique des commandes.

*English version: [README.en.md](README.en.md)*

## Utilisation

- Tape une commande dans la ligne du bas, puis **Entrée**. L'invite montre le dossier courant (« PS C:\Users\…> ») et suit les `cd`.
- La commande tapée s'affiche en vert, la sortie en clair et les erreurs en rouge.
- **↑** et **↓** parcourent les 100 dernières commandes.
- `cls` ou `clear`, ou le bouton **Effacer**, vident l'écran.
- **Redémarrer** relance PowerShell ; c'est aussi ce qui arrête une commande qui ne finit pas.
- Le texte de la sortie se sélectionne et se copie ; un clic ailleurs remet le curseur dans la ligne de commande.

## Limites

- Les commandes passent une ligne à la fois : les programmes plein écran ou qui attendent des touches (vim, ssh interactif, menus…) ne fonctionnent pas ici.
- Sur une très longue sortie, le début finit par s'effacer de l'écran.
- PowerShell tourne avec tes droits Windows habituels : ce que tu tapes agit vraiment sur ton PC.

## Données et synchronisation

Rien n'est enregistré ni synchronisé : l'historique des commandes ne dure que le temps de la session.

## Installer

Dans NeoDex : **NeoStore → À découvrir → Terminal → Installer**.

Développer un plugin : voir le [SDK NeoDex](https://github.com/NDesumeur/neodex-sdk).
