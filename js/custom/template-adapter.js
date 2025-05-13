/**
 * 模板加载和管理模块 - 额外实现
 * 直接提供对模板系统的调用兼容函数，以便更容易地整合进现有代码
 */

// 使用立即执行函数避免全局变量污染
(function () {
  // 确保模板系统已经加载
  $(function () {
    // 初始化时确保模板系统可用
    if (typeof window.Templates === 'undefined') {
      console.error('模板系统未加载，某些功能可能无法正常工作');
    }

    // 覆盖原有的搜索函数
    if (typeof window.searchBox === 'function') {
      const originalSearchBox = window.searchBox;
      window.searchBox = function () {
        if (typeof window.Templates !== 'undefined') {
          window.Templates.showInLayer('search-form', {
            area: ['320px', '160px'],
            offset: '200px',
            title: '歌曲搜索',
            closeBtn: 1, // 显式指定需要关闭按钮
            shadeClose: true, // 允许点击遮罩关闭
            success: function (layero, index) {
              // 搜索框自动获取焦点
              $("#search-wd").focus().val(window.rem.wd || '');

              // 确保关闭按钮可见
              $(layero).find('.layui-layer-close').css('display', 'block');

              // 重新渲染表单元素
              if (window.form) window.form.render();

              // 自定义关闭按钮样式
              $(layero).find('.layui-layer-close').hover(function () {
                $(this).css('opacity', '1');
              }, function () {
                $(this).css('opacity', '0.8');
              });
            }
          });
        } else {
          originalSearchBox();
        }
      };
    }

    // 覆盖原有的公告函数
    if (typeof window.showPlacard === 'function') {
      const originalShowPlacard = window.showPlacard;
      window.showPlacard = function () {
        if (typeof window.Templates !== 'undefined') {
          window.Templates.showInLayer('placard', {
            area: ['350px', '380px'], // 调整公告尺寸
            offset: '200px',
            title: '公告',
            closeBtn: 1, // 显式指定需要关闭按钮
            shadeClose: true, // 点击遮罩关闭
            btn: ['我知道了', '不再提醒'],
            success: function (layero, index) {
              // 美化公告样式
              $(layero).find('#layer-placard-content').css({
                'padding': '15px 25px',
                'max-height': '300px',
                'overflow-y': 'auto'
              });

              // 确保关闭按钮可见
              $(layero).find('.layui-layer-close').css('display', 'block');
            },
            btn2: function () {
              window.playerSavedata('hideplacard', true);
              return true;
            }
          });
        } else {
          originalShowPlacard();
        }
      };
    }

    // 添加初始化函数，用于在页面加载时自动加载所有模板
    function initTemplates() {
      if (typeof window.Templates !== 'undefined') {
        // 预加载常用模板
        window.Templates.load('search-form');
        window.Templates.load('placard');

        // 渲染初始模板
        if ($("#sync-playlist-container").length) {
          window.Templates.render('sync-playlist', 'sync-playlist-container');
        }

        if ($("#user-info-container").length) {
          window.Templates.render('user-info', 'user-info-container');
        }
      }
    }

    // 页面加载完成后初始化模板
    initTemplates();
  });
})();