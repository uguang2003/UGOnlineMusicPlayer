/**************************************************
 * MKOnlinePlayer v2.4
 * Ajax 后台数据交互请求模块
 * 编写：mengkun(https://mkblog.cn)
 * 时间：2018-3-11
 *************************************************/

// ajax加载搜索结果
function ajaxSearch() {
    if (rem.wd === "") {
        layer.msg('搜索内容不能为空', { anim: 6 });
        return false;
    }

    if (rem.loadPage == 1) { // 弹出搜索提示
        var tmpLoading = layer.msg('搜索中', { icon: 16, shade: [0.75, '#000'] });
    }

    // 构造API请求参数
    var apiData = "types=search&count=" + mkPlayer.loadcount + "&source=" + rem.source + "&pages=" + rem.loadPage + "&name=" + rem.wd;

    // 调试信息输出
    if (mkPlayer.debug) {
        console.log("正在发送搜索请求...");
        console.log("API地址: " + mkPlayer.api);
        console.log("请求参数: " + apiData);
        console.log("搜索关键词: " + rem.wd);
        console.log("音乐源: " + rem.source);
        console.log("页码: " + rem.loadPage);
    }

    $.ajax({
        type: mkPlayer.method,
        url: mkPlayer.api,
        data: apiData,
        dataType: mkPlayer.dataType,
        complete: function (XMLHttpRequest, textStatus) {
            if (tmpLoading) layer.close(tmpLoading);    // 关闭加载中动画
            if (mkPlayer.debug) {
                console.log("搜索请求完成，状态: " + textStatus);
            }
        },  // complete
        success: function (jsonData) {

            // 调试信息输出
            if (mkPlayer.debug) {
                console.log("搜索请求成功，返回数据: ", jsonData);
                console.debug("搜索结果数：" + jsonData.length);

                if (jsonData.length === 0) {
                    console.warn("没有找到相关歌曲");
                }
            }

            if (rem.loadPage == 1)   // 加载第一页，清空列表
            {
                if (jsonData.length === 0)   // 返回结果为零
                {
                    layer.msg('没有找到相关歌曲', { anim: 6 });
                    return false;
                }
                musicList[0].item = [];
                rem.mainList.html('');   // 清空列表中原有的元素
                addListhead();      // 加载列表头

                if (mkPlayer.debug) {
                    console.log("加载第一页，已清空列表");
                }
            } else {
                $("#list-foot").remove();     //已经是加载后面的页码了，删除之前的"加载更多"提示

                if (mkPlayer.debug) {
                    console.log("加载更多结果，当前页码: " + rem.loadPage);
                }
            }

            if (jsonData.length === 0) {
                addListbar("nomore");  // 加载完了

                if (mkPlayer.debug) {
                    console.log("已加载所有搜索结果");
                }
                return false;
            }

            var tempItem = [], no = musicList[0].item.length;

            if (mkPlayer.debug) {
                console.log("开始处理搜索结果...");
            }

            for (var i = 0; i < jsonData.length; i++) {
                no++;
                tempItem = {
                    id: jsonData[i].id,  // 音乐ID
                    name: jsonData[i].name,  // 音乐名字
                    artist: jsonData[i].artist[0], // 艺术家名字
                    album: jsonData[i].album,    // 专辑名字
                    source: jsonData[i].source,     // 音乐来源
                    url_id: jsonData[i].url_id,  // 链接ID
                    pic_id: jsonData[i].pic_id,  // 封面ID
                    lyric_id: jsonData[i].lyric_id,  // 歌词ID
                    pic: null,    // 专辑图片
                    url: null   // mp3链接
                };

                if (mkPlayer.debug && i < 3) {  // 仅显示前三首歌曲的详细信息，避免信息过多
                    console.log("处理搜索结果 [" + (i + 1) + "/" + jsonData.length + "]: " +
                        tempItem.name + " - " + tempItem.artist);
                }

                musicList[0].item.push(tempItem);   // 保存到搜索结果临时列表中
                addItem(no, tempItem.name, tempItem.artist, tempItem.album);  // 在前端显示
            }

            if (mkPlayer.debug) {
                console.log("所有搜索结果处理完成，共 " + jsonData.length + " 首歌曲");
            }

            rem.dislist = 0;    // 当前显示的是搜索列表
            rem.loadPage++;    // 已加载的列数+1

            dataBox("list");    // 在主界面显示出播放列表
            refreshList();  // 刷新列表，添加正在播放样式

            if (no < mkPlayer.loadcount) {
                addListbar("nomore");  // 没加载满，说明已经加载完了

                if (mkPlayer.debug) {
                    console.log("搜索结果未满一页，全部加载完成");
                }
            } else {
                addListbar("more");     // 还可以点击加载更多

                if (mkPlayer.debug) {
                    console.log("当前页结果已满，可以加载更多");
                }
            }

            if (rem.loadPage == 2) {
                listToTop();    // 播放列表滚动到顶部

                if (mkPlayer.debug) {
                    console.log("列表已滚动到顶部");
                }
            }
        },   //success
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            layer.msg('搜索结果获取失败 - ' + XMLHttpRequest.status);
            if (mkPlayer.debug) {
                console.error("搜索结果获取失败");
                console.error("状态码: " + XMLHttpRequest.status);
                console.error("错误信息: " + errorThrown);
                console.error("响应文本: " + XMLHttpRequest.responseText);
            }
            console.error(XMLHttpRequest + textStatus + errorThrown);
        }   // error
    });//ajax
}

