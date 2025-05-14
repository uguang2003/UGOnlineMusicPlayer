// 引入电子模块
const { app, BrowserWindow, Menu, session, globalShortcut, Tray, nativeImage } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

// 标记应用是否正在退出
app.isQuitting = false;

// 保持对window对象的全局引用，如果不这样做的话，当JavaScript对象被
// 垃圾回收的时候，window对象将会自动的关闭
let mainWindow;
let tray = null;

// 注册全局快捷键的函数 - 分离到独立函数，便于需要时重新注册
function registerGlobalShortcuts() {
  // 先解除所有已注册的快捷键，防止重复注册
  globalShortcut.unregisterAll();

  // 下一首歌: Ctrl+Alt+右箭头
  globalShortcut.register('CommandOrControl+Alt+Right', () => {
    if (mainWindow) {
      // 直接点击下一首按钮，这是最可靠的方法
      mainWindow.webContents.executeJavaScript(`
        (function() {
          const nextButton = document.querySelector('.btn-next');
          if (nextButton) {
            nextButton.click();
            return true;
          }
          return false;
        })();
      `).then(result => {
        // console.log('下一首按钮点击' + (result ? '成功' : '失败'));
      }).catch(err => console.error('执行JavaScript失败:', err));
    }
  });

  // 上一首歌: Ctrl+Alt+左箭头
  globalShortcut.register('CommandOrControl+Alt+Left', () => {
    if (mainWindow) {
      // 直接点击上一首按钮
      mainWindow.webContents.executeJavaScript(`
        (function() {
          const prevButton = document.querySelector('.btn-prev');
          if (prevButton) {
            prevButton.click();
            return true;
          }
          return false;
        })();
      `).then(result => {
        // console.log('上一首按钮点击' + (result ? '成功' : '失败'));
      }).catch(err => console.error('执行JavaScript失败:', err));
    }
  });

  // 播放/暂停: Ctrl+Alt+空格
  globalShortcut.register('CommandOrControl+Alt+Space', () => {
    if (mainWindow) {
      // 直接点击播放/暂停按钮
      mainWindow.webContents.executeJavaScript(`
        (function() {
          const playButton = document.querySelector('.btn-play');
          if (playButton) {
            playButton.click();
            return true;
          }
          return false;
        })();
      `).then(result => {
        // console.log('播放/暂停按钮点击' + (result ? '成功' : '失败'));
      }).catch(err => console.error('执行JavaScript失败:', err));
    }
  });
}

// 创建系统托盘图标
function createTray() {
  // 创建托盘图标
  const iconPath = path.join(__dirname, 'resources/icon.ico');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);

  // 设置托盘图标提示文本
  tray.setToolTip('UG在线音乐播放器');

  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主界面',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '播放/暂停',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.executeJavaScript(`
            (function() {
              const playButton = document.querySelector('.btn-play');
              if (playButton) {
                playButton.click();
                return true;
              }
              return false;
            })();
          `);
        }
      }
    },
    {
      label: '上一首',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.executeJavaScript(`
            (function() {
              const prevButton = document.querySelector('.btn-prev');
              if (prevButton) {
                prevButton.click();
                return true;
              }
              return false;
            })();
          `);
        }
      }
    },
    {
      label: '下一首',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.executeJavaScript(`
            (function() {
              const nextButton = document.querySelector('.btn-next');
              if (nextButton) {
                nextButton.click();
                return true;
              }
              return false;
            })();
          `);
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        // 真正退出应用
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  // 设置托盘图标的上下文菜单
  tray.setContextMenu(contextMenu);

  // 点击托盘图标显示主界面
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'resources/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,  // 允许跨域请求
      webviewTag: true,
      devTools: true,  // 允许开发者工具
      preload: path.join(__dirname, 'preload.js')  // 预加载脚本
    }
  });

  // 允许打开开发者工具
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key.toLowerCase() === 'f12') {
      mainWindow.webContents.openDevTools();
      event.preventDefault();
    }
  });

  // 加载在线网站URL
  mainWindow.loadURL('https://music.ug666.top');

  // 设置窗口标题
  mainWindow.setTitle('UG在线音乐播放器');

  // 处理页面内导航
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // 允许导航到同源网站
    if (url.startsWith('https://music.ug666.top')) {
      // 允许导航
    } else {
      // 其他链接使用默认浏览器打开
      event.preventDefault();
      require('electron').shell.openExternal(url);
    }
  });

  // 当窗口重新获得焦点时，确保快捷键正常工作
  mainWindow.on('focus', () => {
    // console.log('窗口获得焦点，重新注册快捷键');
    registerGlobalShortcuts();
  });

  // 允许加载远程内容
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['*://*/*'] },
    (details, callback) => {
      callback({ requestHeaders: details.requestHeaders });
    }
  );
  // 移除顶部菜单栏
  Menu.setApplicationMenu(null);

  // 监听关闭事件，改为隐藏窗口而不是关闭应用
  mainWindow.on('close', (event) => {
    // 如果不是真正要退出应用，则阻止默认行为
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });

  // 当 window 被关闭，这个事件会被触发
  mainWindow.on('closed', function () {
    // 取消引用 window 对象，如果你的应用支持多窗口的话，
    // 通常会把多个 window 对象存放在一个数组里面，
    // 与此同时，你应该删除相应的元素。
    mainWindow = null;
  });
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用这个方法
app.whenReady().then(() => {
  // 设置CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https: http:; img-src 'self' data: https: http:;"]
      }
    });
  });

  createWindow();

  // 创建系统托盘
  createTray();

  // 延迟注册快捷键，确保页面已完全加载
  setTimeout(() => {
    registerGlobalShortcuts();
  }, 3000);
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  // 解除所有注册的全局快捷键
  globalShortcut.unregisterAll();

  // 如果用户没有明确要求退出应用（通过托盘菜单），则不退出应用
  if (!app.isQuitting) {
    return;
  }

  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活。
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  // 解除所有注册的全局快捷键
  globalShortcut.unregisterAll();
});

app.on('activate', function () {
  // 在macOS上，当单击dock图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口。
  if (mainWindow === null) createWindow();
});
