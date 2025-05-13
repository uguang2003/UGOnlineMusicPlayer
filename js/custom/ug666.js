/**
 * UG666页面相关脚本
 * 包含用户歌单同步、UG666页面交互等功能
 */

/**
 * 加载HTML模板
 * @param {string} containerId 容器ID
 * @param {string} templatePath 模板文件路径
 */
function loadTemplate(containerId, templatePath) {
  $.get(templatePath, function (html) {
    $('#' + containerId).html(html);
  });
}

// 页面加载完成后执行
$(function () {
  // 加载模板内容
  loadTemplate('sync-playlist-container', 'templates/sync-playlist.html');
  loadTemplate('user-info-container', 'templates/user-info.html');

  // 处理所有选项卡的点击事件，确保正确显示/隐藏内容
  $(".btn").click(function () {
    var action = $(this).data("action");

    // 搜索按钮有特殊处理，不在这里处理
    if (action === "search") return;

    // 移除其他选项卡的激活状态
    $('.btn-box .active').removeClass('active');
    // 激活当前选项卡
    $(this).addClass('active');

    // 处理播放器显示/隐藏
    if ($(".btn[data-action='player']").css('display') !== 'none') {
      $("#player").hide();
    } else if ($("#player").css('display') == 'none') {
      $("#player").fadeIn();
    }

    // 根据不同选项卡显示对应内容，隐藏其他内容
    if (action === "about") {
      $("#about").fadeIn();
      $("#sheet").hide();
      $("#main-list").hide();

      // 默认展开帮助区域，改为自动显示，提高用户体验
      setTimeout(function () {
        if ($(".help-content").is(":hidden")) {
          $(".help-title").click();
        }
      }, 500);
    } else if (action === "sheet") {
      $("#sheet").fadeIn();
      $("#about").hide();
      $("#main-list").hide();
    } else if (action === "playing") {
      loadList(1); // 显示正在播放列表
      $("#main-list").fadeIn();
      $("#about").hide();
      $("#sheet").hide();
    } else if (action === "player") {
      $("#player").fadeIn();
      $("#about").hide();
      $("#sheet").hide();
      $("#main-list").hide();
    }
  });

  // 帮助提示内容显示/隐藏逻辑 - 点击事件
  $(document).on("click", ".help-title", function () {
    var $content = $(this).siblings(".help-content");
    // 切换帮助内容的显示状态
    $content.slideToggle(300);

    // 更改帮助标题的文字提示
    if ($content.is(":visible")) {
      $(this).find(".layui-icon").css("color", "#31c27c");
      $(this).attr("data-shown", "true");
      $(this).find(".help-title-text").text("点击隐藏");
    } else {
      $(this).find(".layui-icon").css("color", "");
      $(this).attr("data-shown", "false");
      $(this).find(".help-title-text").text("点击查看");
    }
  });
});

/**
 * 加载用户歌单列表到UG666页面
 */
function loadUserPlaylistsForUG666() {
  var userPlaylistsData = playerReaddata('ulist');
  var $list = $("#sync-loggedin-container .user-playlist-list");

  if (!userPlaylistsData) {
    $list.html('<div style="text-align:center;color:#bdbdbe;padding:20px;">暂无歌单数据</div>');
    console.error('用户歌单数据为空');
    return;
  }

  try {
    var playlists = userPlaylistsData; // 直接使用 playerReaddata 返回的数据，因为它已经被解析过了

    if (!Array.isArray(playlists) || playlists.length === 0) {
      $list.html('<div style="text-align:center;color:#bdbdbe;padding:20px;">暂无歌单数据</div>');
      console.warn('用户歌单数据为空或不是数组:', playlists);
      return;
    }

    var html = '';
    playlists.forEach(function (playlist) {
      html += '<div class="sheet-item" data-id="' + playlist.id + '">' +
        '<img src="' + (playlist.cover || 'images/player_cover.png') + '" onerror="this.src=\'images/player_cover.png\'" class="sheet-cover">' +
        '<p class="sheet-name" title="' + playlist.name + '">' + playlist.name + '</p>' +
        '</div>';
    });

    $list.html(html);

    // 绑定点击事件，修复点击后无法进入对应歌单的问题
    $list.find('.sheet-item').on('click', function () {
      var pid = $(this).data('id');
      var idx = -1;

      for (var i = 0; i < musicList.length; i++) {
        if (musicList[i].id == pid) {
          idx = i;
          break;
        }
      }

      if (idx !== -1) {
        $(".btn[data-action='sheet']").click();
        loadSheet(idx);
      } else {
        console.error('无法找到对应的歌单 ID:', pid);
        layer.msg('无法加载歌单，请刷新后重试');
      }
    });
  } catch (e) {
    console.error('处理用户歌单数据时发生错误:', e, userPlaylistsData);
    $list.html('<div style="text-align:center;color:#bdbdbe;padding:20px;">歌单数据异常</div>');
  }
}

