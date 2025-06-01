// settings-preload.js
// 设置窗口预加载脚本，提供与主进程通信的API
const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('settingsAPI', {
  // 设置相关
  isAutoLaunch: async () => {
    console.log('设置窗口: 检查自启动设置');
    return await ipcRenderer.invoke('get-auto-launch');
  },

  setAutoLaunch: (enable) => {
    console.log('设置窗口: 设置自启动', enable);
    ipcRenderer.send('set-auto-launch', enable);
  },

  isCloseToTray: async () => {
    console.log('设置窗口: 检查关闭行为设置');
    return await ipcRenderer.invoke('get-close-to-tray');
  },

  setCloseToTray: (enable) => {
    console.log('设置窗口: 设置关闭行为', enable);
    ipcRenderer.send('set-close-to-tray', enable);
  },

  // 窗口控制
  closeWindow: () => {
    console.log('设置窗口: 关闭窗口');
    ipcRenderer.send('close-settings-window');
  },

  // 应用信息
  getAppVersion: () => {
    try {
      const packageJson = require('./package.json');
      return packageJson.version || '1.0.2';
    } catch (e) {
      console.error('设置窗口: 获取版本信息失败', e);
      return '1.0.2';
    }
  }
});