// 完善获取音乐信息
// 音乐所在列表ID、音乐对应ID、回调函数
function ajaxUrl(music, callback) {
    // 已经有数据，直接回调
    if (music.url !== null && music.url !== "err" && music.url !== "") {
        callback(music);
        return true;
    }
    // id为空，赋值链接错误。直接回调
    if (music.id === null) {
        music.url = "err";
        updateMinfo(music); // 更新音乐信息
        callback(music);
        return true;
    }

    // 构造API请求参数
    var apiData = "types=url&id=" + music.id + "&source=" + music.source;

    // 调试信息输出
    if (mkPlayer.debug) {
        console.log("正在发送歌曲URL请求...");
        console.log("API地址: " + mkPlayer.api);
        console.log("请求参数: " + apiData);
        console.log("歌曲信息: ", music);
    }

    $.ajax({
        type: mkPlayer.method,
        url: mkPlayer.api,
        data: apiData,
        dataType: mkPlayer.dataType,
        complete: function (XMLHttpRequest, textStatus) {
            if (mkPlayer.debug) {
                console.log("歌曲URL请求完成，状态: " + textStatus);
            }
        },
        success: function (jsonData) {
            // 调试信息输出
            if (mkPlayer.debug) {
                console.log("歌曲URL获取成功，返回数据: ", jsonData);
                console.debug("歌曲链接：" + jsonData.url);
            }

            // 解决网易云音乐部分歌曲无法播放问题
            if (music.source == "netease") {
                if (jsonData.url === "") {
                    jsonData.url = "https://music.163.com/song/media/outer/url?id=" + music.id + ".mp3";
                    if (mkPlayer.debug) {
                        console.log("网易云音乐链接为空，已使用替代链接");
                    }
                } else {
                    var oldUrl = jsonData.url;
                    jsonData.url = jsonData.url.replace(/m7c.music./g, "m7.music.");
                    jsonData.url = jsonData.url.replace(/m8c.music./g, "m8.music.");
                    if (oldUrl !== jsonData.url && mkPlayer.debug) {
                        console.log("网易云音乐链接已修正");
                    }
                }
            } else if (music.source == "baidu") {    // 解决百度音乐防盗链
                var oldUrl = jsonData.url;
                jsonData.url = jsonData.url.replace(/http:\/\/zhangmenshiting.qianqian.com/g, "https://gss0.bdstatic.com/y0s1hSulBw92lNKgpU_Z2jR7b2w6buu");
                if (oldUrl !== jsonData.url && mkPlayer.debug) {
                    console.log("百度音乐链接已修正");
                }
            }

            if (jsonData.url === "") {
                music.url = "err";
                if (mkPlayer.debug) {
                    console.warn("歌曲链接获取失败，标记为错误");
                }
            } else {
                music.url = jsonData.url;    // 记录结果
                if (mkPlayer.debug) {
                    console.log("歌曲链接获取成功: " + music.url);
                }
            }

            // 检测音频文件是否可以访问
            testAudioUrl(music, callback);
        },   //success
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            layer.msg('歌曲链接获取失败 - ' + XMLHttpRequest.status);
            if (mkPlayer.debug) {
                console.error("歌曲链接获取失败");
                console.error("状态码: " + XMLHttpRequest.status);
                console.error("错误信息: " + errorThrown);
                console.error("响应文本: " + XMLHttpRequest.responseText);
            }
            console.error(XMLHttpRequest + textStatus + errorThrown);

            // 链接获取失败，尝试使用本地源
            retryWithLocalSource(music, callback);
        }   // error 
    }); //ajax
}