// 登录状态变化或刷新歌单后调用
$(document).on('showUG666Playlists', loadUserPlaylistsForUG666);

// 在checkLoginStatus和刷新歌单后触发事件
var _oldCheckLoginStatus = window.checkLoginStatus;
window.checkLoginStatus = function () {
  _oldCheckLoginStatus && _oldCheckLoginStatus.apply(this, arguments);
  if (playerReaddata('uid')) {
    $(document).trigger('showUG666Playlists');
  }
};

$(document).on('click', '.login-refresh', function () {
  setTimeout(function () {
    $(document).trigger('showUG666Playlists');
  }, 800);
});

// 页面初次加载时检查登录状态
$(function () {
  if (playerReaddata('uid')) {
    $(document).trigger('showUG666Playlists');
  }
});

/**
 * 检查用户登录状态并显示相应界面
 */
function checkLoginStatus() {
  // 获取保存的用户信息
  var savedUid = playerReaddata('uid');
  var savedUname = playerReaddata('uname');
  var savedUavatar = playerReaddata('uavatar');  // 获取保存的用户头像URL

  if (savedUid) {
    // 用户已登录，显示已登录状态
    $("#sync-loggedin-container").show();
    $("#sync-login-container").hide();

    // 更新用户信息
    $("#logged-user-name").text(savedUname || "用户");
    $("#logged-user-id").text(savedUid);

    // 使用保存的用户头像（如果有）
    if (savedUavatar) {
      $("#user-avatar").attr("src", savedUavatar);
    } else {
      // 没有保存的头像，使用默认头像
      $("#user-avatar").attr("src", "images/avatar.png");
    }

    // 添加动画效果提升用户体验
    $("#sync-loggedin-container").addClass("animated fadeIn");
  } else {
    // 用户未登录，显示登录界面
    $("#sync-login-container").show();
    $("#sync-loggedin-container").hide();
    $("#sync-login-container").addClass("animated fadeIn");
  }
}

