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
  // 注释掉重复加载模板的代码，因为templates.js已经处理了这部分
  // loadTemplate('sync-playlist-container', 'templates/sync-playlist.html');
  // loadTemplate('user-info-container', 'templates/user-info.html');

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
    } else if (action === "sheet") {
      // 确保在点击播放列表时更新用户信息
      if (playerReaddata('uid')) {
        // 获取用户信息
        var uid = playerReaddata('uid');
        var uname = playerReaddata('uname');

        // 首先检查用户歌单是否已加载到播放列表页面
        if ($('.user-sheets').length === 0 && playerReaddata('ulist')) {
          // 用户已登录但用户歌单区域不存在，创建用户歌单区域
          var userCardHtml = '<div class="sheet-group user-sheets">' +
            '<div class="sheet-group-title"><i class="layui-icon layui-icon-user"></i> ' +
            uname + ' 的网易云歌单</div>' +
            '<div class="sheet-group-content clear-fix"></div>' +
            '</div>';
          rem.sheetList.append(userCardHtml);

          // 加载用户歌单
          var userList = playerReaddata('ulist');
          if (userList && userList.length > 0) {
            // 添加用户歌单到歌单列表中
            for (var i = 0; i < userList.length; i++) {
              // 检查歌单是否已经存在于musicList中
              var isExist = false;
              for (var j = 0; j < musicList.length; j++) {
                if (musicList[j].id == userList[i].id) {
                  isExist = true;
                  break;
                }
              }

              // 如果歌单不存在，添加到musicList
              if (!isExist) {
                musicList.push(userList[i]);
              }

              // 添加歌单到UI
              var sheetIndex = musicList.length - 1;
              var sheetHtml = '<div class="sheet-item" data-no="' + sheetIndex + '">' +
                '<img class="sheet-cover" src="' + (userList[i].cover || "images/player_cover.png") + '">' +
                '<p class="sheet-name">' + userList[i].name + '</p>' +
                '</div>';
              $('.user-sheets .sheet-group-content').append(sheetHtml);
            }
          }
        }

        // 然后再更新登录条信息
        if ($("#user-login").length && $("#user-login").text().indexOf('已同步') === -1) {
          $("#user-login").html('已同步 ' + uname + ' 的歌单 <span class="login-btn login-refresh">[刷新]</span> <span class="login-btn login-out">[退出]</span>');
        }
      }

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

    // 切换expanded类，以便CSS能正确显示"点击查看"或"点击隐藏"文本
    $(this).toggleClass("expanded");

    // 更改图标颜色
    if ($content.is(":visible")) {
      $(this).find(".layui-icon").css("color", "#31c27c");
      $(this).attr("data-shown", "true");
    } else {
      $(this).find(".layui-icon").css("color", "");
      $(this).attr("data-shown", "false");
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
    $list.html('<div style="text-align:center;color:#bdbdbe;padding:20px;">暂无歌单数据，请点击刷新按钮</div>');
    console.log('用户歌单数据未找到，可能是首次同步或尚未完成同步');

    // 检查用户ID是否存在但歌单数据未加载
    var uid = playerReaddata('uid');
    if (uid) {
      layer.msg('正在获取歌单数据...', { icon: 16, time: 1500 });
      // 自动尝试加载用户歌单
      refreshUserPlaylists(uid);
    }
    return;
  }

  try {
    var playlists = userPlaylistsData; // 直接使用 playerReaddata 返回的数据

    if (!Array.isArray(playlists) || playlists.length === 0) {
      $list.html('<div style="text-align:center;color:#bdbdbe;padding:20px;">暂无歌单数据，请点击刷新按钮</div>');
      console.log('用户歌单数据为空或格式不正确:', JSON.stringify(playlists).substring(0, 100) + '...');

      // 如果有用户ID但数据异常，尝试重新获取
      var uid = playerReaddata('uid');
      if (uid) {
        refreshUserPlaylists(uid);
      }
      return;
    }

    // 使用网格导航样式替代原来的样式，但加入图片
    var html = '<div class="nav-grid">';

    playlists.forEach(function (playlist) {
      html += '<div class="nav-grid-item" data-id="' + playlist.id + '">' +
        '<img class="nav-grid-img" src="' + (playlist.cover || "images/player_cover.png") + '" onerror="this.src=\'images/player_cover.png\'">' +
        '<div class="nav-grid-name" title="' + playlist.name + '">' + playlist.name + '</div>' +
        '</div>';
    });

    html += '</div>';

    $list.html(html);

    // 绑定点击事件，点击后进入对应歌单
    $list.find('.nav-grid-item').on('click', function () {
      var pid = $(this).data('id');
      var idx = -1;

      // 添加点击时的激活状态效果
      $(this).addClass('active').siblings().removeClass('active');

      // 显示加载中提示
      layer.msg('正在加载歌单...', { icon: 16, shade: [0.1, '#fff'], time: 0 });

      for (var i = 0; i < musicList.length; i++) {
        if (musicList[i].id == pid) {
          idx = i;
          break;
        }
      }

      if (idx !== -1) {
        // 检查歌单是否已加载歌曲内容
        if (musicList[idx].item.length === 0) {
          // 未加载歌单内容，使用与sheet页面相同的逻辑
          if (musicList[idx].id) {
            // ajax加载数据
            ajaxPlayList(musicList[idx].id, idx, function (loadedIdx) {
              // 加载完成后切换到列表显示
              layer.closeAll();
              dataBox("list"); // 切换到列表视图
              loadList(loadedIdx); // 加载歌曲列表
            });
          } else {
            layer.closeAll();
            layer.msg('加载失败，歌单ID无效');
          }
        } else {
          // 已有歌单内容，直接显示
          layer.closeAll();
          dataBox("list"); // 切换到列表视图
          loadList(idx); // 加载歌曲列表
        }
      } else {
        layer.closeAll();
        console.error('无法找到对应的歌单 ID:', pid);
        layer.msg('无法加载歌单，请刷新后重试');
      }
    });
  } catch (e) {
    console.error('处理用户歌单数据时发生错误:', e, userPlaylistsData);
    $list.html('<div style="text-align:center;color:#bdbdbe;padding:20px;">歌单数据异常，请刷新重试</div>');

    // 显示详细错误
    if (mkPlayer.debug) {
      $list.append('<div style="text-align:center;color:#ff5252;padding:10px;font-size:12px;">错误详情：' + e.message + '</div>');
    }
  }
}

