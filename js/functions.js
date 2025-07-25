/**************************************************
 * MKOnlinePlayer v2.4
 * 封装函数及UI交互模块
 * 编写：mengkun(https://mkblog.cn)
 * 时间：2018-3-11
 *************************************************/
/**
 * 辅助函数模块
 * 所有与搜索、下载和UI交互相关的函数
 */

// 设置移动设备检测对象
const isMobile = {
    Android: function () {
        return !!navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function () {
        return !!navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function () {
        return !!navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Windows: function () {
        return !!navigator.userAgent.match(/IEMobile/i);
    },
    Screen: function () {
        return document.documentElement.clientWidth < 900;
    },
    any: function () {
        return (this.Android() || this.BlackBerry() || this.iOS() || this.Windows() || this.Screen());
    }
};

// 初始化layui组件
let layer, form;
layui.use(['layer', 'form'], function () {
    layer = layui.layer;
    form = layui.form;

    if (mkPlayer.placard) {
        layer.config({
            shade: [0.25, '#000'],
            shadeClose: true
        });

        window.onload = function () {
            // 检查用户是否设置了不再显示公告
            if (playerReaddata('hideplacard') !== true) {
                showPlacard();
            }
        };
    }
});

// 添加"显示公告"功能
function showPlacard() {
    if (typeof Templates !== 'undefined') {
        Templates.showInLayer('placard', {
            btn: ['我知道了', '不再提醒'],
            title: '公告',
            maxWidth: 320,
            btn2: function () {
                playerSavedata('hideplacard', true);
                return true;
            }
        });
    } else {
        layer.open({
            btn: ['我知道了', '不再提醒'],
            title: '公告',
            maxWidth: 320,
            content: $('#layer-placard-box').html(),
            btn2: function () {
                playerSavedata('hideplacard', true);
                return true;
            }
        });
    }
}

// 展现搜索弹窗
function searchBox() {
    if (typeof Templates !== 'undefined') {
        Templates.showInLayer('search-form', {
            type: 1,
            title: false,
            shade: [0.25, '#000'],
            shadeClose: true,
            offset: 'auto',
            area: '360px',
            success: function () {
                // 恢复上一次的输入
                $("#search-wd").focus().val(rem.wd || '');
                if (form) form.render();
            }
        });
    } else {
        layer.open({
            type: 1,
            title: false,
            shade: [0.25, '#000'],
            shadeClose: true,
            offset: 'auto',
            area: '360px',
            success: function () {
                // 恢复上一次的输入
                $("#search-wd").focus().val(rem.wd);
                $("#music-source input[name='source'][value='" + rem.source + "']").prop("checked", "checked");
                form.render();
            },
            content: $('#layer-form-box').html()
        });
    }
}

// 页面初始化
$(function () {
    if (mkPlayer.debug) {
        console.warn('播放器调试模式已开启，正常使用时请在 js/player.js 中按说明关闭调试模式');
    }

    rem.isMobile = isMobile.any();      // 判断是否是移动设备
    rem.webTitle = document.title;      // 记录页面原本的标题
    rem.errCount = 0;                   // 连续播放失败的歌曲数归零
    rem.userAgent = navigator.userAgent; // 获取用户userAgent

    window.onresize = function () {
        rem.isMobile = isMobile.any();
        if (navigator.userAgent !== rem.userAgent) {
            location.reload();
        }
    }

    initProgress();     // 初始化音量条、进度条（进度条初始化要在 Audio 前，别问我为什么……）
    initAudio();    // 初始化 audio 标签，事件绑定


    if (rem.isMobile) {  // 加了滚动条插件和没加滚动条插件所操作的对象是不一样的
        rem.sheetList = $("#sheet");
        rem.mainList = $("#main-list");
    } else {
        // 滚动条初始化(只在非移动端启用滚动条控件)
        $("#main-list,#sheet,.about-content").mCustomScrollbar({
            theme: "minimal",
            advanced: {
                updateOnContentResize: true // 数据更新后自动刷新滚动条
            }
        });

        rem.sheetList = $("#sheet .mCSB_container");
        rem.mainList = $("#main-list .mCSB_container");
    }

    addListhead();  // 列表头
    addListbar("loading");  // 列表加载中

    // 防止快速切换页面导致的页面闪烁问题
    var isPageSwitching = false;
    var pageDebounceTimeout;

    // 顶部按钮点击处理
    $(".btn").click(function () {
        // 如果页面正在切换中，则忽略点击
        if (isPageSwitching) return false;

        // 设置切换状态为true，防止多次点击
        isPageSwitching = true;

        // 清除之前的定时器，防止快速点击导致的冲突
        clearTimeout(pageDebounceTimeout);

        var action = $(this).data("action");

        switch (action) {
            case "player":    // 播放器
                dataBox("player");
                break;
            case "search":  // 搜索
                searchBox();
                isPageSwitching = false; // 搜索不影响页面切换，立即重置状态
                return; // 搜索框不需要防抖处理，直接返回
                break;
            case "playing": // 正在播放
                loadList(1); // 显示正在播放列表
                break;
            case "sheet":   // 播放列表
                dataBox("sheet");    // 在主界面显示出音乐专辑
                break;
            case "about":   // UG666页面
                dataBox("about");    // 显示UG666页面
                break;
        }

        // 500毫秒后重置切换状态，允许下一次点击
        pageDebounceTimeout = setTimeout(function () {
            isPageSwitching = false;
        }, 500);
    });

    // 列表项双击播放
    $(".music-list").on("dblclick", ".list-item", function () {
        var num = parseInt($(this).data("no"));
        if (isNaN(num)) return false;
        listClick(num);
    });

    // 移动端列表项单击播放
    $(".music-list").on("click", ".list-item", function () {
        if (rem.isMobile) {
            var num = parseInt($(this).data("no"));
            if (isNaN(num)) return false;
            listClick(num);
        }
    });

    // 小屏幕点击右侧小点查看歌曲详细信息
    $(".music-list").on("click", ".list-mobile-menu", function () {
        var num = parseInt($(this).parent().data("no"));
        musicInfo(rem.dislist, num);
        return false;
    });

    // 列表鼠标移过显示对应的操作按钮
    $(".music-list").on("mousemove", ".list-item", function () {
        var num = parseInt($(this).data("no"));
        if (isNaN(num)) return false;
        // 还没有追加菜单则加上菜单
        if (!$(this).data("loadmenu")) {
            var target = $(this).find(".music-name");
            var html = '<span class="music-name-cult">' +
                target.html() +
                '</span>' +
                '<div class="list-menu" data-no="' + num + '">' +
                '<span class="list-icon icon-play" data-function="play" title="点击播放这首歌"></span>' +
                '<span class="list-icon icon-download list-mobile-menu" title="点击下载这首歌"></span>' +
                '<span class="list-icon icon-share" data-function="share" title="点击分享这首歌"></span>' +
                '</div>';
            target.html(html);
            $(this).data("loadmenu", true);
        }
    });

    // 列表中的菜单点击
    $(".music-list").on("click", ".icon-play,.icon-download,.icon-share", function () {
        var num = parseInt($(this).parent().data("no"));
        if (isNaN(num)) return false;
        switch ($(this).data("function")) {
            case "play":    // 播放
                listClick(num);     // 调用列表点击处理函数
                break;
            case "share":   // 分享
                // ajax 请求数据
                ajaxUrl(musicList[rem.dislist].item[num], ajaxShare);
                break;
        }
        return true;
    });

    // 点击加载更多
    $(".music-list").on("click", ".list-loadmore", function () {
        $(".list-loadmore").removeClass('list-loadmore');
        $(".list-loadmore").html('加载中...');
        ajaxSearch();
    });    // 点击专辑显示专辑歌曲
    $("#sheet").on("click", ".sheet-cover,.sheet-name", function () {
        var num = parseInt($(this).parent().data("no"));
        // 是用户列表，但是还没有加载数据
        if (musicList[num].item.length === 0 && musicList[num].creatorID) {
            layer.msg('列表读取中...', { icon: 16, shade: [0.25, , '#000'], shadeClose: true, time: 500 }); // 0代表加载的风格，支持0-2
            // ajax加载数据
            ajaxPlayList(musicList[num].id, num, loadList);
            return true;
        }

        // 加载歌单列表
        loadList(num);

        // 在移动端，高亮"正在播放"按钮
        if (rem.isMobile) {
            // 移除所有高亮
            $(".btn-box .btn").removeClass("active");
            // 添加正在播放标签高亮
            $(".btn[data-action='playing']").addClass("active");
        }
    });

    // 点击同步云音乐
    $("#sheet").on("click", ".login-in", function () {
        layer.prompt(
            {
                title: '请输入您的网易云 UID',
                // value: '',  // 默认值
                btn: ['确定', '取消', '帮助'],
                shade: [0.25, , '#000'],
                shadeClose: true,
                btn3: function (index, layero) {
                    layer.open({
                        title: '如何获取您的网易云UID？'
                        , shade: [0.25, , '#000'] //遮罩透明度
                        , shadeClose: true
                        , anim: 0 //0-6的动画形式，-1不开启
                        , content:
                            '1、首先<a href="http://music.163.com/" target="_blank">点我(http://music.163.com/)</a>打开网易云音乐官网<br>' +
                            '2、然后点击页面右上角的“登录”，登录您的账号<br>' +
                            '3、点击您的头像，进入个人中心<br>' +
                            '4、此时<span style="color:red">浏览器地址栏</span> <span style="color: green">/user/home?id=</span> 后面的<span style="color:red">数字</span>就是您的网易云 UID'
                    });
                }
            },
            function (val, index) {   // 输入后的回调函数
                if (isNaN(val)) {
                    layer.msg('uid 只能是数字', { anim: 6 });
                    return false;
                }
                layer.close(index);     // 关闭输入框
                ajaxUserList(val);
            });
    });

    // 刷新用户列表
    $("#sheet").on("click", ".login-refresh", function () {
        playerSavedata('ulist', '');
        layer.msg('刷新歌单');
        clearUserlist();
    });

    // 退出登录
    $("#sheet").on("click", ".login-out", function () {
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

        // 重新加载系统歌单
        if (typeof refreshSheetList === 'function') {
            refreshSheetList();
        }

        // 更新UG666页面的登录状态
        if ($("#sync-login-container").length && $("#sync-loggedin-container").length) {
            $("#sync-login-container").show();
            $("#sync-loggedin-container").hide();
        }


        // 强制刷新用户界面的登录状态
        $("#user-login").html('我的歌单 <span class="login-btn login-in">[点击同步]</span>');

        // 调用clearUserlist刷新其他界面元素
        clearUserlist();
    });

    // 播放、暂停按钮的处理
    $("#music-info").click(function () {
        if (rem.playid === undefined) {
            layer.msg('请先播放歌曲');
            return false;
        }

        musicInfo(rem.playlist, rem.playid);
    });

    // 播放、暂停按钮的处理
    $(".btn-play").click(function () {
        pause();
    });    // 循环顺序的处理
    $(".btn-order").click(function () {
        orderChange();
        // 保存播放状态，包括新的播放顺序
        if (typeof savePlayerState === 'function') {
            savePlayerState();
        }
    });

    // 上一首歌
    $(".btn-prev").click(function () {
        prevMusic();
    });

    // 下一首
    $(".btn-next").click(function () {
        nextMusic();
    });

    // 静音按钮点击事件
    $(".btn-quiet").click(function () {
        var oldVol;     // 之前的音量值
        if ($(this).is('.btn-state-quiet')) {
            oldVol = $(this).data("volume");
            oldVol = oldVol ? oldVol : (rem.isMobile ? 1 : mkPlayer.volume);  // 没找到记录的音量，则重置为默认音量
            $(this).removeClass("btn-state-quiet");     // 取消静音
        } else {
            oldVol = volume_bar.percent;
            $(this).addClass("btn-state-quiet");        // 开启静音
            $(this).data("volume", oldVol); // 记录当前音量值
            oldVol = 0;
        }
        playerSavedata('volume', oldVol); // 存储音量信息
        volume_bar.goto(oldVol);    // 刷新音量显示
        if (rem.audio[0] !== undefined) rem.audio[0].volume = oldVol;  // 应用音量
    }); if ((mkPlayer.coverbg === true && !rem.isMobile) || (mkPlayer.mcoverbg === true && rem.isMobile)) { // 开启了封面背景

        if (rem.isMobile) {  // 移动端采用另一种模糊方案
            $('#blur-img').html('<div class="blured-img" id="mobile-blur"></div><div class="blur-mask mobile-mask"></div>');
        } else {
            // 背景图片初始化 - 使用CSS方式实现响应式背景和模糊效果
            $('#blur-img').html('<div class="blur-mask"></div>');
            // 添加CSS过滤器效果实现模糊
            $('#blur-img').css({
                'background-size': 'cover',
                'background-position': 'center center',
                '-webkit-filter': 'blur(50px) brightness(0.7)',
                'filter': 'blur(50px) brightness(0.7)'
            });
        }

        $('.blur-mask').fadeIn(1000);   // 遮罩层淡出
    }

    // 添加窗口大小改变事件监听
    $(window).resize(function () {
        // 确保背景图片完整覆盖窗口
        if (!rem.isMobile) {
            $('#blur-img').css({
                'background-size': 'cover',
                'background-position': 'center center'
            });
        } else {
            $('#mobile-blur').css({
                'background-size': 'cover',
                'background-position': 'center center'
            });
        }
    });

    // 图片加载失败处理
    $('img').error(function () {
        $(this).attr('src', 'images/player_cover.png');
    });

    setInterval(function () {
        $('.audio-time').text(getAudioTime());
    }, 1000)
    // 初始化播放列表
    initList();

    // 移动端不显示评论框
    if (rem.isMobile) {
        $('.banner_text').hide();
    } else if (!mkPlayer.comments) {
        $('.banner_text').hide();
    }
});

// 播放时长处理函数
function getAudioTime() {
    var audio = $('audio')[0];
    var duration = audio.duration;
    var currentTime = audio.currentTime;
    if (duration && currentTime) {
        return (formatTime(duration) + '/' + formatTime(currentTime));
    } else {
        return '00:00/00:00';
    }
};

// 展现系统列表中任意首歌的歌曲信息
function musicInfo(list, index) {
    var music = musicList[list].item[index];
    var tempStr = '<span class="info-title">歌名：</span>' + music.name +
        '<br><span class="info-title">歌手：</span>' + music.artist +
        '<br><span class="info-title">专辑：</span>' + music.album;

    if (list == rem.playlist && index == rem.playid) {   // 当前正在播放这首歌，那么还可以顺便获取一下时长。。。
        tempStr += '<br><span class="info-title">时长：</span>' + formatTime(rem.audio[0].duration);
    }

    tempStr += '<br><span class="info-title">操作：</span>' +
        '<span class="info-btn" onclick="thisDownload(this)" data-list="' + list + '" data-index="' + index + '">下载</span>' +
        '<span style="margin-left: 10px" class="info-btn" onclick="thisDownloadLrc(this)" data-list="' + list + '" data-index="' + index + '">下载歌词</span>' +
        '<span style="margin-left: 10px" class="info-btn" onclick="thisDownloadPic(this)" data-list="' + list + '" data-index="' + index + '">下载封面</span>' +
        '<span style="margin-left: 10px" class="info-btn" onclick="thisShare(this)" data-list="' + list + '" data-index="' + index + '">外链</span>';

    layer.open({
        type: 0,
        shade: [0.25, , '#000'],
        shadeClose: true,
        title: false, //不显示标题
        btn: false,
        content: tempStr
    });

    if (mkPlayer.debug) {
        console.info('id: "' + music.id + '",\n' +
            'name: "' + music.name + '",\n' +
            'artist: "' + music.artist + '",\n' +
            'album: "' + music.album + '",\n' +
            'source: "' + music.source + '",\n' +
            'url_id: "' + music.url_id + '",\n' +
            'pic_id: "' + music.pic_id + '",\n' +
            'lyric_id: "' + music.lyric_id + '",\n' +
            'pic: "' + music.pic + '",\n' +
            'url: ""');
        // 'url: "' + music.url + '"');
    }
}

// 搜索提交
function searchSubmit() {
    var wd = $(".layui-layer #search-wd").val();
    if (!wd) {
        layer.msg('搜索内容不能为空', { anim: 6, offset: 't' });
        $("#search-wd").focus();
        return false;
    }
    rem.source = $("#music-source input[name='source']:checked").val();

    layer.closeAll('page');     // 关闭搜索框

    // 隐藏UG666页面，避免搜索结果与其重叠
    $("#about").hide();

    rem.loadPage = 1;   // 已加载页数复位
    rem.wd = wd;    // 搜索词
    ajaxSearch();   // 加载搜索结果
    return false;
}

// 下载正在播放的这首歌
function thisDownload(obj) {
    ajaxUrl(musicList[$(obj).data("list")].item[$(obj).data("index")], download);
}

// 获取并设置评论
function comments(obj) {
    // 清除之前的定时器
    clearTimeout(rem.commentsTime);

    // 如果存在之前的评论请求，中止它
    if (rem.commentXhr && rem.commentXhr.readyState !== 4) {
        rem.commentXhr.abort();
    }

    // 存储当前播放的歌曲ID，用于后续验证
    rem.currentCommentSongId = obj.id;

    // 立即清空评论区域显示"加载中..."，防止显示上一首歌的评论
    $(".banner_text span").text("评论加载中...");
    $(".banner_text a").attr("href", "javascript:;");
    $(".banner_text a").removeAttr("target");
    $(".banner_text img").hide();

    // 停止上一首歌的评论切换动画
    rem.comments = [];

    // 保存AJAX请求对象以便可以中止
    rem.commentXhr = $.ajax({
        type: mkPlayer.method,
        url: mkPlayer.api,
        data: "types=comments&id=" + obj.id + "&source=" + obj.source,
        dataType: mkPlayer.dataType,
        success: function (jsonData) {
            // 如果请求完成时，当前播放的歌曲已经改变，则放弃处理结果
            if (rem.currentCommentSongId !== obj.id) {
                return;
            }

            if (jsonData.hot_comment && jsonData.hot_comment.length) {
                rem.comments = jsonData.hot_comment;
            } else if (jsonData.comment && jsonData.comment.length) {
                rem.comments = jsonData.comment;
            } else {
                rem.comments = [];
                $(".banner_text span").text("没有找到相关评论");
                return;
            }
            if (obj.source === 'netease') {
                $(".banner_text a").attr("href", "https://music.163.com/#/song?id=" + obj.id + "#comment-box");
            } else if (obj.source === 'kugou') {
                $(".banner_text a").attr("href", "https://www.kugou.com/song/#hash=" + obj.id);
            } else if (obj.source === 'tencent') {
                $(".banner_text a").attr("href", "https://y.qq.com/n/yqq/song/" + obj.id + ".html#comment_box");
            } else if (obj.source === 'xiami') {
                $(".banner_text a").attr("href", "https://www.xiami.com/song/" + obj.id + "#comments");
            } else if (obj.source === 'baidu') {

            } $(".banner_text a").attr("target", "_blank");

            // 先显示第一条评论，不等待图片加载
            $(".banner_text span").text(rem.comments[0].content);

            // 预加载评论头像并开始轮播
            var avatarDom = new Image();
            (function nextComment(commentsIndex) {
                // 如果当前播放的歌曲ID与开始请求评论时的ID不同，说明已经切换歌曲，终止评论轮播
                if (rem.currentCommentSongId !== obj.id) {
                    return;
                }

                if (commentsIndex === undefined || commentsIndex === rem.comments.length - 1) {
                    commentsIndex = 0;
                } else {
                    commentsIndex++;
                }

                var avatarSrc = (rem.comments[commentsIndex].user.avatar ? rem.comments[commentsIndex].user.avatar : "images/avatar.png") + '?t=' + Math.random();
                avatarDom.src = avatarSrc; avatarDom.onload = function () {
                    // 再次检查当前歌曲是否已变更
                    if (rem.currentCommentSongId !== obj.id) {
                        return;
                    }

                    $(".banner_text span").text(rem.comments[commentsIndex].content);
                    $(".banner_text img").show().attr("src", avatarSrc);

                    rem.commentsTime = setTimeout(function () {
                        nextComment(commentsIndex)
                    }, 5000)
                }

                // 添加超时处理，防止图片加载失败时评论轮播卡住
                avatarDom.onerror = function () {
                    // 图片加载失败时仍然显示评论，只是不显示头像
                    if (rem.currentCommentSongId !== obj.id) {
                        return;
                    }

                    $(".banner_text span").text(rem.comments[commentsIndex].content);
                    $(".banner_text img").hide();

                    rem.commentsTime = setTimeout(function () {
                        nextComment(commentsIndex)
                    }, 5000)
                }
            })()
        },   //success
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            // 检查是否是用户主动中止的请求
            if (textStatus === 'abort') {
                return;
            }
            $(".banner_text span").text("评论加载失败");
            layer.msg('歌曲评论获取失败 - ' + XMLHttpRequest.status);
            console.error(XMLHttpRequest + textStatus + errorThrown);
        }   // error
    });//ajax
}

// 下载封面
function thisDownloadPic(obj) {
    var music = musicList[$(obj).data("list")].item[$(obj).data("index")];
    layer.closeAll();
    if (music.pic) {
        open(music.pic.split('?')[0].split('@')[0]);
    } else {
        $.ajax({
            type: mkPlayer.method,
            url: mkPlayer.api,
            data: "types=pic&id=" + music.pic_id + "&source=" + music.source,
            dataType: mkPlayer.dataType,
            success: function (jsonData) {
                if (mkPlayer.debug) {
                    console.log("歌曲封面：" + jsonData.url);
                }
                if (jsonData.url) {
                    open(jsonData.url.split('?')[0].split('@')[0]);
                } else {
                    layer.msg('没有封面');
                }
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                layer.msg('歌曲封面获取失败 - ' + XMLHttpRequest.status);
                console.error(XMLHttpRequest + textStatus + errorThrown);
            }
        });
    }
}

// 下载歌词
function thisDownloadLrc(obj) {
    var music = musicList[$(obj).data("list")].item[$(obj).data("index")];
    layer.closeAll();
    $.ajax({
        type: mkPlayer.method,
        url: mkPlayer.api,
        data: "types=lyric&id=" + music.lyric_id + "&source=" + music.source,
        dataType: mkPlayer.dataType,
        success: function (jsonData) {
            // 调试信息输出
            if (mkPlayer.debug) {
                console.debug("歌词获取成功");
            }

            var lyric = jsonData.lyric;
            if (mkPlayer.debug) {
                console.debug("歌词获取成功");
            }
            if (lyric) {
                var artist = music.artist ? ' - ' + music.artist : '';
                var filename = (music.name + artist + '.lrc').replace('/', '&');
                var element = document.createElement('a');
                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(lyric));
                element.setAttribute('download', filename);
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            } else {
                layer.msg('歌词获取失败');
            }
        },   //success
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            layer.msg('歌词读取失败 - ' + XMLHttpRequest.status);
            console.error(XMLHttpRequest + textStatus + errorThrown);
            callback('', music.lyric_id);    // 回调函数
        }   // error   
    });//ajax
}

