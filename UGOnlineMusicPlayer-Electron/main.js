// 引入电子模块
const { app, BrowserWindow, Menu, session, globalShortcut, Tray, nativeImage, ipcMain, BrowserView } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const os = require('os');

// 标记应用是否正在退出
app.isQuitting = false;

// 保持对window对象的全局引用
let mainWindow;
let titleBarView;
let contentView;
let settingsWindow = null; // 设置窗口
let tray = null;
const TITLE_BAR_HEIGHT = 32; // 标题栏高度

// 配置文件路径
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

// 默认配置
const DEFAULT_CONFIG = {
  autoLaunch: false,
  closeToTray: true  // true: 关闭到托盘, false: 直接退出
};

// 读取配置
function getConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    console.error('读取配置失败:', error);
  }
  return DEFAULT_CONFIG;
}

// 保存配置
function saveConfig(config) {
  try {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('保存配置失败:', error);
  }
}

// 获取自启动配置
function getAutoLaunchConfig() {
  return getConfig();
}

// 保存自启动配置
function saveAutoLaunchConfig(autoLaunch) {
  const config = getConfig();
  config.autoLaunch = autoLaunch;
  saveConfig(config);
}

// 保存关闭行为配置
function saveCloseToTrayConfig(closeToTray) {
  const config = getConfig();
  config.closeToTray = closeToTray;
  saveConfig(config);
}