/**
 * 刷新用户歌单数据
 * @param {string} uid 用户ID
 */
function refreshUserPlaylists(uid) {
  // 确保有用户ID
  if (!uid) {
    uid = playerReaddata('uid');
    if (!uid) {
      console.error('无法刷新歌单：未找到用户ID');
      return false;
    }
  }

  // 显示加载提示
  var loadingMsg = layer.msg('正在获取歌单数据...', { icon: 16, time: 0 });

  // 请求用户歌单数据
  $.ajax({
    type: "POST",
    url: "api.php",
    data: {
      "uid": uid,
      "types": "userlist",
      "force_refresh": "1" // 强制刷新，不使用缓存
    },
    dataType: "json",
    success: function (data) {
      layer.close(loadingMsg);

      if (data.code == 200 && data.playlist && data.playlist.length > 0) {
        // 格式化用户歌单
        var formattedPlaylists = [];
        for (var i = 0; i < data.playlist.length; i++) {
          var playlist = data.playlist[i];
          formattedPlaylists.push({
            id: playlist.id,
            name: playlist.name,
            cover: playlist.coverImgUrl + "?param=200y200",
            creatorID: uid,
            creatorName: playlist.creator.nickname,
            creatorAvatar: playlist.creator.avatarUrl,
            item: []
          });
        }

        // 保存歌单数据
        playerSavedata('ulist', formattedPlaylists);

        // 更新内存中的musicList
        updateMusicListWithUserPlaylists(formattedPlaylists);

        // 显示成功消息
        layer.msg('歌单数据已更新');

        // 触发更新事件
        $(document).trigger('showUG666Playlists');
      } else {
        layer.msg('获取歌单失败: ' + (data.msg || '未知错误'));
        console.error('获取歌单失败:', data);
      }
    },
    error: function (xhr, status, error) {
      layer.close(loadingMsg);
      layer.msg('网络错误，请稍后再试');
      console.error('网络请求失败:', status, error);
    }
  });

  return true;
}