// 测试音频URL是否可访问
function testAudioUrl(music, callback) {
    if (music.url === "err" || music.url === "") {
        // URL已经是错误状态，尝试使用本地源
        retryWithLocalSource(music, callback);
        return;
    }

    // 创建一个临时的音频元素来测试URL
    var audio = new Audio();
    var timeoutId;

    // 设置加载超时
    timeoutId = setTimeout(function () {
        if (mkPlayer.debug) {
            console.warn("音频加载超时，尝试使用本地源");
        }
        // 超时处理
        audio.src = "";
        retryWithLocalSource(music, callback);
    }, 5000); // 5秒超时

    // 加载成功
    audio.oncanplay = function () {
        clearTimeout(timeoutId);
        if (mkPlayer.debug) {
            console.log("音频URL测试成功");
        }
        updateMinfo(music); // 更新音乐信息
        callback(music);    // 回调函数
    };

    // 加载失败
    audio.onerror = function () {
        clearTimeout(timeoutId);
        if (mkPlayer.debug) {
            console.warn("音频URL测试失败，尝试使用本地源");
        }
        retryWithLocalSource(music, callback);
    };

    audio.src = music.url;
    audio.load();
}

// 当第三方源失败时，尝试使用本地源
function retryWithLocalSource(music, callback) {
    if (mkPlayer.debug) {
        console.log("正在尝试使用本地源获取歌曲链接...");
    }

    // 构造API请求参数，添加use_local=1参数表示使用本地源
    var apiData = "types=url&id=" + music.id + "&source=" + music.source + "&use_local=1";

    $.ajax({
        type: mkPlayer.method,
        url: mkPlayer.api,
        data: apiData,
        dataType: mkPlayer.dataType,
        success: function (jsonData) {
            if (mkPlayer.debug) {
                console.log("本地源获取成功，返回数据: ", jsonData);
            }

            if (jsonData.url === "") {
                music.url = "err"; // 标记为错误，会触发audioErr函数自动播放下一首
                if (mkPlayer.debug) {
                    console.warn("本地源歌曲链接获取失败，将自动播放下一首");
                }
                layer.msg('当前歌曲无法播放，自动切换到下一首');
            } else {
                music.url = jsonData.url;
                if (mkPlayer.debug) {
                    console.log("本地源歌曲链接获取成功: " + music.url);
                }
                layer.msg('已切换到本地音源');
            }

            updateMinfo(music); // 更新音乐信息
            callback(music);    // 回调函数
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            // 本地源也获取失败，将URL标记为错误，这会触发audioErr函数自动播放下一首
            music.url = "err";
            layer.msg('当前歌曲无法播放，自动切换到下一首');

            if (mkPlayer.debug) {
                console.error("本地源获取失败，将自动播放下一首");
                console.error("状态码: " + XMLHttpRequest.status);
                console.error("错误信息: " + errorThrown);
            }

            updateMinfo(music); // 更新音乐信息
            callback(music);    // 回调函数，这会触发audioErr函数
        }
    });
}

