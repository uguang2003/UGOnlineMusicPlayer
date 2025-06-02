/**
 * UG音乐播放器 - Android WebView 输入修复
 * 简化版：解决安卓设备上WebView输入问题
 */
(function () {
  // 只在Android设备上运行
  if (!/android/i.test(navigator.userAgent)) return;

  // 等待页面加载完成
  document.addEventListener('DOMContentLoaded', initInputFixes);

  // 如果DOM已经加载完成，立即执行
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initInputFixes();
  }

  // 初始化输入修复
  function initInputFixes() {
    addGlobalStyles();
    observeDOM();
    fixAllInputElements();

    // 监听iframe加载完成事件
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      iframe.addEventListener('load', function () {
        try {
          if (iframe.contentDocument) {
            applyFixToDocument(iframe.contentDocument);
          }
        } catch (e) {
          // 静默处理错误
        }
      });
    });
  }

  // 添加全局样式
  function addGlobalStyles() {
    const style = document.createElement('style');
    style.textContent = `
      input, textarea, [contenteditable=true] {
        font-size: 16px !important;
        -webkit-user-select: text !important;
        user-select: text !important;
        -webkit-touch-callout: default !important;
        touch-action: auto !important;
        ime-mode: auto !important;
        -webkit-ime-mode: active !important;
        caret-color: #007bff !important;
        -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
        font-family: sans-serif !important;
      }
      
      input:focus, textarea:focus {
        outline: none !important;
        box-shadow: 0 0 0 1px rgba(0, 123, 255, 0.2) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 监视DOM变化
  function observeDOM() {
    const observer = new MutationObserver(function (mutations) {
      let inputFound = false;

      mutations.forEach(function (mutation) {
        if (mutation.addedNodes && mutation.addedNodes.length) {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.nodeType === 1) {
              if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' ||
                (node.querySelectorAll &&
                  node.querySelectorAll('input, textarea, [contenteditable=true]').length > 0)) {
                inputFound = true;
                break;
              }
            }
          }
        }
      });

      if (inputFound) {
        fixAllInputElements();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // 修复文档中的所有输入元素
  function applyFixToDocument(doc) {
    if (!doc || !doc.querySelectorAll) return;

    const style = doc.createElement('style');
    style.textContent = `
      input, textarea, [contenteditable=true] {
        -webkit-user-select: auto !important;
        user-select: auto !important;
        -webkit-touch-callout: default !important;
        font-size: 16px !important;
        -webkit-ime-mode: active !important;
        ime-mode: active !important;
      }
    `;
    doc.head.appendChild(style);

    doc.querySelectorAll('input, textarea, [contenteditable=true]').forEach(fixSingleInput);
  }

  // 修复所有输入元素
  function fixAllInputElements() {
    document.querySelectorAll('input, textarea, [contenteditable=true]').forEach(fixSingleInput);
  }

  // 修复单个输入元素
  function fixSingleInput(input) {
    if (!input) return;

    // 密码字段保持数字键盘
    const isPassword = input.type === 'password' || input.classList.contains('password') || input.id === 'cache-key';
    if (isPassword) {
      input.setAttribute('inputmode', 'numeric');
      return;
    }

    // 设置语言为中文
    input.lang = 'zh-CN';

    // 清除可能阻碍输入法的属性
    ['pattern', 'autocomplete', 'autocorrect', 'autocapitalize', 'spellcheck'].forEach(attr => {
      if (input.hasAttribute(attr)) {
        input.removeAttribute(attr);
      }
    });

    // 设置合适的输入模式
    if (input.getAttribute('inputmode') === 'numeric') {
      input.setAttribute('inputmode', 'text');
    }

    if (input.type === 'search' ||
      (input.closest && (input.closest('.searchBox') || input.closest('#search-area')))) {
      input.setAttribute('inputmode', 'search');
    }
  }
})();
