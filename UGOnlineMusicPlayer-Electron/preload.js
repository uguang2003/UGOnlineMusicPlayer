// preload.js
// 可以在这里注入任何需要在渲染进程中使用的API和功能
const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  // 这里可以注入您需要的JavaScript代码
  // 移除日志输出

  // 解除一些远程网站的限制
  // 覆盖一些可能被限制的API
  if (window.opener) {
    delete window.opener;
  }
  
  // 修复可能的跨域问题
  document.domain = document.domain;
  
  // 简化的辅助函数，移除快捷键监听，
  // 因为我们已经在主进程中使用全局快捷键实现了这个功能
  function setupPageSupport() {
    // 移除日志输出

    // 确保页面元素可点击
    setTimeout(() => {
      // 增强网页中播放器按钮的点击事件
      function enhancePlayerButtons() {
        const buttons = {
          next: document.querySelector('.btn-next'),
          prev: document.querySelector('.btn-prev'),
          play: document.querySelector('.btn-play')
        };

        if (buttons.next) {
          // 增强下一首按钮
          const origNextClick = buttons.next.onclick;
          buttons.next.onclick = function (e) {
            // 移除日志输出
            if (origNextClick) origNextClick.call(this, e);
          };
        }

        if (buttons.prev) {
          // 增强上一首按钮
          const origPrevClick = buttons.prev.onclick;
          buttons.prev.onclick = function (e) {
            // 移除日志输出
            if (origPrevClick) origPrevClick.call(this, e);
          };
        }

        if (buttons.play) {
          // 增强播放/暂停按钮
          const origPlayClick = buttons.play.onclick;
          buttons.play.onclick = function (e) {
            // 移除日志输出
            if (origPlayClick) origPlayClick.call(this, e);
          };
        }
      }

      // 先执行一次
      enhancePlayerButtons();

      // 每5秒检查一次，确保按钮在页面发生变化后仍然可用
      setInterval(enhancePlayerButtons, 5000);

      const allButtons = document.querySelectorAll('a, button, [role="button"]');
      allButtons.forEach(btn => {
        if (btn.style) {
          btn.style.pointerEvents = 'auto';
        }
      });
    }, 2000);
  }

  // 在页面完全加载后执行辅助函数
  setTimeout(setupPageSupport, 2000);

  // 为页面添加额外的CSS，以确保在Electron中正常展示
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      height: 100%;
      overflow: auto;
    }
    
    /* 修复可能的点击问题 */
    a, button, [role="button"], input, select, textarea {
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(style);
});
