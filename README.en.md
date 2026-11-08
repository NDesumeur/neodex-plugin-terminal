# Terminal

A PowerShell console in a NeoDex tab: type a command, press Enter, and the output appears below, with the current folder in the prompt and a command history.

*Version française : [README.md](README.md)*

## Usage

- Type a command in the bottom line, then **Enter**. The prompt shows the current folder ("PS C:\Users\…>") and follows `cd`.
- The typed command is shown in green, output in light text and errors in red.
- **↑** and **↓** go through the last 100 commands.
- `cls` or `clear`, or the **Clear** button, empty the screen.
- **Restart** relaunches PowerShell; it is also how you stop a command that never ends.
- Output text can be selected and copied; clicking elsewhere puts the cursor back in the command line.

## Limits

- Commands go through one line at a time: full-screen programs or ones that wait for keys (vim, interactive ssh, menus…) do not work here.
- With very long output, the beginning eventually scrolls off the screen.
- PowerShell runs with your usual Windows rights: what you type really acts on your PC.

## Data and sync

Nothing is stored or synced: the command history only lasts for the session.

## Install

In NeoDex: **NeoStore → Discover → Terminal → Install**.

Building a plugin: see the [NeoDex SDK](https://github.com/NDesumeur/neodex-sdk).