// 分享正在播放的这首歌
function thisShare(obj) {
    ajaxUrl(musicList[$(obj).data("list")].item[$(obj).data("index")], ajaxShare);
}

// 下载歌曲
// 参数：包含歌曲信息的数组
function download(music) {
    if (music.url == 'err' || music.url == "" || music.url == null) {
        layer.msg('这首歌不支持下载');
        return;
    }

    // 检测是否是移动设备，使用不同的下载策略
    if (rem.isMobile) {
        // 移动设备使用直接下载模式，通过修改后的API接口
        var loadMsg = layer.msg('准备下载...', { time: 3000 });
        // 构造直接下载的URL（使用新增的direct参数）
        var directDownloadUrl = mkPlayer.api + '?types=download&direct=1&artist=' + encodeURIComponent(music.artist) +
            '&name=' + encodeURIComponent(music.name) +
            '&source=' + encodeURIComponent(music.source) +
            '&url=' + encodeURIComponent(music.url);

        // 使用window.open打开下载链接，这样在大多数移动浏览器中会触发下载
        setTimeout(function () {
            layer.close(loadMsg);
            window.open(directDownloadUrl, '_blank');
        }, 1000);
    } else {
        // PC端使用原有的下载方式
        var loadMsg = layer.msg('正在请求远程服务器，如果10秒后没有开始下载请重试', {
            time: 10000
        });
        var load = layer.load(0, {
            shade: [0.25, , '#000'],
        });
        var loading = setTimeout(function () {
            layer.close(load);
            layer.close(loadMsg);
            layer.msg('下载请求歌曲链接失败，请检查网络或稍后再试');
        }, 10000)
        $.ajax({
            type: mkPlayer.method,
            url: mkPlayer.api,
            data: 'types=download&artist=' + encodeURIComponent(music.artist) +
                '&name=' + encodeURIComponent(music.name) +
                '&source=' + encodeURIComponent(music.source) +
                '&url=' + encodeURIComponent(music.url),
            dataType: 'json',
            timeout: 10000,
            success: function (jsonData) {
                layer.closeAll();
                clearInterval(loading);
                if (jsonData.code == 1) {
                    if ($('.download').length) {
                        $('.download').remove();
                    }
                    var downDom = $('<iframe class="download" style="height: 0;width: 0;display: none;"></iframe>');
                    downDom[0].src = jsonData.url;
                    $('body').append(downDom);
                } else {
                    layer.msg(jsonData.msg);
                }
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                layer.msg('下载失败，服务器错误 - ' + XMLHttpRequest.status);
                console.error(XMLHttpRequest + textStatus + errorThrown);
            }
        });
    }
}

