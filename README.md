# Terminal

Un vrai terminal dans un onglet de NeoDex : PowerShell, Invite de commandes, Git Bash ou WSL, avec les couleurs et l'historique du shell, et les programmes plein écran (vim, htop, ssh…).

*English version: [README.en.md](README.en.md)*

## Utilisation

- Choisis le shell dans la barre : PowerShell, PowerShell 7, Invite de commandes, Git Bash ou WSL, selon ce qui est installé sur ton PC. Le choix est gardé.
- Tape comme dans n'importe quel terminal : Tab, ↑ ↓, Ctrl+C pour arrêter une commande, tout vient du shell lui-même.
- **+** (ou **Ctrl+Maj+T**) ouvre un autre terminal dans un onglet ; le **×** de l'onglet (ou **Ctrl+Maj+W**) le ferme.
- **Ctrl+C** copie quand du texte est sélectionné, **Ctrl+V** colle.
- **Effacer** vide l'écran ; **Redémarrer** relance le shell de l'onglet.
- La taille du terminal suit celle de la fenêtre.

## Limites

- Demande NeoDex 3.4.2 ou plus. La première ouverture prend quelques secondes : NeoDex prépare son petit relais (compilé sur ton PC, rien n'est téléchargé).
- Avec un NeoDex plus ancien, ou un Windows sans pseudo-console (avant Windows 10 1809), l'ancien terminal ligne par ligne prend le relais.
- Le shell tourne avec tes droits Windows habituels : ce que tu tapes agit vraiment sur ton PC.

## Données et synchronisation

Seul le choix du shell est gardé. Rien d'autre n'est enregistré ni synchronisé.

## Crédits

Affichage par [xterm.js](https://github.com/xtermjs/xterm.js) 5.5.0 (licence MIT, `vendor/xterm.LICENSE`).

## Installer

Dans NeoDex : **NeoStore → Applications → Terminal → Installer**.

Développer un plugin : voir le [SDK NeoDex](https://github.com/NDesumeur/neodex-sdk).
