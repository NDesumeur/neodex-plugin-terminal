# Terminal

A real terminal in a NeoDex tab: PowerShell, Command Prompt, Git Bash or WSL, with the shell's own colors and history, and full-screen programs (vim, htop, ssh…).

*Version française : [README.md](README.md)*

## Usage

- Pick the shell in the bar: PowerShell, PowerShell 7, Command Prompt, Git Bash or WSL, whichever are installed on your PC. The choice is kept.
- Type as in any terminal: Tab, ↑ ↓, Ctrl+C to stop a command, all handled by the shell itself.
- **+** (or **Ctrl+Shift+T**) opens another terminal in a tab; the tab's **×** (or **Ctrl+Shift+W**) closes it.
- **Ctrl+C** copies when text is selected, **Ctrl+V** pastes.
- **Erase** clears the screen; **Restart** starts the tab's shell again.
- The terminal size follows the window.

## Limits

- Needs NeoDex 3.4.2 or later. The first opening takes a few seconds: NeoDex prepares its small relay (compiled on your PC, nothing is downloaded).
- With an older NeoDex, or a Windows without pseudo console (before Windows 10 1809), the old line-by-line terminal takes over.
- The shell runs with your usual Windows rights: what you type really acts on your PC.

## Data and sync

Only the shell choice is kept. Nothing else is saved or synced.

## Credits

Display by [xterm.js](https://github.com/xtermjs/xterm.js) 5.5.0 (MIT license, `vendor/xterm.LICENSE`).

## Install

In NeoDex: **NeoStore → Applications → Terminal → Install**.

Building a plugin: see the [NeoDex SDK](https://github.com/NDesumeur/neodex-sdk).