// 获取外链的ajax回调函数
// 参数：包含音乐信息的数组
function ajaxShare(music) {
    if (music.url == 'err' || music.url == "" || music.url == null) {
        layer.msg('这首歌不支持外链获取');
        return;
    }

    var tmpHtml = '<p>' + music.artist + ' - ' + music.name + ' 的外链地址为：</p>' +
        '<input class="share-url" onmouseover="this.focus();this.select()" value="' + music.url + '">' +
        '<p class="share-tips">* 获取到的音乐外链有效期较短，请按需使用。</p>';

    layer.open({
        title: '歌曲外链分享'
        , shade: [0.25, , '#000']
        , shadeClose: true
        , content: tmpHtml
    });
}

// 改变右侧封面图像
// 新的图像地址
function changeCover(music) {
    var img = music.pic;    // 获取歌曲封面
    var animate = false, imgload = false;

    if (!img) {  // 封面为空
        ajaxPic(music, changeCover);    // 获取歌曲封面图
        img == "err";    // 暂时用无图像占个位...
    }

    if (img == "err") {
        img = "images/player_cover.png";
    } else {
        if (mkPlayer.mcoverbg === true && rem.isMobile)      // 移动端封面
        {
            $("#music-cover").load(function () {
                $("#mobile-blur").css({
                    'background-image': 'url("' + img + '")',
                    'background-size': 'cover',
                    'background-position': 'center center'
                });
            });
        }
        else if (mkPlayer.coverbg === true && !rem.isMobile)     // PC端封面
        {
            $("#music-cover").load(function () {
                if (animate) {   // 渐变动画也已完成
                    // 直接设置背景图而不是使用backgroundBlur
                    $("#blur-img").css({
                        'background-image': 'url("' + img + '")',
                        'background-size': 'cover',
                        'background-position': 'center center',
                        '-webkit-filter': 'blur(50px) brightness(0.7)',
                        'filter': 'blur(50px) brightness(0.7)'
                    });
                    $("#blur-img").animate({ opacity: "1" }, 2000); // 背景更换特效
                } else {
                    imgload = true;     // 告诉下面的函数，图片已准备好
                }
            });

            // 渐变动画
            $("#blur-img").animate({ opacity: "0.2" }, 1000, function () {
                if (imgload) {   // 如果图片已经加载好了
                    // 直接设置背景图而不是使用backgroundBlur
                    $("#blur-img").css({
                        'background-image': 'url("' + img + '")',
                        'background-size': 'cover',
                        'background-position': 'center center',
                        '-webkit-filter': 'blur(50px) brightness(0.7)',
                        'filter': 'blur(50px) brightness(0.7)'
                    });
                    $("#blur-img").animate({ opacity: "1" }, 2000); // 背景更换特效
                } else {
                    animate = true;     // 等待图像加载完
                }
            });
        }
    }

    $("#music-cover").attr("src", img);     // 改变右侧封面
    $(".sheet-item[data-no='1'] .sheet-cover").attr('src', img);    // 改变正在播放列表的图像
}


