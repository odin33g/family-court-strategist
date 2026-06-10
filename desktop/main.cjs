const { app, BrowserWindow, dialog, Menu, shell } = require("electron");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");
const { readFileSync, writeFileSync, existsSync } = require("node:fs");

// Locate the bundled app + sample case in both dev and packaged builds.
const base = app.isPackaged ? process.resourcesPath : join(__dirname, "..");
const serverPath = join(base, "app", "server.js");
const sampleCase = join(base, "sample-case");

const cfgPath = join(app.getPath("userData"), "config.json");
function loadVault() {
  try {
    const v = JSON.parse(readFileSync(cfgPath, "utf8")).vault;
    return v && existsSync(v) ? v : null;
  } catch {
    return null;
  }
}
function saveVault(v) {
  try { writeFileSync(cfgPath, JSON.stringify({ vault: v })); } catch { /* non-fatal */ }
}

let currentVault = loadVault() || sampleCase;
let win = null;

async function pickFolder() {
  const r = await dialog.showOpenDialog(win, {
    title: "Choose your case vault folder",
    message: "Pick the folder that holds your Family Court Strategist vault.",
    properties: ["openDirectory", "createDirectory"],
  });
  if (!r.canceled && r.filePaths[0]) {
    currentVault = r.filePaths[0];
    saveVault(currentVault);
    if (win) win.reload();
  }
}

function useSample() {
  currentVault = sampleCase;
  saveVault(currentVault);
  if (win) win.reload();
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [
        { label: "Open Case Folder…", accelerator: "CmdOrCtrl+O", click: pickFolder },
        { label: "Load Sample Case", click: useSample },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" }, { role: "forceReload" }, { type: "separator" },
        { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" },
        { role: "togglefullscreen" }, { role: "toggleDevTools" },
      ],
    },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        { label: "Project on GitHub", click: () => shell.openExternal("https://github.com/odin33g/family-court-strategist") },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  const { createServer } = await import(pathToFileURL(serverPath).href);
  const server = createServer(() => currentVault); // dynamic vault path
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;

  win = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: "Family Court Strategist",
    backgroundColor: "#1a2740",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://127.0.0.1")) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadURL(`http://127.0.0.1:${port}`);
  buildMenu();

  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) win.show(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