// 完善获取音乐封面图
// 包含音乐信息的数组、回调函数
function ajaxPic(music, callback) {
    // 已经有数据，直接回调
    if (music.pic !== null && music.pic !== "err" && music.pic !== "") {
        callback(music);
        return true;
    }
    // pic_id 为空，赋值链接错误。直接回调
    if (music.pic_id === null) {
        music.pic = "err";
        updateMinfo(music); // 更新音乐信息
        callback(music);
        return true;
    }

    // 构造API请求参数
    var apiData = "types=pic&id=" + music.pic_id + "&source=" + music.source;

    // 调试信息输出
    if (mkPlayer.debug) {
        console.log("正在请求歌曲封面...");
        console.log("API地址: " + mkPlayer.api);
        console.log("请求参数: " + apiData);
        console.log("歌曲信息: ", music);
    }

    $.ajax({
        type: mkPlayer.method,
        url: mkPlayer.api,
        data: apiData,
        dataType: mkPlayer.dataType,
        complete: function (XMLHttpRequest, textStatus) {
            if (mkPlayer.debug) {
                console.log("歌曲封面请求完成，状态: " + textStatus);
            }
        },
        success: function (jsonData) {
            // 调试信息输出
            if (mkPlayer.debug) {
                console.log("歌曲封面获取成功，返回数据: ", jsonData);
                console.log("歌曲封面链接：" + jsonData.url);
            }

            if (jsonData.url !== "") {
                music.pic = jsonData.url;    // 记录结果
                if (mkPlayer.debug) {
                    console.log("使用获取的封面URL: " + music.pic);
                }
            } else {
                music.pic = "err";
                if (mkPlayer.debug) {
                    console.warn("封面链接为空，标记为错误");
                }
            }

            updateMinfo(music); // 更新音乐信息

            callback(music);    // 回调函数
            return true;
        },   //success
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            layer.msg('歌曲封面获取失败 - ' + XMLHttpRequest.status);
            if (mkPlayer.debug) {
                console.error("歌曲封面获取失败");
                console.error("状态码: " + XMLHttpRequest.status);
                console.error("错误信息: " + errorThrown);
                console.error("响应文本: " + XMLHttpRequest.responseText);
            }
            console.error(XMLHttpRequest + textStatus + errorThrown);
        }   // error 
    }); //ajax

}

// ajax加载用户歌单
// 参数：歌单网易云 id, 歌单存储 id，回调函数
function ajaxPlayList(lid, id, callback) {
    if (!lid) return false;

    // 已经在加载了，跳过
    if (musicList[id].isloading === true) {
        return true;
    }

    musicList[id].isloading = true; // 更新状态：列表加载中

    $.ajax({
        type: mkPlayer.method,
        url: mkPlayer.api,
        data: "types=playlist&id=" + lid,
        dataType: mkPlayer.dataType,
        complete: function (XMLHttpRequest, textStatus) {
            musicList[id].isloading = false;    // 列表已经加载完了
        },  // complete
        success: function (jsonData) {
            // 存储歌单信息
            var tempList = {
                id: lid,    // 列表的网易云 id
                name: jsonData.playlist.name,   // 列表名字
                cover: jsonData.playlist.coverImgUrl,   // 列表封面
                creatorName: jsonData.playlist.creator.nickname,   // 列表创建者名字
                creatorAvatar: jsonData.playlist.creator.avatarUrl,   // 列表创建者头像
                item: []
            };

            if (jsonData.playlist.coverImgUrl !== '') {
                tempList.cover = jsonData.playlist.coverImgUrl + "?param=200y200";
            } else {
                tempList.cover = musicList[id].cover;
            }

            if (typeof jsonData.playlist.tracks !== undefined || jsonData.playlist.tracks.length !== 0) {
                // 存储歌单中的音乐信息
                for (var i = 0; i < jsonData.playlist.tracks.length; i++) {
                    tempList.item[i] = {
                        id: jsonData.playlist.tracks[i].id,  // 音乐ID
                        name: jsonData.playlist.tracks[i].name,  // 音乐名字
                        artist: jsonData.playlist.tracks[i].ar[0].name, // 艺术家名字
                        album: jsonData.playlist.tracks[i].al.name,    // 专辑名字
                        source: "netease",     // 音乐来源
                        url_id: jsonData.playlist.tracks[i].id,  // 链接ID
                        pic_id: null,  // 封面ID
                        lyric_id: jsonData.playlist.tracks[i].id,  // 歌词ID
                        pic: jsonData.playlist.tracks[i].al.picUrl + "?param=300y300",    // 专辑图片
                        url: null   // mp3链接
                    };
                }
            }

            // 歌单用户 id 不能丢
            if (musicList[id].creatorID) {
                tempList.creatorID = musicList[id].creatorID;
                if (musicList[id].creatorID === rem.uid) {   // 是当前登录用户的歌单，要保存到缓存中
                    var tmpUlist = playerReaddata('ulist');    // 读取本地记录的用户歌单
                    if (tmpUlist) {  // 读取到了
                        for (i = 0; i < tmpUlist.length; i++) {  // 匹配歌单
                            if (tmpUlist[i].id == lid) {
                                tmpUlist[i] = tempList; // 保存歌单中的歌曲
                                playerSavedata('ulist', tmpUlist);  // 保存
                                break;
                            }
                        }
                    }
                }
            }

            // 存储列表信息
            musicList[id] = tempList;

            // 首页显示默认列表
            if (id == mkPlayer.defaultlist) loadList(id);
            if (callback) callback(id);    // 调用回调函数

            // 改变前端列表
            $(".sheet-item[data-no='" + id + "'] .sheet-cover").attr('src', tempList.cover);    // 专辑封面
            $(".sheet-item[data-no='" + id + "'] .sheet-name").html(tempList.name);     // 专辑名字

            // 调试信息输出
            if (mkPlayer.debug) {
                console.debug("歌单 [" + tempList.name + "] 中的音乐获取成功");
            }
        },   //success
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            layer.msg('歌单读取失败 - ' + XMLHttpRequest.status);
            console.error(XMLHttpRequest + textStatus + errorThrown);
            $(".sheet-item[data-no='" + id + "'] .sheet-name").html('<span style="color: #EA8383">读取失败</span>');     // 专辑名字
        }   // error  
    });//ajax
}

