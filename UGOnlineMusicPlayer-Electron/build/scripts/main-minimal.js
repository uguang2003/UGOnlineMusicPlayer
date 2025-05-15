// 最小化main.js - 移除所有非必要代码
const { app, BrowserWindow, Menu, globalShortcut, Tray, nativeImage } = require('electron');
const path = require('path');

app.isQuitting = false;
let mainWindow;
let tray = null;

// 实现单实例锁定，防止应用多开
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 如果无法获取锁，说明已经有另一个实例在运行，直接退出
  console.log('UG音乐播放器已经在运行中，不允许多开！');
  app.quit();
} else {
  // 当其他实例尝试启动时，聚焦到我们的窗口
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.show();
    }
  });

  // 全局快捷键
  function registerGlobalShortcuts() {
    globalShortcut.unregisterAll();
    globalShortcut.register('CommandOrControl+Alt+Right', () => {
      if (mainWindow) mainWindow.webContents.executeJavaScript(`const n=document.querySelector('.btn-next');if(n){n.click();}`);
    });
    globalShortcut.register('CommandOrControl+Alt+Left', () => {
      if (mainWindow) mainWindow.webContents.executeJavaScript(`const p=document.querySelector('.btn-prev');if(p){p.click();}`);
    });
    globalShortcut.register('CommandOrControl+Alt+Space', () => {
      if (mainWindow) mainWindow.webContents.executeJavaScript(`const b=document.querySelector('.btn-play');if(b){b.click();}`);
    });
  }

  // 托盘图标
  function createTray() {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'resources/icon.ico'));
    tray = new Tray(icon);
    tray.setToolTip('UG在线音乐播放器');
    const contextMenu = Menu.buildFromTemplate([
      { label: '显示主界面', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
      { label: '播放/暂停', click: () => { if (mainWindow) mainWindow.webContents.executeJavaScript(`const b=document.querySelector('.btn-play');if(b){b.click();}`); } },
      { label: '上一首', click: () => { if (mainWindow) mainWindow.webContents.executeJavaScript(`const p=document.querySelector('.btn-prev');if(p){p.click();}`); } },
      { label: '下一首', click: () => { if (mainWindow) mainWindow.webContents.executeJavaScript(`const n=document.querySelector('.btn-next');if(n){n.click();}`); } },
      { type: 'separator' },
      { label: '退出', click: () => { app.isQuitting = true; app.quit(); } }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
  }

  // 创建窗口
  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      icon: path.join(__dirname, 'resources/icon.ico'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        preload: path.join(__dirname, 'preload-minimal.js')
      }
    });

    mainWindow.loadURL('https://music.ug666.top');
    mainWindow.setTitle('UG在线音乐播放器');
    mainWindow.webContents.on('will-navigate', (e, u) => {
      if (!u.startsWith('https://music.ug666.top')) {
        e.preventDefault();
        require('electron').shell.openExternal(u);
      }
    });

    mainWindow.on('focus', () => { registerGlobalShortcuts(); });
    Menu.setApplicationMenu(null);
    mainWindow.on('close', (e) => {
      if (!app.isQuitting) {
        e.preventDefault();
        mainWindow.hide();
        return false;
      }
      return true;
    });
  }

  app.whenReady().then(() => {
    createWindow();
    createTray();
    setTimeout(registerGlobalShortcuts, 1000);
  });

  app.on('window-all-closed', () => {
    if (!app.isQuitting) return;
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('will-quit', () => { globalShortcut.unregisterAll(); });
  app.on('activate', () => { if (mainWindow === null) createWindow(); });
}