/**
 * 更新内存中的musicList，添加用户歌单
 * @param {Array} playlists 用户歌单数组
 */
function updateMusicListWithUserPlaylists(playlists) {
  if (!Array.isArray(playlists) || playlists.length === 0) return;

  // 移除现有的用户歌单（通过creatorID判断）
  var uid = playerReaddata('uid');
  for (var i = musicList.length - 1; i >= 3; i--) {
    if (musicList[i].creatorID && musicList[i].creatorID == uid) {
      musicList.splice(i, 1);
    }
  }

  // 添加新的用户歌单
  for (var i = 0; i < playlists.length; i++) {
    musicList.push(playlists[i]);
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
  // 调用播放列表页面中刷新按钮使用的相同方法
  playerSavedata('ulist', '');
  layer.msg('刷新歌单');
  clearUserlist();

  // 延迟后更新UG666页面显示
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
  // 初始化隐藏帮助内容
  $(".help-content").hide();

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
        "uid": uid,           // 修正：使用uid而不是id
        "types": "userinfo"   // 修正：首先获取用户信息
      },
      dataType: "json",
      success: function (data) {
        if (data.code == 200 && data.profile) {
          // 保存用户基本信息
          playerSavedata('uid', uid);
          playerSavedata('uname', data.profile.nickname);
          playerSavedata('uavatar', data.profile.avatarUrl);

          // 更新登录状态以同步到播放列表页面
          checkLoginStatus();

          // 直接调用播放列表中的同步逻辑，确保数据同步到播放列表页面
          ajaxUserList(uid);

          // 继续请求用户歌单
          $.ajax({
            type: "POST",
            url: "api.php",
            data: {
              "uid": uid,
              "types": "userlist"
            },
            dataType: "json",
            success: function (playlistData) {
              layer.closeAll('loading');
              if (playlistData.code == 200) {
                // 修改：处理歌单数据为正确的格式
                var formattedPlaylists = [];
                if (playlistData.playlist && playlistData.playlist.length > 0) {
                  // 格式化用户歌单为正确的格式
                  for (var i = 0; i < playlistData.playlist.length; i++) {
                    var playlist = playlistData.playlist[i];
                    formattedPlaylists.push({
                      id: playlist.id,                     // 歌单ID
                      name: playlist.name,                 // 歌单名称
                      cover: playlist.coverImgUrl + "?param=200y200", // 歌单封面
                      creatorID: uid,                      // 创建者ID
                      creatorName: playlist.creator.nickname, // 创建者名称
                      creatorAvatar: playlist.creator.avatarUrl, // 创建者头像
                      item: []                             // 歌曲项（初始为空）
                    });
                  }
                }
                // 保存格式化后的用户歌单
                playerSavedata('ulist', formattedPlaylists);

                // 显示成功消息并更新UI
                layer.msg('歌单同步成功！');
                checkLoginStatus();
                $(document).trigger('showUG666Playlists');
              } else {
                layer.msg('歌单获取失败：' + (playlistData.msg || '未知错误'));
              }
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
              layer.closeAll('loading');
              layer.msg('歌单获取失败，请稍后再试');
              console.error(XMLHttpRequest, textStatus, errorThrown);
            }
          });
        } else {
          layer.closeAll('loading');
          layer.msg('用户信息获取失败：' + (data.msg || '未知错误'));
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
      '<p class="sheet-name" title="' + (musicList[i].name || "读取中...") + '">' + (musicList[i].name || "读取中...") + '</p>' +
      '</div>';
    $('.system-sheets .sheet-group-content').append(sheetHtml);
  }

  // 加载其他系统歌单
  for (var i = 3; i < musicList.length; i++) {
    if (!musicList[i].creatorID) { // 只加载系统歌单
      var sheetHtml = '<div class="sheet-item" data-no="' + i + '">' +
        '<img class="sheet-cover" src="' + (musicList[i].cover || "images/player_cover.png") + '">' +
        '<p class="sheet-name" title="' + (musicList[i].name || "读取中...") + '">' + (musicList[i].name || "读取中...") + '</p>' +
        '</div>';
      $('.system-sheets .sheet-group-content').append(sheetHtml);
    }
  }
}
