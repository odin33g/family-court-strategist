# Family Court Strategist — Desktop App

A double-click desktop wrapper (Electron) around the local web workspace. It opens
the dashboard in its own app window and adds a native **File → Open Case Folder…**
picker, so a parent never touches a terminal or a file path. Everything stays on
the machine — no accounts, no uploads.

## Run it (development)

```bash
cd desktop
npm install     # one time — downloads Electron
npm start       # opens the app window
```

First launch shows the bundled **sample case**. Use **File → Open Case Folder…**
(⌘O) to point it at your own vault; it remembers your choice next time.

> Note: must be run from a normal desktop session. Headless/CI environments that set
> `ELECTRON_RUN_AS_NODE=1` or have no display cannot open the window — that's expected.

## How it works

- Reuses the exact same local server as [`../app`](../app) (`createServer`), passing a
  *dynamic* vault path so the folder picker can switch cases without a restart.
- Loads `http://127.0.0.1:<random-port>` in the window — same UI, same read-only,
  local-only guarantees.
- Remembers the last vault in the OS user-data folder (`config.json`).

## Build installers (later)

```bash
npm run dist    # electron-builder → .dmg / .exe / .AppImage
```

Bundles `../app` and `../sample-case` as resources. **Code-signing/notarisation** is
required for a warning-free install on macOS and Windows — that's the main step
between "works on my machine" and "a stranger can double-click it safely."

## If anything goes wrong

The browser version always works as a fallback:

```bash
cd ../app && node server.js            # sample case
cd ../app && node server.js /your/vault
```
