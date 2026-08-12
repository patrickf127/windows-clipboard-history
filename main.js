const { app, BrowserWindow, Tray, Menu, nativeImage, clipboard, ipcMain, Notification } = require('electron');
const path = require('path');
const { initDatabase, addClipboardItem, getClipboardHistory, deleteClipboardItem, togglePin, clearOldEntries, searchHistory } = require('./database');

let mainWindow;
let tray;
let clipboardTimer;

// ---------- 建立主視窗 ----------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 700,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: true,   // 啟動時直接顯示視窗方便測試
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // 點擊視窗外關閉
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
    }
  });
}

// ---------- 建立托盤圖示 ----------
function createTray() {
  // 用原生圖片產生一個 16x16 圖示（淡藍色）
  const icon = nativeImage.createFromBuffer(createTrayIconBuffer(), { width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('剪貼簿歷史');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '📋 開啟剪貼簿歷史',
      click: () => toggleWindow(),
    },
    { type: 'separator' },
    {
      label: '❌ 退出',
      click: () => {
        clearInterval(clipboardTimer);
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('click', () => toggleWindow());
}

// ---------- 產生一個淡藍色小圖示 ----------
function createTrayIconBuffer() {
  // 16x16 像素 RGBA, 淡藍色圓形
  const size = 16;
  const buf = Buffer.alloc(size * size * 4, 0);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - 7.5, dy = y - 7.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 7) {
        const i = (y * size + x) * 4;
        buf[i] = 147;     // R
        buf[i + 1] = 197; // G
        buf[i + 2] = 253; // B — 淡藍色
        buf[i + 3] = 255; // A
      }
    }
  }
  return buf;
}

// ---------- 顯示/隱藏視窗 ----------
function toggleWindow() {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('refresh-history');
  }
}

// ---------- 監控剪貼簿 ----------
function startClipboardMonitor() {
  let lastText = '';
  let lastImageHash = '';

  clipboardTimer = setInterval(async () => {
    try {
      const text = clipboard.readText();
      const image = clipboard.readImage();

      if (text && text !== lastText) {
        lastText = text;
        lastImageHash = '';
        await addClipboardItem('text', text, null);
      }

      // 檢查圖片
      if (!image.isEmpty()) {
        const imgBuf = image.toPNG();
        const hash = simpleHash(imgBuf);
        if (hash !== lastImageHash && !text) {
          lastImageHash = hash;
          lastText = '';
          await addClipboardItem('image', null, imgBuf);
        }
      }

      // 文字改變時重置圖片 hash
      if (text) lastImageHash = '';
    } catch (e) {
      // 靜默處理，避免干擾使用者
    }
  }, 500);
}

function simpleHash(buf) {
  let hash = 0;
  const step = Math.max(1, Math.floor(buf.length / 1000));
  for (let i = 0; i < buf.length; i += step) {
    hash = ((hash << 5) - hash) + buf[i];
    hash |= 0;
  }
  return hash;
}

// ---------- IPC 處理 ----------
ipcMain.handle('get-history', async () => {
  return await getClipboardHistory();
});

ipcMain.handle('search-history', async (_, keyword) => {
  return await searchHistory(keyword);
});

ipcMain.handle('delete-item', async (_, id) => {
  await deleteClipboardItem(id);
});

ipcMain.handle('toggle-pin', async (_, id) => {
  await togglePin(id);
});

ipcMain.handle('hide-window', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.handle('copy-to-clipboard', (_, content, type) => {
  if (type === 'text') {
    clipboard.writeText(content);
  } else if (type === 'image') {
    clipboard.writeImage(nativeImage.createFromBuffer(Buffer.from(content, 'base64')));
  }
});

// ---------- 每小時清理過期資料 ----------
setInterval(async () => {
  const deleted = await clearOldEntries(3); // 3 天
  if (deleted > 0 && mainWindow && mainWindow.isVisible()) {
    mainWindow.webContents.send('refresh-history');
  }
}, 60 * 60 * 1000);

// ---------- 應用程式生命週期 ----------
app.whenReady().then(async () => {
  await initDatabase();
  await clearOldEntries(3); // 啟動時先清一次
  createWindow();
  createTray();
  startClipboardMonitor();
});

app.on('window-all-closed', () => {
  // 不退出，繼續在托盤運行
});

app.on('before-quit', () => {
  clearInterval(clipboardTimer);
});
