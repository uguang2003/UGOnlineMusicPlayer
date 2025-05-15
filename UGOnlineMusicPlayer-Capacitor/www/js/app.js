/**
 * UG音乐播放器 Capacitor 版本
 * 主程序逻辑 - 完全重写版本
 */

document.addEventListener('DOMContentLoaded', function() {
  const MUSIC_URL = 'https://music.ug666.top';
  const appContainer = document.getElementById('app-container');
  const appFrame = document.getElementById('app-frame');
  const loader = document.getElementById('loader');
  const offlineScreen = document.getElementById('offline-screen');
  const errorScreen = document.getElementById('error-screen');
  const retryButton = document.getElementById('retry-button');
  const errorRetryButton = document.getElementById('error-retry-button');
  
  let loadingProgress = 0;
  let loadingProgressBar = document.getElementById('loading-progress');
  let loadingText = document.getElementById('loading-text');
  let loadingInterval = null;
  let loadingTimeout = null;
  let appLoaded = false;
  
  // 应用初始化
  function initApp() {
    console.log('初始化UG音乐播放器应用...');
    
    // 设置容器和框架样式
    resetAppStyles();
    
    // 注册事件处理器
    registerEventHandlers();
    
    // 检查网络连接
    if (navigator.onLine) {
      loadApp();
    } else {
      showOfflineScreen();
    }
  }
  
  // 重置应用样式
  function resetAppStyles() {
    // 应用通用样式
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'manipulation';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.touchAction = 'manipulation';
    
    // 重置显示状态
    hideAllScreens();
    
    // 等待加载
    loader.style.display = 'flex';
    
    // 安卓特定样式
    if (isAndroid()) {
      applyAndroidStyles();
    }
    
    // iOS特定样式 
    if (isIOS()) {
      applyIOSStyles();
    }
  }
  
  // 注册事件处理器
  function registerEventHandlers() {
    // 页面可见性变更
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 网络状态变更
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // 页面尺寸变更
    window.addEventListener('resize', handleResize);
    
    // 设备方向变更
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // 重试按钮
    retryButton.addEventListener('click', handleRetry);
    errorRetryButton.addEventListener('click', handleRetry);
    
    // Capacitor特定回调
    document.addEventListener('deviceready', handleDeviceReady, false);
    document.addEventListener('backbutton', handleBackButton, false);
    
    // 超时保障 - 防止deviceready事件未触发
    // 设置一个2秒的超时，如果deviceready未触发，则手动初始化
    setTimeout(function() {
      if (!appLoaded) {
        console.log('未检测到deviceready事件，手动初始化...');
        handleDeviceReady();
      }
    }, 2000);
  }
  
  // 加载应用
  function loadApp() {
    console.log('加载UG音乐播放器...');
    appLoaded = false;
    
    // 重置显示状态
    hideAllScreens();
    loader.style.display = 'flex';
    
    // 重置进度条
    loadingProgress = 0;
    loadingProgressBar.style.width = '0%';
    loadingText.textContent = '正在启动UG音乐播放器...';
    
    // 开始进度条动画
    clearInterval(loadingInterval);
    loadingInterval = setInterval(updateLoadingProgress, 100);
    
    // 设置加载超时
    clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(function() {
      if (!appLoaded) {
        console.log('加载超时');
        clearInterval(loadingInterval);
        showErrorScreen('加载超时', '网络连接不稳定，请重试');
      }
    }, 30000);
    
    // 加载iframe
    appFrame.onload = handleFrameLoad;
    appFrame.onerror = handleFrameError;
    appFrame.src = MUSIC_URL;
  }
  
  // 更新加载进度
  function updateLoadingProgress() {
    // 递增进度，最大95%等待实际加载完成
    loadingProgress += (95 - loadingProgress) * 0.05;
    if (loadingProgress > 95) loadingProgress = 95;
    
    loadingProgressBar.style.width = loadingProgress + '%';
    
    // 根据进度更新文字
    if (loadingProgress < 30) {
      loadingText.textContent = '正在连接服务器...';
    } else if (loadingProgress < 60) {
      loadingText.textContent = '加载资源中...';
    } else if (loadingProgress < 90) {
      loadingText.textContent = '准备音乐播放器...';
    }
  }
  
  // 隐藏所有屏幕
  function hideAllScreens() {
    loader.style.display = 'none';
    offlineScreen.style.display = 'none';
    errorScreen.style.display = 'none';
    appContainer.style.display = 'none';
  }
  
  // 显示离线屏幕
  function showOfflineScreen() {
    console.log('显示离线屏幕');
    clearInterval(loadingInterval);
    clearTimeout(loadingTimeout);
    
    hideAllScreens();
    offlineScreen.style.display = 'flex';
  }
  
  // 显示错误屏幕
  function showErrorScreen(title, message) {
    console.log('显示错误屏幕:', title);
    clearInterval(loadingInterval);
    clearTimeout(loadingTimeout);
    
    hideAllScreens();
    
    // 更新错误消息
    const titleEl = errorScreen.querySelector('h2');
    const messageEl = errorScreen.querySelector('p');
    
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    
    errorScreen.style.display = 'flex';
  }
  
  // 显示应用框架
  function showAppFrame() {
    console.log('显示应用框架');
    hideAllScreens();
    
    appContainer.style.display = 'block';
    
    // 修复Android上的样式问题
    if (isAndroid()) {
      applyAndroidStyles();
    }
  }
  
  // 应用Android特定样式
  function applyAndroidStyles() {
    document.body.style.height = window.innerHeight + 'px';
    document.documentElement.style.height = window.innerHeight + 'px';
    appContainer.style.height = window.innerHeight + 'px';
    
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    
    // 防止键盘弹出后布局错乱
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Keyboard) {
      window.Capacitor.Plugins.Keyboard.setResizeMode({ mode: 'none' });
      window.Capacitor.Plugins.Keyboard.setScroll({ isDisabled: true });
    }
    
    // 设置状态栏
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
      window.Capacitor.Plugins.StatusBar.setStyle({ style: 'DARK' });
      window.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: '#000000' });
    }
  }
  
  // 应用iOS特定样式
  function applyIOSStyles() {
    // iOS特定调整
    document.body.style.webkitOverflowScrolling = 'touch';
    
    // 状态栏调整
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
      window.Capacitor.Plugins.StatusBar.setStyle({ style: 'DARK' });
    }
  }
  
  // ====== 事件处理程序 ======
  
  // 处理iframe加载完成
  function handleFrameLoad() {
    console.log('iframe加载完成');
    loadingProgress = 100;
    loadingProgressBar.style.width = '100%';
    loadingText.textContent = '加载完成！';
    
    // 初始化桥接
    window.UGBridge.init(appFrame);
    
    // 等待桥接完成事件
    window.UGBridge.addEventListener('initialized', function() {
      console.log('桥接初始化完成');
      appLoaded = true;
      
      clearInterval(loadingInterval);
      clearTimeout(loadingTimeout);
      
      // 延迟显示，确保动画和样式应用完成
      setTimeout(showAppFrame, 500);
    });
    
    // 同时设置超时，确保即使桥接失败也能显示
    setTimeout(function() {
      if (!appLoaded) {
        console.log('桥接超时，但iframe已加载，继续显示');
        appLoaded = true;
        clearInterval(loadingInterval);
        clearTimeout(loadingTimeout);
        showAppFrame();
      }
    }, 3000);
  }
  
  // 处理iframe加载错误
  function handleFrameError() {
    console.log('iframe加载失败');
    clearInterval(loadingInterval);
    showErrorScreen('加载失败', '无法加载UG音乐播放器，请检查网络连接或重试');
  }
  
  // 处理页面可见性变更
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // 页面从后台恢复
      console.log('页面恢复可见');
      
      // 如果还未加载完成，检查网络
      if (!appLoaded) {
        if (navigator.onLine) {
          loadApp();
        } else {
          showOfflineScreen();
        }
      }
    }
  }
  
  // 处理网络连接恢复
  function handleOnline() {
    console.log('网络连接已恢复');
    
    // 如果App未加载或显示错误，尝试重新加载
    if (!appLoaded || offlineScreen.style.display === 'flex' || errorScreen.style.display === 'flex') {
      loadApp();
    }
  }
  
  // 处理网络连接断开
  function handleOffline() {
    console.log('网络连接已断开');
    
    // 如果App未加载，显示离线屏幕
    if (!appLoaded) {
      showOfflineScreen();
    }
  }
  
  // 处理重试
  function handleRetry() {
    console.log('用户点击重试');
    
    if (navigator.onLine) {
      loadApp();
    } else {
      showOfflineScreen();
    }
  }
  
  // 处理设备尺寸变更
  function handleResize() {
    console.log('设备尺寸已变更');
    
    // 主要处理Android
    if (isAndroid()) {
      applyAndroidStyles();
    }
  }
  
  // 处理设备方向变更
  function handleOrientationChange() {
    console.log('设备方向已变更');
    
    // 等待方向变更完成
    setTimeout(function() {
      if (isAndroid()) {
        applyAndroidStyles();
      }
    }, 300);
  }
  
  // 处理设备就绪
  function handleDeviceReady() {
    if (appLoaded) return;
    
    console.log('设备就绪');
    appLoaded = true;
    
    // 初始化Capacitor插件
    initCapacitorPlugins();
    
    // 加载应用
    loadApp();
  }
  
  // 初始化Capacitor插件
  function initCapacitorPlugins() {
    // 处理网络状态变化
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Network) {
      window.Capacitor.Plugins.Network.addListener('networkStatusChange', function(status) {
        console.log('网络状态变更:', status);
        
        if (status.connected) {
          if (!appLoaded || offlineScreen.style.display === 'flex') {
            loadApp();
          }
        } else {
          if (!appLoaded) {
            showOfflineScreen();
          }
        }
      });
    }
  }
  
  // 处理返回按钮
  function handleBackButton(e) {
    // 防止默认行为（退出应用）
    e.preventDefault();
    
    console.log('捕获到返回按钮');
    
    // 如果显示离线或错误屏幕，则退出应用
    if (offlineScreen.style.display === 'flex' || errorScreen.style.display === 'flex') {
      exitApp();
      return;
    }
    
    // 尝试使用桥接返回
    if (window.UGBridge && window.UGBridge.iframe) {
      try {
        const iframeWindow = window.UGBridge.iframe.contentWindow;
        
        // 检查iframe是否有历史记录可以返回
        if (iframeWindow && iframeWindow.history && iframeWindow.history.length > 1) {
          console.log('iframe返回上一页');
          iframeWindow.history.back();
        } else {
          // 没有历史记录，询问用户是否要退出
          confirmExit();
        }
      } catch (error) {
        console.error('尝试访问iframe历史记录失败:', error);
        confirmExit();
      }
    } else {
      confirmExit();
    }
  }
  
  // 确认退出
  function confirmExit() {
    if (confirm('确定要退出UG音乐播放器吗？')) {
      exitApp();
    }
  }
  
  // 退出应用
  function exitApp() {
    console.log('退出应用');
    if (navigator && navigator.app) {
      navigator.app.exitApp();
    }
  }
  
  // ====== 工具函数 ======
  
  // 判断是否为Android设备
  function isAndroid() {
    return /android/i.test(navigator.userAgent);
  }
  
  // 判断是否为iOS设备
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }
  
  // 启动应用
  initApp();
});