// ajax加载歌词
// 参数：音乐ID，回调函数
function ajaxLyric(music, callback) {
    lyricTip('歌词加载中...');

    if (!music.lyric_id) {
        if (mkPlayer.debug) {
            console.warn("没有歌词ID，跳过请求");
        }
        callback('');  // 没有歌词ID，直接返回
        return;
    }

    // 构造API请求参数
    var apiData = "types=lyric&id=" + music.lyric_id + "&source=" + music.source;

    // 调试信息输出
    if (mkPlayer.debug) {
        console.log("正在请求歌词...");
        console.log("API地址: " + mkPlayer.api);
        console.log("请求参数: " + apiData);
        console.log("歌曲信息: ", music);
    }

    $.ajax({
        type: mkPlayer.method,
        url: mkPlayer.api,
        data: apiData,
        dataType: mkPlayer.dataType,
        complete: function (XMLHttpRequest, textStatus) {
            if (mkPlayer.debug) {
                console.log("歌词请求完成，状态: " + textStatus);
            }
        },
        success: function (jsonData) {
            // 调试信息输出
            if (mkPlayer.debug) {
                console.log("歌词获取成功，返回数据: ", jsonData);

                if (jsonData.lyric) {
                    console.debug("获取到歌词，长度: " + jsonData.lyric.length + " 字符");
                    // 只显示歌词的前几行作为预览
                    var previewLines = jsonData.lyric.split("\n").slice(0, 3).join("\n");
                    console.debug("歌词预览: \n" + previewLines + "...");
                } else {
                    console.warn("API返回成功但没有歌词内容");
                }
            }

            if (jsonData.lyric) {
                callback(jsonData.lyric, music.lyric_id);    // 回调函数
            } else {
                if (mkPlayer.debug) {
                    console.warn("API返回的歌词为空");
                }
                callback('', music.lyric_id);    // 回调函数
            }
        },   //success
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            layer.msg('歌词读取失败 - ' + XMLHttpRequest.status);
            if (mkPlayer.debug) {
                console.error("歌词获取失败");
                console.error("状态码: " + XMLHttpRequest.status);
                console.error("错误信息: " + errorThrown);
                console.error("响应文本: " + XMLHttpRequest.responseText);
            }
            console.error(XMLHttpRequest + textStatus + errorThrown);
            callback('', music.lyric_id);    // 回调函数
        }   // error   
    });//ajax
}

