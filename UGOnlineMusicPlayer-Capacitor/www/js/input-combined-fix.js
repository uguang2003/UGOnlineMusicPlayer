/**
 * UG音乐播放�?- Android WebView 全面输入修复
 * 集成基础输入修复、中文输入修复和搜狗输入法专用修�?
 * 解决安卓设备上WebView输入问题
 */
(function () {
  // 只在Android设备上运�?
  if (!/android/i.test(navigator.userAgent)) return;

  // ��־��ɾ��

  // 等待页面加载完成
  document.addEventListener('DOMContentLoaded', initInputFixes);

  // 如果DOM已经加载完成，立即执�?
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initInputFixes();
  }

  // 初始化所有输入修�?
  function initInputFixes() {
    // ��־��ɾ��

    // 添加必要的元数据标签
    addMetaTags();

    // 添加全局样式
    addGlobalStyles();

    // 监视DOM变化
    observeDOM();

    // 立即修复现有输入元素
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
          // ������־��ɾ��
        }
      });
    });

    // 监听搜索按钮点击
    document.addEventListener('click', function (e) {
      if (e.target &&
        (e.target.getAttribute('data-action') === 'search' ||
          (e.target.closest && e.target.closest('[data-action="search"]')))) {
        // ��־��ɾ��
        setTimeout(fixAllInputElements, 300);
      }
    }, true);

    // 特别处理Layer弹窗中的输入�?
    if (window.layer && window.layer.open) {
      const origOpen = window.layer.open;
      window.layer.open = function () {
        const result = origOpen.apply(this, arguments);

        // 弹窗打开后修复输入框
        setTimeout(function () {
          document.querySelectorAll('.layui-layer input').forEach(input => {
            if (input.type === 'password') {
              // 保持数字键盘但移除限制模�?
              input.setAttribute('inputmode', 'numeric');
              if (input.hasAttribute('pattern')) {
                input.removeAttribute('pattern');
              }
            }
          });
        }, 100);

        return result;
      };
    }
  }

  // 添加元数据标�?
  function addMetaTags() {
    // 确保页面使用正确的字符集
    let charset = document.querySelector('meta[charset]');
    if (!charset) {
      charset = document.createElement('meta');
      charset.setAttribute('charset', 'UTF-8');
      document.head.appendChild(charset);
    }

    // 确保视口设置正确
    let viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      // 修改现有视口设置，不要使用user-scalable=no，会影响中文输入�?
      viewport.setAttribute('content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0');
    }
  }

  // 添加全局样式
  function addGlobalStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* 通用输入修复样式 */
      input, textarea, [contenteditable=true] {
        font-size: 16px !important;
        -webkit-user-select: text !important;
        user-select: text !important;
        -webkit-touch-callout: default !important;
        touch-action: auto !important;
        ime-mode: auto !important;
        -webkit-ime-mode: active !important;
        caret-color: #007bff !important; /* 使光标更明显 */
        -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
        font-family: sans-serif !important;
      }
      
      /* 搜索框样�?*/
      #search-area input,
      .searchBox input,
      input[type="search"] {
        font-size: 16px !important;
        -webkit-ime-mode: active !important;
        ime-mode: active !important;
        -webkit-appearance: none !important;
        appearance: none !important;
      }
      
      /* 修复中文输入法下的光标和选择区域 */
      input::selection {
        background-color: rgba(0, 123, 255, 0.2) !important;
      }
      
      /* 确保可编辑区域正常工�?*/
      [contenteditable=true] {
        -webkit-user-select: text !important; 
        user-select: text !important;
      }
      
      /* 确保输入法选择窗口不被遮挡 */
      body.input-active, body.ime-active {
        position: relative !important;
        height: auto !important;
        bottom: 0 !important;
      }
      
      /* 确保输入框聚焦时有可见的样式 */
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

      // 检查每个变�?
      mutations.forEach(function (mutation) {
        if (mutation.addedNodes && mutation.addedNodes.length) {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];

            // 只处理元素节�?
            if (node.nodeType === 1) {
              if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' ||
                (node.querySelectorAll && (
                  node.querySelectorAll('input, textarea, [contenteditable=true]').length > 0 ||
                  node.querySelectorAll('#search-area, .searchBox').length > 0))) {
                inputFound = true;
                break;
              }
            }
          }
        }
      });

      // 如果发现了输入框，执行修�?
      if (inputFound) {
        fixAllInputElements();
      }
    });

    // 监听整个文档的变�?
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // 修复文档中的所有输入元�?
  function applyFixToDocument(doc) {
    if (!doc || !doc.querySelectorAll) return;

    // 添加样式
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

    // 修复输入元素
    doc.querySelectorAll('input, textarea, [contenteditable=true]').forEach(fixSingleInput);
  }

  // 修复所有输入元�?
  function fixAllInputElements() {
    // ��־��ɾ��
    document.querySelectorAll('input, textarea, [contenteditable=true]').forEach(fixSingleInput);
  }

  // 修复单个输入元素
  function fixSingleInput(input) {
    if (!input) return;

    // 密码字段需要特殊处�?
    const isPassword = input.type === 'password' || input.classList.contains('password') || input.id === 'cache-key';
    if (isPassword) {
      // 对于密码相关输入保持数字键盘
      input.setAttribute('inputmode', 'numeric');
      return; // 不进行其他修�?
    }

    // 设置语言为中�?
    input.lang = 'zh-CN';

    // 清除可能阻碍输入法的属�?
    if (input.hasAttribute('pattern')) {
      input.removeAttribute('pattern');
    }

    if (input.hasAttribute('autocomplete')) {
      input.removeAttribute('autocomplete');
    }

    if (input.hasAttribute('autocorrect')) {
      input.removeAttribute('autocorrect');
    }

    if (input.hasAttribute('autocapitalize')) {
      input.removeAttribute('autocapitalize');
    }

    if (input.hasAttribute('spellcheck')) {
      input.removeAttribute('spellcheck');
    }

    // 如果是输入模式为数字的非密码字段，改为文本输�?
    if (input.getAttribute('inputmode') === 'numeric') {
      input.setAttribute('inputmode', 'text');
    }

    // 如果是搜索框，设置为搜索模式
    if (input.type === 'search' ||
      (input.closest && (input.closest('.searchBox') ||
        input.closest('#search-area')))) {
      input.setAttribute('inputmode', 'search');
    }

    // 使用克隆节点替换原节点，清除可能的事件监听器
    const newInput = input.cloneNode(true);
    if (input.parentNode) {
      // 保存当前�?
      const currentValue = input.value || '';

      // 替换节点
      input.parentNode.replaceChild(newInput, input);

      // 恢复�?
      if (newInput.tagName.toLowerCase() !== 'div') { // 不是contenteditable元素
        newInput.value = currentValue;
      }
    }

    // 添加中文输入相关事件监听
    newInput.addEventListener('focus', function () {
      document.body.classList.add('input-active');
      document.body.classList.add('ime-active');
    });

    newInput.addEventListener('blur', function () {
      document.body.classList.remove('input-active');
      document.body.classList.remove('ime-active');
    });

    // 中文输入事件处理
    newInput.addEventListener('compositionstart', function (e) {
      // ��־��ɾ��
      e.target.classList.add('composing');
    });

    newInput.addEventListener('compositionend', function (e) {
      // ��־��ɾ��
      e.target.classList.remove('composing');
    });

    // 阻止冒泡，防止点击输入框导致其他事件被触�?
    newInput.addEventListener('touchstart', function (e) {
      e.stopPropagation();
    }, true);

    newInput.addEventListener('click', function (e) {
      e.stopPropagation();
      this.focus();
    }, true);

    return newInput;
  }

  // 添加延迟聚焦逻辑，帮助某些设备上的输入法激�?
  window.focusInput = function (inputId) {
    setTimeout(function () {
      const input = document.getElementById(inputId);
      if (input) {
        input.focus();
        if (input.setSelectionRange) {
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }
      }
    }, 300);
  };
})();
