/**
 * UG音乐播放器 - 桥接脚本
 * 处理iframe通信和平台兼容性问题
 */

// 桥接通信对象
window.UGBridge = {
  // 当前版本
  version: '1.0.0',

  // 是否为Android设备
  isAndroid: /android/i.test(navigator.userAgent),

  // 是否为iOS设备
  isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent),

  // 是否已初始化
  initialized: false,

  // 缓存的iframe引用
  iframe: null,

  // 缓存的iframe文档对象
  iframeDoc: null,

  // 事件监听器存储
  eventListeners: {},

  // 初始化桥接
  init: function (iframe) {
    if (this.initialized) return;

    console.log('[UGBridge] 初始化桥接...');

    this.iframe = iframe;
    this.setupIframeListeners();

    // 等待iframe加载完成
    iframe.addEventListener('load', () => {
      try {
        this.iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        console.log('[UGBridge] iframe已加载');

        // 等待DOM完全可用
        setTimeout(() => {
          this.injectBridgeScripts();

          // 发送初始化完成事件
          this.dispatchEvent('initialized', {
            platform: this.isAndroid ? 'android' : (this.isIOS ? 'ios' : 'other')
          });
        }, 500);
      } catch (e) {
        console.error('[UGBridge] 无法访问iframe内容:', e);
      }
    });

    this.initialized = true;
  },

  // 设置iframe监听器
  setupIframeListeners: function () {
    // 监听来自iframe的消息
    window.addEventListener('message', (event) => {
      if (!event.data || typeof event.data !== 'object') return;

      // 解析UG消息
      if (event.data.type && event.data.type.startsWith('ug_')) {
        console.log('[UGBridge] 收到消息:', event.data);
        this.handleUGMessage(event.data);
      }
    });
  },

  // 处理UG消息
  handleUGMessage: function (message) {
    switch (message.type) {
      case 'ug_navigation':
        // 处理导航消息
        console.log('[UGBridge] 处理导航:', message.url);
        break;

      case 'ug_player_state':
        // 处理播放器状态变化
        this.dispatchEvent('playerStateChanged', message.data);
        break;

      default:
        // 转发其他消息
        this.dispatchEvent(message.type.replace('ug_', ''), message.data);
    }
  },

  // 向iframe注入桥接脚本
  injectBridgeScripts: function () {
    if (!this.iframeDoc) return;

    try {
      // 注入样式修复
      this.injectStyles();

      // 注入通信脚本
      const script = this.iframeDoc.createElement('script');
      script.textContent = this.getClientScript();
      this.iframeDoc.head.appendChild(script);

      console.log('[UGBridge] 已注入桥接脚本');

      // 在Android上应用特定修复
      if (this.isAndroid) {
        this.applyAndroidFixes();
      }

      // 在iOS上应用特定修复
      if (this.isIOS) {
        this.applyIOSFixes();
      }
    } catch (e) {
      console.error('[UGBridge] 注入脚本失败:', e);
    }
  },

  // 注入CSS样式修复
  injectStyles: function () {
    if (!this.iframeDoc) return;

    const style = this.iframeDoc.createElement('style');
    style.textContent = `
      /* 通用样式修复 */
      * {
        -webkit-tap-highlight-color: transparent !important;
      }
      
      /* 修复公告按钮样式 */
      .btn-placard {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 36px !important;
      }
      
      /* 修复表单输入问题 */
      input[type="text"], input[type="password"], input[type="number"] {
        -webkit-appearance: none !important;
        appearance: none !important;
        border-radius: 4px !important;
        padding: 6px 8px !important;
        font-size: 16px !important;
      }
      
      /* 修复触摸区域问题 */
      .player-btn, .btn, button, a {
        min-height: 36px !important;
        min-width: 36px !important;
      }
      
      /* 修复滚动问题 */
      .mCSB_container {
        -webkit-overflow-scrolling: touch !important;
      }
      
      /* 修复弹窗层级问题 */
      .layui-layer {
        z-index: 99999 !important;
      }
      
      /* 修复清除缓存输入框问题 */
      #cache-key {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        -webkit-text-security: none !important;
        input-security: none !important;
      }
      
      /* 防止按钮文本溢出 */
      button, .btn {
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      
      /* 修复弹窗输入框样式 */
      .layui-layer-content input {
        margin: 5px auto !important;
        width: 90% !important;
        display: block !important;
        padding: 8px !important;
      }
    `;

    this.iframeDoc.head.appendChild(style);
  },

  // 获取注入到iframe内的客户端脚本
  getClientScript: function () {
    return `
      (function() {
        // 防止重复注入
        if (window.UGClient) return;
        
        console.log('UG音乐播放器客户端桥接初始化');
        
        // 创建客户端对象
        window.UGClient = {
          // 发送消息到容器
          sendMessage: function(type, data) {
            window.parent.postMessage({
              type: 'ug_' + type,
              data: data
            }, '*');
          },
          
          // 获取当前URL
          getCurrentURL: function() {
            return window.location.href;
          },
          
          // 获取播放器状态
          getPlayerState: function() {
            const audio = document.querySelector('audio');
            if (!audio) return null;
            
            return {
              playing: !audio.paused,
              currentTime: audio.currentTime,
              duration: audio.duration,
              volume: audio.volume
            };
          }
        };
        
        // 阻止页面内链接的默认行为，防止页面刷新
        document.addEventListener('click', function(e) {
          const target = e.target;
          const linkEl = target.tagName === 'A' ? target : target.closest('a');
          
          if (linkEl && !linkEl.hasAttribute('target')) {
            const href = linkEl.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('javascript:')) {
              e.preventDefault();
              
              // 如果是切换标签的链接，直接使用已有函数
              if (typeof switchTab === 'function' && href.indexOf('#') > -1) {
                const tabid = href.split('#')[1];
                if (tabid) {
                  switchTab(tabid);
                  return;
                }
              }
              
              // 通知容器页面导航请求
              UGClient.sendMessage('navigation', { url: href });
              
              // 如果是内部导航，使用pushState来避免页面刷新
              try {
                history.pushState(null, '', href);
                window.dispatchEvent(new PopStateEvent('popstate'));
              } catch (e) {
                console.error('导航失败:', e);
              }
            }
          }
        }, true);
          // 修复输入框，特别是密码输入框
        function fixInputs() {
          // 修复所有密码输入框
          document.querySelectorAll('input[type="password"]').forEach(input => {
            input.type = 'text';
            input.inputMode = 'numeric';
            // 不使用pattern限制，允许输入字母
            // input.setAttribute('pattern', '[0-9]*');
            
            // 同时添加自动聚焦处理
            input.addEventListener('focus', function() {
              setTimeout(() => this.select(), 100);
            }, {once: true});
          });
          
          // 特别处理清除缓存密码输入框
          const cacheKeyInput = document.getElementById('cache-key');
          if (cacheKeyInput) {
            cacheKeyInput.type = 'text';
            cacheKeyInput.inputMode = 'numeric';
            // 不使用pattern限制，允许输入字母
            // cacheKeyInput.setAttribute('pattern', '[0-9]*');
          }
        }
        
        // 创建MutationObserver来监听DOM变化
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
              mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // 元素节点
                  // 检查自身是否是输入框
                  if (node.tagName === 'INPUT') {
                    if (node.type === 'password' || node.id === 'cache-key') {
                      node.type = 'text';
                      node.inputMode = 'numeric';
                      node.setAttribute('pattern', '[0-9]*');
                    }
                  }
                  
                  // 检查子元素
                  const inputs = node.querySelectorAll('input[type="password"], #cache-key');
                  if (inputs.length) {
                    inputs.forEach(input => {
                      input.type = 'text';
                      input.inputMode = 'numeric';
                      input.setAttribute('pattern', '[0-9]*');
                    });
                  }
                }
              });
            }
          });
        });
        
        // 开始监听DOM变化
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // 初始修复
        fixInputs();
        
        // 同时定期检查，以防万一
        setInterval(fixInputs, 2000);
        
        // 修复清除缓存功能
        if (typeof cacheClean === 'function') {
          const origCacheClean = cacheClean;
          window.cacheClean = function() {
            const result = origCacheClean.apply(this, arguments);
            
            // 弹出输入框后进行修复
            setTimeout(function() {
              const inputs = document.querySelectorAll('.layui-layer input, #cache-key');
              inputs.forEach(input => {
                input.type = 'text';
                input.inputMode = 'numeric';
                input.setAttribute('pattern', '[0-9]*');
              });
            }, 100);
            
            return result;
          };
        }
        
        // 修复Layer弹窗中的输入框
        if (window.layer && window.layer.open) {
          const origOpen = window.layer.open;
          window.layer.open = function() {
            const result = origOpen.apply(this, arguments);
            
            // 弹窗打开后修复输入框
            setTimeout(function() {
              const inputs = document.querySelectorAll('.layui-layer input');
              inputs.forEach(input => {
                if (input.type === 'password') {
                  input.type = 'text';
                  input.inputMode = 'numeric';
                  input.setAttribute('pattern', '[0-9]*');
                }
              });
            }, 100);
            
            return result;
          };
        }
        
        // 监听播放器状态变化
        const audio = document.querySelector('audio');
        if (audio) {
          ['play', 'pause', 'timeupdate', 'ended'].forEach(event => {
            audio.addEventListener(event, () => {
              UGClient.sendMessage('player_state', UGClient.getPlayerState());
            });
          });
        }
        
        // 通知容器页面已准备好
        UGClient.sendMessage('ready', { url: window.location.href });
      })();
    `;
  },
  // 应用Android特定修复
  applyAndroidFixes: function () {
    if (!this.iframeDoc) return;

    const androidStyles = this.iframeDoc.createElement('style');
    androidStyles.textContent = `
      /* Android特定修复 */
      body {
        overscroll-behavior: none !important;
      }
      
      /* 修复Android上的输入框问题 */
      input, textarea {
        font-size: 16px !important; /* 防止页面缩放 */
        -webkit-user-select: text !important;
        user-select: text !important;
        touch-action: manipulation !important;
      }
      
      /* 修复搜索框 */
      input[type="search"], 
      #search-area input,
      .searchBox input {
        font-size: 16px !important;
        -webkit-appearance: none !important;
        appearance: none !important;
      }
    `;

    this.iframeDoc.head.appendChild(androidStyles);

    // 修复Android上的输入框和表单
    const fixAndroidInputs = `
      (function() {
        // 防止表单提交刷新页面
        document.querySelectorAll('form').forEach(form => {
          form.addEventListener('submit', function(e) {
            e.preventDefault();
            return false;
          });
        });
        
        // 修复输入框inputMode和pattern设置
        document.querySelectorAll('input').forEach(input => {
          // 清除限制模式
          if (input.hasAttribute('pattern') && input.getAttribute('pattern') === '[0-9]*') {
            input.removeAttribute('pattern');
          }
          
          // 修正inputMode
          if (input.getAttribute('inputmode') === 'numeric' && 
              !input.id !== 'cache-key' && 
              !input.classList.contains('password')) {
            input.setAttribute('inputmode', 'text');
          }
          
          // 如果是搜索框
          if (input.type === 'search' || 
              (input.closest && 
               (input.closest('.searchBox') || 
                input.closest('#search-area')))) {
            input.setAttribute('inputmode', 'search');
          }
        });
      })();
    `;

    const androidScript = this.iframeDoc.createElement('script');
    androidScript.textContent = fixAndroidInputs;
    this.iframeDoc.body.appendChild(androidScript);
  },

  // 应用iOS特定修复
  applyIOSFixes: function () {
    if (!this.iframeDoc) return;

    const iOSStyles = this.iframeDoc.createElement('style');
    iOSStyles.textContent = `
      /* iOS特定修复 */
      body {
        -webkit-overflow-scrolling: touch !important;
      }
    `;

    this.iframeDoc.head.appendChild(iOSStyles);
  },

  // 添加事件监听器
  addEventListener: function (eventName, callback) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }

    this.eventListeners[eventName].push(callback);
  },

  // 移除事件监听器
  removeEventListener: function (eventName, callback) {
    if (!this.eventListeners[eventName]) return;

    this.eventListeners[eventName] = this.eventListeners[eventName].filter(
      listener => listener !== callback
    );
  },

  // 触发事件
  dispatchEvent: function (eventName, data) {
    if (!this.eventListeners[eventName]) return;

    this.eventListeners[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error(`[UGBridge] 事件回调错误 (${eventName}):`, e);
      }
    });
  }
};
