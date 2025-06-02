/**
 * UG音乐播放器 Capacitor 版本 - 简化版
 * @version 3.0.0
 */

document.addEventListener('DOMContentLoaded', function () {
  var CONFIG = {
    MUSIC_URL: 'https://music.ug666.top',
    LOADING_TIMEOUT: 30000
  };

  var elements = {
    appFrame: document.getElementById('app-frame'),
    loader: document.getElementById('loader'),
    loadingProgress: document.getElementById('loading-progress'),
    offlineScreen: document.getElementById('offline-screen'),
    errorScreen: document.getElementById('error-screen'),
    retryButton: document.getElementById('retry-button'),
    errorRetryButton: document.getElementById('error-retry-button'),
    appContainer: document.getElementById('app-container')
  };

  var state = {
    isLoaded: false,
    progressInterval: null
  };

  // 初始化
  function init() {
    setupEventListeners();
    loadApp();
  }
  // 设置事件监听器
  function setupEventListeners() {
    // 重试按钮
    if (elements.retryButton) {
      elements.retryButton.addEventListener('click', function () {
        hideOfflineScreen();
        loadApp();
      });
    }

    if (elements.errorRetryButton) {
      elements.errorRetryButton.addEventListener('click', function () {
        hideErrorScreen();
        loadApp();
      });
    }

    // 网络状态监听
    window.addEventListener('online', function () {
      if (!state.isLoaded) {
        hideOfflineScreen();
        loadApp();
      }
    });

    window.addEventListener('offline', function () {
      showOfflineScreen();
    });
  }
  // 加载应用
  function loadApp() {
    showLoader();
    startProgressAnimation();

    if (elements.appFrame) {
      elements.appFrame.src = CONFIG.MUSIC_URL;

      elements.appFrame.onload = function () {
        stopProgressAnimation();
        hideLoader();
        showApp();
        state.isLoaded = true;
      };

      elements.appFrame.onerror = function () {
        stopProgressAnimation();
        showErrorScreen();
      };

      // 加载超时处理
      setTimeout(function () {
        if (!state.isLoaded) {
          stopProgressAnimation();
          showErrorScreen();
        }
      }, CONFIG.LOADING_TIMEOUT);
    }
  }

  // 进度条动画
  function startProgressAnimation() {
    if (elements.loadingProgress) {
      var progress = 0;
      state.progressInterval = setInterval(function () {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        elements.loadingProgress.style.width = progress + '%';
      }, 200);
    }
  }

  function stopProgressAnimation() {
    if (state.progressInterval) {
      clearInterval(state.progressInterval);
      state.progressInterval = null;
    }
    if (elements.loadingProgress) {
      elements.loadingProgress.style.width = '100%';
    }
  }

  // UI 控制函数
  function showLoader() {
    hideAllScreens();
    if (elements.loader) {
      elements.loader.style.display = 'flex';
    }
  }

  function hideLoader() {
    if (elements.loader) {
      elements.loader.style.display = 'none';
    }
  }

  function showOfflineScreen() {
    hideAllScreens();
    if (elements.offlineScreen) {
      elements.offlineScreen.style.display = 'flex';
    }
  }

  function hideOfflineScreen() {
    if (elements.offlineScreen) {
      elements.offlineScreen.style.display = 'none';
    }
  }

  function showErrorScreen() {
    hideAllScreens();
    if (elements.errorScreen) {
      elements.errorScreen.style.display = 'flex';
    }
  }

  function hideErrorScreen() {
    if (elements.errorScreen) {
      elements.errorScreen.style.display = 'none';
    }
  }

  function showApp() {
    hideAllScreens();
    if (elements.appContainer) {
      elements.appContainer.style.display = 'block';
    }
  }

  function hideAllScreens() {
    var screens = [elements.loader, elements.offlineScreen, elements.errorScreen];
    for (var i = 0; i < screens.length; i++) {
      if (screens[i]) {
        screens[i].style.display = 'none';
      }
    }
  }

  // 启动应用
  init();
});
