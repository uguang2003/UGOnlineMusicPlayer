# UGOnlineMusicPlayer
> 一个基于Meting的在线音乐播放器，支持多个音乐平台。

UGOnlineMusicPlayer是一款开源的在线音乐播放器。具有音乐搜索、播放、下载、歌词同步显示、个人网易云音乐播放列表同步等功能。

前端界面参照 QQ 音乐网页版进行布局，采用了响应式设计，无论是在PC端还是在手机端，均能给您带来原生 app 般的使用体验。

> 本项目仅为学习前端的练手之作，请勿用作商业用途，请勿通过本项目下载盗版歌曲资源，否则后果自负！

## 功能特点

- ✨ 支持多平台音乐源（网易云音乐、QQ音乐、虾米音乐、酷狗音乐等）
- 🎵 音乐在线搜索、播放、下载
- 📃 歌词同步显示
- 💾 个人网易云音乐播放列表同步
- 💬 音乐热评查看
- 📱 响应式设计，支持手机端访问
- 🌈 美观的用户界面

## 安装使用

### Docker 部署
1. 使用 docker-compose 运行，请自行安装。首先下载代码，进入代码根目录后启动，启动命令为:
```bash
docker-compose up -d
```

2. 默认端口是 4000，需要修改的话请修改 docker-compose.yml 文件，修改后需要删除容器重新创建:
```bash
docker-compose down && docker-compose up -d
```

### 常规部署

#### 运行环境
- PHP 5.4+
- curl_exec
- file_get_contents
- json_decode
- openssl_encrypt

#### 必要配置

1. **清除缓存**: 请务必添加以下代码到cron定时任务，并设置成每分钟执行一次
```bash
find 你的网站绝对路径/cache/*.json -type f -cmin +30 -exec rm -fv {} \;
```

2. **下载歌曲配置**: 添加以下代码到你的网站配置文件

   Apache:
   ```apache
   <Directory "你的网站绝对路径/temp/">
       Header set Content-Type "application/octet-stream"
       Header set Content-Disposition "attachment;"
   </Directory>
   ```

   Nginx:
   ```nginx
   location ~/temp/ {
       add_header Content-Type "application/octet-stream";
       add_header Content-Disposition "attachment;";
   }
   ```

3. **跨域设置**: 如果网站和接口不在一台服务器上，请配置跨域

## 项目结构
```
UGOnlineMusicPlayer/
├── api.php              # API入口文件
├── index.html           # 主页面
├── README.md            # 项目说明
├── docker-compose.yml   # Docker配置
├── apache.conf          # Apache配置示例
├── favicon.ico          # 网站图标
├── cache/               # 缓存目录
├── css/                 # 样式文件目录
├── images/              # 图片资源目录
├── js/                  # JavaScript文件目录
├── plugins/             # 插件目录
└── temp/                # 临时文件目录
```

## 浏览器兼容性
本播放器设计支持 IE9及以上的现代浏览器。并且已在 Chrome、Firefox、IE11 等浏览器测试使用正常。

## 相关链接
- 原版项目: [mengkunsoft/MKOnlineMusicPlayer](https://github.com/mengkunsoft/MKOnlineMusicPlayer)
- Meting: [metowolf/Meting](https://github.com/metowolf/Meting)

## 版权说明
本播放器原版由 [mengkun](https://mkblog.cn) 开发，您可以随意修改、使用、转载。

播放器中的歌曲来自各大音乐平台，歌曲版权归各大平台享有。请支持正版音乐。

## 致谢
#### 特别感谢 `@metowolf`、`网易云音乐`、`QQ音乐`、`虾米`、`酷狗`、`百度音乐`

#### 采用的开源模块
- **Jquery**：js主流开发框架 [http://jquery.com/](http://jquery.com/)
- **Meting**：一个高效的多平台音乐 API 框架 [https://github.com/metowolf/Meting](https://github.com/metowolf/Meting)
- **layui**：一款模块化前端框架 [https://www.layui.com/](https://www.layui.com/)
- **mCustomScrollbar**：jQuery自定义滚动条样式插件 [http://manos.malihu.gr/jquery-custom-content-scroller/](http://manos.malihu.gr/jquery-custom-content-scroller/)
- **background-blur**：跨浏览器磨砂效果背景图片模糊特效插件 [https://msurguy.github.io/background-blur/](https://msurguy.github.io/background-blur/)
- **Let's Kill IE6**：消灭IE [http://overtrue.me](http://overtrue.me)