// 实现单实例锁定，确保应用不能多开
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 如果无法获取锁，说明已经有另一个实例在运行，直接退出当前应用
  app.quit();
} else {
  // 当其他实例尝试启动时，我们应该聚焦到我们的窗口
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 有人试图运行第二个实例，我们应该聚焦到我们的窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.show();
    }
  });

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
        label: '播放/暂停(Ctrl+Alt+Space)',
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
        label: '上一首(Ctrl+Alt+Left)',
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
        label: '下一首 (Ctrl+Alt+Right)',
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

  // 创建设置窗口
  function createSettingsWindow() {
    // 如果设置窗口已存在，则聚焦它
    if (settingsWindow) {
      settingsWindow.focus();
      return;
    }

    settingsWindow = new BrowserWindow({
      width: 480,
      height: 600,
      parent: mainWindow, // 设置为主窗口的子窗口
      modal: true, // 模态窗口
      resizable: false,
      minimizable: false,
      maximizable: false,
      autoHideMenuBar: true,
      frame: false, // 无边框
      titleBarStyle: 'hidden',
      backgroundColor: '#1a1a1a',
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        preload: path.join(__dirname, 'settings-preload.js')
      }
    });

    // 加载设置页面
    settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

    // 窗口准备就绪时显示
    settingsWindow.once('ready-to-show', () => {
      settingsWindow.show();
      settingsWindow.center(); // 居中显示
    });

    // 窗口关闭时清理引用
    settingsWindow.on('closed', () => {
      settingsWindow = null;
    });

    // 添加拖拽区域
    settingsWindow.webContents.once('did-finish-load', () => {
      settingsWindow.webContents.insertCSS(`
        body { -webkit-app-region: drag; }
        button, input, label { -webkit-app-region: no-drag; }
        .toggle-switch { -webkit-app-region: no-drag; }
      `);
    });
  }  // 创建主窗口
  function createWindow() {
    // 创建浏览器窗口，使用无边框
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      icon: path.join(__dirname, 'resources/icon.ico'),
      frame: false, // 无边框窗口
      show: false, // 初始时不显示，等内容加载完成后再显示
      backgroundColor: '#1a1a1a', // 深色背景，和标题栏保持一致
      transparent: false, // 禁用透明以确保最大化功能正常
      resizable: true,
      maximizable: true,
      minimizable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,  // 允许跨域请求
        webviewTag: true,
        devTools: true,  // 允许开发者工具
        preload: path.join(__dirname, 'preload.js')  // 预加载脚本
      }
    });

    // 先创建内容视图
    createContentView();    // 再创建标题栏视图（确保标题栏在上层）
    createTitleBarView();

    // 调整视图布局
    resizeViews();// 窗口大小变化时，调整视图布局
    mainWindow.on('resize', resizeViews);

    // 窗口最大化/还原时，更新标题栏最大化按钮
    mainWindow.on('maximize', () => {
      if (titleBarView && titleBarView.webContents) {
        titleBarView.webContents.send('window-state-changed', true);
      }
    });

    mainWindow.on('unmaximize', () => {
      if (titleBarView && titleBarView.webContents) {
        titleBarView.webContents.send('window-state-changed', false);
      }
    });// 允许打开开发者工具
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key.toLowerCase() === 'f12') {
        contentView.webContents.openDevTools();
        event.preventDefault();
      }
    });

    // 设置窗口标题
    mainWindow.setTitle('UG在线音乐播放器');

    // 监听关闭事件，根据配置决定是否隐藏窗口
    mainWindow.on('close', (event) => {
      // 如果不是真正要退出应用，则根据配置决定行为
      if (!app.isQuitting) {
        const config = getConfig();
        if (config.closeToTray) {
          // 最小化到托盘
          event.preventDefault();
          mainWindow.hide();
        } else {
          // 直接退出应用
          app.isQuitting = true;
          app.quit();
        }
        return false;
      }
      return true;
    });

    // 当窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

    // 当 window 被关闭，这个事件会被触发
    mainWindow.on('closed', function () {
      // 取消引用 window 对象
      mainWindow = null;
      titleBarView = null; contentView = null;
    });
  }

  // 创建标题栏视图
  function createTitleBarView() {
    titleBarView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        preload: path.join(__dirname, 'titlebar-preload.js'),
        backgroundThrottling: false,
        transparent: true
      }
    });

    mainWindow.addBrowserView(titleBarView);
    titleBarView.setBounds({ x: 0, y: 0, width: mainWindow.getBounds().width, height: TITLE_BAR_HEIGHT });
    titleBarView.setAutoResize({ width: true });    // 设置背景和主窗口一致
    titleBarView.setBackgroundColor('#1a1a1a');

    // 加载标题栏HTML
    titleBarView.webContents.loadFile(path.join(__dirname, 'titlebar.html'));

    // 标题栏加载完成后，同步初始窗口状态
    titleBarView.webContents.once('did-finish-load', () => {
      // 等待一下确保DOM完全加载
      setTimeout(() => {
        const currentMaximized = mainWindow.isMaximized();
        titleBarView.webContents.send('window-state-changed', currentMaximized);
      }, 50);
    });    // 阻止新窗口打开
    titleBarView.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  }

  // 创建内容视图
  function createContentView() {
    contentView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,  // 允许跨域请求
        webviewTag: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    mainWindow.addBrowserView(contentView);

    // 设置内容区域大小 - 从顶部开始显示，让背景能渗透到标题栏
    const mainBounds = mainWindow.getBounds();
    contentView.setBounds({
      x: 0,
      y: 0, // 从顶部开始
      width: mainBounds.width,
      height: mainBounds.height // 全高度
    });    // 自动调整大小
    contentView.setAutoResize({ width: true, height: true });

    // 加载主页面
    contentView.webContents.loadURL('https://music.ug666.top');

    // 注入CSS，优化透明标题栏的显示
    contentView.webContents.once('did-finish-load', () => {
      contentView.webContents.insertCSS(`
        /* 确保页面顶部内容不被标题栏遮挡 */
        .header {
          margin-top: ${TITLE_BAR_HEIGHT}px !important;
        }
        
        /* 如果没有header元素，则给center容器添加顶部边距 */
        .center {
          padding-top: ${TITLE_BAR_HEIGHT}px !important;
          box-sizing: border-box !important;
        }
        
        /* 移动端适配：避免重复添加边距 */
        @media screen and (max-width: 900px) {
          .center {
            padding-top: ${TITLE_BAR_HEIGHT}px !important;
            top: 0 !important;
          }
        }
        
        /* 确保背景可以延伸到标题栏下方 */
        body {
          background-attachment: fixed !important;
        }
        
        /* 优化模糊背景的显示 */
        #blur-img {
          top: -${TITLE_BAR_HEIGHT}px !important;
          height: calc(100% + ${TITLE_BAR_HEIGHT}px) !important;
        }
      `);
    });

    // 处理页面内导航
    contentView.webContents.on('will-navigate', (event, url) => {
      // 允许导航到同源网站
      if (url.startsWith('https://music.ug666.top')) {
        // 允许导航
      } else {
        // 其他链接使用默认浏览器打开
        event.preventDefault();
        require('electron').shell.openExternal(url);
      }
    });
  }

  // 调整视图大小
  function resizeViews() {
    if (!mainWindow || !titleBarView || !contentView) return;

    const mainBounds = mainWindow.getBounds();

    // 先调整内容视图（全屏显示）
    contentView.setBounds({
      x: 0,
      y: 0,
      width: mainBounds.width,
      height: mainBounds.height
    });

    // 再调整标题栏视图（覆盖在上层）
    titleBarView.setBounds({
      x: 0,
      y: 0,
      width: mainBounds.width, height: TITLE_BAR_HEIGHT
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
    });    // 移除顶部菜单栏
    Menu.setApplicationMenu(null);

    // 为窗口设置系统菜单（右键菜单）
    const systemMenu = Menu.buildFromTemplate([
      {
        label: '还原',
        enabled: false,
        click: () => {
          if (mainWindow && mainWindow.isMaximized()) {
            mainWindow.unmaximize();
          }
        }
      },
      {
        label: '移动',
        enabled: false
      },
      {
        label: '大小',
        enabled: false
      },
      {
        label: '最小化',
        click: () => {
          if (mainWindow) {
            mainWindow.minimize();
          }
        }
      },
      {
        label: '最大化',
        click: () => {
          if (mainWindow && !mainWindow.isMaximized()) {
            mainWindow.maximize();
          }
        }
      },
      { type: 'separator' },
      {
        label: '关闭    Alt+F4',
        click: () => {
          if (mainWindow) {
            mainWindow.close();
          }
        }
      }
    ]);    // 更新系统菜单状态
    function updateSystemMenu() {
      if (mainWindow) {
        const isMaximized = mainWindow.isMaximized();
        systemMenu.items[0].enabled = isMaximized; // 还原
        systemMenu.items[4].enabled = !isMaximized; // 最大化
      }
    }

    createWindow();

    // 在创建窗口后监听窗口状态变化以更新菜单
    if (mainWindow) {
      mainWindow.on('maximize', updateSystemMenu);
      mainWindow.on('unmaximize', updateSystemMenu);
    }

    // 创建系统托盘
    createTray();

    // 延迟注册快捷键，确保页面已完全加载
    setTimeout(() => {
      registerGlobalShortcuts();
    }, 3000);

    // 设置IPC处理函数
    setupIPC();
  });
  // 设置IPC通信
  function setupIPC() {
    // 窗口控制
    ipcMain.on('minimize-window', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('最小化窗口');
        mainWindow.minimize();
      }
    }); ipcMain.on('maximize-window', () => {
      if (mainWindow) {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
      }
    });

    ipcMain.on('close-window', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const config = getConfig();
        if (app.isQuitting || !config.closeToTray) {
          mainWindow.close();
        } else {
          mainWindow.hide();
        }
      }
    });

    // 获取窗口状态
    ipcMain.handle('get-window-state', async () => {
      if (mainWindow) {
        return mainWindow.isMaximized();
      }
      return false;
    });    // 设置对话框
    ipcMain.on('show-settings', () => {
      createSettingsWindow();
    });

    // 显示右键菜单
    ipcMain.on('show-context-menu', (event) => {
      if (mainWindow) {
        const isMaximized = mainWindow.isMaximized();
        const contextMenu = Menu.buildFromTemplate([
          {
            label: '还原',
            enabled: isMaximized,
            click: () => {
              if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
              }
            }
          },
          {
            label: '最小化',
            click: () => {
              mainWindow.minimize();
            }
          },
          {
            label: '最大化',
            enabled: !isMaximized,
            click: () => {
              if (!mainWindow.isMaximized()) {
                mainWindow.maximize();
              }
            }
          },
          { type: 'separator' },
          {
            label: '关闭',
            click: () => {
              mainWindow.close();
            }
          }
        ]);
        contextMenu.popup();
      }
    });

    // 关闭设置窗口
    ipcMain.on('close-settings-window', () => {
      if (settingsWindow) {
        settingsWindow.close();
      }
    });

    // 获取自启动状态
    ipcMain.handle('get-auto-launch', async () => {
      return getAutoLaunchConfig().autoLaunch;
    });

    // 获取关闭行为配置
    ipcMain.handle('get-close-to-tray', async () => {
      return getConfig().closeToTray;
    });

    // 设置自启动
    ipcMain.on('set-auto-launch', (event, enable) => {
      saveAutoLaunchConfig(enable);

      // 设置开机自启动
      const startupPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
      const shortcutPath = path.join(startupPath, 'UG在线音乐播放器.lnk');

      try {
        if (enable) {
          // 创建快捷方式用于自启动
          const { shell } = require('electron');
          shell.writeShortcutLink(shortcutPath, {
            target: process.execPath,
            args: '',
            description: 'UG在线音乐播放器',
            icon: path.join(__dirname, 'resources/icon.ico'),
            iconIndex: 0
          });
        } else {
          // 删除自启动快捷方式
          if (fs.existsSync(shortcutPath)) {
            fs.unlinkSync(shortcutPath);
          }
        }
      } catch (error) {
        console.error('设置自启动失败:', error);
      }
    });

    // 设置关闭行为
    ipcMain.on('set-close-to-tray', (event, closeToTray) => {
      saveCloseToTrayConfig(closeToTray);
    });
  }

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
}
