# UGOnlineMusicPlayer - 多平台音乐播放器

![UG音乐播放器](https://music.ug666.top/favicon.ico)

> 一款跨平台、多源、功能丰富的音乐播放器，享受音乐，随时随地！

## 📋 版本更新

### V2.0.0 (2026.04.25) — 🚀 EdgeOne Pages 重构

#### 重大架构变更

- **后端从 PHP 迁移到 EdgeOne Pages Functions（JavaScript 边缘函数）**
  - 不再需要服务器，部署到腾讯云 EdgeOne 完全免费
  - 国内访问速度提升、不受 PHP-FPM 进程数限制
  - 100 万次/月免费调用额度对个人项目绰绰有余
- **加密内核纯 JS 重写**
  - 网易云 weapi: AES-128-CBC 双层 + RSA-2048 (BigInt 模幂实现)，与 PHP 100% 等价（用 `Meting.php:1114` 的硬编码 vector 验证）
  - 百度: AES-128-CBC（Web Crypto API）
  - 酷狗: 纯 JS MD5（RFC 1321 标准实现，因 Web Crypto 已弃用 MD5）
- **音源全部支持**: netease / tencent / kugou / baidu / kuwo（xiami 已 2021 停服，占位）
- **117 个单元/集成测试全部通过**

#### 砍掉的功能

- `cache/` 文件缓存（边缘函数无文件系统）→ 走浏览器 HTTP 缓存
- `temp/` 服务器缓存下载 → 改为前端直拉
- PHP `$_SESSION` → 改用前端 `localStorage`（项目原本就在用）
- `cron` 定时清理 → 不再需要

#### 部署方法

详见 [DEPLOY.md](DEPLOY.md)。简单说：推 Git 到 EdgeOne Pages → 一键部署 → 完事。

#### 文件结构

```
functions/                 # 边缘函数后端
├── api.js                 # PHP 兼容入口 (/api?types=xxx)
├── api/*.js               # 11 个 RESTful endpoint (/api/url 等)
└── _lib/                  # 加密 / 6 源 fetcher / 工具
legacy-php/                # 原 PHP 代码归档（可参考，不部署）
tests/                     # Node.js 单测（不部署）
test-edge.html             # 浏览器集成测试页
```

---

### V1.0.2 (2025.06.02)

#### 🎯 主要改进

- **代码优化**: 大幅清理了过多的调试日志，提升应用运行效率
- **加载体验**: 修复加载进度条动画，增加了渐变效果和 shimmer 动画
- **Capacitor 版优化**: 简化了 Android 版本的代码结构，移除冗余功能
- **后台播放**: 优化移动端后台自动播放机制，保持核心功能稳定

#### 🔧 技术改进

- 简化 `background-autoplay.js` 和 `input-combined-fix.js`
- 优化进度条动画，提供更流畅的视觉反馈
- 清理控制台输出，减少性能开销
- 保持所有核心功能完整性

## 🎵 项目介绍

UGOnlineMusicPlayer 是一款开源的在线音乐播放器，支持多个主流音乐平台的资源聚合。拥有音乐搜索、播放、下载、歌词同步显示、个人歌单同步等功能，无论 PC 还是移动端，都能带来原生应用般的使用体验。

![界面预览](https://music.ug666.top/images/preview.jpg)

> **免责声明**: 本项目仅用于学习交流，请勿用于商业用途，不得通过本项目下载盗版歌曲资源，否则后果自负！

## ✨ 功能特点

- **跨平台支持**: 提供 Web 版、Windows 桌面版和 Android 移动版
- **多平台音源**: 支持网易云音乐、QQ 音乐、虾米音乐、酷狗音乐等
- **个性化体验**: 网易云音乐账号登录，同步个人歌单
- **歌词同步**: 实时歌词滚动显示，沉浸式体验
- **热评查看**: 显示音乐热门评论，感受音乐背后的故事
- **歌曲缓存**: 支持歌曲下载和缓存，随时享受音乐
- **响应式设计**: 自适应各种设备屏幕尺寸
- **快捷键控制**: 桌面版支持全局快捷键控制播放

## 🚀 平台版本

| 版本                                      | 描述                              | 特点                 |
| ----------------------------------------- | --------------------------------- | -------------------- |
| [Web 版](https://music.ug666.top)         | 浏览器访问的在线版本              | 无需安装，跨平台兼容 |
| [桌面版](./UGOnlineMusicPlayer-Electron)  | 基于 Electron 的 Windows 桌面应用 | 系统托盘、全局快捷键 |
| [安卓版](./UGOnlineMusicPlayer-Capacitor) | 基于 Capacitor 的 Android 应用    | 原生体验、离线使用   |

## 🔧 安装部署

### Docker 快速部署

```bash
# 下载代码后，在代码根目录执行
docker-compose up -d

# 修改端口后重新创建容器
docker-compose down && docker-compose up -d
```

### 常规部署

#### 运行环境要求

- PHP 5.4+
- curl_exec、file_get_contents、json_decode、openssl_encrypt 函数支持

#### 必要配置

1. **缓存清理**:  
   添加以下命令到 cron 定时任务，每分钟执行一次

   ```bash
   find /网站绝对路径/cache/*.json -type f -cmin +30 -exec rm -fv {} \;
   ```

2. **下载配置**:  
   根据您的服务器环境选择合适的配置：

   <details>
   <summary>Apache配置</summary>

   ```apache
   <Directory "/网站绝对路径/temp/">
       Header set Content-Type "application/octet-stream"
       Header set Content-Disposition "attachment;"
   </Directory>
   ```

   </details>

   <details>
   <summary>Nginx配置</summary>

   ```nginx
   location ~/temp/ {
       add_header Content-Type "application/octet-stream";
       add_header Content-Disposition "attachment;";
   }
   ```

   </details>

## 📁 项目结构

```
UGOnlineMusicPlayer/
├── api.php                        # API入口文件
├── index.html                     # 主页面
├── docker-compose.yml             # Docker配置
├── apache.conf                    # Apache配置示例
├── favicon.ico                    # 网站图标
├── cache/                         # 缓存目录
├── css/                           # 样式文件
├── images/                        # 图片资源
├── js/                            # JavaScript文件
├── plugins/                       # 插件目录
├── temp/                          # 临时文件目录
├── UGOnlineMusicPlayer-Electron/  # 桌面应用版本
└── UGOnlineMusicPlayer-Capacitor/ # 安卓应用版本
```

## 📱 桌面与移动应用

### 桌面版特点

- 系统托盘最小化，后台播放
- 全局快捷键控制（即使在其他应用中也能控制播放）
  - `Ctrl+Alt+→` - 下一首
  - `Ctrl+Alt+←` - 上一首
  - `Ctrl+Alt+空格` - 播放/暂停
- 系统通知集成

[了解更多桌面版详情](./UGOnlineMusicPlayer-Electron/README.md)

### 安卓版特点

- 原生应用体验
- 离线状态检测
- 系统媒体控制集成
- 针对触摸屏优化的界面

[了解更多安卓版详情](./UGOnlineMusicPlayer-Capacitor/README.md)

## 🌐 兼容性

- 现代浏览器 (Chrome, Firefox, Edge, Safari)
- Internet Explorer 11+
- Android 5.0+
- Windows 7+

## 🛠️ 技术栈

- 前端: HTML5, CSS3, JavaScript, jQuery
- 后端: PHP
- 桌面应用: Electron
- 移动应用: Capacitor

## 📖 相关项目

- 原版项目: [mengkunsoft/MKOnlineMusicPlayer](https://github.com/mengkunsoft/MKOnlineMusicPlayer)
- 音乐 API: [metowolf/Meting](https://github.com/metowolf/Meting)

## 📝 更新日志

### V1.0.2 (2025.06.02)

- 🎯 **优化加载体验**: 修复加载进度条动画，增加渐变和 shimmer 效果
- 🧹 **代码清理**: 移除过多调试日志，提升应用性能
- 📱 **移动端优化**: 改进 Android 版后台自动播放机制
- 🔧 **技术改进**: 简化复杂代码结构，保持核心功能稳定

### V1.0.1 (2025.05.xx)

- 🚀 初始发布桌面版和移动版
- 🎵 实现跨平台音乐播放功能
- 📱 支持系统托盘和全局快捷键

### V1.0.0 (2025.04.xx)

- 🎉 项目启动，基于原版 MKOnlineMusicPlayer
- 🌐 Web 版功能完善

## 📄 版权说明

本播放器原版由 [mengkun](https://mkblog.cn) 开发，UG 版本在原版基础上增加了桌面版和移动版支持。您可以根据相关开源协议自由使用和修改。

歌曲资源版权归各大音乐平台所有，请支持正版音乐。

## 🙏 致谢

特别感谢以下开源项目和服务的支持:

- [jQuery](https://jquery.com/) - JavaScript 库
- [Meting](https://github.com/metowolf/Meting) - 多平台音乐 API 框架
- [Layui](https://www.layui.com/) - 模块化前端框架
- [mCustomScrollbar](http://manos.malihu.gr/jquery-custom-content-scroller/) - 自定义滚动条
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用开发框架
- [Capacitor](https://capacitorjs.com/) - 混合移动应用开发框架

---

<p align="center">
  UG音乐播放器 © 2025 - 用心聆听每一个音符
</p>