// 向列表中载入某个播放列表
function loadList(list) {
    if (musicList[list].isloading === true) {
        layer.msg('列表读取中...', { icon: 16, shade: [0.25, , '#000'], time: 500 });
        return true;
    }

    rem.dislist = list;     // 记录当前显示的列表

    dataBox("list");    // 在主界面显示出播放列表

    // 在移动端，确保"正在播放"按钮高亮
    if (rem.isMobile) {
        // 移除所有高亮
        $(".btn-box .btn").removeClass("active");
        // 添加正在播放标签高亮
        $(".btn[data-action='playing']").addClass("active");
    }

    // 调试信息输出
    if (mkPlayer.debug) {
        if (musicList[list].id) {
            console.log('加载播放列表 ' + list + ' - ' + musicList[list].name + '\n' +
                'id: ' + musicList[list].id + ',\n' +
                'name: "' + musicList[list].name + '",\n' +
                'cover: "' + musicList[list].cover + '",\n' +
                'item: []');
        } else {
            console.log('加载播放列表 ' + list + ' - ' + musicList[list].name);
        }
    } rem.mainList.html('');   // 清空列表中原有的元素
    addListhead();      // 向列表中加入列表头

    if (musicList[list].item.length == 0) {
        // 如果是正在播放列表(list==1)且为空，则加载默认歌单的内容
        if (list == 1 && mkPlayer.defaultlist && musicList[mkPlayer.defaultlist] && musicList[mkPlayer.defaultlist].item.length > 0) {
            // 将默认歌单的歌曲复制到正在播放列表
            musicList[1].item = musicList[mkPlayer.defaultlist].item.slice(); // 使用slice()创建副本

            // 显示默认歌单的歌曲
            for (var i = 0; i < musicList[1].item.length; i++) {
                var tmpMusic = musicList[1].item[i];
                addItem(i + 1, tmpMusic.name, tmpMusic.artist, tmpMusic.album);
                // 清空URL以便重新加载
                tmpMusic.url = "";
            }

            // 保存正在播放列表
            playerSavedata('playing', musicList[1].item);

            // 添加提示信息，告知用户当前显示的是默认歌单
            addListbar("defaultlist");

            // 添加清空列表按钮
            addListbar("clear");
        } else {
            addListbar("nodata");   // 列表中没有数据
        }
    } else {

        // 逐项添加数据
        for (var i = 0; i < musicList[list].item.length; i++) {
            var tmpMusic = musicList[list].item[i];

            addItem(i + 1, tmpMusic.name, tmpMusic.artist, tmpMusic.album);

            // 音乐链接均有有效期限制,重新显示列表时清空处理
            if (list == 1 || list == 2) tmpMusic.url = "";
        }

        // 列表加载完成后的处理
        if (list == 1 || list == 2) {    // 历史记录和正在播放列表允许清空
            addListbar("clear");    // 清空列表
        }

        if (rem.playlist === undefined) {    // 未曾播放过
            if (mkPlayer.autoplay == true) pause();  // 设置了自动播放，则自动播放
        } else {
            refreshList();  // 刷新列表，添加正在播放样式
        }

        listToTop();    // 播放列表滚动到顶部
    }
}

