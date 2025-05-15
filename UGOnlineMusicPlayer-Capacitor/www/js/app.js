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

    // 获取进度条元素
    const progressBar = document.getElementById('loading-progress');
    const loadingText = document.getElementById('loading-text');
    let progress = 0;

    // 模拟加载进度
    const progressInterval = setInterval(function () {
      progress += 2;
      // 最多加载到95%，等待实际加载完成再到100%
      if (progress >= 95) {
        clearInterval(progressInterval);
      } else {
        progressBar.style.width = progress + '%';
        if (progress < 30) {
          loadingText.textContent = '正在连接服务器...';
        } else if (progress < 60) {
          loadingText.textContent = '加载资源中...';
        } else if (progress < 90) {
          loadingText.textContent = '准备音乐播放器...';
        }
      }
    }, 300);

    // 设置加载超时处理
    clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(function () {
      // 如果30秒后还没加载完，显示错误
      if (loader.style.display !== 'none') {
        clearInterval(progressInterval);
        showLoadError();
      }
    }, 30000);    // 配置iframe加载事件
    appFrame.onload = function () {
      // 完成进度条动画
      const progressBar = document.getElementById('loading-progress');
      progressBar.style.width = '100%';
      document.getElementById('loading-text').textContent = '加载完成，正在启动...';

      setTimeout(function () {
        loader.style.display = 'none';
        appFrame.style.display = 'block';

        // 优化Android上的显示
        if (navigator.userAgent.toLowerCase().indexOf('android') > -1) {
          document.body.style.height = window.innerHeight + 'px';
          appFrame.style.height = window.innerHeight + 'px';
        }

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
    // 初始化屏幕尺寸
    const isAndroid = navigator.userAgent.toLowerCase().indexOf('android') > -1;
    if (isAndroid) {
      // 解决安卓端加载时样式问题
      document.body.style.height = window.innerHeight + 'px';
      appFrame.style.height = window.innerHeight + 'px';

      // 防止Android键盘改变窗口大小导致布局错误
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Keyboard) {
        window.Capacitor.Plugins.Keyboard.setResizeMode({ mode: 'none' });
      }
    }

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

  // 处理屏幕尺寸变化
  window.addEventListener('resize', function () {
    if (navigator.userAgent.toLowerCase().indexOf('android') > -1) {
      document.body.style.height = window.innerHeight + 'px';
      appFrame.style.height = window.innerHeight + 'px';
    }
  });

  // 如果没有触发deviceready事件（浏览器环境），也要初始化
  setTimeout(function () {
    initApp();
  }, 2000);
});
