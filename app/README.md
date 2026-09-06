# Family Court Strategist — Local Web App

A beautiful, **local** view of your case vault. Everything runs on your computer.
No accounts, no uploads, no internet required.

## Run it

```bash
cd app
node server.js                 # opens the bundled sample case
node server.js /path/to/vault  # opens YOUR vault (read-only)
```

Then open the printed `http://127.0.0.1:4173` in your browser.

- **Read-only:** v1 never changes your files.
- **Local-only:** the server listens on 127.0.0.1 and makes no outbound connections.
- **Zero dependencies:** just [Node.js](https://nodejs.org) 18+ — no `npm install`.

## Test it

```bash
cd app
npm test
```
