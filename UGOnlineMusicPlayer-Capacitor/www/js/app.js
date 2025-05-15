// UG音乐播放器 Capacitor版本
// 主程序逻辑

document.addEventListener('DOMContentLoaded', function () {
  const MUSIC_URL = 'https://music.ug666.top';
  const appFrame = document.getElementById('app-frame');
  const loader = document.getElementById('loader');
  const offlineScreen = document.getElementById('offline-screen');
  const retryButton = document.getElementById('retry-button');

  let loadingTimeout;

  // 检测网络状态
  function checkNetwork() {
    if (navigator.onLine) {
      loadWebApp();
    } else {
      showOfflineScreen();
    }
  }

  // 加载Web应用
  function loadWebApp() {
    offlineScreen.style.display = 'none';
    loader.style.display = 'flex';

    // 设置加载超时处理
    clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(function () {
      // 如果30秒后还没加载完，显示错误
      if (loader.style.display !== 'none') {
        showLoadError();
      }
    }, 30000);

    // 配置iframe加载事件
    appFrame.onload = function () {
      setTimeout(function () {
        loader.style.display = 'none';
        appFrame.style.display = 'block';
        clearTimeout(loadingTimeout);
      }, 1000); // 添加短暂延迟，确保页面已完全渲染
    };

    appFrame.onerror = function () {
      showLoadError();
    };

    // 加载音乐播放器网站
    appFrame.src = MUSIC_URL;
  }

  // 显示离线状态
  function showOfflineScreen() {
    loader.style.display = 'none';
    appFrame.style.display = 'none';
    offlineScreen.style.display = 'flex';
    clearTimeout(loadingTimeout);

    // 更新UI显示网络错误信息
    offlineScreen.querySelector('h2').textContent = '网络连接已断开';
    offlineScreen.querySelector('p').textContent = '请检查您的网络连接并重试';
  }

  // 显示加载错误
  function showLoadError() {
    loader.style.display = 'none';
    appFrame.style.display = 'none';
    offlineScreen.style.display = 'flex';
    clearTimeout(loadingTimeout);

    // 更新UI显示加载错误信息
    offlineScreen.querySelector('h2').textContent = '加载失败';
    offlineScreen.querySelector('p').textContent = '无法加载UG音乐播放器，请检查网络连接或重试';
  }

  // 绑定重试按钮事件
  retryButton.addEventListener('click', function () {
    checkNetwork();
  });

  // 监听网络状态变化
  window.addEventListener('online', checkNetwork);
  window.addEventListener('offline', function () {
    showOfflineScreen();
  });

  // 处理Android返回按钮
  document.addEventListener('backbutton', function (e) {
    // 防止默认行为（退出应用）
    e.preventDefault();

    // 如果显示离线屏幕，则退出应用
    if (offlineScreen.style.display === 'flex') {
      if (navigator && navigator.app) {
        navigator.app.exitApp();
      }
      return;
    }

    // 尝试获取iframe内容的历史记录
    try {
      const iframeWindow = appFrame.contentWindow;
      if (iframeWindow && iframeWindow.history && iframeWindow.history.length > 1) {
        // iframe有历史记录，返回上一页
        iframeWindow.history.back();
      } else {
        // 没有历史记录，询问用户是否要退出
        if (confirm('确定要退出UG音乐播放器吗？')) {
          if (navigator && navigator.app) {
            navigator.app.exitApp();
          }
        }
      }
    } catch (error) {
      // 如果无法访问iframe（通常是因为跨域限制），询问用户是否要退出
      if (confirm('确定要退出UG音乐播放器吗？')) {
        if (navigator && navigator.app) {
          navigator.app.exitApp();
        }
      }
    }
  }, false);

  // 初始化应用
  function initApp() {
    // 检查网络状态
    checkNetwork();

    // 如果有Capacitor Network插件，监听网络状态变化
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Network) {
      window.Capacitor.Plugins.Network.addListener('networkStatusChange', function (status) {
        if (status.connected) {
          loadWebApp();
        } else {
          showOfflineScreen();
        }
      });

      // 获取当前网络状态
      window.Capacitor.Plugins.Network.getStatus().then(function (status) {
        if (status.connected) {
          loadWebApp();
        } else {
          showOfflineScreen();
        }
      });
    }
  }

  // 当设备就绪时初始化
  document.addEventListener('deviceready', initApp, false);

  // 如果没有触发deviceready事件（浏览器环境），也要初始化
  setTimeout(function () {
    initApp();
  }, 2000);
});
