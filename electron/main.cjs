const {
  app,
  BrowserWindow,
  Menu,
  Notification,
  Tray,
  globalShortcut,
  ipcMain,
  nativeImage,
  net,
  powerSaveBlocker,
  shell,
} = require('electron');
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');

const APP_ID = 'com.pomogrove.app';
const isDev = !app.isPackaged && process.argv.includes('--dev');
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

let mainWindow = null;
let tray = null;
let isQuitting = false;
let closeToTray = false;
let miniMode = false;
let normalBounds = null;
let wakeBlockerId = null;

app.setAppUserModelId(APP_ID);
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showWindow();
  });
}

function iconPath(name) {
  return path.join(__dirname, '..', 'build', name);
}

function appIcon() {
  const primary = iconPath('icon.png');
  if (fs.existsSync(primary)) return nativeImage.createFromPath(primary);
  return nativeImage.createEmpty();
}

function trayIcon() {
  const trayPath = iconPath('tray.png');
  const image = fs.existsSync(trayPath)
    ? nativeImage.createFromPath(trayPath)
    : appIcon().resize({ width: 16, height: 16 });
  return image.isEmpty() ? nativeImage.createEmpty() : image;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 900,
    minHeight: 640,
    show: false,
    frame: false,
    backgroundColor: '#F7F1E7',
    title: '番茄小园',
    icon: appIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('maximize', () => {
    sendWindowState();
    saveWindowState();
  });
  mainWindow.on('unmaximize', () => {
    sendWindowState();
    saveWindowState();
  });
  mainWindow.on('resize', debounce(saveWindowState, 400));
  mainWindow.on('move', debounce(saveWindowState, 400));

  mainWindow.on('close', (event) => {
    saveWindowState();
    if (!isQuitting && closeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith(DEV_URL) : url.startsWith('file://');
    if (!allowed) event.preventDefault();
  });

  if (isDev) {
    void mainWindow.loadURL(DEV_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  restoreWindowState();
}

function sendWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('window:state', {
    maximized: mainWindow.isMaximized(),
  });
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
  sendWindowState();
}

function updateTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示番茄小园', click: showWindow },
      {
        label: '开始 / 暂停计时',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('tray:toggle');
          }
        },
      },
      { type: 'separator' },
      {
        label: '窗口置顶',
        type: 'checkbox',
        checked: Boolean(mainWindow && mainWindow.isAlwaysOnTop()),
        click: (item) => {
          if (!mainWindow || mainWindow.isDestroyed()) return;
          mainWindow.setAlwaysOnTop(item.checked);
          mainWindow.webContents.send('window:state', {
            maximized: mainWindow.isMaximized(),
          });
        },
      },
      { type: 'separator' },
      {
        label: '退出番茄小园',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip('番茄小园 · 准备开始');
  tray.on('click', showWindow);
  tray.on('double-click', showWindow);
  updateTrayMenu();
}

function registerShortcuts() {
  const registered = globalShortcut.register('CommandOrControl+Alt+P', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      showWindow();
      return;
    }
    mainWindow.webContents.send('tray:toggle');
  });
  if (!registered) {
    console.warn('Global shortcut Ctrl+Alt+P is already in use.');
  }
}

function stateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function restoreWindowState() {
  if (!mainWindow) return;
  try {
    const raw = fs.readFileSync(stateFile(), 'utf8');
    const state = JSON.parse(raw);
    if (state && Number.isFinite(state.width) && Number.isFinite(state.height)) {
      const width = Math.max(900, Math.min(2600, state.width));
      const height = Math.max(640, Math.min(1800, state.height));
      mainWindow.setSize(width, height);
      if (Number.isFinite(state.x) && Number.isFinite(state.y)) {
        mainWindow.setPosition(state.x, state.y);
      }
      if (state.maximized) mainWindow.maximize();
    }
  } catch {
    /* first launch */
  }
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed() || miniMode) return;
  try {
    const bounds = mainWindow.isMaximized()
      ? mainWindow.getNormalBounds()
      : mainWindow.getBounds();
    fs.mkdirSync(path.dirname(stateFile()), { recursive: true });
    fs.writeFileSync(
      stateFile(),
      JSON.stringify({ ...bounds, maximized: mainWindow.isMaximized() }),
      'utf8',
    );
  } catch {
    /* window state is a convenience only */
  }
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };
}

function setMiniMode(value) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (value === miniMode) return;
  if (value) {
    normalBounds = mainWindow.getNormalBounds();
    miniMode = true;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    mainWindow.setResizable(false);
    mainWindow.setMinimumSize(340, 480);
    mainWindow.setSize(400, 620, true);
    mainWindow.center();
  } else {
    miniMode = false;
    mainWindow.setResizable(true);
    mainWindow.setMinimumSize(900, 640);
    if (normalBounds) {
      mainWindow.setBounds(normalBounds, true);
    } else {
      mainWindow.setSize(1180, 800, true);
      mainWindow.center();
    }
    normalBounds = null;
  }
  sendWindowState();
}

