// 极简preload.js
const { contextBridge } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  // 解除远程站点限制
  if (window.opener) delete window.opener;

  // 修复跨域问题
  document.domain = document.domain;

  // 添加UG音乐桌面版标识
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const titleEl = document.querySelector('#title span');
      if (titleEl) titleEl.innerText += ' - 桌面版';
    } catch (e) { }
  });

  // 覆盖默认下载行为
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.getAttribute('download')) {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) {
        require('electron').shell.openExternal(href);
      }
    }
  });
});
