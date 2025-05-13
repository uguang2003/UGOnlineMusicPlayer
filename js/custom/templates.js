/**
 * 模板加载和管理模块
 */

const Templates = {
  // 模板缓存
  cache: {},

  // 模板路径配置
  paths: {
    'search-form': 'templates/search-form.html',
    'placard': 'templates/placard.html',
    'sync-playlist': 'templates/sync-playlist.html',
    'user-info': 'templates/user-info.html'
  },

  /**
   * 加载模板内容
   * @param {string} templateName 模板名称
   * @returns {Promise<string>} 模板内容
   */
  load: function (templateName) {
    if (this.cache[templateName]) {
      return Promise.resolve(this.cache[templateName]);
    }

    // 修改这里，使用deferred对象来处理错误，避开.catch()方法
    var deferred = $.Deferred();

    $.get(this.paths[templateName])
      .then(function (content) {
        Templates.cache[templateName] = content;
        deferred.resolve(content);
      }, function (error) {
        console.error('模板加载失败:', templateName, error);
        deferred.resolve(''); // 出错时返回空字符串
      });

    return deferred.promise();
  },

  /**
   * 渲染模板到指定容器
   * @param {string} templateName 模板名称
   * @param {string} containerId 容器ID
   * @param {Object} data 模板数据（可选）
   */
  render: function (templateName, containerId, data = {}) {
    this.load(templateName).then(function (content) {
      if (data) {
        // 如果有数据，进行简单的模板替换
        Object.keys(data).forEach(function (key) {
          content = content.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
        });
      }
      $(`#${containerId}`).html(content);
    });
  },

  /**
   * 显示弹窗内容
   * @param {string} templateName 模板名称
   * @param {Object} options layer配置项
   */
  showInLayer: function (templateName, options = {}) {
    this.load(templateName).then(function (content) {
      layer.open({
        type: 1,
        title: false,
        closeBtn: false,
        shadeClose: true,
        shade: 0.3,
        anim: 1,
        ...options,
        content: content
      });
    });
  }
};

// 页面加载完成后加载和渲染模板
$(function () {
  // 预加载所有模板，避免重复请求
  Promise.all([
    Templates.load('search-form'),
    Templates.load('placard'),
    Templates.load('sync-playlist'),
    Templates.load('user-info')
  ]).then(() => {
    // 渲染页面固定模板（此时使用缓存，不会发起新请求）
    Templates.render('sync-playlist', 'sync-playlist-container');
    Templates.render('user-info', 'user-info-container');
  });
});

// 导出模板模块
window.Templates = Templates;