function setKeepAwake(value) {
  if (value) {
    if (wakeBlockerId === null) {
      wakeBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    }
  } else if (wakeBlockerId !== null) {
    if (powerSaveBlocker.isStarted(wakeBlockerId)) {
      powerSaveBlocker.stop(wakeBlockerId);
    }
    wakeBlockerId = null;
  }
}

function setAutoLaunch(value) {
  if (!app.isPackaged) return;
  const executable = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(value),
      path: executable,
    });
  } catch {
    /* auto launch is best effort */
  }
}

function showNotification(payload) {
  if (!Notification.isSupported()) return;
  const notification = new Notification({
    title: payload?.title || '番茄小园',
    body: payload?.body || '',
    icon: appIcon(),
    silent: false,
  });
  notification.on('click', showWindow);
  notification.show();
}

const NETEASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://music.163.com/',
  Accept: 'application/json, text/plain, */*',
};

function validSongId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id < 1_000_000_000_000;
}

async function fetchNeteasePlaylist(id) {
  if (!validSongId(id)) throw new Error('歌单 ID 无效');
  const url = `https://music.163.com/api/v6/playlist/detail?id=${id}&n=1000`;
  const response = await net.fetch(url, { headers: NETEASE_HEADERS });
  if (!response.ok) throw new Error(`网易云返回 ${response.status}`);
  return response.json();
}

function headRequest(url) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: 'HEAD',
        headers: NETEASE_HEADERS,
        timeout: 15_000,
      },
      (response) => {
        response.resume();
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
          }),
        );
      },
    );
    request.on('timeout', () => request.destroy(new Error('网易云连接超时')));
    request.on('error', reject);
    request.end();
  });
}

async function resolveNeteaseStream(songId) {
  if (!validSongId(songId)) return null;
  let currentUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;

  try {
    for (let hop = 0; hop < 5; hop += 1) {
      const result = await headRequest(currentUrl);
      const location = result.headers.location;
      if (result.status >= 300 && result.status < 400 && location) {
        currentUrl = new URL(location, currentUrl).toString();
        if (currentUrl.startsWith('http:')) {
          currentUrl = `https://${currentUrl.slice(7)}`;
        }
        continue;
      }

      const contentType = String(result.headers['content-type'] || '');
      const playable =
        result.status >= 200 &&
        result.status < 400 &&
        !/\/404(\?|$)/.test(currentUrl) &&
        (contentType.includes('audio') ||
          /\.(mp3|m4a|flac|aac|ogg)(\?|$)/i.test(currentUrl));
      return playable ? currentUrl : null;
    }
  } catch {
    return null;
  }

  return null;
}

function registerIpc() {
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });
  ipcMain.handle('window:toggle-maximize', () => {
    if (!mainWindow || miniMode) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
    sendWindowState();
  });
  ipcMain.handle('window:close', () => {
    mainWindow?.close();
  });
  ipcMain.handle('window:set-always-on-top', (_event, value) => {
    if (!mainWindow) return;
    mainWindow.setAlwaysOnTop(Boolean(value));
    updateTrayMenu();
  });
  ipcMain.handle('window:set-mini-mode', (_event, value) => {
    setMiniMode(Boolean(value));
  });
  ipcMain.handle('window:set-close-to-tray', (_event, value) => {
    closeToTray = Boolean(value);
  });
  ipcMain.handle('app:set-auto-launch', (_event, value) => {
    setAutoLaunch(Boolean(value));
  });
  ipcMain.handle('app:set-keep-awake', (_event, value) => {
    setKeepAwake(Boolean(value));
  });
  ipcMain.handle('app:notify', (_event, payload) => {
    showNotification(payload);
  });
  ipcMain.handle('app:set-progress', (_event, value) => {
    if (!mainWindow) return;
    const progress = Number(value);
    mainWindow.setProgressBar(Number.isFinite(progress) ? progress : -1);
  });
  ipcMain.on('app:timer-state', (_event, state) => {
    if (!tray || !state) return;
    tray.setToolTip(`番茄小园 · ${state.label || '准备开始'}`);
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) return;
    mainWindow.setTitle(state.label ? `番茄小园 · ${state.label}` : '番茄小园');
  });
  ipcMain.handle('music:netease-playlist', (_event, id) => fetchNeteasePlaylist(id));
  ipcMain.handle('music:netease-stream', (_event, songId) =>
    resolveNeteaseStream(songId),
  );
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  createTray();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else showWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  setKeepAwake(false);
  saveWindowState();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (wakeBlockerId !== null && powerSaveBlocker.isStarted(wakeBlockerId)) {
    powerSaveBlocker.stop(wakeBlockerId);
  }
});
