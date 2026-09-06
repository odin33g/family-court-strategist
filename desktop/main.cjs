const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require("electron");
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
let serverPort = null;

function liveWindow() {
  return win && !win.isDestroyed() ? win : null;
}

async function pickFolder(reloadWindow = true) {
  const parent = liveWindow();
  const options = {
    title: "Choose your case vault folder",
    message: "Pick the folder that holds your Family Court Strategist vault.",
    properties: ["openDirectory", "createDirectory"],
  };
  const r = parent
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options);
  if (!r.canceled && r.filePaths[0]) {
    currentVault = r.filePaths[0];
    saveVault(currentVault);
    if (reloadWindow) liveWindow()?.reload();
    return true;
  }
  return false;
}

function useSample() {
  currentVault = sampleCase;
  saveVault(currentVault);
  liveWindow()?.reload();
}

function createWindow() {
  const browserWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: "Family Court Strategist",
    backgroundColor: "#1a2740",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "preload.cjs"),
    },
  });

  win = browserWindow;
  browserWindow.on("closed", () => {
    if (win === browserWindow) win = null;
  });

  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://127.0.0.1")) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  browserWindow.loadURL(`http://127.0.0.1:${serverPort}`);
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
  serverPort = server.address().port;

  ipcMain.handle("vault:choose-folder", (event) => {
    const currentWindow = liveWindow();
    if (
      !currentWindow
      || event.sender !== currentWindow.webContents
      || event.senderFrame !== currentWindow.webContents.mainFrame
    ) return false;
    return pickFolder(false);
  });

  createWindow();
  buildMenu();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
