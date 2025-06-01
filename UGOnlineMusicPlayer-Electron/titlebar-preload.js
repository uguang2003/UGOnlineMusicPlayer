// titlebar-preload.js
// 标题栏预加载脚本，提供与主进程通信的API
const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('titlebarAPI', {
  // 窗口控制
  minimizeWindow: () => {
    ipcRenderer.send('minimize-window');
  },

  maximizeWindow: () => {
    ipcRenderer.send('maximize-window');
  },

  closeWindow: () => {
    ipcRenderer.send('close-window');
  },
  // 显示设置窗口
  showSettings: () => {
    ipcRenderer.send('show-settings');
  },

  // 显示右键菜单
  showContextMenu: () => {
    ipcRenderer.send('show-context-menu');
  },

  // 获取窗口状态
  getWindowState: async () => {
    return await ipcRenderer.invoke('get-window-state');
  },

  // 监听窗口状态变化
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window-state-changed', (event, isMaximized) => {
      callback(isMaximized);
    });
  },

  // 设置
  isAutoLaunch: async () => {
    return await ipcRenderer.invoke('get-auto-launch');
  },

  setAutoLaunch: (enable) => {
    ipcRenderer.send('set-auto-launch', enable);
  },

  // 应用信息
  getAppVersion: () => {
    try {
      const packageJson = require('./package.json');
      return packageJson.version || '1.0.1';
    } catch (e) {
      return '1.0.1';
    }
  }
});