// 页面加载时初始化
$(document).ready(function () {
  // 初始化检查登录状态
  checkLoginStatus();

  // 登出按钮点击事件 - 绑定到document上，使任何页面中的登出按钮都能正确响应
  $(document).on("click", ".login-out", function () {
    // 保存用户退出状态 - 彻底清空所有用户相关的本地存储数据
    playerSavedata('uid', '');
    playerSavedata('ulist', '');
    playerSavedata('uname', '');
    playerSavedata('uavatar', '');

    // 清除localStorage中所有可能包含用户信息的项
    for (var key in localStorage) {
      if (key.indexOf('UGPlayer_') === 0) {
        localStorage.removeItem(key);
      }
    }

    // 彻底清除内存中的用户信息
    rem.uid = null;
    rem.uname = null;
    rem.uavatar = null;

    // 清除UI上的用户信息
    layer.msg('已退出登录');

    // 重新加载歌单列表，清除用户歌单
    if ($('.user-sheets').length) {
      $('.user-sheets').remove();
    }

    $("#user-login").html('我的歌单 <span class="login-btn login-in">[点击同步]</span>')

    // 重新加载系统歌单
    refreshSheetList();

    // 直接强制显示登录面板、隐藏已登录面板(使用show/hide方法，不只是设置CSS)
    $("#sync-login-container").show();
    $("#sync-loggedin-container").hide();

    // 调用clearUserlist刷新其他界面元素
    clearUserlist();

    // 确保切换后刷新UI状态(强制重新检查)
    setTimeout(function () {
      checkLoginStatus();
    }, 100);
  });

  // 修改原有的syncPlaylist函数，使其在成功登录后更新UI
  var originalSyncPlaylist = window.syncPlaylist;
  // 重新定义syncPlaylist函数
  window.syncPlaylist = function () {
    // 记录当前页面状态 - 现在只用于调试
    var currentPage = "";
    if ($("#about").is(":visible")) {
      currentPage = "about";
    } else if ($("#sheet").is(":visible")) {
      currentPage = "sheet";
    } else if ($("#main-list").is(":visible")) {
      currentPage = "list";
    } else if ($("#player").is(":visible")) {
      currentPage = "player";
    }

    if (mkPlayer.debug) {
      console.log("同步歌单，当前页面: " + currentPage);
    }

    // 在同步前显示加载动画
    layer.load(1, { shade: [0.3, '#000'] });

    // 获取输入的uid
    var uid = $("#uid").val().trim();
    if (!uid) {
      layer.closeAll('loading');
      layer.msg('请输入网易云音乐用户ID');
      return false;
    }

    // 发送同步请求
    $.ajax({
      type: "POST",
      url: "api.php",
      data: {
        "id": uid,
        "source": "netease",
        "types": "userlist"
      },
      dataType: "json",
      success: function (data) {
        layer.closeAll('loading');
        if (data.code == 200) {
          // 保存用户信息和歌单
          playerSavedata('uid', uid);
          playerSavedata('ulist', data.playlist);
          if (data.profile) {
            playerSavedata('uname', data.profile.nickname);
            playerSavedata('uavatar', data.profile.avatarUrl);
          }

          // 显示成功消息并更新UI
          layer.msg('歌单同步成功！');
          checkLoginStatus();
          $(document).trigger('showUG666Playlists');
        } else {
          layer.msg('歌单同步失败：' + (data.msg || '未知错误'));
        }
      },
      error: function (XMLHttpRequest, textStatus, errorThrown) {
        layer.closeAll('loading');
        layer.msg('同步请求失败，请稍后再试');
        console.error(XMLHttpRequest, textStatus, errorThrown);
      }
    });

    return false; // 阻止表单默认提交
  };

  // UI交互优化：输入框获得焦点时的效果
  $(document).on("focus", "#uid", function () {
    $(this).parent().addClass("input-focused");
  }).on("blur", "#uid", function () {
    $(this).parent().removeClass("input-focused");
  });

  // 点击歌单项的平滑滚动效果
  $(document).on("click", ".sheet-item", function () {
    $('html, body').animate({
      scrollTop: 0
    }, 300);
  });
});

/**
 * 刷新歌单列表函数
 */
function refreshSheetList() {
  // 清空现有歌单
  $('.system-sheets .sheet-group-content').empty();

  // 重新加载系统歌单
  for (var i = 1; i < 3; i++) {  // 只加载系统歌单(正在播放和播放历史)
    var sheetHtml = '<div class="sheet-item" data-no="' + i + '">' +
      '<img class="sheet-cover" src="' + (musicList[i].cover || "images/player_cover.png") + '">' +
      '<p class="sheet-name">' + (musicList[i].name || "读取中...") + '</p>' +
      '</div>';
    $('.system-sheets .sheet-group-content').append(sheetHtml);
  }

  // 加载其他系统歌单
  for (var i = 3; i < musicList.length; i++) {
    if (!musicList[i].creatorID) { // 只加载系统歌单
      var sheetHtml = '<div class="sheet-item" data-no="' + i + '">' +
        '<img class="sheet-cover" src="' + (musicList[i].cover || "images/player_cover.png") + '">' +
        '<p class="sheet-name">' + (musicList[i].name || "读取中...") + '</p>' +
        '</div>';
      $('.system-sheets .sheet-group-content').append(sheetHtml);
    }
  }
}
