import { createServer as httpCreate } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCaseModel } from "./lib/vault.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
};

export function createServer(vaultDir) {
  // vaultDir may be a string (fixed) or a function returning the current path,
  // so a host (e.g. the desktop app) can switch vaults without recreating the server.
  const resolveVault = typeof vaultDir === "function" ? vaultDir : () => vaultDir;
  return httpCreate(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      if (url.pathname === "/api/case") {
        const model = buildCaseModel(resolveVault());
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(model));
        return;
      }
      // static files from public/, traversal-safe
      const rel = url.pathname === "/" ? "/index.html" : url.pathname;
      const safe = normalize(rel).replace(/^(\.\.[/\\])+/, "");
      const full = join(PUBLIC, safe);
      if (!full.startsWith(PUBLIC)) {
        res.writeHead(400);
        res.end("bad path");
        return;
      }
      const body = await readFile(full);
      res.writeHead(200, { "content-type": TYPES[extname(full)] || "application/octet-stream" });
      res.end(body);
    } catch (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500);
      res.end(err.code === "ENOENT" ? "not found" : "error");
    }
  });
}

function openBrowser(url) {
  import("node:child_process").then(({ spawn }) => {
    const cmd =
      process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    try {
      spawn(cmd, [url], { stdio: "ignore", detached: true, shell: process.platform === "win32" }).unref();
    } catch {
      /* user opens the URL manually */
    }
  });
}

// CLI entry: node server.js [vaultPath]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const vaultDir = process.argv[2] || join(__dirname, "..", "sample-case");
  const port = Number(process.env.PORT) || 4173;
  const server = createServer(vaultDir);
  server.listen(port, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${port}`;
    console.log(`\n  Family Court Strategist — local workspace`);
    console.log(`  Vault:  ${vaultDir}`);
    console.log(`  Open:   ${url}\n  (read-only · local-only · Ctrl+C to stop)\n`);
    openBrowser(url);
  });
}