// 播放列表滚动到顶部
function listToTop() {
    if (rem.isMobile) {
        $("#main-list").animate({ scrollTop: 0 }, 200);
    } else {
        $("#main-list").mCustomScrollbar("scrollTo", 0, "top");
    }
}

// 向列表中加入列表头
function addListhead() {
    var html = '<div class="list-item list-head">' +
        '    <span class="music-album">' +
        '        专辑' +
        '    </span>' +
        '    <span class="auth-name">' +
        '        歌手' +
        '    </span>' +
        '    <span class="music-name">' +
        '        歌曲' +
        '    </span>' +
        '</div>';
    rem.mainList.append(html);
}

// 列表中新增一项
// 参数：编号、名字、歌手、专辑
function addItem(no, name, auth, album) {
    var html = '<div class="list-item" data-no="' + (no - 1) + '">' +
        '    <span class="list-num">' + no + '</span>' +
        '    <span class="list-mobile-menu"></span>' +
        '    <span class="music-album">' + album + '</span>' +
        '    <span class="auth-name">' + auth + '</span>' +
        '    <span class="music-name">' + name + '</span>' +
        '</div>';
    rem.mainList.append(html);
}

// 加载列表中的提示条
// 参数：类型（more、nomore、loading、nodata、clear）
function addListbar(types) {
    var html
    switch (types) {
        case "more":    // 还可以加载更多
            html = '<div class="list-item text-center list-loadmore list-clickable" title="点击加载更多数据" id="list-foot">点击加载更多...</div>';
            break;

        case "nomore":  // 数据加载完了
            html = '<div class="list-item text-center" id="list-foot">全都加载完了</div>';
            break;

        case "loading": // 加载中
            html = '<div class="list-item text-center" id="list-foot">播放列表加载中...</div>';
            break; case "nodata":  // 列表中没有内容
            html = '<div class="list-item text-center" id="list-foot">可能是个假列表，什么也没有</div>';
            break;

        case "defaultlist":  // 正在播放列表为空，显示默认歌单内容
            html = '<div class="list-item text-center" id="list-foot">正在播放列表为空，显示默认歌单 - ' + (musicList[mkPlayer.defaultlist] ? musicList[mkPlayer.defaultlist].name : '热门歌曲') + '</div>';
            break;

        case "clear":   // 清空列表
            html = '<div class="list-item text-center list-clickable" id="list-foot" onclick="clearDislist();">清空列表</div>';
            break;
    }
    rem.mainList.append(html);
}