// ajax加载用户的播放列表
// 参数 用户的网易云 id
function ajaxUserList(uid) {
    var tmpLoading = layer.msg('加载中...', { icon: 16, shade: [0.75, '#000'] });

    // 构造API请求参数
    var apiData = "types=userlist&uid=" + uid;

    // 调试信息输出
    if (mkPlayer.debug) {
        console.log("正在请求用户歌单...");
        console.log("API地址: " + mkPlayer.api);
        console.log("请求参数: " + apiData);
        console.log("用户ID: " + uid);
    }

    $.ajax({
        type: mkPlayer.method,
        url: mkPlayer.api,
        data: apiData,
        dataType: mkPlayer.dataType,
        complete: function (XMLHttpRequest, textStatus) {
            if (tmpLoading) layer.close(tmpLoading);    // 关闭加载中动画
            if (mkPlayer.debug) {
                console.log("用户歌单请求完成，状态: " + textStatus);
            }
        },  // complete
        success: function (jsonData) {
            // 调试信息输出
            if (mkPlayer.debug) {
                console.log("用户歌单获取成功，返回数据: ", jsonData);
            }

            if (jsonData.code == "-1" || jsonData.code == 400) {
                if (mkPlayer.debug) {
                    console.warn("用户ID输入有误: " + uid);
                }
                layer.msg('用户 uid 输入有误', { anim: 6 });
                return false;
            }

            if (jsonData.playlist.length === 0 || typeof (jsonData.playlist.length) === "undefined") {
                if (mkPlayer.debug) {
                    console.warn("未找到用户歌单: " + uid);
                }
                layer.msg('没找到用户 ' + uid + ' 的歌单', { anim: 6 });
                return false;
            } else {
                var tempList, userList = [];
                $("#sheet-bar").remove();   // 移除登陆条
                rem.uid = uid;  // 记录已同步用户 uid
                rem.uname = jsonData.playlist[0].creator.nickname;  // 第一个列表(喜欢列表)的创建者即用户昵称

                if (mkPlayer.debug) {
                    console.log("用户信息: ID=" + uid + ", 昵称=" + rem.uname);
                    console.log("用户歌单数量: " + jsonData.playlist.length);
                }

                layer.msg('欢迎您 ' + rem.uname);
                // 记录登录用户
                playerSavedata('uid', rem.uid);
                playerSavedata('uname', rem.uname);

                for (var i = 0; i < jsonData.playlist.length; i++) {
                    // 获取歌单信息
                    tempList = {
                        id: jsonData.playlist[i].id,    // 列表的网易云 id
                        name: jsonData.playlist[i].name,   // 列表名字
                        cover: jsonData.playlist[i].coverImgUrl + "?param=200y200",   // 列表封面
                        creatorID: uid,   // 列表创建者id
                        creatorName: jsonData.playlist[i].creator.nickname,   // 列表创建者名字
                        creatorAvatar: jsonData.playlist[i].creator.avatarUrl,   // 列表创建者头像
                        item: []
                    };

                    if (mkPlayer.debug) {
                        console.log("加载歌单: [" + (i + 1) + "/" + jsonData.playlist.length + "] " + tempList.name);
                    }

                    // 存储并显示播放列表
                    addSheet(musicList.push(tempList) - 1, tempList.name, tempList.cover);
                    userList.push(tempList);
                }
                playerSavedata('ulist', userList);
                // 显示退出登录的提示条
                sheetBar();

                if (mkPlayer.debug) {
                    console.log("用户歌单全部加载完成");
                }
            }
            // 调试信息输出
            if (mkPlayer.debug) {
                console.debug("用户歌单获取成功 [用户网易云ID：" + uid + "]");
            }
        },   //success
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            layer.msg('歌单同步失败 - ' + XMLHttpRequest.status);
            if (mkPlayer.debug) {
                console.error("用户歌单获取失败");
                console.error("状态码: " + XMLHttpRequest.status);
                console.error("错误信息: " + errorThrown);
                console.error("响应文本: " + XMLHttpRequest.responseText);
            }
            console.error(XMLHttpRequest + textStatus + errorThrown);
        }   // error
    });//ajax
    return true;
}