// 将时间格式化为 00:00 的格式
// 参数：原始时间
function formatTime(time) {
    var hour, minute, second;
    hour = String(parseInt(time / 3600, 10));
    if (hour.length == 1) hour = '0' + hour;

    minute = String(parseInt((time % 3600) / 60, 10));
    if (minute.length == 1) minute = '0' + minute;

    second = String(parseInt(time % 60, 10));
    if (second.length == 1) second = '0' + second;

    if (hour > 0) {
        return hour + ":" + minute + ":" + second;
    } else {
        return minute + ":" + second;
    }
}

// url编码
// 输入参数：待编码的字符串
function urlEncode(String) {
    return encodeURIComponent(String).replace(/'/g, "%27").replace(/"/g, "%22");
}

// 在 ajax 获取了音乐的信息后再进行更新
// 参数：要进行更新的音乐
function updateMinfo(music) {
    // 不含有 id 的歌曲无法更新
    if (!music.id) return false;

    // 循环查找播放列表并更新信息
    for (var i = 0; i < musicList.length; i++) {
        for (var j = 0; j < musicList[i].item.length; j++) {
            // ID 对上了，那就更新信息
            if (musicList[i].item[j].id == music.id && musicList[i].item[j].source == music.source) {
                musicList[i].item[j] == music;  // 更新音乐信息
                j = musicList[i].item.length;   // 一个列表中只找一首，找到了就跳出
            }
        }
    }
}

// 刷新当前显示的列表，如果有正在播放则添加样式
function refreshList() {
    // 还没播放过，不用对比了
    if (rem.playlist === undefined) return true;

    $(".list-playing").removeClass("list-playing");        // 移除其它的正在播放

    if (rem.paused !== true) {   // 没有暂停
        for (var i = 0; i < musicList[rem.dislist].item.length; i++) {
            // 与正在播放的歌曲 id 相同
            if ((musicList[rem.dislist].item[i].id !== undefined) &&
                (musicList[rem.dislist].item[i].id == musicList[1].item[rem.playid].id) &&
                (musicList[rem.dislist].item[i].source == musicList[1].item[rem.playid].source)) {
                $(".list-item[data-no='" + i + "']").addClass("list-playing");  // 添加正在播放样式

                return true;    // 一般列表中只有一首，找到了赶紧跳出
            }
        }
    }

}
// 添加一个歌单
// 参数：编号、歌单名字、歌单封面
function addSheet(no, name, cover) {
    if (!cover) cover = "images/player_cover.png";
    if (!name) name = "读取中...";

    var html = '<div class="sheet-item" data-no="' + no + '">' +
        '    <img class="sheet-cover" src="' + cover + '">' +
        '    <p class="sheet-name" title="' + name + '">' + name + '</p>' +
        '</div>';
    rem.sheetList.append(html);
}
// 清空歌单显示
function clearSheet() {
    rem.sheetList.html('');
}

// 歌单列表底部登陆条
function sheetBar() {
    var barHtml;
    if (playerReaddata('uid')) {
        barHtml = '已同步 ' + rem.uname + ' 的歌单 <span class="login-btn login-refresh">[刷新]</span> <span class="login-btn login-out">[退出]</span>';
    } else {
        barHtml = '我的歌单 <span class="login-btn login-in">[点击同步]</span>';
    }
    barHtml = '<span id="sheet-bar"><div class="clear-fix"></div>' +
        '<div id="user-login" class="sheet-title-bar">' + barHtml +
        '</div></span>';
    rem.sheetList.append(barHtml);
}

// 选择要显示哪个数据区
// 参数：要显示的数据区（list、sheet、player）
function dataBox(choose) {
    // 停止所有正在进行的jQuery动画，防止页面切换冲突
    $("#main-list").stop(true, true);
    $("#sheet").stop(true, true);
    $("#about").stop(true, true);
    $("#player").stop(true, true);

    // 移除按钮激活状态
    $('.btn-box .active').removeClass('active');

    // 根据选择显示对应页面
    switch (choose) {
        case "list":    // 显示播放列表
            // 立即隐藏其他页面，不使用动画
            $("#sheet").hide();
            $("#about").hide();

            // 处理播放器显示
            if ($(".btn[data-action='player']").css('display') !== 'none') {
                $("#player").hide();
            } else if ($("#player").css('display') == 'none') {
                $("#player").show(); // 直接显示，不使用淡入
            }

            // 显示播放列表
            $("#main-list").show(); // 直接显示，不使用淡入

            // 激活对应的按钮
            if (rem.dislist == 1 || rem.dislist == rem.playlist) {  // 正在播放
                $(".btn[data-action='playing']").addClass('active');
            } else if (rem.dislist == 0) {  // 搜索
                $(".btn[data-action='search']").addClass('active');
            }
            break;

        case "sheet":   // 显示专辑
            // 立即隐藏其他页面，不使用动画
            $("#main-list").hide();
            $("#about").hide();

            // 处理播放器显示
            if ($(".btn[data-action='player']").css('display') !== 'none') {
                $("#player").hide();
            } else if ($("#player").css('display') == 'none') {
                $("#player").show(); // 直接显示，不使用淡入
            }

            // 显示歌单页面
            $("#sheet").show(); // 直接显示，不使用淡入

            // 激活对应的按钮
            $(".btn[data-action='sheet']").addClass('active');
            break;

        case "player":  // 显示播放器
            // 立即隐藏其他页面，不使用动画
            $("#sheet").hide();
            $("#main-list").hide();
            $("#about").hide();

            // 显示播放器
            $("#player").show(); // 直接显示，不使用淡入

            // 激活对应的按钮
            $(".btn[data-action='player']").addClass('active');
            break;

        case "about":  // 显示UG666页面
            // 立即隐藏其他页面，不使用动画
            $("#sheet").hide();
            $("#main-list").hide();

            // 显示播放器（始终可见）和UG666页面
            $("#player").show(); // 直接显示，不使用淡入
            $("#about").show(); // 直接显示，不使用淡入

            // 激活对应的按钮
            $(".btn[data-action='about']").addClass('active');
            break;
    }
}

// 将当前歌曲加入播放历史
// 参数：要添加的音乐
function addHis(music) {
    if (rem.playlist == 2) return true;  // 在播放“播放记录”列表则不作改变

    if (musicList[2].item.length > 300) musicList[2].item.length = 299; // 限定播放历史最多是 300 首

    if (music.id !== undefined && music.id !== '') {
        // 检查历史数据中是否有这首歌，如果有则提至前面
        for (var i = 0; i < musicList[2].item.length; i++) {
            if (musicList[2].item[i].id == music.id && musicList[2].item[i].source == music.source) {
                musicList[2].item.splice(i, 1); // 先删除相同的
                i = musicList[2].item.length;   // 找到了，跳出循环
            }
        }
    }

    // 再放到第一位
    musicList[2].item.unshift(music);

    playerSavedata('his', musicList[2].item);  // 保存播放历史列表
}

// 初始化播放列表
function initList() {
    // 登陆过，那就读取出用户的歌单，并追加到系统歌单的后面
    if (playerReaddata('uid')) {
        rem.uid = playerReaddata('uid');
        rem.uname = playerReaddata('uname');
        rem.uavatar = playerReaddata('uavatar'); // 读取用户头像
        var tmp_ulist = playerReaddata('ulist');    // 读取本地记录的用户歌单

        if (tmp_ulist) musicList.push.apply(musicList, tmp_ulist);   // 追加到系统歌单的后面
    }

    // 创建系统歌单卡片组
    var systemCardHtml = '<div class="sheet-group system-sheets">' +
        '<div class="sheet-group-title"><i class="layui-icon layui-icon-headset"></i> 系统推荐歌单</div>' +
        '<div class="sheet-group-content clear-fix"></div>' +
        '</div>';
    rem.sheetList.append(systemCardHtml);

    // 如果用户已登录，创建用户歌单卡片组
    if (playerReaddata('uid')) {
        var userCardHtml = '<div class="sheet-group user-sheets">' +
            '<div class="sheet-group-title"><i class="layui-icon layui-icon-user"></i> ' +
            rem.uname + ' 的网易云歌单</div>' +
            '<div class="sheet-group-content clear-fix"></div>' +
            '</div>';
        rem.sheetList.append(userCardHtml);
    }

    // 显示所有的歌单
    for (var i = 1; i < musicList.length; i++) {
        if (i == 1) {    // 正在播放列表
            // 读取正在播放列表
            var tmp_item = playerReaddata('playing');
            if (tmp_item) {  // 读取到了正在播放列表
                musicList[1].item = tmp_item;
                mkPlayer.defaultlist = 1;   // 默认显示正在播放列表
            }
        } else if (i == 2) { // 历史记录列表
            // 读取历史记录
            var tmp_item = playerReaddata('his');
            if (tmp_item) {
                musicList[2].item = tmp_item;
            }
            // 列表不是用户列表，并且信息为空，需要ajax读取列表
        } else if (!musicList[i].creatorID && (musicList[i].item == undefined || (i > 2 && musicList[i].item.length == 0))) {
            musicList[i].item = [];
            if (musicList[i].id) {   // 列表ID已定义
                // ajax获取列表信息
                ajaxPlayList(musicList[i].id, i);
            } else {    // 列表 ID 未定义
                if (!musicList[i].name) musicList[i].name = '未命名';
            }
        }

        // 判断是否是用户歌单，将歌单添加到对应区域
        if (musicList[i].creatorID && musicList[i].creatorID == rem.uid) {
            // 用户歌单添加到用户区域
            var sheetHtml = '<div class="sheet-item" data-no="' + i + '">' +
                '<img class="sheet-cover" src="' + (musicList[i].cover || "images/player_cover.png") + '">' +
                '<p class="sheet-name" title="' + (musicList[i].name || "读取中...") + '">' + (musicList[i].name || "读取中...") + '</p>' +
                '</div>';
            $('.user-sheets .sheet-group-content').append(sheetHtml);
        } else {
            // 系统歌单添加到系统区域
            var sheetHtml = '<div class="sheet-item" data-no="' + i + '">' +
                '<img class="sheet-cover" src="' + (musicList[i].cover || "images/player_cover.png") + '">' +
                '<p class="sheet-name" title="' + (musicList[i].name || "读取中...") + '">' + (musicList[i].name || "读取中...") + '</p>' +
                '</div>';
            $('.system-sheets .sheet-group-content').append(sheetHtml);
        }
    }

    // 登陆了，但歌单又没有，说明是在刷新歌单
    if (playerReaddata('uid') && !tmp_ulist) {
        ajaxUserList(rem.uid);
        return true;
    }

    // 首先确保所有页面隐藏，避免闪烁问题
    $("#sheet").hide();
    $("#about").hide();

    // 直接加载"正在播放"列表
    rem.dislist = 1;  // 设置当前显示的列表为"正在播放"

    // 激活"正在播放"按钮
    $('.btn-box .active').removeClass('active');
    $(".btn[data-action='playing']").addClass('active');

    // 处理移动端的初始化，防止页面重叠
    if (rem.isMobile) {
        // 在移动端，如果显示播放器按钮，则默认进入播放器页面，而不是列表页面
        if ($(".btn[data-action='player']").css('display') !== 'none') {
            // 显示播放器，隐藏列表
            $("#player").show();
            $("#main-list").hide();
            // 激活播放器按钮
            $(".btn[data-action='playing']").removeClass('active');
            $(".btn[data-action='player']").addClass('active');
        } else {
            // 显示列表，确保播放器也可见（位于列表下方）
            $("#player").show();
            $("#main-list").show();
        }
    } else {
        // 非移动端按原逻辑处理
        $("#player").show();
        $("#main-list").show();
    }

    // 加载正在播放列表的内容
    rem.mainList.html('');   // 清空列表中原有的元素
    addListhead();      // 向列表中加入列表头

    if (musicList[1].item.length == 0) {
        addListbar("nodata");   // 列表中没有数据
    } else {
        // 逐项添加数据
        for (var i = 0; i < musicList[1].item.length; i++) {
            var tmpMusic = musicList[1].item[i];
            addItem(i + 1, tmpMusic.name, tmpMusic.artist, tmpMusic.album);
            tmpMusic.url = ""; // 清空URL以便重新加载
        }

        // 历史记录和正在播放列表允许清空
        addListbar("clear");    // 清空列表

        // 刷新列表，添加正在播放样式
        if (rem.playlist !== undefined) {
            refreshList();
        } else if (mkPlayer.autoplay == true) {
            pause();  // 设置了自动播放，则自动播放
        }
    }

    // 列表滚动到顶部
    listToTop();

    // 显示最后一项登陆条
    sheetBar();
}

// 清空用户的同步列表
function clearUserlist() {
    if (!rem.uid) return false;

    // 查找用户歌单起点
    for (var i = 1; i < musicList.length; i++) {
        if (musicList[i].creatorID !== undefined && musicList[i].creatorID == rem.uid) break;    // 找到了就退出
    }

    // 删除记忆数组中的用户歌单
    musicList.splice(i, musicList.length - i); // 先删除相同的
    musicList.length = i;

    // 只清空用户歌单区域，保留系统歌单区域
    $('.user-sheets .sheet-group-content').empty();

    // 更新用户歌单卡片标题（以防万一）
    $('.user-sheets .sheet-group-title').html('<i class="layui-icon layui-icon-user"></i> ' +
        rem.uname + ' 的网易云歌单');

    // 如果是退出操作，则移除用户数据
    var isLogout = (playerReaddata('uid') === '');

    if (isLogout) {
        // 完全清除用户信息
        rem.uid = null;
        rem.uname = null;
        rem.uavatar = null;

        // 移除整个用户歌单区域
        $('.user-sheets').remove();

        // 更新UG666页面的登录状态 - 显示立即同步歌单界面
        if ($("#sync-login-container").length && $("#sync-loggedin-container").length) {
            $("#sync-login-container").show();
            $("#sync-loggedin-container").hide();
        }

        // 更新歌单列表页中的用户登录信息 - 修改选择器更精确地匹配目标元素
        $("#user-login").html('我的歌单 <span class="login-btn login-in">[点击同步]</span>')

        // 刷新播放列表
        refreshSheetList();

        // 显示最后一项登陆条 - 确保在删除后再创建新的
        sheetBar();

        return true;
    } else {
        // 移除登录条，将在ajaxUserList函数结束时添加
        $("#sheet-bar").remove();
        // 触发重新加载用户歌单
        ajaxUserList(rem.uid);
        return true;
    }
}

// 刷新播放列表，为正在播放的项添加正在播放中的标识
function refreshSheet() {
    // 调试信息输出
    if (mkPlayer.debug) {
        console.log("开始播放列表 " + musicList[rem.playlist].name + " 中的歌曲");
    }

    $(".sheet-playing").removeClass("sheet-playing");        // 移除其它的正在播放

    $(".sheet-item[data-no='" + rem.playlist + "']").addClass("sheet-playing"); // 添加样式
}

// 播放器本地存储信息
// 参数：键值、数据
function playerSavedata(key, data) {
    key = 'UGPlayer_' + key;    // 添加前缀，防止串用
    data = JSON.stringify(data);
    // 存储，IE6~7 不支持HTML5本地存储
    if (window.localStorage) {
        localStorage.setItem(key, data);
    }
}

// 播放器读取本地存储信息
// 参数：键值
// 返回：数据
function playerReaddata(key) {
    if (!window.localStorage) return '';
    key = 'UGPlayer_' + key;
    return JSON.parse(localStorage.getItem(key));
}

// 同步网易云音乐歌单功能
function syncPlaylist() {
    var uid = $("#uid").val().trim();
    if (!uid) {
        layer.msg("请输入网易云音乐用户ID", { anim: 6 });
        return false;
    }

    if (isNaN(uid)) {
        layer.msg("用户ID只能是数字", { anim: 6 });
        return false;
    }

    // 显示加载提示
    var loadingMsg = layer.msg('正在同步歌单，请稍候...', { icon: 16, shade: [0.25, '#000'], time: 0 });

    // 调试日志
    if (mkPlayer.debug) {
        console.log("正在同步用户歌单...");
        console.log("用户ID: " + uid);
    }

    // 调用同步歌单功能
    ajaxUserList(uid);

    return true;
}